/**
 * UI/UX related types
 * Re-exports from shared types with renderer-specific extensions
 */

// Import shared UI types
import {
  UIState,
  ChatUIState,
  MenuItem,
  KeyboardShortcut,
  Theme,
  NotificationData,
  ModalProps,
  ToastProps,
} from '../../shared/types/ui';

// Re-export shared UI types
export {
  UIState,
  ChatUIState,
  MenuItem,
  KeyboardShortcut,
  Theme,
  NotificationData,
  ModalProps,
  ToastProps,
};

// Renderer-specific extension for UIState current_view
export type ExtendedUIState = Omit<UIState, 'current_view'> & {
  current_view: 'chat' | 'sessions' | 'settings' | 'progress' | 'knowledge-map' | 'discovery';
};
