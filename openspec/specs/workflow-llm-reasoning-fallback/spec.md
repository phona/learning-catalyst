# workflow-llm-reasoning-fallback Specification

## Purpose
TBD - created by archiving change fix-siliconflow-reasoning-content-parsing. Update Purpose after archive.
## Requirements
### Requirement: streamLLM Detects Reasoning From additional_kwargs.reasoning_content
The `streamLLM()` helper MUST treat `AIMessageChunk.additional_kwargs.reasoning_content` (string) as a
valid reasoning delta source, in addition to reasoning content blocks.

**Priority**: P1 (High)
**Effort**: XS

#### Scenario: Helper Emits Reasoning When Provided In additional_kwargs
- **Given** streaming is enabled and a chunk arrives with `additional_kwargs.reasoning_content = "r"`
- **When** `streamLLM()` processes the chunk
- **Then** it emits `reasoning-start` (once) and `reasoning-delta` with `"r"`
- **And** it eventually emits `reasoning-end`

---

### Requirement: Text Streaming Remains Unchanged
Adding the reasoning fallback MUST NOT change how `streamLLM()` extracts and emits user-visible text.

**Priority**: P1 (High)
**Effort**: XS

#### Scenario: Text-Only Chunks Still Emit Text Deltas Only
- **Given** streaming is enabled and chunks arrive with text content only
- **When** `streamLLM()` processes the chunks
- **Then** it emits `text-*` chunks as before
- **And** it emits no `reasoning-*` chunks

