/**
 * Service Container
 *
 * Proper dependency injection container for managing services.
 * No global state - services are created and injected explicitly.
 */

import { Kysely } from 'kysely';
import { Database, createDatabase, runMigrations } from '@/modules/database/kysely-database';
import { KnowledgeGraphModule } from '@/modules/knowledge-graph';
import { SimpleAnalyticsModule } from '@/modules/analytics';
import { VectorDatabaseModule } from '@/modules/vector-database';
import SessionService from './sessionService';
import { ContentDiscoveryService } from './ContentDiscoveryService';
import { ConceptParsingService } from './ConceptParsingService';
import { AgentManager } from './AgentManager';
import { createConfigService, ConfigService } from '@/services/configService';
import type { AppConfig } from '@/types/config';

export interface ServiceContainer {
  database: Kysely<Database>;
  analytics: SimpleAnalyticsModule;
  knowledgeGraph: KnowledgeGraphModule;
  vectorDatabase: VectorDatabaseModule;
  sessionService: SessionService;
  contentDiscovery: ContentDiscoveryService;
  conceptParsing: ConceptParsingService;
  agentManager: AgentManager;
  configService: ConfigService;
}

export interface ServiceContainerOptions {
  databasePath: string;
  config: AppConfig;
}

/**
 * Create a new service container with dependency injection.
 * This function creates fresh service instances with proper DI.
 */
export async function createServiceContainer(): Promise<ServiceContainer> {
  console.log('Creating service container...');

  // Create database first - it's the root dependency
  const database = await createDatabase();
  if (!database) {
    throw new Error('Failed to create database');
  }

  // Run migrations to ensure database schema is up to date
  console.log('Running database migrations...');
  try {
    await runMigrations();
    console.log('Database migrations completed successfully');
  } catch (error) {
    console.error('Failed to run database migrations:', error);
    throw new Error(`Database migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Create services with constructor injection
  const vectorDatabase = new VectorDatabaseModule(database);
  await vectorDatabase.initialize();

  const knowledgeGraph = new KnowledgeGraphModule(database, vectorDatabase);
  await knowledgeGraph.initialize();

  const analytics = new SimpleAnalyticsModule(database);
  await analytics.initialize();

  const configService = await createConfigService();

  // Create agent manager with service injection
  const agentManager = new AgentManager(configService);
  await agentManager.initialize();

  // Update dependent services to use AgentManager instead of ChatService
  const sessionService = new SessionService(database, agentManager);
  const contentDiscovery = new ContentDiscoveryService(database);
  const conceptParsing = new ConceptParsingService(agentManager, configService);

  console.log('Service container created successfully');

  return {
    database,
    analytics,
    knowledgeGraph,
    vectorDatabase,
    sessionService,
    contentDiscovery,
    conceptParsing,
    agentManager,
    configService,
  };
}

/**
 * Service container manager for React context.
 * This manages the lifecycle of service containers.
 */
export class ServiceContainerManager {
  private container: ServiceContainer | null = null;
  private initializationPromise: Promise<ServiceContainer> | null = null;

  /**
   * Get or create the service container.
   * Uses lazy initialization pattern.
   */
  async getContainer(options: ServiceContainerOptions): Promise<ServiceContainer> {
    if (this.container) {
      return this.container;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.createContainer(options);
    return this.initializationPromise;
  }

  private async createContainer(options: ServiceContainerOptions): Promise<ServiceContainer> {
    try {
      this.container = await createServiceContainer();
      return this.container;
    } catch (error) {
      this.initializationPromise = null;
      throw error;
    }
  }

  /**
   * Check if container is initialized.
   */
  isInitialized(): boolean {
    return this.container !== null;
  }

  /**
   * Get the current container without initialization.
   * Returns null if not initialized.
   */
  getCurrentContainer(): ServiceContainer | null {
    return this.container;
  }

  /**
   * Cleanup the service container.
   */
  async cleanup(): Promise<void> {
    try {
      console.log('Cleaning up service container...');

      if (this.container?.analytics) {
        await this.container.analytics.cleanup();
      }

      if (this.container?.knowledgeGraph) {
        await this.container.knowledgeGraph.cleanup();
      }

      if (this.container?.vectorDatabase) {
        await this.container.vectorDatabase.cleanup();
      }

      if (this.container?.database) {
        console.log('Database cleanup complete (Kysely instance)');
      }

      if (this.container?.conceptParsing) {
        // ConceptParsingService doesn't have explicit cleanup method, but we can cancel active jobs
        const activeJobs = this.container.conceptParsing.getActiveJobs();
        for (const job of activeJobs) {
          this.container.conceptParsing.cancelJob(job.id);
        }
        console.log('ConceptParsing service cleanup complete');
      }

      if (this.container?.agentManager) {
        this.container.agentManager.cleanup();
        console.log('AgentManager cleanup complete');
      }

      this.container = null;
      this.initializationPromise = null;

      console.log('Service container cleaned up successfully');
    } catch (error) {
      console.error('Error during service container cleanup:', error);
      throw error;
    }
  }
}