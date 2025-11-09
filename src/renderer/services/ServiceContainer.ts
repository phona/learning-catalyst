import { CatalystService } from './CatalystService';
import { ChatService } from './ChatService';
import { AnalyticsService } from './AnalyticsService';
import { SessionService } from './sessionService';
import { DiscoveryService } from './DiscoveryService';
import { ElectronCatalystIPCClient } from './ipc/ElectronCatalystIPCClient';
import { MockCatalystIPCClient } from './ipc/MockCatalystIPCClient';
import { ICatalystService } from './interfaces/ICatalystService';
import { IAnalyticsService } from './interfaces/IAnalyticsService';

/**
 * Service container for renderer process
 * Provides dependency injection for renderer services
 */
class RendererServiceContainer {
  private services = new Map<string, unknown>();
  private factories = new Map<string, () => unknown>();
  private singletons = new Set<string>();
  private isTestMode = false;

  /**
   * Register a service factory function
   * @param name - Service name
   * @param factory - Function that creates the service instance
   * @param singleton - Whether the service should be a singleton (default: true)
   */
  register<T>(name: string, factory: () => T, singleton: boolean = true): void {
    this.factories.set(name, factory);
    if (singleton) {
      this.singletons.add(name);
    }
  }

  /**
   * Register a service instance directly
   * @param name - Service name
   * @param instance - Service instance to register
   */
  registerInstance<T>(name: string, instance: T): void {
    this.services.set(name, instance);
    this.singletons.add(name);
  }

  /**
   * Get a service instance
   * @param name - Service name
   * @returns Service instance of type T
   * @throws Error if service is not registered
   */
  get<T>(name: string): T {
    // Return existing instance for singletons
    if (this.singletons.has(name) && this.services.has(name)) {
      return this.services.get(name) as T;
    }

    // Create new instance using factory
    const factory = this.factories.get(name);
    if (!factory) {
      throw new Error(`Service not registered: ${name}`);
    }

    try {
      const instance = factory();

      // Store singleton instances
      if (this.singletons.has(name)) {
        this.services.set(name, instance);
      }

      return instance as T;
    } catch (error) {
      throw new Error(`Failed to create service ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if a service is registered
   * @param name - Service name to check
   * @returns True if service is registered
   */
  has(name: string): boolean {
    return this.factories.has(name) || this.services.has(name);
  }

  /**
   * Create a new instance of a service (even for singletons)
   * @param name - Service name
   * @returns New service instance
   */
  create<T>(name: string): T {
    const factory = this.factories.get(name);
    if (!factory) {
      throw new Error(`Service not registered: ${name}`);
    }

    try {
      return factory() as T;
    } catch (error) {
      throw new Error(`Failed to create service ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Clear all registered services
   * Useful for testing or application restart
   */
  clear(): void {
    this.services.clear();
    this.factories.clear();
    this.singletons.clear();
  }

  /**
   * Enable test mode (uses mock implementations)
   */
  enableTestMode(): void {
    this.isTestMode = true;
  }

  /**
   * Disable test mode (uses real implementations)
   */
  disableTestMode(): void {
    this.isTestMode = false;
  }

  /**
   * Check if in test mode
   */
  isInTestMode(): boolean {
    return this.isTestMode;
  }

  /**
   * Get all registered service names
   * @returns Array of service names
   */
  getServiceNames(): string[] {
    return Array.from(this.factories.keys());
  }

  /**
   * Get service container statistics
   * @returns Statistics object
   */
  getStats(): {
    totalServices: number;
    singletonServices: number;
    instantiatedServices: number;
    testMode: boolean;
    serviceNames: string[];
  } {
    return {
      totalServices: this.factories.size,
      singletonServices: this.singletons.size,
      instantiatedServices: this.services.size,
      testMode: this.isTestMode,
      serviceNames: this.getServiceNames(),
    };
  }
}

/**
 * Global renderer service container instance
 * Initialized with default services
 */
const rendererServiceContainer = new RendererServiceContainer();

/**
 * Initialize default renderer services
 */
function initializeDefaultServices(): void {
  // IPC Client - uses mock in test mode, real implementation otherwise
  rendererServiceContainer.register(
    'catalystIPCClient',
    () => rendererServiceContainer.isInTestMode()
      ? new MockCatalystIPCClient(50) // Faster response for tests
      : new ElectronCatalystIPCClient(),
    true // singleton
  );

  // Catalyst Service
  rendererServiceContainer.register(
    'catalystService',
    () => {
      const ipcClient = rendererServiceContainer.get('catalystIPCClient');
      return new CatalystService(ipcClient);
    },
    true // singleton
  );

  // Chat Service
  rendererServiceContainer.register(
    'chatService',
    () => {
      const catalystService = rendererServiceContainer.get<ICatalystService>('catalystService');
      return new ChatService(catalystService);
    },
    true // singleton
  );

  // Analytics Service
  rendererServiceContainer.register(
    'analyticsService',
    () => new AnalyticsService(),
    true // singleton
  );

  // Discovery Service
  rendererServiceContainer.register(
    'discoveryService',
    () => {
      const catalystService = rendererServiceContainer.get<ICatalystService>('catalystService');
      return new DiscoveryService(catalystService);
    },
    true // singleton
  );

  // Session Service (renderer-compatible version)
  rendererServiceContainer.register(
    'sessionService',
    () => {
      // In the renderer process, we need a SessionService that works through IPC
      // For now, create a simple mock that provides the required interface
      // TODO: Implement proper IPC-based SessionService
      return {
        saveSession: async () => {},
        getSession: async () => null,
        deleteSession: async () => false,
        generateAITitle: async (message: string) => {
          // Simple title generation fallback
          const words = message.replace(/[^\w\s]/g, '').split(/\s+/).filter(word => word.length > 2).slice(0, 4);
          return words.length > 0 ? words.map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ') : 'Untitled Session';
        },
        searchSessions: async () => ({ sessions: [], total: 0, has_more: false }),
        getRecentSessions: async () => [],
        createSession: async () => `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        saveMessage: async () => {},
        saveMessages: async () => {},
        updateMessage: async () => {},
        updateSessionTitle: async () => {},
        saveSessionWithMessages: async () => `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        generateSessionId: () => `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        getGlobalMessageCount: async () => 0,
        getGlobalStatistics: async () => ({
          totalMessages: 0,
          totalSessions: 0,
          totalUserMessages: 0,
          totalAssistantMessages: 0,
          averageMessagesPerSession: 0,
          totalTokensUsed: 0,
        })
      };
    },
    true // singleton
  );

  // Future services can be registered here:
  // - ConfigService (renderer-specific)
}

// Initialize default services
initializeDefaultServices();

/**
 * Service names for type-safe access
 */
export const RENDERER_SERVICE_NAMES = {
  CATALYST_IPC_CLIENT: 'catalystIPCClient',
  CATALYST_SERVICE: 'catalystService',
  CHAT_SERVICE: 'chatService',
  ANALYTICS_SERVICE: 'analyticsService',
  DISCOVERY_SERVICE: 'discoveryService',
  SESSION_SERVICE: 'sessionService',
} as const;

/**
 * Export the service container and accessors
 */
export { rendererServiceContainer };

/**
 * Convenience function to get a service
 * @param name - Service name
 * @returns Service instance
 */
export function getService<T>(name: string): T {
  return rendererServiceContainer.get<T>(name);
}

/**
 * Convenience function to get the Catalyst service
 * @returns CatalystService instance
 */
export function getCatalystService(): ICatalystService {
  return rendererServiceContainer.get<ICatalystService>(RENDERER_SERVICE_NAMES.CATALYST_SERVICE);
}

/**
 * Convenience function to get the Chat service
 * @returns ChatService instance
 */
export function getChatService(): ChatService {
  return rendererServiceContainer.get<ChatService>(RENDERER_SERVICE_NAMES.CHAT_SERVICE);
}

/**
 * Convenience function to get the Analytics service
 * @returns AnalyticsService instance
 */
export function getAnalyticsService(): IAnalyticsService {
  return rendererServiceContainer.get<IAnalyticsService>(RENDERER_SERVICE_NAMES.ANALYTICS_SERVICE);
}

/**
 * Convenience function to get the Discovery service
 * @returns DiscoveryService instance
 */
export function getDiscoveryService(): DiscoveryService {
  return rendererServiceContainer.get<DiscoveryService>(RENDERER_SERVICE_NAMES.DISCOVERY_SERVICE);
}

/**
 * Convenience function to get the Session service
 * @returns SessionService instance
 */
export function getSessionService(): any {
  return rendererServiceContainer.get<any>(RENDERER_SERVICE_NAMES.SESSION_SERVICE);
}