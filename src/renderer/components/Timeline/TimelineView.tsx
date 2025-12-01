import React from 'react';
import { useTimelineStore } from '@/renderer/stores/chat/timelineStore';
import { useTimeline } from '@/renderer/hooks/useTimeline';
import { ThoughtBubble } from './ThoughtBubble';
import { ToolCall } from './ToolCall';
import '@/renderer/styles/timeline.css';

interface TimelineViewProps {
  conversationId: string;
}

export function TimelineView({ conversationId }: TimelineViewProps) {
  // Listen for timeline status updates
  useTimeline(conversationId);

  const events = useTimelineStore((state) => state.eventsByConversation[conversationId] || []);
  const activeState = useTimelineStore((state) => state.activeStatesByConversation[conversationId]);

  if (events.length === 0) {
    return null;
  }

  return (
    <div className="timeline-container border border-gray-200 rounded-lg p-4 mb-4 bg-gradient-to-b from-blue-50 to-white">
      <div className="timeline-header flex items-center justify-between mb-4 pb-2 border-b">
        <h3 className="text-lg font-semibold text-gray-800">Agent Processing</h3>
        {activeState && (
          <div className="active-state flex items-center gap-2 text-sm text-blue-600 font-medium">
            <span className="pulse-dot text-lg animate-pulse">●</span>
            {activeState}
          </div>
        )}
      </div>

      <div className="timeline-events">
        {events.map((event) => {
          if (event.type === 'thought') {
            return <ThoughtBubble key={event.id} event={event} />;
          }
          if (event.type === 'tool') {
            return <ToolCall key={event.id} event={event} />;
          }
          return null;
        })}
      </div>
    </div>
  );
}
