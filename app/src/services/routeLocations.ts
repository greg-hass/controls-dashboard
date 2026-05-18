import type { RouteLocation } from '@/types/controld';

type RawRouteLocation = Record<string, unknown>;

const KNOWN_ROUTE_LOCATIONS: Record<string, RouteLocation> = {
  AMS: { code: 'AMS', city: 'Amsterdam', country: 'Netherlands', flag: '🇳🇱' },
  ATL: { code: 'ATL', city: 'Atlanta', country: 'United States', flag: '🇺🇸' },
  BNE: { code: 'BNE', city: 'Brisbane', country: 'Australia', flag: '🇦🇺' },
  BOM: { code: 'BOM', city: 'Mumbai', country: 'India', flag: '🇮🇳' },
  CDG: { code: 'CDG', city: 'Paris', country: 'France', flag: '🇫🇷' },
  DFW: { code: 'DFW', city: 'Dallas', country: 'United States', flag: '🇺🇸' },
  DUB: { code: 'DUB', city: 'Dublin', country: 'Ireland', flag: '🇮🇪' },
  FRA: { code: 'FRA', city: 'Frankfurt', country: 'Germany', flag: '🇩🇪' },
  HKG: { code: 'HKG', city: 'Hong Kong', country: 'Hong Kong', flag: '🇭🇰' },
  IAD: { code: 'IAD', city: 'Washington, DC', country: 'United States', flag: '🇺🇸' },
  JFK: { code: 'JFK', city: 'New York', country: 'United States', flag: '🇺🇸' },
  LAX: { code: 'LAX', city: 'Los Angeles', country: 'United States', flag: '🇺🇸' },
  LHR: { code: 'LHR', city: 'London', country: 'United Kingdom', flag: '🇬🇧' },
  LON: { code: 'LON', city: 'London', country: 'United Kingdom', flag: '🇬🇧' },
  MAD: { code: 'MAD', city: 'Madrid', country: 'Spain', flag: '🇪🇸' },
  MAN: { code: 'MAN', city: 'Manchester', country: 'United Kingdom', flag: '🇬🇧' },
  MIA: { code: 'MIA', city: 'Miami', country: 'United States', flag: '🇺🇸' },
  NRT: { code: 'NRT', city: 'Tokyo', country: 'Japan', flag: '🇯🇵' },
  ORD: { code: 'ORD', city: 'Chicago', country: 'United States', flag: '🇺🇸' },
  SFO: { code: 'SFO', city: 'San Francisco', country: 'United States', flag: '🇺🇸' },
  SIN: { code: 'SIN', city: 'Singapore', country: 'Singapore', flag: '🇸🇬' },
  SYD: { code: 'SYD', city: 'Sydney', country: 'Australia', flag: '🇦🇺' },
  YYZ: { code: 'YYZ', city: 'Toronto', country: 'Canada', flag: '🇨🇦' },
};

const isObject = (value: unknown): value is RawRouteLocation =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const readString = (value: unknown) =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;

const regionNames = typeof Intl !== 'undefined' && 'DisplayNames' in Intl
  ? new Intl.DisplayNames(['en'], { type: 'region' })
  : undefined;

const countryCodeToFlag = (code: string) => {
  if (!/^[A-Z]{2}$/.test(code)) return undefined;
  const base = 127397;
  return [...code].map((letter) => String.fromCodePoint(letter.charCodeAt(0) + base)).join('');
};

const routeLocationFromIsoCountry = (code: string): RouteLocation | undefined => {
  if (!/^[A-Z]{2}$/.test(code)) return undefined;
  const country = regionNames?.of(code);
  if (!country || country === code) return undefined;

  return {
    code,
    country,
    flag: countryCodeToFlag(code),
  };
};

const pickCollection = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value;
  if (!isObject(value)) return [];

  const candidates = [value.proxies, value.locations, value.body];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
    if (isObject(candidate)) {
      const nested = pickCollection(candidate);
      if (nested.length > 0) return nested;
    }
  }

  return Object.values(value);
};

export const normalizeRouteLocationRecords = (value: unknown): Record<string, RouteLocation> => {
  const locations = pickCollection(value)
    .filter(isObject)
    .flatMap((item) => {
      const code = readString(item.PK) ?? readString(item.code) ?? readString(item.id);
      if (!code) return [];
      return [{
        code: code.toUpperCase(),
        city: readString(item.city),
        country: readString(item.country) ?? readString(item.country_name),
        name: readString(item.name) ?? readString(item.location),
        flag: readString(item.flag),
      }];
    });

  return Object.fromEntries(locations.map((location) => [location.code, location]));
};

export const formatRouteLocation = (
  code: string,
  routeLocations: Record<string, RouteLocation> = {}
) => {
  const normalizedCode = code.toUpperCase();
  const location =
    routeLocations[normalizedCode] ??
    KNOWN_ROUTE_LOCATIONS[normalizedCode] ??
    routeLocationFromIsoCountry(normalizedCode);
  const label = location?.country ?? location?.name ?? location?.city ?? normalizedCode;

  return {
    code: normalizedCode,
    flag: location?.flag ?? '🌐',
    label,
    shortLabel: label,
  };
};
