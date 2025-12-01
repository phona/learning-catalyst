import React, { useState } from 'react';
import type { TimelineEventPayload } from '@/shared/types/electron-api/chat-api';

interface ToolCallProps {
  event: TimelineEventPayload;
}

export function ToolCall({ event }: ToolCallProps) {
  const [expanded, setExpanded] = useState(false);

  const getPhaseIcon = () => {
    switch (event.phase) {
      case 'start':
        return '🔧';
      case 'end':
        return '✓';
      case 'error':
        return '✗';
      default:
        return '⏳';
    }
  };

  const getPhaseClass = () => {
    const baseClass = 'timeline-event tool-call';
    switch (event.phase) {
      case 'start':
        return `${baseClass} border-l-yellow-400`;
      case 'end':
        return `${baseClass} border-l-green-400`;
      case 'error':
        return `${baseClass} border-l-red-400`;
      default:
        return `${baseClass}`;
    }
  };

  return (
    <div className={getPhaseClass()}>
      <div className="event-header">
        <span className="icon">{getPhaseIcon()}</span>
        <span className="tool-name font-semibold text-gray-800">{event.tool}</span>
        <span className="phase-label text-xs px-2 py-1 rounded bg-gray-200 text-gray-600">
          {event.phase?.toUpperCase() || 'PENDING'}
        </span>
      </div>

      {event.expandable && event.detail && (
        <button
          className="expand-btn text-xs text-blue-600 hover:text-blue-800 mt-2 hover:underline"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? '▼ Hide I/O' : '▶ Show I/O'}
        </button>
      )}

      {expanded && event.detail && (
        <pre className="tool-detail mt-2 p-2 bg-white rounded text-xs overflow-x-auto border font-mono">
          {event.detail}
        </pre>
      )}
    </div>
  );
}
