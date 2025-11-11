import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CatalystService, catalystService } from '@/renderer/services/CatalystService';
import type { ICatalystIPCClient } from '@/renderer/services/ipc/ICatalystIPCClient';

const createMockIPCClient = () => ({
  sendChat: vi.fn<ICatalystIPCClient['sendChat']>(),
  sendChatStream: vi.fn<ICatalystIPCClient['sendChatStream']>(),
  getAvailableAgents: vi.fn<ICatalystIPCClient['getAvailableAgents']>(),
  getSession: vi.fn<ICatalystIPCClient['getSession']>(),
  cancelExecution: vi.fn<ICatalystIPCClient['cancelExecution']>(),
});

describe('CatalystService', () => {
  let mockIPC: ReturnType<typeof createMockIPCClient>;
  let service: CatalystService;

  beforeEach(() => {
    mockIPC = createMockIPCClient();
    service = new CatalystService(mockIPC);
  });

  describe('sendChat', () => {
    it('returns success when IPC client resolves', async () => {
      mockIPC.sendChat.mockResolvedValue({
        success: true,
        data: { messageId: 'msg-123', response: 'Hello' },
      } as any);

      const result = await service.sendChat('  Hello world  ', { agentId: 'agent-1', sessionId: 'session-1' });

      expect(result).toEqual({
        success: true,
        messageId: 'msg-123',
        response: 'Hello',
        error: undefined,
      });
      expect(mockIPC.sendChat).toHaveBeenCalledWith({
        message: 'Hello world',
        agentId: 'agent-1',
        sessionId: 'session-1',
      });
    });

    it('rejects empty messages', async () => {
      const result = await service.sendChat('   ');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Message cannot be empty');
      expect(mockIPC.sendChat).not.toHaveBeenCalled();
    });

    it('handles IPC errors gracefully', async () => {
      mockIPC.sendChat.mockRejectedValue(new Error('IPC failure'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await service.sendChat('Test');

      expect(result.success).toBe(false);
      expect(result.error).toBe('IPC failure');
      consoleSpy.mockRestore();
    });

    it('handles malformed responses', async () => {
      mockIPC.sendChat.mockResolvedValue(null as any);
      const result = await service.sendChat('Test');

      expect(result).toEqual({ success: false, error: 'Invalid response received' });
    });
  });

  describe('sendChatStream', () => {
    it('requires message and onChunk callback', async () => {
      const missingMessage = await service.sendChatStream('', () => {});
      expect(missingMessage.error).toBe('Message cannot be empty');

      const missingCallback = await service.sendChatStream('hi', undefined as any);
      expect(missingCallback.error).toBe('Streaming callback is required');
    });

    it('delegates to IPC client', async () => {
      const chunkHandler = vi.fn();
      mockIPC.sendChatStream.mockResolvedValue({ success: true, data: { messageId: 'stream-1' } } as any);

      const result = await service.sendChatStream('Hello stream', chunkHandler, { agentId: 'agent-2' });

      expect(result.success).toBe(true);
      expect(mockIPC.sendChatStream).toHaveBeenCalledWith({
        message: 'Hello stream',
        agentId: 'agent-2',
        sessionId: undefined,
        onChunk: chunkHandler,
      });
    });
  });

  describe('getAvailableAgents', () => {
    it('returns transformed agent data', async () => {
      mockIPC.getAvailableAgents.mockResolvedValue({
        success: true,
        data: { agents: [{ id: 'agent-1', name: 'Agent One' }] },
      } as any);

      const result = await service.getAvailableAgents();
      expect(result).toEqual({ success: true, agents: [{ id: 'agent-1', name: 'Agent One' }] });
    });

    it('handles IPC failures', async () => {
      mockIPC.getAvailableAgents.mockRejectedValue(new Error('Failed to fetch agents'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await service.getAvailableAgents();
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch agents');
      consoleSpy.mockRestore();
    });
  });

  describe('getSession', () => {
    it('requires a session id', async () => {
      const result = await service.getSession('');
      expect(result.error).toBe('Session ID is required');
      expect(mockIPC.getSession).not.toHaveBeenCalled();
    });

    it('returns transformed session data', async () => {
      mockIPC.getSession.mockResolvedValue({ success: true, data: { session: { id: 's1' } } } as any);
      const result = await service.getSession('s1');

      expect(result).toEqual({ success: true, session: { id: 's1' } });
      expect(mockIPC.getSession).toHaveBeenCalledWith({ sessionId: 's1' });
    });
  });

  describe('cancelExecution', () => {
    it('validates execution id input', async () => {
      const result = await service.cancelExecution('');
      expect(result.error).toBe('Execution ID is required');
    });

    it('returns cancel result', async () => {
      mockIPC.cancelExecution.mockResolvedValue({ success: true } as any);

      const result = await service.cancelExecution('exec-1');
      expect(result).toEqual({ success: true, error: undefined });
      expect(mockIPC.cancelExecution).toHaveBeenCalledWith({ executionId: 'exec-1' });
    });
  });

  describe('getActiveExecutions', () => {
    it('returns empty state by default', async () => {
      await expect(service.getActiveExecutions()).resolves.toEqual({ success: true, executions: [] });
    });
  });
});

describe('CatalystService singleton', () => {
  it('provides a default instance', () => {
    expect(catalystService).toBeInstanceOf(CatalystService);
  });
});
