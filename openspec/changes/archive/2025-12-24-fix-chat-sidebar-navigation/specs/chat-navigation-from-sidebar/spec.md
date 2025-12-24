# chat-navigation-from-sidebar Specification

## Purpose
Defines the behavior for chat session navigation from the sidebar when the user is on a non-chat page. This ensures that clicking a chat session always takes the user to the chat interface, regardless of which page they are currently viewing.

## ADDED Requirements

### Requirement: Chat Session Click Navigates to Chat Page

When a user clicks a chat session in the sidebar, the application MUST navigate to the `/chat` route if the user is not already on a chat page. The selected thread MUST then be activated for display.

**Priority**: P0 (Critical)
**Effort**: M

#### Scenario: Click Chat Session from Settings Page
**Given** the user is on the Settings page (`/settings`)
**When** the user clicks a chat session in the sidebar
**Then** the application MUST navigate to the `/chat` route
**And** the clicked thread MUST be activated
**And** the chat interface MUST display the selected thread's messages

**File Location**:
```
src/renderer/widgets/layout/ThreadListSidebar.tsx
```

**Implementation**:
```typescript
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
      <button onClick={handleClick} ...>
        <ThreadListItemPrimitive.Title fallback="New Chat" />
      </button>
      ...
    </ThreadListItemPrimitive.Root>
  );
};
```

**Validation**:
- Manual: Navigate to Settings, click chat session, verify URL changes to `/chat`
- Unit: Test `navigate('/chat')` is called when `location.pathname` is `/settings`

#### Scenario: Click Chat Session from Knowledge Map Page
**Given** the user is on the Knowledge Map page (`/knowledge`)
**When** the user clicks a chat session in the sidebar
**Then** the application MUST navigate to the `/chat` route
**And** the clicked thread MUST be activated
**And** the chat interface MUST display the selected thread's messages

**Validation**:
- Manual: Navigate to Knowledge Map, click chat session, verify URL changes to `/chat`
- Unit: Test `navigate('/chat')` is called when `location.pathname` is `/knowledge`

#### Scenario: Click Chat Session from Discovery Page
**Given** the user is on the Discovery page (`/discovery`)
**When** the user clicks a chat session in the sidebar
**Then** the application MUST navigate to the `/chat` route
**And** the clicked thread MUST be activated
**And** the chat interface MUST display the selected thread's messages

**Validation**:
- Manual: Navigate to Discovery, click chat session, verify URL changes to `/chat`
- Unit: Test `navigate('/chat')` is called when `location.pathname` is `/discovery`

#### Scenario: Click Chat Session from Progress Page
**Given** the user is on the Progress page (`/progress`)
**When** the user clicks a chat session in the sidebar
**Then** the application MUST navigate to the `/chat` route
**And** the clicked thread MUST be activated
**And** the chat interface MUST display the selected thread's messages

**Validation**:
- Manual: Navigate to Progress, click chat session, verify URL changes to `/chat`
- Unit: Test `navigate('/chat')` is called when `location.pathname` is `/progress`

#### Scenario: Click Chat Session While Already on Chat Page
**Given** the user is on the Chat page (`/chat` or `/chat/:sessionId`)
**When** the user clicks a different chat session in the sidebar
**Then** the application MUST NOT navigate to a different route
**And** the clicked thread MUST be activated
**And** the chat interface MUST display the newly selected thread's messages

**Validation**:
- Manual: Navigate to Chat, click different chat session, verify URL remains `/chat`
- Unit: Test `navigate()` is NOT called when `location.pathname.startsWith('/chat')` is true

### Requirement: Archive Button Does Not Trigger Navigation

The archive button in each thread list item MUST NOT trigger navigation to the chat page. It must only perform the archive action.

**Priority**: P1 (High)
**Effort**: S

#### Scenario: Click Archive Button from Settings Page
**Given** the user is on the Settings page (`/settings`)
**When** the user clicks the archive button for a chat session
**Then** the application MUST NOT navigate to the `/chat` route
**And** the thread MUST be archived
**And** the user MUST remain on the Settings page

**Validation**:
- Manual: Navigate to Settings, click archive button, verify still on Settings
- Unit: Test `navigate()` is NOT called when archive button is clicked

#### Scenario: Click Archive Button from Chat Page
**Given** the user is on the Chat page (`/chat`)
**When** the user clicks the archive button for a chat session
**Then** the application MUST NOT navigate to a different route
**And** the thread MUST be archived
**And** the user MUST remain on the Chat page

**Validation**:
- Manual: Navigate to Chat, click archive button, verify still on Chat
- Unit: Test `navigate()` is NOT called when archive button is clicked

### Requirement: Thread List Item Uses Custom Button

The `ThreadListItem` component MUST use a custom button element with explicit navigation logic, NOT the Assistant UI's `ThreadListItemPrimitive.Trigger` component.

**Priority**: P0 (Critical)
**Effort**: M

#### Scenario: ThreadListItem Implements Custom Button
**Given** the `ThreadListItem` component in `ThreadListSidebar.tsx`
**When** the component renders
**Then** it MUST use a standard `<button>` element for the navigation trigger
**And** the button MUST have an `onClick` handler that implements navigation
**And** the button MUST NOT use `ThreadListItemPrimitive.Trigger`
**And** the button MUST maintain the same styling as the original trigger

**Implementation**:
```typescript
// ✅ CORRECT - Custom button with navigation
<button
  onClick={handleClick}
  className="flex h-full flex-1 items-center truncate px-3 text-start text-sm text-gray-700 dark:text-gray-200"
>
  <ThreadListItemPrimitive.Title fallback="New Chat" />
</button>

// ❌ INCORRECT - Assistant UI trigger (no navigation)
<ThreadListItemPrimitive.Trigger className="...">
  <ThreadListItemPrimitive.Title fallback="New Chat" />
</ThreadListItemPrimitive.Trigger>
```

**Validation**:
- Code review: Verify `ThreadListItemPrimitive.Trigger` is NOT used
- Visual regression: Ensure styling matches original design

### Requirement: Navigation Uses Assistant UI Public API

Thread switching MUST use Assistant UI's public API (`useAssistantApi().threads.switchToThread()`), NOT internal implementation details.

**Priority**: P1 (High)
**Effort**: S

#### Scenario: Thread Switching via Public API
**Given** the user clicks a chat session
**When** the navigation handler executes
**Then** it MUST call `api.threads.switchToThread(threadId)`
**And** it MUST NOT access internal Assistant UI state directly
**And** it MUST get the thread ID from `api.threadListItem().getState()`

**Implementation**:
```typescript
// ✅ CORRECT - Use public API
const api = useAssistantApi();
const threadState = api.threadListItem().getState();
const threadId = threadState.threadId;
api.threads.switchToThread(threadId);

// ❌ INCORRECT - Internal implementation
const runtime = getThreadListRuntime();
runtime.internal.switchThread(threadId);
```

**Validation**:
- Code review: Verify `useAssistantApi()` is used
- Type checking: Verify `api.threads.switchToThread` type is correct

## MODIFIED Requirements

None. This is a new capability with no modifications to existing specs.

## REMOVED Requirements

None. This is a new capability with no removals.

## Related Specs
- `renderer-structure` - Defines the structure and location of `ThreadListSidebar.tsx`
