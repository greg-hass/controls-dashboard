import type { Device } from '@/types/controld';

type RawControlDDevice = Partial<Device> | Record<string, unknown>;

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

  return {
    ...device,
    PK: String(device.PK ?? raw.id ?? ''),
    name: String(device.name ?? ''),
    type: normalizeDeviceType(device.type),
    profile: profileId,
    profile_name: profileName,
    status: normalizeNumber(device.status) ?? 0,
    resolver: typeof device.resolver === 'string' ? device.resolver : undefined,
    last_activity: normalizeActivityTimestamp(device.last_activity),
    clients: normalizeNumber(device.clients ?? device.client_count) ?? 0,
  };
};

export const getDeviceConnectionMeta = (device: Pick<Device, 'status'>) => {
  switch (device.status) {
    case 1:
      return {
        online: true,
        color: 'bg-emerald-500',
        label: 'Active',
        textColor: 'text-emerald-500',
      };
    case 2:
      return {
        online: false,
        color: 'bg-amber-500',
        label: 'Paused',
        textColor: 'text-amber-500',
      };
    case 3:
      return {
        online: false,
        color: 'bg-red-500',
        label: 'Disabled',
        textColor: 'text-red-500',
      };
    case 0:
      return {
        online: false,
        color: 'bg-slate-400',
        label: 'Pending',
        textColor: 'text-slate-400',
      };
    default:
      return {
        online: false,
        color: 'bg-slate-400',
        label: 'Unknown',
        textColor: 'text-slate-400',
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
