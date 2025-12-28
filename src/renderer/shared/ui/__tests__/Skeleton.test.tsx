import React from 'react';
import { screen } from '@testing-library/react';
import { Skeleton } from '../Skeleton';
import { renderWithServices } from '@/test/utils/renderWithServices';

describe('Skeleton', () => {
  it('renders default skeleton with expected width and height', () => {
    renderWithServices(<Skeleton />);
    const skel = screen.getByTestId('skeleton');
    expect(skel.className).toContain('animate-pulse');
  });

  it('accepts className overrides', () => {
    renderWithServices(<Skeleton className="w-20 h-2" />);
    const skel = screen.getByTestId('skeleton');
    expect(skel.className).toContain('w-20');
    expect(skel.className).toContain('h-2');
  });
});
