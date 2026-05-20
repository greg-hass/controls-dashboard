import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppState } from './types';
import { createSettingsSlice } from './settingsSlice';
import { createDataSlice } from './dataSlice';
import { createMutationsSlice } from './mutationsSlice';
import { createSchedulerSlice } from './schedulerSlice';
import { api } from '@/services/api';

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => {
      // Expose store for debugging
      if (typeof window !== 'undefined') {
        (window as any).__ZUSTAND_STORE__ = {
          getState: get,
          setState: set,
        };
      }

      const settingsSlice = createSettingsSlice(set, get);
      const dataSlice = createDataSlice(set, get);
      const mutationsSlice = createMutationsSlice(set, get);
      const schedulerSlice = createSchedulerSlice(set, get);

      return {
        ...settingsSlice,
        ...dataSlice,
        ...mutationsSlice,
        ...schedulerSlice,

        // UI State
        isLoading: false,
        error: null,
        apiWarnings: [],
        activeTab: 'overview',
        darkMode: true,
        sidebarOpen: true,

        // UI Actions
        setActiveTab: (tab: string) => set({ activeTab: tab }),
        setDarkMode: (dark: boolean) => set({ darkMode: dark }),
        toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
        setError: (error: string | null) => set({ error }),
      };
    },
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
      onRehydrateStorage: () => (state) => {
        if (state?.settings?.apiToken) {
          api.setToken(state.settings.apiToken);
          api.setBaseUrl(state.settings.apiBaseUrl);
        }
      },
    }
  )
);

const normalizeApiBaseUrl = (url: string) => {
  const trimmed = url.trim().replace(/\/$/, '');
  return trimmed === 'https://api.controld.com' ? '/api' : trimmed;
};
