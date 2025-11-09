/**
 * Main Process Service Container
 *
 * Dependency injection container for main process services.
 * This replaces the shared container that violated architecture principles.
 */

import { Kysely } from 'kysely';
import { Database, createDatabase, runMigrations } from '@/main/services/database/kysely-database';
import { KnowledgeGraphModule } from '@/shared/utils/knowledge-graph';
import { SimpleAnalyticsModule } from '@/shared/utils/simple-analytics';
import { VectorDatabaseModule } from '@/main/services/database/vector-database';
import { SessionService } from '@/main/services/session/session-service';
import { AgentManager } from '@/main/services/catalyst/AgentManager';
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
  agentManager: AgentManager;
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
): Promise<MainServiceContainer> {
  const { databasePath, config, logger } = options;

  if (!logger) {
    throw new Error('Logger is required for main service container');
  }

  logger.info('Creating main service container...');

  try {
    // Step 1: Create database connection
    const database = await createDatabase(databasePath);

    if (!database) {
      throw new Error('Failed to create database connection');
    }

    logger.info('Database connection established');

    // Step 2: Run migrations
    await runMigrations();
    logger.info('Database migrations completed');

    // Step 3: Create core infrastructure services
    const vectorDatabase = new VectorDatabaseModule(database);
    await vectorDatabase.initialize();
    logger.info('Vector database initialized');

    const knowledgeGraph = new KnowledgeGraphModule(database, vectorDatabase);
    await knowledgeGraph.initialize();
    logger.info('Knowledge graph initialized');

    const analyticsModule = new SimpleAnalyticsModule(database);
    await analyticsModule.initialize();
    logger.info('Analytics module initialized');

    // Step 4: Create configuration service
    const configService = new ConfigService(
      // Dependencies will be injected here
      {} as any, // IConfigStorage
      logger,
      undefined // IEventBus
    );
    await configService.getConfig(); // Initialize
    logger.info('Configuration service initialized');

    // Step 5: Create core services
    const agentManager = new AgentManager(configService);
    await agentManager.initialize();
    logger.info('Agent manager initialized');

    const sessionService = new SessionService({
      database,
      logger,
      als: logger.getAsyncLocalStorage()
    });
    const conceptParsing = new ConceptParsingService([], {});
    logger.info('Core services initialized');

    // Step 6: Create high-level services
    const analyticsService = new AnalyticsService(database, logger);
    const knowledgeService = new KnowledgeService(database, vectorDatabase, logger);
    logger.info('High-level services initialized');

    const container: MainServiceContainer = {
      // Infrastructure
      database,
      analyticsModule,
      knowledgeGraph,
      vectorDatabase,

      // Core services
      configService,
      agentManager,
      sessionService,
      conceptParsing,
            
      // High-level services
      analyticsService,
      knowledgeService,
    };

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
  private container: MainServiceContainer | null = null;
  private initializationPromise: Promise<MainServiceContainer> | null = null;
  private options: MainServiceContainerOptions | null = null;

  /**
   * Initialize the service container
   */
  async initialize(options: MainServiceContainerOptions): Promise<MainServiceContainer> {
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

  private async createContainer(options: MainServiceContainerOptions): Promise<MainServiceContainer> {
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
  getContainer(): MainServiceContainer | null {
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
    return this.container?.[key] ?? null;
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

      // Cleanup high-level services first
      if (this.container.knowledgeService) {
        await this.container.knowledgeService.dispose?.();
      }

      if (this.container.analyticsService) {
        await this.container.analyticsService.dispose?.();
      }

      // Cleanup core services
      if (this.container.conceptParsing) {
        // ConceptParsingPipeline doesn't have cleanup methods in the current implementation
        // But we can add cleanup logic here if needed in the future
      }

      if (this.container.agentManager) {
        this.container.agentManager.cleanup();
      }

      // Cleanup infrastructure services
      if (this.container.analyticsModule) {
        await this.container.analyticsModule.cleanup();
      }

      if (this.container.knowledgeGraph) {
        await this.container.knowledgeGraph.cleanup();
      }

      if (this.container.vectorDatabase) {
        await this.container.vectorDatabase.cleanup();
      }

      // Database cleanup is handled by connection pooling
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
  } {
    if (!this.container) {
      return {
        initialized: false,
        serviceCount: 0,
        services: []
      };
    }

    const services = Object.keys(this.container) as (keyof MainServiceContainer)[];

    return {
      initialized: true,
      serviceCount: services.length,
      services
    };
  }
}

// Global instance for main process
export const mainServiceContainerManager = new MainServiceContainerManager();