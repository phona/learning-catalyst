import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProviderSelect } from '../ProviderSelect';

describe('ProviderSelect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders options and placeholder, associates label via id', async () => {
    const onChange = vi.fn();
    render(
      <div>
        <label htmlFor="provider-select">Provider</label>
        <ProviderSelect
          id="provider-select"
          providers={[
            { id: 'openai', label: 'OpenAI' },
            { id: 'cohere', label: 'Cohere', disabled: true },
          ]}
          value=""
          onChange={onChange}
        />
      </div>,
    );

    const select = screen.getByLabelText('Provider');
    expect(select).toBeInTheDocument();
    expect(select).toHaveDisplayValue('Select provider...');

    const user = userEvent.setup();
    await user.selectOptions(select, 'openai');
    expect(onChange).toHaveBeenCalledWith('openai');

    const option = screen.getByRole('option', { name: 'Cohere' });
    expect(option).toBeDisabled();
  });

  it('can be disabled', () => {
    render(
      <ProviderSelect
        providers={[{ id: 'openai', label: 'OpenAI' }]}
        value=""
        onChange={() => {}}
        disabled
      />,
    );
    const select = screen.getByRole('combobox');
    expect(select).toBeDisabled();
  });
});
