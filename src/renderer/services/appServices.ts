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

let container: ServiceContainer | null = null;
let electronApi: ElectronAPI | null = null;

const ensureElectronApi = (): ElectronAPI => {
  if (!electronApi) {
    electronApi = createElectronAPIClient();
  }
  return electronApi;
};

export const appServices = {
  async initialize(): Promise<void> {
    if (!container) {
      container = createServiceContainer(ensureElectronApi());
    }
  },
  async cleanup(): Promise<void> {
    container = null;
  },
  getDatabase() {
    throw new Error('Database service not available in renderer container.');
  },
  getAnalytics() {
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
    if (!container) {
      throw new Error('Session service not initialized. Use ServiceProvider component first.');
    }
    return container.session;
  },
  getAgentManager() {
    throw new Error('Agent manager not available in renderer container.');
  },
  isInitialized() {
    return container != null;
  },
};

export const initializeAppServices = () => appServices.initialize();
export const cleanupAppServices = () => appServices.cleanup();
export const getDatabase = () => appServices.getDatabase();
export const getAnalytics = () => appServices.getAnalytics();
export const getKnowledgeGraph = () => appServices.getKnowledgeGraph();
export const getVectorDatabase = () => appServices.getVectorDatabase();
export const getSessionService = () => appServices.getSessionService();
export const getAgentManager = () => appServices.getAgentManager();
