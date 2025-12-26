# OpenSpec Change Proposal: Fix SiliconFlow Streaming Usage Warnings (generationInfo)

## Why

When chatting with the SiliconFlow provider in dev (`npm run dev`), LangChain prints noisy warnings like:

```
field[completion_tokens] already exists in this message chunk and value has unsupported type.
field[total_tokens] already exists in this message chunk and value has unsupported type.
```

These warnings are not just “log noise”:
- They hide real warnings in the console.
- They are triggered during normal streaming, so they appear often.

## Root cause (simple)

SiliconFlow can include token usage fields in **every streamed chunk**.

LangChain JS does 2 things during streaming:
1) It merges `chunk.generationInfo` into `chunk.message.response_metadata`
2) It concatenates message chunks (`concat`) to build a final message

When the same numeric fields (`completion_tokens`, `total_tokens`, etc.) exist in multiple chunks,
LangChain’s merge function does not know how to merge numbers and warns.

ASCII flow:

```
SiliconFlow stream chunks
  chunk #1: generationInfo { completion_tokens: 1, total_tokens: 11 }
  chunk #2: generationInfo { completion_tokens: 2, total_tokens: 12 }
        |
        v
LangChain BaseChatModel merges:
  response_metadata = { ...generationInfo, ...response_metadata }
        |
        v
Later: message.concat(otherMessage)
  merge response_metadata
  -> duplicate numeric keys -> console.warn
```

## What changes

Add SiliconFlow-specific sanitization so we do not feed “repeat numeric usage keys” into
LangChain’s message merge:

- In `SiliconFlowChatModel`, strip usage-like keys not only from:
  - `message.response_metadata`
  - `message.additional_kwargs`
  but also from:
  - `chunk.generationInfo`

This is consistent with the intent of the official Python integration
(`langchain_siliconflow/chat_models.py`): treat SiliconFlow’s per-chunk usage as cumulative data
that must be normalized for streaming, so aggregation is correct and logs stay clean.

## Scope

In scope:
- Only SiliconFlow streaming behavior (custom `SiliconFlowChatModel`)
- Unit test to reproduce and prevent regression

Out of scope:
- Changing LangChain internals
- Global console filtering/suppression
- Changing non-SiliconFlow providers

## Success criteria

- No duplicate-field warnings during SiliconFlow streaming in chat UI
- SiliconFlow token usage remains correct (deltas, not summed cumulative totals)
- No impact on other providers
- `npm test` and `npm run lint` pass

## Risks and mitigations

- Risk: removing keys from `generationInfo` could drop useful metadata.
  - Mitigation: only remove known usage-like keys; leave all other keys unchanged.

