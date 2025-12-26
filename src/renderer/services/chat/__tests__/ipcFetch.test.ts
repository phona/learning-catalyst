import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createIpcFetch } from '../ipcFetch';
import type { ElectronAPI } from '@/shared/types';
import type { AISDKStreamParams } from '@/shared/types/electron-api/base';

describe('ipcFetch', () => {
  let ipcFetch: ReturnType<typeof createIpcFetch>;
  let mockElectronAPI: ElectronAPI;
  let mockStream: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockStream = vi.fn();
    mockElectronAPI = {
      aiSDK: {
        stream: mockStream,
      },
    } as unknown as ElectronAPI;

    ipcFetch = createIpcFetch(mockElectronAPI);
  });

  describe('conversationId handling', () => {
    it('should pass conversationId from payload.id to aiSDK.stream', async () => {
      const payload = {
        id: 'thread-custom-123',
        messages: [
          {
            role: 'user',
            content: 'Hello',
          },
        ],
      };

      await ipcFetch('test input', {
        body: JSON.stringify(payload),
      });

      expect(mockElectronAPI.aiSDK.stream).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationId: 'thread-custom-123',
        }),
        expect.any(Function),
        expect.any(Function)
      );
    });

    it('should handle undefined conversationId when id is not provided', async () => {
      const payload = {
        messages: [
          {
            role: 'user',
            content: 'Hello',
          },
        ],
      };

      await ipcFetch('test input', {
        body: JSON.stringify(payload),
      });

      expect(mockElectronAPI.aiSDK.stream).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationId: undefined,
        }),
        expect.any(Function),
        expect.any(Function)
      );
    });

    it('should handle null id', async () => {
      const payload = {
        id: null,
        messages: [
          {
            role: 'user',
            content: 'Hello',
          },
        ],
      };

      await ipcFetch('test input', {
        body: JSON.stringify(payload),
      });

      expect(mockElectronAPI.aiSDK.stream).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationId: null,
        }),
        expect.any(Function),
        expect.any(Function)
      );
    });
  });

  describe('messages extraction', () => {
    it('should extract messages from payload.messages', async () => {
      const messages = [
        {
          role: 'user',
          content: 'First message',
        },
        {
          role: 'assistant',
          content: 'First response',
        },
        {
          role: 'user',
          content: 'Second message',
        },
      ];

      const payload = {
        id: 'thread-123',
        messages,
      };

      await ipcFetch('test input', {
        body: JSON.stringify(payload),
      });

      expect(mockElectronAPI.aiSDK.stream).toHaveBeenCalledWith(
        expect.objectContaining({
          messages,
          conversationId: 'thread-123',
        }),
        expect.any(Function),
        expect.any(Function)
      );
    });

    it('should handle empty messages array', async () => {
      const payload = {
        id: 'thread-123',
        messages: [],
      };

      await ipcFetch('test input', {
        body: JSON.stringify(payload),
      });

      expect(mockElectronAPI.aiSDK.stream).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [],
          conversationId: 'thread-123',
        }),
        expect.any(Function),
        expect.any(Function)
      );
    });

    it('should handle missing messages property', async () => {
      const payload = {
        id: 'thread-123',
      };

      await ipcFetch('test input', {
        body: JSON.stringify(payload),
      });

      expect(mockElectronAPI.aiSDK.stream).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [],
          conversationId: 'thread-123',
        }),
        expect.any(Function),
        expect.any(Function)
      );
    });
  });

  describe('stream handling', () => {
    it('should create Response with ReadableStream', async () => {
      const streamData = 'test stream data';
      let streamCallback: ((data: unknown) => void) | undefined;

      mockStream.mockImplementation(
        (params: AISDKStreamParams, onData: (data: unknown) => void, onDone?: () => void) => {
          streamCallback = onData;
          return vi.fn(); // cancel function
        },
      );

      const payload = {
        id: 'thread-123',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const response = await ipcFetch('test input', {
        body: JSON.stringify(payload),
      });

      expect(response).toBeInstanceOf(Response);
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/event-stream');
      expect(response.headers.get('Cache-Control')).toBe('no-cache');
      expect(response.headers.get('Connection')).toBe('keep-alive');
    });

    it('should stream data to controller', async () => {
      const streamData = 'chunk: test data';
      let streamCallback: ((data: unknown) => void) | undefined;
      let closeCallback: (() => void) | undefined;

      mockStream.mockImplementation(
        (params: AISDKStreamParams, onData: (data: unknown) => void, onDone?: () => void) => {
          streamCallback = onData;
          closeCallback = onDone;
          return vi.fn(); // cancel function
        },
      );

      const payload = {
        id: 'thread-123',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const response = await ipcFetch('test input', {
        body: JSON.stringify(payload),
      });

      // Simulate stream data
      streamCallback?.(streamData);

      // Verify the stream was created
      expect(mockElectronAPI.aiSDK.stream).toHaveBeenCalledTimes(1);
    });

    it('should close controller after stream completes', async () => {
      let streamCallback: ((data: unknown) => void) | undefined;
      let closeCallback: (() => void) | undefined;

      mockStream.mockImplementation(
        (params: AISDKStreamParams, onData: (data: unknown) => void, onDone?: () => void) => {
          streamCallback = onData;
          closeCallback = onDone;
          return vi.fn(); // cancel function
        },
      );

      const payload = {
        id: 'thread-123',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const response = await ipcFetch('test input', {
        body: JSON.stringify(payload),
      });

      // Simulate stream completion
      if (closeCallback) {
        closeCallback();
      }

      expect(mockElectronAPI.aiSDK.stream).toHaveBeenCalled();
    });

    it('should handle multiple stream chunks', async () => {
      let streamCallback: ((data: unknown) => void) | undefined;

      mockStream.mockImplementation(
        (params: AISDKStreamParams, onData: (data: unknown) => void, onDone?: () => void) => {
          streamCallback = onData;
          return vi.fn(); // cancel function
        },
      );

      const payload = {
        id: 'thread-123',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      await ipcFetch('test input', {
        body: JSON.stringify(payload),
      });

      // Simulate multiple chunks
      streamCallback?.('chunk 1');
      streamCallback?.('chunk 2');
      streamCallback?.('chunk 3');

      expect(mockElectronAPI.aiSDK.stream).toHaveBeenCalledTimes(1);
    });
  });

  describe('cancel functionality', () => {
    it('should cancel stream when ReadableStream is cancelled', async () => {
      const cancelFn = vi.fn();
      mockStream.mockReturnValue(cancelFn);

      const payload = {
        id: 'thread-123',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const response = await ipcFetch('test input', {
        body: JSON.stringify(payload),
      });

      // Access the underlying stream to trigger cancel
      const stream = (response as any).body;
      if (stream && typeof stream.cancel === 'function') {
        await stream.cancel();
      }

      expect(cancelFn).toHaveBeenCalledTimes(1);
    });

    it('should cancel stream when AbortSignal is aborted', async () => {
      const cancelFn = vi.fn();
      mockStream.mockReturnValue(cancelFn);

      const payload = {
        id: 'thread-123',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const controller = new AbortController();
      const responsePromise = ipcFetch('test input', {
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      controller.abort();
      await responsePromise;

      expect(cancelFn).toHaveBeenCalledTimes(1);
    });

    it('should handle missing cancel function gracefully', async () => {
      mockStream.mockReturnValue(undefined);

      const payload = {
        id: 'thread-123',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      const response = await ipcFetch('test input', {
        body: JSON.stringify(payload),
      });

      // Should not throw even if cancel is undefined
      const stream = (response as any).body;
      if (stream && typeof stream.cancel === 'function') {
        await stream.cancel();
      }

      expect(response).toBeInstanceOf(Response);
    });
  });

  describe('payload parsing', () => {
    it('should parse string body as JSON', async () => {
      const payload = {
        id: 'thread-123',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      await ipcFetch('test input', {
        body: JSON.stringify(payload),
      });

      expect(mockElectronAPI.aiSDK.stream).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationId: 'thread-123',
          messages: [{ role: 'user', content: 'Hello' }],
        }),
        expect.any(Function),
        expect.any(Function)
      );
    });

    it('should handle object body directly', async () => {
      const payload = {
        id: 'thread-123',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      await ipcFetch('test input', {
        body: payload as any,
      });

      expect(mockElectronAPI.aiSDK.stream).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationId: 'thread-123',
          messages: [{ role: 'user', content: 'Hello' }],
        }),
        expect.any(Function),
        expect.any(Function)
      );
    });

    it('should handle undefined body', async () => {
      await ipcFetch('test input', {
        body: undefined,
      });

      expect(mockElectronAPI.aiSDK.stream).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationId: undefined,
          messages: [],
        }),
        expect.any(Function),
        expect.any(Function)
      );
    });

    it('should handle missing body parameter', async () => {
      await ipcFetch('test input', {});

      expect(mockElectronAPI.aiSDK.stream).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationId: undefined,
          messages: [],
        }),
        expect.any(Function),
        expect.any(Function)
      );
    });

    it('should handle invalid JSON in body', async () => {
      await expect(
        ipcFetch('test input', {
          body: '{ invalid json }',
        })
      ).rejects.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle empty string id', async () => {
      const payload = {
        id: '',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      await ipcFetch('test input', {
        body: JSON.stringify(payload),
      });

      expect(mockElectronAPI.aiSDK.stream).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationId: '',
          messages: [{ role: 'user', content: 'Hello' }],
        }),
        expect.any(Function),
        expect.any(Function)
      );
    });

    it('should handle complex message structure', async () => {
      const messages = [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Text content',
            },
            {
              type: 'image',
              url: 'data:image/png;base64,...',
            },
          ],
        },
      ];

      const payload = {
        id: 'thread-123',
        messages,
      };

      await ipcFetch('test input', {
        body: JSON.stringify(payload),
      });

      expect(mockElectronAPI.aiSDK.stream).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationId: 'thread-123',
          messages,
        }),
        expect.any(Function),
        expect.any(Function)
      );
    });

    it('should not modify the original payload', async () => {
      const payload = {
        id: 'thread-123',
        messages: [{ role: 'user', content: 'Hello' }],
      };

      await ipcFetch('test input', {
        body: JSON.stringify(payload),
      });

      // Verify payload was not modified
      expect(payload.id).toBe('thread-123');
      expect(payload.messages).toHaveLength(1);
    });
  });
});
