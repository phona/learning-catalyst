# Tomorrow's Testing TODO

## Quick Win: Unit Tests for Simple Workflow Nodes

### Priority 1: Simple Pure Functions (30 min each)

**1. topicParse-node.test.ts** ⭐ **START HERE**
- Pure text parsing logic
- Simple dependency: knowledgeService.findRelatedByPrompt
- Test cases:
  - ✅ Valid topic with matches
  - ✅ Empty topic
  - ✅ No matching concepts
  - ✅ Error handling

**2. complete-node.test.ts**
- No dependencies
- Returns completion message
- Test cases:
  - ✅ Returns completion summary
  - ✅ Message format

**3. breaker-node.test.ts**
- Simple dependency: agentManager.runAgent
- Test cases:
  - ✅ Calls tutoring agent
  - ✅ Returns agent response
  - ✅ Error handling

### Priority 2: Slightly More Complex (45 min each)

**4. evaluate-node.test.ts**
- Pure function with calculations
- Test mastery score computation

**5. qa-node.test.ts**
- Template generation
- Test question/answer formatting

### Implementation Pattern

```typescript
// Simple test pattern for workflow nodes
import { describe, it, expect, vi } from 'vitest';
import { topicParseNode } from '../topicParse';

describe('topicParse node', () => {
  it('parses valid topic', async () => {
    // Mock dependencies
    const mockKnowledgeService = {
      findRelatedByPrompt: vi.fn().mockResolvedValue({
        matches: [
          { type: 'concept', name: 'React' },
          { type: 'relationship', name: 'JavaScript' },
        ],
      }),
    };

    // Create node with mocks
    const node = topicParseNode({ knowledgeService: mockKnowledgeService });

    // Test
    const result = await node({
      messages: [],
      topic: 'React',
    } as any);

    // Assertions
    expect(result.topic).toBe('React');
    expect(result.messages[0].content).toContain('React');
  });
});
```

## What You Accomplished Today

### ✅ Completed
1. **Fixed 3 concept-parsing tests** - All passing
2. **Created full-workflow.test.ts** - 9 comprehensive tests
3. **Improved test infrastructure** - Reusable helpers
4. **Cleaned up orphaned code** - Removed unused agents

### 📊 Test Status
- **Passing:** 19 tests (100% of fixable tests)
- **Known issues:** 4 workflow tests (pre-existing LangChain issue)
- **Coverage:** 1/13 workflow nodes with unit tests (8%)

## Next Steps (Tomorrow)

### Option A: Simple Unit Tests (Recommended)
**Time:** 2-3 hours
**Value:** High
**Risk:** Low

Write unit tests for 5 simple workflow nodes:
- topicParse (30 min)
- complete (30 min)
- breaker (30 min)
- evaluate (45 min)
- qa (45 min)

**Benefits:**
- Quick wins
- Easy to write and maintain
- High code coverage
- Builds on existing patterns

### Option B: Full Workflow Tests
**Time:** 1-2 hours
**Value:** Medium
**Risk:** Medium

Improve full-workflow.test.ts:
- Add more edge cases
- Improve error scenarios
- Add recovery tests

### Option C: Skip Testing, Focus on Features
**Time:** 0 hours
**Value:** N/A
**Risk:** None

Move on to other features and accept current test coverage.

## Recommendation

**Start with topicParse-node.test.ts** - It's the simplest and will establish the pattern for the other nodes. You'll be done in 30 minutes and have a clear template for the remaining nodes.

---

**Status:** Ready for tomorrow's work
**Priority:** High (easy wins, good coverage)
**Effort:** Low (simple pure functions)
**Risk:** None (well-isolated unit tests)
