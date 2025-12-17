import React from 'react';
import { render, screen } from '@testing-library/react';
import { Container } from '../Container';

describe('Container', () => {
  it('applies max width classes and renders children', () => {
    render(
      <Container maxWidth="lg" className="extra">
        <span>inside</span>
      </Container>,
    );

    const wrapper = screen.getByText('inside').parentElement;
    expect(wrapper).toHaveClass('max-w-lg');
    expect(wrapper).toHaveClass('extra');
  });

  it('defaults to full width when no maxWidth provided', () => {
    render(
      <Container>
        <span>full</span>
      </Container>,
    );

    const wrapper = screen.getByText('full').parentElement;
    expect(wrapper).toHaveClass('max-w-full');
  });
});

