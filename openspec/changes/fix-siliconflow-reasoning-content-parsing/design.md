# Design: Fix SiliconFlow Reasoning Content Parsing

## Goal (one sentence)

Preserve SiliconFlow “reasoning” text (`reasoning_content`) end-to-end in our existing streaming
pipeline without changing non-SiliconFlow behavior.

## Key constraints

- Keep scope small and provider-specific.
- No new production dependencies.
- Avoid retaining large raw response payloads on message objects.

## Where the reasoning exists vs where we extract it

SiliconFlow and OpenRouter can emit reasoning in OpenAI-compatible fields:

```
streaming chunk (completions):
  choices[0].delta.reasoning_content
  choices[0].delta.reasoning          (OpenRouter fallback)

non-stream response (completions):
  choices[0].message.reasoning_content
```

LangChain JS does not preserve these fields in `AIMessageChunk.content`, so extraction must happen
from the raw payload.

## Approach

### A) Keep raw payload briefly (SiliconFlow only)

Enable LangChain OpenAI internal `__includeRawResponse` for SiliconFlow chat models so each emitted
chunk/message includes `additional_kwargs.__raw_response`.

This is SiliconFlow-only to avoid changing memory behavior globally.

### B) Parse and normalize into one place

Normalize all reasoning into:
- `AIMessageChunk.additional_kwargs.reasoning_content` (string)

This matches the Python reference behavior and fits our shared types (`reasoning_content` exists).

### C) Emit using existing reasoning chunk protocol

Update `streamLLM()` to treat `additional_kwargs.reasoning_content` as a reasoning delta source,
alongside existing content-block reasoning extraction.

This minimizes risk because it does not change `chunk.content` shapes.

## Alternatives considered

### Alternative 1: Convert reasoning into LangChain content blocks

Pros:
- Keeps all reasoning in `chunk.content` blocks, consistent with existing extraction.

Cons:
- Requires mutating `AIMessageChunk.content` (string vs array) and careful type handling.
- Higher risk of breaking downstream code that assumes `content` is a string.

Decision: not chosen (more invasive than needed).

### Alternative 2: Patch LangChain internals

Pros:
- “Correct” upstream fix.

Cons:
- High maintenance cost; upgrades become risky.

Decision: not chosen.

## Memory / safety notes

Raw payloads can be large. To reduce risk:
- Extract reasoning immediately.
- Remove `additional_kwargs.__raw_response` right after parsing.

## Open questions (tracked in proposal)

- Should reasoning be persisted into stored messages/checkpoints?
- Do we need explicit support for LangChain Responses API shapes for SiliconFlow usage today?

