# Proposal: Settings Accessibility + Keyboard Consistency

## Change ID
improve-settings-accessibility-and-keyboard

## Status
Proposed

## Type
UX + Accessibility

## Summary

Some Settings controls use strong accessibility patterns (ex: proper switch semantics),
but others do not. This leads to inconsistent keyboard behavior and weaker screen reader support.

This proposal standardizes toggle semantics and label wiring across Settings.

## User Story

As a keyboard or screen reader user, I want Settings controls to behave consistently so I can change options confidently.

## Current Behavior (Problem)

- Some toggle buttons are missing `role="switch"` and `aria-checked`.
- Some inputs have visible labels but are not connected via `htmlFor` + `id`.
- Custom listbox behavior should clearly expose focus and selection state to assistive tech.

## Goals

- All toggles behave like toggles (keyboard: Tab + Space/Enter).
- Labels are correctly associated with inputs.
- Custom dropdown/listbox behavior exposes selection state.
- No new production dependencies.

## Non-Goals

- Full accessibility redesign of the entire app.
- Changing visual styling beyond what is needed for focus and clarity.

## Proposed Change

### 1) Standardize toggle implementation

Use a consistent toggle pattern with:
- `role="switch"`
- `aria-checked={boolean}`
- keyboard handlers for Space/Enter
- visible focus ring

### 2) Wire labels to inputs

For each input/select:
- add a stable `id`
- add `htmlFor={id}` in its label

### 3) Improve custom listbox semantics (where applicable)

Ensure listbox state is exposed:
- selected option
- highlighted option
- expanded/collapsed state

## Acceptance Criteria

- All toggles have correct switch semantics and keyboard interactions.
- Labels are linked to inputs for Settings forms.
- Assistive tech can read state and selection for custom controls.
- `npm run lint` and `npm test` pass (or unrelated pre-existing failures are documented).

## Rollback Plan

Revert ARIA/keyboard changes; keep existing behavior.

