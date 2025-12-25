# Capability: Workflow Import Graph Is Acyclic

## MODIFIED Requirements

### Requirement: Workflow State Does Not Depend On Nodes
`src/main/services/domain/workflow/state.ts` MUST NOT import from `src/main/services/domain/workflow/nodes/*`.

**Priority**: P0 (Critical)
**Effort**: S

#### Scenario: Session Blueprint Types Come From Neutral Module
- **Given** workflow state needs the `SessionBlueprint` type
- **When** state imports it
- **Then** it imports from `workflow/types/session-blueprint.ts` (or equivalent)
- **And** not from any node module.

### Requirement: No Circular Dependencies In Workflow
The workflow domain MUST not have circular dependencies.

**Priority**: P0 (Critical)
**Effort**: S

#### Scenario: Dependency Scanner Reports No Cycles
- **Given** `npx madge --circular --extensions ts,tsx --ts-config tsconfig.json src/main/index.ts`
- **When** it is run
- **Then** it reports no cycles in `src/main/services/domain/workflow/**`.

