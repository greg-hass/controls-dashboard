// Control D API Type Definitions

export interface User {
  PK: string;
  email: string;
  status: number;
  email_status: number;
  proxy_access: number;
  last_active: number;
  twofa: number;
  date: string;
}

export interface ApiResponse<T> {
  body: T;
  success: boolean;
}

export interface Profile {
  PK: string;
  name: string;
  description: string;
  policies?: ProfilePolicies;
  filters?: Filter[];
  external_filters?: ExternalFilter[];
  services?: Service[];
  rules?: CustomRule[];
  groups?: RuleFolder[];
  default_rule?: DefaultRule;
}

export interface ProfilePolicies {
  log_level?: number;
  safesearch?: number;
  block_bypass?: number;
}

export interface Filter {
  PK: string;
  name: string;
  description: string;
  category: string;
  status: number;
  count?: number;
}

export interface ExternalFilter {
  PK: string;
  name: string;
  url: string;
  status: number;
}

export interface Service {
  PK: string;
  name: string;
  category: string;
  status: number; // app view: 0 = blocked, 1 = allowed/no rule, 2 = bypass
  do?: number; // Control D API rule type: 0 = block, 1 = bypass, 2 = spoof, 3 = redirect
  via?: string;
  via_v6?: string;
}

export interface ServiceCategory {
  PK: string;
  name: string;
  description: string;
  icon?: string;
}

export interface CustomRule {
  PK: string;
  hostname: string;
  action: 'block' | 'allow' | 'bypass' | 'redirect';
  do?: number;
  value?: string; // for redirect
  via?: string;
  via_v6?: string;
  group?: string;
  status: number;
}

export interface RuleFolder {
  PK: string;
  name: string;
  description: string;
  status: number;
}

export interface DefaultRule {
  action: 'block' | 'allow' | 'bypass';
}

export interface Device {
  PK: string;
  name: string;
  type: string;
  profile: string;
  profile_name?: string;
  status: number;
  resolver?: string;
  last_activity?: number;
  clients?: number;
}

export interface DeviceSchedule {
  deviceId: string;
  deviceName?: string;
  expiresAt: number;
  restoreStatus: number;
}

export interface DeviceType {
  PK: string;
  name: string;
  description: string;
}

export interface AccessIP {
  ip: string;
  date: number;
  learned: number;
}

export interface AnalyticsLevel {
  PK: number;
  name: string;
  description: string;
}

export interface StorageRegion {
  PK: string;
  name: string;
  location: string;
}

export interface NetworkStats {
  pop: string;
  location: string;
  services: {
    dns: boolean;
    doh: boolean;
    dot: boolean;
    proxy: boolean;
  };
  latency?: number;
}

export interface IPInfo {
  ip: string;
  city: string;
  country: string;
  org: string;
  pop: string;
}

export interface QuickAction {
  id: string;
  name: string;
  description: string;
  icon: string;
  services_to_block?: string[];
  services_to_allow?: string[];
  duration_minutes?: number;
  profile_ids?: string[];
}

export interface AppSettings {
  apiToken: string;
  apiBaseUrl: string;
  theme: 'light' | 'dark' | 'system';
  refreshInterval: number;
  demoMode: boolean;
}
