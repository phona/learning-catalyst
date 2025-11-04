/**
 * Tool Executor Service Tests
 *
 * Unit tests for the main thread tool executor service.
 * Tests tool registration, execution, and error handling.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ToolExecutorService, BuiltinTools } from '../../../electron/main/services/tool-executor';
import { LoggerFactory } from '../../../electron/main/services/logger';
import { ServiceConfigManager } from '../../../electron/main/services/config';
import { TestUtils, mockDatabase } from '../setup';

describe('ToolExecutorService', () => {
  let toolExecutor: ToolExecutorService;
  let mockDependencies: any;

  beforeEach(() => {
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
      const request = TestUtils.createMockToolRequest('file-read', 'read');
      request.parameters = { path: './test-file.txt' };

      const result = await toolExecutor.executeTool(request);

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('content');
      expect(result.data).toHaveProperty('path');
      expect(result.executionTime).toBeGreaterThan(0);
    });

    it('should execute database-query tool successfully', async () => {
      const request = TestUtils.createMockToolRequest('database-query', 'select');
      request.parameters = {
        query: 'SELECT 1 as test',
        params: [],
        operation: 'select'
      };

      // Mock database to return a result
      mockDatabase.fetchAll = async () => [{ test: 1 }];

      const result = await toolExecutor.executeTool(request);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([{ test: 1 }]);
      expect(result.metadata).toHaveProperty('operation', 'select');
    });

    it('should handle tool execution errors gracefully', async () => {
      const request = TestUtils.createMockToolRequest('file-read', 'read');
      request.parameters = { path: '/nonexistent/path' };

      // Mock file system to throw error
      const originalFs = require('fs/promises');
      require('fs/promises').readFile = async () => {
        throw new Error('File not found');
      };

      const result = await toolExecutor.executeTool(request);

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toContain('File not found');

      // Restore original fs
      require('fs/promises').readFile = originalFs.readFile;
    });

    it('should throw error for non-existent tool', async () => {
      const request = TestUtils.createMockToolRequest('non-existent-tool', 'test');

      await expect(toolExecutor.executeTool(request)).rejects.toThrow('not found');
    });

    it('should execute multiple tools in parallel', async () => {
      const requests = [
        TestUtils.createMockToolRequest('file-read', 'read'),
        TestUtils.createMockToolRequest('file-read', 'read')
      ];

      requests[0].parameters = { path: './test1.txt' };
      requests[1].parameters = { path: './test2.txt' };

      const results = await toolExecutor.executeTools(requests);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
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
      const request = TestUtils.createMockToolRequest('file-read', 'read');
      request.parameters = { path: '../../../etc/passwd' }; // Path traversal attempt

      const result = await toolExecutor.executeTool(request);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('outside project directory');
    });

    it('should check database requirements', async () => {
      // Create tool executor without database
      const noDbDependencies = { ...mockDependencies, database: null };
      const noDbExecutor = new ToolExecutorService(noDbDependencies);

      const request = TestUtils.createMockToolRequest('database-query', 'select');

      await expect(noDbExecutor.executeTool(request)).rejects.toThrow('requires database access');

      noDbExecutor.dispose();
    });
  });
});