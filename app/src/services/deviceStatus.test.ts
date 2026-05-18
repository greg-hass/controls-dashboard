import { describe, expect, it } from 'vitest';
import {
  formatDeviceLastActivity,
  getDeviceConnectionMeta,
  normalizeControlDDevice,
} from './deviceStatus';

describe('Control D device status handling', () => {
  it('treats active Control D devices as online even when last_activity is absent', () => {
    expect(getDeviceConnectionMeta({ status: 1 }).online).toBe(true);
  });

  it('labels Control D disabled states from status instead of last_activity', () => {
    expect(getDeviceConnectionMeta({ status: 2 }).label).toBe('Paused');
    expect(getDeviceConnectionMeta({ status: 3 }).label).toBe('Disabled');
  });

  it('normalizes documented device fields into the app model', () => {
    expect(
      normalizeControlDDevice({
        PK: 'dev',
        name: 'Router',
        client_count: '12',
        profile: { PK: 'profile_a', name: 'Home' },
        type: { PK: 'router', name: 'Router / Network' },
        last_activity: '1710000000',
      })
    ).toMatchObject({
      PK: 'dev',
      name: 'Router',
      clients: 12,
      profile: 'profile_a',
      profile_name: 'Home',
      type: 'router',
      last_activity: 1710000000,
    });
  });

  it('formats optional last activity only when the API provides it', () => {
    expect(formatDeviceLastActivity(undefined, 1_710_000_600_000)).toBe('');
    expect(formatDeviceLastActivity(1_710_000_000, 1_710_000_600_000)).toBe('10m ago');
  });
});
