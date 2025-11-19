
/**
 * UI/UX related types
 * Re-exports from shared types with renderer-specific extensions
 */

// Export all shared UI types
export * from '@/shared/types/ui';

// Renderer-specific extension for UIState current_view
export type ExtendedUIState = Omit<import('@/shared/types/ui').UIState, 'current_view'> & {
  current_view: 'chat' | 'sessions' | 'settings' | 'progress' | 'knowledge-map' | 'discovery';
};