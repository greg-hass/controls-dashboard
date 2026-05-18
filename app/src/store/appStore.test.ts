import { describe, expect, it } from 'vitest';
import { extractApiArray } from './appStore';

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
});
