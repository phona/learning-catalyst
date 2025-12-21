# renderer-structure Specification

## Purpose
TBD - created by archiving change reorganize-renderer-structure. Update Purpose after archive.
## Requirements
### Requirement: New Top-Level Structure
The `src/renderer/` directory SHALL reorganize into the following structure:

```
src/renderer/
  app/                      # Application composition and routing
    App.tsx
    AppRoutes.tsx
    init/                   # Application initialization logic
    providers/              # React providers (if needed)
  pages/                    # Route-level page components
    chat/                   # Chat interface page
    discovery/              # Content discovery page
    progress/               # Learning dashboard/progress page
    knowledge/              # Knowledge management page
    settings/               # Settings configuration page
    setup/                  # Initial setup page
  widgets/                  # Reusable UI components
    layout/                 # Layout components (Header, Sidebar, etc.)
  features/                 # Feature-specific UI and logic
    chat/ui/                # Chat feature components
    discovery/              # Discovery feature components
    config/                 # Configuration feature components
    knowledge/              # Knowledge feature components
    analytics/              # Analytics feature components
  shared/                   # Shared utilities and UI kit
    ui/                     # UI primitives (Button, Input, etc.)
    hooks/                  # Generic hooks
    lib/                    # Utilities (cn, toast, timeUtils, etc.)
    styles/                 # Renderer-specific CSS
  main.tsx                  # Entry point
```

#### Scenario: Developer Navigates Directory Structure
- **WHEN** a developer needs to find where to add new code
- **THEN** they can quickly identify the appropriate directory based on code type
- **AND** the structure provides clear separation between pages, widgets, features, and shared utilities

### Requirement: Shared UI Consolidation
All UI primitives SHALL consolidate into `shared/ui/`:
- All components from `components/UI/` move to `shared/ui/`
- Components from `ui/PagePrimitives.tsx` move to `shared/ui/`
- A barrel export `shared/ui/index.ts` must export all UI components

#### Scenario: Developer Adds New UI Primitive
- **WHEN** a developer needs to add a new button component
- **THEN** they check `shared/ui/` for existing patterns
- **AND** they add the new component to `shared/ui/`
- **AND** all imports use `import { Button } from '@/renderer/shared/ui'`

### Requirement: Shared Library Consolidation
All generic utilities SHALL consolidate into `shared/lib/`:
- All files from `utils/` move to `shared/lib/`
- Create `shared/lib/index.ts` as a barrel export

#### Scenario: Developer Adds Utility Function
- **WHEN** a developer creates a new helper function
- **THEN** they add it to `shared/lib/`
- **AND** all code imports utilities from `shared/lib/` with consistent paths

### Requirement: Barrel Exports at Module Boundaries
Barrel exports (`index.ts`) SHALL exist at these module boundaries:
- `shared/ui/index.ts`
- `shared/lib/index.ts`
- `app/index.ts`
- `widgets/layout/index.ts`
- `pages/chat/index.ts`
- `pages/discovery/index.ts`
- `pages/progress/index.ts`
- `pages/knowledge/index.ts`
- `pages/settings/index.ts`
- `pages/setup/index.ts`
- `features/*/index.ts` (for each feature)

#### Scenario: Clean Import Paths
- **WHEN** a developer imports components
- **THEN** they can use clean paths like `@/renderer/shared/ui`
- **AND** circular dependencies are prevented by keeping barrel exports at module boundaries

### Requirement: Co-located Tests
All `__tests__` directories SHALL move with their respective modules:
- Test directories move alongside source directories
- Test structure mirrors source structure
- Test imports update to reflect new source locations

#### Scenario: Tests Follow Source Code
- **WHEN** a component is moved
- **THEN** its tests move with it automatically
- **AND** test structure remains discoverable and predictable

### Requirement: Page Components Structure
Route-level page components SHALL organize as follows:
- `pages/chat/ChatPage.tsx` (from `components/Chat/ChatInterface.tsx`)
- `pages/discovery/DiscoveryPage.tsx` (from `components/Discovery/index.tsx`)
- `pages/progress/ProgressPage.tsx` (from `components/Dashboard/LearningDashboard.tsx`)
- `pages/knowledge/KnowledgePage.tsx` (from `components/Dashboard/KnowledgeMap.tsx`)
- `pages/settings/SettingsPage.tsx` (from `components/Config/SettingsPanel.tsx`)
- `pages/setup/SetupPage.tsx` (from `components/Setup/SetupPage.tsx` and `components/SetupScreen.tsx`)

#### Scenario: Clear Route-to-Page Mapping
- **WHEN** a developer needs to find the component for the "/discovery" route
- **THEN** they look in `pages/discovery/`
- **AND** adding a new route means creating a new page in `pages/`

### Requirement: Layout Widgets Structure
Layout components SHALL organize as follows:
- `widgets/layout/Layout.tsx` (from `components/Layout.tsx`)
- `widgets/layout/Header.tsx` (from `components/Layout/Header.tsx`)
- `widgets/layout/ThreadListSidebar.tsx` (from `components/Layout/ThreadListSidebar.tsx`)

#### Scenario: Reusable Layout Components
- **WHEN** multiple pages need layout components
- **THEN** they import from `widgets/layout/`
- **AND** layout components are reusable across pages

### Requirement: Feature Organization
Feature-specific components SHALL organize as follows:
- `features/chat/ui/` - Chat-specific UI components
- `features/discovery/` - Discovery feature components
- `features/config/` - Configuration feature components
- `features/knowledge/` - Knowledge feature components
- `features/analytics/` - Analytics feature components

#### Scenario: Feature-Specific Code Location
- **WHEN** a developer works on chat features
- **THEN** they find all related code in `features/chat/`
- **AND** feature boundaries are clear and maintainable

### Requirement: Updated Import Paths
All import paths SHALL update to reflect the new structure:
- Pages import from: `@/renderer/pages/*`
- Widgets import from: `@/renderer/widgets/*`
- Features import from: `@/renderer/features/*`
- Shared utilities import from: `@/renderer/shared/*`
- App components import from: `@/renderer/app/*`

#### Scenario: Consistent Import Patterns
- **WHEN** code imports modules
- **THEN** all code uses consistent patterns
- **AND** import paths indicate code ownership (pages, features, shared)

### Requirement: AppRoutes Updates
`AppRoutes.tsx` SHALL update to import from new page locations:
```typescript
import { ChatPage } from '@/renderer/pages/chat';
import { DiscoveryPage } from '@/renderer/pages/discovery';
import { ProgressPage } from '@/renderer/pages/progress';
import { KnowledgePage } from '@/renderer/pages/knowledge';
import { SettingsPage } from '@/renderer/pages/settings';
import { SetupPage } from '@/renderer/pages/setup';
import { Layout } from '@/renderer/widgets/layout';
```

#### Scenario: Routes Use New Page Structure
- **WHEN** routes are configured
- **THEN** they import from new page locations
- **AND** route configuration is clear and maintainable

### Requirement: Entry Point Updates
`main.tsx` SHALL update to import from new app location:
```typescript
import { App } from '@/renderer/app';
```

#### Scenario: Entry Point Uses New Structure
- **WHEN** application starts
- **THEN** it imports from the new app structure
- **AND** entry point is minimal and clear

### Requirement: Import Direction Rules
Import direction SHALL follow these rules:
- `pages/*` can import from: `widgets/*`, `features/*`, `shared/*`, `app/*`
- `widgets/*` can import from: `shared/*`
- `features/*` can import from: `shared/*`
- `app/*` can import from: `pages/*`, `widgets/*`, `features/*`, `shared/*`
- `shared/*` cannot import from other modules (except node_modules)

#### Scenario: Clear Dependency Boundaries
- **WHEN** code is organized
- **THEN** no circular dependencies exist
- **AND** module boundaries are respected

### Requirement: Remove Old Component Structure
These old directories SHALL be removed after migration:
- `src/renderer/components/` (all contents moved)
- `src/renderer/ui/` (consolidated to `shared/ui/`)
- `src/renderer/utils/` (moved to `shared/lib/`)
- `src/renderer/init/` (moved to `app/init/`)

#### Scenario: Clean Directory Structure
- **WHEN** migration is complete
- **THEN** developers only see the new structure
- **AND** no confusion exists about which location to use

### Requirement: Test Suite Passes
All tests SHALL pass after reorganization:
- Main process tests: `npm run test:main`
- Renderer tests: `npm run test:renderer`
- Integration tests: `npm run test:integration`

#### Scenario: No Test Regressions
- **WHEN** tests are run
- **THEN** all existing tests continue to pass
- **AND** test imports are updated correctly

### Requirement: Build Verification
Production build SHALL succeed:
- `npm run build` completes without errors
- No path resolution errors
- No missing module errors

#### Scenario: Successful Build
- **WHEN** production build is run
- **THEN** it completes successfully
- **AND** all paths resolve correctly

### Requirement: Type Checking Passes
TypeScript type checking SHALL pass:
- `npm run type-check` completes without errors
- No type errors related to import paths
- No missing type definitions

#### Scenario: Type Safety Maintained
- **WHEN** type checking is run
- **THEN** no TypeScript errors occur
- **AND** all types resolve correctly

