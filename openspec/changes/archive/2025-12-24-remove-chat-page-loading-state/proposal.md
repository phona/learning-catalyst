# Proposal: Remove Chat Page Loading State

## Summary

Remove the custom `isHydrating` loading state from `ChatPage.tsx` that blocks rendering while thread history loads. The assistant-ui `<Thread>` component has built-in loading states and empty state handling, making our custom loading state redundant and potentially harmful (can cause permanent blocking if `currentRemoteId` never resolves).

## Problem Statement

When navigating to a chat session (existing or new), users see "Loading chat…" which can get stuck permanently. This happens because:

1. **Blocking condition**: `isHydrating = !!sessionId && (!threadState || !currentRemoteId)`
2. **No timeout**: If `switchToThread()` fails or history adapter doesn't load, `currentRemoteId` stays undefined
3. **Redundant**: assistant-ui's `<Thread>` component already handles loading/empty states internally
4. **Poor UX**: New chats show "Loading chat…" even though there's nothing to load

### Current Behavior

```
User navigates to /chat/session-123
    ↓
isHydrating = true (sessionId exists but remoteId not yet set)
    ↓
Shows "Loading chat…" overlay
    ↓
Blocks Thread component from rendering
    ↓
[WAIT INDEFINITELY if remoteId never resolves]
```

### Root Cause

The custom loading state was added to prevent showing the wrong thread while history loads, but it:
- Blocks the `<Thread>` component entirely
- Has no fallback or timeout
- Prevents assistant-ui's built-in loading states from showing
- Creates confusion for new chats (nothing to load)

## Proposed Solution

Remove the `isHydrating` check and always render `<Thread>`. Let assistant-ui handle its own loading states.

### New Behavior

```
User navigates to /chat/session-123
    ↓
Thread component renders immediately
    ↓
assistant-ui handles internal loading/empty states
    ↓
History loads asynchronously via ThreadHistoryProvider
    ↓
Messages appear when ready
```

## Benefits

| Aspect | Before | After |
|--------|--------|-------|
| **New chat** | "Loading chat…" (confusing) | Empty Thread immediately ✅ |
| **Existing chat** | Blocks until history loads | Thread renders, shows internal loading ✅ |
| **Error case** | Stuck forever | Thread handles errors gracefully ✅ |
| **Code complexity** | Extra conditional logic | Simpler (fewer lines) ✅ |
| **Dependencies** | Relies on currentRemoteId resolution | No external state dependency ✅ |

## Affected Files

1. `src/renderer/pages/chat/ChatPage.tsx` - Remove `isHydrating` check
2. `src/renderer/pages/chat/__tests__/history-loading-verification.test.tsx` - Update/remove test

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Visual flash during navigation | Low | Low | assistant-ui has smooth transitions |
| Brief wrong-thread display | Low | Low | History loads quickly via adapter |
| Test failures | Medium | Low | Update tests to reflect new behavior |

## Related Work

- **chat-navigation-from-sidebar spec** - Already uses assistant-ui's public API for thread switching
- **ThreadHistoryProvider** - Already handles async history loading correctly
- **assistant-ui library** - Has mature loading state handling built-in

## Open Questions

None - this is a straightforward removal of unnecessary code.
