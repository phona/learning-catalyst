import React from 'react';
import { SetupPage } from '@/renderer/components/Setup/SetupPage';
import { ErrorBoundary } from '@/renderer/components/UI/ErrorBoundary';
import { useInitializationState } from '@/renderer/hooks/useInitializationState';
import { AppContent } from './AppContent';
import type { SystemError } from '@/renderer/hooks/useInitializationState';

/**
 * Handles initialization phase and error routing.
 *
 * This component sits between the error boundary and the main app content.
 * It:
 * - Listens to ready/error events from the main process via useInitializationState hook
 * - Shows SetupPage during the initialization phase
 * - Routes to crash page when system errors occur
 * - Passes control to AppContent when initialization completes successfully
 *
 * This creates a clean separation between:
 * - Initialization concerns (handled here)
 * - Configuration and ready state concerns (handled in AppContent)
 *
 * @returns JSX element with appropriate content based on initialization state
 *
 * @example
 * ```tsx
 * <ErrorBoundary variant="full">
 *   <AppErrorHandler />
 * </ErrorBoundary>
 * ```
 */
export function AppErrorHandler(): JSX.Element {
  // Listen to initialization events from main process
  const { appState, crashError } = useInitializationState();

  // Phase 1: Waiting for main process initialization
  if (appState === 'setup') {
    return <SetupPage />;
  }

  // Phase 2: Critical system error during initialization
  if (appState === 'crashed') {
    return (
      <ErrorBoundary
        variant="full"
        crashError={crashError ?? undefined}
        onRestart={() => window.location.reload()}
        children={[]}
      />
    );
  }

  // Phase 3: Initialization complete, proceed to app content
  // This includes both 'ready' and 'config-error' states
  return <AppContent />;
}
