import { describe, it, expect, vi } from 'vitest';
import { createChatService } from '../chat-service';
import type { ElectronAPI } from '@/shared/types/electron-api';

const makeCallbackApi = () => {
  const events: Record<string, (evt: { type: 'chunk' | 'complete' | 'error'; chunk?: string; error?: string }) => void> = {};
  const api: Partial<ElectronAPI> = {
    chat: {
      sendMessageStream: vi.fn(async (_params: any, onEvent: (evt: any) => void) => {
        events['onEvent'] = onEvent;
        let i = 0;
        const chunks = ['hello ', 'world ', 'ignored'];
        const emit = () => {
          if (i < chunks.length) {
            events.onEvent?.({ type: 'chunk', chunk: chunks[i] });
            i++;
            setTimeout(emit, 50);
          }
        };
        setTimeout(emit, 10);
        return { success: true, data: { started: true } } as any;
      }),
      cancelStream: vi.fn(async () => {
        // simulate immediate stop without complete event
        return { success: true, data: { canceled: true } } as any;
      }),
    } as any,
  };
  return api as ElectronAPI;
};

describe('chat-service cancel stream', () => {
  it('resolves with partial content on cancel', async () => {
    const api = makeCallbackApi();
    const svc = createChatService(api);
    const onChunk = vi.fn();

    const promise = svc.sendMessageStream('go', onChunk, { sessionId: 's-cancel' });
    await new Promise((r) => setTimeout(r, 120));
    await svc.cancelStream?.('s-cancel');
    const result = await promise;

    expect(onChunk).toHaveBeenCalled();
    expect(result.content).toMatch(/hello world /);
  }, 10000);
});

