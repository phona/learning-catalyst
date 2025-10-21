/**
 * Service Factory
 *
 * Simple singleton factory for managing service instances.
 * Replaces the complex module registry with direct instantiation.
 */

import { createDatabase, IDatabase } from '@/modules/database';
import { KnowledgeGraphModule } from '@/modules/knowledge-graph';
import { SimpleAnalyticsModule } from '@/modules/analytics';
import { VectorDatabaseModule, vectorDatabase } from '@/modules/vector-database';

class ServiceFactory {
  private static instance: ServiceFactory;

  private _database: IDatabase | null = null;
  private _knowledgeGraph: KnowledgeGraphModule | null = null;
  private _analytics: SimpleAnalyticsModule | null = null;
  private _vectorDatabase: VectorDatabaseModule | null = null;
  private _initialized = false;

  private constructor() {}

  static getInstance(): ServiceFactory {
    if (!ServiceFactory.instance) {
      ServiceFactory.instance = new ServiceFactory();
    }
    return ServiceFactory.instance;
  }

  /**
   * Initialize all services
   */
  async initialize(): Promise<void> {
    if (this._initialized) {
      return;
    }

    try {
      console.log('Initializing services...');

      // Initialize database first
      this._database = createDatabase();

      // Initialize knowledge graph with database dependency
      this._knowledgeGraph = new KnowledgeGraphModule();
      this._knowledgeGraph.databaseModule = this._database;

      // Initialize analytics with database dependency
      this._analytics = new SimpleAnalyticsModule();
      this._analytics.databaseModule = this._database;

      // Initialize vector database
      this._vectorDatabase = vectorDatabase;
      await this._vectorDatabase.initialize();
      this._vectorDatabase.databaseModule = this._database;

      this._initialized = true;
      console.log('Services initialized successfully');
    } catch (error) {
      console.error('Failed to initialize services:', error);
      this.cleanup();
      throw error;
    }
  }

  /**
   * Get database service
   */
  getDatabase(): IDatabase {
    if (!this._database) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this._database;
  }

  /**
   * Get knowledge graph service
   */
  getKnowledgeGraph(): KnowledgeGraphModule {
    if (!this._knowledgeGraph) {
      throw new Error('Knowledge graph not initialized. Call initialize() first.');
    }
    return this._knowledgeGraph;
  }

  /**
   * Get analytics service
   */
  getAnalytics(): SimpleAnalyticsModule {
    if (!this._analytics) {
      throw new Error('Analytics not initialized. Call initialize() first.');
    }
    return this._analytics;
  }

  /**
   * Get vector database service
   */
  getVectorDatabase(): VectorDatabaseModule {
    if (!this._vectorDatabase) {
      throw new Error('Vector database not initialized. Call initialize() first.');
    }
    return this._vectorDatabase;
  }

  /**
   * Check if services are initialized
   */
  isInitialized(): boolean {
    return this._initialized;
  }

  /**
   * Get initialization status
   */
  getStatus() {
    return {
      initialized: this._initialized,
      database: !!this._database,
      knowledgeGraph: !!this._knowledgeGraph,
      analytics: !!this._analytics,
      vectorDatabase: !!this._vectorDatabase,
    };
  }

  /**
   * Cleanup all services
   */
  async cleanup(): Promise<void> {
    try {
      if (this._analytics) {
        await this._analytics.cleanup?.();
      }
      if (this._knowledgeGraph) {
        await this._knowledgeGraph.cleanup?.();
      }
      if (this._database) {
        await this._database.cleanup?.();
      }
    } catch (error) {
      console.error('Error during service cleanup:', error);
    } finally {
      this._database = null;
      this._knowledgeGraph = null;
      this._analytics = null;
      this._vectorDatabase = null;
      this._initialized = false;
    }
  }
}

// Export singleton instance
export const serviceFactory = ServiceFactory.getInstance();

// Export convenience functions
export const getDatabase = () => serviceFactory.getDatabase();
export const getKnowledgeGraph = () => serviceFactory.getKnowledgeGraph();
export const getAnalytics = () => serviceFactory.getAnalytics();
export const getVectorDatabase = () => serviceFactory.getVectorDatabase();
export const initializeServices = () => serviceFactory.initialize();
export const cleanupServices = () => serviceFactory.cleanup();