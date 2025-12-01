import { create } from 'zustand';
import type { TimelineEventPayload } from '@/shared/types/electron-api/chat-api';

interface TimelineStore {
  eventsByConversation: Record<string, TimelineEventPayload[]>;
  activeStatesByConversation: Record<string, string>;

  addEvent: (conversationId: string, event: TimelineEventPayload) => void;
  setState: (conversationId: string, state: string) => void;
  clearTimeline: (conversationId: string) => void;
  clearAll: () => void;
}

export const useTimelineStore = create<TimelineStore>((set) => ({
  eventsByConversation: {},
  activeStatesByConversation: {},

  addEvent: (conversationId, event) =>
    set((state) => ({
      eventsByConversation: {
        ...state.eventsByConversation,
        [conversationId]: [
          ...(state.eventsByConversation[conversationId] || []),
          event,
        ],
      },
    })),

  setState: (conversationId, state) =>
    set((state) => ({
      activeStatesByConversation: {
        ...state.activeStatesByConversation,
        [conversationId]: state,
      },
    })),

  clearTimeline: (conversationId) =>
    set((state) => ({
      eventsByConversation: {
        ...state.eventsByConversation,
        [conversationId]: [],
      },
      activeStatesByConversation: {
        ...state.activeStatesByConversation,
        [conversationId]: '',
      },
    })),

  clearAll: () =>
    set({
      eventsByConversation: {},
      activeStatesByConversation: {},
    }),
}));
