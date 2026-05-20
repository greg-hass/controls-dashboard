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
  RouteLocation,
} from '@/types/controld';

export interface AppState {
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
  routeLocations: Record<string, RouteLocation>;
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
  updateProfileServices: (
    profileId: string,
    serviceId: string,
    status: number,
    via?: string
  ) => Promise<void>;
  updateFilter: (profileId: string, filterId: string, status: number) => Promise<void>;
  updateDeviceProfile: (deviceId: string, profileId: string) => Promise<void>;
  updateDeviceStatus: (deviceId: string, status: number) => Promise<void>;
  disableDeviceTemporarily: (deviceId: string, durationMinutes: number) => Promise<void>;
  restoreDeviceStatus: (deviceId: string) => Promise<void>;
  createCustomRule: (profileId: string, rule: Partial<CustomRule>) => Promise<void>;
  deleteCustomRule: (profileId: string, hostname: string) => Promise<void>;
}
