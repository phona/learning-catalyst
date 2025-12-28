# settings-loading-skeleton Specification

## Purpose
Use a Settings-shaped skeleton during load to improve perceived performance and reduce layout jump.

## MODIFIED Requirements

### Requirement: Settings Uses Skeleton While Loading
When Settings configuration data is not ready, the Settings page MUST render a settings-shaped skeleton instead of a generic spinner.

**Priority**: P2 (Medium)
**Effort**: S

#### Scenario: Settings Shows Skeleton During Load
- **Given** the user opens Settings
- **And** configuration data is still loading
- **When** the page renders
- **Then** a Settings skeleton is shown

