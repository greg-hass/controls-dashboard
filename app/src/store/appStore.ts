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
} from '@/types/controld';
import * as mock from '@/data/mock';
import { api } from '@/services/api';

interface AppState {
  // Settings
  settings: AppSettings;
  setSettings: (settings: Partial<AppSettings>) => void;

  // Data
  user: User | null;
  profiles: Profile[];
  devices: Device[];
  services: Service[];
  serviceCategories: ServiceCategory[];
  filters: Filter[];
  customRules: CustomRule[];
  ruleFolders: RuleFolder[];
  analyticsLevels: AnalyticsLevel[];
  storageRegions: StorageRegion[];
  ipInfo: IPInfo | null;
  networkStats: NetworkStats[];
  quickActions: QuickAction[];

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
  refreshRules: (profileId: string) => Promise<void>;

  // Mutations
  updateProfileServices: (profileId: string, serviceId: string, status: number) => Promise<void>;
  updateFilter: (profileId: string, filterId: string, status: number) => Promise<void>;
  updateDeviceProfile: (deviceId: string, profileId: string) => Promise<void>;
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
    const profileName =
      device.profile_name ||
      profileById.get(device.profile) ||
      profileByName.get(device.profile) ||
      device.profile ||
      '';

    return {
      ...device,
      profile_name: profileName,
    };
  });
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
      serviceCategories: [],
      filters: [],
      customRules: [],
      ruleFolders: [],
      analyticsLevels: [],
      storageRegions: [],
      ipInfo: null,
      networkStats: [],
      quickActions: mock.mockQuickActions,

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

          const allServices: Service[] = [];
          for (const cat of serviceCategories) {
            try {
              const svcs = await api.getServicesByCategory(cat.PK);
              allServices.push(...asArray<Service>(svcs.body));
            } catch (e) {
              // Some categories may be empty
            }
          }

          set({
            user: userRes.body,
            profiles,
            devices,
            services: allServices,
            serviceCategories,
            ipInfo: ipRes.body,
            networkStats,
            isLoading: false,
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
        } catch (err) {
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
        } catch (err) {
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
          const allServices: Service[] = [];
          for (const cat of serviceCategories) {
            try {
              const svcs = await api.getServicesByCategory(cat.PK);
              allServices.push(...asArray<Service>(svcs.body));
            } catch (e) { /* ignore */ }
          }
          set({ services: allServices, serviceCategories });
        } catch (err) {
          set({ error: 'Failed to refresh services' });
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
            customRules: asArray<CustomRule>(rulesRes.body),
            ruleFolders: asArray<RuleFolder>(foldersRes.body),
          });
        } catch (err) {
          set({ error: 'Failed to refresh rules' });
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
          await get().refreshServices();
        } catch (err) {
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
        } catch (err) {
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
        } catch (err) {
          set({ error: 'Failed to update device' });
        }
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
        } catch (err) {
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
        } catch (err) {
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
