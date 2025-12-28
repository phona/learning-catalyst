# Tasks: Fix SiliconFlow Streaming Usage Warnings (generationInfo)

## Checklist

### Phase 1: Reproduce (TDD)
- [x] Add a failing test that streams chunks whose usage fields are in `generationInfo`
- [x] Verify the test reproduces the exact LangChain warning strings

### Phase 2: Fix
- [x] Strip usage-like keys from `chunk.generationInfo` inside `SiliconFlowChatModel`
- [x] Keep existing behavior: cumulative usage -> per-chunk deltas in `usage_metadata`

### Phase 3: Validate
- [x] Run `npm test`
- [x] Run `npm run lint`
