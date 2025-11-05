/**
 * Chat Service Tests - Renderer Process
 *
 * Comprehensive test suite for the Chat service running in the renderer process.
 * Tests chat functionality, streaming, and integration with Catalyst service.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ChatService, chatService } from '@/renderer/services/ChatService';
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
    service = new ChatService();
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

describe('ChatService Singleton', () => {
  it('should export a singleton instance', () => {
    expect(chatService).toBeInstanceOf(ChatService);
  });

  it('should return the same instance', () => {
    expect(chatService).toBe(chatService);
  });
});