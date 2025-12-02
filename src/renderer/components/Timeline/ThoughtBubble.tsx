import React, { useState } from 'react';
import type { TimelineEventPayload } from '@/shared/types/electron-api/chat-api';

interface ThoughtBubbleProps {
  event: TimelineEventPayload;
}

export function ThoughtBubble({ event }: ThoughtBubbleProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="timeline-event thought-bubble" data-testid="thought-bubble-container">
      <div className="event-header">
        <span className="icon">💭</span>
        <span className="agent-name">{event.agent}</span>
        <span className="timestamp">
          {new Date(event.timestamp).toLocaleTimeString()}
        </span>
      </div>

      <div className="thought-content">
        <p className="text-sm text-gray-700">{event.text}</p>

        {event.expandable && event.detail && (
          <button
            className="expand-btn text-xs text-blue-600 hover:text-blue-800 mt-2 hover:underline"
            type="button"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? '▼ Hide details' : '▶ Show details'}
          </button>
        )}

        {expanded && event.detail && (
          <pre className="thought-detail mt-2 p-2 bg-white rounded text-xs overflow-x-auto border">
            {event.detail}
          </pre>
        )}
      </div>
    </div>
  );
}
