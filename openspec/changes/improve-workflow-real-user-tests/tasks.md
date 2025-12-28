# Tasks: Add “real user journey” tests for workflow streaming + resume

## Checklist

- [ ] Confirm existing workflow tests and where to add new ones
- [ ] Add shared test harness helpers (stream until interrupt, resume, read checkpoint)
- [ ] Add journey tests (standard path + question loop)
- [ ] Add journey tests (fast-track pass to complete, fast-track fail to teach)
- [ ] Add journey tests (practice give-up, remediation, circuit breaker)
- [ ] Add refresh/resume tests for pending interrupt prompt extraction
- [ ] Add routing boundary tests (0.75 confidence, 0.9 mastery)
- [ ] Add message-history invariant assertions for all interrupt/resume tests
- [ ] Run `npm test`
- [ ] Run `npm run lint`
- [ ] `openspec validate improve-workflow-real-user-tests --strict`
- [ ] Archive change when complete

## Commands

Validate OpenSpec structure:

```
openspec validate improve-workflow-real-user-tests --strict
```

Run tests:

```
npm test
```

Then lint:

```
npm run lint
```

