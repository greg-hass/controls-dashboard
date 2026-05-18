import { describe, expect, it } from 'vitest';
import {
  formatRouteLocation,
  normalizeRouteLocationRecords,
} from './routeLocations';

describe('route location labels', () => {
  it('formats known proxy identifiers as readable city and country labels', () => {
    expect(formatRouteLocation('LON')).toEqual({
      code: 'LON',
      flag: '🇬🇧',
      label: 'United Kingdom',
      shortLabel: 'United Kingdom',
    });
  });

  it('uses API proxy metadata before falling back to the built-in code map', () => {
    const locations = normalizeRouteLocationRecords({
      proxies: [{ PK: 'YYZ', city: 'Toronto', country: 'Canada' }],
    });

    expect(formatRouteLocation('YYZ', locations).label).toBe('Canada');
  });

  it('formats ISO country codes as countries with flags', () => {
    expect(formatRouteLocation('AE')).toMatchObject({
      code: 'AE',
      flag: '🇦🇪',
      label: 'United Arab Emirates',
    });
    expect(formatRouteLocation('GB')).toMatchObject({
      code: 'GB',
      flag: '🇬🇧',
      label: 'United Kingdom',
    });
  });
});
