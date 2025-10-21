/**
 * Database Factory
 *
 * Creates appropriate database implementation based on environment
 */

import { LocalDatabaseModule } from './local-database-module';

export interface IDatabase {
  initialize(): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  cleanup(): Promise<void>;
  healthCheck(): Promise<DatabaseHealthStatus>;
  getResourceUsage(): Promise<ResourceUsage>;
  prepare<T = any>(sql: string): any;
  all<T = any>(sql: string, params?: any[]): T[];
  get<T = any>(sql: string, params?: any[]): T | undefined;
  run(sql: string, params?: any[]): any;
  transaction<T>(fn: () => T): T;
  tableExists(tableName: string): Promise<boolean>;
  getTableSchema(tableName: string): Promise<any[]>;
  query(sql: string, params?: any[]): Promise<any[]>;
  runCommand(sql: string, params?: any[]): Promise<any>;
  getDatabaseStats(): Promise<any>;
  // Concept CRUD methods
  createConcept(concept: any): Promise<string>;
  getConcept(id: string): Promise<any | null>;
  updateConcept(id: string, updates: any): Promise<boolean>;
  deleteConcept(id: string): Promise<boolean>;
}

export interface DatabaseHealthStatus {
  status: 'healthy' | 'degraded' | 'failed' | 'initializing' | 'disabled';
  lastCheck: Date;
  message?: string;
  metrics?: Record<string, any>;
}

export interface ResourceUsage {
  memory: {
    used: number;
    allocated: number;
    peak: number;
  };
  cpu: {
    usage: number;
    time: number;
  };
  connections: {
    active: number;
    total: number;
  };
  storage: {
    used: number;
    allocated: number;
  };
}

// Simple mock implementation for renderer
class MockDatabase implements IDatabase {
  private isInitialized = false;
  private healthStatus: DatabaseHealthStatus = {
    status: 'healthy',
    lastCheck: new Date(),
    message: 'Mock database ready',
  };

  constructor() {}

  async initialize(): Promise<void> {
    console.log('Initializing Mock Database...');
    this.isInitialized = true;
    this.healthStatus = {
      status: 'healthy',
      lastCheck: new Date(),
      message: 'Mock database initialized successfully',
    };
  }

  async start(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Database must be initialized before starting');
    }
    console.log('Mock Database started');
  }

  async stop(): Promise<void> {
    console.log('Mock Database stopped');
  }

  async cleanup(): Promise<void> {
    console.log('Mock Database cleaned up');
  }

  async healthCheck(): Promise<DatabaseHealthStatus> {
    this.healthStatus.lastCheck = new Date();
    return this.healthStatus;
  }

  async getResourceUsage(): Promise<ResourceUsage> {
    return {
      memory: { used: 0, allocated: 0, peak: 0 },
      cpu: { usage: 0, time: 0 },
      connections: { active: 0, total: 0 },
      storage: { used: 0, allocated: 0 },
    };
  }

  prepare<T = any>(sql: string): any {
    console.log(`Mock DB: prepare - ${sql}`);
    return {
      bind: (...params: any[]) => this,
      run: (...params: any[]) => ({ changes: 1, lastInsertRowid: 1 }),
      get: (...params: any[]) => null,
      all: (...params: any[]) => [],
      iterate: (...params: any[]) => [][Symbol.iterator]()
    };
  }

  all<T = any>(sql: string, params: any[] = []): T[] {
    console.log(`Mock DB: all - ${sql}`, params);
    return [];
  }

  get<T = any>(sql: string, params: any[] = []): T | undefined {
    console.log(`Mock DB: get - ${sql}`, params);
    return undefined;
  }

  run(sql: string, params: any[] = []): any {
    console.log(`Mock DB: run - ${sql}`, params);
    return { changes: 1, lastInsertRowid: 1 };
  }

  transaction<T>(fn: () => T): T {
    console.log('Mock DB: transaction');
    return fn();
  }

  async tableExists(tableName: string): Promise<boolean> {
    console.log(`Mock DB: tableExists - ${tableName}`);
    return true;
  }

  async getTableSchema(tableName: string): Promise<any[]> {
    console.log(`Mock DB: getTableSchema - ${tableName}`);
    return [];
  }

  // Concept CRUD methods
  async createConcept(concept: any): Promise<string> {
    console.log(`Mock DB: createConcept - ${concept.name}`);
    return `mock_${Date.now()}`;
  }

  async getConcept(id: string): Promise<any | null> {
    console.log(`Mock DB: getConcept - ${id}`);
    return null;
  }

  async updateConcept(id: string, updates: any): Promise<boolean> {
    console.log(`Mock DB: updateConcept - ${id}`);
    return true;
  }

  async deleteConcept(id: string): Promise<boolean> {
    console.log(`Mock DB: deleteConcept - ${id}`);
    return true;
  }

  async query(sql: string, params: any[] = []): Promise<any[]> {
    console.log(`Mock DB: query - ${sql}`, params);
    return [];
  }

  async runCommand(sql: string, params: any[] = []): Promise<any> {
    console.log(`Mock DB: runCommand - ${sql}`, params);
    return { changes: 1, lastInsertRowid: 1 };
  }

  async getDatabaseStats(): Promise<any> {
    console.log('Mock DB: getDatabaseStats');
    return {
      tables: {},
      totalSize: 0,
      pageCount: 0,
      pageSize: 0,
      version: '3.0.0',
    };
  }
}

// Factory function
export function createDatabase(): IDatabase {
  // Check if we're in Electron renderer process
  const isElectron = typeof window !== 'undefined' && window.electronAPI;

  if (isElectron) {
    console.log('Creating real database for Electron renderer');
    // Always use real database in Electron - no fallback to mock
    return new LocalDatabaseModule();
  } else {
    console.log('Creating mock database for browser environment');
    return new MockDatabase();
  }
}

export default createDatabase;