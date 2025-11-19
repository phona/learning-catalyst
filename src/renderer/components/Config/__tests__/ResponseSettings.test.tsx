
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResponseSettings } from '@/renderer/components/Config/ResponseSettings';

const baseConfig = {
  ai: {
    model_types: {
      chat: {
        capabilities: {
          streaming: true,
          thinking: false
        }
      }
    }
  }
} as any;

describe('ResponseSettings', () => {
  it('renders toggles and disables them when config missing', () => {
    render(<ResponseSettings config={null as any} onConfigChange={vi.fn()} />);

    expect(screen.getByText(/Response Settings/i)).toBeInTheDocument();
    const buttons = screen.getAllByRole('button');
    expect(buttons.every(btn => btn.hasAttribute('disabled'))).toBe(true);
    expect(
      screen.getByText(/Chat model configuration is unavailable/i)
    ).toBeInTheDocument();
  });

  it('toggles streaming capability', async () => {
    const onConfigChange = vi.fn();
    render(<ResponseSettings config={baseConfig} onConfigChange={onConfigChange} />);

    const streamingToggle = screen
      .getAllByRole('button')
      .find((btn) =>
        btn.previousElementSibling?.textContent?.includes('Enable Streaming Responses')
      );
    expect(streamingToggle).toBeDefined();
    await userEvent.setup().click(streamingToggle!);

    expect(onConfigChange).toHaveBeenCalledWith({
      ai: expect.objectContaining({
        model_types: expect.objectContaining({
          chat: expect.objectContaining({
            capabilities: expect.objectContaining({
              streaming: false
            })
          })
        })
      })
    });
  });

  it('toggles thinking capability', async () => {
    const onConfigChange = vi.fn();
    render(<ResponseSettings config={baseConfig} onConfigChange={onConfigChange} />);

    const thinkingToggle = screen
      .getAllByRole('button')
      .find((btn) =>
        btn.previousElementSibling?.textContent?.includes('Enable Thinking Display')
      );
    expect(thinkingToggle).toBeDefined();
    await userEvent.setup().click(thinkingToggle!);

    expect(onConfigChange).toHaveBeenCalledWith({
      ai: expect.objectContaining({
        model_types: expect.objectContaining({
          chat: expect.objectContaining({
            capabilities: expect.objectContaining({
              thinking: true
            })
          })
        })
      })
    });
  });
});
