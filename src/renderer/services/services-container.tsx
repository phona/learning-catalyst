/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable no-undef */
/* eslint-disable react/prop-types */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-non-null-asserted-optional-chain */
/* eslint-disable @typescript-eslint/no-non-null-asserted-access */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/require-await */




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

interface ServicesProviderProps {
  children: ReactNode;
}

/**
 * Service Provider for renderer process
 * Wraps all main process services with IPC communication
 */
function ServicesProviderComponent({ children }: ServicesProviderProps) {
  const [services, setServices] = useState<RendererServices | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize services with proper IPC communication
    const initializeServices = async () => {
      try {
        // Check if we're in a browser environment
        if (!window.electronAPI) {
          // Create mock services for browser/testing environment
          const mockServices: RendererServices = {
            // Mock analytics services
            getDashboard: () => Promise.resolve({ success: true, data: {} }),
            getProgressChart: (params) => Promise.resolve({ success: true, data: [] }),
            getAchievements: () => Promise.resolve({ success: true, data: [] }),
            trackSession: (session) => Promise.resolve({ success: true, data: 'mock-session-id' }),

            // Mock learning services
            getSessions: () => Promise.resolve({ success: true, data: [] }),
            createSession: (session) => Promise.resolve({ success: true, data: 'mock-session-id' }),

            // Mock configuration services
            getConfig: () => Promise.resolve({ success: true, data: {} }),
            updateConfig: (config) => Promise.resolve({ success: true }),
          };

          setServices(mockServices);
          setLoading(false);
          return;
        }

        // In Electron environment, create real services
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

// Export the component (renamed to avoid Fast Refresh conflicts)
export { ServicesProviderComponent as ServicesProvider };