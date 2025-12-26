# Tasks: Fix ThreadList history still stuck/empty on refresh + improve tests

## Checklist

- [ ] Capture exact repro notes (refresh path + what “stuck” means)
- [ ] Implement non-blocking `unarchive()` in thread list adapter
- [ ] (Optional) Add “still loading” fallback + retry action in sidebar
- [ ] Add unit tests:
  - [ ] completed -> archived mapping
  - [ ] unarchive returns quickly even if IPC stalls
- [ ] Add renderer integration test that mounts real runtime wiring
- [ ] Add contract test for `sessions:list` status shape/values
- [ ] Run `npm test`
- [ ] Run `npm run lint`
- [ ] `openspec validate fix-threadlist-history-refresh-and-tests --strict`
- [ ] Archive change when complete

## Commands

Validate OpenSpec structure:

```
openspec validate fix-threadlist-history-refresh-and-tests --strict
```

Run tests + lint:

```
npm test
npm run lint
```

