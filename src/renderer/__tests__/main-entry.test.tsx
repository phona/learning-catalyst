import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ReactDOM from 'react-dom/client';

vi.mock('../services/api/electron-api-client', () => ({
  createElectronAPIClient: () => ({ mock: true }),
}));

describe('renderer entry (main.tsx)', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>';
  });

  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('creates a React root and renders App tree', async () => {
    const renderSpy = vi.fn();
    const createRootSpy = vi.spyOn(ReactDOM, 'createRoot').mockReturnValue({ render: renderSpy } as any);

    await import('../main');

    expect(createRootSpy).toHaveBeenCalledWith(document.getElementById('root'));
    expect(renderSpy).toHaveBeenCalledTimes(1);
  }, 30000); // Increase timeout for integration test
});
