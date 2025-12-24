# Design: Chat Navigation from Sidebar

## Overview
This document describes the technical design for fixing chat session navigation from the sidebar when on non-chat pages.

## Current Architecture

### Thread List Sidebar
```typescript
// src/renderer/widgets/layout/ThreadListSidebar.tsx

const ThreadListItem: React.FC = () => {
  return (
    <ThreadListItemPrimitive.Root ...>
      <ThreadListItemPrimitive.Trigger ...>
        <ThreadListItemPrimitive.Title fallback="New Chat" />
      </ThreadListItemPrimitive.Trigger>
      <ThreadListItemPrimitive.Archive ...>
        <ArchiveBoxIcon />
      </ThreadListItemPrimitive.Archive>
    </ThreadListItemPrimitive.Root>
  );
};
```

### Assistant UI Integration
- `ThreadListSidebar` uses Assistant UI's `ThreadListPrimitive` components
- `useRemoteThreadListRuntime` in `ReadyApp.tsx` provides thread management
- `createThreadListAdapter` bridges Assistant UI to SQLite

### Routing
```typescript
// src/renderer/app/AppRoutes.tsx
<Route index element={<ChatPage />} />
<Route path="chat/:sessionId" element={<ChatPage />} />
<Route path="settings" element={<SettingsPage />} />
<Route path="knowledge" element={<KnowledgePage />} />
// ... other routes
```

## Problem Flow

```
User on /settings page
  ↓
Clicks chat session in sidebar
  ↓
ThreadListItemPrimitive.Trigger fires
  ↓
Assistant UI: runtime.threads.switchToThread(threadId)
  ↓
Thread state changes internally
  ↓
URL still shows /settings
  ↓
UI shows SettingsPage (no chat content visible)
  ↓
User sees no apparent change
```

## Solution Design

### New ThreadListItem Component

```typescript
// src/renderer/widgets/layout/ThreadListSidebar.tsx

const ThreadListItem: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const api = useAssistantApi();

  const handleClick = useCallback((e: React.MouseEvent) => {
    const threadState = api.threadListItem().getState();
    const threadId = threadState.threadId;

    // Navigate to chat page if not already there
    if (!location.pathname.startsWith('/chat')) {
      navigate('/chat');
    }

    // Switch to the clicked thread
    api.threads.switchToThread(threadId);
  }, [navigate, location.pathname, api]);

  return (
    <ThreadListItemPrimitive.Root ...>
      <button onClick={handleClick} className="flex h-full flex-1 items-center truncate px-3 ...">
        <ThreadListItemPrimitive.Title fallback="New Chat" />
      </button>
      <ThreadListItemPrimitive.Archive asChild>
        <button ...>
          <ArchiveBoxIcon />
        </button>
      </ThreadListItemPrimitive.Archive>
    </ThreadListItemPrimitive.Root>
  );
};
```

### Design Decisions

#### 1. Custom Button Instead of Trigger
**Decision**: Replace `ThreadListItemPrimitive.Trigger` with standard `<button>`

**Rationale**:
- Full control over click behavior
- Explicit navigation + thread switch sequence
- No hidden dual behavior (wrapper + trigger)
- Uses Assistant UI's public API (`api.threads.switchToThread`)

**Trade-offs**:
- More code than simple wrapper
- Loses Assistant UI's trigger styling (need to apply manually)

#### 2. Check Current Route Before Navigation
**Decision**: Only navigate if `!location.pathname.startsWith('/chat')`

**Rationale**:
- Prevents unnecessary navigation when already on chat page
- Avoids React Router warnings about navigating to same route
- Maintains smooth experience when switching threads on chat page

#### 3. Explicit Thread Switch After Navigation
**Decision**: Call `api.threads.switchToThread(threadId)` explicitly

**Rationale**:
- Controlled sequence: navigate first, then switch thread
- No timing dependencies or race conditions
- Clear, testable flow

#### 4. Use useAssistantApi() Hook
**Decision**: Get thread ID and switch API from `useAssistantApi()`

**Rationale**:
- Uses Assistant UI's public API (not internal implementation)
- Future-proof against library changes
- Type-safe with TypeScript

## Data Flow

```
User on /settings page
  ↓
Clicks chat session in sidebar
  ↓
Custom button onClick fires
  ↓
Check: location.pathname = '/settings' (not /chat)
  ↓
Call navigate('/chat')
  ↓
React Router updates URL to '/chat'
  ↓
Layout renders ChatPage in <Outlet />
  ↓
Call api.threads.switchToThread(threadId)
  ↓
Assistant UI updates thread state
  ↓
ChatPage receives new thread via context
  ↓
ChatPage renders selected thread's messages
  ↓
User sees chat page with selected thread
```

## Component Structure

### ThreadListSidebar.tsx Changes

```typescript
// BEFORE
const ThreadListItem: React.FC = () => {
  return (
    <ThreadListItemPrimitive.Root ...>
      <ThreadListItemPrimitive.Trigger ...>
        <ThreadListItemPrimitive.Title fallback="New Chat" />
      </ThreadListItemPrimitive.Trigger>
      <ThreadListItemPrimitive.Archive ...>...</ThreadListItemPrimitive.Archive>
    </ThreadListItemPrimitive.Root>
  );
};

// AFTER
const ThreadListItem: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const api = useAssistantApi();

  const handleClick = useCallback((e: React.MouseEvent) => {
    // Get current thread ID from Assistant UI context
    const threadState = api.threadListItem().getState();
    const threadId = threadState.threadId;

    // Navigate to chat page if not already there
    if (!location.pathname.startsWith('/chat')) {
      navigate('/chat');
    }

    // Switch to the clicked thread
    api.threads.switchToThread(threadId);
  }, [navigate, location.pathname, api]);

  return (
    <ThreadListItemPrimitive.Root ...>
      <button onClick={handleClick} className="flex h-full flex-1 items-center truncate px-3 text-start text-sm text-gray-700 dark:text-gray-200">
        <ThreadListItemPrimitive.Title fallback="New Chat" />
      </button>
      <ThreadListItemPrimitive.Archive asChild>
        <button className="mr-2 p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-200 dark:hover:bg-gray-600 rounded" title="Archive thread">
          <ArchiveBoxIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
        </button>
      </ThreadListItemPrimitive.Archive>
    </ThreadListItemPrimitive.Root>
  );
};
```

## Testing Strategy

### Unit Tests

```typescript
// src/renderer/widgets/layout/__tests__/ThreadListSidebar.test.tsx

describe('ThreadListItem Navigation', () => {
  it('should navigate to /chat when clicking from settings page', () => {
    const mockNavigate = vi.fn();
    const mockSwitchThread = vi.fn();
    const mockThreadId = 'thread-123';

    render(
      <ThreadListItem />
    );

    // Simulate being on /settings page
    // Mock useLocation to return '/settings'
    // Mock useAssistantApi to return threadId and switchToThread

    const trigger = screen.getByRole('button');
    fireEvent.click(trigger);

    expect(mockNavigate).toHaveBeenCalledWith('/chat');
    expect(mockSwitchThread).toHaveBeenCalledWith(mockThreadId);
  });

  it('should not navigate when already on /chat page', () => {
    const mockNavigate = vi.fn();
    const mockSwitchThread = vi.fn();

    render(<ThreadListItem />);

    // Mock useLocation to return '/chat'
    // Mock useAssistantApi

    const trigger = screen.getByRole('button');
    fireEvent.click(trigger);

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockSwitchThread).toHaveBeenCalled();
  });

  it('should navigate to /chat when clicking from knowledge page', () => {
    // Similar test for /knowledge route
  });
});
```

### Integration Tests

No integration test changes required. The change is isolated to component behavior and uses pure function calls (navigate, switchToThread) that are easily mocked.

## Edge Cases

### Edge Case 1: Already on /chat/:sessionId
**Scenario**: User is on `/chat/session-abc` and clicks thread `session-xyz`

**Behavior**:
- Check: `location.pathname.startsWith('/chat')` → true
- Skip navigation
- Call `api.threads.switchToThread('session-xyz')`
- URL remains `/chat/session-abc` (Thread component handles display)
- Thread switches via Assistant UI context

**Justification**: Assistant UI's Thread component handles thread switching internally; URL update is optional.

### Edge Case 2: Rapid Clicks
**Scenario**: User rapidly clicks multiple threads

**Behavior**:
- Each click triggers navigate + switchToThread
- React Router may batch navigation updates
- Final thread selection depends on last click

**Mitigation**: This is acceptable behavior. If issues arise, can add click debouncing.

### Edge Case 3: Archive Button Click
**Scenario**: User clicks archive button

**Behavior**:
- Archive button is separate from navigation trigger
- `ThreadListItemPrimitive.Archive` handles its own click event
- No navigation occurs
- Thread is archived

**Justification**: Archive button is independent component with its own click handler.

## Migration Path

### Step 1: Update ThreadListItem Component
- Add imports: `useNavigate`, `useLocation`, `useAssistantApi`
- Add `handleClick` callback
- Replace `ThreadListItemPrimitive.Trigger` with custom `<button>`
- Copy styling from trigger to button

### Step 2: Add Tests
- Create unit tests for navigation behavior
- Test from each non-chat page (settings, knowledge, discovery, progress)
- Test no navigation when already on chat page
- Verify archive button still works

### Step 3: Verify
- Run `npm run test:renderer:file -- ThreadListSidebar`
- Run `npm run type-check`
- Manual testing in dev environment

## Rollback Plan
If issues arise, revert `ThreadListSidebar.tsx` to previous version:
- Restore `ThreadListItemPrimitive.Trigger` usage
- Remove `handleClick` callback
- Remove added imports

No database changes, no migration required.

## Performance Considerations
- **Minimal Impact**: Single useCallback with stable dependencies
- **Re-renders**: Only when location.pathname or api changes (rare)
- **Bundle Size**: No new dependencies (uses existing hooks)

## Security Considerations
- **No Security Impact**: Navigation is client-side only
- **No Authentication Changes**: Thread access controlled by existing session service
- **No IPC Changes**: Uses existing Assistant UI API

## Accessibility Considerations
- Custom button maintains keyboard accessibility (tab index, enter key)
- Should add `role="button"` and appropriate aria-label if needed
- Archive button accessibility unchanged (uses existing Assistant UI implementation)

## Future Considerations
- If URL needs to include thread ID (`/chat/:sessionId`), update navigation to:
  ```typescript
  navigate(`/chat/${threadId}`);
  ```
- This requires updating `AppRoutes.tsx` to handle thread ID in URL
