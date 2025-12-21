# Renderer Reorganization - Design Document

**Change ID**: `reorganize-renderer-structure`
**Date**: 2025-12-21

## Architectural Rationale

### Current State Analysis

The current `src/renderer` structure exhibits several anti-patterns that hinder maintainability:

1. **Component Overloading**: The `components/` directory serves as a catch-all for:
   - Route-level pages (`DiscoveryPage`, `LearningDashboard`)
   - Layout components (`Layout.tsx`, `Header.tsx`)
   - Feature-specific UI (`Chat/`, `Config/`, `Knowledge/`)
   - Shared UI primitives (`UI/`)
   - Application composition (`App/`)

2. **Scattered Utilities**:
   - UI primitives exist in `components/UI/` AND `ui/PagePrimitives.tsx`
   - Generic utilities in `utils/` lack a clear "shared" home
   - Hooks in `hooks/` are mixed between generic and feature-specific

3. **Inconsistent Separation**:
   - `services/` and `stores/` are properly separated
   - But they're not clearly tied to features that use them
   - App initialization logic in `init/` is separate from `components/App/`

### Design Principles

#### 1. Feature-Driven Organization
Code should be organized by what it does, not just by technical type. The new structure creates clear "homes" for different types of code:

- **pages/**: Route-level components that match URL paths
- **widgets/**: Reusable UI components that appear across features
- **features/**: Domain-specific UI and logic
- **shared/**: Generic utilities available to all code

#### 2. Import Clarity
Clear import patterns reduce cognitive load:
```typescript
// From pages
import { Button } from '@/renderer/shared/ui';
import { KnowledgeGraph } from '@/renderer/features/knowledge';

// From features
import { cn } from '@/renderer/shared/lib';
import { useSession } from '@/renderer/shared/hooks';

// Clear ownership
import { ChatInterface } from '@/renderer/pages/chat';
```

#### 3. Single Responsibility Per Directory
Each directory has a specific purpose:
- `pages/*` = Route handlers (can import anything)
- `widgets/*` = Reusable UI (can be imported anywhere)
- `features/*` = Domain logic (should be self-contained)
- `shared/*` = Utilities (no external dependencies)
- `app/*` = Application composition (orchestrates everything)

#### 4. Co-location with Tests
Keeping `__tests__` directories with their modules ensures:
- Tests are easy to find
- Test structure mirrors source structure
- Moving code doesn't require separate test moves

### Alternative Designs Considered

#### Alternative 1: Atomic Design Pattern
Organize by atomic design primitives (atoms, molecules, organisms, templates, pages).

**Pros**:
- Well-established pattern
- Clear size/complexity boundaries

**Cons**:
- Overhead for small projects
- Forces categorization that may not make sense
- Cross-feature sharing becomes awkward

**Rejected because**: The project doesn't have enough UI components to justify the overhead, and feature-driven organization is more intuitive for this codebase.

#### Alternative 2: Domain-Driven Design
Organize strictly by business domain (learning, knowledge, chat, etc.).

**Pros**:
- Aligns with domain structure
- Clear ownership boundaries

**Cons**:
- Layout and shared UI don't fit cleanly
- Utility sharing becomes complex
- Route composition needs special handling

**Rejected because**: Layout and shared utilities don't map well to business domains, creating awkward boundaries.

#### Alternative 3: Keep Current + Tidy Up
Make minimal changes: just consolidate UI directories and clean up naming.

**Pros**:
- Minimal disruption
- Fast to implement
- Lower risk

**Cons**:
- Doesn't solve the fundamental organization problem
- Still unclear where new code should go
- Doesn't scale well for future features

**Rejected because**: While lowest-risk, it doesn't address the core maintainability issues identified.

#### Alternative 4: Feature-Sliced Design (FSD)
Use FSD (Feature-Sliced Design) methodology with layers: app/ → processes/ → pages/ → widgets/ → features/ → entities/.

**Pros**:
- Industry best practice
- Handles complex applications well
- Clear separation of concerns

**Cons**:
- Overkill for current complexity
- Requires learning FSD conventions
- More rigid than needed

**Selected approach is similar but simpler**: We borrow the pages/widgets/features concept from FSD but simplify it to avoid unnecessary complexity.

### Trade-offs and Decisions

#### Trade-off 1: Number of Directory Levels
**Decision**: Use 2-3 levels max (e.g., `features/chat/ui/` not `features/chat/components/interface/`)

**Rationale**:
- Shallow hierarchies are easier to navigate
- TypeScript path aliases work better with shorter paths
- Can always refactor deeper if needed

#### Trade-off 2: Barrel Exports
**Decision**: Use barrel exports (`index.ts`) only at module boundaries

**Rationale**:
- Prevents "everything imports everything" anti-pattern
- Makes dependency direction clear
- Still allows convenient imports from module boundaries

**Example**:
```typescript
// ✅ Good - clear boundary
// shared/ui/index.ts exports all UI components
import { Button } from '@/renderer/shared/ui';

// ❌ Bad - unclear what comes from where
// features/chat/index.ts exports everything from chat feature
import { ChatInterface } from '@/renderer/features/chat';
```

#### Trade-off 3: Feature Boundaries
**Decision**: Keep features fairly broad (e.g., `chat/`, `knowledge/`) rather than granular

**Rationale**:
- Current codebase has clear feature boundaries
- Prevents over-fragmentation
- Easier to find related code

#### Trade-off 4: UI Kit Location
**Decision**: Merge `components/UI/` and `ui/` into `shared/ui/`

**Rationale**:
- Single source of truth for UI primitives
- Easier to maintain design system
- Clear distinction from feature UI

### Migration Strategy Rationale

#### Phase-Based Approach
Breaking the migration into phases reduces risk:

1. **Shared resources first** (Phase 1): Update shared utilities and UI, then other code can depend on the new structure
2. **App structure next** (Phase 2): Core app files that everything depends on
3. **Then pages and features** (Phases 3-5): Feature code that can be moved independently
4. **Finally validation and cleanup** (Phases 6-8): Ensure everything works, then remove old structure

This ensures each phase has solid footing before building on it.

#### Dependency Direction
The migration respects existing dependency direction:
```
main.tsx → app/* → pages/* → features/* → shared/*
```

This ensures no circular dependencies and clear flow.

### Scalability Considerations

#### How It Scales for New Features
```typescript
// Adding a new feature "calendar"
1. Create src/renderer/features/calendar/
2. Add components in features/calendar/ui/
3. Add page in src/renderer/pages/calendar/CalendarPage.tsx
4. Add route in src/renderer/app/AppRoutes.tsx
5. Export from src/renderer/features/calendar/index.ts
```

Clear, predictable pattern.

#### How It Handles Cross-Feature Code
```typescript
// If calendar needs a component from chat feature
1. Check if it's generic enough for shared/ui
2. If chat-specific, import directly from @/renderer/features/chat/ui
3. If becoming generic, move to shared/ui
```

Clear rules for code movement.

#### How It Handles Shared Patterns
```typescript
// If multiple features need similar structure
features/
  shared-pattern/  # Only if truly reusable across many features
    ui/
    model/
    api/
```

Pattern is available if needed, but starts simple.

### Risks and Mitigations

#### Risk 1: Import Breakage
**Mitigation**:
- Update imports in phases aligned with file moves
- Use automated refactoring tools
- Test after each phase
- Maintain temporary backward-compatible exports if needed

#### Risk 2: Developer Confusion During Transition
**Mitigation**:
- Complete migration in focused work sessions
- Provide clear documentation
- Update all examples and guides immediately
- Consider feature flags or branch for migration

#### Risk 3: Test Failures
**Mitigation**:
- Update test imports along with source imports
- Run tests after each phase
- Have rollback plan via git commits
- Focus on integration tests after full migration

#### Risk 4: Build Issues
**Mitigation**:
- Verify build after each major phase
- Update TypeScript path mappings if needed
- Check for dynamic imports that might break

### Performance Considerations

#### Bundle Impact
The new structure doesn't change bundle composition, just file organization. Build tools will resolve paths the same way.

#### Runtime Impact
No runtime impact - this is purely a source organization change.

#### Developer Experience Impact
**Positive**:
- Faster file discovery
- Clearer code ownership
- Reduced cognitive load

**Potential Negative**:
- Temporary slow-down during migration
- Need to learn new paths

**Overall**: Net positive once migration completes.

### Testing Strategy

#### Unit Tests
- Update imports along with source
- No behavior changes expected
- Should continue to pass

#### Integration Tests
- Most important for verifying routing and composition
- May need updates for changed import paths
- Run after each phase

#### E2E Tests
- Should be unaffected (tests UI behavior, not file structure)
- Run after full migration to confirm

### Success Metrics

1. **Code Organization**:
   - [ ] No confusion about where to add new code
   - [ ] Import paths are predictable
   - [ ] Related code is co-located

2. **Developer Experience**:
   - [ ] Onboarding time reduced (easier to understand structure)
   - [ ] Feature development faster (clearer where to put things)
   - [ ] Code reviews easier (clearer ownership)

3. **Code Quality**:
   - [ ] No increase in circular dependencies
   - [ ] No build or test regressions
   - [ ] Maintainable going forward

### References

- Feature-Sliced Design methodology (simplified version)
- Atomic Design (considered but rejected)
- React project structure best practices
- Current codebase analysis in `src/renderer/`
