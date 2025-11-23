/**
 * App Services - Legacy Compatibility Layer
 *
 * This file provides backward compatibility for any code that still imports
 * from the old appServices module. New code should use the dependency injection
 * pattern from hooks/useAppServices.ts instead.
 *
 * @deprecated Use the ServiceProvider component and useService hook instead.
 */

import type { ServiceContainer } from '@/renderer/services/service-container';
import { createServiceContainer } from '@/renderer/services/service-container';
import { createElectronAPIClient } from '@/renderer/services/api/electron-api-client';
import type { ElectronAPI } from '@/shared/types/electron-api';

class LegacyServiceContainerManager {
  private container: ServiceContainer | null = null;
  private electronApi: ElectronAPI | null = null;

  private ensureElectronApi(): ElectronAPI {
    if (!this.electronApi) {
      this.electronApi = createElectronAPIClient();
    }
    return this.electronApi;
  }

  async getContainer(): Promise<ServiceContainer> {
    if (!this.container) {
      const api = this.ensureElectronApi();
      this.container = createServiceContainer(api);
    }
    return this.container;
  }

  getCurrentContainer(): ServiceContainer | null {
    return this.container;
  }

  async cleanup(): Promise<void> {
    this.container = null;
  }

  isInitialized(): boolean {
    return this.container != null;
  }
}

// Global manager instance for backward compatibility
// @deprecated This should be replaced with React Context-based DI
const legacyManager = new LegacyServiceContainerManager();

// For backward compatibility with existing code that expects appServices object
// This now uses the new service container manager under the hood
export const appServices = {
  async initialize() {
    await legacyManager.getContainer();
  },
  async cleanup() {
    await legacyManager.cleanup();
  },
  getDatabase() {
    throw new Error('Database service not available in renderer container.');
  },
  getAnalytics() {
    const container = legacyManager.getCurrentContainer();
    if (!container) {
      throw new Error('Analytics not initialized. Use ServiceProvider component first.');
    }
    return container.analytics;
  },
  getKnowledgeGraph() {
    throw new Error('Knowledge graph service not available in renderer container.');
  },
  getVectorDatabase() {
    throw new Error('Vector database service not available in renderer container.');
  },
  getSessionService() {
    const container = legacyManager.getCurrentContainer();
    if (!container) {
      throw new Error('Session service not initialized. Use ServiceProvider component first.');
    }
    return container.session;
  },
  getAgentManager() {
    throw new Error('Agent manager not available in renderer container.');
  },
  isInitialized() {
    return legacyManager.isInitialized();
  },
};

// Legacy re-exports for backward compatibility
// @deprecated Use ServiceProvider component and useService hook instead.
export const initializeAppServices = () => appServices.initialize();
export const cleanupAppServices = () => appServices.cleanup();
export const getDatabase = () => appServices.getDatabase();
export const getAnalytics = () => appServices.getAnalytics();
export const getKnowledgeGraph = () => appServices.getKnowledgeGraph();
export const getVectorDatabase = () => appServices.getVectorDatabase();
export const getSessionService = () => appServices.getSessionService();
export const getAgentManager = () => appServices.getAgentManager();
export const getServiceFactory = () => appServices;
