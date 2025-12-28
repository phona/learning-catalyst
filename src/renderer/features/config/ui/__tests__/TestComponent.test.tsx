import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { TestComponent } from '../TestComponent';
import { renderWithServices } from '@/test/utils/renderWithServices';

describe('TestComponent', () => {
  it('should render', () => {
    renderWithServices(<TestComponent />);
    expect(screen.getByText('Test Component')).toBeInTheDocument();
  });
});
