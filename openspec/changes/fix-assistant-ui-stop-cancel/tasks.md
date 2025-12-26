# Tasks: Make assistant-ui Stop button actually cancel streams

## Checklist

- [ ] Confirm current bug (Stop does not cancel) with a simple manual repro
- [ ] Add/adjust renderer transport so AbortSignal cancels the stream
- [ ] Add preload -> main cancel IPC (streamId based)
- [ ] Add main stream registry + cancel handler, emit `abort`, close stream
- [ ] Add regression tests (renderer + main)
- [ ] Run `npm run lint`
- [ ] Run `npm test` (or document unrelated pre-existing failures)
- [ ] `openspec validate fix-assistant-ui-stop-cancel --strict`
- [ ] Archive change when complete

## Repro steps (manual)

1) Send a long prompt that streams for several seconds.
2) Click Stop while it is streaming.
3) Observe whether new chunks still append after Stop.

## Commands

Validate OpenSpec structure:

```
openspec validate fix-assistant-ui-stop-cancel --strict
```

Run focused tests while iterating (exact test file names TBD when created):

```
npm test
```

Then lint:

```
npm run lint
```

