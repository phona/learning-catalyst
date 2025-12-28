# Tasks: Fix ThreadList "history sessions loading" stuck on refresh

## Checklist

- [x] Confirm bug repro via renderer regression test (only archived sessions previously rendered as empty)
- [x] Update `ThreadListSidebar` to render archived threads under a "History" section
- [x] Update the renderer regression test to assert history items render (remove `it.fails`)
- [x] Run `npm run test:renderer`
- [x] Run `npm run lint`
- [x] `openspec validate fix-threadlist-history-stuck-loading --strict`
- [x] Archive change when complete

## Manual repro steps

1) Ensure you have at least one session stored that ends up with `status: "completed"`.
2) Refresh the page on `/chat` (or restart the app).
3) Observe that the sidebar should show those sessions under "History".

## Commands

Validate OpenSpec structure:

```
openspec validate fix-threadlist-history-stuck-loading --strict
```

Run tests + lint:

```
npm run test:renderer
npm run lint
```
