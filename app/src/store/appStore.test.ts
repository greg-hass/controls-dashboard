import { describe, expect, it } from 'vitest';
import { extractAccessEntries, extractApiArray } from './appStore';

describe('Control D response extraction', () => {
  it('uses documented collection keys instead of flattening sibling metadata', () => {
    const devices = extractApiArray(
      {
        devices: [{ PK: 'dev_1', name: 'Endpoint' }],
        activity: true,
      },
      'devices'
    );

    expect(devices).toEqual([{ PK: 'dev_1', name: 'Endpoint' }]);
  });

  it('preserves IP keys from flexible /access responses', () => {
    expect(
      extractAccessEntries({
        ips: {
          '198.51.100.10': { date: 1_710_000_000 },
        },
      })
    ).toEqual([{ ip: '198.51.100.10', date: 1_710_000_000 }]);
  });
});
