# Tasks: Fix SiliconFlow Streaming Warnings (response_metadata.usage)

## Checklist

### Phase 1: Reproduce (RED)
- [x] Ensure RED tests reproduce the warning strings
- [x] Confirm warnings include nested keys (e.g. `cached_tokens`) from `response_metadata.usage.*`
- [x] Reproduce warnings when message chunks are non-AI (e.g. `ChatMessageChunk`) and repeated fields come from `generationInfo`

### Phase 2: Fix (GREEN)
- [x] Extend usage extraction to include `message.response_metadata.usage`
- [x] Strip `message.response_metadata.usage` (and token-detail numeric keys) from streamed chunks
- [x] Strip usage-like fields for all chunk types (do not gate sanitization on `AIMessageChunk.isInstance`)
- [x] Keep current behavior: cumulative usage -> per-chunk deltas in `message.usage_metadata`

### Phase 3: Validate
- [x] Run `npm test` (fails due unrelated existing failures in `src/main/services/domain/workflow/utils/__tests__/assistant-ui-stream-interrupt-persistence.regression.test.ts`)
- [x] Run `npm run lint`
