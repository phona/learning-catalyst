import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThoughtBubble } from '@/renderer/components/Timeline/ThoughtBubble';
import type { TimelineEventPayload } from '@/shared/types/electron-api/chat-api';

describe('ThoughtBubble', () => {
  const defaultEvent: TimelineEventPayload = {
    id: 'event-1',
    type: 'thought',
    agent: 'LearningAgent',
    timestamp: Date.now(),
    text: 'I need to analyze this question carefully',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render with basic event data', () => {
    render(<ThoughtBubble event={defaultEvent} />);

    expect(screen.getByText('LearningAgent')).toBeInTheDocument();
    expect(screen.getByText('I need to analyze this question carefully')).toBeInTheDocument();
    expect(screen.getByText('💭')).toBeInTheDocument();
  });

  it('should display timestamp in locale time format', () => {
    const eventWithTime = {
      ...defaultEvent,
      timestamp: new Date('2024-01-01T12:00:00').getTime(),
    };

    render(<ThoughtBubble event={eventWithTime} />);

    const timestamp = screen.getByText(/12:00:00/);
    expect(timestamp).toBeInTheDocument();
  });

  it('should not show expand button when expandable is false', () => {
    const event = { ...defaultEvent, expandable: false };

    render(<ThoughtBubble event={event} />);

    expect(screen.queryByText('Show details')).not.toBeInTheDocument();
    expect(screen.queryByText('Hide details')).not.toBeInTheDocument();
  });

  it('should not show expand button when detail is not provided', () => {
    const event = { ...defaultEvent, expandable: true, detail: undefined };

    render(<ThoughtBubble event={event} />);

    expect(screen.queryByText('Show details')).not.toBeInTheDocument();
  });

  it('should show expand button when expandable and detail exist', () => {
    const event = {
      ...defaultEvent,
      expandable: true,
      detail: 'Detailed thought process...',
    };

    render(<ThoughtBubble event={event} />);

    expect(screen.getByText('▶ Show details')).toBeInTheDocument();
  });

  it('should toggle detail visibility when button is clicked', () => {
    const event = {
      ...defaultEvent,
      expandable: true,
      detail: 'Detailed thought process...',
    };

    render(<ThoughtBubble event={event} />);

    const button = screen.getByText('▶ Show details');
    fireEvent.click(button);

    expect(screen.getByText('▼ Hide details')).toBeInTheDocument();
    expect(screen.getByText('Detailed thought process...')).toBeInTheDocument();

    fireEvent.click(button);

    expect(screen.getByText('▶ Show details')).toBeInTheDocument();
    expect(screen.queryByText('Detailed thought process...')).not.toBeInTheDocument();
  });

  it('should render detail in a preformatted block', () => {
    const event = {
      ...defaultEvent,
      expandable: true,
      detail: 'Line 1\nLine 2\nLine 3',
    };

    render(<ThoughtBubble event={event} />);

    const button = screen.getByText('▶ Show details');
    fireEvent.click(button);

    const detail = screen.getByText(
      (content, node) =>
        node?.tagName === 'PRE' &&
        content.includes('Line 1') &&
        content.includes('Line 2') &&
        content.includes('Line 3'),
    );
    expect(detail).toBeInTheDocument();
    expect(detail.tagName).toBe('PRE');
  });

  it('should apply correct CSS classes', () => {
    render(<ThoughtBubble event={defaultEvent} />);

    const container = screen.getByTestId('thought-bubble-container');
    expect(container.closest('.timeline-event')).toHaveClass('thought-bubble');
  });

  it('should handle very long thought text', () => {
    const longText = 'A'.repeat(500);
    const event = { ...defaultEvent, text: longText };

    render(<ThoughtBubble event={event} />);

    expect(screen.getByText(longText)).toBeInTheDocument();
  });

  it('should handle empty text gracefully', () => {
    const event = { ...defaultEvent, text: '' };

    render(<ThoughtBubble event={event} />);

    expect(screen.getByText('LearningAgent')).toBeInTheDocument();
    expect(screen.getByText(/💭/)).toBeInTheDocument();
  });

  it('should handle missing agent name', () => {
    const event = {
      ...defaultEvent,
      agent: undefined,
      text: 'Some thought',
    };

    render(<ThoughtBubble event={event} />);

    expect(screen.getByText('Some thought')).toBeInTheDocument();
  });

  it('should preserve line breaks in thought text', () => {
    const event = {
      ...defaultEvent,
      text: 'Line 1\nLine 2\nLine 3',
    };

    render(<ThoughtBubble event={event} />);

    const textElement = screen.getByText((content) =>
      content.includes('Line 1') && content.includes('Line 2') && content.includes('Line 3')
    );
    expect(textElement).toBeInTheDocument();
  });

  it('should have proper accessibility attributes', () => {
    const event = {
      ...defaultEvent,
      expandable: true,
      detail: 'Detail text',
    };

    render(<ThoughtBubble event={event} />);

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('type', 'button');
    expect(button).toHaveClass('expand-btn');
  });
});
