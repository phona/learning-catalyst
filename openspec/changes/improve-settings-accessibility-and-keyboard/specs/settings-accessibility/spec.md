# settings-accessibility Specification

## Purpose
Make Settings controls consistent for keyboard and assistive technology usage.

## ADDED Requirements

### Requirement: Toggles Use Switch Semantics
All toggle controls in Settings MUST expose switch semantics and state.

**Priority**: P1 (High)
**Effort**: M

#### Scenario: Toggle Exposes State
- **Given** the user focuses a toggle in Settings
- **When** the toggle is enabled or disabled
- **Then** the element exposes `role="switch"` and `aria-checked` correctly

---

### Requirement: Toggles Are Keyboard Operable
All Settings toggles MUST be operable via keyboard.

**Priority**: P1 (High)
**Effort**: M

#### Scenario: Space Toggles Setting
- **Given** the user tabs to a Settings toggle
- **When** the user presses Space
- **Then** the toggle changes state

