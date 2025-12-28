# Proposal: Add Reasoning Content Support to stream-llm.ts

## Change ID
`add-reasoning-streaming`

## Status
Proposed

## Type
Enhancement

## Motivation

### Problem
The `streamLLM()` helper in `src/main/services/domain/workflow/utils/stream-llm.ts` currently only handles text content from LLM responses. Modern reasoning models (ChatGLM, DeepSeek R1, OpenAI o1) output structured reasoning/thinking content that should be displayed to users before the final response.

**Current Limitations:**
- `streamLLM()` returns `Promise<string>` (only content)
- Streaming loop only processes `chunk.content` field
- No emission of reasoning chunks despite emitter methods existing
- Non-streaming path ignores reasoning in responses

**Impact:**
- Reasoning models' thinking process is hidden from users
- Poor UX for ChatGLM and other reasoning-capable models
- Missing value proposition of reasoning models (transparency)

### Proposed Solution
Extend `streamLLM()` to detect and emit reasoning content using **Option 1: LangChain Content Blocks** approach.

**Why Content Blocks (Option 1)?**
- LangChain's standard format for structured message content
- Type-safe with proper interfaces (`ContentBlock.Reasoning`)
- Future-proof as LangChain moves toward content block architecture
- Cleaner than checking multiple raw provider-specific fields

### Key Features
1. **Detect reasoning in content blocks** - Check `chunk.content` array for `{ type: 'reasoning', reasoning: string }` blocks
2. **Emit reasoning chunks** - Use existing `reasoningStart`, `reasoningDelta`, `reasoningEnd` emitter methods
3. **Return both content and reasoning** - Change return type to include optional reasoning field
4. **Backward compatible** - Models without reasoning continue working unchanged

### Scope
**In Scope:**
- Modify `stream-llm.ts` to handle reasoning content blocks
- Update `StreamLLMOptions` and return type
- Add reasoning emission in streaming and non-streaming paths
- Add comprehensive test coverage

**Out of Scope:**
- UI rendering of reasoning (renderer changes separate)
- Provider-specific reasoning field handling (use standard content blocks)
- Reasoning storage in database (future work)
- User toggle for reasoning visibility (future work)

## Dependencies

### Code Dependencies
- `@langchain/core` - Content block types already defined
- `chunk-emitter.ts` - Reasoning emission methods already exist
- `assistant-ui-stream.ts` - Reasoning chunk types already defined

### Spec Dependencies
- `workflow-llm-streaming` - Extends existing streaming spec

### Related Changes
- None (standalone enhancement)

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Content blocks not yet widely adopted by providers | Medium | Fallback to check raw provider fields if needed |
| Breaking change to return type | Medium | Make reasoning optional in return type |
| Performance overhead from content block parsing | Low | Only parse when chunks have array content |
| Test complexity increases | Low | Reuse existing test patterns, add reasoning-specific tests |

## Success Criteria

1. `streamLLM()` detects reasoning in LangChain content blocks
2. Reasoning is emitted via `reasoningStart/reasoningDelta/reasoningEnd` chunks
3. Function returns both `content` and optional `reasoning`
4. All existing tests pass (backward compatibility)
5. New tests cover reasoning detection and emission
6. Non-streaming path also handles reasoning correctly

## Open Questions

1. **Should reasoning and content use the same messageId?**
   - **Recommendation**: Yes, use same ID to link them in UI
   - **Alternative**: Separate reasoningId for independent rendering

2. **Should reasoning be emitted before or can it interleave with content?**
   - **Recommendation**: Emit as it appears in chunks (typically reasoning first)
   - **Rationale**: Respects provider's intended ordering

3. **Should we add fallback for raw provider fields?**
   - **Recommendation**: Start with content blocks only, add fallback if needed
   - **Rationale**: Keep implementation simple initially

## References

- LangChain Content Blocks: `node_modules/@langchain/core/dist/messages/content/index.d.ts` (lines 73-92)
- Existing Emitter Methods: `src/main/services/domain/workflow/utils/chunk-emitter.ts` (lines 155-175)
- Existing Spec: `openspec/specs/workflow-llm-streaming/spec.md`
