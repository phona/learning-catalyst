import { render, screen } from '@testing-library/react';
import React from 'react';
import { vi } from 'vitest';
import { DiscoveryPage } from '@/renderer/pages/discovery';

// Render real ContentDiscovery but stub the heavy explorer inside it
vi.mock('@/renderer/features/discovery/ui/LocalProjectExplorer', () => ({
  LocalProjectExplorer: () => <div data-testid="local-project-explorer">explorer</div>,
}));

describe('DiscoveryPage (integration-light)', () => {
  it('renders content discovery with explorer stub', () => {
    render(<DiscoveryPage />);

    expect(screen.getByTestId('local-project-explorer')).toBeInTheDocument();
  });
});
