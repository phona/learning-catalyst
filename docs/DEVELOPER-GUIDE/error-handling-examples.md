# Error Handling Code Examples

## Copy-Paste Templates for Common Scenarios

This guide provides ready-to-use code examples for implementing error handling in Learning Catalyst.

---

## 1. Service Layer Error Handling

### Example: Chat Service with Proper Error Handling

```typescript
// src/main/services/domain/chat/chat-service.ts
import { createIPCError } from '@/shared/types/ipc-error';

export const createChatService = ({ db, logger }) => {
  return {
    async sendMessage(input: ChatInput): Promise<ChatResponse> {
      try {
        // 1. Validate input
        if (!input?.text?.trim()) {
          throw createIPCError({
            type: 'SYSTEM_ERROR',
            code: 'chat.invalid_input',
            message: 'Message text is required',
            details: { field: 'text', value: input?.text }
          });
        }

        if (!input.sessionId) {
          throw createIPCError({
            type: 'SYSTEM_ERROR',
            code: 'sessions.not_found',
            message: 'Session ID is required',
            details: { operation: 'sendMessage' }
          });
        }

        // 2. Check if session exists
        const session = await db.selectFrom('sessions')
          .where('id', '=', input.sessionId)
          .selectAll()
          .executeTakeFirst();

        if (!session) {
          throw createIPCError({
            type: 'SYSTEM_ERROR',
            code: 'sessions.not_found',
            message: 'Session not found',
            details: { sessionId: input.sessionId }
          });
        }

        // 3. Process message
        const response = await processMessageWithAI(input);

        // 4. Save to database
        await db.insertInto('messages')
          .values({
            sessionId: input.sessionId,
            content: input.text,
            role: 'user',
            timestamp: new Date()
          })
          .execute();

        return {
          success: true,
          data: {
            message: response,
            sessionId: input.sessionId
          }
        };

      } catch (error) {
        // Log for debugging
        logger.error('Failed to send message', {
          error,
          input,
          sessionId: input?.sessionId
        });

        // Re-throw IPC errors as-is
        if (error && typeof error === 'object' && 'type' in error) {
          throw error;
        }

        // Convert unknown errors
        throw createIPCError({
          type: 'SYSTEM_ERROR',
          code: 'chat.send_failed',
          message: 'Failed to send message',
          details: {
            originalError: error instanceof Error ? error.message : String(error),
            sessionId: input?.sessionId
          }
        });
      }
    },

    async generateTitle(firstMessage: string): Promise<string> {
      try {
        if (!firstMessage?.trim()) {
          throw createIPCError({
            type: 'SYSTEM_ERROR',
            code: 'chat.generate_title_failed',
            message: 'First message is required for title generation',
            details: { field: 'firstMessage' }
          });
        }

        const title = await aiService.generateTitle(firstMessage);
        return title;

      } catch (error) {
        // Log error
        console.error('Title generation failed:', error);

        // Return fallback title instead of throwing
        // (title generation is not critical)
        if (error && typeof error === 'object' && 'type' in error) {
          // IPC error - log but don't throw for non-critical operation
          logger.warn('Title generation failed, using fallback', {
            error,
            firstMessage: firstMessage?.substring(0, 50)
          });
          return 'New Chat';
        }

        // Unknown error - use fallback
        return 'New Chat';
      }
    }
  };
};
```

---

### Example: Knowledge Service with Retry Logic

```typescript
// src/main/services/domain/knowledge/knowledge-service.ts
import { createIPCError } from '@/shared/types/ipc-error';

export const createKnowledgeService = ({ db, }) => {
  vectorStore, logger const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000; // 1 second

  const withRetry = async <T>(
    operation: () => Promise<T>,
    operationName: string,
    details: Record<string, unknown> = {}
  ): Promise<T> => {
    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        logger.warn(`${operationName} failed (attempt ${attempt}/${MAX_RETRIES})`, {
          error,
          attempt,
          ...details
        });

        if (attempt < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt));
        }
      }
    }

    // All retries exhausted
    throw createIPCError({
      type: 'SYSTEM_ERROR',
      code: `knowledge.${operationName.toLowerCase()}_failed`,
      message: `${operationName} failed after ${MAX_RETRIES} attempts`,
      details: {
        ...details,
        attempts: MAX_RETRIES,
        lastError: lastError instanceof Error ? lastError.message : String(lastError),
        retryable: false
      }
    });
  };

  return {
    async search(query: string, limit: number = 10) {
      return withRetry(
        async () => {
          if (!query?.trim()) {
            throw createIPCError({
              type: 'SYSTEM_ERROR',
              code: 'knowledge.search_failed',
              message: 'Search query is required',
              details: { query }
            });
          }

          const results = await vectorStore.search(query, limit);
          return results;
        },
        'Search',
        { query, limit }
      );
    },

    async ingestDocument(content: string, metadata: DocumentMetadata) {
      return withRetry(
        async () => {
          if (!content?.trim()) {
            throw createIPCError({
              type: 'SYSTEM_ERROR',
              code: 'knowledge.ingest_failed',
              message: 'Document content is required',
              details: { documentId: metadata.id }
            });
          }

          const conceptId = await vectorStore.ingest(content, metadata);
          await db.insertInto('concepts')
            .values({
              id: conceptId,
              content,
              metadata: JSON.stringify(metadata),
              createdAt: new Date()
            })
            .execute();

          return { conceptId };
        },
        'IngestDocument',
        { documentId: metadata.id, contentLength: content.length }
      );
    }
  };
};
```

---

## 2. IPC Handler Error Handling

### Example: Chat IPC Handler

```typescript
// src/main/handlers/chat-handlers.ts
import { ipcMain } from 'electron';

export const setupChatHandlers = (services) => {
  ipcMain.handle('chat:sendMessage', async (event, input) => {
    try {
      // Validation
      if (!input || typeof input !== 'object') {
        throw createIPCError({
          type: 'SYSTEM_ERROR',
          code: 'chat.invalid_input',
          message: 'Invalid input provided',
          details: { inputType: typeof input }
        });
      }

      const result = await services.chatService.sendMessage(input);

      // Return success result (will be wrapped by handleWithError)
      return result;

    } catch (error) {
      // Log the error
      console.error('[chat:sendMessage] Error:', error);

      // Re-throw to be handled by handleWithError wrapper
      throw error;
    }
  });

  ipcMain.handle('chat:generate-title', async (event, messageText) => {
    try {
      if (typeof messageText !== 'string') {
        throw createIPCError({
          type: 'SYSTEM_ERROR',
          code: 'chat.generate_title_failed',
          message: 'Message text must be a string',
          details: { type: typeof messageText }
        });
      }

      const title = await services.chatService.generateTitle(messageText);
      return { title };

    } catch (error) {
      console.error('[chat:generate-title] Error:', error);
      throw error; // Will be serialized by handleWithError
    }
  });
};
```

---

## 3. Renderer Component Error Boundaries

### Example: Feature with Error Boundary

```tsx
// src/renderer/components/Chat/ChatInterface.tsx
import React, { useState } from 'react';
import { ErrorBoundary } from '@/renderer/components/UI/ErrorBoundary';
import { useElectronAPI } from '@/renderer/hooks/useElectronAPI';
import { unwrapAPI } from '@/renderer/hooks/useElectronAPI';

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const api = useElectronAPI();

  const sendMessage = async (text: string) => {
    try {
      if (!text.trim()) {
        alert('Please enter a message'); // Simple validation
        return;
      }

      // Show loading state
      const loadingToast = toast.loading('Sending message...');

      // Send message via IPC
      const response = await unwrapAPI(api.chat.sendMessage({
        text,
        sessionId: currentSessionId
      }));

      // Update messages
      setMessages(prev => [...prev, response.data.message]);

      // Clear input
      setInput('');

      // Dismiss loading toast
      toast.dismiss(loadingToast);

    } catch (error) {
      if (error instanceof IPCError) {
        // Error already shown via unwrapAPI toast
        console.error('Chat error:', error);
        // Optionally handle specific errors
        if (error.code === 'sessions.not_found') {
          // Handle session not found
          await createNewSession();
        }
      } else {
        // Unexpected error
        toast.error('An unexpected error occurred');
        console.error('Unexpected error:', error);
      }
    }
  };

  const retryLastMessage = async () => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage) {
      await sendMessage(lastMessage.content);
    }
  };

  return (
    <ErrorBoundary
      variant="inline"
      title="Chat Error"
      description="The chat encountered an error. Your messages are safe."
      onRetry={retryLastMessage}
      showRetry={messages.length > 0}
    >
      <div className="chat-interface">
        <MessageList messages={messages} />
        <MessageInput
          value={input}
          onChange={setInput}
          onSend={sendMessage}
          placeholder="Type your message..."
        />
      </div>
    </ErrorBoundary>
  );
}
```

---

### Example: Settings Panel with Error Boundaries

```tsx
// src/renderer/components/Settings/SettingsPanel.tsx
import React from 'react';
import { SettingsErrorBoundary } from '@/renderer/components/UI/SettingsErrorBoundary';
import { ComponentErrorBoundary } from '@/renderer/components/UI/ComponentErrorBoundary';

export function SettingsPanel() {
  const handleSaveError = (error: Error) => {
    console.error('Settings save error:', error);
    // Could send to analytics, show specific error UI, etc.
  };

  return (
    <SettingsErrorBoundary onSaveError={handleSaveError}>
      <div className="settings-panel">
        <h2>Application Settings</h2>

        {/* AI Provider Settings - isolated with its own boundary */}
        <ComponentErrorBoundary componentName="AI Provider Settings">
          <AIProviderSettings />
        </ComponentErrorBoundary>

        {/* Response Settings */}
        <ComponentErrorBoundary componentName="Response Settings">
          <ResponseSettings />
        </ComponentErrorBoundary>

        {/* UI Settings */}
        <ComponentErrorBoundary componentName="UI Settings">
          <UISettings />
        </ComponentErrorBoundary>

        {/* Advanced Settings */}
        <ComponentErrorBoundary componentName="Advanced Settings">
          <AdvancedSettings />
        </ComponentErrorBoundary>
      </div>
    </SettingsErrorBoundary>
  );
}

// Individual settings components
function AIProviderSettings() {
  // Component implementation
  return <div>AI Provider Settings UI</div>;
}

function ResponseSettings() {
  // Component implementation
  return <div>Response Settings UI</div>;
}
```

---

### Example: Knowledge Graph with Error Boundary

```tsx
// src/renderer/components/Knowledge/KnowledgeGraph.tsx
import React, { useState } from 'react';
import { ErrorBoundary } from '@/renderer/components/UI/ErrorBoundary';
import { useKnowledgeSearch } from '@/renderer/hooks/useKnowledgeSearch';

export function KnowledgeGraph() {
  const [searchQuery, setSearchQuery] = useState('');
  const { search, results, loading, error } = useKnowledgeSearch();

  const handleSearch = async (query: string) => {
    try {
      await search(query);
    } catch (err) {
      // Error is handled by the hook and shown via toast
      console.error('Search failed:', err);
    }
  };

  return (
    <ErrorBoundary
      variant="inline"
      title="Knowledge Graph Error"
      description="Failed to load knowledge graph. Try refreshing."
      onRetry={() => search(searchQuery)}
    >
      <div className="knowledge-graph">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          onSearch={handleSearch}
          placeholder="Search knowledge..."
        />

        {loading && (
          <div className="loading-state">
            <Spinner />
            <p>Searching knowledge base...</p>
          </div>
        )}

        {error && (
          <div className="error-state p-4 bg-red-50 border border-red-200 rounded">
            <p className="text-red-800">
              {error instanceof IPCError ? error.message : 'Search failed'}
            </p>
            <button
              onClick={() => handleSearch(searchQuery)}
              className="mt-2 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Retry Search
            </button>
          </div>
        )}

        {results && results.length > 0 && (
          <KnowledgeMap concepts={results} />
        )}
      </div>
    </ErrorBoundary>
  );
}
```

---

## 4. Custom Hook with Error Handling

### Example: useAsyncOperation Hook

```typescript
// src/renderer/hooks/useAsyncOperation.ts
import { useState, useCallback } from 'react';
import { IPCError } from '@/renderer/hooks/useElectronAPI';
import { toast } from 'react-hot-toast';

interface UseAsyncOperationOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: IPCError) => void;
  showToast?: boolean;
  successMessage?: string;
}

export function useAsyncOperation<T, Args extends unknown[]>(
  operation: (...args: Args) => Promise<T>,
  options: UseAsyncOperationOptions<T> = {}
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<IPCError | null>(null);

  const { onSuccess, onError, showToast = true, successMessage } = options;

  const execute = useCallback(
    async (...args: Args): Promise<T | null> => {
      setLoading(true);
      setError(null);

      try {
        const result = await operation(...args);

        if (successMessage && showToast) {
          toast.success(successMessage);
        }

        onSuccess?.(result);
        return result;

      } catch (err) {
        const ipcError = err instanceof IPCError
          ? err
          : new IPCError('unknown', 'An unexpected error occurred');

        setError(ipcError);

        if (showToast) {
          toast.error(ipcError.message);
        }

        onError?.(ipcError);
        return null;

      } finally {
        setLoading(false);
      }
    },
    [operation, onSuccess, onError, showToast, successMessage]
  );

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
  }, []);

  return {
    execute,
    loading,
    error,
    reset
  };
}

// Usage example:
function MyComponent() {
  const { execute, loading, error } = useAsyncOperation(
    async (userId: string) => {
      return await api.users.getProfile(userId);
    },
    {
      successMessage: 'Profile loaded',
      onError: (err) => {
        if (err.code === 'users.not_found') {
          // Handle specific error
        }
      }
    }
  );

  const handleLoadProfile = async () => {
    await execute('user-123');
  };

  return (
    <div>
      <button onClick={handleLoadProfile} disabled={loading}>
        {loading ? 'Loading...' : 'Load Profile'}
      </button>
      {error && <p className="error">{error.message}</p>}
    </div>
  );
}
```

---

## 5. Testing Error Scenarios

### Example: Testing Service Errors

```typescript
// src/main/services/domain/chat/__tests__/chat-service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createChatService } from '../chat-service';
import { createIPCError } from '@/shared/types/ipc-error';

describe('ChatService', () => {
  let mockDb: any;
  let mockLogger: any;
  let chatService: ReturnType<typeof createChatService>;

  beforeEach(() => {
    mockDb = {
      selectFrom: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      selectAll: vi.fn().mockReturnThis(),
      executeTakeFirst: vi.fn(),
      insertInto: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      execute: vi.fn(),
    };
    mockLogger = {
      error: vi.fn(),
      warn: vi.fn(),
    };
    chatService = createChatService({ db: mockDb, logger: mockLogger });
  });

  describe('sendMessage', () => {
    it('throws IPC error for missing message text', async () => {
      await expect(
        chatService.sendMessage({ text: '', sessionId: 'session-123' })
      ).rejects.toThrow(createIPCError({
        type: 'SYSTEM_ERROR',
        code: 'chat.invalid_input',
        message: 'Message text is required'
      }));
    });

    it('throws IPC error for missing session ID', async () => {
      await expect(
        chatService.sendMessage({ text: 'Hello', sessionId: '' })
      ).rejects.toThrow(createIPCError({
        type: 'SYSTEM_ERROR',
        code: 'sessions.not_found',
        message: 'Session ID is required'
      }));
    });

    it('throws IPC error for non-existent session', async () => {
      mockDb.executeTakeFirst.mockResolvedValue(null);

      await expect(
        chatService.sendMessage({ text: 'Hello', sessionId: 'session-123' })
      ).rejects.toThrow(createIPCError({
        type: 'SYSTEM_ERROR',
        code: 'sessions.not_found',
        message: 'Session not found',
        details: { sessionId: 'session-123' }
      }));
    });

    it('successfully sends message for valid input', async () => {
      // Arrange
      const session = { id: 'session-123', title: 'Test Session' };
      mockDb.executeTakeFirst.mockResolvedValue(session);
      vi.spyOn(aiService, 'processMessage').mockResolvedValue('Hello!');
      vi.spyOn(db, 'insertInto').mockReturnThis();
      vi.spyOn(db, 'values').mockReturnThis();
      vi.spyOn(db, 'execute').mockResolvedValue(undefined);

      // Act
      const result = await chatService.sendMessage({
        text: 'Hello',
        sessionId: 'session-123'
      });

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.message).toBe('Hello!');
    });
  });
});
```

---

### Example: Testing Error Boundaries

```tsx
// src/renderer/components/__tests__/ChatInterface.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ChatInterface } from '../ChatInterface';
importronAPI } from { createMockElect '@/test/utils/mocks';

vi.mock('@/renderer/hooks/useElectronAPI', () => ({
  useElectronAPI: () => createMockElectronAPI(),
  unwrapAPI: vi.fn((promise) => promise),
}));

describe('ChatInterface Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows error message when sendMessage fails', async () => {
    const mockApi = createMockElectronAPI();
    mockApi.chat.sendMessage.mockResolvedValue({
      success: false,
      error: {
        type: 'SYSTEM_ERROR',
        code: 'sessions.not_found',
        message: 'Session not found'
      }
    });

    vi.mocked(useElectronAPI).mockReturnValue(mockApi);

    render(<ChatInterface />);

    const input = screen.getByPlaceholderText('Type your message...');
    const sendButton = screen.getByText('Send');

    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      // Error is shown via toast, which we can't easily test
      // But the component shouldn't crash
      expect(screen.getByTestId('chat-interface')).toBeInTheDocument();
    });
  });

  it('recovers from error when retry is clicked', async () => {
    let callCount = 0;
    const mockApi = createMockElectronAPI();
    mockApi.chat.sendMessage.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // First call fails
        return Promise.reject(new Error('Network error'));
      } else {
        // Second call succeeds
        return Promise.resolve({
          success: true,
          data: { message: { id: 'msg-1', content: 'Test', role: 'user' } }
        });
      }
    });

    vi.mocked(useElectronAPI).mockReturnValue(mockApi);

    render(<ChatInterface />);

    // Trigger error
    const input = screen.getByPlaceholderText('Type your message...');
    fireEvent.change(input, { target: { value: 'Test' } });
    fireEvent.click(screen.getByText('Send'));

    // Wait and retry
    await waitFor(() => {
      const retryButton = screen.getByText('Retry');
      fireEvent.click(retryButton);
    });

    // Should have been called twice (original + retry)
    expect(callCount).toBe(2);
  });
});
```

---

## 6. Global Error Handler Setup

### Example: Main Process Error Handling

```typescript
// src/main/index.ts
import { app } from 'electron';
import { serializeIPCError } from '@/main/handlers/ipc-error-handler';

// Global error handler for unhandled exceptions
process.on('uncaughtException', (error: Error) => {
  console.error('Uncaught Exception:', error);

  const payload = serializeIPCError(error, 'main:uncaughtException');

  // Send to renderer if window exists
  if (win && !win.webContents.isDestroyed()) {
    win.webContents.send('ipc:error', payload);
  }

  // Optionally log to file or external service
  // logToFile(payload);
});

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', (reason: unknown) => {
  console.error('Unhandled Rejection:', reason);

  const error = reason instanceof Error ? reason : new Error(String(reason));
  const payload = serializeIPCError(error, 'main:unhandledRejection');

  if (win && !win.webContents.isDestroyed()) {
    win.webContents.send('ipc:error', payload);
  }
});
```

---

## Summary Checklist

✅ **Service Layer**:
- Validate all inputs
- Use appropriate error codes
- Include relevant details
- Log errors with context
- Re-throw IPC errors, convert others

✅ **IPC Handlers**:
- Keep handlers simple
- Throw errors to be caught by handleWithError
- Don't catch and log unless necessary

✅ **Renderer Components**:
- Wrap features in ErrorBoundary
- Choose appropriate variant (full/inline/minimal)
- Provide onRetry callbacks
- Use ComponentErrorBoundary for individual components
- Use SettingsErrorBoundary for settings panels

✅ **Custom Hooks**:
- Handle errors gracefully
- Provide retry mechanisms
- Show user-friendly messages

✅ **Testing**:
- Test error scenarios
- Test error boundary recovery
- Verify error codes and messages
- Test retry logic

---

For more examples and patterns, see:
- [Error Handling Guide](./error-handling.md)
- [Error Codes Quick Reference](./error-codes-quick-reference.md)
