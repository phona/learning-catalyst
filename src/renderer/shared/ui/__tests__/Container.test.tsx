import React from 'react';
import { screen } from '@testing-library/react';
import { Container } from '../Container';
import { renderWithServices } from '@/test/utils/renderWithServices';

describe('Container', () => {
  it('applies max width classes and renders children', () => {
    renderWithServices(
      <Container maxWidth="lg" className="extra">
        <span>inside</span>
      </Container>,
    );

    const wrapper = screen.getByText('inside').parentElement;
    expect(wrapper).toHaveClass('max-w-lg');
    expect(wrapper).toHaveClass('extra');
  });

  it('defaults to full width when no maxWidth provided', () => {
    renderWithServices(
      <Container>
        <span>full</span>
      </Container>,
    );

    const wrapper = screen.getByText('full').parentElement;
    expect(wrapper).toHaveClass('max-w-full');
  });
});

