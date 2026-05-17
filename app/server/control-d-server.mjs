import http from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '../dist');
const port = Number(process.env.PORT || 80);
const dataDir = process.env.SCHEDULER_DATA_DIR || path.resolve(__dirname, '../scheduler-data');
const statePath = process.env.SCHEDULER_STATE_FILE || path.join(dataDir, 'scheduler-state.json');

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const state = {
  apiToken: '',
  schedules: {},
};

const timers = new Map();

const readJson = async (req) => {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
};

const buildFormBody = (body) => {
  const params = new URLSearchParams();
  Object.entries(body).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, String(value));
    }
  });
  return params;
};

const send = (res, statusCode, body, headers = {}) => {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    ...headers,
  });
  res.end(JSON.stringify(body));
};

const loadState = async () => {
  await mkdir(path.dirname(statePath), { recursive: true });
  try {
    const raw = await readFile(statePath, 'utf8');
    const parsed = JSON.parse(raw);
    state.apiToken = typeof parsed.apiToken === 'string' ? parsed.apiToken : '';
    state.schedules = parsed.schedules && typeof parsed.schedules === 'object' ? parsed.schedules : {};
  } catch {
    state.apiToken = '';
    state.schedules = {};
  }
};

const persistState = async () => {
  await mkdir(path.dirname(statePath), { recursive: true });
  await writeFile(statePath, JSON.stringify(state, null, 2));
};

const clearTimer = (deviceId) => {
  const timer = timers.get(deviceId);
  if (timer) {
    clearTimeout(timer);
  }
  timers.delete(deviceId);
};

const callControlD = async (deviceId, body) => {
  if (!state.apiToken) {
    throw new Error('Control D API token has not been configured');
  }

  const response = await fetch(`https://api.controld.com/devices/${deviceId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${state.apiToken}`,
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
    },
    body: buildFormBody(body),
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok || (data && data.success === false)) {
    const message = data?.error?.message || response.statusText || 'Request failed';
    throw new Error(message);
  }

  return data;
};

const restoreDevice = async (deviceId) => {
  const schedule = state.schedules[deviceId];
  const restoreStatus = Number(schedule?.restoreStatus ?? 1);

  clearTimer(deviceId);

  await callControlD(deviceId, { status: restoreStatus });

  delete state.schedules[deviceId];
  await persistState();
};

const scheduleRestore = async (schedule) => {
  clearTimer(schedule.deviceId);

  const delay = Math.max(0, schedule.expiresAt - Date.now());
  state.schedules[schedule.deviceId] = schedule;
  await persistState();

  if (delay === 0) {
    try {
      await restoreDevice(schedule.deviceId);
    } catch (error) {
      console.error('[scheduler] immediate restore failed', error);
    }
    return;
  }

  const timer = setTimeout(() => {
    restoreDevice(schedule.deviceId).catch((error) => {
      console.error('[scheduler] restore failed', error);
    });
  }, delay);

  timers.set(schedule.deviceId, timer);
};

const bootstrapSchedules = async () => {
  const now = Date.now();
  for (const schedule of Object.values(state.schedules)) {
    if (schedule.expiresAt <= now) {
      try {
        await restoreDevice(schedule.deviceId);
      } catch (error) {
        console.error('[scheduler] bootstrap restore failed', error);
      }
      continue;
    }

    const timer = setTimeout(() => {
      restoreDevice(schedule.deviceId).catch((error) => {
        console.error('[scheduler] restore failed', error);
      });
    }, schedule.expiresAt - now);

    timers.set(schedule.deviceId, timer);
  }
};

const proxyControlD = async (req, res, url) => {
  const targetPath = url.pathname.replace(/^\/api/, '') || '/';
  const upstreamUrl = `https://api.controld.com${targetPath}${url.search}`;
  const method = req.method || 'GET';
  const headers = {
    Authorization: req.headers.authorization || '',
    Accept: req.headers.accept || 'application/json',
  };

  if (req.headers['content-type']) {
    headers['Content-Type'] = req.headers['content-type'];
  }

  let body;
  if (!['GET', 'HEAD'].includes(method)) {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    if (chunks.length > 0) {
      body = Buffer.concat(chunks);
    }
  }

  const upstream = await fetch(upstreamUrl, {
    method,
    headers,
    body,
  });

  const buffer = Buffer.from(await upstream.arrayBuffer());
  const contentType = upstream.headers.get('content-type') || 'application/json; charset=utf-8';
  res.writeHead(upstream.status, {
    'Content-Type': contentType,
    'Cache-Control': 'no-store',
  });
  res.end(buffer);
};

const serveStatic = async (res, assetPath) => {
  const filePath = assetPath === '/' ? path.join(distDir, 'index.html') : path.join(distDir, assetPath);
  try {
    const data = await readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': contentTypes[ext] || 'application/octet-stream',
      'Cache-Control': ext === '.html' ? 'no-store' : 'public, max-age=31536000, immutable',
    });
    res.end(data);
  } catch {
    const indexHtml = await readFile(path.join(distDir, 'index.html'));
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    res.end(indexHtml);
  }
};

const handleScheduler = async (req, res, url) => {
  if (req.method === 'GET' && url.pathname === '/scheduler/state') {
    return send(res, 200, {
      success: true,
      tokenConfigured: Boolean(state.apiToken),
      schedules: Object.values(state.schedules),
    });
  }

  if (req.method === 'POST' && url.pathname === '/scheduler/token') {
    const body = await readJson(req);
    state.apiToken = String(body.apiToken || '').trim();
    await persistState();
    return send(res, 200, { success: true, tokenConfigured: Boolean(state.apiToken) });
  }

  if (req.method === 'DELETE' && url.pathname === '/scheduler/token') {
    state.apiToken = '';
    await persistState();
    return send(res, 200, { success: true, tokenConfigured: false });
  }

  if (req.method === 'POST' && url.pathname === '/scheduler/soft-disable') {
    const body = await readJson(req);
    const deviceId = String(body.deviceId || '').trim();
    const durationMinutes = Number(body.durationMinutes);
    const restoreStatus = Number.isFinite(Number(body.restoreStatus)) ? Number(body.restoreStatus) : 1;
    const deviceName = String(body.deviceName || '').trim() || undefined;

    if (!deviceId) {
      return send(res, 400, { success: false, error: { message: 'deviceId is required' } });
    }

    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
      return send(res, 400, { success: false, error: { message: 'durationMinutes must be greater than 0' } });
    }

    try {
      await callControlD(deviceId, { status: 2 });
      const schedule = {
        deviceId,
        deviceName,
        restoreStatus,
        expiresAt: Date.now() + durationMinutes * 60 * 1000,
      };
      await scheduleRestore(schedule);
      return send(res, 200, { success: true, schedule });
    } catch (error) {
      return send(res, 500, {
        success: false,
        error: { message: error instanceof Error ? error.message : 'Failed to disable device' },
      });
    }
  }

  if (req.method === 'POST' && url.pathname === '/scheduler/restore') {
    const body = await readJson(req);
    const deviceId = String(body.deviceId || '').trim();
    const restoreStatus = Number.isFinite(Number(body.restoreStatus)) ? Number(body.restoreStatus) : undefined;

    if (!deviceId) {
      return send(res, 400, { success: false, error: { message: 'deviceId is required' } });
    }

    try {
      clearTimer(deviceId);
      const schedule = state.schedules[deviceId];
      const nextStatus = Number.isFinite(restoreStatus) ? restoreStatus : Number(schedule?.restoreStatus ?? 1);
      await callControlD(deviceId, { status: nextStatus });
      delete state.schedules[deviceId];
      await persistState();
      return send(res, 200, { success: true });
    } catch (error) {
      return send(res, 500, {
        success: false,
        error: { message: error instanceof Error ? error.message : 'Failed to restore device' },
      });
    }
  }

  return send(res, 404, { success: false, error: { message: 'Not found' } });
};

await loadState();
await bootstrapSchedules();

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

    if (url.pathname === '/healthz') {
      return send(res, 200, { success: true });
    }

    if (url.pathname.startsWith('/scheduler/')) {
      return handleScheduler(req, res, url);
    }

    if (url.pathname.startsWith('/api/')) {
      return proxyControlD(req, res, url);
    }

    const assetPath = url.pathname === '/' ? '/' : decodeURIComponent(url.pathname);
    return serveStatic(res, assetPath);
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ success: false, error: { message: error instanceof Error ? error.message : 'Server error' } }));
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`[control-d-server] listening on ${port}`);
});
