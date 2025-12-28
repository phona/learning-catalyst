# fix-threadlist-title-generation

## Summary
Fix a bug where AI-generated chat titles are saved to SQLite but don't appear in the thread list UI until page reload. The thread list continues to show "New Chat" instead of the meaningful AI-generated title.

## Problem
When a user starts a new chat with their first message, the application:
1. ✅ Generates an AI-powered title from the first message
2. ✅ Saves the title to SQLite database
3. ❌ **FAILS to update the thread list UI with the new title**
4. Result: User sees "New Chat" in sidebar until page reload

### Example of Bug Behavior
```
User sends first message: "How do I learn JavaScript?"
System generates title: "How to learn JavaScript?"
Database is updated: ✅ Session row updated with title
Thread list shows: ❌ "New Chat" (should show "How to learn JavaScript!")
User refreshes page: ✅ "How to learn JavaScript!" appears correctly
```

## Root Cause
The `generateTitle()` method in `src/renderer/hooks/useThreadListAdapter.helpers.ts:126-155` has a critical disconnect:

1. **Returns AssistantStream** with "New Chat" placeholder immediately
2. **Generates AI title** asynchronously via `sessionService.generateAITitle()`
3. **Saves to database** via `sessionService.updateSessionTitle()`
4. ❌ **FAILS to emit the new title through the stream** for UI update

### How Assistant UI Expects It to Work
Assistant UI's runtime monitors the `generateTitle()` stream and expects title updates to be emitted through it:

```typescript
// Assistant UI Runtime Core (simplified):
const stream = await adapter.generateTitle(remoteId, messages);
const messageStream = AssistantMessageStream.fromAssistantStream(stream);

// Process each message from the stream to update thread title
for await (const message of messageStream) {
  const title = extractTitleFromMessage(message);
  updateThreadUI(title); // Runtime uses this to update the thread list
}
```

**Current behavior**: Stream emits "New Chat", then closes. Assistant UI sets the title to "New Chat" and never knows a better title exists.

**Expected behavior**: Stream should emit "New Chat" first (placeholder), then emit the AI-generated title, allowing Assistant UI to update the thread list immediately.

## Solution
Modify `generateTitle()` in `src/renderer/hooks/useThreadListAdapter.helpers.ts` to emit the AI-generated title through the AssistantStream after generating it:

### Before (Buggy Code)
```typescript
async generateTitle(remoteId: string, messages: readonly ThreadMessage[]) {
  const firstUserMessage = messages.find((m) => m.role === 'user');
  const textContent =
    firstUserMessage?.content
      .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
      .map((c) => c.text)
      .join(' ') ?? '';

  return createAssistantStream(async (controller) => {
    controller.appendText('New Chat');
    controller.close();

    if (!textContent) {
      return;
    }

    try {
      const title = await sessionService.generateAITitle(textContent);
      const safeTitle = title ?? '';
      const finalTitle = safeTitle.length > 47 ? safeTitle.slice(0, 47) + '...' : safeTitle;
      if (finalTitle) {
        await sessionService.updateSessionTitle(remoteId, finalTitle);
        // BUG: Never emits finalTitle through the stream!
      }
    } catch (error) {
      console.error('[ThreadListAdapter] Failed to generate title:', error);
    }
  });
}
```

### After (Fixed Code)
```typescript
async generateTitle(remoteId: string, messages: readonly ThreadMessage[]) {
  const firstUserMessage = messages.find((m) => m.role === 'user');
  const textContent =
    firstUserMessage?.content
      .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
      .map((c) => c.text)
      .join(' ') ?? '';

  return createAssistantStream(async (controller) => {
    // 1. Emit placeholder immediately
    controller.appendText('New Chat');
    controller.close();

    if (!textContent) {
      return;
    }

    try {
      // 2. Generate AI title
      const title = await sessionService.generateAITitle(textContent);
      const safeTitle = title ?? '';
      const finalTitle = safeTitle.length > 47 ? safeTitle.slice(0, 47) + '...' : safeTitle;

      // 3. Save to database
      await sessionService.updateSessionTitle(remoteId, finalTitle);

      // 4. Emit new title to stream for UI update
      // FIX: Create a NEW stream with the final title
      const finalStream = createAssistantStream((finalController) => {
        finalController.appendText(finalTitle);
        finalController.close();
      });

      // Merge the final stream so Assistant UI receives the updated title
      controller.merge(finalStream);
    } catch (error) {
      console.error('[ThreadListAdapter] Failed to generate title:', error);
    }
  });
}
```

## Implementation Details

### Key Changes
1. **Emit placeholder first**: `controller.appendText('New Chat')` - Provides immediate feedback
2. **Generate AI title**: Call `sessionService.generateAITitle()` asynchronously
3. **Save to database**: Update SQLite with `sessionService.updateSessionTitle()`
4. **Emit final title**: Create and merge a new stream with the AI-generated title
5. **Assistant UI receives update**: Runtime picks up the new title from the merged stream

### Why This Works
- **Maintains async behavior**: UI shows "New Chat" immediately
- **Updates UI in background**: New title appears via stream merge
- **Preserves database persistence**: SQLite still gets updated
- **Follows Assistant UI patterns**: Uses stream for UI updates as designed
- **No breaking changes**: Stream API remains compatible

## Testing

### Regression Tests Added
Added 3 regression tests in `src/renderer/widgets/layout/__tests__/title-generation-bug.test.tsx` that verify the bug exists:

1. **"Stream does NOT emit AI-generated title"**: Confirms "How to learn JavaScript?" is NOT emitted
2. **"Stream never emits generated title"**: Confirms "Understanding React Hooks" is NOT emitted
3. **"Assistant UI only sees New Chat"**: Confirms only placeholder titles are emitted

**Current test results**: All 3 tests pass ✅ - proving the bug exists

### After Fix
These tests will fail (expected), and we'll update them to verify the stream DOES emit the AI-generated titles:

```typescript
// After fix, tests should verify:
expect(titles).toContain('How to learn JavaScript?');
expect(titles).toContain('Understanding React Hooks');
```

## Files to Modify
- `src/renderer/hooks/useThreadListAdapter.helpers.ts` - Fix the `generateTitle()` method (lines 126-155)

## Verification Steps
1. Apply the fix to `generateTitle()` method
2. Run regression tests - they should fail (bug is fixed)
3. Update regression tests to verify AI-generated titles ARE emitted
4. Run all tests to ensure no regressions: `npm test -- title-generation-bug.test`
5. Verify UI behavior manually:
   - Start new chat
   - Send first message
   - Observe thread list updates to show AI-generated title immediately
   - No page reload required

## Benefits
- ✅ **Immediate UI updates**: Thread titles appear without page reload
- ✅ **Better UX**: Users see meaningful titles immediately
- ✅ **Minimal code change**: Only 5 lines modified in one method
- ✅ **Leverages existing infrastructure**: Uses AssistantStream as designed
- ✅ **No breaking changes**: Maintains backward compatibility
- ✅ **Database persistence preserved**: SQLite still updated correctly

## Edge Cases Handled
- **Empty user messages**: Returns "New Chat" only
- **AI generation failure**: Gracefully falls back to "New Chat"
- **Null/undefined AI response**: Uses safe defaults
- **Long titles**: Truncated to 47 chars + "..."
- **No user messages**: Returns placeholder without API call
