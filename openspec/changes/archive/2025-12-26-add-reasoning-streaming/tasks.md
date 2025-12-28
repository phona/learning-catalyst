# Tasks: Add Reasoning Support to stream-llm.ts

## Implementation Checklist

### Phase 1: Type Definitions
- [x] Add `StreamLLMResult` interface with `content` and optional `reasoning` fields
- [x] Update `StreamLLMOptions` interface if needed
- [x] Add content block type imports from `@langchain/core`

### Phase 2: Helper Functions
- [x] Implement `extractReasoning(chunk: AIMessageChunk): string | undefined`
  - [x] Handle array content blocks with `type: 'reasoning'`
  - [x] Return undefined for non-array or non-reasoning content
- [x] Implement `extractText(chunk: AIMessageChunk): string`
  - [x] Handle string content (passthrough)
  - [x] Handle array content blocks with `type: 'text'`
  - [x] Accumulate text from multiple blocks

### Phase 3: Streaming Path
- [x] Update streaming loop to use `extractReasoning()` and `extractText()`
- [x] Track reasoning state (`reasoningStarted` boolean)
- [x] Emit `reasoningStart` on first reasoning chunk
- [x] Emit `reasoningDelta` for each reasoning chunk
- [x] Emit `reasoningEnd` after all reasoning chunks
- [x] Accumulate `fullReasoning` variable
- [x] Update return to `{ content, reasoning }` object

### Phase 4: Non-Streaming Path
- [x] Parse response content with `extractReasoning()` and `extractText()`
- [x] Emit reasoning chunks if reasoning present
- [x] Update return to `{ content, reasoning }` object

### Phase 5: Tests
- [x] Add test: "should detect reasoning in content blocks"
  - Mock model with `content: [{ type: 'reasoning', reasoning: '...' }]`
  - Verify reasoning is extracted
- [x] Add test: "should emit reasoning chunks in streaming mode"
  - Verify `reasoningStart`, `reasoningDelta`, `reasoningEnd` emitted
  - Verify chunk order: reasoning before text
- [x] Add test: "should return reasoning in result"
  - Verify return type includes reasoning field
  - Verify reasoning content is accumulated
- [x] Add test: "should handle mixed reasoning and text chunks"
  - Mock model with interleaved reasoning and text blocks
  - Verify both are extracted correctly
- [x] Add test: "should handle reasoning-only response"
  - Mock model with only reasoning blocks
  - Verify content is empty string, reasoning is present
- [x] Add test: "should handle text-only response (no reasoning)"
  - Mock model with string content or text blocks only
  - Verify reasoning is undefined
- [x] Add test: "should emit reasoning in non-streaming mode"
  - Mock invoke response with reasoning content
  - Verify reasoning chunks emitted
- [x] Add test: "should use same messageId for reasoning and text"
  - Verify reasoning chunks use same ID as text chunks
- [x] Add test: "should handle empty reasoning block"
  - Mock model with empty reasoning string
  - Verify behavior (emit start/end with no delta?)
- [x] Add test: "should handle multiple reasoning blocks"
  - Mock model with multiple reasoning chunks
  - Verify all are accumulated
- [x] Update existing tests for new return type
  - Update assertions to expect object instead of string
  - Ensure backward compatibility tests pass

### Phase 6: Documentation
- [x] Update JSDoc comments in `stream-llm.ts`
  - Document reasoning detection behavior
  - Document return type change
  - Add examples with reasoning
- [x] Update inline comments explaining content block parsing

### Phase 7: Validation
- [x] Run existing tests to verify backward compatibility
- [x] Run new tests to verify reasoning functionality
- [x] Run TypeScript compiler to verify types
- [x] Run `openspec validate add-reasoning-streaming --strict`

## Dependencies

### Prerequisites
- None (standalone enhancement)

### Blocking
- None

### Parallel Work
- Tests can be written alongside implementation
- Documentation can be written in parallel

## Estimated Effort

| Task | Effort | Notes |
|------|--------|-------|
| Type definitions | 0.5h | Simple interface changes |
| Helper functions | 1h | Content block parsing logic |
| Streaming path | 1.5h | Core implementation with emission |
| Non-streaming path | 1h | Simpler than streaming path |
| Tests | 2h | Comprehensive test coverage |
| Documentation | 0.5h | JSDoc updates |
| **Total** | **6.5h** | Approx. 1 day |

## Validation Criteria

Each task is complete when:
1. Code compiles without TypeScript errors
2. Tests pass locally
3. Code follows existing patterns in `stream-llm.ts`
4. Changes are minimal and focused
5. No breaking changes to existing behavior

## Rollback Plan

If issues arise:
1. Revert `stream-llm.ts` to previous version
2. Revert return type to `Promise<string>`
3. Remove new tests
4. Existing functionality restored
