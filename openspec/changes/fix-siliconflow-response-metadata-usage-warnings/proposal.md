# OpenSpec Change Proposal: Fix SiliconFlow Streaming Warnings (response_metadata.usage)

## Why

When using the **SiliconFlow** provider with streaming enabled, LangChain prints noisy warnings like:

```
field[cached_tokens] already exists in this message chunk and value has unsupported type.
field[completion_tokens] already exists in this message chunk and value has unsupported type.
field[total_tokens] already exists in this message chunk and value has unsupported type.
```

These warnings are not actionable, but they spam the console and hide real problems.

## Root cause (simple)

SiliconFlow (OpenAI-compatible) can include **token usage** in *every* streamed chunk.

In LangChain JS, streamed chunks have a `message` (an `AIMessageChunk`).
That message has `response_metadata`, and OpenAI-compatible streaming often places usage here:

```
message.response_metadata.usage = {
  prompt_tokens: 10,
  completion_tokens: 2,
  total_tokens: 12,
  prompt_tokens_details: { cached_tokens: 1 },
  completion_tokens_details: { audio_tokens: 0, reasoning_tokens: 0 },
}
```

LangChain later aggregates streamed chunks by **concatenating** message chunks.
Concatenation merges dictionaries, and duplicate numeric keys with different values cause warnings.

ASCII flow:

```
SiliconFlow stream chunks (cumulative usage each chunk)
  chunk #1 response_metadata.usage.cached_tokens = 0
  chunk #2 response_metadata.usage.cached_tokens = 1
  chunk #3 response_metadata.usage.cached_tokens = 2
                 |
                 v
LangChain merges message chunks (concat / merge response_metadata)
  duplicate numeric keys -> console.warn(...)
```

### Why the earlier fix was not enough

We previously stripped usage-like keys from `generationInfo` (and some top-level keys),
but the real repeated fields also appear under:

- `message.response_metadata.usage.*`
- nested token-detail objects like `prompt_tokens_details.cached_tokens`

If those nested numeric keys remain, LangChain will still warn.

Also, not every streamed `chunk.message` is an `AIMessageChunk` (some providers / paths can yield
generic `ChatMessageChunk`). If our sanitization is gated behind `AIMessageChunk.isInstance(...)`,
then those non-AI chunks keep their repeated numeric fields and still trigger warnings when
LangChain merges chunks.

## What changes (high level)

Update `SiliconFlowChatModel` streaming sanitization so it removes **all per-chunk usage fields**
from places that LangChain merges:

- `message.response_metadata.usage` (entire object)
- any nested usage/token-details that might appear elsewhere under `response_metadata`
- `message.additional_kwargs` (if raw responses or usage fields are embedded there)
- `chunk.generationInfo` (keep stripping to be safe)

We still keep correct token tracking by writing **per-chunk deltas** to `message.usage_metadata`.

## Implementation notes (concrete)

Location: `src/main/services/agent/siliconflow-chat-model.ts`

For each streamed chunk:

1) Read cumulative usage from the first place that has it:
   - `message.usage_metadata` (if present)
   - `message.response_metadata.usage` (OpenAI-compatible usage shape)
   - `chunk.generationInfo`
2) Convert cumulative -> per-chunk deltas and store in `message.usage_metadata`
3) Remove usage payloads from merge-prone structures:
   - `delete message.response_metadata.usage`
   - strip token-detail numeric keys like `cached_tokens`, `audio_tokens` if they appear anywhere else
   - strip usage-like keys from `message.additional_kwargs` and `chunk.generationInfo`

## Scope

In scope:
- SiliconFlow streaming behavior only (custom `SiliconFlowChatModel`)
- Unit tests that reproduce warnings and prove they are gone

Out of scope:
- Modifying LangChain internals
- Global console filtering
- Changing other providers

## Test plan (TDD)

Add RED tests that reproduce warnings when usage repeats under `response_metadata.usage`:

- `src/main/services/agent/__tests__/siliconflow-chat-model.response-metadata-usage.red.test.ts`

Then implement the fix until the tests are GREEN.

## Success criteria

- No `field[...] already exists ... unsupported type` warnings during SiliconFlow streaming
- Token usage remains correct (cumulative counts become per-chunk deltas; totals remain accurate)
- No behavior change for non-SiliconFlow providers
- `npm test` and `npm run lint` pass

## Risks

- Risk: removing `response_metadata.usage` drops metadata some feature might read.
  - Mitigation: We treat per-chunk usage as internal streaming noise; we keep the useful result in `usage_metadata`.
