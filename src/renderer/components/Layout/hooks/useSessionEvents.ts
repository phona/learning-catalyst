
/**
 * useSessionEvents Hook
 *
 * Custom hook for handling session-related events with proper TypeScript typing
 * and memory management. Centralizes all session event handling logic.
 */

import { useEffect, useState, useCallback } from 'react';
import type { SessionEventDetail, SessionEventType, SessionEventHandlers } from '../Sidebar.types';

// Default session event handlers
const DEFAULT_SESSION_EVENT_HANDLERS: SessionEventHandlers = {
  onSessionCreated: undefined,
  onSessionSaved: undefined,
  onSessionUpdated: undefined,
  onSessionTitleUpdated: undefined,
};

export interface UseSessionEventsOptions {
  /** Custom event handlers for different session events */
  readonly eventHandlers?: Partial<SessionEventHandlers>;
  /** Whether to enable automatic cleanup */
  readonly enableCleanup?: boolean;
  /** Custom event target (defaults to window) */
  readonly eventTarget?: EventTarget;
}

export interface UseSessionEventsReturn {
  /** Current set of newly created session IDs */
  readonly newSessionIds: ReadonlySet<string>;
  /** Function to manually mark a session as new */
  readonly markSessionAsNew: (sessionId: string) => void;
  /** Function to manually remove session from new list */
  readonly removeSessionFromNew: (sessionId: string) => void;
  /** Function to clear all new session indicators */
  readonly clearNewSessionIndicators: () => void;
  /** Function to trigger a manual session event */
  readonly triggerSessionEvent: <T extends SessionEventType>(
    eventType: T,
    detail: SessionEventDetail
  ) => void;
}

/**
 * Custom hook for handling session-related events
 *
 * @param options Configuration options for the hook
 * @returns Object containing session event state and handlers
 */
export const useSessionEvents = (options: UseSessionEventsOptions = {}): UseSessionEventsReturn => {
  const {
    eventHandlers = DEFAULT_SESSION_EVENT_HANDLERS,
    enableCleanup = true,
    eventTarget = typeof window !== 'undefined' ? window : undefined,
  } = options;

  // State for tracking newly created sessions
  const [newSessionIds, setNewSessionIds] = useState<ReadonlySet<string>>(new Set());
  const [timers, setTimers] = useState<number[]>([]);

  // Function to mark a session as new with automatic cleanup
  const markSessionAsNew = useCallback((sessionId: string, duration = 5000) => {
    setNewSessionIds((prev) => new Set(prev).add(sessionId));

    // Auto-remove the "new" status after specified duration
    if (duration > 0) {
      const timer = setTimeout(() => {
        setNewSessionIds((prev) => {
          const updated = new Set(prev);
          updated.delete(sessionId);
          return updated;
        });
      }, duration) as any;

      setTimers((prev) => [...prev, timer]);
    }
  }, []);

  // Function to remove session from new list
  const removeSessionFromNew = useCallback((sessionId: string) => {
    setNewSessionIds((prev) => {
      const updated = new Set(prev);
      updated.delete(sessionId);
      return updated;
    });
  }, []);

  // Function to clear all new session indicators
  const clearNewSessionIndicators = useCallback(() => {
    setNewSessionIds(new Set());
  }, []);

  // Function to trigger a manual session event
  const triggerSessionEvent = useCallback(<T extends SessionEventType>(
    eventType: T,
    detail: SessionEventDetail
  ) => {
    if (eventTarget) {
      const event = new CustomEvent<SessionEventDetail>(eventType, { detail });
      eventTarget.dispatchEvent(event);
    }
  }, [eventTarget]);

  // Type-safe session event handler factory
  const createTypedSessionEventHandler = useCallback(<T extends SessionEventType>(
    eventType: T,
    handler?: (event: CustomEvent<SessionEventDetail>) => void
  ) => {
    return (event: Event) => {
      if (event.type === eventType && 'detail' in event) {
        const customEvent = event as CustomEvent<SessionEventDetail>;

        // Default handling for new sessions
        if (eventType === 'sessionCreated') {
          if (customEvent.detail?.isNew && customEvent.detail?.sessionId) {
            markSessionAsNew(customEvent.detail.sessionId);
          }
        }

        // Call custom handler if provided
        if (handler) {
          handler(customEvent);
        }

        // Call global event handler if provided
        const globalHandler = eventHandlers[`on${eventType.charAt(0).toUpperCase()}${eventType.slice(1)}` as keyof SessionEventHandlers];
        if (globalHandler) {
          globalHandler(customEvent);
        }
      }
    };
  }, [eventHandlers, markSessionAsNew]);

  // Set up event listeners for session events
  useEffect(() => {
    if (!eventTarget) return;

    const handleSessionCreated = createTypedSessionEventHandler('sessionCreated', eventHandlers.onSessionCreated);
    const handleSessionSaved = createTypedSessionEventHandler('sessionSaved', eventHandlers.onSessionSaved);
    const handleSessionUpdated = createTypedSessionEventHandler('sessionUpdated', eventHandlers.onSessionUpdated);
    const handleSessionTitleUpdated = createTypedSessionEventHandler('sessionTitleUpdated', eventHandlers.onSessionTitleUpdated);

    // Add event listeners
    eventTarget.addEventListener('sessionCreated', handleSessionCreated);
    eventTarget.addEventListener('sessionSaved', handleSessionSaved);
    eventTarget.addEventListener('sessionUpdated', handleSessionUpdated);
    eventTarget.addEventListener('sessionTitleUpdated', handleSessionTitleUpdated);

    // Cleanup function
    return () => {
      eventTarget.removeEventListener('sessionCreated', handleSessionCreated);
      eventTarget.removeEventListener('sessionSaved', handleSessionSaved);
      eventTarget.removeEventListener('sessionUpdated', handleSessionUpdated);
      eventTarget.removeEventListener('sessionTitleUpdated', handleSessionTitleUpdated);
    };
  }, [eventTarget, eventHandlers, createTypedSessionEventHandler]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (enableCleanup) {
        timers.forEach((timer) => clearTimeout(timer));
      }
    };
  }, [timers, enableCleanup]);

  return {
    newSessionIds,
    markSessionAsNew,
    removeSessionFromNew,
    clearNewSessionIndicators,
    triggerSessionEvent,
  };
};