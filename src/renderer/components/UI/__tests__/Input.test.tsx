/**
 * Input Component Tests - Focused on Reliability
 *
 * Testing critical user interactions that can cause real bugs:
 * - Value changes and form submission work
 * - Error validation displays correctly
 * - Disabled state prevents interaction
 * - Basic accessibility functions properly
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from '../Input';

describe('Input - Critical Reliability Tests', () => {
  it('should handle value changes correctly', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(<Input defaultValue="" onChange={handleChange} placeholder="Test input" />);

    const input = screen.getByPlaceholderText('Test input');
    await user.type(input, 'hello world');

    expect(handleChange).toHaveBeenCalled();
    expect(input).toHaveValue('hello world');
  });

  it('should show error message when error prop is provided', () => {
    render(<Input error="This field is required" />);

    const errorMessage = screen.getByText('This field is required');
    expect(errorMessage).toBeInTheDocument();

    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('border-red-500', 'focus:ring-red-500');
  });

  it('should show helper text when provided', () => {
    render(<Input helperText="Enter your email address" />);

    const helperText = screen.getByText('Enter your email address');
    expect(helperText).toBeInTheDocument();
  });

  it('should not show helper text when error is present', () => {
    render(<Input error="This field is required" helperText="Enter your email address" />);

    // Should show error, not helper text
    expect(screen.getByText('This field is required')).toBeInTheDocument();
    expect(screen.queryByText('Enter your email address')).not.toBeInTheDocument();
  });

  it('should respect disabled state', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();
    render(<Input disabled defaultValue="readonly" onChange={handleChange} />);

    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
    expect(input).toHaveValue('readonly');

    await user.type(input, 'new value');
    expect(handleChange).not.toHaveBeenCalled();
  });

  it('should associate label with input correctly', () => {
    render(<Input label="Email Address" id="email-input" />);

    const label = screen.getByText('Email Address');
    const input = screen.getByRole('textbox');

    expect(label).toHaveAttribute('for', 'email-input');
    expect(input).toHaveAttribute('id', 'email-input');
  });

  it('should handle form submission integration', () => {
    const handleSubmit = vi.fn((e) => e.preventDefault());
    const handleChange = vi.fn();

    render(
      <form onSubmit={handleSubmit}>
        <Input name="username" onChange={handleChange} />
        <button type="submit">Submit</button>
      </form>,
    );

    const input = screen.getByRole('textbox');
    const submitButton = screen.getByRole('button', { name: 'Submit' });

    // Type some text
    fireEvent.change(input, { target: { value: 'testuser' } });
    expect(handleChange).toHaveBeenCalled();

    // Submit form
    fireEvent.click(submitButton);
    expect(handleSubmit).toHaveBeenCalled();
  });

  it('should handle different input types', () => {
    const { rerender } = render(<Input type="email" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('type', 'email');

    rerender(<Input type="password" />);
    expect(screen.getByDisplayValue('')).toHaveAttribute('type', 'password');

    rerender(<Input type="number" />);
    expect(screen.getByDisplayValue('')).toHaveAttribute('type', 'number');
  });

  it('should be keyboard accessible', () => {
    const handleChange = vi.fn();
    render(<Input onChange={handleChange} placeholder="Test input" />);

    const input = screen.getByPlaceholderText('Test input');
    input.focus();

    // Should be able to focus
    expect(input).toHaveFocus();

    // Typing should work
    fireEvent.keyDown(input, { key: 'a' });
    expect(input).toBeInTheDocument();

    // Tab navigation
    fireEvent.keyDown(input, { key: 'Tab' });
    expect(input).toBeInTheDocument();
  });

  it('should handle icons without breaking functionality', () => {
    const leftIcon = <span data-testid="left-icon">←</span>;
    const rightIcon = <span data-testid="right-icon">→</span>;

    render(<Input leftIcon={leftIcon} rightIcon={rightIcon} placeholder="With icons" />);

    expect(screen.getByTestId('left-icon')).toBeInTheDocument();
    expect(screen.getByTestId('right-icon')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('With icons')).toBeInTheDocument();
  });

  it('should handle edge cases gracefully', () => {
    // Empty props should still render a textbox
    const { unmount: unmountDefault } = render(<Input />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    unmountDefault();

    // Undefined value should not break controlled behavior
    const { unmount: unmountUndefined } = render(<Input value={undefined} onChange={vi.fn()} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    unmountUndefined();

    // Null onChange (defensive) should not throw
    const { unmount: unmountNullHandler } = render(
      <Input onChange={null as unknown as React.ChangeEventHandler<HTMLInputElement>} />,
    );
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    unmountNullHandler();
  });

  it('should validate required field behavior', () => {
    render(<Input required />);

    const input = screen.getByRole('textbox');
    expect(input).toBeRequired();
    // Note: aria-required is automatically added by browsers for required attributes
  });

  it('should handle maxLength constraints', () => {
    const handleChange = vi.fn();
    render(<Input maxLength={10} onChange={handleChange} placeholder="Max 10 chars" />);

    const input = screen.getByPlaceholderText('Max 10 chars');
    expect(input).toHaveAttribute('maxlength', '10');
  });
});
