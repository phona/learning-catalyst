# provider-setup-flow Specification

## Purpose
Guide users through AI provider configuration with clear steps and status feedback.

## ADDED Requirements

### Requirement: Settings Shows Provider Setup Steps
The AI Providers section MUST provide a clear, on-screen setup sequence for first-time users.

**Priority**: P1 (High)
**Effort**: S

#### Scenario: First-Time User Sees Setup Steps
- **Given** the user opens Settings with no configured providers
- **When** the AI Providers section is visible
- **Then** the UI shows the recommended setup steps (add key, validate, fetch models, assign)

---

### Requirement: Provider Rows Show Status
Each configured provider MUST show basic status (validated, models available, assigned model types).

**Priority**: P2 (Medium)
**Effort**: M

#### Scenario: User Sees Provider Status
- **Given** the user has at least one configured provider
- **When** the AI Providers section renders
- **Then** the provider row shows validation status and model count

