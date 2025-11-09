import { ElectronCatalystIPCClient } from './ElectronCatalystIPCClient';
import { MockCatalystIPCClient } from './MockCatalystIPCClient';
import { ICatalystIPCClient } from './ICatalystIPCClient';

/**
 * Factory for creating IPC clients
 * Provides abstraction for creating different client implementations
 */
export class IPCClientFactory {
  /**
   * Create Catalyst IPC client
   * @param options - Client creation options
   * @returns IPC client instance
   */
  static createCatalystClient(options: CatalystClientOptions = {}): ICatalystIPCClient {
    if (options.useMock || IPCClientFactory.isTestEnvironment()) {
      return new MockCatalystIPCClient(options.mockDelay);
    }

    return new ElectronCatalystIPCClient();
  }

  /**
   * Create multiple IPC clients for testing
   * @param options - Creation options
   * @returns Object containing multiple client instances
   */
  static createTestClients(options: TestClientOptions = {}): {
    catalyst: ICatalystIPCClient;
    analytics: MockCatalystIPCClient;
  } {
    const catalyst = new MockCatalystIPCClient(options.catalystDelay);
    const analytics = new MockCatalystIPCClient(options.analyticsDelay);

    return {
      catalyst,
      analytics
    };
  }

  /**
   * Check if running in test environment
   * @returns True if in test environment
   */
  private static isTestEnvironment(): boolean {
    return (
      process.env.NODE_ENV === 'test' ||
      process.env.VITEST === 'true' ||
      typeof window !== 'undefined' && window.location.pathname.includes('test')
    );
  }

  /**
   * Validate IPC client is available
   * @param client - IPC client to validate
   * @returns True if client is valid
   */
  static validateIPCClient(client: ICatalystIPCClient): boolean {
    return (
      client &&
      typeof client === 'object' &&
      'sendChat' in client &&
      'getAvailableAgents' in client &&
      typeof client.sendChat === 'function' &&
      typeof client.getAvailableAgents === 'function'
    );
  }
}

/**
 * Options for creating Catalyst clients
 */
export interface CatalystClientOptions {
  /** Use mock implementation for testing */
  useMock?: boolean;
  /** Delay for mock responses (ms) */
  mockDelay?: number;
  /** Custom configuration for client */
  config?: Record<string, unknown>;
}

/**
 * Options for creating test clients
 */
export interface TestClientOptions {
  /** Delay for Catalyst client mock responses (ms) */
  catalystDelay?: number;
  /** Delay for Analytics client mock responses (ms) */
  analyticsDelay?: number;
  /** Shared mock data between clients */
  sharedData?: {
    agents?: unknown[];
    sessions?: unknown[];
  };
}

/**
 * IPC Client registry for managing multiple clients
 */
export class IPCClientRegistry {
  private clients = new Map<string, ICatalystIPCClient>();
  private factory: typeof IPCClientFactory;

  constructor(factory: typeof IPCClientFactory = IPCClientFactory) {
    this.factory = factory;
  }

  /**
   * Register a client with a name
   * @param name - Client name
   * @param client - Client instance
   */
  register(name: string, client: ICatalystIPCClient): void {
    if (!this.factory.validateIPCClient(client)) {
      throw new Error(`Invalid IPC client provided for ${name}`);
    }
    this.clients.set(name, client);
  }

  /**
   * Get a registered client
   * @param name - Client name
   * @returns Client instance
   */
  get(name: string): ICatalystIPCClient {
    const client = this.clients.get(name);
    if (!client) {
      throw new Error(`IPC client not found: ${name}`);
    }
    return client;
  }

  /**
   * Create and register a new client
   * @param name - Client name
   * @param options - Creation options
   * @returns Created client instance
   */
  createAndRegister(name: string, options: CatalystClientOptions = {}): ICatalystIPCClient {
    const client = this.factory.createCatalystClient(options);
    this.register(name, client);
    return client;
  }

  /**
   * Check if a client is registered
   * @param name - Client name
   * @returns True if client exists
   */
  has(name: string): boolean {
    return this.clients.has(name);
  }

  /**
   * Remove a registered client
   * @param name - Client name
   */
  remove(name: string): void {
    this.clients.delete(name);
  }

  /**
   * Clear all registered clients
   */
  clear(): void {
    this.clients.clear();
  }

  /**
   * Get all registered client names
   * @returns Array of client names
   */
  getClientNames(): string[] {
    return Array.from(this.clients.keys());
  }
}

/**
 * Global IPC client registry instance
 */
export const ipcClientRegistry = new IPCClientRegistry();