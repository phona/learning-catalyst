import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import toast from 'react-hot-toast';
import {
  showSuccess,
  showError,
  showLoading,
  showToast,
  showPromise,
  dismiss,
  dismissAll,
  sessionToasts,
  chatToasts,
  settingsToasts,
  knowledgeToasts,
  networkToasts,
  utilityToasts,
} from '@/utils/toast';

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  loading: vi.fn(),
  promise: vi.fn(),
  dismiss: vi.fn(),
}));

describe('Toast Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Toast Functions', () => {
    it('should call toast.success with correct message', () => {
      const message = 'Test success message';
      const options = { duration: 3000 };

      showSuccess(message, options);

      expect(toast.success).toHaveBeenCalledWith(message, options);
    });

    it('should call toast.error with correct message', () => {
      const message = 'Test error message';
      const options = { duration: 5000 };

      showError(message, options);

      expect(toast.error).toHaveBeenCalledWith(message, options);
    });

    it('should call toast.loading with correct message', () => {
      const message = 'Loading...';
      const options = { duration: 1000 };

      showLoading(message, options);

      expect(toast.loading).toHaveBeenCalledWith(message, options);
    });

    it('should call default toast with correct message', () => {
      const message = 'Default message';
      const options = { duration: 4000 };

      showToast(message, options);

      expect(toast.default).toHaveBeenCalledWith(message, options);
    });

    it('should call toast.promise with correct parameters', async () => {
      const promise = Promise.resolve('success');
      const messages = {
        loading: 'Loading...',
        success: 'Success!',
        error: 'Error occurred',
      };
      const options = { duration: 3000 };

      showPromise(promise, messages, options);

      expect(toast.promise).toHaveBeenCalledWith(promise, messages, options);
    });

    it('should call toast.dismiss with id', () => {
      const id = 'toast-id';

      dismiss(id);

      expect(toast.dismiss).toHaveBeenCalledWith(id);
    });

    it('should call toast.dismiss without id', () => {
      dismissAll();

      expect(toast.dismiss).toHaveBeenCalled();
    });
  });

  describe('Session Toasts', () => {
    it('should show session created success', () => {
      sessionToasts.created();

      expect(toast.success).toHaveBeenCalledWith('Session created successfully', undefined);
    });

    it('should show session saved success', () => {
      sessionToasts.saved();

      expect(toast.success).toHaveBeenCalledWith('Session saved successfully', undefined);
    });

    it('should show session deleted success', () => {
      sessionToasts.deleted();

      expect(toast.success).toHaveBeenCalledWith('Session deleted', undefined);
    });

    it('should show session loaded success', () => {
      sessionToasts.loaded();

      expect(toast.success).toHaveBeenCalledWith('Session loaded', undefined);
    });

    it('should show session create error with message', () => {
      const error = 'Database error';

      sessionToasts.createError(error);

      expect(toast.error).toHaveBeenCalledWith('Failed to create session: Database error', undefined);
    });

    it('should show session create error without message', () => {
      sessionToasts.createError();

      expect(toast.error).toHaveBeenCalledWith('Failed to create session', undefined);
    });

    it('should show session save error with message', () => {
      const error = 'Save failed';

      sessionToasts.saveError(error);

      expect(toast.error).toHaveBeenCalledWith('Failed to save session: Save failed', undefined);
    });

    it('should show session load error with message', () => {
      const error = 'Load failed';

      sessionToasts.loadError(error);

      expect(toast.error).toHaveBeenCalledWith('Failed to load session: Load failed', undefined);
    });
  });

  describe('Chat Toasts', () => {
    it('should show chat sending loading', () => {
      chatToasts.sending();

      expect(toast.loading).toHaveBeenCalledWith('Sending message...', undefined);
    });

    it('should show chat sent success', () => {
      chatToasts.sent();

      expect(toast.success).toHaveBeenCalledWith('Message sent', undefined);
    });

    it('should show chat error with message', () => {
      const error = 'Network error';

      chatToasts.error(error);

      expect(toast.error).toHaveBeenCalledWith('Failed to send message: Network error', undefined);
    });

    it('should show chat error without message', () => {
      chatToasts.error();

      expect(toast.error).toHaveBeenCalledWith('Failed to send message: Unknown error occurred', undefined);
    });

    it('should show chat cleared success', () => {
      chatToasts.cleared();

      expect(toast.success).toHaveBeenCalledWith('Chat cleared', undefined);
    });

    it('should show chat regenerated success', () => {
      chatToasts.regenerated();

      expect(toast.success).toHaveBeenCalledWith('Response regenerated', undefined);
    });
  });

  describe('Settings Toasts', () => {
    it('should show settings saved success', () => {
      settingsToasts.saved();

      expect(toast.success).toHaveBeenCalledWith('Settings saved successfully', undefined);
    });

    it('should show settings reset success', () => {
      settingsToasts.reset();

      expect(toast.success).toHaveBeenCalledWith('Settings reset to defaults', undefined);
    });

    it('should show provider configured success', () => {
      const provider = 'OpenAI';

      settingsToasts.providerConfigured(provider);

      expect(toast.success).toHaveBeenCalledWith('OpenAI AI provider configured successfully', undefined);
    });

    it('should show provider error with details', () => {
      const provider = 'ChatGLM';
      const error = 'Invalid API key';

      settingsToasts.providerError(provider, error);

      expect(toast.error).toHaveBeenCalledWith('ChatGLM Failed to configure AI provider: Invalid API key', undefined);
    });

    it('should show provider error without details', () => {
      const provider = 'DeepSeek';

      settingsToasts.providerError(provider);

      expect(toast.error).toHaveBeenCalledWith('DeepSeek Failed to configure AI provider: Unknown error', undefined);
    });
  });

  describe('Knowledge Toasts', () => {
    it('should show knowledge added success', () => {
      knowledgeToasts.added();

      expect(toast.success).toHaveBeenCalledWith('Knowledge added successfully', undefined);
    });

    it('should show knowledge removed success', () => {
      knowledgeToasts.removed();

      expect(toast.success).toHaveBeenCalledWith('Knowledge removed', undefined);
    });

    it('should show knowledge error with message', () => {
      const error = 'Processing error';

      knowledgeToasts.error(error);

      expect(toast.error).toHaveBeenCalledWith('Failed to update knowledge: Processing error', undefined);
    });

    it('should show knowledge error without message', () => {
      knowledgeToasts.error();

      expect(toast.error).toHaveBeenCalledWith('Failed to update knowledge: Unknown error', undefined);
    });
  });

  describe('Network Toasts', () => {
    it('should show network error', () => {
      networkToasts.error();

      expect(toast.error).toHaveBeenCalledWith('Network connection error', undefined);
    });

    it('should show server error', () => {
      networkToasts.serverError();

      expect(toast.error).toHaveBeenCalledWith('Server error occurred', undefined);
    });

    it('should show connection lost error', () => {
      networkToasts.connectionLost();

      expect(toast.error).toHaveBeenCalledWith('Connection to server lost', undefined);
    });

    it('should show connection restored success', () => {
      networkToasts.connectionRestored();

      expect(toast.success).toHaveBeenCalledWith('Connection restored', undefined);
    });
  });

  describe('Utility Toasts', () => {
    it('should show loading with default message', () => {
      utilityToasts.loading();

      expect(toast.loading).toHaveBeenCalledWith('Loading...', undefined);
    });

    it('should show loading with custom message', () => {
      const message = 'Custom loading message';

      utilityToasts.loading(message);

      expect(toast.loading).toHaveBeenCalledWith(message, undefined);
    });

    it('should show saving with default message', () => {
      utilityToasts.saving();

      expect(toast.loading).toHaveBeenCalledWith('Saving...', undefined);
    });

    it('should show saving with custom message', () => {
      const message = 'Custom saving message';

      utilityToasts.saving(message);

      expect(toast.loading).toHaveBeenCalledWith(message, undefined);
    });

    it('should show deleting with default message', () => {
      utilityToasts.deleting();

      expect(toast.loading).toHaveBeenCalledWith('Deleting...', undefined);
    });

    it('should show deleting with custom message', () => {
      const message = 'Custom deleting message';

      utilityToasts.deleting(message);

      expect(toast.loading).toHaveBeenCalledWith(message, undefined);
    });

    it('should show success with default message', () => {
      utilityToasts.success();

      expect(toast.success).toHaveBeenCalledWith('Operation completed successfully', undefined);
    });

    it('should show success with custom message', () => {
      const message = 'Custom success message';

      utilityToasts.success(message);

      expect(toast.success).toHaveBeenCalledWith(message, undefined);
    });

    it('should show error with default message', () => {
      utilityToasts.error();

      expect(toast.error).toHaveBeenCalledWith('Operation failed', undefined);
    });

    it('should show error with custom message', () => {
      const message = 'Custom error message';

      utilityToasts.error(message);

      expect(toast.error).toHaveBeenCalledWith(message, undefined);
    });

    it('should show copied success', () => {
      utilityToasts.copied();

      expect(toast.success).toHaveBeenCalledWith('Copied to clipboard', undefined);
    });
  });

  describe('Promise Toast Integration', () => {
    it('should handle successful promise toast', async () => {
      const successPromise = Promise.resolve('test data');

      const promiseToast = showPromise(successPromise, {
        loading: 'Loading data...',
        success: 'Data loaded successfully!',
        error: 'Failed to load data',
      });

      expect(toast.promise).toHaveBeenCalledWith(
        successPromise,
        {
          loading: 'Loading data...',
          success: 'Data loaded successfully!',
          error: 'Failed to load data',
        },
        undefined
      );
    });

    it('should handle promise toast with custom options', async () => {
      const testPromise = Promise.resolve();
      const options = { duration: 5000 };

      showPromise(testPromise, {
        loading: 'Processing...',
        success: 'Complete!',
        error: 'Failed',
      }, options);

      expect(toast.promise).toHaveBeenCalledWith(
        testPromise,
        {
          loading: 'Processing...',
          success: 'Complete!',
          error: 'Failed',
        },
        options
      );
    });
  });
});