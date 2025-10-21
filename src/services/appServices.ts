/**
 * App Services
 *
 * Simple service management for the application.
 * Replaces the complex module integration system with direct service access.
 */

import { serviceFactory, initializeServices, cleanupServices } from './factory';
import { IDatabase } from '@/modules/database/database-factory';
import { SimpleAnalyticsModule } from '@/modules/analytics/simple-analytics';
import { KnowledgeGraphModule } from '@/modules/knowledge-graph/knowledge-graph';

class AppServices {
  private static instance: AppServices;
  private _initialized = false;

  private constructor() {}

  static getInstance(): AppServices {
    if (!AppServices.instance) {
      AppServices.instance = new AppServices();
    }
    return AppServices.instance;
  }

  /**
   * Initialize all services
   */
  async initialize(): Promise<void> {
    if (this._initialized) {
      return;
    }

    try {
      console.log('Initializing app services...');

      // Initialize the service factory
      await initializeServices();

      this._initialized = true;
      console.log('App services initialized successfully');
    } catch (error) {
      console.error('Failed to initialize app services:', error);
      throw error;
    }
  }

  /**
   * Get database service
   */
  getDatabase(): IDatabase {
    return serviceFactory.getDatabase();
  }

  /**
   * Get analytics service
   */
  getAnalytics(): SimpleAnalyticsModule {
    return serviceFactory.getAnalytics();
  }

  /**
   * Get knowledge graph service
   */
  getKnowledgeGraph(): KnowledgeGraphModule {
    return serviceFactory.getKnowledgeGraph();
  }

  /**
   * Get initialization status
   */
  isInitialized(): boolean {
    return this._initialized;
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      initialized: this._initialized,
      services: serviceFactory.getStatus()
    };
  }

  /**
   * Cleanup all services
   */
  async cleanup(): Promise<void> {
    try {
      await cleanupServices();
      this._initialized = false;
      console.log('App services cleaned up successfully');
    } catch (error) {
      console.error('Error cleaning up app services:', error);
      throw error;
    }
  }

  /**
   * Get system health status
   */
  async getSystemHealth() {
    if (!this._initialized) {
      return null;
    }

    try {
      const [dbHealth, analyticsHealth, knowledgeHealth] = await Promise.all([
        this.getDatabase().healthCheck(),
        this.getAnalytics().healthCheck(),
        this.getKnowledgeGraph().healthCheck()
      ]);

      return {
        overall: this.getOverallHealth([dbHealth, analyticsHealth, knowledgeHealth]),
        services: {
          database: dbHealth,
          analytics: analyticsHealth,
          knowledgeGraph: knowledgeHealth
        },
        lastCheck: new Date()
      };
    } catch (error) {
      console.error('Failed to get system health:', error);
      return null;
    }
  }

  private getOverallHealth(healthStatuses: any[]): 'healthy' | 'degraded' | 'failed' {
    const hasFailed = healthStatuses.some(h => h.status === 'failed');
    const hasDegraded = healthStatuses.some(h => h.status === 'degraded');

    if (hasFailed) return 'failed';
    if (hasDegraded) return 'degraded';
    return 'healthy';
  }
}

// Export singleton instance
export const appServices = AppServices.getInstance();

// Export convenience functions
export const initializeAppServices = () => appServices.initialize();
export const cleanupAppServices = () => appServices.cleanup();
export const getDatabase = () => appServices.getDatabase();
export const getAnalytics = () => appServices.getAnalytics();
export const getKnowledgeGraph = () => appServices.getKnowledgeGraph();