# Tasks: Fix Interrupt Checkpoint Persistence When Ending Turn Stream

## Checklist

- [ ] Confirm reproducible symptom in logs (teach explain repeats after follow-up question)
- [ ] Make regression tests RED (done in repo) and keep them deterministic
- [ ] Refactor `toAssistantUIStream()` to avoid synchronous upstream cancellation on interrupt
- [ ] Ensure “finish promptly on interrupt” behavior remains (existing tests)
- [ ] Turn the RED tests GREEN
- [ ] Add one more “guardrail” test: upstream `return()` not called synchronously on interrupt
- [ ] Run `npm test`
- [ ] Run `npm run lint`
- [ ] `openspec validate fix-interrupt-checkpoint-persistence-on-stream-end --strict`
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

