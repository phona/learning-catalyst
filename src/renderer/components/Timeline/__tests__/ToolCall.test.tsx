import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToolCall } from '@/renderer/components/Timeline/ToolCall';
import type { TimelineEventPayload } from '@/shared/types/electron-api/chat-api';

describe('ToolCall', () => {
  const defaultEvent: TimelineEventPayload = {
    id: 'event-1',
    type: 'tool',
    agent: 'LearningAgent',
    timestamp: Date.now(),
    tool: 'ReadFile',
    phase: 'start',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render with basic tool data', () => {
    render(<ToolCall event={defaultEvent} />);

    expect(screen.getByText('ReadFile')).toBeInTheDocument();
    expect(screen.getByText('START')).toBeInTheDocument();
    expect(screen.getByText('🔧')).toBeInTheDocument();
  });

  it('should display correct icon for start phase', () => {
    const startEvent = { ...defaultEvent, phase: 'start' };
    render(<ToolCall event={startEvent} />);

    expect(screen.getByText('🔧')).toBeInTheDocument();
  });

  it('should display correct icon for end phase', () => {
    const endEvent = { ...defaultEvent, phase: 'end' };
    render(<ToolCall event={endEvent} />);

    expect(screen.getByText('✓')).toBeInTheDocument();
  });

  it('should display correct icon for error phase', () => {
    const errorEvent = { ...defaultEvent, phase: 'error' };
    render(<ToolCall event={errorEvent} />);

    expect(screen.getByText('✗')).toBeInTheDocument();
  });

  it('should display correct label for unknown phase', () => {
    const unknownEvent = { ...defaultEvent, phase: undefined };
    render(<ToolCall event={unknownEvent} />);

    expect(screen.getByText('PENDING')).toBeInTheDocument();
    expect(screen.getByText('⏳')).toBeInTheDocument();
  });

  it('should apply correct CSS class based on phase', () => {
    const startEvent = { ...defaultEvent, phase: 'start' };
    const { container } = render(<ToolCall event={startEvent} />);

    expect(container.firstChild).toHaveClass('border-l-yellow-400');
  });

  it('should apply end phase class', () => {
    const endEvent = { ...defaultEvent, phase: 'end' };
    const { container } = render(<ToolCall event={endEvent} />);

    expect(container.firstChild).toHaveClass('border-l-green-400');
  });

  it('should apply error phase class', () => {
    const errorEvent = { ...defaultEvent, phase: 'error' };
    const { container } = render(<ToolCall event={errorEvent} />);

    expect(container.firstChild).toHaveClass('border-l-red-400');
  });

  it('should not show expand button when expandable is false', () => {
    const event = { ...defaultEvent, expandable: false };
    render(<ToolCall event={event} />);

    expect(screen.queryByText('Show I/O')).not.toBeInTheDocument();
    expect(screen.queryByText('Hide I/O')).not.toBeInTheDocument();
  });

  it('should not show expand button when detail is not provided', () => {
    const event = { ...defaultEvent, expandable: true, detail: undefined };
    render(<ToolCall event={event} />);

    expect(screen.queryByText('Show I/O')).not.toBeInTheDocument();
  });

  it('should show expand button when expandable and detail exist', () => {
    const event = {
      ...defaultEvent,
      expandable: true,
      detail: '{ "path": "/docs/file.md" }',
    };

    render(<ToolCall event={event} />);

    expect(screen.getByText('▶ Show I/O')).toBeInTheDocument();
  });

  it('should toggle detail visibility when button is clicked', () => {
    const event = {
      ...defaultEvent,
      expandable: true,
      detail: '{ "output": "File content" }',
    };

    render(<ToolCall event={event} />);

    const button = screen.getByText('▶ Show I/O');
    fireEvent.click(button);

    expect(screen.getByText('▼ Hide I/O')).toBeInTheDocument();
    expect(screen.getByText('{ "output": "File content" }')).toBeInTheDocument();

    fireEvent.click(button);

    expect(screen.getByText('▶ Show I/O')).toBeInTheDocument();
    expect(screen.queryByText('{ "output": "File content" }')).not.toBeInTheDocument();
  });

  it('should render detail in a preformatted block', () => {
    const event = {
      ...defaultEvent,
      expandable: true,
      detail: 'Input: {}\nOutput: {}',
    };

    render(<ToolCall event={event} />);

    const button = screen.getByText('▶ Show I/O');
    fireEvent.click(button);

    const detail = screen.getByText('Input: {}\nOutput: {}');
    expect(detail).toBeInTheDocument();
    expect(detail.tagName).toBe('PRE');
  });

  it('should handle multiline detail content', () => {
    const event = {
      ...defaultEvent,
      expandable: true,
      detail: 'Line 1\nLine 2\nLine 3\nLine 4',
    };

    render(<ToolCall event={event} />);

    const button = screen.getByText('▶ Show I/O');
    fireEvent.click(button);

    expect(screen.getByText((content) =>
      content.includes('Line 1') &&
      content.includes('Line 2') &&
      content.includes('Line 3')
    )).toBeInTheDocument();
  });

  it('should format JSON details with proper indentation', () => {
    const event = {
      ...defaultEvent,
      expandable: true,
      detail: JSON.stringify({ param: 'value', nested: { foo: 'bar' } }, null, 2),
    };

    render(<ToolCall event={event} />);

    const button = screen.getByText('▶ Show I/O');
    fireEvent.click(button);

    expect(screen.getByText('"param": "value"')).toBeInTheDocument();
  });

  it('should display agent name', () => {
    render(<ToolCall event={defaultEvent} />);

    expect(screen.getByText('LearningAgent')).toBeInTheDocument();
  });

  it('should handle missing tool name gracefully', () => {
    const event = { ...defaultEvent, tool: undefined };
    render(<ToolCall event={event} />);

    expect(screen.getByText('unknown')).toBeInTheDocument();
  });

  it('should display phase in uppercase', () => {
    const event = { ...defaultEvent, phase: 'start' };
    render(<ToolCall event={event} />);

    expect(screen.getByText('START')).toBeInTheDocument();
  });

  it('should have proper accessibility attributes', () => {
    const event = {
      ...defaultEvent,
      expandable: true,
      detail: 'Detail',
    };

    render(<ToolCall event={event} />);

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('type', 'button');
    expect(button).toHaveClass('expand-btn');
  });

  it('should apply correct styling classes', () => {
    render(<ToolCall event={defaultEvent} />);

    const container = screen.getByTestId('tool-call-container');
    expect(container.closest('.timeline-event')).toHaveClass('tool-call');
    expect(container.closest('.timeline-event')).toHaveClass('border-l-yellow-400');
  });

  it('should handle long tool names', () => {
    const longName = 'VeryLongToolNameThatMightCauseIssues';
    const event = { ...defaultEvent, tool: longName };

    render(<ToolCall event={event} />);

    expect(screen.getByText(longName)).toBeInTheDocument();
  });

  it('should not render when event type is not "tool"', () => {
    const thoughtEvent = { ...defaultEvent, type: 'thought' as const };
    render(<ToolCall event={thoughtEvent} />);

    expect(screen.queryByText('ReadFile')).not.toBeInTheDocument();
  });
});
