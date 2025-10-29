/**
 * Use App Services Hook
 *
 * React hook for dependency injection of app services.
 * Uses proper service container pattern without global state.
 */

import { useState, useEffect, useContext, createContext, ReactNode } from 'react';
import {
  createServiceContainer,
  ServiceContainer,
  ServiceContainerManager,
  type ServiceContainerOptions
} from '@/services/container';

// Context for providing services to the component tree
const ServiceContext = createContext<ServiceContainer | null>(null);

export interface AppServices {
  database: ServiceContainer['database'];
  analytics: ServiceContainer['analytics'];
  knowledgeGraph: ServiceContainer['knowledgeGraph'];
  vectorDatabase: ServiceContainer['vectorDatabase'];
  sessionService: ServiceContainer['sessionService'];
}

export interface UseAppServicesResult {
  services: AppServices | null;
  ready: boolean;
  error: string | null;
}

/**
 * Service Provider Component
 *
 * This component should be used at the root level of the application
 * to provide services to all child components through React Context.
 */
export interface ServiceProviderProps {
  children: ReactNode;
  options?: ServiceContainerOptions;
}

export function ServiceProvider({ children, options }: ServiceProviderProps) {
  // Create a local container manager instance for this provider
  const [containerManager] = useState(() => new ServiceContainerManager());

  const [container, setContainer] = useState<ServiceContainer | null>(() =>
    containerManager.getCurrentContainer()
  );
  const [ready, setReady] = useState(() => containerManager.isInitialized());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If already initialized, no need to re-initialize
    if (ready && container) {
      return;
    }

    const initializeContainer = async () => {
      try {
        const serviceContainer = await containerManager.getContainer(options);
        setContainer(serviceContainer);
        setReady(true);
        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        setReady(false);
      }
    };

    initializeContainer();
  }, [ready, container, options, containerManager]);

  const value = container;

  return (
    <ServiceContext.Provider value={value}>
      {children}
    </ServiceContext.Provider>
  );
}

/**
 * Hook for accessing app services through dependency injection.
 * This is the main hook that components should use to access services.
 */
export function useAppServices(): UseAppServicesResult {
  const container = useContext(ServiceContext);
  const [state, setState] = useState<UseAppServicesResult>(() => ({
    services: container ? {
      database: container.database,
      analytics: container.analytics,
      knowledgeGraph: container.knowledgeGraph,
      vectorDatabase: container.vectorDatabase,
      sessionService: container.sessionService,
    } : null,
    ready: container !== null,
    error: null,
  }));

  useEffect(() => {
    if (container) {
      const services: AppServices = {
        database: container.database,
        analytics: container.analytics,
        knowledgeGraph: container.knowledgeGraph,
        vectorDatabase: container.vectorDatabase,
        sessionService: container.sessionService,
      };

      setState({
        services,
        ready: true,
        error: null,
      });
    } else {
      setState(prev => ({
        ...prev,
        services: null,
        ready: false,
      }));
    }
  }, [container]);

  return state;
}

/**
 * Hook for getting a specific service through dependency injection.
 * This is the preferred way to access individual services.
 */
export function useService<T extends keyof AppServices>(
  serviceName: T
): AppServices[T] | null {
  const { services } = useAppServices();
  return services ? services[serviceName] : null;
}

/**
 * Hook for accessing the service container manager directly.
 * Use this only for advanced use cases like cleanup.
 * Note: This creates a new manager instance - for most cases use ServiceProvider instead.
 */
export function useServiceContainerManager(): ServiceContainerManager {
  return new ServiceContainerManager();
}