import type { AccessIP, Device, DeviceActivitySummary } from '@/types/controld';

type RawControlDDevice = Partial<Device> | Record<string, unknown>;
const ONLINE_WINDOW_SECONDS = 5 * 60;

const readObjectString = (
  value: unknown,
  preferred: 'PK' | 'name' = 'PK'
) => {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const objectValue = value as Record<string, unknown>;
    return String(objectValue[preferred] ?? objectValue.PK ?? objectValue.name ?? '');
  }
  return '';
};

const normalizeDeviceType = (value: unknown) => {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const objectValue = value as Record<string, unknown>;
    const pk = String(objectValue.PK ?? '').toLowerCase();
    const name = String(objectValue.name ?? '').toLowerCase();
    if (pk) return pk;
    if (name.includes('router') || name.includes('network')) return 'router';
    if (name) return name;
  }
  return '';
};

const normalizeNumber = (value: unknown) => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const readString = (value: unknown) =>
  typeof value === 'string' && value.trim() !== '' ? value : undefined;

const readResolver = (device: RawControlDDevice) => {
  const raw = device as Record<string, unknown>;
  if (typeof raw.resolver === 'string') return raw.resolver;

  if (raw.resolvers && typeof raw.resolvers === 'object' && !Array.isArray(raw.resolvers)) {
    const resolvers = raw.resolvers as Record<string, unknown>;
    return readString(resolvers.doh) || readString(resolvers.dot) || readString(resolvers.uid);
  }

  if (
    raw.legacy_ipv4 &&
    typeof raw.legacy_ipv4 === 'object' &&
    !Array.isArray(raw.legacy_ipv4)
  ) {
    const legacy = raw.legacy_ipv4 as Record<string, unknown>;
    return readString(legacy.resolver);
  }

  return undefined;
};

export const normalizeActivityTimestamp = (value: unknown) => {
  if (value == null || value === '') return undefined;

  if (typeof value === 'number') {
    return value > 1e10 ? Math.floor(value / 1000) : value;
  }

  if (typeof value === 'string') {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
      return numeric > 1e10 ? Math.floor(numeric / 1000) : numeric;
    }

    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) {
      return Math.floor(parsed / 1000);
    }
  }

  return undefined;
};

export const normalizeControlDDevice = (device: RawControlDDevice): Device => {
  const raw = device as Record<string, unknown>;
  const profileId = readObjectString(device.profile ?? raw.profile_id, 'PK');
  const profileName =
    readObjectString(device.profile_name, 'name') ||
    readObjectString(device.profile, 'name');
  const configuredClients = normalizeNumber(device.configured_clients ?? device.client_count);
  const icon = readString(raw.icon);
  const activity = device.activity as DeviceActivitySummary | undefined;

  return {
    ...device,
    PK: String(device.PK ?? raw.id ?? ''),
    name: String(device.name ?? ''),
    type: normalizeDeviceType(device.type ?? icon),
    profile: profileId,
    profile_name: profileName,
    status: normalizeNumber(device.status) ?? 0,
    resolver: readResolver(device),
    last_activity: normalizeActivityTimestamp(device.last_activity),
    configured_clients: configuredClients,
    known_ip_count: activity?.knownIpCount ?? normalizeNumber(device.known_ip_count),
  };
};

export const getDeviceStateMeta = (device: Pick<Device, 'status'>) => {
  switch (device.status) {
    case 1:
      return {
        color: 'bg-emerald-500',
        label: 'Enabled',
        textColor: 'text-emerald-500',
      };
    case 2:
      return {
        color: 'bg-amber-500',
        label: 'Paused',
        textColor: 'text-amber-500',
      };
    case 3:
      return {
        color: 'bg-red-500',
        label: 'Disabled',
        textColor: 'text-red-500',
      };
    case 0:
      return {
        color: 'bg-slate-400',
        label: 'Pending',
        textColor: 'text-slate-400',
      };
    default:
      return {
        color: 'bg-slate-400',
        label: 'Unknown',
        textColor: 'text-slate-400',
      };
  }
};

export const getDeviceConnectionMeta = getDeviceStateMeta;

const getAccessTimestamp = (entry: AccessIP) =>
  normalizeActivityTimestamp(entry.date ?? entry.ts ?? entry.updated);

export const summarizeDeviceActivity = (
  accessEntries: AccessIP[],
  now = getCurrentTimeMs()
): DeviceActivitySummary => {
  const timestamps = accessEntries
    .map(getAccessTimestamp)
    .filter((timestamp): timestamp is number => timestamp !== undefined);
  const lastSeen = timestamps.length > 0 ? Math.max(...timestamps) : undefined;
  const knownIpCount = accessEntries.filter((entry) => typeof entry.ip === 'string' && entry.ip).length;

  if (lastSeen === undefined) {
    return {
      state: knownIpCount > 0 ? 'offline' : 'offline',
      label: knownIpCount > 0 ? 'Seen before' : 'Offline',
      knownIpCount,
    };
  }

  const secondsSinceSeen = Math.max(0, now / 1000 - lastSeen);
  if (secondsSinceSeen <= ONLINE_WINDOW_SECONDS) {
    return {
      state: 'online',
      label: 'Online',
      lastSeen,
      knownIpCount,
    };
  }

  return {
    state: 'offline',
    label: 'Offline',
    lastSeen,
    knownIpCount,
  };
};

export const getDeviceActivityMeta = (device: Pick<Device, 'activity'>) => {
  switch (device.activity?.state) {
    case 'online':
      return {
        color: 'bg-emerald-500',
        label: 'Online',
        textColor: 'text-emerald-500',
      };
    case 'offline':
      return {
        color: 'bg-slate-500',
        label: 'Offline',
        textColor: 'text-slate-400',
      };
    default:
      return {
        color: 'bg-slate-400',
        label: 'Activity unknown',
        textColor: 'text-muted-foreground',
      };
  }
};

export const getCurrentTimeMs = () => Date.now();

export const formatMinutesUntil = (expiresAt?: number, now = getCurrentTimeMs()) => {
  if (!expiresAt) return '';
  const remainingMinutes = Math.max(0, Math.ceil((expiresAt - now) / 60000));
  if (remainingMinutes < 60) {
    return `${remainingMinutes}m`;
  }

  const hours = Math.floor(remainingMinutes / 60);
  const minutes = remainingMinutes % 60;
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
};

export const formatDeviceLastActivity = (
  lastActivity: Device['last_activity'],
  now = getCurrentTimeMs()
) => {
  const timestamp = normalizeActivityTimestamp(lastActivity);
  if (timestamp == null) return '';

  const minutes = Math.max(0, Math.floor((now / 1000 - timestamp) / 60));
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m ago` : `${hours}h ago`;
};
