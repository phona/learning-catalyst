import { useEffect, useRef, useState } from 'react';
import { useChatStore } from '@/stores/useChatStore';
import { useService } from './useAppServices';

/**
 * Hook to initialize the chat store with required services
 * This hook should be used at the root level of the app to ensure the chat store
 * has access to the session service for database operations
 *
 * Enhanced with retry logic and service availability monitoring
 */
export function useChatStoreWithServices() {
  const sessionService = useService('sessionService');
  const setSessionService = useChatStore((state) => state.setSessionService);
  const retryCountRef = useRef(0);
  const [isRegistered, setIsRegistered] = useState(false);
  const maxRetries = 10; // Maximum retries before giving up
  const retryDelay = 500; // 500ms between retries

  useEffect(() => {
    if (sessionService && !isRegistered) {
      try {
        setSessionService(sessionService);
        setIsRegistered(true);
        retryCountRef.current = 0; // Reset retry count
        console.log('[Chat Store] Session service registered successfully');
      } catch (error) {
        console.error('[Chat Store] Failed to register session service:', error);
      }
    } else if (!sessionService && !isRegistered && retryCountRef.current < maxRetries) {
      // Service not yet available, set up retry mechanism
      const retryTimer = setTimeout(() => {
        retryCountRef.current++;
        console.log(`[Chat Store] Retrying service registration (${retryCountRef.current}/${maxRetries})`);
        // The useEffect will run again when useService returns a new value
      }, retryDelay);

      return () => clearTimeout(retryTimer);
    } else if (!sessionService && !isRegistered && retryCountRef.current >= maxRetries) {
      console.error('[Chat Store] Failed to register session service after maximum retries');
      // Optionally show user-facing error message
    }
  }, [sessionService, setSessionService, isRegistered]);

  // Log current state for debugging
  useEffect(() => {
    if (isRegistered) {
      console.log('[Chat Store] Services are ready and registered');
    }
  }, [isRegistered]);

  return {
    isServiceRegistered: isRegistered,
    retryCount: retryCountRef.current
  };
}