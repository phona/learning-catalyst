# chat-page-loading Specification

## Purpose
TBD - created by archiving change remove-chat-page-loading-state. Update Purpose after archive.
## Requirements
### Requirement: ChatPage Renders Thread Immediately

The ChatPage component MUST render the assistant-ui `<Thread>` component immediately upon mount, regardless of thread hydration state. The component MUST NOT block rendering based on thread state or remoteId availability.

**Priority**: P0 (Critical)
**Effort**: S

**Rationale**: assistant-ui's `<Thread>` component has sophisticated built-in handling for loading, empty, and error states. By rendering immediately, we delegate to these well-tested states instead of introducing custom blocking logic that can fail.

#### Scenario: Navigate to New Chat Renders Thread Immediately

**Given** the user navigates to a new chat (index route `/`)
**When** the ChatPage component renders
**Then** the Thread component MUST be rendered immediately
**And** NO loading overlay MUST be shown
**And** the Thread MUST display its built-in empty state

**File Location**:
```
src/renderer/pages/chat/ChatPage.tsx
```

**Implementation**:
```tsx
export const ChatPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const api = useAssistantApi();

  const threadListItem = api.threadListItem.source ? api.threadListItem() : null;
  const threadState = threadListItem?.getState();
  const currentThreadId = threadState?.id;
  const currentRemoteId = threadState?.remoteId;

  // Keep URL sync effect
  React.useEffect(() => {
    if (!sessionId) return;
    if (sessionId === currentThreadId || sessionId === currentRemoteId) return;
    api.threads().switchToThread(sessionId);
  }, [api, sessionId, currentThreadId, currentRemoteId]);

  return (
    <div className="h-full bg-gray-50">
      <Thread
        key={currentThreadId}
        assistantMessage={{
          components: {
            Text: MarkdownText,
            ToolFallback: ToolFallback,
          },
        }}
      />
    </div>
  );
};
```

**Validation**:
- Manual: Navigate to new chat, verify Thread appears without loading overlay
- Unit: Test that Thread component is in document when ChatPage renders
- Visual: Confirm empty state message appears in Thread

#### Scenario: Navigate to Existing Chat Renders Thread Immediately

**Given** the user navigates to an existing chat session (e.g., `/chat/session-123`)
**When** the ChatPage component renders (before history loads)
**Then** the Thread component MUST be rendered immediately
**And** NO loading overlay MUST be shown
**And** messages MUST appear asynchronously as ThreadHistoryProvider loads them

**Validation**:
- Manual: Navigate to existing chat, verify Thread appears immediately
- Manual: Verify messages populate after brief async delay
- Visual: Confirm smooth async message loading

#### Scenario: Thread Switching Renders Thread Immediately

**Given** the user is viewing one chat session
**When** the user clicks a different chat session in the sidebar
**Then** the Thread component MUST be rendered immediately for the new session
**And** NO loading overlay MUST be shown
**And** the new session's messages MUST appear asynchronously

**Validation**:
- Manual: Click between chat sessions, verify Thread switches immediately
- Manual: Verify no blocking loading states appear
- Visual: Confirm smooth transitions between threads

#### Scenario: Deep Link Renders Thread Immediately

**Given** the user opens the app directly to a deep link (e.g., `/chat/session-123`)
**When** the ChatPage component renders
**Then** the Thread component MUST be rendered immediately
**And** NO loading overlay MUST be shown
**And** messages MUST appear asynchronously as history loads

**Validation**:
- Manual: Open app to `/chat/session-123` URL, verify Thread appears
- Manual: Refresh page on chat URL, verify Thread appears immediately
- Integration: Test that ThreadHistoryProvider.load() is called and populates messages

### Requirement: ChatPage URL Synchronization

When the URL contains a `:sessionId` parameter, ChatPage MUST instruct assistant-ui's runtime to switch to that thread via `api.threads().switchToThread()`. This effect MUST NOT block the Thread component from rendering.

**Priority**: P1 (High)
**Effort**: S

#### Scenario: URL Change Triggers Thread Switch

**Given** the user is on the Chat page
**When** the URL `:sessionId` parameter changes (e.g., from `/chat/session-1` to `/chat/session-2`)
**Then** the application MUST call `api.threads().switchToThread(sessionId)` with the new sessionId
**And** the Thread component MUST continue rendering during the switch
**And** messages MUST update asynchronously when the new thread's history loads

**Validation**:
- Unit: Test that `switchToThread` is called with correct sessionId
- Manual: Navigate between chat URLs, verify thread switches
- Integration: Verify ThreadHistoryProvider.load() is called for each thread

#### Scenario: No Redundant Thread Switch When Already on Target Thread

**Given** the user is viewing thread with ID matching the URL `:sessionId`
**When** the ChatPage component re-renders
**Then** the application MUST NOT call `api.threads().switchToThread()`
**And** the current Thread MUST continue rendering normally

**Validation**:
- Unit: Test that `switchToThread` is NOT called when already on target thread
- Manual: Refresh page on same chat, verify no redundant switch

