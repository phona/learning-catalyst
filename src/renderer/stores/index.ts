/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable no-undef */
/* eslint-disable react/prop-types */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-non-null-asserted-optional-chain */
/* eslint-disable @typescript-eslint/no-non-null-asserted-access */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/require-await */




/**
 * Stores Index - Clean Architecture State Management
 * Exports all Zustand stores organized by domain
 */

// App Store - Global application state
export { useAppStore, useCurrentView, useIsLoading, useError, useSuccess, useTheme, usePreferences, useIsConnected, useIsOnline, useNavigationState, useAppActions } from './app/appStore';

// Chat Store - Chat functionality state
export {
  useChatStore,
  useCurrentMessages,
  useCurrentAgent,
  useIsTyping,
  useChatLoading,
  useChatError,
  useStreamingState,
  useChatActions
} from './chat/chatStore';

// Session Store - Session management state
export {
  useSessionStore,
  useSessions,
  useCurrentSession,
  useSessionsLoading,
  useSessionError,
  useFilteredSessions,
  useSessionActions
} from './sessions/sessionStore';

// Agent Store - Agent management state
export {
  useAgentStore,
  useAgents,
  useAvailableAgents,
  useSelectedAgent,
  useAgentsLoading,
  useAgentError,
  useFilteredAgents,
  useAgentStatus,
  useAgentActions
} from './agents/agentStore';

// Legacy stores (for compatibility during migration)
export { useConfigStore } from '../stores/useConfigStore';