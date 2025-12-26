# Proposal: Custom SiliconFlow Chat Model

## Why

SiliconFlow includes cumulative usage fields in every streamed chunk. In LangChain JS this causes:

- Noisy console warnings when chunk metadata is merged (duplicate numeric fields)
- Incorrect token accounting when cumulative usage values are summed across chunks

We want clean streaming logs and accurate token usage totals without affecting other providers.

## Summary

Implement a custom `SiliconFlowChatModel` class that extends `ChatOpenAI` to properly handle SiliconFlow's streaming response format, which includes cumulative token usage metadata in every SSE chunk. This will eliminate console warnings about duplicate field merging and ensure accurate token tracking.

## What Changes

- Add `src/main/services/agent/siliconflow-chat-model.ts` implementing `SiliconFlowChatModel`
- Update `src/main/services/agent/provider-factory.ts` to use `SiliconFlowChatModel` for `siliconflow`
- Add `src/main/services/agent/__tests__/siliconflow-chat-model.test.ts` for delta + warning suppression coverage

## Problem Statement

When using SiliconFlow as an AI provider, streaming chat responses produce repeated console warnings:

```
field[total_tokens] already exists in this message chunk and value has unsupported type.
field[completion_tokens] already exists in this message chunk and value has unsupported type.
field[reasoning_tokens] already exists in this message chunk and value has unsupported type.
```

### Root Cause

1. **SiliconFlow API Behavior**: Unlike OpenAI, SiliconFlow includes usage fields (`total_tokens`, `completion_tokens`, `reasoning_tokens`) in **every streaming chunk** with cumulative values
2. **LangChain Merge Logic**: When accumulating chunks, LangChain's `_mergeDicts()` encounters the same numeric fields in each chunk
3. **No Merge Rule**: LangChain can concat strings, merge objects, and merge lists, but has no rule for replacing/overwriting numeric fields
4. **Result**: Warnings are logged, and token usage may be overcounted if LangChain sums the cumulative values

### Current Workaround

Toggling LangChain's `streamUsage` alone doesn't solve this because SiliconFlow's provider-sent usage fields can still appear in per-chunk metadata.

## Proposed Solution

Create a custom `SiliconFlowChatModel` class that extends `ChatOpenAI` and overrides the streaming response handler to:

1. **Track cumulative totals** across chunks (previous input/output tokens)
2. **Calculate deltas** before yielding each chunk (`current - previous`)
3. **Replace cumulative values** with deltas in `usage_metadata`
4. **Eliminate merge warnings** by stripping repeated usage keys from `response_metadata` / `additional_kwargs`

This approach is modeled after the official [SiliconFlow Python LangChain integration](https://github.com/siliconflow/langchain-siliconflow/blob/main/langchain_siliconflow/chat_models.py), which implements the same delta calculation pattern.

### Key Constraints

1. **Must extend `ChatOpenAI`** - Leverage existing LangChain infrastructure
2. **Override protected method** - `_streamResponseChunks()` to intercept chunks
3. **Maintain type safety** - Full TypeScript strict mode compliance
4. **No breaking changes** - Drop-in replacement for current SiliconFlow implementation
5. **Minimal overhead** - Only affect SiliconFlow provider, no impact on other providers

## Affected Components

| Component | Impact | Change |
|-----------|--------|--------|
| `src/main/services/agent/siliconflow-chat-model.ts` | NEW | Custom model class |
| `src/main/services/agent/provider-factory.ts` | MODIFY | Import and use custom class |
| `src/main/services/agent/__tests__/siliconflow-chat-model.test.ts` | NEW | Unit tests |
| Console output | IMPROVE | Eliminate warnings |

## Success Criteria

- [ ] No more console warnings when streaming with SiliconFlow
- [ ] Token usage is accurately tracked (not overcounted)
- [ ] All existing SiliconFlow functionality preserved
- [ ] No impact on other AI providers (OpenAI, ChatGLM, etc.)
- [ ] Type-safe implementation with full test coverage
- [ ] Passes `openspec validate --strict`

## Related Changes

This change is independent but relates to:
- **chat-transport-bucket2**: Uses streaming for chat responses
- **workflow-llm-streaming**: Workflow LLM streaming implementation

No spec modifications required - this is an internal implementation detail that doesn't change external contracts or behavior.
