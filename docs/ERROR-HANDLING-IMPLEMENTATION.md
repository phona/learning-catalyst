# Error Handling System Implementation

## Overview

This document describes the implementation of a comprehensive error handling system for the Learning Catalyst application. The system provides robust initialization error handling with mutual exclusion between ready and error events, ensuring deterministic behavior during startup.

## Architecture

### System Components

1. **Main Process Exclusion Logic** (`src/main/index.ts`)
   - State machine managing initialization state
   - Timeout mechanism (30 seconds default)
   - Guarded event emission (ready/error)
   - Atomic initialization flow

2. **Renderer Error Routing** (`src/renderer/hooks/useInitializationState.ts`)
   - Custom hook for listening to initialization events
   - Error type-based routing (SYSTEM_ERROR → crash, CONFIG_ERROR → config)
   - Exclusive state management

3. **Error Boundary with Crash Support** (`src/renderer/components/UI/ErrorBoundary.tsx`)
   - Enhanced to display crash pages for system errors
   - Priority handling: crashError > React errors
   - Restart mechanisms with fallbacks

4. **Setup Page** (`src/renderer/components/Setup/SetupPage.tsx`)
   - Loading screen during initialization
   - Progress tracking and timeout handling
   - Retry mechanism for slow initialization

5. **App Integration** (`src/renderer/App.tsx`)
   - Wraps application with error boundary
   - Routes based on initialization state
   - Backward compatible with existing logic

## Key Features

### 1. Mutual Exclusion

**Main Process:**
- State machine: `PENDING` → `READY` | `FAILED`
- Once terminal state reached, no further transitions
- Guards prevent double event emission

**Renderer:**
- Only accepts events while in `setup` state
- Ignores events after transitioning to `ready` or `crashed`
- Deterministic state transitions

### 2. Timeout Mechanism

**Default Timeout:** 30 seconds
- Configurable via `INITIALIZATION_TIMEOUT_MS`
- Triggers system error if initialization hangs
- Cleared on successful initialization

**Renderer Timeout:**
- Setup page shows progress bar
- Displays retry option after timeout
- Allows user to restart initialization

### 3. Error Classification

**SYSTEM_ERROR** → Crash Page
- Critical initialization failures
- Database connection errors
- Service initialization errors
- Shows full crash page with restart option

**CONFIG_ERROR** → Setup Page
- Missing configuration
- API key not configured
- Returns to setup screen

**NETWORK_ERROR** → Toast Notification
- Transient network issues
- Non-critical errors
- User can retry operation

### 4. State Flow

```
App Start
    ↓
Setup Page (show spinner)
    ↓
Main Process Initialization
    ├─ Success → sendInitializationSuccess() → Ready State
    └─ Failure → sendInitializationError() → Crashed State
          ↓
    ErrorBoundary (full variant)
          ↓
    Crash Page UI
```

## Implementation Details

### Main Process State Machine

```typescript
enum InitializationState {
  PENDING = 'pending',  // Initial state
  READY = 'ready',      // All services initialized
  FAILED = 'failed',    // Initialization failed
}

let initializationState: InitializationState = InitializationState.PENDING;
```

**Guarded Event Emission:**

```typescript
function sendInitializationSuccess(payload: SystemReadyPayload): boolean {
  // Only send if in PENDING state
  if (initializationState !== InitializationState.PENDING) {
    return false;  // Blocked
  }

  // Transition to READY
  initializationState = InitializationState.READY;

  // Send event
  win.webContents.send(IPC_EVENTS.SYSTEM_READY, payload);
  return true;
}
```

### Renderer State Management

```typescript
const { appState, crashError, readyPayload } = useInitializationState();

// State transitions:
if (appState === 'setup') return <SetupPage />;
if (appState === 'crashed') return <ErrorBoundary crashError={crashError} />;
if (appState === 'ready') return <MainApp />;
```

### Error Boundary Priority

1. **Priority 1:** `crashError` prop → Crash page
2. **Priority 2:** React component error → Error boundary UI
3. **Priority 3:** Children render normally

## Benefits

### 1. Deterministic Behavior
- No race conditions between ready and error events
- Single source of truth for initialization state
- Predictable state transitions

### 2. User Experience
- Clear visual feedback during initialization
- Informative crash pages with error details
- Easy restart mechanism
- Progress tracking

### 3. Developer Experience
- Comprehensive logging at all levels
- State guards prevent invalid transitions
- Easy to test and debug
- Type-safe error handling

### 4. Robustness
- Timeout prevents infinite loading
- Graceful degradation for missing API
- Fallback mechanisms for restart
- No crashes, always recoverable

## Testing

### Test Coverage

1. **useInitializationState Hook** (`__tests__/useInitializationState.test.ts`)
   - State transitions
   - Event exclusion
   - Error routing
   - Reset functionality

2. **ErrorBoundary Component** (`__tests__/ErrorBoundary.test.tsx`)
   - Crash page rendering
   - Restart mechanisms
   - Development/production modes
   - Priority handling

3. **SetupPage Component** (`__tests__/SetupPage.test.tsx`)
   - Progress tracking
   - Timeout handling
   - Retry mechanisms
   - Time formatting

### Running Tests

```bash
npm test -- useInitializationState
npm test -- ErrorBoundary
npm test -- SetupPage
```

## Configuration

### Main Process

```typescript
// Timeout configuration
const INITIALIZATION_TIMEOUT_MS = 30000;  // 30 seconds

// State variable (module-level)
let initializationState: InitializationState = InitializationState.PENDING;
```

### Renderer

```typescript
// Hook usage
const { appState, crashError } = useInitializationState();

// Setup page configuration
<SetupPage
  timeoutMs={30000}
  onTimeout={() => setShowRetry(true)}
  onRetry={() => window.location.reload()}
/>

// Error boundary configuration
<ErrorBoundary
  variant="full"
  crashError={systemError}
  onRestart={() => window.location.reload()}
/>
```

## Error Codes

### Main Process Errors

- `initialization.timeout` - Initialization timed out
- `initialization.unhandled` - Unhandled error during initialization
- `renderer.electronAPI.missing` - Electron API not available

### System Errors (Examples)

- `database.connection.failed` - Cannot connect to database
- `service.unavailable` - Required service not available
- `config.invalid` - Invalid configuration

### Configuration Errors

- `config.missing_api_key` - API key not configured
- `config.provider.unset` - AI provider not selected

## Migration Guide

### Existing Code

The implementation is **backward compatible**. Existing error handling continues to work:

- Config validation logic preserved
- Existing SetupScreen component still used
- IPC error handling unchanged

### New Code

Use the new system for initialization phase:

```typescript
// New pattern
const { appState, crashError } = useInitializationState();

if (appState === 'setup') return <SetupPage />;
if (appState === 'crashed') return <ErrorBoundary crashError={crashError} />;
```

## Best Practices

### 1. Error Classification
- Use `SYSTEM_ERROR` for critical failures
- Use `CONFIG_ERROR` for missing configuration
- Use `NETWORK_ERROR` for transient issues

### 2. Error Messages
- Provide clear, user-friendly messages
- Include error codes for debugging
- Add context in error details

### 3. Recovery Mechanisms
- Always provide restart option for system errors
- Make retry mechanisms available
- Preserve user data on crash

### 4. Testing
- Test all state transitions
- Verify timeout behavior
- Test error routing logic
- Validate exclusion guarantees

## Future Enhancements

### Potential Improvements

1. **Error Reporting**
   - Integrate with error tracking service
   - Automatic crash reporting
   - User feedback collection

2. **Recovery Strategies**
   - Automatic retry for transient errors
   - Partial recovery for non-critical services
   - Offline mode support

3. **Monitoring**
   - Initialization metrics
   - Error rate tracking
   - Performance monitoring

4. **User Experience**
   - More detailed progress indicators
   - Better error explanations
   - Guided recovery workflows

## Conclusion

The error handling system provides a robust foundation for initialization error management. With mutual exclusion, timeout handling, and clear user feedback, it ensures a reliable startup experience while maintaining developer productivity through comprehensive testing and logging.
