# Proposal: Fix Chat Session Navigation from Sidebar

## Change ID
`fix-chat-sidebar-navigation`

## Summary
When a user is on a non-chat page (Settings, Knowledge Map, Discovery, Progress) and clicks a chat session in the sidebar, the application should navigate to the chat page and switch to the selected thread. Currently, clicking a thread only switches the internal thread state but does not navigate to the `/chat` route, leaving the user on the wrong page.

## Problem Statement
The `ThreadListSidebar` component uses Assistant UI's `ThreadListItemPrimitive.Trigger` component to handle thread switching. This trigger only calls Assistant UI's internal `runtime.threads.switchToThread()` method but does not integrate with React Router navigation. As a result:

1. User is on `/settings` or `/knowledge` page
2. User clicks a chat session in the sidebar
3. Assistant UI switches the thread internally (state change)
4. URL remains `/settings` or `/knowledge` (no navigation)
5. UI does not update because the user is still viewing the wrong page component

This creates a broken user experience where clicking a chat session appears to do nothing when on non-chat pages.

## Root Cause
Assistant UI's `ThreadListItemPrimitive.Trigger` is designed for chat interfaces where the thread list and chat content are always visible simultaneously. It assumes thread switching is an in-place operation, not a navigation operation. The application's multi-page architecture (with separate routes for chat, settings, knowledge, etc.) requires explicit navigation when switching threads from non-chat pages.

## Proposed Solution
Replace the `ThreadListItemPrimitive.Trigger` with a custom button that:
1. Explicitly navigates to `/chat` route if not already there
2. Then calls Assistant UI's thread switching API
3. Maintains all existing functionality (archive button, title display, etc.)

This approach provides:
- **Explicit intent**: Navigation logic is clear and visible
- **Testability**: Pure function calls, no timing-dependent side effects
- **Maintainability**: No wrapper divs or hidden behaviors
- **Future-proof**: Uses Assistant UI's public API (`useAssistantApi().threads.switchToThread()`)

## Impact Analysis

### Affected Components
- `src/renderer/widgets/layout/ThreadListSidebar.tsx` - Single file change
  - Modify `ThreadListItem` component to use custom button

### Unaffected Components
- All page components remain unchanged
- Routing configuration unchanged
- Thread list adapter unchanged
- Chat service unchanged

### User Experience Impact
- **Before**: Clicking chat session on non-chat page appears to do nothing
- **After**: Clicking chat session always navigates to chat page with selected thread

### Test Impact
- Add unit tests for navigation behavior
- No integration test changes needed (pure function calls)

## Alternatives Considered

### Alternative 1: Wrapper div with onClick (Rejected)
- **Pros**: Simple implementation
- **Cons**: Code smell (wrapper around trigger), hidden dual behavior, timing issues possible
- **Verdict**: Creates technical debt, harder to test

### Alternative 2: useEffect with thread change listener (Rejected)
- **Pros**: Reactive pattern
- **Cons**: Effect-based, race conditions possible, harder to test async behavior
- **Verdict**: Implicit behavior, debugging difficult

### Alternative 3: Custom button with explicit navigation (Selected)
- **Pros**: Explicit intent, testable, maintainable, uses public API
- **Cons**: Slightly more code than wrapper approach
- **Verdict**: Best balance of simplicity and maintainability

## Dependencies
- None (self-contained change)

## Risks
- **Low Risk**: Single file change, isolated behavior
- **Mitigation**: Comprehensive unit tests ensure navigation works correctly

## Success Criteria
1. Clicking a chat session from Settings/Knowledge/Discovery/Progress navigates to `/chat`
2. Clicking a chat session from `/chat` page stays on `/chat` (no double navigation)
3. Archive button continues to work (does not trigger navigation)
4. All existing tests continue to pass
5. New tests verify navigation behavior

## Related Specs
- `renderer-structure` - Defines `widgets/layout/ThreadListSidebar.tsx` location

## Related Changes
- None

## References
- Assistant UI ThreadList documentation: https://github.com/assistant-ui/assistant-ui/blob/main/apps/docs/content/docs/api-reference/primitives/ThreadList.mdx
