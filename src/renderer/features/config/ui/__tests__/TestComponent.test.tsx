import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TestComponent } from '../TestComponent';

describe('TestComponent', () => {
  it('should render', () => {
    render(<TestComponent />);
    expect(screen.getByText('Test Component')).toBeInTheDocument();
  });
});
