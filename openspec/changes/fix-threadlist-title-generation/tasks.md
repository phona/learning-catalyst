# Tasks: fix-threadlist-title-generation

## Implementation Tasks

### 1. Apply Fix to generateTitle() Method
- [ ] Modify `src/renderer/hooks/useThreadListAdapter.helpers.ts`
- [ ] Update `generateTitle()` to emit AI-generated title through stream
- [ ] Use `controller.merge()` to send updated title to Assistant UI

### 2. Run Regression Tests
- [ ] Execute: `npm run test:renderer -- title-generation-bug.test`
- [ ] Verify 3 regression tests now FAIL (expected - proves bug is fixed)
- [ ] Check that existing 18 tests still pass

### 3. Update Regression Tests
- [ ] Update test "Stream does NOT emit AI-generated title" to expect the title
- [ ] Update test "Stream never emits generated title" to expect the title
- [ ] Update test "Assistant UI only sees New Chat" to expect the title
- [ ] Run tests to verify they pass

### 4. Full Test Suite
- [ ] Run complete test suite: `npm test`
- [ ] Verify no regressions in other tests
- [ ] Check main process tests: `npm run test:main`
- [ ] Check renderer tests: `npm run test:renderer`

### 5. Manual Verification
- [ ] Start application in dev mode: `npm run dev`
- [ ] Create new chat thread
- [ ] Send first message (e.g., "How do I learn Python?")
- [ ] Verify thread list immediately shows AI-generated title
- [ ] Refresh page to confirm title persists in database
- [ ] Test with various message types and lengths

### 6. Edge Case Testing
- [ ] Test with empty/first message (should show "New Chat")
- [ ] Test with very long message (title should be truncated)
- [ ] Test with special characters in message
- [ ] Test when AI generation fails (should fall back to "New Chat")
- [ ] Test with null/undefined AI responses

## Success Criteria
- ✅ Thread list shows AI-generated title immediately after first message
- ✅ No page reload required to see the updated title
- ✅ Database persistence works correctly
- ✅ All existing tests pass
- ✅ Regression tests updated and passing
- ✅ Edge cases handled gracefully

## Rollback Plan
If issues arise:
1. Revert changes to `src/renderer/hooks/useThreadListAdapter.helpers.ts`
2. Restore original `generateTitle()` implementation
3. All tests should return to passing state
4. Bug will reappear (as expected)

## Notes
- This fix is **UI-only** - no database schema changes required
- Assistant UI integration is maintained through existing stream APIs
- The fix is **non-breaking** - existing functionality preserved
