import type { DeviceSchedule } from '@/types/controld';

type SchedulerResponse<T> = {
  success: boolean;
  error?: { message?: string };
} & T;

const requestScheduler = async <T>(endpoint: string, options: RequestInit = {}) => {
  const response = await fetch(endpoint, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...options.headers,
    },
  });

  let data: SchedulerResponse<T>;

  try {
    data = await response.json();
  } catch {
    throw new Error(`Scheduler error: ${response.status} ${response.statusText || 'Request failed'}`);
  }

  if (!response.ok || data.success === false) {
    const message = data.error?.message || response.statusText || 'Request failed';
    throw new Error(`Scheduler error: ${message}`);
  }

  return data;
};

export async function syncSchedulerToken(apiToken: string) {
  if (apiToken.trim()) {
    await requestScheduler('/scheduler/token', {
      method: 'POST',
      body: JSON.stringify({ apiToken: apiToken.trim() }),
    });
    return;
  }

  await requestScheduler('/scheduler/token', {
    method: 'DELETE',
  });
}

export async function loadSchedulerState(): Promise<DeviceSchedule[]> {
  const res = await requestScheduler<{ schedules: DeviceSchedule[]; tokenConfigured: boolean }>(
    '/scheduler/state'
  );
  return res.schedules ?? [];
}

export async function scheduleDevicePause(deviceId: string, durationMinutes: number): Promise<DeviceSchedule> {
  const res = await requestScheduler<{ schedule: DeviceSchedule }>('/scheduler/soft-disable', {
    method: 'POST',
    body: JSON.stringify({ deviceId, durationMinutes }),
  });

  if (!res.schedule) {
    throw new Error('Scheduler error: schedule not returned');
  }

  return res.schedule;
}

export async function restoreDevicePause(deviceId: string): Promise<void> {
  await requestScheduler('/scheduler/restore', {
    method: 'POST',
    body: JSON.stringify({ deviceId }),
  });
}
