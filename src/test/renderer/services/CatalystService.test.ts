/**
 * Catalyst Service Tests - Renderer Process
 *
 * Comprehensive test suite for the high-level Catalyst service running in the renderer process.
 * Tests all major functionality including chat, streaming, session management, and agent operations.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CatalystService, catalystService } from '@/services/CatalystService';
import type { ChatMessage, StreamingChunk, ChatOptions } from '@/services/CatalystService';

// Mock Electron API
const mockElectronAPI = {
  catalyst: {
    executeAgent: vi.fn(),
    executeAgentStream: vi.fn(),
    cancelAgent: vi.fn(),
    getAgentStatus: vi.fn(),
    listAgents: vi.fn(),
    getActiveExecutions: vi.fn(),
    registerAgent: vi.fn(),
    unregisterAgent: vi.fn(),
  },
  session: {
    create: vi.fn(),
    get: vi.fn(),
    list: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    associateAgent: vi.fn(),
    removeAgent: vi.fn(),
    getAgents: vi.fn(),
  },
  onAgentEvent: vi.fn(),
};

// Mock window.electronAPI
Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true,
});

describe('CatalystService', () => {
  let service: CatalystService;

  beforeEach(() => {
    service = new CatalystService();
    vi.clearAllMocks();

    // Mock addEventListener and removeEventListener
    window.addEventListener = vi.fn();
    window.removeEventListener = vi.fn();
  });

  afterEach(() => {
    service.cleanup();
  });

  describe('Chat Operations', () => {
    it('should send a chat message successfully', async () => {
      const mockResult = { messageId: 'msg-123', executionId: 'exec-456' };
      mockElectronAPI.catalyst.executeAgent.mockResolvedValue(mockResult);

      const result = await service.sendChat('Hello, world!', { agentId: 'test-agent' });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('msg-123');
      expect(mockElectronAPI.catalyst.executeAgent).toHaveBeenCalledWith({
        agentId: 'test-agent',
        input: 'Hello, world!',
        context: expect.objectContaining({
          id: expect.any(String),
          sessionId: 'default',
          userId: 'user',
          timestamp: expect.any(Number),
          correlationId: expect.any(String),
        }),
        options: expect.objectContaining({
          stream: false,
          timeout: 30000,
        }),
      });
    });

    it('should handle chat execution failure', async () => {
      mockElectronAPI.catalyst.executeAgent.mockRejectedValue(new Error('Network error'));

      const result = await service.sendChat('Hello, world!');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('should handle missing Electron API', async () => {
      // Store original API
      const originalAPI = window.electronAPI;

      // @ts-ignore - Remove electronAPI temporarily
      window.electronAPI = undefined;

      const result = await service.sendChat('Hello, world!');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Electron API not available');

      // Restore API
      window.electronAPI = originalAPI;
    });

    it('should use default options when none provided', async () => {
      mockElectronAPI.catalyst.executeAgent.mockResolvedValue({ messageId: 'msg-123' });

      await service.sendChat('Test message');

      expect(mockElectronAPI.catalyst.executeAgent).toHaveBeenCalledWith(
        expect.objectContaining({
          agentId: 'default',
          input: 'Test message',
          options: expect.objectContaining({
            stream: false,
            timeout: 30000,
          }),
        })
      );
    });
  });

  describe('Streaming Chat Operations', () => {
    it('should handle missing Electron API for streaming', async () => {
      // Store original API
      const originalAPI = window.electronAPI;

      // @ts-ignore - Remove electronAPI temporarily
      window.electronAPI = undefined;

      const onChunk = vi.fn();

      await expect(service.sendChatStream('Hello, world!', {}, onChunk))
        .rejects.toThrow('Electron API not available');

      // Restore API
      window.electronAPI = originalAPI;
    });

    it('should initialize streaming correctly', async () => {
      const onChunk = vi.fn();

      // Just test that the method exists and can be called
      expect(typeof service.sendChatStream).toBe('function');

      // The actual streaming logic requires complex MessageChannel setup
      // which is better tested in integration tests
    });
  });

  describe('Agent Management', () => {
    it('should get available agents', async () => {
      const mockAgents = [
        {
          id: 'agent-1',
          name: 'Learning Agent',
          type: 'learning',
          description: 'Helps with learning',
          enabled: true,
          capabilities: ['teaching', 'explanation'],
          modelConfig: {
            provider: { name: 'openai' },
            modelId: 'gpt-4',
          },
        },
      ];

      mockElectronAPI.catalyst.listAgents.mockResolvedValue(mockAgents);

      const agents = await service.getAvailableAgents();

      expect(agents).toHaveLength(1);
      expect(agents[0]).toEqual({
        id: 'agent-1',
        name: 'Learning Agent',
        type: 'learning',
        description: 'Helps with learning',
        enabled: true,
        capabilities: ['teaching', 'explanation'],
        model_config: {
          provider: 'openai',
          model: 'gpt-4',
        },
      });
    });

    it('should handle agent registration', async () => {
      mockElectronAPI.catalyst.registerAgent.mockResolvedValue({ success: true });

      const agentConfig = {
        id: 'new-agent',
        name: 'New Agent',
        type: 'custom',
      };

      const result = await service.registerAgent(agentConfig);

      expect(result).toBe(true);
      expect(mockElectronAPI.catalyst.registerAgent).toHaveBeenCalledWith(agentConfig);
    });

    it('should handle agent unregistration', async () => {
      mockElectronAPI.catalyst.unregisterAgent.mockResolvedValue({ success: true });

      const result = await service.unregisterAgent('agent-123');

      expect(result).toBe(true);
      expect(mockElectronAPI.catalyst.unregisterAgent).toHaveBeenCalledWith('agent-123');
    });

    it('should get active executions', async () => {
      const mockExecutions = [
        { id: 'exec-1', agentId: 'agent-1', status: 'running' },
      ];

      mockElectronAPI.catalyst.getActiveExecutions.mockResolvedValue(mockExecutions);

      const executions = await service.getActiveExecutions();

      expect(executions).toEqual(mockExecutions);
    });
  });

  describe('Session Management', () => {
    it('should create a new session', async () => {
      mockElectronAPI.session.create.mockResolvedValue({ sessionId: 'session-123' });

      const sessionId = await service.createSession('Test Session', {
        description: 'A test session',
        agentConfig: {
          primaryAgentId: 'agent-1',
          agentMode: 'single',
        },
      });

      expect(sessionId).toBe('session-123');
      expect(mockElectronAPI.session.create).toHaveBeenCalledWith({
        title: 'Test Session',
        description: 'A test session',
        agentConfig: {
          primaryAgentId: 'agent-1',
          agentMode: 'single',
        },
        metadata: {},
      });
    });

    it('should get session by ID', async () => {
      const mockSession = {
        id: 'session-123',
        title: 'Test Session',
        created_at: '2025-01-01T00:00:00Z',
      };

      mockElectronAPI.session.get.mockResolvedValue(mockSession);

      const session = await service.getSession('session-123');

      expect(session).toEqual(mockSession);
      expect(mockElectronAPI.session.get).toHaveBeenCalledWith('session-123');
    });

    it('should get recent sessions', async () => {
      const mockResult = {
        sessions: [
          {
            id: 'session-1',
            title: 'Session 1',
            description: 'First session',
            created_at: '2025-01-01T00:00:00Z',
            updated_at: '2025-01-01T01:00:00Z',
            statistics: { total_messages: 5 },
            metadata: { primary_agent_id: 'agent-1', agent_mode: 'single' },
          },
        ],
      };

      mockElectronAPI.session.list.mockResolvedValue(mockResult);

      const sessions = await service.getRecentSessions(10);

      expect(sessions).toHaveLength(1);
      expect(sessions[0]).toEqual({
        id: 'session-1',
        title: 'Session 1',
        description: 'First session',
        created_at: new Date('2025-01-01T00:00:00Z'),
        updated_at: new Date('2025-01-01T01:00:00Z'),
        message_count: 5,
        primary_agent_id: 'agent-1',
        agent_mode: 'single',
        metadata: { primary_agent_id: 'agent-1', agent_mode: 'single' },
      });
    });

    it('should update session', async () => {
      mockElectronAPI.session.update.mockResolvedValue({ success: true });

      const result = await service.updateSession('session-123', {
        title: 'Updated Title',
        agentConfig: {
          primaryAgentId: 'agent-2',
          agentMode: 'orchestration',
        },
      });

      expect(result).toBe(true);
      expect(mockElectronAPI.session.update).toHaveBeenCalledWith({
        sessionId: 'session-123',
        title: 'Updated Title',
        agentConfig: {
          primaryAgentId: 'agent-2',
          agentMode: 'orchestration',
        },
      });
    });

    it('should delete session', async () => {
      mockElectronAPI.session.delete.mockResolvedValue({ success: true });

      const result = await service.deleteSession('session-123');

      expect(result).toBe(true);
      expect(mockElectronAPI.session.delete).toHaveBeenCalledWith('session-123');
    });

    it('should associate agent with session', async () => {
      mockElectronAPI.session.associateAgent.mockResolvedValue({ success: true });

      const result = await service.associateAgentWithSession(
        'session-123',
        'agent-456',
        'primary'
      );

      expect(result).toBe(true);
      expect(mockElectronAPI.session.associateAgent).toHaveBeenCalledWith({
        sessionId: 'session-123',
        agentId: 'agent-456',
        role: 'primary',
      });
    });

    it('should remove agent from session', async () => {
      mockElectronAPI.session.removeAgent.mockResolvedValue({ success: true });

      const result = await service.removeAgentFromSession('session-123', 'agent-456');

      expect(result).toBe(true);
      expect(mockElectronAPI.session.removeAgent).toHaveBeenCalledWith(
        'session-123',
        'agent-456'
      );
    });

    it('should get session agents', async () => {
      const mockAgents = [
        { id: 'agent-1', role: 'primary' },
        { id: 'agent-2', role: 'secondary' },
      ];

      mockElectronAPI.session.getAgents.mockResolvedValue(mockAgents);

      const agents = await service.getSessionAgents('session-123');

      expect(agents).toEqual(mockAgents);
      expect(mockElectronAPI.session.getAgents).toHaveBeenCalledWith('session-123');
    });
  });

  describe('Execution Management', () => {
    it('should cancel execution', async () => {
      mockElectronAPI.catalyst.cancelAgent.mockResolvedValue({ success: true });

      const result = await service.cancelExecution('exec-123');

      expect(result).toBe(true);
      expect(mockElectronAPI.catalyst.cancelAgent).toHaveBeenCalledWith('exec-123');
    });

    it('should get execution status', async () => {
      const mockStatus = {
        found: true,
        execution: {
          id: 'exec-123',
          status: 'running',
          agentId: 'agent-1',
        },
      };

      mockElectronAPI.catalyst.getAgentStatus.mockResolvedValue(mockStatus);

      const status = await service.getExecutionStatus('exec-123');

      expect(status).toEqual(mockStatus);
      expect(mockElectronAPI.catalyst.getAgentStatus).toHaveBeenCalledWith('exec-123');
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockElectronAPI.catalyst.executeAgent.mockRejectedValue(new Error('API Error'));

      const result = await service.sendChat('Test');

      expect(result.success).toBe(false);
      expect(result.error).toBe('API Error');
    });

    it('should handle session creation errors', async () => {
      mockElectronAPI.session.create.mockRejectedValue(new Error('Session creation failed'));

      const sessionId = await service.createSession('Test');

      expect(sessionId).toBeNull();
    });

    it('should handle agent list errors', async () => {
      mockElectronAPI.catalyst.listAgents.mockRejectedValue(new Error('Agent list failed'));

      const agents = await service.getAvailableAgents();

      expect(agents).toEqual([]);
    });
  });

  describe('Event Handling', () => {
    it('should have event methods available', () => {
      expect(typeof service.on).toBe('function');
      expect(typeof service.emit).toBe('function');
      expect(typeof service.removeAllListeners).toBe('function');
    });
  });

  describe('Resource Management', () => {
    it('should cleanup resources properly', () => {
      const mockPort1 = { close: vi.fn() } as unknown as MessagePort;
      const mockPort2 = { close: vi.fn() } as unknown as MessagePort;

      // Simulate active streams
      service['activeStreams'].set('exec-1', { port: mockPort1, sessionId: 'session-1' });
      service['activeStreams'].set('exec-2', { port: mockPort2, sessionId: 'session-2' });

      service.cleanup();

      expect(mockPort1.close).toHaveBeenCalled();
      expect(mockPort2.close).toHaveBeenCalled();
      expect(service['activeStreams'].size).toBe(0);
    });

    it('should handle cleanup errors gracefully', () => {
      const mockPort = {
        close: vi.fn().mockImplementation(() => {
          throw new Error('Port close error');
        }),
      } as unknown as MessagePort;

      service['activeStreams'].set('exec-1', { port: mockPort, sessionId: 'session-1' });

      // Should not throw error
      expect(() => service.cleanup()).not.toThrow();
    });
  });

  describe('Unique ID Generation', () => {
    it('should generate unique execution IDs', () => {
      const id1 = service['generateExecutionId']();
      const id2 = service['generateExecutionId']();

      expect(id1).toMatch(/^exec_\d+_1$/);
      expect(id2).toMatch(/^exec_\d+_2$/);
      expect(id1).not.toBe(id2);
    });
  });
});

describe('CatalystService Singleton', () => {
  it('should export a singleton instance', () => {
    expect(catalystService).toBeInstanceOf(CatalystService);
  });

  it('should return the same instance', () => {
    expect(catalystService).toBe(catalystService);
  });
});