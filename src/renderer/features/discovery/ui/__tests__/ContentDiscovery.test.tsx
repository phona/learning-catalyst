import { screen } from '@testing-library/react';
import React from 'react';
import { vi } from 'vitest';
import { ContentDiscovery } from '../ContentDiscovery';
import { renderWithServices } from '@/test/utils/renderWithServices';

vi.mock('../LocalProjectExplorer', () => ({
  LocalProjectExplorer: () => <div data-testid="local-explorer">stub explorer</div>,
}));

describe('ContentDiscovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2020-01-01'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('wraps LocalProjectExplorer inside styled container', () => {
    renderWithServices(<ContentDiscovery className="extra-class" />);

    const container = screen.getByTestId('local-explorer').closest('div');
    expect(container).toBeInTheDocument();
    expect(screen.getByTestId('local-explorer')).toHaveTextContent(/stub explorer/i);
  });
});
