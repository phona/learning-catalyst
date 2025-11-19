
/**
 * App Store - Global application state management
 * Clean architecture with display-optimized state
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { UIState } from '../../types';

interface AppState extends UIState {
  // Navigation state
  currentView: 'chat' | 'sessions' | 'settings' | 'progress' | 'knowledge-map' | 'discovery';
  navigationHistory: string[];
  canGoBack: boolean;
  canGoForward: boolean;

  // App state
  isInitialized: boolean;
  isConnected: boolean;
  isOnline: boolean;

  // User preferences
  preferences: {
    theme: 'light' | 'dark' | 'auto';
    language: string;
    notifications: boolean;
    autoSave: boolean;
    telemetry: boolean;
  };

  // Modal state
  activeModal: string | null;
  modalProps: Record<string, unknown>;

  // Toast notifications
  notifications: Array<{
    id: string;
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message?: string;
    duration?: number;
    timestamp: number;
  }>;

  // Actions
  setCurrentView: (view: AppState['currentView']) => void;
  setSidebarOpen: (open: boolean) => void;
  setSettingsPanelOpen: (open: boolean) => void;
  setTheme: (theme: AppState['preferences']['theme']) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | undefined) => void;
  setSuccess: (success: string | undefined) => void;

  // Navigation actions
  navigateTo: (view: AppState['currentView']) => void;
  goBack: () => void;
  goForward: () => void;
  clearHistory: () => void;

  // Connection actions
  setConnected: (connected: boolean) => void;
  setOnline: (online: boolean) => void;
  setInitialized: (initialized: boolean) => void;

  // Preference actions
  updatePreferences: (preferences: Partial<AppState['preferences']>) => void;
  resetPreferences: () => void;

  // Modal actions
  openModal: (modalId: string, props?: Record<string, unknown>) => void;
  closeModal: () => void;

  // Notification actions
  addNotification: (notification: Omit<AppState['notifications'][0], 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;

  // Utility actions
  resetAppState: () => void;
}

const defaultPreferences: AppState['preferences'] = {
  theme: 'auto',
  language: 'en',
  notifications: true,
  autoSave: true,
  telemetry: false
};

const initialState: AppState = {
  // UI State
  sidebar_open: true,
  settings_panel_open: false,
  theme: 'auto',
  currentView: 'chat',
  loading: false,
  error_message: undefined,
  success_message: undefined,

  // Navigation state
  navigationHistory: ['chat'],
  canGoBack: false,
  canGoForward: false,

  // App state
  isInitialized: false,
  isConnected: false,
  isOnline: navigator.onLine,

  // User preferences
  preferences: defaultPreferences,

  // Modal state
  activeModal: null,
  modalProps: {},

  // Notifications
  notifications: []
};

export const useAppStore = create<AppState>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    // Basic UI actions
    setCurrentView: (currentView: AppState['currentView']) => set({ currentView }),
    setSidebarOpen: (sidebar_open: boolean) => set({ sidebar_open }),
    setSettingsPanelOpen: (settings_panel_open: boolean) => set({ settings_panel_open }),
    setTheme: (theme: AppState['preferences']['theme']) => set({ theme, preferences: { ...get().preferences, theme } }),
    setLoading: (loading: boolean) => set({ loading }),
    setError: (error_message: string | undefined) => set({ error_message }),
    setSuccess: (success_message: string | undefined) => set({ success_message }),

    // Navigation actions
    navigateTo: (view) => set((state) => {
      const newHistory = [...state.navigationHistory.slice(0, -1), view];
      return {
        ...state,
        currentView: view,
        current_view: view, // Keep both for compatibility
        navigationHistory: newHistory,
        canGoBack: newHistory.length > 1,
        canGoForward: false
      };
    }),

    goBack: () => set((state) => {
      if (state.navigationHistory.length <= 1) return state;

      const newHistory = [...state.navigationHistory];
      newHistory.pop(); // Remove current view
      const previousView = newHistory[newHistory.length - 1];

      return {
        currentView: previousView,
        navigationHistory: newHistory,
        canGoBack: newHistory.length > 1,
        canGoForward: true
      };
    }),

    goForward: () => set((state) => {
      // For simplicity, we'll implement this as navigating to chat
      // In a real app, you'd maintain a forward history stack
      return {
        currentView: 'chat',
        canGoForward: false
      };
    }),

    clearHistory: () => set({
      navigationHistory: [get().currentView],
      canGoBack: false,
      canGoForward: false
    }),

    // Connection actions
    setConnected: (isConnected) => set({ isConnected }),
    setOnline: (isOnline) => set({ isOnline }),
    setInitialized: (isInitialized) => set({ isInitialized }),

    // Preference actions
    updatePreferences: (preferences) => set((state) => ({
      preferences: { ...state.preferences, ...preferences }
    })),

    resetPreferences: () => set({ preferences: defaultPreferences }),

    // Modal actions
    openModal: (activeModal, modalProps = {}) => set({ activeModal, modalProps }),
    closeModal: () => set({ activeModal: null, modalProps: {} }),

    // Notification actions
    addNotification: (notification) => {
      const id = Date.now().toString();
      const newNotification = {
        ...notification,
        id,
        timestamp: Date.now()
      };

      set((state) => ({
        notifications: [...state.notifications, newNotification]
      }));

      // Auto-remove notification after duration
      if (notification.duration && notification.duration > 0) {
        setTimeout(() => {
          get().removeNotification(id);
        }, notification.duration);
      }
    },

    removeNotification: (id) => set((state) => ({
      notifications: state.notifications.filter(n => n.id !== id)
    })),

    clearNotifications: () => set({ notifications: [] }),

    // Utility actions
    resetAppState: () => set(initialState)
  }))
);

// Selectors for derived state
export const useCurrentView = () => useAppStore((state) => state.currentView);
export const useIsLoading = () => useAppStore((state) => state.loading);
export const useError = () => useAppStore((state) => state.error_message);
export const useSuccess = () => useAppStore((state) => state.success_message);
export const useTheme = () => useAppStore((state) => state.theme);
export const usePreferences = () => useAppStore((state) => state.preferences);
export const useIsConnected = () => useAppStore((state) => state.isConnected);
export const useIsOnline = () => useAppStore((state) => state.isOnline);
export const useNavigationState = () => useAppStore((state) => ({
  currentView: state.currentView,
  canGoBack: state.canGoBack,
  canGoForward: state.canGoForward
}));

// Actions hook
export const useAppActions = () => useAppStore((state) => ({
  setCurrentView: state.setCurrentView,
  setSidebarOpen: state.setSidebarOpen,
  setSettingsPanelOpen: state.setSettingsPanelOpen,
  setTheme: state.setTheme,
  setLoading: state.setLoading,
  setError: state.setError,
  setSuccess: state.setSuccess,
  navigateTo: state.navigateTo,
  goBack: state.goBack,
  goForward: state.goForward,
  clearHistory: state.clearHistory,
  setConnected: state.setConnected,
  setOnline: state.setOnline,
  setInitialized: state.setInitialized,
  updatePreferences: state.updatePreferences,
  resetPreferences: state.resetPreferences,
  openModal: state.openModal,
  closeModal: state.closeModal,
  addNotification: state.addNotification,
  removeNotification: state.removeNotification,
  clearNotifications: state.clearNotifications,
  resetAppState: state.resetAppState
}));

// Initialize app state
useAppStore.setState({
  isInitialized: true,
  isOnline: navigator.onLine
});

// Listen for online/offline events
window.addEventListener('online', () => {
  useAppStore.getState().setOnline(true);
});

window.addEventListener('offline', () => {
  useAppStore.getState().setOnline(false);
});