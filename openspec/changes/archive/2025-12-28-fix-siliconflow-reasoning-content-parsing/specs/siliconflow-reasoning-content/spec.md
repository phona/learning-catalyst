# siliconflow-reasoning-content Specification

## Purpose
Ensure SiliconFlow reasoning content (`reasoning_content`) is preserved and can be streamed to the UI.

## ADDED Requirements

### Requirement: SiliconFlow Streaming Preserves Reasoning Content
When streaming SiliconFlow chat responses, the system MUST preserve per-chunk reasoning text when the
provider emits it as OpenAI-compatible delta fields.

**Priority**: P1 (High)
**Effort**: S

#### Scenario: Streaming Chunk Includes reasoning_content
- **Given** a SiliconFlow streaming chunk includes `choices[0].delta.reasoning_content = "think"`
- **When** the chunk is converted into an `AIMessageChunk`
- **Then** the resulting chunk exposes `additional_kwargs.reasoning_content` containing `"think"`

---

### Requirement: SiliconFlow Streaming Supports OpenRouter Reasoning Fallback
When streaming via OpenRouter-style payloads, the system MUST treat `choices[0].delta.reasoning` as a
fallback for reasoning content.

**Priority**: P2 (Medium)
**Effort**: XS

#### Scenario: Streaming Chunk Includes delta.reasoning
- **Given** a SiliconFlow streaming chunk includes `choices[0].delta.reasoning = "think"`
- **And** `choices[0].delta.reasoning_content` is absent
- **When** the chunk is processed
- **Then** the resulting chunk exposes `additional_kwargs.reasoning_content` containing `"think"`

---

### Requirement: SiliconFlow Non-Streaming Preserves Reasoning Content
When invoking SiliconFlow chat responses (non-streaming), the system MUST preserve reasoning content
when the provider emits it as OpenAI-compatible message fields.

**Priority**: P1 (High)
**Effort**: S

#### Scenario: Invoke Response Includes message.reasoning_content
- **Given** a SiliconFlow non-stream response includes `choices[0].message.reasoning_content = "plan"`
- **When** the response is converted into a LangChain `AIMessage`
- **Then** the message exposes `additional_kwargs.reasoning_content` containing `"plan"`

---

### Requirement: Raw Response Payload Is Not Retained
After extracting SiliconFlow reasoning content from raw payloads, the system MUST NOT retain the raw
payload on the emitted chunk/message object.

**Priority**: P1 (High)
**Effort**: XS

#### Scenario: __raw_response Removed After Parsing
- **Given** raw payload capture is enabled for SiliconFlow messages
- **When** a streamed chunk is emitted downstream
- **Then** `additional_kwargs.__raw_response` is not present on the emitted chunk/message

