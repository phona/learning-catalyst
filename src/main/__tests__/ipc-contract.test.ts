import { describe, it, expect } from 'vitest';
import { IPC_CHANNELS, IPC_EVENTS } from '@/shared/types/ipc';
import { createIpcPair } from '@/test/utils/fakes/ipc-fake';

describe('IPC contract skeleton (no real Electron)', () => {
  it('handles chat send and streams chunks to renderer', async () => {
    const bus = createIpcPair();

    bus.ipcMain.handle(IPC_CHANNELS.CATALYST_SEND_CHAT, async (_event, payload: { id: string; text: string }) => {
      // simulate streaming tokens arriving back to renderer
      bus.emitToRenderer(IPC_EVENTS.CHAT_STREAM_CHUNK, {
        streamId: payload.id,
        content: 'partial answer',
        isComplete: false,
      });
      bus.emitToRenderer(IPC_EVENTS.CHAT_STREAM_END, {
        streamId: payload.id,
        isComplete: true,
      });
      return { success: true, messageId: payload.id };
    });

    const chunks: string[] = [];
    bus.ipcRenderer.on(IPC_EVENTS.CHAT_STREAM_CHUNK, (_event, data: any) => {
      chunks.push(data?.content ?? '');
    });

    const result = await bus.ipcRenderer.invoke(IPC_CHANNELS.CATALYST_SEND_CHAT, {
      id: 'message-1',
      text: 'hello world',
    });
    await bus.flushAsync();

    expect(result).toMatchObject({ success: true, messageId: 'message-1' });
    expect(chunks.join(' ')).toContain('partial');
  });

  it('bubbles validation errors back to renderer', async () => {
    const bus = createIpcPair();

    bus.ipcMain.handle(IPC_CHANNELS.CATALYST_SEND_CHAT, async (_event, payload: { text?: string }) => {
      if (!payload.text) {
        throw new Error('validation failed: text required');
      }
      return { success: true };
    });

    await expect(
      bus.ipcRenderer.invoke(IPC_CHANNELS.CATALYST_SEND_CHAT, { id: 'message-2', text: '' }),
    ).rejects.toThrow(/validation failed/i);
  });
});
