/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable no-undef */
/* eslint-disable react/prop-types */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-non-null-asserted-optional-chain */
/* eslint-disable @typescript-eslint/no-non-null-asserted-access */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/require-await */



/**
 * Chat Service Tests - Renderer Process
 *
 * Comprehensive test suite for the Chat service running in the renderer process.
 * Tests chat functionality, streaming, and integration with Catalyst service.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ChatService } from '@/renderer/services/ChatService';
import { ICatalystService } from '@/renderer/services/interfaces/ICatalystService';
import type { ChatMessage, ChatStreamChunk } from '@/renderer/services/ChatService';

// Mock module with vi.hoisted to handle variable references
const { mockCatalystService } = vi.hoisted(() => {
  const mockService = {
    sendChat: vi.fn(),
    sendChatStream: vi.fn(),
    cancelExecution: vi.fn(),
    getAvailableAgents: vi.fn(),
  };
  return { mockCatalystService: mockService };
});

vi.mock('@/renderer/services/CatalystService', () => ({
  catalystService: mockCatalystService,
}));

describe('ChatService', () => {
  let service: ChatService;

  beforeEach(() => {
    service = new ChatService(mockCatalystService as ICatalystService);
    vi.clearAllMocks();
    Object.assign(mockCatalystService, {
      sendChat: vi.fn(),
      sendChatStream: vi.fn(),
      cancelExecution: vi.fn(),
      getAvailableAgents: vi.fn(),
    });
  });

  describe('Message Sending', () => {
    it('should send a message successfully', async () => {
      const mockResult = { success: true, messageId: 'msg-123', executionId: 'exec-456' };
      mockCatalystService.sendChat.mockResolvedValue(mockResult);

      const result = await service.sendMessage('Hello, world!', {
        agentId: 'test-agent',
        sessionId: 'session-123',
      });

      expect(result).toEqual({
        id: 'msg-123',
        role: 'assistant',
        content: 'Message sent successfully',
        timestamp: expect.any(Date)
      });
      expect(mockCatalystService.sendChat).toHaveBeenCalledWith('Hello, world!', {
        agentId: 'test-agent',
        sessionId: 'session-123',
      });
    });

    it('should handle message sending failure', async () => {
      const mockResult = { success: false, error: 'Network error' };
      mockCatalystService.sendChat.mockResolvedValue(mockResult);

      await expect(service.sendMessage('Hello, world!')).rejects.toThrow('Network error');
    });

    it('should use default options when none provided', async () => {
      const mockResult = { success: true, messageId: 'msg-123' };
      mockCatalystService.sendChat.mockResolvedValue(mockResult);

      await service.sendMessage('Test message');

      expect(mockCatalystService.sendChat).toHaveBeenCalledWith('Test message', {});
    });

    it('should handle unknown message ID', async () => {
      const mockResult = { success: true };
      mockCatalystService.sendChat.mockResolvedValue(mockResult);

      const result = await service.sendMessage('Test message');

      expect(result.id).toBe('unknown');
    });
  });

  describe('Streaming Messages', () => {
    it('should send streaming message successfully', async () => {
      const mockResult = { success: true, messageId: 'msg-123', executionId: 'exec-456' };
      mockCatalystService.sendChatStream.mockImplementation((message, options, onChunk) => {
        // Simulate streaming chunks
        onChunk({ type: 'data', content: 'Hello', timestamp: Date.now() });
        onChunk({ type: 'complete', content: '', timestamp: Date.now() });
        return Promise.resolve(mockResult);
      });

      const onChunk = vi.fn();
      const result = await service.sendMessageStream('Hello, world!', onChunk, {
        agentId: 'test-agent',
      });

      expect(result).toEqual({
        id: 'msg-123',
        role: 'assistant',
        content: 'Streaming completed',
        timestamp: expect.any(Date)
      });
      expect(mockCatalystService.sendChatStream).toHaveBeenCalledWith(
        'Hello, world!',
        {
          agentId: 'test-agent',
        },
        expect.any(Function)
      );
      expect(onChunk).toHaveBeenCalledWith({
        type: 'content',
        content: 'Hello',
        timestamp: expect.any(Number)
      });
    });

    it('should handle streaming message failure', async () => {
      mockCatalystService.sendChatStream.mockRejectedValue(new Error('Stream error'));

      const onChunk = vi.fn();
      await expect(service.sendMessageStream('Hello, world!', onChunk))
        .rejects.toThrow('Stream error');
    });

    it('should transform streaming chunks correctly', async () => {
      mockCatalystService.sendChatStream.mockImplementation((message, options, onChunk) => {
        // Simulate different chunk types
        onChunk({ type: 'data', content: 'Content', timestamp: Date.now() });
        onChunk({ type: 'thinking', content: 'Thinking...', timestamp: Date.now() });
        onChunk({ type: 'error', content: 'Error occurred', timestamp: Date.now() });
        return Promise.resolve({ success: true, messageId: 'msg-123' });
      });

      const onChunk = vi.fn();
      await service.sendMessageStream('Test message', onChunk);

      expect(onChunk).toHaveBeenCalledTimes(3);
      expect(onChunk).toHaveBeenNthCalledWith(1, {
        type: 'content',
        content: 'Content',
        timestamp: expect.any(Number)
      });
      expect(onChunk).toHaveBeenNthCalledWith(2, {
        type: 'thinking',
        content: 'Thinking...',
        timestamp: expect.any(Number)
      });
      expect(onChunk).toHaveBeenNthCalledWith(3, {
        type: 'error',
        content: 'Error occurred',
        timestamp: expect.any(Number)
      });
    });

    it('should handle object content in chunks', async () => {
      mockCatalystService.sendChatStream.mockImplementation((message, options, onChunk) => {
        onChunk({ type: 'data', content: { text: 'Object content' }, timestamp: Date.now() });
        return Promise.resolve({ success: true, messageId: 'msg-123' });
      });

      const onChunk = vi.fn();
      await service.sendMessageStream('Test message', onChunk);

      expect(onChunk).toHaveBeenCalledWith({
        type: 'content',
        content: '{"text":"Object content"}',
        timestamp: expect.any(Number)
      });
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
          capabilities: ['teaching'],
          model_config: { provider: 'openai', model: 'gpt-4' }
        }
      ];
      mockCatalystService.getAvailableAgents.mockResolvedValue(mockAgents);

      const agents = await service.getAvailableAgents();

      expect(agents).toEqual(mockAgents);
      expect(mockCatalystService.getAvailableAgents).toHaveBeenCalled();
    });

    it('should cancel execution', async () => {
      mockCatalystService.cancelExecution.mockResolvedValue(true);

      const result = await service.cancelExecution('exec-123');

      expect(result).toBe(true);
      expect(mockCatalystService.cancelExecution).toHaveBeenCalledWith('exec-123');
    });

    it('should handle cancel execution failure', async () => {
      mockCatalystService.cancelExecution.mockResolvedValue(false);

      const result = await service.cancelExecution('exec-123');

      expect(result).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle Catalyst service errors', async () => {
      mockCatalystService.sendChat.mockRejectedValue(new Error('Catalyst error'));

      await expect(service.sendMessage('Test')).rejects.toThrow('Catalyst error');
    });

    it('should handle streaming errors with proper message', async () => {
      mockCatalystService.sendChatStream.mockRejectedValue(new Error('Streaming failed'));

      const onChunk = vi.fn();
      await expect(service.sendMessageStream('Test', onChunk))
        .rejects.toThrow('Streaming failed');
    });
  });
});

describe('ChatService Dependency Injection', () => {
  it('should create instance with dependency injection', () => {
    const service = new ChatService(mockCatalystService as ICatalystService);
    expect(service).toBeInstanceOf(ChatService);
  });

  it('should use injected dependency', async () => {
    const service = new ChatService(mockCatalystService as ICatalystService);
    const mockResult = { success: true, messageId: 'msg-123', response: 'Hello' };
    mockCatalystService.sendChat.mockResolvedValue(mockResult);

    const result = await service.sendMessage('Test');

    expect(result.id).toBe('msg-123');
    expect(mockCatalystService.sendChat).toHaveBeenCalledWith('Test', {});
  });
});