# Error Handling Guide

## Overview

Learning Catalyst uses a **multi-layered error handling strategy** to ensure the application never crashes and users can always recover from errors. This guide covers the complete error handling architecture, patterns, and best practices.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     ERROR FLOW DIAGRAM                          │
└─────────────────────────────────────────────────────────────────┘

Component Error Flow:
┌─────────────┐
│  Component  │  ← JavaScript exception during render/update
│  Throws     │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────┐
│  React ErrorBoundary (Class-based)  │
│  ┌─────────────────────────────────┐│
│  │ Variant Selection:               ││
│  │ • full    → Full screen error    ││
│  │ • inline  → Section error        ││
│  │ • minimal → Inline error         ││
│  └─────────────────────────────────┘│
└──────┬───────────────────────────────┘
       │
       ▼
   ┌──────────────┐
   │ User Sees:   │  ← Error UI with recovery options
   │ • Message    │
   │ • Retry btn  │
   │ • Actions    │
   └──────────────┘

IPC Error Flow (Main → Renderer):
┌─────────────┐
│ Main Process│  ← Service/Handler error
│   Throws    │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────┐
│   serializeIPCError()                │
│   (ipc-error-handler.ts)             │
│   • Converts to IPCErrorPayload      │
│   • Adds channel context             │
│   • Preserves stack trace            │
└──────┬───────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│   enqueueIpcError()                  │
│   (main/index.ts)                    │
│   • Adds to global buffer            │
│   • Sends via IPC channel            │
│   • Queues if renderer not ready     │
└──────┬───────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│   IPC Channel: 'ipc:error'           │
│   (preload/index.ts forwards)        │
└──────┬───────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│   Renderer receives:                 │
│   • ServicesProvider subscribes      │
│   • App.tsx processes errors         │
│   • Toast shows to user              │
└──────┬───────────────────────────────┘
       │
       ▼
   ┌──────────────────┐
   │ User Sees:       │  ← Toast notification
   │ • Error message  │
   │ • Auto-dismiss   │
   └──────────────────┘
```

## Error Types & Classification

### 1. IPCErrorPayload (Main ↔ Renderer Communication)

```typescript
export type IPCErrorPayload = {
  type: 'CONFIG_ERROR' | 'NETWORK_ERROR' | 'SYSTEM_ERROR';
  code: string;           // Unique error code (e.g., 'provider.config.missing_api_key')
  message: string;        // User-facing message
  details?: Record<string, unknown>;  // Additional context
};
```

**When to use**: Errors from main process services, handlers, or cross-process communication failures.

### 2. React Component Errors (UI Layer)

**When to use**: JavaScript exceptions during React render, event handlers, or component lifecycle.

## Error Boundary System

### Primary ErrorBoundary (src/renderer/components/UI/ErrorBoundary.tsx)

The main error boundary used throughout the application. Class-based component with three display variants:

#### Variant: `full`
- **Use for**: Application-level failures, critical errors
- **Display**: Full-screen error with restart options
- **User actions**: Try Again, Restart App, Go to Home

```tsx
<ErrorBoundary variant="full">
  <App />
</ErrorBoundary>
```

#### Variant: `inline`
- **Use for**: Feature section failures (chat, settings, knowledge)
- **Display**: Section-level error with retry
- **User actions**: Retry button, custom actions

```tsx
<ErrorBoundary
  variant="inline"
  title="Chat Error"
  description="The chat encountered an error. Try reloading."
  onRetry={handleChatRetry}
>
  <ChatInterface />
</ErrorBoundary>
```

#### Variant: `minimal`
- **Use for**: Non-critical component failures
- **Display**: Small inline error message
- **User actions**: Optional retry

```tsx
<ErrorBoundary variant="minimal" title="Settings Failed">
  <SettingsPanel />
</ErrorBoundary>
```

### Specialized Boundary Wrappers

#### ComponentErrorBoundary
Pre-configured wrapper for generic component errors:

```tsx
<ComponentErrorBoundary componentName="AI Provider Settings">
  <AIProviderSettings />
</ComponentErrorBoundary>

<ComponentErrorBoundary variant="inline" componentName="Response Settings">
  <ResponseSettings />
</ComponentErrorBoundary>
```

**Features**:
- Auto-generates component-specific titles
- Lightweight fallback UI
- Component name in error logs

#### SettingsErrorBoundary
Specialized for configuration panels with reassurance messaging:

```tsx
<SettingsErrorBoundary onSaveError={handleConfigSaveError}>
  <SettingsPanel />
  <AIProviderSettings />
  <UISettings />
</SettingsErrorBoundary>
```

**Features**:
- Yellow warning theme (not crisis red)
- Message: "Your previous settings are still active"
- Settings-specific recovery guidance

### ProductionErrorBoundary (Available but Not Currently Used)

Located at `src/shared/components/ProductionErrorBoundary.tsx` - Advanced boundary with:

- **Automatic recovery** (up to 3 attempts with exponential backoff)
- **Health monitoring** (memory usage, performance tracking)
- **Performance metrics** recording
- **Event emission** for error analytics

**Status**: Fully implemented but not integrated into current architecture.

## IPC Error Handling

### Creating IPC Errors

```typescript
// In service/handler files
import { createIPCError } from '@/shared/types/ipc-error';

// Configuration errors
throw createIPCError({
  type: 'CONFIG_ERROR',
  code: 'provider.config.missing_api_key',
  message: 'OpenAI API key is required',
  details: {
    section: 'ai.providers.openai',
    guidance: 'Add your API key in Settings > AI Providers'
  }
});

// System errors
throw createIPCError({
  type: 'SYSTEM_ERROR',
  code: 'knowledge.search_failed',
  message: 'Knowledge search temporarily unavailable',
  details: { retryable: true }
});

// Network errors
throw createIPCError({
  type: 'NETWORK_ERROR',
  code: 'content.import_failed',
  message: 'Failed to import content',
  details: { url: 'https://example.com/doc.pdf' }
});
```

### Error Automatic Serialization

All IPC handlers are automatically wrapped with error serialization:

```typescript
// ipc-error-handler.ts
const handleWithError = async (channel, listener) => {
  try {
    return await listener();
  } catch (error) {
    return {
      success: false,
      error: serializeIPCError(error, channel)
    };
  }
};

// This means any throw in your handler is automatically converted
ipcMain.handle('chat:sendMessage', async (event, input) => {
  // Just throw - it will be automatically serialized
  throw new Error('Something went wrong');
  // Becomes: { success: false, error: { type, code, message, details } }
});
```

### Renderer Error Handling

```typescript
// hooks/useElectronAPI.tsx
export function unwrap<T>(response: APIResponse<T>): T {
  if (!response.success) {
    const error = new IPCError(
      errorObj.code,
      errorObj.message,
      errorObj.details
    );
    showError(error.message);  // Auto-show toast
    throw error;  // Re-throw for caller handling
  }
  return response.data;
}

// Usage
try {
  const data = await unwrapAPI(api.sessions.list());
} catch (e) {
  if (e instanceof IPCError && e.code === 'sessions.not_found') {
    // Handle specific error
  }
}
```

## Error Code Reference

### Provider Errors (`provider.*`)
- `provider.config.missing_api_key` - API key not configured
- `provider.auth.required` - Authentication required
- `provider.config.unsupported` - Provider configuration invalid
- `provider.config.chat_missing` - Chat model not configured
- `provider.config.missing` - Provider not configured
- `provider.config.missing_provider_type` - Provider type missing

### Learning Errors (`learning.*`)
- `learning.path_not_found` - Learning path unavailable
- `learning.start_failed` - Failed to start learning session
- `learning.progress_failed` - Failed to update progress
- `learning.complete_failed` - Failed to complete session

### Chat Errors (`chat.*`)
- `chat.generate_title_failed` - Failed to generate session title

### Session Errors (`sessions.*`)
- `sessions.create_failed` - Failed to create session
- `sessions.not_found` - Session not found

### Knowledge Errors (`knowledge.*`)
- `knowledge.ingest_failed` - Failed to ingest knowledge
- `knowledge.search_failed` - Failed to search knowledge
- `knowledge.explore_failed` - Failed to explore concepts
- `knowledge.related_failed` - Failed to find related concepts
- `knowledge.map_failed` - Failed to generate knowledge map

### System Errors (`system.*`)
- `system.report_error_failed` - Failed to report error
- `system.health_check_failed` - Health check failed
- `system.version_failed` - Failed to get version

### Content Errors (`content.*`)
- `content.explore_failed` - Failed to explore content
- `content.import_failed` - Failed to import content
- `content.recommend_failed` - Failed to get recommendations
- `content.search_failed` - Failed to search content

### Analytics Errors (`analytics.*`)
- `analytics.dashboard_failed` - Failed to load dashboard
- `analytics.progress_chart_failed` - Failed to generate progress chart
- `analytics.achievements_failed` - Failed to load achievements

## Best Practices

### 1. Error Boundary Placement

**DO**:
```tsx
// Wrap feature sections
<ErrorBoundary variant="inline" onRetry={refetchData}>
  <ChatInterface />
</ErrorBoundary>

// Wrap individual components
<ComponentErrorBoundary componentName="Settings Panel">
  <SettingsPanel />
</ComponentErrorBoundary>

// Wrap settings panels
<SettingsErrorBoundary onSaveError={handleSaveError}>
  <SettingsPanel />
</SettingsErrorBoundary>
```

**DON'T**:
```tsx
// Don't wrap every small component
<ErrorBoundary><Button /></ErrorBoundary>  // ✗ Too granular

// Don't forget to add recovery
<ErrorBoundary>  // ✗ No onRetry
  <UnreliableComponent />
</ErrorBoundary>

// Don't use wrong variant
<ErrorBoundary variant="full">  // ✗ Too dramatic for minor error
  <Badge />
</ErrorBoundary>
```

### 2. IPC Error Creation

**DO**:
```typescript
// Use specific error codes
throw createIPCError({
  type: 'CONFIG_ERROR',
  code: 'provider.config.missing_api_key',  // Specific
  message: 'OpenAI API key is required',
  details: {
    provider: 'openai',
    guidance: 'Add your API key in Settings > AI Providers'
  }
});

// Include context
throw createIPCError({
  type: 'SYSTEM_ERROR',
  code: 'knowledge.search_failed',
  message: 'Failed to search knowledge base',
  details: {
    query: searchTerm,
    timeout: 5000,
    retryable: true
  }
});
```

**DON'T**:
```typescript
// Don't use generic messages
throw new Error('Something went wrong');  // ✗ Not structured

// Don't omit error codes
createIPCError({
  code: 'unknown',  // ✗ Not helpful
  message: 'Error'
});

// Don't forget details
createIPCError({
  code: 'provider.config.missing_api_key',
  message: 'Missing API key'  // ✗ No guidance
});
```

### 3. Error Recovery

**DO**:
```tsx
// Provide meaningful recovery
const handleRetry = async () => {
  await refetchChatMessages();
  resetChatState();
};

// Check error type before retry
if (error.code === 'network.timeout') {
  await retryWithBackoff();
}
```

**DON'T**:
```tsx
// Don't ignore error types
catch (error) {
  showError('Failed');  // ✗ Not specific
}

// Don't retry forever
while (true) {  // ✗ Infinite loop
  try { await operation(); break; }
  catch { /* retry */ }
}
```

### 4. User Messaging

**DO**:
```typescript
// Clear, actionable messages
'Chat model configuration is missing. Please configure a provider before starting an agent.'
'Knowledge search temporarily unavailable. Please try again.'
'Failed to save settings. Your previous settings are still active.'
```

**DON'T**:
```typescript
// Technical jargon
'IPCErrorException: serializeIPCError failed'  // ✗

// Vague messages
'Something went wrong'  // ✗

// Blame the user
'You did something wrong'  // ✗
```

## Testing Error Handling

### Testing Error Boundaries

```tsx
// __tests__/my-component.error-boundary.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from '@/renderer/components/UI/ErrorBoundary';

const ThrowError = ({ shouldThrow = true }) => {
  if (shouldThrow) throw new Error('Test error');
  return <div>No error</div>;
};

it('catches errors and displays error UI', () => {
  render(
    <ErrorBoundary>
      <ThrowError />
    </ErrorBoundary>
  );

  expect(screen.getByText('Application Error')).toBeInTheDocument();
});

it('has a retry button that resets error state', () => {
  const onRetry = vi.fn();
  render(
    <ErrorBoundary onRetry={onRetry}>
      <ThrowError />
    </ErrorBoundary>
  );

  fireEvent.click(screen.getByText('Try Again'));
  expect(onRetry).toHaveBeenCalled();
});
```

### Testing IPC Errors

```tsx
// __tests__/my-service.test.ts
import { createIPCError } from '@/shared/types/ipc-error';

it('throws IPC error for missing config', () => {
  expect(() => {
    requireChatConfig();
  }).toThrow(createIPCError({
    type: 'CONFIG_ERROR',
    code: 'provider.config.chat_missing'
  }));
});
```

## Debugging Tips

### 1. Finding Error Sources

**Main Process Errors**:
```bash
# Check main process logs
Console: [main][IPC] chat:sendMessage failed
```

**Renderer Errors**:
```bash
# Check renderer logs
Console: Error caught by enhanced boundary
```

### 2. Error IDs

All errors have unique IDs for tracking:

```tsx
// In error boundary
const errorId = `error_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

// Use in support tickets
Error ID: error_1701234567890_abc123def
```

### 3. Development vs Production

**Development**:
- Full stack traces visible
- Component stack included
- Console logging enabled

**Production**:
- User-friendly messages only
- Error IDs for support
- Optional remote logging

## Integration Examples

### Complete Feature Error Handling

```tsx
// Feature: Chat Interface
export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = async (text: string) => {
    try {
      setError(null);
      const response = await unwrapAPI(api.chat.sendMessage({ text }));
      setMessages(response.messages);
    } catch (e) {
      if (e instanceof IPCError) {
        setError(e.message);  // Show inline error
      }
    }
  };

  return (
    <ErrorBoundary
      variant="inline"
      title="Chat Error"
      description="The chat encountered an error. Try again."
      onRetry={() => sendMessage(lastMessage)}
    >
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded">
          {error}
        </div>
      )}
      <MessageList messages={messages} />
      <MessageInput onSend={sendMessage} />
    </ErrorBoundary>
  );
}
```

### Complete Service Error Handling

```typescript
// Service: Chat Service
export const createChatService = ({ db, logger }) => {
  return {
    async sendMessage(input: ChatInput): Promise<ChatResponse> {
      try {
        // Validate input
        if (!input.text?.trim()) {
          throw createIPCError({
            type: 'SYSTEM_ERROR',
            code: 'chat.invalid_input',
            message: 'Message text is required',
            details: { field: 'text' }
          });
        }

        // Process message
        const response = await processMessage(input);

        return { success: true, data: response };
      } catch (error) {
        // Log for debugging
        logger.error('Failed to send message', { error, input });

        // Re-throw IPC errors as-is
        if (isIPCErrorPayload(error)) {
          throw error;
        }

        // Convert unknown errors
        throw createIPCError({
          type: 'SYSTEM_ERROR',
          code: 'chat.send_failed',
          message: 'Failed to send message',
          details: { originalError: error.message }
        });
      }
    }
  };
};
```

## Summary

- **Multi-layered**: Error boundaries for UI, IPC for cross-process
- **Structured**: All errors have type, code, message, and details
- **User-friendly**: Clear messages with recovery guidance
- **Developer-friendly**: Full context in development mode
- **Testable**: Comprehensive test patterns for all error scenarios

For questions or improvements, see the main [Architecture Documentation](../ARCHITECTURE.md).
