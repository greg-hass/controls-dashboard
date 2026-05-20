import type { DeviceSchedule } from '@/types/controld';
import { loadSchedulerState, syncSchedulerToken as syncSchedulerTokenApi } from '@/services/scheduler';

export interface SchedulerSlice {
  deviceSuspensions: Record<string, DeviceSchedule>;
  loadDeviceSchedules: () => Promise<void>;
  syncSchedulerToken: () => Promise<void>;
}

export const createSchedulerSlice = (set: any, get: any): SchedulerSlice => ({
  deviceSuspensions: {},
  loadDeviceSchedules: async () => {
    try {
      const schedules = await loadSchedulerState();
      const suspensions: Record<string, DeviceSchedule> = {};
      for (const schedule of schedules) {
        suspensions[schedule.deviceId] = schedule;
      }
      set({ deviceSuspensions: suspensions });
    } catch {
      // Silently ignore scheduler errors
    }
  },
  syncSchedulerToken: async () => {
    try {
      await syncSchedulerTokenApi(get().settings.apiToken);
    } catch {
      // Silently ignore scheduler token sync errors
    }
  },
});
