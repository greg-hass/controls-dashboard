import type { Device, CustomRule, DeviceSchedule } from '@/types/controld';
import { api } from '@/services/api';
import { scheduleDevicePause, restoreDevicePause } from '@/services/scheduler';

export interface MutationsSlice {
  updateProfileServices: (profileId: string, serviceId: string, status: number, via?: string) => Promise<void>;
  updateFilter: (profileId: string, filterId: string, status: number) => Promise<void>;
  updateDeviceProfile: (deviceId: string, profileId: string) => Promise<void>;
  updateDeviceStatus: (deviceId: string, status: number) => Promise<void>;
  disableDeviceTemporarily: (deviceId: string, durationMinutes: number) => Promise<void>;
  restoreDeviceStatus: (deviceId: string) => Promise<void>;
  createCustomRule: (profileId: string, rule: Partial<CustomRule>) => Promise<void>;
  deleteCustomRule: (profileId: string, hostname: string) => Promise<void>;
}

export const createMutationsSlice = (set: any, get: any): MutationsSlice => ({
  updateProfileServices: async (profileId, serviceId, status, via) => {
    if (get().settings.demoMode) {
      set((state: any) => ({
        profileServices: {
          ...state.profileServices,
          [profileId]: (state.profileServices[profileId] || []).map((service: any) =>
            service.PK === serviceId ? { ...service, status } : service
          ),
        },
      }));
      return;
    }
    try {
      await api.updateProfileService(profileId, serviceId, status, via);
      await get().loadProfileServices(profileId);
    } catch {
      set({ error: 'Failed to update service' });
    }
  },

  updateFilter: async (profileId, filterId, status) => {
    if (get().settings.demoMode) {
      set((state: any) => ({
        filters: state.filters.map((filter: any) =>
          filter.PK === filterId ? { ...filter, status } : filter
        ),
      }));
      return;
    }
    try {
      await api.updateFilter(profileId, filterId, status);
      await get().loadProfileFilters(profileId);
    } catch {
      set({ error: 'Failed to update filter' });
    }
  },

  updateDeviceProfile: async (deviceId, profileId) => {
    if (get().settings.demoMode) {
      set((state: any) => ({
        devices: state.devices.map((device: any) =>
          device.PK === deviceId ? { ...device, profile: profileId } : device
        ),
      }));
      return;
    }
    try {
      await api.updateDeviceProfile(deviceId, profileId);
      await get().refreshDevices();
    } catch {
      set({ error: 'Failed to update device profile' });
    }
  },

  updateDeviceStatus: async (deviceId, status) => {
    if (get().settings.demoMode) {
      set((state: any) => ({
        devices: state.devices.map((device: any) =>
          device.PK === deviceId ? { ...device, status } : device
        ),
      }));
      return;
    }
    try {
      await api.updateDeviceStatus(deviceId, status);
      await get().refreshDevices();
    } catch {
      set({ error: 'Failed to update device status' });
    }
  },

  disableDeviceTemporarily: async (deviceId, durationMinutes) => {
    if (get().settings.demoMode) {
      const schedule: DeviceSchedule = {
        deviceId,
        deviceName: get().devices.find((d: Device) => d.PK === deviceId)?.name,
        restoreStatus: 1,
        expiresAt: Date.now() + durationMinutes * 60 * 1000,
      };
      set((state: any) => ({
        deviceSuspensions: { ...state.deviceSuspensions, [deviceId]: schedule },
        devices: state.devices.map((device: any) =>
          device.PK === deviceId ? { ...device, status: 2 } : device
        ),
      }));
      return;
    }
    try {
      await scheduleDevicePause(deviceId, durationMinutes);
      await get().refreshDevices();
      await get().loadDeviceSchedules();
    } catch {
      set({ error: 'Failed to disable device' });
    }
  },

  restoreDeviceStatus: async (deviceId) => {
    if (get().settings.demoMode) {
      set((state: any) => ({
        deviceSuspensions: Object.fromEntries(
          Object.entries(state.deviceSuspensions).filter(([key]) => key !== deviceId)
        ),
        devices: state.devices.map((device: any) =>
          device.PK === deviceId ? { ...device, status: 1 } : device
        ),
      }));
      return;
    }
    try {
      await restoreDevicePause(deviceId);
      await get().refreshDevices();
      await get().loadDeviceSchedules();
    } catch {
      set({ error: 'Failed to restore device' });
    }
  },

  createCustomRule: async (profileId, rule) => {
    if (get().settings.demoMode) {
      const newRule = {
        ...rule,
        PK: `rule_${Date.now()}`,
        status: 1,
      } as CustomRule;
      set((state: any) => ({ customRules: [...state.customRules, newRule] }));
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
      set((state: any) => ({
        customRules: state.customRules.filter((r: any) => r.hostname !== hostname),
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
});
