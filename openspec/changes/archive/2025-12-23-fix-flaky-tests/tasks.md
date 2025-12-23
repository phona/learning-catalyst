# Fix Flaky Tests - Tasks

## Task 1: Fix circuitBreaker Test Mock Pollution
**Priority**: P0 (Critical)
**Estimated Time**: 30 minutes
**Status**: Pending

### Work Items
1. Read `circuitBreaker.test.ts` and identify mock violations
2. Remove BOTH `vi.mock` blocks for chunk-emitter (duplicate mocks found)
3. Update test to import real `createChunkEmitter` from `../../../utils/chunk-emitter`
4. Provide mock config with `writer: vi.fn()` instead of mocking the utility
5. Verify test passes in isolation: `npm run test:main:file -- circuitBreaker.test.ts`
6. Verify test passes in full suite: `npm run test:main`

### Validation
- ✅ No `vi.mock` for chunk-emitter in file
- ✅ Test shows "streams message via emitter" passes
- ✅ No mock pollution when run with other tests

### Files Modified
- `src/main/services/domain/workflow/subgraphs/practice/nodes/__tests__/circuitBreaker.test.ts`

---

## Task 2: Fix handleQuestion Interrupt Test Violation
**Priority**: P0 (Critical)
**Estimated Time**: 45 minutes
**Status**: Pending

### Work Items
1. Read `handleQuestion-node.test.ts` and identify interrupt testing issues
2. Remove direct node call pattern for interrupt test
3. Create StateGraph with `MemorySaver` checkpointer for interrupt testing
4. Use `streamMode: 'updates'` to capture interrupt events
5. Import and use `isInterruptEvent` and `extractInterrupt` helpers
6. Update "should use interrupt to wait for follow-up" test to use graph streaming
7. Keep unit tests for logic before interrupt() is called

### Validation
- ✅ Test uses StateGraph, not direct node call
- ✅ "should use interrupt to wait for follow-up" passes
- ✅ No recursion errors

### Files Modified
- `src/main/services/domain/workflow/subgraphs/teach/__tests__/handleQuestion-node.test.ts`

### Reference
- docs/DEVELOPER-GUIDE/testing.md §4.4 (Example 4: Testing a Node with Interrupt)
- Existing working example: `askQuestion-node.test.ts`

---

## Task 3: Fix gradeQuiz State Contamination
**Priority**: P0 (Critical)
**Estimated Time**: 30 minutes
**Status**: Pending

### Work Items
1. Read `gradeQuiz-node.test.ts` and identify state pollution
2. Add `vi.clearAllMocks()` in beforeEach block
3. Ensure each test case starts with clean mock state
4. Verify model mock responses are properly reset between tests
5. Fix "should parse scores in percentage format" expectation
6. Run test multiple times to verify stability

### Validation
- ✅ "should parse scores in percentage format" expects correct value (0.75)
- ✅ All gradeQuiz tests pass consistently
- ✅ No state contamination from previous tests

### Files Modified
- `src/main/services/domain/workflow/nodes/__tests__/gradeQuiz-node.test.ts`

---

## Task 4: Fix edges-routing Test Pollution
**Priority**: P0 (Critical)
**Estimated Time**: 30 minutes
**Status**: Pending

### Work Items
1. Read `edges-routing.test.ts` and identify pollution sources
2. Add `vi.clearAllMocks()` in beforeEach block
3. Verify conditional routing tests are properly isolated
4. Fix all failing routing threshold tests
5. Ensure each test creates fresh mock state

### Validation
- ✅ All 5 failing edges-routing tests pass
- ✅ Threshold tests show correct values
- ✅ Consistent results across multiple runs

### Files Modified
- `src/main/services/domain/workflow/__tests__/edges-routing.test.ts`

---

## Task 5: Fix graph Test Recursion Error
**Priority**: P0 (Critical)
**Estimated Time**: 30 minutes
**Status**: Pending

### Work Items
1. Read `graph.test.ts` (teach subgraph test)
2. Identify source of recursion limit hit
3. Add proper cleanup in afterEach
4. Verify MemorySaver checkpointer is properly configured
5. Fix "streams teach subgraph with interrupts" test
6. Ensure graph state doesn't leak between tests

### Validation
- ✅ "streams teach subgraph with interrupts" passes
- ✅ No GraphRecursionError
- ✅ Proper graph cleanup

### Files Modified
- `src/main/services/domain/workflow/subgraphs/teach/__tests__/graph.test.ts`

---

## Task 6: Apply vi.clearAllMocks Globally
**Priority**: P1 (High)
**Estimated Time**: 45 minutes
**Status**: Pending

### Work Items
1. Scan all workflow test files for missing `vi.clearAllMocks()`
2. Add `vi.clearAllMocks()` in beforeEach to files that lack it
3. Focus on files that use mocks extensively:
   - All node test files in `workflow/nodes/__tests__/`
   - All subgraph test files
   - All integration test files
4. Verify pattern consistency across test suite

### Validation
- ✅ All workflow test files have `vi.clearAllMocks()` in beforeEach
- ✅ No mock state pollution between tests
- ✅ Test execution order doesn't affect results

### Files Modified (Estimated 15-20 files)
- Various workflow test files

---

## Task 7: Validate Complete Test Suite
**Priority**: P0 (Critical)
**Estimated Time**: 30 minutes
**Status**: Pending

### Work Items
1. Run main process tests: `npm run test:main`
2. Run renderer tests: `npm run test:renderer`
3. Run integration tests: `npm run test:integration`
4. Run complete suite: `npm run test:complete`
5. Run tests in different orders to verify stability
6. Document final pass rates

### Validation
- ✅ Main: 1076/1076 passed (100%)
- ✅ Renderer: All tests pass
- ✅ Integration: All tests pass
- ✅ Complete: 100% pass rate
- ✅ Multiple runs show consistent results

### Success Metrics
```
Test Files: 86 passed | 0 failed | 3 skipped
Tests: 1076 passed | 0 failed | 18 skipped
Duration: < 15 seconds
```

---

## Task 8: Document Patterns for Team
**Priority**: P2 (Medium)
**Estimated Time**: 20 minutes
**Status**: Pending

### Work Items
1. Create summary of fixes applied
2. Document common patterns used:
   - Real chunk-emitter with mock writer
   - StateGraph streaming for interrupt tests
   - vi.clearAllMocks() requirement
3. Add to testing guide if needed
4. Share with team for awareness

### Output
- Summary document
- Pattern examples for future tests
- Team communication

---

## Total Estimated Time: 4 hours

## Verification Commands
```bash
# Test individual files
npm run test:main:file -- <file>

# Test specific suites
npm run test:main
npm run test:renderer
npm run test:integration

# Full validation
npm run test:complete

# Check for mock violations
grep -r "vi.mock.*chunk-emitter" src/ --include="*.test.ts"
# Expected: No results
```
