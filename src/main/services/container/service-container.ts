/**
 * Main Process Service Container
 *
 * Dependency injection container for main process services.
 * Uses the unified ServiceContainer for process-agnostic dependency injection.
 */

import { Kysely } from 'kysely';
import { ServiceContainer, createServiceContainer } from '@/shared/utils/service-container';
import { Database, createDatabase, runMigrations } from '@/main/services/database/kysely-database';
import { KnowledgeGraphModule } from '@/shared/utils/knowledge-graph';
import { SimpleAnalyticsModule } from '@/shared/utils/simple-analytics';
import { VectorDatabaseModule } from '@/main/services/database/vector-database';
import { SessionService } from '@/main/services/session/session-service';
import { AgentManagerMain } from '../agents/agent-manager';
import { ConceptProcessingPipeline as ConceptParsingService } from '@/main/services/concept-parsing';
import { ConfigService } from '@/main/services/configService';
import { MainAnalyticsService as AnalyticsService } from '@/main/services/analytics/analytics-service';
import { KnowledgeService } from '@/main/services/database/knowledge-service';
import { ILogger } from '@/main/services/registry/ServiceTokens';

export interface MainServiceContainer {
  // Database and storage
  database: Kysely<Database>;
  analyticsModule: SimpleAnalyticsModule;
  knowledgeGraph: KnowledgeGraphModule;
  vectorDatabase: VectorDatabaseModule;

  // Core services
  configService: ConfigService;
  agentManager: AgentManagerMain;
  sessionService: SessionService;
  conceptParsing: ConceptParsingService;
    
  // High-level services
  analyticsService: AnalyticsService;
  knowledgeService: KnowledgeService;
}

export interface MainServiceContainerOptions {
  databasePath: string;
  config?: any;
  logger?: ILogger;
}

/**
 * Create main process service container with proper dependency injection
 */
export async function createMainServiceContainer(
  options: MainServiceContainerOptions
): Promise<ServiceContainer<MainServiceContainer>> {
  const { databasePath, config, logger } = options;

  if (!logger) {
    throw new Error('Logger is required for main service container');
  }

  logger.info('Creating main service container...');

  try {
    // Create the unified service container
    const container = createServiceContainer<MainServiceContainer>()
      // Step 1: Database and storage (factories for lazy initialization)
      .withService('database', async () => {
        const db = await createDatabase(databasePath);
        if (!db) {
          throw new Error('Failed to create database connection');
        }
        logger.info('Database connection established');
        return db;
      }, true)

      .withService('analyticsModule', async () => {
        const db = container.get('database');
        const analyticsModule = new SimpleAnalyticsModule(db);
        await analyticsModule.initialize();
        logger.info('Analytics module initialized');
        return analyticsModule;
      }, true)

      .withService('vectorDatabase', async () => {
        const db = container.get('database');
        const vectorDatabase = new VectorDatabaseModule(db);
        await vectorDatabase.initialize();
        logger.info('Vector database initialized');
        return vectorDatabase;
      }, true)

      .withService('knowledgeGraph', async () => {
        const db = container.get('database');
        const vectorDb = container.get('vectorDatabase');
        const knowledgeGraph = new KnowledgeGraphModule(db, vectorDb);
        await knowledgeGraph.initialize();
        logger.info('Knowledge graph initialized');
        return knowledgeGraph;
      }, true)

      // Step 2: Core services
      .withService('configService', () => {
        const configService = new ConfigService(
          {} as any, // IConfigStorage
          logger,
          undefined // IEventBus
        );
        logger.info('Configuration service initialized');
        return configService;
      }, true)

      .withService('sessionService', () => {
        const db = container.get('database');
        const sessionService = new SessionService({
          database: db,
          logger,
          als: logger.getAsyncLocalStorage()
        });
        logger.info('Session service initialized');
        return sessionService;
      }, true)

      .withService('conceptParsing', () => {
        const conceptParsing = new ConceptParsingService([], {});
        logger.info('Concept parsing service initialized');
        return conceptParsing;
      }, true)

      // Step 3: High-level services
      .withService('analyticsService', () => {
        const db = container.get('database');
        const analyticsService = new AnalyticsService(db, logger);
        logger.info('Analytics service initialized');
        return analyticsService;
      }, true)

      .withService('knowledgeService', () => {
        const db = container.get('database');
        const vectorDb = container.get('vectorDatabase');
        const knowledgeService = new KnowledgeService(db, vectorDb, logger);
        logger.info('Knowledge service initialized');
        return knowledgeService;
      }, true)

      .build();

    // Run database migrations after all services are registered
    await runMigrations();
    logger.info('Database migrations completed');

    logger.info('Main service container created successfully');
    return container;

  } catch (error) {
    logger.error('Failed to create main service container', error);
    throw new Error(`Service container initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Service container manager for main process
 */
export class MainServiceContainerManager {
  private container: ServiceContainer<MainServiceContainer> | null = null;
  private initializationPromise: Promise<ServiceContainer<MainServiceContainer>> | null = null;
  private options: MainServiceContainerOptions | null = null;

  /**
   * Initialize the service container
   */
  async initialize(options: MainServiceContainerOptions): Promise<ServiceContainer<MainServiceContainer>> {
    if (this.container) {
      return this.container;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.options = options;
    this.initializationPromise = this.createContainer(options);
    return this.initializationPromise;
  }

  private async createContainer(options: MainServiceContainerOptions): Promise<ServiceContainer<MainServiceContainer>> {
    try {
      this.container = await createMainServiceContainer(options);
      return this.container;
    } catch (error) {
      this.initializationPromise = null;
      throw error;
    }
  }

  /**
   * Get the current container
   */
  getContainer(): ServiceContainer<MainServiceContainer> | null {
    return this.container;
  }

  /**
   * Check if container is initialized
   */
  isInitialized(): boolean {
    return this.container !== null;
  }

  /**
   * Get a specific service
   */
  getService<TKey extends keyof MainServiceContainer>(
    key: TKey
  ): MainServiceContainer[TKey] | null {
    return this.container?.get(key) ?? null;
  }

  /**
   * Cleanup resources
   */
  async dispose(): Promise<void> {
    if (!this.container) {
      return;
    }

    const logger = this.options?.logger;

    try {
      logger?.info('Disposing main service container...');

      // The unified ServiceContainer will handle automatic disposal of services
      this.container.dispose();

      logger?.info('Main service container disposed successfully');

    } catch (error) {
      logger?.error('Error during service container disposal', error);
      throw error;
    } finally {
      this.container = null;
      this.initializationPromise = null;
      this.options = null;
    }
  }

  /**
   * Get container statistics
   */
  getStats(): {
    initialized: boolean;
    serviceCount: number;
    services: string[];
    isDisposed: boolean;
  } {
    if (!this.container) {
      return {
        initialized: false,
        serviceCount: 0,
        services: [],
        isDisposed: false
      };
    }

    const stats = this.container.getStats();

    return {
      initialized: true,
      serviceCount: stats.totalServices,
      services: stats.serviceNames,
      isDisposed: stats.isDisposed
    };
  }
}

// Global instance for main process
export const mainServiceContainerManager = new MainServiceContainerManager();