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
export const showSuccess = (message: string, options?: Parameters<typeof toast.success>[1]): string => {
  return toast.success(message, options);
};

/**
 * Error toast helper
 */
export const showError = (message: string, options?: Parameters<typeof toast.error>[1]): string => {
  return toast.error(message, options);
};

/**
 * Loading toast helper
 */
export const showLoading = (message: string, options?: Parameters<typeof toast.loading>[1]): string => {
  return toast.loading(message, options);
};

/**
 * Generic toast helper
 */
export const showToast = (message: string, options?: Parameters<typeof toast>[1]): string => {
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
): Promise<T> => {
  return toast.promise(promise, messages, options);
};

/**
 * Session operation toasts
 */
export const sessionToasts = {
  created: (): string => showSuccess(TOAST_MESSAGES.sessionCreated),
  saved: (): string => showSuccess(TOAST_MESSAGES.sessionSaved),
  deleted: (): string => showSuccess(TOAST_MESSAGES.sessionDeleted),
  loaded: (): string => showSuccess(TOAST_MESSAGES.sessionLoaded),
  createError: (error?: string): string => showError(TOAST_MESSAGES.sessionCreateError + (error != null && error !== '' ? `: ${error}` : '')),
  saveError: (error?: string): string => showError(TOAST_MESSAGES.sessionSaveError + (error != null && error !== '' ? `: ${error}` : '')),
  deleteError: (error?: string): string => showError(TOAST_MESSAGES.sessionDeleteError + (error != null && error !== '' ? `: ${error}` : '')),
  loadError: (error?: string): string => showError(TOAST_MESSAGES.sessionLoadError + (error != null && error !== '' ? `: ${error}` : '')),
};

/**
 * Chat operation toasts
 */
export const chatToasts = {
  sending: (): string => showLoading(TOAST_MESSAGES.messageSending),
  sent: (): string => showSuccess(TOAST_MESSAGES.messageSent),
  error: (error?: string): string => showError(TOAST_MESSAGES.messageError + (error != null && error !== '' ? `: ${error}` : '')),
  cleared: (): string => showSuccess(TOAST_MESSAGES.messageCleared),
  regenerated: (): string => showSuccess(TOAST_MESSAGES.messageRegenerated),
};

/**
 * Settings operation toasts
 */
export const settingsToasts = {
  saved: (): string => showSuccess(TOAST_MESSAGES.settingsSaved),
  reset: (): string => showSuccess(TOAST_MESSAGES.settingsReset),
  providerConfigured: (provider: string): string => showSuccess(`${provider} ${TOAST_MESSAGES.providerConfigured}`),
  providerError: (provider: string, error?: string): string => showError(`${provider} ${TOAST_MESSAGES.providerError}` + (error != null && error !== '' ? `: ${error}` : '')),
};

/**
 * Knowledge operation toasts
 */
export const knowledgeToasts = {
  added: (): string => showSuccess(TOAST_MESSAGES.knowledgeAdded),
  removed: (): string => showSuccess(TOAST_MESSAGES.knowledgeRemoved),
  error: (error?: string): string => showError(TOAST_MESSAGES.knowledgeError + (error != null && error !== '' ? `: ${error}` : '')),
};

/**
 * Network operation toasts
 */
export const networkToasts = {
  error: (): string => showError(TOAST_MESSAGES.networkError),
  serverError: (): string => showError(TOAST_MESSAGES.serverError),
  connectionLost: (): string => showError(TOAST_MESSAGES.connectionLost),
  connectionRestored: (): string => showSuccess(TOAST_MESSAGES.connectionRestored),
};

/**
 * Generic utility toasts
 */
export const utilityToasts = {
  loading: (message: string = TOAST_MESSAGES.loading): string => showLoading(message),
  saving: (message: string = TOAST_MESSAGES.saving): string => showLoading(message),
  deleting: (message: string = TOAST_MESSAGES.deleting): string => showLoading(message),
  success: (message: string = TOAST_MESSAGES.success): string => showSuccess(message),
  error: (message: string = TOAST_MESSAGES.error): string => showError(message),
  copied: (): string => showSuccess(TOAST_MESSAGES.copied),
};

/**
 * Dismiss all active toasts
 */
export const dismissAll = (): void => {
  toast.dismiss();
};

/**
 * Dismiss a specific toast
 */
export const dismiss = (id: string): void => {
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