/**
 * Use App Services Hook
 *
 * React hook for dependency injection of app services.
 * Uses proper service container pattern without global state.
 */

import { useState, useEffect, useContext, createContext, ReactNode } from 'react';
import {
  rendererServiceContainer
} from '@/renderer/services/ServiceContainer';
import { ConfigurationService } from '@/renderer/services/configuration/configuration-service';

// Define local interfaces since they're not exported from shared container
export interface ServiceContainer {
  database: any;
  analytics: any;
  knowledgeGraph: any;
  vectorDatabase: any;
  sessionService: any;
  conceptParsing: any;
  contentDiscovery: any;
  agentManager: any;
  configService: ConfigurationService | null;
}

export interface ServiceContainerOptions {
  config?: any;
  enableMockMode?: boolean;
  timeout?: number;
}

// Simple ServiceContainerManager implementation
export class ServiceContainerManager {
  private container: ServiceContainer | null = null;

  getCurrentContainer(): ServiceContainer | null {
    return this.container;
  }

  isInitialized(): boolean {
    return this.container !== null;
  }

  async getContainer(options?: ServiceContainerOptions): Promise<ServiceContainer> {
    if (!this.container) {
      this.container = {
        database: null,
        analytics: rendererServiceContainer.get('analyticsService'),
        knowledgeGraph: null,
        vectorDatabase: null,
        sessionService: rendererServiceContainer.get('sessionService'),
        conceptParsing: null,
        contentDiscovery: null,
        agentManager: null,
        configService: rendererServiceContainer.get('configService'),
      };
    }
    return this.container;
  }
}

// Create service container function
function createServiceContainer(options?: ServiceContainerOptions): ServiceContainer {
  return {
    database: null,
    analytics: rendererServiceContainer.get('analyticsService'),
    knowledgeGraph: null,
    vectorDatabase: null,
    sessionService: rendererServiceContainer.get('sessionService'),
    conceptParsing: null,
    contentDiscovery: null,
    agentManager: null,
    configService: rendererServiceContainer.get('configService'),
  };
}
import { LoadingScreen } from '../components/UI/LoadingScreen';

// Context for providing services to the component tree
const ServiceContext = createContext<ServiceContainer | null>(null);

export interface AppServices {
  database: ServiceContainer['database'];
  analytics: ServiceContainer['analytics'];
  knowledgeGraph: ServiceContainer['knowledgeGraph'];
  vectorDatabase: ServiceContainer['vectorDatabase'];
  sessionService: ServiceContainer['sessionService'];
  conceptParsing: ServiceContainer['conceptParsing'];
  contentDiscovery: ServiceContainer['contentDiscovery'];
  agentManager: ServiceContainer['agentManager'];
  configService: ServiceContainer['configService'];
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
  const [initState, setInitState] = useState<'config' | 'services' | 'database' | 'ready'>('config');
  const [initProgress, setInitProgress] = useState(0);

  useEffect(() => {
    // If already initialized, no need to re-initialize
    if (ready && container) {
      return;
    }

    const initializeEverything = async () => {
      try {
        let config = options?.config || {};

        // Step 1: Load configuration
        setInitState('config');
        setInitProgress(25);

        if (!config) {
          // Try to load config from electron API
          try {
            config = await window.electronAPI.getConfig();
            if (!config) {
              throw new Error('No configuration found. Please set up your AI providers.');
            }
          } catch (configError) {
            throw new Error(`Failed to load configuration: ${configError instanceof Error ? configError.message : 'Unknown error'}`);
          }
        }

        // Step 2: Initialize services
        setInitState('services');
        setInitProgress(50);

        const serviceContainer = await containerManager.getContainer({ config });

        // Step 3: Database setup (if needed - most initialization happens in container)
        setInitState('database');
        setInitProgress(75);

        // Add any additional database initialization here if needed
        // For now, the container handles database setup

        // Step 4: Ready
        setInitState('ready');
        setInitProgress(100);

        setContainer(serviceContainer);
        setReady(true);
        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred during initialization';
        setError(errorMessage);
        setReady(false);
      }
    };

    initializeEverything();
  }, [ready, container, options, containerManager]);

  // Show loading screen during initialization
  if (!ready) {
    return (
      <LoadingScreen
        state={initState}
        error={error}
        onRetry={() => window.location.reload()}
        showProgress
        progress={initProgress}
      />
    );
  }

  const value = container;
  return (
    <ServiceContext.Provider value={value}>
      {children}
    </ServiceContext.Provider>
  );
}

/**
 * Config-aware Service Provider that bridges useConfigStore with services
 * Now simplified - all initialization logic moved to ServiceProvider
 */
export function ConfigServiceProvider({ children }: { children: ReactNode }) {
  // ServiceProvider now handles config loading internally
  return <ServiceProvider>{children}</ServiceProvider>;
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
      conceptParsing: container.conceptParsing,
      contentDiscovery: container.contentDiscovery,
      agentManager: container.agentManager,
      configService: container.configService,
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
        conceptParsing: container.conceptParsing,
        contentDiscovery: container.contentDiscovery,
        agentManager: container.agentManager,
        configService: container.configService,
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
