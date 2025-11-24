import React from 'react';
import { render, screen } from '@testing-library/react';
import { Skeleton } from '../Skeleton';

describe('Skeleton', () => {
  it('renders default skeleton with expected width and height', () => {
    render(<Skeleton />);
    const skel = screen.getByTestId('skeleton');
    expect(skel.className).toContain('animate-pulse');
  });

  it('accepts className overrides', () => {
    render(<Skeleton className="w-20 h-2" />);
    const skel = screen.getByTestId('skeleton');
    expect(skel.className).toContain('w-20');
    expect(skel.className).toContain('h-2');
  });
});
