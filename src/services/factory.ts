/**
 * Simple Service Factory
 *
 * Direct service management without over-engineering.
 * Creates and manages module instances in a straightforward way.
 */

import { KnowledgeGraphModule } from '@/modules/knowledge-graph';
import { SimpleAnalyticsModule } from '@/modules/analytics';
import { VectorDatabaseModule } from '@/modules/vector-database';
import { LocalDatabaseModule } from '@/modules/database/local-database-module';

class ServiceFactory {
  private static instance: ServiceFactory;

  // Direct module instances - no Maps, no registration complexity
  private database: LocalDatabaseModule | null = null;
  private knowledgeGraph: KnowledgeGraphModule | null = null;
  private analytics: SimpleAnalyticsModule | null = null;
  private vectorDatabase: VectorDatabaseModule | null = null;
  private _initialized = false;

  private constructor() {
    console.log('🏗️ ServiceFactory instance created at:', new Date().toISOString());
  }

  static getInstance(): ServiceFactory {
    if (!ServiceFactory.instance) {
      ServiceFactory.instance = new ServiceFactory();
    }
    return ServiceFactory.instance;
  }

  /**
   * Initialize all modules in dependency order
   */
  async initialize(): Promise<void> {
	this.database = new LocalDatabaseModule();
	await this.database.initialize();

	// Initialize vector database with constructor injection
	this.vectorDatabase = new VectorDatabaseModule(this.database);
	await this.vectorDatabase.initialize();

	// Initialize knowledge graph with constructor injection
	this.knowledgeGraph = new KnowledgeGraphModule(this.database, this.vectorDatabase);
	await this.knowledgeGraph.initialize();

	// Initialize analytics with constructor injection
	this.analytics = new SimpleAnalyticsModule(this.database);
	await this.analytics.initialize();

	this._initialized = true;
	console.log('All services initialized successfully');
  }

  /**
   * Get database module
   */
  getDatabase(): LocalDatabaseModule {
    if (!this.database) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.database;
  }

  /**
   * Get knowledge graph module
   */
  getKnowledgeGraph(): KnowledgeGraphModule {
    if (!this.knowledgeGraph) {
      throw new Error('Knowledge graph not initialized. Call initialize() first.');
    }
    return this.knowledgeGraph;
  }

  /**
   * Get analytics module
   */
  getAnalytics(): SimpleAnalyticsModule {
    if (!this.analytics) {
      throw new Error('Analytics not initialized. Call initialize() first.');
    }
    return this.analytics;
  }

  /**
   * Get vector database module
   */
  getVectorDatabase(): VectorDatabaseModule {
    if (!this.vectorDatabase) {
      throw new Error('Vector database not initialized. Call initialize() first.');
    }
    return this.vectorDatabase;
  }

  /**
   * Check if services are initialized
   */
  isInitialized(): boolean {
    return this._initialized;
  }

  
  
  /**
   * Cleanup all modules in reverse order
   */
  async cleanup(): Promise<void> {
    try {
      console.log('Cleaning up services...');

      // Cleanup in reverse dependency order
      if (this.analytics) {
        console.log('Cleaning up analytics');
        await this.analytics.cleanup();
      }

      if (this.knowledgeGraph) {
        console.log('Cleaning up knowledge graph');
        await this.knowledgeGraph.cleanup();
      }

      if (this.vectorDatabase) {
        console.log('Cleaning up vector database');
        await this.vectorDatabase.cleanup();
      }

      if (this.database) {
        console.log('Cleaning up database');
        await this.database.cleanup();
      }

      // Reset all instances
      this.database = null;
      this.knowledgeGraph = null;
      this.analytics = null;
      this.vectorDatabase = null;
      this._initialized = false;

      console.log('All services cleaned up successfully');
    } catch (error) {
      console.error('Error during service cleanup:', error);
      throw error;
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