/**
 * Stores Index - Clean Architecture State Management
 * Exports all Zustand stores organized by domain
 */

// App Store - Global application state
export {
  useAppStore,
  useCurrentView,
  useIsLoading,
  useError,
  useSuccess,
  useTheme,
  usePreferences,
  useIsConnected,
  useIsOnline,
  useNavigationState,
  useAppActions,
} from './app/appStore';

// Session Store - Session management state
export {
  useSessionStore,
  useSessions,
  useCurrentSession,
  useSessionsLoading,
  useSessionError,
  useFilteredSessions,
  useSessionActions,
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
  useAgentActions,
} from './agents/agentStore';

// Legacy stores (for compatibility during migration)
export { useConfigStore } from '../stores/useConfigStore';
