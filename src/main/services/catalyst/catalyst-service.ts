/**
 * Catalyst Service Main - Main Thread Orchestrator
 *
 * Central orchestrator for all main thread services in Learning Catalyst.
 * Provides dependency injection, service coordination, and unified interface
 * for agent management, tool execution, and database operations.
 */

import { AsyncLocalStorage } from 'async_hooks';
import { BrowserWindow } from 'electron';
import { CatalystServiceDependencies, ServiceConfig, ServiceError, ServiceHealth, ServiceExecutionContext } from '../types';
import { ServiceRegistry, MainThreadServiceRegistry } from '../registry';
import { LoggerFactory } from '../logger';
import { ServiceConfigManager } from '../config';
import { ToolExecutorService } from '../tool-executor';
import { AgentManagerMain } from '../agents/agent-manager';
import { SessionServiceMain } from '../session/session-service';
import { Database, createDatabase, runMigrations } from '../database/kysely-database';

/**
 * Main service orchestrator for Learning Catalyst
 */
export class CatalystServiceMain {
  private registry: MainThreadServiceRegistry;
  private config: ServiceConfigManager;
  private loggerFactory: LoggerFactory;
  private logger: any;
  private als: AsyncLocalStorage<ServiceExecutionContext>;
  private database: Database | null = null;
  private toolExecutor: ToolExecutorService | null = null;
  private agentManager: AgentManagerMain | null = null;
  private sessionService: SessionServiceMain | null = null;
  private initialized = false;
  private disposed = false;

  constructor() {
    this.registry = new MainThreadServiceRegistry();
    this.config = ServiceConfigManager.getInstance();
    this.loggerFactory = LoggerFactory.getInstance();
    this.als = this.loggerFactory.getAsyncLocalStorage();
    this.logger = this.loggerFactory.createContextAwareLogger();

    this.logger.info('Catalyst service main created');
  }

  /**
   * Initialize all main thread services
   */
  async initialize(mainWindow: BrowserWindow | null, workspacePath: string): Promise<void> {
    if (this.initialized) {
      throw new ServiceError(
        'Catalyst service has already been initialized',
        'ALREADY_INITIALIZED',
        'CatalystServiceMain'
      );
    }

    if (this.disposed) {
      throw new ServiceError(
        'Catalyst service has been disposed and cannot be reinitialized',
        'SERVICE_DISPOSED',
        'CatalystServiceMain'
      );
    }

    try {
      this.logger.info('Initializing Catalyst service main...');

      // Initialize core infrastructure
      await this.initializeCoreInfrastructure(mainWindow, workspacePath);

      // Initialize services in dependency order
      await this.initializeDatabase();
      await this.initializeToolExecutor();
      await this.initializeAgentManager();
      await this.initializeSessionService();
      await this.registerServices();

      this.initialized = true;
      this.logger.info('✅ Catalyst service main initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize Catalyst service main', error as Error);
      await this.dispose();
      throw error;
    }
  }

  /**
   * Initialize core infrastructure
   */
  private async initializeCoreInfrastructure(
    mainWindow: BrowserWindow | null,
    workspacePath: string
  ): Promise<void> {
    this.logger.info('Initializing core infrastructure...');

    // Register core services
    this.registry.register('config', this.config);
    this.registry.register('loggerFactory', this.loggerFactory);
    this.registry.register('als', this.als);
    this.registry.register('logger', this.logger);
    this.registry.register('mainWindow', mainWindow);
    this.registry.register('workspacePath', workspacePath);

    this.logger.info('Core infrastructure initialized');
  }

  /**
   * Initialize database connection
   */
  private async initializeDatabase(): Promise<void> {
    this.logger.info('Initializing database connection...');

    try {
      // Create database instance
      const dbConfig = this.config.getDatabaseConfig();
      this.database = await createDatabase({
        filename: './learning_catalyst.db',
        maxConnections: dbConfig.maxConnections,
        connectionTimeout: dbConfig.connectionTimeout,
        queryTimeout: dbConfig.queryTimeout
      });

      // Run migrations
      await runMigrations(this.database);

      // Register database service
      this.registry.register('database', this.database);

      this.logger.info('Database connection initialized successfully');

    } catch (error) {
      throw new ServiceError(
        `Failed to initialize database: ${(error as Error).message}`,
        'DATABASE_INIT_FAILED',
        'CatalystServiceMain',
        undefined,
        error as Error
      );
    }
  }

  /**
   * Initialize tool executor service
   */
  private async initializeToolExecutor(): Promise<void> {
    this.logger.info('Initializing tool executor service...');

    if (!this.database) {
      throw new ServiceError(
        'Database must be initialized before tool executor',
        'MISSING_DEPENDENCY',
        'CatalystServiceMain'
      );
    }

    // Create service dependencies
    const dependencies = {
      database: this.database,
      als: this.als,
      logger: this.logger,
      config: this.config.getConfig()
    };

    // Create and register tool executor
    this.toolExecutor = new ToolExecutorService(dependencies);
    this.registry.register('toolExecutor', this.toolExecutor);

    this.logger.info('Tool executor service initialized');
  }

  /**
   * Initialize agent manager service
   */
  private async initializeAgentManager(): Promise<void> {
    this.logger.info('Initializing agent manager service...');

    if (!this.toolExecutor) {
      throw new ServiceError(
        'Tool executor must be initialized before agent manager',
        'MISSING_DEPENDENCY',
        'CatalystServiceMain'
      );
    }

    // Create service dependencies
    const dependencies = {
      database: this.database!,
      als: this.als,
      logger: this.logger,
      config: this.config.getConfig()
    };

    // Create and register agent manager
    this.agentManager = new AgentManagerMain(dependencies, this.toolExecutor);
    this.registry.register('agentManager', this.agentManager);

    // Register default agents
    await this.registerDefaultAgents();

    this.logger.info('Agent manager service initialized');
  }

  /**
   * Initialize session service
   */
  private async initializeSessionService(): Promise<void> {
    this.logger.info('Initializing session service...');

    if (!this.database) {
      throw new ServiceError(
        'Database must be initialized before session service',
        'MISSING_DEPENDENCY',
        'CatalystServiceMain'
      );
    }

    // Create session service
    this.sessionService = new SessionServiceMain({
      database: this.database,
      logger: this.logger,
      als: this.als
    });

    // Register session service
    this.registry.register('sessionService', this.sessionService);

    this.logger.info('Session service initialized');
  }

  /**
   * Register default agents
   */
  private async registerDefaultAgents(): Promise<void> {
    this.logger.info('Registering default agents...');

    // This is a placeholder for default agent registration
    // In a full implementation, you'd load agent configurations from config files
    // and register them with the agent manager

    this.logger.info('Default agents registered');
  }

  /**
   * Register additional services
   */
  private async registerServices(): Promise<void> {
    this.logger.info('Registering additional services...');

    // Register catalyst service itself
    this.registry.register('catalystService', this);

    // Register service dependencies object for easy injection
    const dependencies: CatalystServiceDependencies = {
      database: this.database!,
      toolExecutor: this.toolExecutor!,
      agentManager: this.agentManager!,
      sessionService: this.sessionService!,
      config: this.config,
      loggerFactory: this.loggerFactory,
      logger: this.logger,
      als: this.als,
      registry: this.registry
    };

    this.registry.register('dependencies', dependencies);

    this.logger.info('Additional services registered');
  }

  /**
   * Get a registered service
   */
  getService<T>(name: string): T | undefined {
    if (!this.initialized) {
      throw new ServiceError(
        'Catalyst service has not been initialized',
        'NOT_INITIALIZED',
        'CatalystServiceMain'
      );
    }

    return this.registry.get<T>(name);
  }

  /**
   * Run a function within an execution context
   */
  async runWithContext<T>(
    sessionId: string,
    operation: string,
    fn: () => Promise<T>,
    metadata: Record<string, any> = {}
  ): Promise<T> {
    if (!this.initialized) {
      throw new ServiceError(
        'Catalyst service has not been initialized',
        'NOT_INITIALIZED',
        'CatalystServiceMain'
      );
    }

    const context = this.loggerFactory.createContext(sessionId, operation, metadata);
    return this.loggerFactory.runWithContext(context, fn);
  }

  /**
   * Get service health status
   */
  async getHealth(): Promise<ServiceHealth> {
    const services: Record<string, any> = {
      catalystService: {
        status: this.initialized ? 'healthy' : 'unhealthy',
        lastCheck: Date.now(),
        metrics: {
          initialized: this.initialized,
          disposed: this.disposed,
          registrySize: this.registry.getStats().totalServices
        }
      }
    };

    // Check database health
    if (this.database) {
      try {
        // Simple connectivity check
        await this.database.fetchOne('SELECT 1 as test');
        services.database = {
          status: 'healthy',
          lastCheck: Date.now(),
          metrics: { connected: true }
        };
      } catch (error) {
        services.database = {
          status: 'unhealthy',
          lastCheck: Date.now(),
          error: (error as Error).message,
          metrics: { connected: false }
        };
      }
    } else {
      services.database = {
        status: 'unhealthy',
        lastCheck: Date.now(),
        error: 'Database not initialized',
        metrics: { connected: false }
      };
    }

    // Check tool executor health
    if (this.toolExecutor) {
      const stats = this.toolExecutor.getStats();
      services.toolExecutor = {
        status: 'healthy',
        lastCheck: Date.now(),
        metrics: stats
      };
    } else {
      services.toolExecutor = {
        status: 'unhealthy',
        lastCheck: Date.now(),
        error: 'Tool executor not initialized',
        metrics: {}
      };
    }

    // Check agent manager health
    if (this.agentManager) {
      const stats = this.agentManager.getStats();
      services.agentManager = {
        status: 'healthy',
        lastCheck: Date.now(),
        metrics: stats
      };
    } else {
      services.agentManager = {
        status: 'unhealthy',
        lastCheck: Date.now(),
        error: 'Agent manager not initialized',
        metrics: {}
      };
    }

    // Determine overall health
    const unhealthyServices = Object.values(services).filter(s => s.status === 'unhealthy');
    const degradedServices = Object.values(services).filter(s => s.status === 'degraded');

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
    if (unhealthyServices.length > 0) {
      overallStatus = 'unhealthy';
    } else if (degradedServices.length > 0) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'healthy';
    }

    return {
      status: overallStatus,
      timestamp: Date.now(),
      services
    };
  }

  /**
   * Get service statistics
   */
  getStats(): {
    initialized: boolean;
    disposed: boolean;
    registry: any;
    config: any;
  } {
    return {
      initialized: this.initialized,
      disposed: this.disposed,
      registry: this.registry.getStats(),
      config: this.config.getConfig()
    };
  }

  /**
   * Dispose of all services and resources
   */
  async dispose(): Promise<void> {
    if (this.disposed) return;

    this.logger.info('Disposing Catalyst service main...');

    try {
      // Dispose agent manager first
      if (this.agentManager) {
        this.agentManager.dispose();
        this.agentManager = null;
      }

      // Dispose tool executor
      if (this.toolExecutor) {
        this.toolExecutor.dispose();
        this.toolExecutor = null;
      }

      // Close database connection
      if (this.database) {
        // Database cleanup would be handled by the database module
        this.database = null;
      }

      // Dispose registry
      await this.registry.dispose();

      this.disposed = true;
      this.initialized = false;

      this.logger.info('✅ Catalyst service main disposed successfully');

    } catch (error) {
      this.logger.error('Error during Catalyst service disposal', error as Error);
      throw error;
    }
  }

  /**
   * Force reinitialization (for development/testing only)
   */
  async forceReinitialize(mainWindow: BrowserWindow | null, workspacePath: string): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      throw new ServiceError(
        'Force reinitialization is not allowed in production',
        'OPERATION_NOT_ALLOWED',
        'CatalystServiceMain'
      );
    }

    this.logger.warn('Force reinitializing Catalyst service main...');

    await this.dispose();

    // Create new instances
    this.registry = new MainThreadServiceRegistry();
    this.config = ServiceConfigManager.getInstance();
    this.loggerFactory = LoggerFactory.getInstance();
    this.als = this.loggerFactory.getAsyncLocalStorage();
    this.logger = this.loggerFactory.createContextAwareLogger();

    await this.initialize(mainWindow, workspacePath);

    this.logger.info('Catalyst service main force reinitialized');
  }
}

/**
 * Global catalyst service instance
 */
let globalCatalystService: CatalystServiceMain | null = null;

/**
 * Get the global catalyst service instance
 */
export function getCatalystService(): CatalystServiceMain | null {
  return globalCatalystService;
}

/**
 * Initialize the global catalyst service
 */
export async function initializeCatalystService(
  mainWindow: BrowserWindow | null,
  workspacePath: string
): Promise<CatalystServiceMain> {
  if (globalCatalystService) {
    throw new ServiceError(
      'Catalyst service has already been initialized',
      'ALREADY_INITIALIZED',
      'CatalystServiceMain'
    );
  }

  globalCatalystService = new CatalystServiceMain();
  await globalCatalystService.initialize(mainWindow, workspacePath);

  return globalCatalystService;
}

/**
 * Dispose the global catalyst service
 */
export async function disposeCatalystService(): Promise<void> {
  if (globalCatalystService) {
    await globalCatalystService.dispose();
    globalCatalystService = null;
  }
}