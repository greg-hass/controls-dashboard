import type { AppSettings } from '@/types/controld';
import { api } from '@/services/api';

export interface SettingsSlice {
  settings: AppSettings;
  setSettings: (settings: Partial<AppSettings>) => void;
}

export const defaultSettings: AppSettings = {
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

export const createSettingsSlice = (set: any, get: any): SettingsSlice => ({
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
});
