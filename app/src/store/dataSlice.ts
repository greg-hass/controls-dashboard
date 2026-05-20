import type { User, Profile, Device, Service, ServiceCategory, Filter, CustomRule, RuleFolder, AnalyticsLevel, StorageRegion, IPInfo, NetworkStats, QuickAction, RouteLocation, AccessIP } from '@/types/controld';
import * as mock from '@/data/mock';
import { api } from '@/services/api';
import { normalizeControlDRuleFolders, normalizeControlDRules, normalizeProfileServiceRules } from '@/services/controldData';
import { normalizeControlDDevice, summarizeDeviceActivity } from '@/services/deviceStatus';
import { normalizeRouteLocationRecords } from '@/services/routeLocations';

export interface DataSlice {
  // Data
  user: User | null;
  profiles: Profile[];
  devices: Device[];
  services: Service[];
  profileServices: Record<string, Service[]>;
  serviceCategories: ServiceCategory[];
  filters: Filter[];
  customRules: CustomRule[];
  ruleFolders: RuleFolder[];
  analyticsLevels: AnalyticsLevel[];
  storageRegions: StorageRegion[];
  ipInfo: IPInfo | null;
  networkStats: NetworkStats[];
  routeLocations: Record<string, RouteLocation>;
  quickActions: QuickAction[];
  apiWarnings: string[];

  // Data Loading
  loadAllData: () => Promise<void>;
  refreshProfiles: () => Promise<void>;
  refreshDevices: () => Promise<void>;
  refreshServices: () => Promise<void>;
  loadProfileServices: (profileId: string) => Promise<void>;
  loadProfileFilters: (profileId: string) => Promise<void>;
  refreshRules: (profileId: string) => Promise<void>;
}

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Unknown error';

type ApiWarningState = {
  apiWarnings?: string[];
};

type StoreSet = (patch: ((state: ApiWarningState) => ApiWarningState) | ApiWarningState) => void;

const appendApiWarning = (set: StoreSet, warning: string) => {
  set((state) => ({
    apiWarnings: [...(state.apiWarnings ?? []), warning],
  }));
};

export const asArray = <T>(value: unknown): T[] => {
  if (Array.isArray(value)) {
    return value as T[];
  }

  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).flatMap((item) =>
      Array.isArray(item) ? item : [item]
    ) as T[];
  }

  return [];
};

export const extractApiArray = <T>(value: unknown, key?: string): T[] => {
  if (Array.isArray(value)) return value as T[];

  if (key && hasObjectValue(value)) {
    const keyedValue = value[key];
    if (Array.isArray(keyedValue)) return keyedValue as T[];
    if (hasObjectValue(keyedValue)) return Object.values(keyedValue) as T[];
  }

  return asArray<T>(value).filter((item) => hasObjectValue(item) || typeof item !== 'boolean');
};

export const extractAccessEntries = (value: unknown): AccessIP[] => {
  const candidate = hasObjectValue(value) && value.ips !== undefined ? value.ips : value;

  if (Array.isArray(candidate)) {
    return candidate.filter(hasObjectValue).map((entry) => entry as AccessIP);
  }

  if (hasObjectValue(candidate)) {
    return Object.entries(candidate).flatMap(([ip, entry]) => {
      if (hasObjectValue(entry)) {
        return [{ ip, ...entry } as AccessIP];
      }
      if (typeof entry === 'string' || typeof entry === 'number') {
        return [{ ip, date: entry } as AccessIP];
      }
      return [];
    });
  }

  return [];
};

const hasObjectValue = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const normalizeNetworkStats = (value: unknown): NetworkStats[] =>
  asArray<Record<string, unknown>>(value)
    .filter(hasObjectValue)
    .map((item) => ({
      pop: String(item.iata_code ?? item.pop ?? item.PK ?? item.id ?? 'unknown'),
      location: String(item.city_name ?? item.location ?? item.name ?? item.pop ?? 'Unknown'),
      latency: typeof item.latency === 'number' ? item.latency : undefined,
      services: {
        dns: Boolean(hasObjectValue(item.status) ? item.status.dns : hasObjectValue(item.services) ? item.services.dns : item.dns),
        doh: Boolean(hasObjectValue(item.status) ? item.status.doh : hasObjectValue(item.services) ? item.services.doh : item.doh),
        dot: Boolean(hasObjectValue(item.status) ? item.status.dot : hasObjectValue(item.services) ? item.services.dot : item.dot),
        proxy: Boolean(hasObjectValue(item.status) ? item.status.pxy : hasObjectValue(item.services) ? item.services.proxy : item.proxy),
      },
    }))
    .filter((item) => item.pop !== 'unknown');

const enrichDevicesWithProfileNames = (deviceList: Device[], profileList: Profile[]) => {
  const profileById = new Map(profileList.map((profile) => [profile.PK, profile.name]));
  const profileByName = new Map(profileList.map((profile) => [profile.name, profile.name]));

  return deviceList.map((device) => {
    const normalized = normalizeControlDDevice(device);
    const profileId = normalized.profile;
    const profileName =
      normalized.profile_name ||
      profileById.get(profileId) ||
      profileByName.get(profileId) ||
      profileId ||
      'Default';

    return {
      ...normalized,
      profile_name: profileName,
    };
  });
};

const extractDevicesBody = (value: unknown): { devices: Device[] } => {
  if (hasObjectValue(value) && Array.isArray(value.devices)) {
    return { devices: value.devices };
  }

  if (Array.isArray(value)) {
    return { devices: value };
  }

  return { devices: [] };
};

let loadSequence = 0;

const loadServicesByCategories = async (
  categories: ServiceCategory[],
  warn?: (warning: string) => void
): Promise<Service[]> => {
  const allServices: Service[] = [];

  for (const category of categories) {
    try {
      const res = await api.getServices(category.PK);
      const services = extractApiArray<Partial<Service>>(res.body, 'services');
      allServices.push(
        ...services.map((service) => ({
          ...service,
          category: category.PK,
          status: 1,
        } as Service))
      );
    } catch (error) {
      warn?.(`Services for category ${category.PK} could not be loaded: ${getErrorMessage(error)}`);
    }
  }

  return allServices;
};

const loadDeviceActivitySummaries = async (
  devices: Device[],
  warn?: (warning: string) => void
): Promise<Record<string, ReturnType<typeof summarizeDeviceActivity>>> => {
  const activityByDeviceId: Record<string, ReturnType<typeof summarizeDeviceActivity>> = {};

  for (const device of devices) {
    try {
      const res = await api.getDeviceActivity(device.PK);
      const entries = extractAccessEntries(res.body);
      activityByDeviceId[device.PK] = summarizeDeviceActivity(entries);
    } catch (error) {
      warn?.(`Activity for device ${device.PK} could not be loaded: ${getErrorMessage(error)}`);
    }
  }

  return activityByDeviceId;
};

export const createDataSlice = (set: any, get: any): DataSlice => ({
  user: null,
  profiles: [],
  devices: [],
  services: [],
  profileServices: {},
  serviceCategories: [],
  filters: [],
  customRules: [],
  ruleFolders: [],
  analyticsLevels: [],
  storageRegions: [],
  ipInfo: null,
  networkStats: [],
  routeLocations: {},
  quickActions: mock.mockQuickActions,
  apiWarnings: [],

  loadAllData: async () => {
    const currentLoad = ++loadSequence;
    set({ isLoading: true, error: null, apiWarnings: [] });
    try {
      const { settings } = get();

      if (settings.demoMode) {
        await new Promise((r) => setTimeout(r, 800));
        set({
          user: mock.mockUser,
          profiles: mock.mockProfiles,
          devices: mock.mockDevices,
          services: mock.mockServices,
          serviceCategories: mock.mockServiceCategories,
          filters: mock.mockFilters,
          customRules: mock.mockCustomRules,
          ruleFolders: mock.mockRuleFolders,
          analyticsLevels: mock.mockAnalyticsLevels,
          storageRegions: mock.mockStorageRegions,
          ipInfo: mock.mockIPInfo,
          networkStats: mock.mockNetworkStats,
          routeLocations: normalizeRouteLocationRecords(mock.mockStorageRegions),
          quickActions: mock.mockQuickActions,
          apiWarnings: [],
          isLoading: false,
        });
        return;
      }

      api.setToken(settings.apiToken);
      api.setBaseUrl(settings.apiBaseUrl);
      set({
        user: null,
        profiles: [],
        devices: [],
        services: [],
        serviceCategories: [],
        filters: [],
        customRules: [],
        ruleFolders: [],
        analyticsLevels: [],
        storageRegions: [],
        ipInfo: null,
        networkStats: [],
        routeLocations: {},
        apiWarnings: [],
      });

      const [userRes, profilesRes, devicesRes, categoriesRes, ipRes, netRes, proxiesRes] = await Promise.all([
        api.getUser(),
        api.getProfiles(),
        api.getDevices(),
        api.getServiceCategories(),
        api.getIP(),
        api.getNetworkStats(),
        api.getProxies().catch(() => ({ body: [], success: true })),
      ]);

      const profiles = extractApiArray<Profile>(profilesRes.body, 'profiles');
      const devicesBody = extractDevicesBody(devicesRes.body);
      const devices = enrichDevicesWithProfileNames(devicesBody.devices, profiles);
      const serviceCategories = extractApiArray<ServiceCategory>(categoriesRes.body, 'categories');
      const networkStats = normalizeNetworkStats(
        hasObjectValue(netRes.body) && Array.isArray(netRes.body.network)
          ? netRes.body.network
          : netRes.body
      );
      const routeLocations = normalizeRouteLocationRecords(proxiesRes.body);

      set({
        user: userRes.body,
        profiles,
        devices,
        serviceCategories,
        ipInfo: ipRes.body,
        networkStats,
        routeLocations,
        isLoading: false,
      });

      void loadServicesByCategories(
        serviceCategories,
        (warning) => appendApiWarning(set, warning)
      ).then((allServices) => {
        if (currentLoad === loadSequence) {
          set({ services: allServices });
        }
      });

      void loadDeviceActivitySummaries(
        devices,
        (warning) => appendApiWarning(set, warning)
      ).then((activityByDeviceId) => {
        if (currentLoad === loadSequence) {
          set((state: any) => ({
            devices: state.devices.map((device: Device) => ({
              ...device,
              activity: activityByDeviceId[device.PK] ?? device.activity,
              known_ip_count: activityByDeviceId[device.PK]?.knownIpCount ?? device.known_ip_count,
              last_activity: activityByDeviceId[device.PK]?.lastSeen ?? device.last_activity,
            })),
          }));
        }
      });
    } catch (err) {
      set({
        user: null,
        profiles: [],
        devices: [],
        services: [],
        serviceCategories: [],
        filters: [],
        customRules: [],
        ruleFolders: [],
        analyticsLevels: [],
        storageRegions: [],
        ipInfo: null,
        networkStats: [],
        routeLocations: {},
        apiWarnings: [],
        error: err instanceof Error ? err.message : 'Failed to load data',
        isLoading: false,
      });
    }
  },

  refreshProfiles: async () => {
    if (get().settings.demoMode) {
      set({ profiles: mock.mockProfiles });
      return;
    }
    try {
      const res = await api.getProfiles();
      set({ profiles: extractApiArray<Profile>(res.body, 'profiles') });
    } catch {
      set({ error: 'Failed to refresh profiles' });
    }
  },

  refreshDevices: async () => {
    if (get().settings.demoMode) {
      set({ devices: mock.mockDevices });
      return;
    }
    try {
      const res = await api.getDevices();
      const devicesBody = extractDevicesBody(res.body);
      const devices = enrichDevicesWithProfileNames(devicesBody.devices, get().profiles);
      const activityByDeviceId = await loadDeviceActivitySummaries(
        devices,
        (warning) => appendApiWarning(set, warning)
      );
      set({
        devices: devices.map((device) => ({
          ...device,
          activity: activityByDeviceId[device.PK] ?? device.activity,
          known_ip_count: activityByDeviceId[device.PK]?.knownIpCount ?? device.known_ip_count,
          last_activity: activityByDeviceId[device.PK]?.lastSeen ?? device.last_activity,
        })),
      });
    } catch {
      set({ error: 'Failed to refresh devices' });
    }
  },

  refreshServices: async () => {
    if (get().settings.demoMode) {
      set({ services: mock.mockServices });
      return;
    }
    try {
      const categories = get().serviceCategories;
      if (categories.length === 0) {
        set({ error: 'No service categories loaded' });
        return;
      }
      const allServices = await loadServicesByCategories(
        categories,
        (warning) => appendApiWarning(set, warning)
      );
      set({ services: allServices });
    } catch {
      set({ error: 'Failed to refresh services' });
    }
  },

  loadProfileServices: async (profileId) => {
    if (get().settings.demoMode) {
      set((state: any) => ({
        profileServices: {
          ...state.profileServices,
          [profileId]: mock.mockServices,
        },
      }));
      return;
    }
    try {
      const [rulesRes, catalogRes] = await Promise.all([
        api.getProfileServices(profileId),
        api.getServiceCategories(),
      ]);

      const rules = extractApiArray<Partial<Service>>(rulesRes.body, 'rules');
      const categories = extractApiArray<ServiceCategory>(catalogRes.body, 'categories');

      const allCatalogServices = await loadServicesByCategories(
        categories,
        (warning) => appendApiWarning(set, warning)
      );
      const profileServices = normalizeProfileServiceRules(allCatalogServices, rules);

      set((state: any) => ({
        profileServices: {
          ...state.profileServices,
          [profileId]: profileServices,
        },
        services: allCatalogServices,
      }));
    } catch {
      set({ error: 'Failed to load profile services' });
    }
  },

  loadProfileFilters: async (profileId) => {
    if (get().settings.demoMode) {
      set({ filters: mock.mockFilters });
      return;
    }
    try {
      const [nativeRes, externalRes] = await Promise.all([
        api.getNativeFilters(profileId),
        api.getExternalFilters(profileId),
      ]);

      const nativeFilters = extractApiArray<Filter>(nativeRes.body, 'filters');
      const externalFilters = extractApiArray<Filter>(externalRes.body, 'filters');

      set({
        filters: [...nativeFilters, ...externalFilters],
      });
    } catch {
      set({ error: 'Failed to load profile filters' });
    }
  },

  refreshRules: async (profileId) => {
    if (get().settings.demoMode) {
      set({
        customRules: mock.mockCustomRules,
        ruleFolders: mock.mockRuleFolders,
      });
      return;
    }
    try {
      let foldersWarning: string | null = null;
      const [rulesRes, foldersRes] = await Promise.all([
        api.getCustomRules(profileId),
        api.getRuleFolders(profileId).catch((error) => {
          foldersWarning = `Rule folders could not be loaded: ${getErrorMessage(error)}`;
          return { body: [], success: true };
        }),
      ]);

      const rules = extractApiArray<Partial<CustomRule>>(rulesRes.body, 'rules');
      const folders = extractApiArray<Partial<RuleFolder>>(foldersRes.body, 'folders');

      set({
        customRules: normalizeControlDRules(rules),
        ruleFolders: normalizeControlDRuleFolders(folders),
      });
      if (foldersWarning) {
        appendApiWarning(set, foldersWarning);
      }
    } catch {
      set({ error: 'Failed to refresh rules' });
    }
  },
});
