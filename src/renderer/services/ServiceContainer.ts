import { ServiceContainer, createServiceContainer } from '@/shared/utils/service-container';
import { CatalystService } from './CatalystService';
import { ChatService } from './ChatService';
import { AnalyticsService } from './AnalyticsService';
import { DiscoveryService } from './DiscoveryService';
import { ElectronCatalystIPCClient } from './ipc/ElectronCatalystIPCClient';
import { MockCatalystIPCClient } from './ipc/MockCatalystIPCClient';
import { ICatalystService } from './interfaces/ICatalystService';
import { IAnalyticsService } from './interfaces/IAnalyticsService';
import { ConfigurationService } from './configuration/configuration-service';
import { SessionService } from './sessionService';

/**
 * Renderer service types
 */
export interface RendererServices {
  catalystIPCClient: any;
  catalystService: ICatalystService;
  chatService: ChatService;
  analyticsService: IAnalyticsService;
  discoveryService: DiscoveryService;
  sessionService: any;
  configService: ConfigurationService;
}

/**
 * Test mode flag for renderer services
 */
let isTestMode = false;

/**
 * Enable test mode for renderer services
 */
export function enableTestMode(): void {
  isTestMode = true;
}

/**
 * Disable test mode for renderer services
 */
export function disableTestMode(): void {
  isTestMode = false;
}

/**
 * Check if in test mode
 */
export function isInTestMode(): boolean {
  return isTestMode;
}

/**
 * Create renderer service container with default services
 */
function createRendererServiceContainer(): ServiceContainer<RendererServices> {
  return createServiceContainer<RendererServices>()
    // IPC Client - uses mock in test mode, real implementation otherwise
    .withService('catalystIPCClient', () => {
      return isInTestMode()
        ? new MockCatalystIPCClient(50) // Faster response for tests
        : new ElectronCatalystIPCClient();
    }, true)

    // Catalyst Service
    .withService('catalystService', (container) => {
      const ipcClient = container.get('catalystIPCClient');
      return new CatalystService(ipcClient);
    }, true)

    // Chat Service
    .withService('chatService', (container) => {
      const catalystService = container.get('catalystService');
      return new ChatService(catalystService);
    }, true)

    // Analytics Service
    .withService('analyticsService', () => {
      return new AnalyticsService();
    }, true)

    // Discovery Service
    .withService('discoveryService', (container) => {
      const catalystService = container.get('catalystService');
      return new DiscoveryService(catalystService);
    }, true)

    // Configuration Service
    .withService('configService', () => {
      return new ConfigurationService();
    }, true)

    // Session Service
    .withService('sessionService', () => new SessionService(), true)

    .build();
}

/**
 * Global renderer service container instance
 * Initialized with default services
 */
const rendererServiceContainer = createRendererServiceContainer();

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
  CONFIG_SERVICE: 'configService',
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
export function getService<K extends keyof RendererServices>(name: K): RendererServices[K] {
  return rendererServiceContainer.get(name);
}

/**
 * Convenience function to get the Catalyst service
 * @returns CatalystService instance
 */
export function getCatalystService(): ICatalystService {
  return rendererServiceContainer.get(RENDERER_SERVICE_NAMES.CATALYST_SERVICE);
}

/**
 * Convenience function to get the Chat service
 * @returns ChatService instance
 */
export function getChatService(): ChatService {
  return rendererServiceContainer.get(RENDERER_SERVICE_NAMES.CHAT_SERVICE);
}

/**
 * Convenience function to get the Analytics service
 * @returns AnalyticsService instance
 */
export function getAnalyticsService(): IAnalyticsService {
  return rendererServiceContainer.get(RENDERER_SERVICE_NAMES.ANALYTICS_SERVICE);
}

/**
 * Convenience function to get the Discovery service
 * @returns DiscoveryService instance
 */
export function getDiscoveryService(): DiscoveryService {
  return rendererServiceContainer.get(RENDERER_SERVICE_NAMES.DISCOVERY_SERVICE);
}

/**
 * Convenience function to get the Session service
 * @returns SessionService instance
 */
export function getSessionService(): any {
  return rendererServiceContainer.get(RENDERER_SERVICE_NAMES.SESSION_SERVICE);
}

export function getConfigService(): ConfigurationService {
  return rendererServiceContainer.get(RENDERER_SERVICE_NAMES.CONFIG_SERVICE);
}
