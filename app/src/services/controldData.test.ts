import { describe, expect, it } from 'vitest';
import {
  collectRouteLocations,
  normalizeControlDRuleFolders,
  normalizeControlDRules,
  normalizeProfileServiceRules,
} from './controldData';

describe('Control D documented data shapes', () => {
  it('normalizes profile service action objects into dashboard state', () => {
    const catalog = [
      { PK: 'netflix', name: 'Netflix', category: 'video', status: 1, locations: ['LON', 'YYZ'] },
      { PK: 'tiktok', name: 'TikTok', category: 'social', status: 1, locations: ['LON'] },
    ];
    const rules = [
      {
        PK: 'netflix',
        name: 'Netflix',
        category: 'video',
        locations: ['LON', 'YYZ'],
        action: { do: 3, status: 1, via: 'YYZ' },
      },
      {
        PK: 'tiktok',
        name: 'TikTok',
        category: 'social',
        locations: ['LON'],
        action: { do: 0, status: 1 },
      },
    ];

    expect(normalizeProfileServiceRules(catalog, rules)).toEqual([
      expect.objectContaining({ PK: 'netflix', status: 3, do: 3, via: 'YYZ' }),
      expect.objectContaining({ PK: 'tiktok', status: 0, do: 0 }),
    ]);
  });

  it('normalizes custom rules without rendering action objects', () => {
    expect(
      normalizeControlDRules([
        { PK: 'example.com', group: 2, order: 1, action: { do: 0, status: 1 } },
        { PK: 'video.example', group: 3, order: 2, action: { do: 3, status: 1, via: 'LON' } },
      ])
    ).toEqual([
      expect.objectContaining({ hostname: 'example.com', action: 'block', group: '2' }),
      expect.objectContaining({ hostname: 'video.example', action: 'redirect', value: 'LON', group: '3' }),
    ]);
  });

  it('normalizes rule folders from documented group/action shape', () => {
    expect(
      normalizeControlDRuleFolders([
        { PK: 2, group: 'Streaming', count: 5, action: { do: 3, status: 1 } },
      ])
    ).toEqual([
      expect.objectContaining({ PK: '2', name: 'Streaming', count: 5, status: 1, action: 'redirect' }),
    ]);
  });

  it('collects route locations from service lists and current routing rules', () => {
    expect(
      collectRouteLocations([
        { PK: 'one', name: 'One', category: 'video', status: 1, locations: ['LON'] },
        { PK: 'two', name: 'Two', category: 'video', status: 3, via: 'YYZ' },
        { PK: 'three', name: 'Three', category: 'video', status: 1, unlock_location: 'JFK' },
      ])
    ).toEqual(['LON', 'YYZ', 'JFK']);
  });
});
