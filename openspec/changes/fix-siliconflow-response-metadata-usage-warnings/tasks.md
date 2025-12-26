# Tasks: Fix SiliconFlow Streaming Warnings (response_metadata.usage)

## Checklist

### Phase 1: Reproduce (RED)
- [x] Ensure RED tests reproduce the warning strings
- [x] Confirm warnings include nested keys (e.g. `cached_tokens`) from `response_metadata.usage.*`

### Phase 2: Fix (GREEN)
- [x] Extend usage extraction to include `message.response_metadata.usage`
- [x] Strip `message.response_metadata.usage` (and token-detail numeric keys) from streamed chunks
- [x] Keep current behavior: cumulative usage -> per-chunk deltas in `message.usage_metadata`

### Phase 3: Validate
- [ ] Run `npm test` (currently fails due unrelated existing failures in `src/main/services/domain/workflow/utils/__tests__/assistant-ui-stream-interrupt-persistence.regression.test.ts`)
- [x] Run `npm run lint`
