import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ModelSelect } from '@/renderer/components/Config/components/ModelSelect';

describe('ModelSelect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders select and triggers onChange', async () => {
    const onChange = vi.fn();
    render(
      <div>
        <label htmlFor="model-select">Model</label>
        <ModelSelect
          id="model-select"
          models={["gpt-4", "gpt-3.5-turbo"]}
          value=""
          onChange={onChange}
          className="w-full"
        />
      </div>,
    );

    const select = screen.getByLabelText('Model');
    const user = userEvent.setup();
    await user.selectOptions(select, 'gpt-4');
    expect(onChange).toHaveBeenCalledWith('gpt-4');
  });

  it('supports free input with datalist', async () => {
    const onChange = vi.fn();
    render(
      <div>
        <label htmlFor="model-input">Model</label>
        <ModelSelect
          id="model-input"
          models={["gpt-4", "gpt-3.5-turbo"]}
          value=""
          onChange={onChange}
          allowFreeInput
          className="w-full"
        />
      </div>,
    );

    const input = screen.getByLabelText('Model');
    fireEvent.change(input, { target: { value: 'gpt-4' } });
    expect(onChange).toHaveBeenCalledWith('gpt-4');
  });

  it('can be disabled', () => {
    render(
      <ModelSelect models={["gpt-4"]} value="" onChange={() => {}} disabled />,
    );
    const el = screen.getByRole('combobox');
    expect(el).toBeDisabled();
  });
});
