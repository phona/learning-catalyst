# Tasks: Fix ThreadList "history sessions loading" stuck on refresh

## Checklist

- [ ] Confirm bug repro in the running app (refresh with only completed sessions)
- [ ] Update `ThreadListSidebar` to render archived threads under a "History" section
- [ ] Update the renderer regression test to assert history items render (remove `it.fails`)
- [ ] Run `npm run test:renderer`
- [ ] Run `npm run lint`
- [ ] `openspec validate fix-threadlist-history-stuck-loading --strict`
- [ ] Archive change when complete

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

