# Tasks: Add Reasoning Support to stream-llm.ts

## Implementation Checklist

### Phase 1: Type Definitions
- [ ] Add `StreamLLMResult` interface with `content` and optional `reasoning` fields
- [ ] Update `StreamLLMOptions` interface if needed
- [ ] Add content block type imports from `@langchain/core`

### Phase 2: Helper Functions
- [ ] Implement `extractReasoning(chunk: AIMessageChunk): string | undefined`
  - [ ] Handle array content blocks with `type: 'reasoning'`
  - [ ] Return undefined for non-array or non-reasoning content
- [ ] Implement `extractText(chunk: AIMessageChunk): string`
  - [ ] Handle string content (passthrough)
  - [ ] Handle array content blocks with `type: 'text'`
  - [ ] Accumulate text from multiple blocks

### Phase 3: Streaming Path
- [ ] Update streaming loop to use `extractReasoning()` and `extractText()`
- [ ] Track reasoning state (`reasoningStarted` boolean)
- [ ] Emit `reasoningStart` on first reasoning chunk
- [ ] Emit `reasoningDelta` for each reasoning chunk
- [ ] Emit `reasoningEnd` after all reasoning chunks
- [ ] Accumulate `fullReasoning` variable
- [ ] Update return to `{ content, reasoning }` object

### Phase 4: Non-Streaming Path
- [ ] Parse response content with `extractReasoning()` and `extractText()`
- [ ] Emit reasoning chunks if reasoning present
- [ ] Update return to `{ content, reasoning }` object

### Phase 5: Tests
- [ ] Add test: "should detect reasoning in content blocks"
  - Mock model with `content: [{ type: 'reasoning', reasoning: '...' }]`
  - Verify reasoning is extracted
- [ ] Add test: "should emit reasoning chunks in streaming mode"
  - Verify `reasoningStart`, `reasoningDelta`, `reasoningEnd` emitted
  - Verify chunk order: reasoning before text
- [ ] Add test: "should return reasoning in result"
  - Verify return type includes reasoning field
  - Verify reasoning content is accumulated
- [ ] Add test: "should handle mixed reasoning and text chunks"
  - Mock model with interleaved reasoning and text blocks
  - Verify both are extracted correctly
- [ ] Add test: "should handle reasoning-only response"
  - Mock model with only reasoning blocks
  - Verify content is empty string, reasoning is present
- [ ] Add test: "should handle text-only response (no reasoning)"
  - Mock model with string content or text blocks only
  - Verify reasoning is undefined
- [ ] Add test: "should emit reasoning in non-streaming mode"
  - Mock invoke response with reasoning content
  - Verify reasoning chunks emitted
- [ ] Add test: "should use same messageId for reasoning and text"
  - Verify reasoning chunks use same ID as text chunks
- [ ] Add test: "should handle empty reasoning block"
  - Mock model with empty reasoning string
  - Verify behavior (emit start/end with no delta?)
- [ ] Add test: "should handle multiple reasoning blocks"
  - Mock model with multiple reasoning chunks
  - Verify all are accumulated
- [ ] Update existing tests for new return type
  - Update assertions to expect object instead of string
  - Ensure backward compatibility tests pass

### Phase 6: Documentation
- [ ] Update JSDoc comments in `stream-llm.ts`
  - Document reasoning detection behavior
  - Document return type change
  - Add examples with reasoning
- [ ] Update inline comments explaining content block parsing

### Phase 7: Validation
- [ ] Run existing tests to verify backward compatibility
- [ ] Run new tests to verify reasoning functionality
- [ ] Run TypeScript compiler to verify types
- [ ] Run `openspec validate add-reasoning-streaming --strict`

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
