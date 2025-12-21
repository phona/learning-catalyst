# Renderer File Structure Reorganization

**Change ID**: `reorganize-renderer-structure`
**Status**: Draft
**Author**: Claude Code Assistant
**Date**: 2025-12-21

## Problem Statement

The current `src/renderer` structure has several organizational issues:

1. **Mixed Responsibilities**: The `components/` directory contains route-level pages (DiscoveryPage), layout components (Layout), feature-specific UI (Chat/Config/etc), and shared UI primitives (UI/) all mixed together
2. **Scattered UI Elements**: UI primitives exist in both `components/UI/` and `ui/PagePrimitives.tsx`, creating confusion about where to add new UI components
3. **Unclear Import Patterns**: Generic utilities in `utils/` and feature-specific hooks in `hooks/` don't have a clear home
4. **App Logic Fragmentation**: Application initialization logic in `init/` is separate from the main app composition in `components/App/`
5. **Inconsistent Feature Grouping**: Related files are split across different directories (e.g., Dashboard components for progress tracking)

## Proposed Solution

Adopt a clear, scalable folder structure that separates concerns and provides predictable locations for different types of code:

```
src/renderer/
  app/
    App.tsx                  # Main app composition
    AppRoutes.tsx           # Route configuration
    providers/              # React providers (if needed)
    init/                   # App initialization logic
  pages/                    # Route-level page components
    chat/
      ChatPage.tsx          # Chat interface page
    discovery/
      DiscoveryPage.tsx     # Content discovery page
    progress/
      ProgressPage.tsx      # Learning dashboard page
    knowledge/
      KnowledgePage.tsx     # Knowledge management page
    settings/
      SettingsPage.tsx      # Settings configuration page
    setup/
      SetupPage.tsx         # Initial setup page
  widgets/                  # Reusable UI components
    layout/
      Layout.tsx            # Main app layout
      Header.tsx            # Navigation header
      ThreadListSidebar.tsx # Session list sidebar
  features/                 # Feature-specific UI and logic
    chat/
      ui/                   # Chat components (MarkdownText, ToolFallback, etc.)
    discovery/
    config/
    knowledge/
    analytics/
  shared/                   # Shared utilities and UI kit
    ui/                     # UI primitives (Button, Input, etc.)
      index.ts              # Barrel export
    hooks/                  # Generic hooks
    lib/                    # Utilities (cn, toast, timeUtils, etc.)
    styles/                 # Renderer-specific CSS
  main.tsx                  # Entry point (minimal)
```

## Key Principles

1. **Clear Separation of Concerns**: Pages (route-level) vs Widgets (reusable) vs Features (domain-specific)
2. **Single Home for Shared Code**: All generic utilities, hooks, and UI primitives live in `shared/`
3. **Co-located Tests**: `__tests__` folders move with their respective modules
4. **Minimal Import Breaking**: Preserve barrel exports at module boundaries to minimize import changes
5. **Logical Grouping**: Related functionality is grouped together

## Migration Strategy

### Phase 1: Create New Structure
- Create all new directories
- Set up barrel exports for shared/ui and other module boundaries

### Phase 2: Move Files with Shared Resources First
1. Move `shared/` resources (ui/ + ui/PagePrimitives.tsx + utils/)
2. Move `app/` structure (App/* + init/)
3. Move layout widgets (Layout.tsx + Layout/*)
4. Move page components
5. Move feature components

### Phase 3: Update Imports
- Systematically update all import paths
- Maintain backward compatibility during transition

### Phase 4: Clean Up
- Remove old empty directories
- Verify all tests pass
- Update documentation

## Benefits

1. **Improved Discoverability**: Developers can quickly find where to add new code
2. **Clear Import Patterns**: Predictable import paths based on code type
3. **Better Scalability**: New features have a clear home in `features/`
4. **Reduced Cognitive Load**: No more guessing where UI primitives live
5. **Maintainability**: Related code is co-located, making changes easier

## Alternative: Minimal Change Approach

If the full reorganization is too disruptive, we could take a more conservative approach:

1. Keep `services/`, `stores/`, `hooks/` as-is
2. Merge `components/UI/` + `ui/` → `shared/ui/`
3. Move generic utilities from `utils/` → `shared/lib/`
4. Rename `components/` → `features/` (since that's what it effectively is)
5. Move `init/` → `app/init/`

This would require fewer file moves while still solving the main organizational issues.

## Risks and Mitigation

**Risk**: Import path changes break many files
**Mitigation**: Use automated refactoring tools and maintain temporary alias exports during transition

**Risk**: Tests fail due to path changes
**Mitigation**: Update test imports along with source imports; run tests after each phase

**Risk**: Developer productivity temporarily decreases during transition
**Mitigation**: Complete reorganization in focused work sessions; provide clear documentation of new structure

## Success Criteria

- [ ] All files moved to new locations
- [ ] All imports updated correctly
- [ ] All tests pass
- [ ] No circular dependencies introduced
- [ ] Documentation updated to reflect new structure
- [ ] Developer onboarding materials updated

## Open Questions

1. Should we maintain the minimal change approach or go with the full reorganization?
2. Do we need to preserve backward compatibility with old import paths?
3. How should we handle the transition period where both old and new paths exist?

## References

- Current structure analysis: `src/renderer/`
- Route definitions: `src/renderer/components/App/AppRoutes.tsx`
- OpenSpec AGENTS.md for change management guidelines
