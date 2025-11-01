import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UISettings } from '@/components\Config/UISettings';
import { createMockConfig } from '@/test/test-utils';

describe('UISettings', () => {
  const mockConfig = createMockConfig({
    ui: {
      theme: 'dark',
      font_size: 'medium',
      show_token_usage: true,
      auto_save: true,
      auto_scroll: true,
      enable_markdown: true,
      enable_syntax_highlighting: true,
      compact_mode: false,
    },
  });

  const defaultProps = {
    config: mockConfig,
    onConfigChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render interface preferences title', () => {
    render(<UISettings {...defaultProps} />);

    expect(screen.getByText('Interface Preferences')).toBeInTheDocument();
  });

  it('should render theme selector', () => {
    render(<UISettings {...defaultProps} />);

    expect(screen.getByLabelText('Theme')).toBeInTheDocument();
    expect(screen.getByDisplayValue('dark')).toBeInTheDocument();
  });

  it('should handle theme change', async () => {
    const mockOnChange = vi.fn();
    render(<UISettings config={mockConfig} onConfigChange={mockOnChange} />);

    const themeSelect = screen.getByLabelText('Theme');
    await user.selectOptions(themeSelect, 'light');

    expect(mockOnChange).toHaveBeenCalledWith({
      ui: {
        ...mockConfig.ui,
        theme: 'light',
      },
    });
  });

  it('should render font size selector', () => {
    render(<UISettings {...defaultProps} />);

    expect(screen.getByLabelText('Font Size')).toBeInTheDocument();
    expect(screen.getByDisplayValue('medium')).toBeInTheDocument();
  });

  it('should handle font size change', async () => {
    const mockOnChange = vi.fn();
    render(<UISettings config={mockConfig} onConfigChange={mockOnChange} />);

    const fontSizeSelect = screen.getByLabelText('Font Size');
    await user.selectOptions(fontSizeSelect, 'large');

    expect(mockOnChange).toHaveBeenCalledWith({
      ui: {
        ...mockConfig.ui,
        font_size: 'large',
      },
    });
  });

  it('should render toggle switches for UI options', () => {
    render(<UISettings {...defaultProps} />);

    expect(screen.getByRole('button', { name: 'Show Token Usage' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Auto Save' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Auto Scroll' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enable Markdown' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Syntax Highlighting' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Compact Mode' })).toBeInTheDocument();
  });

  it('should toggle show token usage setting', async () => {
    const mockOnChange = vi.fn();
    render(<UISettings config={mockConfig} onConfigChange={mockOnChange} />);

    const toggle = screen.getByRole('button', { name: 'Show Token Usage' });
    await user.click(toggle);

    expect(mockOnChange).toHaveBeenCalledWith({
      ui: {
        ...mockConfig.ui,
        show_token_usage: false,
      },
    });
  });

  it('should toggle auto save setting', async () => {
    const mockOnChange = vi.fn();
    render(<UISettings config={mockConfig} onConfigChange={mockOnChange} />);

    const toggle = screen.getByRole('button', { name: 'Auto Save' });
    await user.click(toggle);

    expect(mockOnChange).toHaveBeenCalledWith({
      ui: {
        ...mockConfig.ui,
        auto_save: false,
      },
    });
  });

  it('should toggle auto scroll setting', async () => {
    const mockOnChange = vi.fn();
    render(<UISettings config={mockConfig} onConfigChange={mockOnChange} />);

    const toggle = screen.getByRole('button', { name: 'Auto Scroll' });
    await user.click(toggle);

    expect(mockOnChange).toHaveBeenCalledWith({
      ui: {
        ...mockConfig.ui,
        auto_scroll: false,
      },
    });
  });

  it('should toggle enable markdown setting', async () => {
    const mockOnChange = vi.fn();
    render(<UISettings config={mockConfig} onConfigChange={mockOnChange} />);

    const toggle = screen.getByRole('button', { name: 'Enable Markdown' });
    await user.click(toggle);

    expect(mockOnChange).toHaveBeenCalledWith({
      ui: {
        ...mockConfig.ui,
        enable_markdown: false,
      },
    });
  });

  it('should toggle syntax highlighting setting', async () => {
    const mockOnChange = vi.fn();
    render(<UISettings config={mockConfig} onConfigChange={mockOnChange} />);

    const toggle = screen.getByRole('button', { name: 'Syntax Highlighting' });
    await user.click(toggle);

    expect(mockOnChange).toHaveBeenCalledWith({
      ui: {
        ...mockConfig.ui,
        enable_syntax_highlighting: false,
      },
    });
  });

  it('should toggle compact mode setting', async () => {
    const mockOnChange = vi.fn();
    render(<UISettings config={mockConfig} onConfigChange={mockOnChange} />);

    const toggle = screen.getByRole('button', { name: 'Compact Mode' });
    await user.click(toggle);

    expect(mockOnChange).toHaveBeenCalledWith({
      ui: {
        ...mockConfig.ui,
        compact_mode: true,
      },
    });
  });

  it('should show correct toggle state for enabled settings', () => {
    render(<UISettings {...defaultProps} />);

    // All these settings should be enabled (aria-pressed="true")
    expect(screen.getByRole('button', { name: 'Show Token Usage' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Auto Save' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Auto Scroll' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('should show correct toggle state for disabled settings', () => {
    const disabledConfig = createMockConfig({
      ui: {
        ...mockConfig.ui,
        show_token_usage: false,
        auto_save: false,
        auto_scroll: false,
        enable_markdown: false,
        enable_syntax_highlighting: false,
        compact_mode: true,
      },
    });

    render(<UISettings config={disabledConfig} onConfigChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Show Token Usage' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Auto Save' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Auto Scroll' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('should display descriptions for each toggle', () => {
    render(<UISettings {...defaultProps} />);

    expect(screen.getByText('Display token usage statistics')).toBeInTheDocument();
    expect(screen.getByText('Automatically save conversations')).toBeInTheDocument();
    expect(screen.getByText('Automatically scroll to new messages')).toBeInTheDocument();
    expect(screen.getByText('Render markdown formatting')).toBeInTheDocument();
    expect(screen.getByText('Highlight code syntax')).toBeInTheDocument();
    expect(screen.getByText('Use compact interface layout')).toBeInTheDocument();
  });

  it('should have proper accessibility attributes', () => {
    render(<UISettings {...defaultProps} />);

    // Check ARIA attributes
    expect(screen.getByLabelText('Theme')).toBeInTheDocument();
    expect(screen.getByLabelText('Font Size')).toBeInTheDocument();

    // Check that toggles have proper ARIA pressed state
    const toggles = screen.getAllByRole('button');
    toggles.forEach(toggle => {
      expect(toggle).toHaveAttribute('aria-pressed');
    });
  });

  it('should handle multiple setting changes', async () => {
    const mockOnChange = vi.fn();
    render(<UISettings config={mockConfig} onConfigChange={mockOnChange} />);

    // Change theme
    await user.selectOptions(screen.getByLabelText('Theme'), 'light');
    expect(mockOnChange).toHaveBeenLastCalledWith({
      ui: expect.objectContaining({ theme: 'light' }),
    });

    // Change font size
    await user.selectOptions(screen.getByLabelText('Font Size'), 'small');
    expect(mockOnChange).toHaveBeenLastCalledWith({
      ui: expect.objectContaining({ font_size: 'small' }),
    });

    // Toggle auto save
    await user.click(screen.getByRole('button', { name: 'Auto Save' }));
    expect(mockOnChange).toHaveBeenLastCalledWith({
      ui: expect.objectContaining({ auto_save: false }),
    });
  });

  it('should maintain immutability of config', () => {
    const originalConfig = { ...mockConfig };
    const mockOnChange = vi.fn();

    render(<UISettings config={originalConfig} onConfigChange={mockOnChange} />);

    // Make a change
    fireEvent.click(screen.getByRole('button', { name: 'Auto Save' }));

    // Original config should not be mutated
    expect(originalConfig.ui.auto_save).toBe(true);
    expect(mockConfig.ui.auto_save).toBe(true);
  });
});