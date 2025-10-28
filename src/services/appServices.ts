/**
 * App Services
 *
 * Direct re-export of the unified ServiceFactory for convenience.
 * Simplified architecture - no additional abstraction layer needed.
 */

import { serviceFactory } from './factory';

// Re-export service factory functionality directly
export const initializeAppServices = () => serviceFactory.initialize();
export const cleanupAppServices = () => serviceFactory.cleanup();
export const getDatabase = () => serviceFactory.getDatabase();
export const getAnalytics = () => serviceFactory.getAnalytics();
export const getKnowledgeGraph = () => serviceFactory.getKnowledgeGraph();
export const getVectorDatabase = () => serviceFactory.getVectorDatabase();
export const getServiceFactory = () => serviceFactory;

// For backward compatibility with existing code that expects appServices object
export const appServices = {
  initialize: () => serviceFactory.initialize(),
  cleanup: () => serviceFactory.cleanup(),
  getDatabase: () => serviceFactory.getDatabase(),
  getAnalytics: () => serviceFactory.getAnalytics(),
  getKnowledgeGraph: () => serviceFactory.getKnowledgeGraph(),
  getVectorDatabase: () => serviceFactory.getVectorDatabase(),
  isInitialized: () => serviceFactory.isInitialized()
};