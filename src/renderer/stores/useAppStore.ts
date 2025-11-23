import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { UIState } from '../types/ui';

interface AppStore extends UIState {
  // Focus mode
  focus_mode: boolean;

  // Actions
  setCurrentView: (view: UIState['current_view']) => void;
  setSidebarOpen: (open: boolean) => void;
  setSettingsPanelOpen: (open: boolean) => void;
  setTheme: (theme: 'light' | 'dark' | 'auto') => void;
  setFocusMode: (enabled: boolean) => void;
  toggleFocusMode: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error?: string) => void;
  setSuccess: (message?: string) => void;
  clearMessages: () => void;
}

export const useAppStore = create<AppStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        sidebar_open: true,
        settings_panel_open: false,
        theme: 'dark',
        current_view: 'chat',
        focus_mode: false,
        loading: false,
        error_message: undefined,
        success_message: undefined,

        // Actions
        setCurrentView: (view) => set({ current_view: view }, false, 'setCurrentView'),

        setSidebarOpen: (open) => set({ sidebar_open: open }, false, 'setSidebarOpen'),

        setSettingsPanelOpen: (open) =>
          set({ settings_panel_open: open }, false, 'setSettingsPanelOpen'),

        setFocusMode: (enabled) => set({ focus_mode: enabled }, false, 'setFocusMode'),

        toggleFocusMode: () =>
          set((state) => ({ focus_mode: !state.focus_mode }), false, 'toggleFocusMode'),

        setTheme: (theme) => {
          // Apply theme to document
          const root = document.documentElement;

          if (theme === 'auto') {
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
              ? 'dark'
              : 'light';
            root.classList.toggle('dark', systemTheme === 'dark');
          } else {
            root.classList.toggle('dark', theme === 'dark');
          }

          set({ theme }, false, 'setTheme');
        },

        setLoading: (loading) => set({ loading }, false, 'setLoading'),

        setError: (error) =>
          set(
            {
              error_message: error && error.trim().length > 0 ? error : undefined,
              success_message: undefined,
            },
            false,
            'setError',
          ),

        setSuccess: (message) =>
          set(
            {
              success_message: message && message.trim().length > 0 ? message : undefined,
              error_message: undefined,
            },
            false,
            'setSuccess',
          ),

        clearMessages: () =>
          set(
            {
              error_message: undefined,
              success_message: undefined,
            },
            false,
            'clearMessages',
          ),
      }),
      {
        name: 'app-store',
        partialize: (state) => ({
          sidebar_open: state.sidebar_open,
          theme: state.theme,
        }),
      },
    ),
    { name: 'app-store' },
  ),
);
