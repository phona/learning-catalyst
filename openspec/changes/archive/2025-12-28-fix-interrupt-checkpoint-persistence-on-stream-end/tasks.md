# Tasks: Fix Interrupt Checkpoint Persistence When Ending Turn Stream

## Checklist

- [ ] Confirm reproducible symptom in logs (teach explain repeats after follow-up question)
- [x] Make regression tests RED (done in repo) and keep them deterministic
- [x] Refactor `toAssistantUIStream()` to avoid synchronous upstream cancellation on interrupt
- [x] Ensure “finish promptly on interrupt” behavior remains (existing tests)
- [x] Turn the RED tests GREEN
- [x] Add one more “guardrail” test: upstream `return()` not called synchronously on interrupt
- [x] Run `npm test`
- [x] Run `npm run lint`
- [x] `openspec validate fix-interrupt-checkpoint-persistence-on-stream-end --strict`
- [ ] Archive change when complete

## Commands

Validate OpenSpec structure:
```
openspec validate fix-interrupt-checkpoint-persistence-on-stream-end --strict
```

Run tests + lint:
```
npm test
npm run lint
```

