/**
 * UI/UX related types
 */

export interface UIState {
  sidebar_open: boolean;
  settings_panel_open: boolean;
  theme: 'light' | 'dark' | 'auto';
  current_view: 'chat' | 'sessions' | 'settings' | 'progress' | 'knowledge-map';
  loading: boolean;
  error_message?: string;
  success_message?: string;
}

export interface ChatUIState {
  input_value: string;
  is_typing: boolean;
  streaming_response: boolean;
  show_thinking: boolean;
  thinking_content: string;
  auto_scroll: boolean;
  font_size: 'small' | 'medium' | 'large';
}

export interface MenuItem {
  id: string;
  label: string;
  icon?: string;
  accelerator?: string;
  action?: string;
  submenu?: MenuItem[];
  type?: 'normal' | 'separator' | 'checkbox' | 'radio';
  checked?: boolean;
  enabled?: boolean;
}

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
  action: string;
  description: string;
  category: 'chat' | 'navigation' | 'editing' | 'settings' | 'learning';
}

export interface Theme {
  name: string;
  type: 'light' | 'dark';
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    text_secondary: string;
    border: string;
    error: string;
    warning: string;
    success: string;
    info: string;
    accent: string;
  };
}

export interface NotificationData {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    handler: () => void;
  };
  persistent?: boolean;
}

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  size?: 'small' | 'medium' | 'large' | 'full';
}

export interface ToastProps {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}
