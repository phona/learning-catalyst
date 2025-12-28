# Tasks: Settings Accessibility + Keyboard Consistency

## Checklist

- [ ] Standardize toggle component semantics (`role="switch"`, `aria-checked`, keyboard)
- [ ] Add `id` + `htmlFor` label wiring across Settings inputs
- [ ] Review custom listbox controls for `aria-*` state (expanded/selected)
- [ ] Add tests for keyboard toggling and basic accessibility attributes
- [ ] Run `npm run lint`
- [ ] Run `npm test` (or document unrelated pre-existing failures)
- [ ] `openspec validate improve-settings-accessibility-and-keyboard`
- [ ] Archive change when complete

## Commands

Validate the proposal:

```
openspec validate improve-settings-accessibility-and-keyboard
```

