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
 * App Services - Legacy Compatibility Layer
 *
 * This file provides backward compatibility for any code that still imports
 * from the old appServices module. New code should use the dependency injection
 * pattern from hooks/useAppServices.ts instead.
 *
 * @deprecated Use the ServiceProvider component and useService hook instead.
 */

import { ServiceContainerManager } from '@/renderer/services/container';

// Global manager instance for backward compatibility
// @deprecated This should be replaced with React Context-based DI
const legacyManager = new ServiceContainerManager();

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
    const container = legacyManager.getCurrentContainer();
    if (!container) {
      throw new Error('Database not initialized. Use ServiceProvider component first.');
    }
    return container.database;
  },
  getAnalytics() {
    const container = legacyManager.getCurrentContainer();
    if (!container) {
      throw new Error('Analytics not initialized. Use ServiceProvider component first.');
    }
    return container.analytics;
  },
  getKnowledgeGraph() {
    const container = legacyManager.getCurrentContainer();
    if (!container) {
      throw new Error('Knowledge graph not initialized. Use ServiceProvider component first.');
    }
    return container.knowledgeGraph;
  },
  getVectorDatabase() {
    const container = legacyManager.getCurrentContainer();
    if (!container) {
      throw new Error('Vector database not initialized. Use ServiceProvider component first.');
    }
    return container.vectorDatabase;
  },
  getSessionService() {
    const container = legacyManager.getCurrentContainer();
    if (!container) {
      throw new Error('Session service not initialized. Use ServiceProvider component first.');
    }
    return container.sessionService;
  },
  getAgentManager() {
    const container = legacyManager.getCurrentContainer();
    if (!container) {
      throw new Error('Agent manager not initialized. Use ServiceProvider component first.');
    }
    return container.agentManager;
  },
  isInitialized() {
    return legacyManager.isInitialized();
  }
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