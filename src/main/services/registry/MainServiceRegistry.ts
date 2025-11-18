import { ServiceRegistry } from './ServiceRegistry';
import { MAIN_SERVICE_TOKENS, ILogger, IEventBus } from './ServiceTokens';
import { ElectronStoreConfigStorage } from '../config/ElectronStoreStorage';
import { createConfigService } from '../configService';
import { LoggerFactory } from '../logger';
import { ServiceLogger } from '../types';
import { AsyncLocalStorage } from 'async_hooks';

/**
 * Main process service registry instance
 * Provides centralized dependency injection for main process services
 */
class MainServiceRegistry extends ServiceRegistry {
  private static instance: MainServiceRegistry | null = null;

  private constructor() {
    super();
    this.initializeCoreServices();
  }

  /**
   * Get singleton instance of main service registry
   */
  static getInstance(): MainServiceRegistry {
    if (!MainServiceRegistry.instance) {
      MainServiceRegistry.instance = new MainServiceRegistry();
    }
    return MainServiceRegistry.instance;
  }

  /**
   * Initialize core services with proper dependency injection
   */
  private initializeCoreServices(): void {
    // Configuration storage
    this.register(
      MAIN_SERVICE_TOKENS.CONFIG_STORAGE,
      () => new ElectronStoreConfigStorage('learning-catalyst-main')
    );

    // Logger service using LoggerFactory with adapter
    this.register(
      MAIN_SERVICE_TOKENS.LOGGER,
      () => new LoggerAdapter(LoggerFactory.getInstance().createContextAwareLogger()),
      true // singleton
    );

    // Event bus service (simple implementation for now)
    this.register(
      MAIN_SERVICE_TOKENS.EVENT_BUS,
      () => new SimpleEventBus(),
      true // singleton
    );

    // Configuration service with dependencies
    this.register(
      MAIN_SERVICE_TOKENS.CONFIG_SERVICE,
      () => {
        const storage = this.get(MAIN_SERVICE_TOKENS.CONFIG_STORAGE);
        const logger = this.get(MAIN_SERVICE_TOKENS.LOGGER);
        const eventBus = this.get(MAIN_SERVICE_TOKENS.EVENT_BUS);
        return createConfigService(storage, logger, eventBus);
      },
      true // singleton
    );
  }

  /**
   * Initialize all registered services
   * Call this during application startup
   */
  async initialize(): Promise<void> {
    try {
      // Initialize config service to load configuration
      const configService = this.get(MAIN_SERVICE_TOKENS.CONFIG_SERVICE);
      await configService.getConfig();

      this.setInitialized(true);
      console.log('✅ Main service registry initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize main service registry:', error);
      this.setInitialized(false);
      throw error;
    }
  }

  /**
   * Dispose all services
   * Call this during application shutdown
   */
  async dispose(): Promise<void> {
    try {
      // Clear all services
      this.clear();
      this.setInitialized(false);
      console.log('✅ Main service registry disposed successfully');
    } catch (error) {
      console.error('❌ Failed to dispose main service registry:', error);
    }
  }
}

/**
 * Logger adapter to bridge ServiceLogger and ILogger interfaces
 */
class LoggerAdapter implements ILogger {
  constructor(private readonly serviceLogger: ServiceLogger) {}

  debug(message: string, ...args: unknown[]): void {
    this.serviceLogger.debug(message, args.length > 0 ? { args } : undefined);
  }

  info(message: string, ...args: unknown[]): void {
    this.serviceLogger.info(message, args.length > 0 ? { args } : undefined);
  }

  warn(message: string, ...args: unknown[]): void {
    this.serviceLogger.warn(message, args.length > 0 ? { args } : undefined);
  }

  error(message: string, error?: Error | unknown, ...args: unknown[]): void {
    this.serviceLogger.error(
      message,
      error instanceof Error ? error : (error ? new Error(String(error)) : undefined),
      args.length > 0 ? { args } : undefined
    );
  }

  // Add getAsyncLocalStorage method for compatibility
  getAsyncLocalStorage(): AsyncLocalStorage<any> {
    // Return a simple ALS instance for compatibility
    return new AsyncLocalStorage();
  }
}

/**
 * Simple event bus implementation
 */
class SimpleEventBus implements IEventBus {
  private readonly listeners = new Map<string, Set<(data?: unknown) => void>>();

  emit(event: string, data?: unknown): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  on(event: string, listener: (data?: unknown) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
  }

  off(event: string, listener: (data?: unknown) => void): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(listener);
      if (eventListeners.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  once(event: string, listener: (data?: unknown) => void): void {
    const onceListener = (data?: unknown) => {
      listener(data);
      this.off(event, onceListener);
    };
    this.on(event, onceListener);
  }
}

// Export singleton instance
export const mainServiceRegistry = MainServiceRegistry.getInstance();