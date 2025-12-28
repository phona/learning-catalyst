/**
 * Test Database Factory
 *
 * Factory for creating in-memory databases for testing purposes.
 * Provides isolated database instances with mock data and
 * supports multiple test scenarios with clean setup/teardown.
 */

import { vi } from 'vitest';
import { DatabaseMocks } from '../mocks/mock-database';

// Test data factories
export const createTestSession = (overrides?: any) => ({
  id: Math.floor(Math.random() * 1000) + 1,
  title: 'Test Session',
  messages: JSON.stringify([
    { role: 'user', content: 'Hello', timestamp: Date.now() - 60000 },
    { role: 'assistant', content: 'Hi there!', timestamp: Date.now() - 55000 },
  ]),
  created_at: Date.now() - 300000,
  updated_at: Date.now() - 60000,
  metadata: JSON.stringify({ test: true }),
  ...overrides,
});

export const createTestConcept = (overrides?: any) => ({
  id: Math.floor(Math.random() * 1000) + 1,
  name: 'Test Concept',
  description: 'A test concept for unit testing',
  metadata: JSON.stringify({
    difficulty: 'intermediate',
    category: 'testing',
    tags: ['test', 'concept'],
  }),
  created_at: Date.now() - 86400000,
  ...overrides,
});

export const createTestAnalytics = (overrides?: any) => ({
  id: Math.floor(Math.random() * 1000) + 1,
  session_id: 1,
  tokens_used: 150,
  response_time: 2500,
  model_used: 'gpt-3.5-turbo',
  timestamp: Date.now() - 3600000,
  metadata: JSON.stringify({ test: true }),
  ...overrides,
});

export const createTestCheckpoint = (overrides?: any) => ({
  id: Math.floor(Math.random() * 1000) + 1,
  thread_id: 'test-thread-' + Date.now(),
  checkpoint_id: 'checkpoint-' + Date.now(),
  checkpoint: JSON.stringify({
    step: 1,
    data: { test: 'data' },
    metadata: { version: '1.0' },
  }),
  metadata: JSON.stringify({ test: true }),
  created_at: Date.now() - 1800000,
  ...overrides,
});

// In-memory database factory
export class TestDatabaseFactory {
  private static readonly instances = new Map<string, any>();
  private static testCounter = 0;

  /**
   * Create a new test database instance with mock data
   */
  static async createTestDatabase(
    options: {
      name?: string;
      withData?: boolean;
      customData?: any;
    } = {},
  ): Promise<any> {
    const { name = `test-db-${++this.testCounter}`, withData = true, customData = {} } = options;

    // Check if instance already exists
    if (this.instances.has(name)) {
      return this.instances.get(name);
    }

    // Create new database instance
    const database = {
      ...DatabaseMocks.Database,
      name,
      data: {
        sessions: [],
        concepts: [],
        analytics: [],
        checkpoints: [],
        ...customData,
      },
      _internalData: {
        nextIds: {
          sessions: 1,
          concepts: 1,
          analytics: 1,
          checkpoints: 1,
        },
      },
    };

    // Override mock methods to use in-memory data
    this._configureDatabaseMethods(database);

    // Add mock data if requested
    if (withData) {
      await TestDatabaseFactory._populateTestData(database);
    }

    // Store instance
    this.instances.set(name, database);

    return database;
  }

  /**
   * Get existing test database instance
   */
  static getTestDatabase(name: string): any | null {
    return this.instances.get(name) || null;
  }

  /**
   * Drop test database instance
   */
  static async dropTestDatabase(name: string): Promise<void> {
    const database = this.instances.get(name);
    if (database) {
      await database.close();
      this.instances.delete(name);
    }
  }

  /**
   * Drop all test database instances
   */
  static async dropAllTestDatabases(): Promise<void> {
    const dropPromises = Array.from(this.instances.keys()).map((name) =>
      this.dropTestDatabase(name),
    );
    await Promise.all(dropPromises);
    this.testCounter = 0;
  }

  /**
   * Reset test database data (keep structure, clear data)
   */
  static async resetTestDatabase(name: string): Promise<void> {
    const database = this.instances.get(name);
    if (database) {
      database.data = {
        sessions: [],
        concepts: [],
        analytics: [],
        checkpoints: [],
      };
      database._internalData.nextIds = {
        sessions: 1,
        concepts: 1,
        analytics: 1,
        checkpoints: 1,
      };

      // Clear mock history
      database._resetMocks();
    }
  }

  /**
   * Populate database with test data
   */
  static async populateTestData(
    name: string,
    dataOptions?: {
      sessions?: number;
      concepts?: number;
      analytics?: number;
      checkpoints?: number;
    },
  ): Promise<void> {
    const database = this.instances.get(name);
    if (!database) {
      throw new Error(`Test database '${name}' not found`);
    }

    const { sessions = 3, concepts = 5, analytics = 10, checkpoints = 2 } = dataOptions || {};

    // Add test sessions
    for (let i = 0; i < sessions; i++) {
      const session = createTestSession({
        id: database._internalData.nextIds.sessions++,
        title: `Test Session ${i + 1}`,
      });
      database.data.sessions.push(session);
    }

    // Add test concepts
    for (let i = 0; i < concepts; i++) {
      const concept = createTestConcept({
        id: database._internalData.nextIds.concepts++,
        name: `Test Concept ${i + 1}`,
        description: `Description for test concept ${i + 1}`,
      });
      database.data.concepts.push(concept);
    }

    // Add test analytics
    for (let i = 0; i < analytics; i++) {
      const analyticsEntry = createTestAnalytics({
        id: database._internalData.nextIds.analytics++,
        session_id: Math.floor(Math.random() * sessions) + 1,
        tokens_used: 100 + Math.floor(Math.random() * 200),
        response_time: 1000 + Math.floor(Math.random() * 4000),
      });
      database.data.analytics.push(analyticsEntry);
    }

    // Add test checkpoints
    for (let i = 0; i < checkpoints; i++) {
      const checkpoint = createTestCheckpoint({
        id: database._internalData.nextIds.checkpoints++,
        thread_id: `test-thread-${i + 1}`,
      });
      database.data.checkpoints.push(checkpoint);
    }
  }

  /**
   * Configure database methods to use in-memory data
   */
  private static _configureDatabaseMethods(database: any): void {
    // Override fetchOne to use in-memory data
    database.fetchOne = vi.fn().mockImplementation(async (query: string, params?: any[]) => {
      await new Promise((resolve) => setTimeout(resolve, 5)); // Simulate async

      // Handle different query patterns
      if (query.includes('SELECT 1')) {
        return { test: 1 };
      }

      if (query.includes('sessions') && query.includes('WHERE id =')) {
        const id = this._extractIdFromQuery(query, params);
        return database.data.sessions.find((s: any) => s.id === id) || null;
      }

      if (query.includes('concepts') && query.includes('WHERE id =')) {
        const id = this._extractIdFromQuery(query, params);
        return database.data.concepts.find((c: any) => c.id === id) || null;
      }

      if (query.includes('analytics') && query.includes('WHERE session_id =')) {
        const sessionId = this._extractIdFromQuery(query, params);
        return database.data.analytics.find((a: any) => a.session_id === sessionId) || null;
      }

      return null;
    });

    // Override fetchAll to use in-memory data
    database.fetchAll = vi.fn().mockImplementation(async (query: string, params?: any[]) => {
      await new Promise((resolve) => setTimeout(resolve, 10));

      if (query.includes('sessions')) {
        if (query.includes('WHERE')) {
          // Handle filtered queries
          return database.data.sessions.filter((session: any) => {
            // Simple mock filtering - in real implementation would parse SQL
            return true;
          });
        }
        return database.data.sessions;
      }

      if (query.includes('concepts')) {
        return database.data.concepts;
      }

      if (query.includes('analytics')) {
        if (query.includes('WHERE session_id =')) {
          const sessionId = this._extractIdFromQuery(query, params);
          return database.data.analytics.filter((a: any) => a.session_id === sessionId);
        }
        return database.data.analytics;
      }

      if (query.includes('checkpoints')) {
        return database.data.checkpoints;
      }

      return [];
    });

    // Override executeQuery to use in-memory data
    database.executeQuery = vi.fn().mockImplementation(async (query: string, params?: any[]) => {
      await new Promise((resolve) => setTimeout(resolve, 15));

      // Handle INSERT operations
      if (query.includes('INSERT INTO sessions')) {
        const newSession = createTestSession({
          id: database._internalData.nextIds.sessions++,
          ...this._extractInsertData(query, params),
        });
        database.data.sessions.push(newSession);
        return { insertId: newSession.id, affectedRows: 1 };
      }

      if (query.includes('INSERT INTO concepts')) {
        const newConcept = createTestConcept({
          id: database._internalData.nextIds.concepts++,
          ...this._extractInsertData(query, params),
        });
        database.data.concepts.push(newConcept);
        return { insertId: newConcept.id, affectedRows: 1 };
      }

      if (query.includes('INSERT INTO analytics')) {
        const newAnalytics = createTestAnalytics({
          id: database._internalData.nextIds.analytics++,
          ...this._extractInsertData(query, params),
        });
        database.data.analytics.push(newAnalytics);
        return { insertId: newAnalytics.id, affectedRows: 1 };
      }

      // Handle UPDATE operations
      if (query.includes('UPDATE sessions')) {
        const id = this._extractIdFromQuery(query, params);
        const index = database.data.sessions.findIndex((s: any) => s.id === id);
        if (index !== -1) {
          const updateData = this._extractUpdateData(query, params);
          database.data.sessions[index] = { ...database.data.sessions[index], ...updateData };
          return { affectedRows: 1 };
        }
        return { affectedRows: 0 };
      }

      // Handle DELETE operations
      if (query.includes('DELETE FROM sessions')) {
        const id = this._extractIdFromQuery(query, params);
        const initialLength = database.data.sessions.length;
        database.data.sessions = database.data.sessions.filter((s: any) => s.id !== id);
        return { affectedRows: initialLength - database.data.sessions.length };
      }

      return { success: true };
    });
  }

  /**
   * Extract ID from SQL query (simplified mock implementation)
   */
  private static _extractIdFromQuery(query: string, params?: any[]): number {
    // Try to extract from parameters first
    if (params && params.length > 0) {
      return parseInt(params[0]) || 1;
    }

    // Fallback to regex extraction from query
    const match = query.match(/WHERE\s+id\s*=\s*(\d+)/i);
    if (match) {
      return parseInt(match[1]);
    }

    // Default fallback
    return 1;
  }

  /**
   * Extract data from INSERT query (simplified mock implementation)
   */
  private static _extractInsertData(query: string, params?: any[]): any {
    // Mock implementation - in reality would parse SQL properly
    return {
      title: 'Test Session',
      messages: '[]',
      created_at: Date.now(),
      updated_at: Date.now(),
    };
  }

  /**
   * Extract data from UPDATE query (simplified mock implementation)
   */
  private static _extractUpdateData(query: string, params?: any[]): any {
    // Mock implementation - in reality would parse SQL properly
    return {
      updated_at: Date.now(),
    };
  }

  /**
   * Populate initial test data
   */
  private static async _populateTestData(database: any): Promise<void> {
    const { sessions = 3, concepts = 5, analytics = 10, checkpoints = 2 } = {};

    // Add test sessions
    for (let i = 0; i < sessions; i++) {
      const session = createTestSession({
        id: database._internalData.nextIds.sessions++,
        title: `Test Session ${i + 1}`,
      });
      database.data.sessions.push(session);
    }

    // Add test concepts
    for (let i = 0; i < concepts; i++) {
      const concept = createTestConcept({
        id: database._internalData.nextIds.concepts++,
        name: `Test Concept ${i + 1}`,
        description: `Description for test concept ${i + 1}`,
      });
      database.data.concepts.push(concept);
    }

    // Add test analytics
    for (let i = 0; i < analytics; i++) {
      const analyticsEntry = createTestAnalytics({
        id: database._internalData.nextIds.analytics++,
        session_id: Math.floor(Math.random() * sessions) + 1,
        tokens_used: 100 + Math.floor(Math.random() * 200),
        response_time: 1000 + Math.floor(Math.random() * 4000),
      });
      database.data.analytics.push(analyticsEntry);
    }

    // Add test checkpoints
    for (let i = 0; i < checkpoints; i++) {
      const checkpoint = createTestCheckpoint({
        id: database._internalData.nextIds.checkpoints++,
        thread_id: `test-thread-${i + 1}`,
      });
      database.data.checkpoints.push(checkpoint);
    }
  }

  /**
   * Get database statistics for testing
   */
  static getDatabaseStats(name: string): any {
    const database = this.instances.get(name);
    if (!database) {
      throw new Error(`Test database '${name}' not found`);
    }

    return {
      name: database.name,
      tables: {
        sessions: database.data.sessions.length,
        concepts: database.data.concepts.length,
        analytics: database.data.analytics.length,
        checkpoints: database.data.checkpoints.length,
      },
      nextIds: { ...database._internalData.nextIds },
      connected: database.connected,
      closed: database.closed,
    };
  }

  /**
   * Export database data for testing
   */
  static exportDatabaseData(name: string): any {
    const database = this.instances.get(name);
    if (!database) {
      throw new Error(`Test database '${name}' not found`);
    }

    return JSON.parse(JSON.stringify(database.data));
  }

  /**
   * Import database data for testing
   */
  static async importDatabaseData(name: string, data?: unknown): Promise<void> {
    const database = this.instances.get(name);
    if (!database) {
      throw new Error(`Test database '${name}' not found`);
    }

    database.data = JSON.parse(JSON.stringify(data));

    // Update next IDs based on imported data
    database._internalData.nextIds = {
      sessions: Math.max(...database.data.sessions.map((s: any) => s.id), 0) + 1,
      concepts: Math.max(...database.data.concepts.map((c: any) => c.id), 0) + 1,
      analytics: Math.max(...database.data.analytics.map((a: any) => a.id), 0) + 1,
      checkpoints: Math.max(...database.data.checkpoints.map((cp: any) => cp.id), 0) + 1,
    };
  }

  /**
   * Create database factory for specific test scenarios
   */
  static createScenario(scenario: 'empty' | 'minimal' | 'full' | 'corrupted'): any {
    switch (scenario) {
    case 'empty':
      return this.createTestDatabase({ withData: false });

    case 'minimal':
      return this.createTestDatabase({
        withData: true,
        customData: {
          sessions: [createTestSession({ id: 1, title: 'Minimal Session' })],
          concepts: [createTestConcept({ id: 1, name: 'Minimal Concept' })],
        },
      });

    case 'full':
      return this.createTestDatabase({
        withData: true,
      }).then((db) => {
        return this.populateTestData(db.name, {
          sessions: 10,
          concepts: 20,
          analytics: 50,
          checkpoints: 10,
        }).then(() => db);
      });

    case 'corrupted':
      return this.createTestDatabase({
        withData: true,
        customData: {
          sessions: [createTestSession({ id: 1, messages: 'invalid-json' })],
          concepts: [createTestConcept({ id: 1, metadata: null })],
        },
      });

    default:
      throw new Error(`Unknown scenario: ${scenario}`);
    }
  }
}

// Export convenience functions
export const createTestDB = TestDatabaseFactory.createTestDatabase;
export const getTestDB = TestDatabaseFactory.getTestDatabase;
export const dropTestDB = TestDatabaseFactory.dropTestDatabase;
export const resetTestDB = TestDatabaseFactory.resetTestDatabase;
export const createTestScenario = TestDatabaseFactory.createScenario;

// Export factory class
export default TestDatabaseFactory;
