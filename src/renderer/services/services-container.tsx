/**
 * Renderer Service Container
 *
 * Client-side service container that communicates with main process via IPC.
 * Follows proper Electron architecture principles.
 */

import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import type { APIResponse } from '@/shared/types/electron-api';

// Define the types of services available to renderer
export interface RendererServices {
  // Analytics services via IPC
  getDashboard: () => Promise<APIResponse<any>>;
  getProgressChart: (params: any) => Promise<APIResponse<any>>;
  getAchievements: () => Promise<APIResponse<any[]>>;
  trackSession: (session: any) => Promise<APIResponse<string>>;

  // Learning services via IPC
  getSessions: () => Promise<APIResponse<any[]>>;
  createSession: (session: any) => Promise<APIResponse<string>>;

  // Configuration services via IPC
  getConfig: () => Promise<APIResponse<any>>;
  updateConfig: (config: any) => Promise<APIResponse<void>>;
}

// Context for providing services to the component tree
const ServicesContext = createContext<RendererServices | null>(null);

export interface ServicesProviderProps {
  children: ReactNode;
}

/**
 * Service Provider for renderer process
 * Wraps all main process services with IPC communication
 */
export function ServicesProvider({ children }: ServicesProviderProps) {
  const [services, setServices] = useState<RendererServices | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize services with proper IPC communication
    const initializeServices = async () => {
      if (!window.electronAPI) {
        throw new Error('Electron API not available. Running in browser mode.');
      }

      try {
        const rendererServices: RendererServices = {
          // Analytics services
          getDashboard: () => window.electronAPI.analytics?.getDashboard?.() || Promise.reject(new Error('Analytics API not available')),
          getProgressChart: (params) => window.electronAPI.analytics?.getProgressChart?.(params) || Promise.reject(new Error('Analytics API not available')),
          getAchievements: () => window.electronAPI.analytics?.getAchievements?.() || Promise.reject(new Error('Analytics API not available')),
          trackSession: (session) => window.electronAPI.analytics?.trackSession?.(session) || Promise.reject(new Error('Analytics API not available')),

          // Learning services
          getSessions: () => window.electronAPI.learning?.getSessions?.() || Promise.reject(new Error('Learning API not available')),
          createSession: (session) => window.electronAPI.learning?.createSession?.(session) || Promise.reject(new Error('Learning API not available')),

          // Configuration services
          getConfig: () => window.electronAPI.settings?.getConfig?.() || Promise.reject(new Error('Settings API not available')),
          updateConfig: (config) => window.electronAPI.settings?.updateConfig?.(config) || Promise.reject(new Error('Settings API not available')),
        };

        setServices(rendererServices);
        setLoading(false);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(`Failed to initialize services: ${errorMessage}`);
        setLoading(false);
      }
    };

    initializeServices();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-gray-600">Initializing services...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center text-red-600">
          <div className="mb-4">⚠️ Service Error</div>
          <div className="text-sm">{error}</div>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }

  if (!services) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-600">Services not available</div>
      </div>
    );
  }

  return (
    <ServicesContext.Provider value={services}>
      {children}
    </ServicesContext.Provider>
  );
}

/**
 * Hook to access renderer services
 */
export function useRendererServices(): RendererServices {
  const services = useContext(ServicesContext);

  if (!services) {
    throw new Error('useRendererServices must be used within ServicesProvider');
  }

  return services;
}

/**
 * Hook to check if services are available
 */
export function useServicesAvailable(): boolean {
  const services = useContext(ServicesContext);
  return services !== null;
}

/**
 * Hook to get specific service with error handling
 */
export function useService<T>(
  serviceSelector: (services: RendererServices) => T,
  fallback?: T
): T {
  const services = useRendererServices();

  try {
    return serviceSelector(services);
  } catch (err) {
    if (fallback !== undefined) {
      return fallback;
    }
    throw err;
  }
}