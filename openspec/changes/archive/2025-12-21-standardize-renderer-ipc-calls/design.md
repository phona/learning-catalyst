# Technical Design: Standardize Renderer IPC Calls

## Architecture

### Current Flow (Buggy)
```
electronAPI.someMethod()
  ↓
Main Process Handler
  ↓
IPC Proxy wraps: {success: true, data: T, timestamp: Date}
  ↓
Renderer Service
  ↓
Manual unwrapping: const data = response?.data || []
  ↓
Component receives clean data (if unwrapping correct)
```

**Problem**: Manual unwrapping is inconsistent and error-prone.

### Target Flow (Standardized)
```
electronAPI.someMethod()
  ↓
Main Process Handler
  ↓
IPC Proxy wraps: {success: true, data: T, timestamp: Date}
  ↓
Renderer Service
  ↓
Automatic unwrapping: await unwrapAPI(response)
  ↓
Component receives clean data
```

**Solution**: `unwrapAPI` helper handles all unwrapping consistently.

## Implementation Details

### unwrapAPI Helper

From `@/renderer/hooks/useElectronAPI.tsx`:

```typescript
export function unwrapAPI<T>(
  responsePromise: Promise<APIResponse<T>>,
  options: IPCCallOptions = {}
): Promise<T> {
  return responsePromise.then((response) => {
    if (!response.success) {
      const errorMessage = response.error ?? 'unknown error';

      // Show toast unless silent
      if (!options.silent) {
        showError(errorMessage);
      }

      // Throw for caller handling
      throw new IPCError(
        response.code ?? 'UNKNOWN_ERROR',
        errorMessage,
      );
    }

    return response.data as T;
  });
}
```

### Service Pattern

**Before:**
```typescript
const response = await electronAPI.someMethod(...);
const data = response?.data || [];
return { success: response?.success === true, data };
```

**After:**
```typescript
try {
  const data = await unwrapAPI(electronAPI.someMethod(...));
  return { success: true, data };
} catch (error) {
  return {
    success: false,
    error: {
      code: 'METHOD_ERROR',
      message: error.message,
    },
  };
}
```

### Error Handling

- **Automatic Toasts**: `unwrapAPI` shows error toasts by default
- **Silent Mode**: `{silent: true}` suppresses toasts for background operations
- **Structured Errors**: `IPCError` with code and message for programmatic handling
- **Component Safety**: No more object rendering errors

## Migration Strategy

### Phase 1: Critical Services
1. **File Service** - Prevents object rendering errors
2. **Chat Service** - Core user interaction

### Phase 2: High-Usage Services
3. **Session Service** - Frequent IPC calls
4. **Settings Service** - User configuration
5. **Analytics Service** - Progress tracking

### Phase 3: Other Services
6. Remaining service files

### Testing Strategy

1. **Unit Tests**: Verify `unwrapAPI` usage
2. **Integration Tests**: Test IPC flow end-to-end
3. **Error Scenarios**: Verify error handling and toasts
4. **Type Safety**: TypeScript validation

## Code Examples

### File Service Update
```typescript
// src/renderer/services/file/file-service.ts
import { unwrapAPI } from '@/renderer/hooks/useElectronAPI';

const readDirectory = async (...): Promise<FileOperationResult<DirectoryScanResult[]>> => {
  try {
    const items = await unwrapAPI(
      electronAPI.readDirectory(dirPath, recursive, maxDepth, filterConfig)
    );

    return {
      success: true,
      data: Array.isArray(items) ? items : [],
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'READ_DIRECTORY_ERROR',
        message: error.message,
      },
    };
  }
};
```

### Chat Service Update
```typescript
// src/renderer/services/chat/chat-service.ts
const getMessages = async (threadId: string) => {
  try {
    const messages = await unwrapAPI(electronAPI.chat.getMessages(threadId));
    return { success: true, data: messages };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
```

### Component Usage
```typescript
// src/renderer/components/MyComponent.tsx
const electronAPI = useElectronAPI();

const handleClick = async () => {
  try {
    const data = await unwrapAPI(electronAPI.someMethod(...));
    // Use clean data
  } catch (error) {
    if (error instanceof IPCError) {
      // Handle specific error code
    }
  }
};
```

## Validation

### Search Patterns to Verify Migration

```bash
# Should find NO manual unwrapping:
rg "response\?\.data" src/renderer --type ts --type tsx

# Should find unwrapAPI usage:
rg "unwrapAPI" src/renderer --type ts --type tsx

# Should find consistent error handling:
rg "IPCError" src/renderer --type ts --type tsx
```

### Test Checklist

- [ ] File service reads directories without errors
- [ ] Chat service sends messages correctly
- [ ] Error toasts display on failures
- [ ] Silent mode suppresses background error toasts
- [ ] Components render data without object errors
- [ ] TypeScript validates all IPC calls

## Risks & Mitigations

### Risk: Breaking Existing Error Handling
**Mitigation**: `unwrapAPI` throws `IPCError` which existing try/catch can handle

### Risk: Missing Error Toasts
**Mitigation**: `unwrapAPI` shows toasts by default, use `{silent: true}` only when intentional

### Risk: Type Safety Issues
**Mitigation**: TypeScript ensures proper generic usage of `unwrapAPI<T>`

## Rollback Plan

If issues arise:
1. Revert service file changes
2. Keep `unwrapAPI` helper (it's useful)
3. Document specific failure points
4. Apply changes incrementally by service
