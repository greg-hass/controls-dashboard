import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  User,
  Profile,
  Device,
  Service,
  ServiceCategory,
  Filter,
  CustomRule,
  RuleFolder,
  AnalyticsLevel,
  StorageRegion,
  IPInfo,
  NetworkStats,
  QuickAction,
  AppSettings,
  DeviceSchedule,
} from '@/types/controld';
import * as mock from '@/data/mock';
import { api } from '@/services/api';
import { normalizeControlDDevice } from '@/services/deviceStatus';
import {
  loadSchedulerState,
  restoreDevicePause,
  scheduleDevicePause,
  syncSchedulerToken as syncSchedulerTokenApi,
} from '@/services/scheduler';

interface AppState {
  // Settings
  settings: AppSettings;
  setSettings: (settings: Partial<AppSettings>) => void;

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
  quickActions: QuickAction[];
  deviceSuspensions: Record<string, DeviceSchedule>;

  // UI State
  isLoading: boolean;
  error: string | null;
  activeTab: string;
  darkMode: boolean;
  sidebarOpen: boolean;

  // Actions
  setActiveTab: (tab: string) => void;
  setDarkMode: (dark: boolean) => void;
  toggleSidebar: () => void;
  setError: (error: string | null) => void;

  // Data Loading
  loadAllData: () => Promise<void>;
  refreshProfiles: () => Promise<void>;
  refreshDevices: () => Promise<void>;
  refreshServices: () => Promise<void>;
  loadProfileServices: (profileId: string) => Promise<void>;
  loadProfileFilters: (profileId: string) => Promise<void>;
  refreshRules: (profileId: string) => Promise<void>;
  loadDeviceSchedules: () => Promise<void>;
  syncSchedulerToken: () => Promise<void>;

  // Mutations
  updateProfileServices: (profileId: string, serviceId: string, status: number) => Promise<void>;
  updateFilter: (profileId: string, filterId: string, status: number) => Promise<void>;
  updateDeviceProfile: (deviceId: string, profileId: string) => Promise<void>;
  updateDeviceStatus: (deviceId: string, status: number) => Promise<void>;
  disableDeviceTemporarily: (deviceId: string, durationMinutes: number) => Promise<void>;
  restoreDeviceStatus: (deviceId: string) => Promise<void>;
  createCustomRule: (profileId: string, rule: Partial<CustomRule>) => Promise<void>;
  deleteCustomRule: (profileId: string, hostname: string) => Promise<void>;
}

const defaultSettings: AppSettings = {
  apiToken: '',
  apiBaseUrl: '/api',
  theme: 'dark',
  refreshInterval: 60,
  demoMode: true,
};

const normalizeApiBaseUrl = (url: string) => {
  const trimmed = url.trim().replace(/\/$/, '');
  return trimmed === 'https://api.controld.com' ? '/api' : trimmed;
};

const asArray = <T>(value: unknown): T[] => {
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

const hasObjectValue = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const normalizeNetworkStats = (value: unknown): NetworkStats[] =>
  asArray<Record<string, unknown>>(value)
    .filter(hasObjectValue)
    .map((item) => ({
      pop: String(item.pop ?? item.PK ?? item.id ?? 'unknown'),
      location: String(item.location ?? item.name ?? item.pop ?? 'Unknown'),
      latency: typeof item.latency === 'number' ? item.latency : undefined,
      services: {
        dns: Boolean(hasObjectValue(item.services) ? item.services.dns : item.dns),
        doh: Boolean(hasObjectValue(item.services) ? item.services.doh : item.doh),
        dot: Boolean(hasObjectValue(item.services) ? item.services.dot : item.dot),
        proxy: Boolean(hasObjectValue(item.services) ? item.services.proxy : item.proxy),
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
      '';

    return {
      ...normalized,
      profile: profileId,
      profile_name: profileName,
    };
  });
};

let loadSequence = 0;
const deviceSuspendTimers = new Map<string, ReturnType<typeof setTimeout>>();

const clearDeviceSuspendTimer = (deviceId: string) => {
  const timer = deviceSuspendTimers.get(deviceId);
  if (timer) {
    clearTimeout(timer);
  }
  deviceSuspendTimers.delete(deviceId);
};

const loadServicesByCategories = async (serviceCategories: ServiceCategory[]) => {
  const results = await Promise.all(
    serviceCategories.map(async (cat) => {
      try {
        const svcs = await api.getServicesByCategory(cat.PK);
        return asArray<Service>(svcs.body);
      } catch {
        return [];
      }
    })
  );

  return results.flat();
};

const toAppServiceStatus = (service: Service) => {
  if (service.status === 0) return 1;
  if (service.do === 0) return 0;
  if (service.do === 1) return 2;
  return service.status ?? 1;
};

const mergeProfileServiceRules = (catalog: Service[], rules: Service[]) => {
  const rulesById = new Map(rules.map((service) => [service.PK, service]));

  return catalog.map((service) => {
    const rule = rulesById.get(service.PK);
    if (!rule) {
      return { ...service, status: 1 };
    }

    return {
      ...service,
      ...rule,
      name: rule.name ?? service.name,
      category: rule.category ?? service.category,
      status: toAppServiceStatus(rule),
    };
  });
};

const toAppRuleAction = (rule: CustomRule): CustomRule['action'] => {
  if (rule.action) return rule.action;
  if (rule.do === 0) return 'block';
  if (rule.do === 1) return 'allow';
  return 'redirect';
};

const normalizeCustomRules = (rules: CustomRule[]) =>
  rules.map((rule) => ({
    ...rule,
    action: toAppRuleAction(rule),
    value: rule.value ?? rule.via,
  }));

const withoutDeviceSuspension = (
  suspensions: Record<string, DeviceSchedule>,
  deviceId: string
) => {
  const next = { ...suspensions };
  delete next[deviceId];
  return next;
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Settings
      settings: { ...defaultSettings },
      setSettings: (newSettings) => {
        const updated = {
          ...get().settings,
          ...newSettings,
          apiBaseUrl: normalizeApiBaseUrl(newSettings.apiBaseUrl ?? get().settings.apiBaseUrl),
        };
        set({ settings: updated });
        api.setToken(updated.apiToken);
        api.setBaseUrl(updated.apiBaseUrl);
      },

      // Data
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
      quickActions: mock.mockQuickActions,
      deviceSuspensions: {},

      // UI State
      isLoading: false,
      error: null,
      activeTab: 'overview',
      darkMode: true,
      sidebarOpen: true,

      // UI Actions
      setActiveTab: (tab) => set({ activeTab: tab }),
      setDarkMode: (dark) => set({ darkMode: dark }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setError: (error) => set({ error }),

      // Data Loading
      loadAllData: async () => {
        const currentLoad = ++loadSequence;
        set({ isLoading: true, error: null });
        try {
          const { settings } = get();

          if (settings.demoMode) {
            // Load mock data
            await new Promise((r) => setTimeout(r, 800)); // Simulate network
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
              quickActions: mock.mockQuickActions,
              isLoading: false,
            });
            return;
          }

          // Real API calls
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
          });

          const [userRes, profilesRes, devicesRes, categoriesRes, ipRes, netRes] = await Promise.all([
            api.getUser(),
            api.getProfiles(),
            api.getDevices(),
            api.getServiceCategories(),
            api.getIP(),
            api.getNetworkStats(),
          ]);

          const profiles = asArray<Profile>(profilesRes.body);
          const devices = enrichDevicesWithProfileNames(
            asArray<Device>(devicesRes.body),
            profiles
          );
          const serviceCategories = asArray<ServiceCategory>(categoriesRes.body);
          const networkStats = normalizeNetworkStats(netRes.body);

          set({
            user: userRes.body,
            profiles,
            devices,
            serviceCategories,
            ipInfo: ipRes.body,
            networkStats,
            isLoading: false,
          });

          void loadServicesByCategories(serviceCategories).then((allServices) => {
            if (currentLoad === loadSequence) {
              set({ services: allServices });
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
          set({ profiles: asArray<Profile>(res.body) });
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
          set((state) => ({
            devices: enrichDevicesWithProfileNames(asArray<Device>(res.body), state.profiles),
          }));
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
          const categoriesRes = await api.getServiceCategories();
          const serviceCategories = asArray<ServiceCategory>(categoriesRes.body);
          const allServices = await loadServicesByCategories(serviceCategories);
          set({ services: allServices, serviceCategories });
        } catch {
          set({ error: 'Failed to refresh services' });
        }
      },

      loadProfileServices: async (profileId: string) => {
        if (get().settings.demoMode) {
          // In demo mode, assign mock services with varied statuses per profile
          const demoStatuses: Record<string, number> = {
            prof_001: 0, // Strict Family: block most
            prof_002: 1, // Standard: allow most
            prof_003: 1, // Guest: allow all
            prof_004: 0, // Homework: block most
          };
          const status = demoStatuses[profileId] ?? 1;
          set((state) => ({
            profileServices: {
              ...state.profileServices,
              [profileId]: mock.mockServices.map((s) => ({
                ...s,
                status: s.category === 'social' || s.category === 'gaming'
                  ? (profileId === 'prof_002' ? s.status : status)
                  : s.status,
              })),
            },
          }));
          return;
        }
        try {
          const res = await api.getProfileServices(profileId);
          set((state) => ({
            profileServices: {
              ...state.profileServices,
              [profileId]: mergeProfileServiceRules(state.services, asArray<Service>(res.body)),
            },
          }));
        } catch {
          set({ error: 'Failed to load profile services' });
        }
      },

      loadProfileFilters: async (profileId: string) => {
        if (get().settings.demoMode) {
          set({ filters: mock.mockFilters });
          return;
        }
        try {
          const res = await api.getNativeFilters(profileId);
          set({ filters: asArray<Filter>(res.body) });
        } catch {
          set({ error: 'Failed to load profile filters' });
        }
      },

      refreshRules: async (profileId: string) => {
        if (get().settings.demoMode) {
          set({ customRules: mock.mockCustomRules, ruleFolders: mock.mockRuleFolders });
          return;
        }
        try {
          const [rulesRes, foldersRes] = await Promise.all([
            api.getCustomRules(profileId),
            api.getRuleFolders(profileId),
          ]);
          set({
            customRules: normalizeCustomRules(asArray<CustomRule>(rulesRes.body)),
            ruleFolders: asArray<RuleFolder>(foldersRes.body),
          });
        } catch {
          set({ error: 'Failed to refresh rules' });
        }
      },

      loadDeviceSchedules: async () => {
        const { settings } = get();

        if (settings.demoMode) {
          set({ deviceSuspensions: {} });
          return;
        }

        try {
          const schedules = await loadSchedulerState();
          set({
            deviceSuspensions: Object.fromEntries(
              schedules.map((schedule) => [schedule.deviceId, schedule])
            ),
          });
        } catch {
          set({ error: 'Failed to load device schedules' });
        }
      },

      syncSchedulerToken: async () => {
        const { settings } = get();
        try {
          await syncSchedulerTokenApi(settings.demoMode ? '' : settings.apiToken);
        } catch {
          set({ error: 'Failed to sync scheduler token' });
        }
      },

      // Mutations
      updateProfileServices: async (profileId, serviceId, status) => {
        if (get().settings.demoMode) {
          set((state) => ({
            services: state.services.map((s) =>
              s.PK === serviceId ? { ...s, status } : s
            ),
          }));
          return;
        }
        try {
          await api.updateService(profileId, serviceId, status);
          set((state) => ({
            services: state.services.map((service) =>
              service.PK === serviceId ? { ...service, status } : service
            ),
            profileServices: {
              ...state.profileServices,
              [profileId]: (state.profileServices[profileId] ?? state.services).map((service) =>
                service.PK === serviceId ? { ...service, status } : service
              ),
            },
          }));
        } catch {
          set({ error: 'Failed to update service' });
        }
      },

      updateFilter: async (profileId, filterId, status) => {
        if (get().settings.demoMode) {
          set((state) => ({
            filters: state.filters.map((f) =>
              f.PK === filterId ? { ...f, status } : f
            ),
          }));
          return;
        }
        try {
          await api.updateFilter(profileId, filterId, status);
          set((state) => ({
            filters: state.filters.map((filter) =>
              filter.PK === filterId ? { ...filter, status } : filter
            ),
          }));
        } catch {
          set({ error: 'Failed to update filter' });
        }
      },

      updateDeviceProfile: async (deviceId, profileId) => {
        if (get().settings.demoMode) {
          const profile = get().profiles.find((p) => p.PK === profileId);
          set((state) => ({
            devices: state.devices.map((d) =>
              d.PK === deviceId
                ? { ...d, profile: profileId, profile_name: profile?.name || '' }
                : d
            ),
          }));
          return;
        }
        try {
          await api.updateDevice(deviceId, { profile: profileId });
          await get().refreshDevices();
        } catch {
          set({ error: 'Failed to update device' });
        }
      },

      updateDeviceStatus: async (deviceId: string, status: number) => {
        if (get().settings.demoMode) {
          set((state) => ({
            devices: state.devices.map((device) =>
              device.PK === deviceId ? { ...device, status } : device
            ),
          }));
          return;
        }

        try {
          await api.updateDevice(deviceId, { status });
          set((state) => ({
            devices: state.devices.map((device) =>
              device.PK === deviceId ? { ...device, status } : device
            ),
          }));
        } catch (err) {
          set({ error: 'Failed to update device status' });
          throw err;
        }
      },

      disableDeviceTemporarily: async (deviceId, durationMinutes) => {
        const device = get().devices.find((item) => item.PK === deviceId);
        if (!device) {
          throw new Error('Device not found');
        }

        const restoreStatus = device.status === 2 ? 1 : device.status;
        const expiresAt = Date.now() + durationMinutes * 60 * 1000;

        if (get().settings.demoMode) {
          await get().updateDeviceStatus(deviceId, 2);

          set((state) => ({
            deviceSuspensions: {
              ...state.deviceSuspensions,
              [deviceId]: { deviceId, deviceName: device.name, expiresAt, restoreStatus },
            },
          }));

          clearDeviceSuspendTimer(deviceId);
          const timer = setTimeout(() => {
            void get().restoreDeviceStatus(deviceId).catch(() => undefined);
          }, durationMinutes * 60 * 1000);
          deviceSuspendTimers.set(deviceId, timer);
          return;
        }

        const schedule = await scheduleDevicePause({
          deviceId,
          deviceName: device.name,
          durationMinutes,
          restoreStatus,
        });

        set((state) => ({
          deviceSuspensions: {
            ...state.deviceSuspensions,
            [deviceId]: schedule,
          },
        }));
        await get().refreshDevices();
      },

      restoreDeviceStatus: async (deviceId) => {
        const suspension = get().deviceSuspensions[deviceId];
        const restoreStatus = suspension?.restoreStatus ?? 1;

        if (get().settings.demoMode) {
          clearDeviceSuspendTimer(deviceId);
          await get().updateDeviceStatus(deviceId, restoreStatus);

          set((state) => {
            return { deviceSuspensions: withoutDeviceSuspension(state.deviceSuspensions, deviceId) };
          });
          return;
        }

        await restoreDevicePause({ deviceId, restoreStatus });

        set((state) => {
          return { deviceSuspensions: withoutDeviceSuspension(state.deviceSuspensions, deviceId) };
        });
        await get().refreshDevices();
      },

      createCustomRule: async (profileId, rule) => {
        if (get().settings.demoMode) {
          const newRule = {
            ...rule,
            PK: `rule_${Date.now()}`,
            status: 1,
          } as CustomRule;
          set((state) => ({ customRules: [...state.customRules, newRule] }));
          return;
        }
        try {
          await api.createCustomRule(profileId, rule);
          await get().refreshRules(profileId);
        } catch {
          set({ error: 'Failed to create rule' });
        }
      },

      deleteCustomRule: async (profileId, hostname) => {
        if (get().settings.demoMode) {
          set((state) => ({
            customRules: state.customRules.filter((r) => r.hostname !== hostname),
          }));
          return;
        }
        try {
          await api.deleteCustomRule(profileId, hostname);
          await get().refreshRules(profileId);
        } catch {
          set({ error: 'Failed to delete rule' });
        }
      },
    }),
    {
      name: 'controld-home-storage',
      merge: (persisted, current) => {
        const persistedState = persisted as Partial<AppState>;
        const settings = {
          ...current.settings,
          ...persistedState.settings,
          apiBaseUrl: normalizeApiBaseUrl(
            persistedState.settings?.apiBaseUrl ?? current.settings.apiBaseUrl
          ),
        };

        return {
          ...current,
          ...persistedState,
          settings,
        };
      },
      partialize: (state) => ({
        settings: state.settings,
        darkMode: state.darkMode,
        sidebarOpen: state.sidebarOpen,
      }),
    }
  )
);
