import { describe, it, expect } from 'vitest';
import { createSessionService } from '../session-service';

const buildApi = () => {
  const sessions = {
    saveSessionWithMessages: vi.fn().mockResolvedValue({ success: true, data: { sessionId: '' } }),
    saveMessage: vi.fn().mockResolvedValue({ success: true }),
    updateTitle: vi.fn().mockResolvedValue({ success: false, error: { message: 'boom' } }),
    getRecentSessions: vi.fn().mockResolvedValue({ success: false, error: { message: 'nope' } }),
    getStatistics: vi.fn().mockResolvedValue({ success: true, data: { totalSessions: 1 } }),
  };
  return { sessions } as any;
};

describe('session-service edge cases', () => {
  it('generates a simple title when message empty', async () => {
    const svc = createSessionService(buildApi());
    await expect(svc.generateAITitle('')).resolves.toBe('New Session');
  });

  it('falls back to default title when whitespace only', async () => {
    const svc = createSessionService(buildApi());
    await expect(svc.generateAITitle('   ')).resolves.toBe('New Session');
  });

  it('throws when updateSessionTitle fails', async () => {
    const api = buildApi();
    const svc = createSessionService(api);
    await expect(svc.updateSessionTitle('id', 'title')).rejects.toThrow(/boom/);
  });

  it('throws when recent sessions request fails', async () => {
    const api = buildApi();
    const svc = createSessionService(api);
    await expect(svc.getRecentSessions()).rejects.toThrow(/nope/);
  });
});
