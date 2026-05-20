import type {
  User,
  Profile,
  Device,
  DeviceType,
  ServiceCategory,
  Service,
  Filter,
  CustomRule,
  RuleFolder,
  DefaultRule,
  AccessIP,
  AnalyticsLevel,
  StorageRegion,
  IPInfo,
  NetworkStats,
  ApiResponse,
  RouteLocation,
} from '@/types/controld';

type ControlDFormValue = string | number | boolean | null | undefined;
type ControlDFormPayload = Record<string, ControlDFormValue | ControlDFormValue[]>;

export const buildControlDFormBody = (payload: ControlDFormPayload) => {
  const body = new URLSearchParams();

  Object.entries(payload).forEach(([key, value]) => {
    const values = Array.isArray(value) ? value : [value];
    values.forEach((item) => {
      if (item !== undefined && item !== null && item !== '') {
        body.append(key, String(item));
      }
    });
  });

  return body;
};

export const toControlDServiceRulePayload = (status: number, via?: string) => {
  if (status === 0) {
    return { do: 0, status: 1 };
  }

  if (status === 2) {
    return { do: 1, status: 1 };
  }

  if (status === 3) {
    return { do: 3, status: 1, via };
  }

  // allow / no rule - disable the rule entirely
  return { status: 0 };
};

export const toControlDDevicePayload = (device: Partial<Device>) => {
  const payload: ControlDFormPayload = {};

  if (device.name !== undefined) payload.name = device.name;
  if (device.configured_clients !== undefined) payload.client_count = device.configured_clients;
  if (device.client_count !== undefined) payload.client_count = device.client_count;
  if (device.profile !== undefined) payload.profile_id = device.profile;
  if (device.status !== undefined) payload.status = device.status;
  if (device.icon !== undefined) payload.icon = device.icon;
  if (device.type !== undefined) payload.icon = device.type;

  return payload;
};

const customRuleActionToDo = (rule: Partial<CustomRule>) => {
  if (rule.action === 'block') return 0;
  if (rule.action === 'allow' || rule.action === 'bypass') return 1;
  if (rule.action === 'redirect') return 3;
  return 2;
};

export const toControlDCustomRulePayload = (rule: Partial<CustomRule>) => ({
  do: customRuleActionToDo(rule),
  status: rule.status ?? 1,
  via: rule.value,
  group: rule.group,
  'hostnames[]': rule.hostname,
});

export class ControlDApi {
  private token: string = '';
  private baseUrl: string = '/api';
  private requestTimeoutMs: number = 15000;

  setToken(token: string) {
    this.token = token;
  }

  setBaseUrl(url: string) {
    this.baseUrl = url.replace(/\/$/, '');
  }

  getToken(): string {
    return this.token;
  }

  setRequestTimeoutMs(timeoutMs: number) {
    this.requestTimeoutMs = Math.max(0, timeoutMs);
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    if (!this.token) {
      throw new Error('API token not set');
    }

    const url = `${this.baseUrl}${endpoint}`;
    const isFormBody = options.body instanceof URLSearchParams;
    const headers = new Headers(options.headers);
    headers.set('Authorization', `Bearer ${this.token}`);
    headers.set('Accept', 'application/json');
    if (isFormBody) {
      headers.set('Content-Type', 'application/x-www-form-urlencoded;charset=UTF-8');
    } else if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const controller = new AbortController();
    const timeout = this.requestTimeoutMs > 0
      ? globalThis.setTimeout(() => controller.abort(), this.requestTimeoutMs)
      : undefined;

    let response: Response;
    try {
      response = await fetch(url, {
        ...options,
        headers,
        signal: options.signal ?? controller.signal,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error(`Control D API request timed out after ${this.requestTimeoutMs}ms`);
      }
      throw error;
    } finally {
      if (timeout !== undefined) {
        globalThis.clearTimeout(timeout);
      }
    }

    let data: {
      success?: boolean;
      error?: {
        message?: string;
      };
    };

    try {
      data = await response.json();
    } catch {
      throw new Error(`Control D API error: ${response.status} ${response.statusText || 'Request failed'}`);
    }

    if (!response.ok || data?.success === false) {
      const message = data?.error?.message || response.statusText || 'Request failed';
      throw new Error(`Control D API error: ${message}`);
    }

    return data as T;
  }

  // Account
  async getUser(): Promise<ApiResponse<User>> {
    return this.request<ApiResponse<User>>('/users');
  }

  // Profiles
  async getProfiles(): Promise<ApiResponse<Profile[]>> {
    return this.request<ApiResponse<Profile[]>>('/profiles');
  }

  async getProfile(pk: string): Promise<ApiResponse<Profile>> {
    return this.request<ApiResponse<Profile>>(`/profiles/${pk}`);
  }

  async createProfile(profile: Partial<Profile>): Promise<ApiResponse<Profile>> {
    return this.request<ApiResponse<Profile>>('/profiles', {
      method: 'POST',
      body: buildControlDFormBody({
        name: profile.name,
        clone_profile_id: profile.PK,
      }),
    });
  }

  async updateProfile(pk: string, profile: Partial<Profile> & { disable?: number; lock?: number }): Promise<ApiResponse<Profile>> {
    return this.request<ApiResponse<Profile>>(`/profiles/${pk}`, {
      method: 'PUT',
      body: buildControlDFormBody({
        name: profile.name,
        disable_ttl: profile.disable === 0 ? 1 : undefined,
        lock_status: profile.lock ? 1 : undefined,
      }),
    });
  }

  async deleteProfile(pk: string): Promise<ApiResponse<void>> {
    return this.request<ApiResponse<void>>(`/profiles/${pk}`, {
      method: 'DELETE',
    });
  }

  // Profile Options
  async getProfileOptions(): Promise<ApiResponse<Record<string, unknown>>> {
    return this.request<ApiResponse<Record<string, unknown>>>('/profiles/options');
  }

  async updateProfileOption(pk: string, name: string, status: number, value?: string | number): Promise<ApiResponse<unknown>> {
    return this.request<ApiResponse<unknown>>(`/profiles/${pk}/options/${name}`, {
      method: 'PUT',
      body: buildControlDFormBody({ status, value }),
    });
  }

  // Filters
  async getNativeFilters(pk: string): Promise<ApiResponse<Filter[]>> {
    return this.request<ApiResponse<Filter[]>>(`/profiles/${pk}/filters`);
  }

  async getExternalFilters(pk: string): Promise<ApiResponse<Filter[]>> {
    return this.request<ApiResponse<Filter[]>>(`/profiles/${pk}/filters/external`);
  }

  async updateFilter(pk: string, filter: string, status: number): Promise<ApiResponse<unknown>> {
    return this.request<ApiResponse<unknown>>(`/profiles/${pk}/filters/filter/${encodeURIComponent(filter)}`, {
      method: 'PUT',
      body: buildControlDFormBody({ status }),
    });
  }

  async batchUpdateFilters(pk: string, filters: Array<{ filter: string; status: number }>): Promise<ApiResponse<unknown>> {
    return this.request<ApiResponse<unknown>>(`/profiles/${pk}/filters`, {
      method: 'PUT',
      body: buildControlDFormBody({ filters: JSON.stringify(filters) }),
    });
  }

  // Services
  async getServiceCategories(): Promise<ApiResponse<ServiceCategory[]>> {
    return this.request<ApiResponse<ServiceCategory[]>>('/services/categories');
  }

  async getServicesByCategory(category: string): Promise<ApiResponse<Service[]>> {
    return this.request<ApiResponse<Service[]>>(`/services/categories/${category}`);
  }

  async getServices(category: string): Promise<ApiResponse<Service[]>> {
    return this.getServicesByCategory(category);
  }

  async getDeviceActivity(deviceId: string): Promise<ApiResponse<AccessIP[]>> {
    return this.getAccessIPs(deviceId);
  }

  async getProfileServices(pk: string): Promise<ApiResponse<Service[]>> {
    return this.request<ApiResponse<Service[]>>(`/profiles/${pk}/services`);
  }

  async updateService(
    pk: string,
    service: string,
    status: number,
    via?: string
  ): Promise<ApiResponse<unknown>> {
    return this.request<ApiResponse<unknown>>(`/profiles/${pk}/services/${service}`, {
      method: 'PUT',
      body: buildControlDFormBody(toControlDServiceRulePayload(status, via)),
    });
  }

  async updateProfileService(profileId: string, serviceId: string, status: number, via?: string): Promise<ApiResponse<unknown>> {
    return this.updateService(profileId, serviceId, status, via);
  }

  // Custom Rules
  async getCustomRules(pk: string, folderId?: string): Promise<ApiResponse<CustomRule[]>> {
    const url = folderId
      ? `/profiles/${pk}/rules/${folderId}`
      : `/profiles/${pk}/rules`;
    return this.request<ApiResponse<CustomRule[]>>(url);
  }

  async createCustomRule(pk: string, rule: Partial<CustomRule>): Promise<ApiResponse<CustomRule>> {
    return this.request<ApiResponse<CustomRule>>(`/profiles/${pk}/rules`, {
      method: 'POST',
      body: buildControlDFormBody(toControlDCustomRulePayload(rule)),
    });
  }

  async updateCustomRule(pk: string, rule: Partial<CustomRule>): Promise<ApiResponse<CustomRule>> {
    return this.request<ApiResponse<CustomRule>>(`/profiles/${pk}/rules`, {
      method: 'PUT',
      body: buildControlDFormBody(toControlDCustomRulePayload(rule)),
    });
  }

  async deleteCustomRule(pk: string, hostname: string): Promise<ApiResponse<void>> {
    return this.request<ApiResponse<void>>(`/profiles/${pk}/rules/${encodeURIComponent(hostname)}`, {
      method: 'DELETE',
    });
  }

  // Rule Folders
  async getRuleFolders(pk: string): Promise<ApiResponse<RuleFolder[]>> {
    return this.request<ApiResponse<RuleFolder[]>>(`/profiles/${pk}/groups`);
  }

  async createRuleFolder(pk: string, folder: Partial<RuleFolder>): Promise<ApiResponse<RuleFolder>> {
    return this.request<ApiResponse<RuleFolder>>(`/profiles/${pk}/groups`, {
      method: 'POST',
      body: buildControlDFormBody({
        name: folder.name,
        do: folder.do,
        status: folder.status,
        via: folder.via,
      }),
    });
  }

  async updateRuleFolder(pk: string, folder: string, data: Partial<RuleFolder>): Promise<ApiResponse<RuleFolder>> {
    return this.request<ApiResponse<RuleFolder>>(`/profiles/${pk}/groups/${folder}`, {
      method: 'PUT',
      body: buildControlDFormBody({
        name: data.name,
        do: data.do,
        status: data.status,
        via: data.via,
      }),
    });
  }

  async deleteRuleFolder(pk: string, folder: string): Promise<ApiResponse<void>> {
    return this.request<ApiResponse<void>>(`/profiles/${pk}/groups/${folder}`, {
      method: 'DELETE',
    });
  }

  // Default Rule
  async getDefaultRule(pk: string): Promise<ApiResponse<DefaultRule>> {
    return this.request<ApiResponse<DefaultRule>>(`/profiles/${pk}/default`);
  }

  async updateDefaultRule(pk: string, doValue: number, status: number, via?: string): Promise<ApiResponse<DefaultRule>> {
    return this.request<ApiResponse<DefaultRule>>(`/profiles/${pk}/default`, {
      method: 'PUT',
      body: buildControlDFormBody({ do: doValue, status, via }),
    });
  }

  // Devices
  async getDevices(): Promise<ApiResponse<Device[]>> {
    return this.request<ApiResponse<Device[]>>('/devices');
  }

  async getDevice(pk: string): Promise<ApiResponse<Device>> {
    return this.request<ApiResponse<Device>>(`/devices/${pk}`);
  }

  async createDevice(device: Partial<Device>): Promise<ApiResponse<Device>> {
    return this.request<ApiResponse<Device>>('/devices', {
      method: 'POST',
      body: buildControlDFormBody(toControlDDevicePayload(device)),
    });
  }

  async updateDevice(pk: string, device: Partial<Device>): Promise<ApiResponse<Device>> {
    return this.request<ApiResponse<Device>>(`/devices/${pk}`, {
      method: 'PUT',
      body: buildControlDFormBody(toControlDDevicePayload(device)),
    });
  }

  async updateDeviceProfile(deviceId: string, profileId: string): Promise<ApiResponse<Device>> {
    return this.updateDevice(deviceId, { profile: profileId });
  }

  async updateDeviceStatus(deviceId: string, status: number): Promise<ApiResponse<Device>> {
    return this.updateDevice(deviceId, { status });
  }

  async deleteDevice(pk: string): Promise<ApiResponse<void>> {
    return this.request<ApiResponse<void>>(`/devices/${pk}`, {
      method: 'DELETE',
    });
  }

  async getDeviceTypes(): Promise<ApiResponse<DeviceType[]>> {
    return this.request<ApiResponse<DeviceType[]>>('/devices/types');
  }

  // Access IPs
  async getAccessIPs(deviceId: string): Promise<ApiResponse<AccessIP[]>> {
    return this.request<ApiResponse<AccessIP[]>>(`/access?device_id=${encodeURIComponent(deviceId)}`);
  }

  async learnIP(deviceId: string, ip: string): Promise<ApiResponse<unknown>> {
    return this.request<ApiResponse<unknown>>('/access', {
      method: 'POST',
      body: buildControlDFormBody({ device_id: deviceId, 'ips[]': ip }),
    });
  }

  async deleteAccessIP(deviceId: string, ip: string): Promise<ApiResponse<void>> {
    return this.request<ApiResponse<void>>('/access', {
      method: 'DELETE',
      body: buildControlDFormBody({ device_id: deviceId, 'ips[]': ip }),
    });
  }

  // Analytics
  async getAnalyticsLevels(): Promise<ApiResponse<AnalyticsLevel[]>> {
    return this.request<ApiResponse<AnalyticsLevel[]>>(`/analytics/levels`);
  }

  async getStorageRegions(): Promise<ApiResponse<StorageRegion[]>> {
    return this.request<ApiResponse<StorageRegion[]>>(`/analytics/endpoints`);
  }

  async getProxies(): Promise<ApiResponse<RouteLocation[]>> {
    return this.request<ApiResponse<RouteLocation[]>>('/proxies');
  }

  // Misc
  async getIP(): Promise<ApiResponse<IPInfo>> {
    return this.request<ApiResponse<IPInfo>>('/ip');
  }

  async getNetworkStats(): Promise<ApiResponse<NetworkStats[]>> {
    return this.request<ApiResponse<NetworkStats[]>>('/network');
  }
}

export const api = new ControlDApi();
