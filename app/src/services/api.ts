import type {
  User,
  Profile,
  Device,
  DeviceType,
  ServiceCategory,
  Service,
  Filter,
  ExternalFilter,
  CustomRule,
  RuleFolder,
  DefaultRule,
  AccessIP,
  AnalyticsLevel,
  StorageRegion,
  IPInfo,
  NetworkStats,
  ApiResponse,
} from '@/types/controld';

class ControlDApi {
  private token: string = '';
  private baseUrl: string = '/api';

  setToken(token: string) {
    this.token = token;
  }

  setBaseUrl(url: string) {
    this.baseUrl = url.replace(/\/$/, '');
  }

  getToken(): string {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    if (!this.token) {
      throw new Error('API token not set');
    }

    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers,
      },
    });

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
      body: JSON.stringify(profile),
    });
  }

  async updateProfile(pk: string, profile: Partial<Profile>): Promise<ApiResponse<Profile>> {
    return this.request<ApiResponse<Profile>>(`/profiles/${pk}`, {
      method: 'PUT',
      body: JSON.stringify(profile),
    });
  }

  async deleteProfile(pk: string): Promise<ApiResponse<void>> {
    return this.request<ApiResponse<void>>(`/profiles/${pk}`, {
      method: 'DELETE',
    });
  }

  // Profile Options
  async getProfileOptions(pk: string): Promise<ApiResponse<Record<string, unknown>>> {
    return this.request<ApiResponse<Record<string, unknown>>>(`/profiles/${pk}/options`);
  }

  async updateProfileOption(pk: string, name: string, value: unknown): Promise<ApiResponse<unknown>> {
    return this.request<ApiResponse<unknown>>(`/profiles/${pk}/options/${name}`, {
      method: 'PUT',
      body: JSON.stringify({ value }),
    });
  }

  // Filters
  async getNativeFilters(pk: string): Promise<ApiResponse<Filter[]>> {
    return this.request<ApiResponse<Filter[]>>(`/profiles/${pk}/filters`);
  }

  async getExternalFilters(pk: string): Promise<ApiResponse<ExternalFilter[]>> {
    return this.request<ApiResponse<ExternalFilter[]>>(`/profiles/${pk}/filters/external`);
  }

  async updateFilter(pk: string, filter: string, status: number): Promise<ApiResponse<unknown>> {
    return this.request<ApiResponse<unknown>>(`/profiles/${pk}/filters/filter/${filter}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  async batchUpdateFilters(pk: string, filters: Record<string, number>): Promise<ApiResponse<unknown>> {
    return this.request<ApiResponse<unknown>>(`/profiles/${pk}/filters`, {
      method: 'PUT',
      body: JSON.stringify({ filters }),
    });
  }

  // Services
  async getServiceCategories(): Promise<ApiResponse<ServiceCategory[]>> {
    return this.request<ApiResponse<ServiceCategory[]>>('/services/categories');
  }

  async getServicesByCategory(category: string): Promise<ApiResponse<Service[]>> {
    return this.request<ApiResponse<Service[]>>(`/services/categories/${category}`);
  }

  async getProfileServices(pk: string): Promise<ApiResponse<Service[]>> {
    return this.request<ApiResponse<Service[]>>(`/profiles/${pk}/services`);
  }

  async updateService(pk: string, service: string, status: number): Promise<ApiResponse<unknown>> {
    return this.request<ApiResponse<unknown>>(`/profiles/${pk}/services/${service}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
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
      body: JSON.stringify(rule),
    });
  }

  async updateCustomRule(pk: string, rule: Partial<CustomRule>): Promise<ApiResponse<CustomRule>> {
    return this.request<ApiResponse<CustomRule>>(`/profiles/${pk}/rules`, {
      method: 'PUT',
      body: JSON.stringify(rule),
    });
  }

  async deleteCustomRule(pk: string, hostname: string): Promise<ApiResponse<void>> {
    return this.request<ApiResponse<void>>(`/profiles/${pk}/rules/${hostname}`, {
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
      body: JSON.stringify(folder),
    });
  }

  async updateRuleFolder(pk: string, folder: string, data: Partial<RuleFolder>): Promise<ApiResponse<RuleFolder>> {
    return this.request<ApiResponse<RuleFolder>>(`/profiles/${pk}/groups/${folder}`, {
      method: 'PUT',
      body: JSON.stringify(data),
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

  async updateDefaultRule(pk: string, action: string): Promise<ApiResponse<DefaultRule>> {
    return this.request<ApiResponse<DefaultRule>>(`/profiles/${pk}/default`, {
      method: 'PUT',
      body: JSON.stringify({ action }),
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
      body: JSON.stringify(device),
    });
  }

  async updateDevice(pk: string, device: Partial<Device>): Promise<ApiResponse<Device>> {
    return this.request<ApiResponse<Device>>(`/devices/${pk}`, {
      method: 'PUT',
      body: JSON.stringify(device),
    });
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
    return this.request<ApiResponse<AccessIP[]>>(`/access?device_id=${deviceId}`);
  }

  async learnIP(deviceId: string, ip: string): Promise<ApiResponse<unknown>> {
    return this.request<ApiResponse<unknown>>('/access', {
      method: 'POST',
      body: JSON.stringify({ device_id: deviceId, ip }),
    });
  }

  async deleteAccessIP(deviceId: string, ip: string): Promise<ApiResponse<void>> {
    return this.request<ApiResponse<void>>('/access', {
      method: 'DELETE',
      body: JSON.stringify({ device_id: deviceId, ip }),
    });
  }

  // Analytics
  async getAnalyticsLevels(): Promise<ApiResponse<AnalyticsLevel[]>> {
    return this.request<ApiResponse<AnalyticsLevel[]>>('/analytics/levels');
  }

  async getStorageRegions(): Promise<ApiResponse<StorageRegion[]>> {
    return this.request<ApiResponse<StorageRegion[]>>('/analytics/endpoints');
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
