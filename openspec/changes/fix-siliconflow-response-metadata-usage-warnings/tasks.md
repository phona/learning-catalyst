# Tasks: Fix SiliconFlow Streaming Warnings (response_metadata.usage)

## Checklist

### Phase 1: Reproduce (RED)
- [ ] Ensure RED tests reproduce the warning strings
- [ ] Confirm warnings include nested keys (e.g. `cached_tokens`) from `response_metadata.usage.*`

### Phase 2: Fix (GREEN)
- [ ] Extend usage extraction to include `message.response_metadata.usage`
- [ ] Strip `message.response_metadata.usage` (and token-detail numeric keys) from streamed chunks
- [ ] Keep current behavior: cumulative usage -> per-chunk deltas in `message.usage_metadata`

### Phase 3: Validate
- [ ] Run `npm test` (note: fix unrelated failures separately if they already exist)
- [ ] Run `npm run lint`

