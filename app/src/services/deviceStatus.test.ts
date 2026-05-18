import { describe, expect, it } from 'vitest';
import {
  formatDeviceLastActivity,
  getDeviceActivityMeta,
  getDeviceStateMeta,
  normalizeControlDDevice,
  summarizeDeviceActivity,
} from './deviceStatus';

describe('Control D device status handling', () => {
  it('treats Control D device status as endpoint state, not online presence', () => {
    expect(getDeviceStateMeta({ status: 1 }).label).toBe('Enabled');
    expect(getDeviceActivityMeta({ activity: undefined }).label).toBe('Activity unknown');
  });

  it('labels Control D disabled states from documented status values', () => {
    expect(getDeviceStateMeta({ status: 2 }).label).toBe('Paused');
    expect(getDeviceStateMeta({ status: 3 }).label).toBe('Disabled');
  });

  it('normalizes documented GET /devices fields without inventing client counts', () => {
    expect(
      normalizeControlDDevice({
        PK: 'dev',
        name: 'Router',
        profile: { PK: 'profile_a', name: 'Home' },
        icon: 'router',
        resolvers: { doh: 'https://freedns.controld.com/dev' },
        last_activity: '1710000000',
      })
    ).toMatchObject({
      PK: 'dev',
      name: 'Router',
      profile: 'profile_a',
      profile_name: 'Home',
      type: 'router',
      resolver: 'https://freedns.controld.com/dev',
      last_activity: 1710000000,
    });
  });

  it('keeps configured client count separate when the API returns it', () => {
    expect(normalizeControlDDevice({ PK: 'dev', name: 'Router', client_count: '12' }))
      .toMatchObject({ configured_clients: 12 });
  });

  it('summarizes recent /access entries as activity separate from device status', () => {
    expect(
      summarizeDeviceActivity([{ ip: '198.51.100.10', date: 1_710_000_000 }], 1_710_000_120_000)
    ).toMatchObject({
      state: 'online',
      label: 'Online',
      lastSeen: 1_710_000_000,
      knownIpCount: 1,
    });

    expect(
      summarizeDeviceActivity([{ ip: '198.51.100.10', date: 1_710_000_000 }], 1_710_001_000_000)
    ).toMatchObject({ state: 'offline', label: 'Offline' });
  });

  it('formats optional last activity only when the API provides it', () => {
    expect(formatDeviceLastActivity(undefined, 1_710_000_600_000)).toBe('');
    expect(formatDeviceLastActivity(1_710_000_000, 1_710_000_600_000)).toBe('10m ago');
  });
});
