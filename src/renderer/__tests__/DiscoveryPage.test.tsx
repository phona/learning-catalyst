import { render, screen } from '@testing-library/react';
import React from 'react';
import { vi } from 'vitest';
import { DiscoveryPage } from '@/renderer/pages/discovery';

vi.mock('@/renderer/features/discovery', () => ({
  ContentDiscovery: () => <div data-testid="content-discovery">content discovery</div>,
}));

describe('DiscoveryPage', () => {
  it('renders the content discovery container', () => {
    render(<DiscoveryPage />);

    expect(screen.getByTestId('content-discovery')).toBeInTheDocument();
  });
});
