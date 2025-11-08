/**
 * Tool Executor Service Tests
 *
 * Unit tests for the main thread tool executor service.
 * Tests tool registration, execution, and error handling.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ToolExecutorService, BuiltinTools } from '@/main/services/tool-executor';
import { LoggerFactory } from '@/main/services/logger';
import { ServiceConfigManager } from '@/main/services/config';
import { TestUtils, mockDatabase } from '../setup';

// Mock fs/promises to avoid import issues
const mockFs = {
  readFile: vi.fn(),
  writeFile: vi.fn(),
  exists: vi.fn(),
};

vi.mock('fs/promises', () => mockFs);

// Helper function to create mock tool request
function createMockToolRequest(toolId: string = 'test-tool', operation: string = 'test') {
  return {
    toolId,
    operation,
    parameters: { test: true },
    context: {
      id: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId: 'test-session',
      requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      operation: 'test',
      metadata: { test: true }
    }
  };
}

describe('ToolExecutorService', () => {
  let toolExecutor: ToolExecutorService;
  let mockDependencies: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Reset fs mocks to default successful behavior
    mockFs.readFile.mockResolvedValue('Default test content');
    mockFs.exists.mockResolvedValue(true);

    // Reset database mocks
    mockDatabase.fetchAll = vi.fn().mockResolvedValue([]);
    mockDatabase.fetchOne = vi.fn().mockResolvedValue(null);
    mockDatabase.executeQuery = vi.fn().mockResolvedValue([]);

    // Set up test dependencies
    const loggerFactory = LoggerFactory.getInstance();
    const logger = loggerFactory.createContextAwareLogger();
    const config = ServiceConfigManager.getInstance();
    const als = loggerFactory.getAsyncLocalStorage();

    mockDependencies = {
      database: mockDatabase,
      als,
      logger,
      config: config.getConfig()
    };

    toolExecutor = new ToolExecutorService(mockDependencies);
  });

  afterEach(() => {
    if (toolExecutor) {
      toolExecutor.dispose();
    }
  });

  describe('Tool Registration', () => {
    it('should register built-in tools on initialization', () => {
      const stats = toolExecutor.getStats();
      expect(stats.totalTools).toBeGreaterThan(0);
      expect(stats.builtinTools).toBeGreaterThan(0);
    });

    it('should register custom tools', () => {
      const customTool = {
        id: 'test-tool',
        name: 'Test Tool',
        description: 'A test tool',
        parameters: { type: 'object', properties: {} },
        handler: async () => ({ success: true, data: 'test' }),
        requiredDatabase: false,
        permissions: []
      };

      toolExecutor.registerTool(customTool);

      const stats = toolExecutor.getStats();
      expect(stats.customTools).toBe(1);
      expect(toolExecutor.getTool('test-tool')).toBeDefined();
    });

    it('should throw error when registering duplicate tool', () => {
      const tool = {
        id: 'database-query', // Use existing tool ID
        name: 'Duplicate Tool',
        description: 'A duplicate tool',
        parameters: { type: 'object', properties: {} },
        handler: async () => ({ success: true }),
        requiredDatabase: false,
        permissions: []
      };

      expect(() => toolExecutor.registerTool(tool)).toThrow('already registered');
    });
  });

  describe('Tool Execution', () => {
    it('should execute file-read tool successfully', async () => {
      // Mock successful file read
      mockFs.readFile.mockResolvedValue('Test file content');
      mockFs.exists.mockResolvedValue(true);

      const request = createMockToolRequest('file-read', 'read');
      request.parameters = { path: './test-file.txt' };

      const result = await toolExecutor.executeTool(request);

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('content');
      expect(result.data.content).toBe('Test file content');
      expect(result.data).toHaveProperty('path');
      expect(result.executionTime).toBeGreaterThan(0);
    });

    it('should execute database-query tool successfully', async () => {
      const request = createMockToolRequest('database-query', 'select');
      request.parameters = {
        query: 'SELECT 1 as test',
        params: [],
        operation: 'select'
      };

      // Mock database to return a result
      mockDatabase.fetchAll = vi.fn().mockResolvedValue([{ test: 1 }]);
      mockDatabase.fetchOne = vi.fn().mockResolvedValue(null);

      const result = await toolExecutor.executeTool(request);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([{ test: 1 }]);
      expect(result.metadata).toHaveProperty('operation', 'select');
    });

    it('should handle tool execution errors gracefully', async () => {
      const request = createMockToolRequest('file-read', 'read');
      request.parameters = { path: '/nonexistent/path' }; // Security violation

      const result = await toolExecutor.executeTool(request);

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toContain('outside project directory');
    });

    it('should throw error for non-existent tool', async () => {
      const request = createMockToolRequest('non-existent-tool', 'test');

      await expect(toolExecutor.executeTool(request)).rejects.toThrow('not found');
    });

    it('should execute multiple tools in parallel', async () => {
      // Mock successful file reads
      mockFs.readFile
        .mockResolvedValueOnce('Test content 1')
        .mockResolvedValueOnce('Test content 2');
      mockFs.exists.mockResolvedValue(true);

      const requests = [
        createMockToolRequest('file-read', 'read'),
        createMockToolRequest('file-read', 'read')
      ];

      requests[0].parameters = { path: './test1.txt' };
      requests[1].parameters = { path: './test2.txt' };

      const results = await toolExecutor.executeTools(requests);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      expect(results[0].data.content).toBe('Test content 1');
      expect(results[1].data.content).toBe('Test content 2');
    });
  });

  describe('Tool Management', () => {
    it('should unregister tools', () => {
      const customTool = {
        id: 'temp-tool',
        name: 'Temporary Tool',
        description: 'A temporary tool',
        parameters: { type: 'object', properties: {} },
        handler: async () => ({ success: true }),
        requiredDatabase: false,
        permissions: []
      };

      toolExecutor.registerTool(customTool);
      expect(toolExecutor.getTool('temp-tool')).toBeDefined();

      toolExecutor.unregisterTool('temp-tool');
      expect(toolExecutor.getTool('temp-tool')).toBeUndefined();
    });

    it('should provide tool statistics', () => {
      const stats = toolExecutor.getStats();

      expect(stats).toHaveProperty('totalTools');
      expect(stats).toHaveProperty('builtinTools');
      expect(stats).toHaveProperty('customTools');
      expect(stats).toHaveProperty('tools');
      expect(Array.isArray(stats.tools)).toBe(true);

      // Check that each tool has required properties
      stats.tools.forEach(tool => {
        expect(tool).toHaveProperty('id');
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('requiredDatabase');
      });
    });
  });

  describe('Built-in Tools', () => {
    it('should have all required built-in tools', () => {
      const builtins = BuiltinTools.getAll();
      const toolIds = builtins.map(tool => tool.id);

      expect(toolIds).toContain('database-query');
      expect(toolIds).toContain('file-read');
      expect(toolIds).toContain('file-write');
      expect(toolIds).toContain('list-concepts');
    });

    it('should validate built-in tool definitions', () => {
      const builtins = BuiltinTools.getAll();

      builtins.forEach(tool => {
        expect(tool).toHaveProperty('id');
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('parameters');
        expect(tool).toHaveProperty('handler');
        expect(tool).toHaveProperty('permissions');
        expect(typeof tool.handler).toBe('function');
      });
    });
  });

  describe('Security and Permissions', () => {
    it('should validate file paths for security', async () => {
      const request = createMockToolRequest('file-read', 'read');
      request.parameters = { path: '../../../etc/passwd' }; // Path traversal attempt

      const result = await toolExecutor.executeTool(request);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('outside project directory');
    });

    it('should check database requirements', async () => {
      // Create tool executor without database
      const noDbDependencies = { ...mockDependencies, database: null };
      const noDbExecutor = new ToolExecutorService(noDbDependencies);

      const request = createMockToolRequest('database-query', 'select');

      await expect(noDbExecutor.executeTool(request)).rejects.toThrow('requires database access');

      noDbExecutor.dispose();
    });
  });
});