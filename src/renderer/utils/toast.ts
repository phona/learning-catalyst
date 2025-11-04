import toast from 'react-hot-toast';

/**
 * Toast utility service for consistent notification patterns
 * Provides helper functions for common operations with consistent messaging
 */

// Common toast messages
const TOAST_MESSAGES = {
  // Session operations
  sessionCreated: 'Session created successfully',
  sessionSaved: 'Session saved successfully',
  sessionDeleted: 'Session deleted',
  sessionLoaded: 'Session loaded',
  sessionCreateError: 'Failed to create session',
  sessionSaveError: 'Failed to save session',
  sessionDeleteError: 'Failed to delete session',
  sessionLoadError: 'Failed to load session',

  // Chat operations
  messageSent: 'Message sent',
  messageSending: 'Sending message...',
  messageError: 'Failed to send message',
  messageCleared: 'Chat cleared',
  messageRegenerated: 'Response regenerated',

  // Configuration operations
  settingsSaved: 'Settings saved successfully',
  settingsReset: 'Settings reset to defaults',
  providerConfigured: 'AI provider configured successfully',
  providerError: 'Failed to configure AI provider',

  // Knowledge operations
  knowledgeAdded: 'Knowledge added successfully',
  knowledgeRemoved: 'Knowledge removed',
  knowledgeError: 'Failed to update knowledge',

  // Network operations
  networkError: 'Network connection error',
  serverError: 'Server error occurred',
  connectionLost: 'Connection to server lost',
  connectionRestored: 'Connection restored',

  // Generic operations
  loading: 'Loading...',
  saving: 'Saving...',
  deleting: 'Deleting...',
  success: 'Operation completed successfully',
  error: 'Operation failed',
  copied: 'Copied to clipboard',
} as const;

/**
 * Success toast helper
 */
export const showSuccess = (message: string, options?: Parameters<typeof toast.success>[1]) => {
  return toast.success(message, options);
};

/**
 * Error toast helper
 */
export const showError = (message: string, options?: Parameters<typeof toast.error>[1]) => {
  return toast.error(message, options);
};

/**
 * Loading toast helper
 */
export const showLoading = (message: string, options?: Parameters<typeof toast.loading>[1]) => {
  return toast.loading(message, options);
};

/**
 * Generic toast helper
 */
export const showToast = (message: string, options?: Parameters<typeof toast>[1]) => {
  return toast(message, options);
};

/**
 * Promise-based toast helper for async operations
 */
export const showPromise = <T>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string;
    error: string;
  },
  options?: Parameters<typeof toast.promise>[2]
) => {
  return toast.promise(promise, messages, options);
};

/**
 * Session operation toasts
 */
export const sessionToasts = {
  created: () => showSuccess(TOAST_MESSAGES.sessionCreated),
  saved: () => showSuccess(TOAST_MESSAGES.sessionSaved),
  deleted: () => showSuccess(TOAST_MESSAGES.sessionDeleted),
  loaded: () => showSuccess(TOAST_MESSAGES.sessionLoaded),
  createError: (error?: string) => showError(TOAST_MESSAGES.sessionCreateError + (error ? `: ${error}` : '')),
  saveError: (error?: string) => showError(TOAST_MESSAGES.sessionSaveError + (error ? `: ${error}` : '')),
  deleteError: (error?: string) => showError(TOAST_MESSAGES.sessionDeleteError + (error ? `: ${error}` : '')),
  loadError: (error?: string) => showError(TOAST_MESSAGES.sessionLoadError + (error ? `: ${error}` : '')),
};

/**
 * Chat operation toasts
 */
export const chatToasts = {
  sending: () => showLoading(TOAST_MESSAGES.messageSending),
  sent: () => showSuccess(TOAST_MESSAGES.messageSent),
  error: (error?: string) => showError(TOAST_MESSAGES.messageError + (error ? `: ${error}` : '')),
  cleared: () => showSuccess(TOAST_MESSAGES.messageCleared),
  regenerated: () => showSuccess(TOAST_MESSAGES.messageRegenerated),
};

/**
 * Settings operation toasts
 */
export const settingsToasts = {
  saved: () => showSuccess(TOAST_MESSAGES.settingsSaved),
  reset: () => showSuccess(TOAST_MESSAGES.settingsReset),
  providerConfigured: (provider: string) => showSuccess(`${provider} ${TOAST_MESSAGES.providerConfigured}`),
  providerError: (provider: string, error?: string) => showError(`${provider} ${TOAST_MESSAGES.providerError}` + (error ? `: ${error}` : '')),
};

/**
 * Knowledge operation toasts
 */
export const knowledgeToasts = {
  added: () => showSuccess(TOAST_MESSAGES.knowledgeAdded),
  removed: () => showSuccess(TOAST_MESSAGES.knowledgeRemoved),
  error: (error?: string) => showError(TOAST_MESSAGES.knowledgeError + (error ? `: ${error}` : '')),
};

/**
 * Network operation toasts
 */
export const networkToasts = {
  error: () => showError(TOAST_MESSAGES.networkError),
  serverError: () => showError(TOAST_MESSAGES.serverError),
  connectionLost: () => showError(TOAST_MESSAGES.connectionLost),
  connectionRestored: () => showSuccess(TOAST_MESSAGES.connectionRestored),
};

/**
 * Generic utility toasts
 */
export const utilityToasts = {
  loading: (message: string = TOAST_MESSAGES.loading) => showLoading(message),
  saving: (message: string = TOAST_MESSAGES.saving) => showLoading(message),
  deleting: (message: string = TOAST_MESSAGES.deleting) => showLoading(message),
  success: (message: string = TOAST_MESSAGES.success) => showSuccess(message),
  error: (message: string = TOAST_MESSAGES.error) => showError(message),
  copied: () => showSuccess(TOAST_MESSAGES.copied),
};

/**
 * Dismiss all active toasts
 */
export const dismissAll = () => {
  toast.dismiss();
};

/**
 * Dismiss a specific toast
 */
export const dismiss = (id: string) => {
  toast.dismiss(id);
};

// Export all toast utilities
export default {
  success: showSuccess,
  error: showError,
  loading: showLoading,
  toast: showToast,
  promise: showPromise,
  dismiss,
  dismissAll,
  session: sessionToasts,
  chat: chatToasts,
  settings: settingsToasts,
  knowledge: knowledgeToasts,
  network: networkToasts,
  utility: utilityToasts,
};