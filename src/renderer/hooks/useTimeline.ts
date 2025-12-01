import { useEffect } from 'react';
import { useTimelineStore } from '@/renderer/stores/chat/timelineStore';
import type { ChatStatus } from '@/shared/types/electron-api/chat-api';

/**
 * Hook to handle timeline status updates from the main process
 */
export function useTimeline(conversationId: string | null) {
  const addEvent = useTimelineStore((state) => state.addEvent);
  const setState = useTimelineStore((state) => state.setState);

  useEffect(() => {
    if (!conversationId) return;

    // Listen for status messages from main process
    const handleMessage = (event: MessageEvent) => {
      const { data } = event;

      if (!data || typeof data !== 'object') return;

      // Handle timeline events
      if (data.type === 'chat:status' && data.status) {
        const status = data.status as ChatStatus;

        if (status.type === 'timeline_event') {
          addEvent(conversationId, status.event);
        } else if (status.type === 'timeline_state') {
          setState(conversationId, status.state);
        }
      }
    };

    // Listen to the global window message event
    // This is how MessageChannel messages arrive in the renderer
    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [conversationId, addEvent, setState]);
}
