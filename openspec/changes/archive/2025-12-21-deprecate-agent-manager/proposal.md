# Proposal: Deprecate AgentManager in Favor of ProviderFactory

## Why

The codebase has evolved to use ProviderFactory directly throughout the workflow system (25+ files), making the AgentManager abstraction layer redundant. Maintaining this dual abstraction creates unnecessary complexity, maintenance overhead, and confusion for developers. By removing AgentManager and standardizing on ProviderFactory, we simplify the architecture while preserving all functionality.

## Problem Statement

The codebase currently maintains a hybrid architecture with two overlapping abstractions for AI model access:

1. **AgentManager** (`src/main/services/agent/agent-manager.ts`): An abstraction layer that creates and manages specialized agents (learning, tutoring, supervisor) with methods like `runAgent()` and `getAgent()`

2. **ProviderFactory** (`src/main/services/agent/provider-factory.ts`): A direct interface for obtaining AI models via `getModel()`, `getEmbeddings()`, `getRerankModel()`, etc.

This dual abstraction creates unnecessary complexity because:

- **Redundant abstractions**: Both provide access to AI models, but in different ways
- **Workflow nodes already bypass AgentManager**: 25+ workflow files use `providerFactory.getModel()` directly, bypassing `agentManager.runAgent()` entirely
- **Unused functionality**: `agentManager.runAgent()` and `getAgent()` are not called anywhere in the workflow implementation
- **Maintenance overhead**: Two abstraction layers to understand, test, and maintain
- **Code confusion**: Developers must choose between two approaches

## Current State

### AgentManager Architecture
The AgentManager currently:
- Creates specialized agents (learning, tutoring, supervisor) during initialization
- Provides `runAgent()` method to execute agents with message processing
- Provides `getAgent()` method to retrieve agent instances
- Subscribes to configuration changes and rebuilds agents when config changes
- Manages tool dependencies and agent lifecycle

**Files**: `src/main/services/agent/agent-manager.ts`, `src/main/services/agent/specialized-agent.ts`, `src/main/services/agent/learning-agent.ts`, `src/main/services/agent/tutoring-agent.ts`, `src/main/services/agent/supervisor-agent.ts`

### ProviderFactory Architecture
The ProviderFactory currently:
- Provides direct access to chat models via `getModel(providerName?)`
- Provides embeddings via `getEmbeddings()` and `getEmbeddingModel()`
- Provides reranking via `getRerankModel()`
- Handles caching, configuration validation, and error handling
- Used by ALL workflow nodes (25+ files) for direct model access

**Files**: `src/main/services/agent/provider-factory.ts`

### Usage Analysis
```
grep -r "agentManager.runAgent" src/main/services/domain/workflow/ --include="*.ts" | wc -l
Result: 0 calls

grep -r "providerFactory.getModel" src/main/services/domain/workflow/ --include="*.ts" | wc -l
Result: 30+ calls
```

## Proposed Solution

**Completely remove the AgentManager abstraction** and standardize on ProviderFactory for direct AI model access.

This is a **refactoring with removal** - we're eliminating an unnecessary abstraction layer that workflow nodes already bypass.

### Benefits

1. **Simplified Architecture**: Single, consistent way to access AI models
2. **Better Performance**: Direct model access eliminates unnecessary indirection
3. **Clearer Intent**: Code explicitly shows it's using AI models
4. **Easier Testing**: Simpler to mock `providerFactory.getModel()` than full agent manager
5. **Consistency**: All workflow nodes already following this pattern
6. **Reduced Maintenance**: One less abstraction layer to maintain

### Migration Path

The migration is **low-risk** because:

1. **Workflow nodes already use ProviderFactory directly** - no behavior change needed
2. **AgentManager methods are not being called** - no functionality is removed
3. **Only dependency updates required** - change type signatures, not logic
4. **Tests can be updated incrementally** - each phase is testable

## Scope

### In Scope
- Remove `agentManager` from `WorkflowDeps` type
- Update `createWorkflowGraph()` signature
- Remove AgentManager references from handlers and main process
- Delete `agent-manager.ts` and related files
- Update type exports and imports
- Clean up tests and test utilities

### Out of Scope
- Modifying ProviderFactory implementation (it's already working well)
- Changing AI provider integrations
- Modifying workflow node logic (already using ProviderFactory)
- Updating business logic or algorithms

## Success Criteria

1. **Zero AgentManager references** in production code
2. **All tests passing** after migration
3. **No behavior changes** - same AI model access, just simpler
4. **Cleaner dependency injection** - fewer dependencies in WorkflowDeps
5. **Updated documentation** reflecting provider-first architecture
6. **Removed unused files**:
   - `src/main/services/agent/agent-manager.ts`
   - `src/main/services/agent/specialized-agent.ts`
   - `src/main/services/agent/learning-agent.ts`
   - `src/main/services/agent/tutoring-agent.ts`
   - `src/main/services/agent/supervisor-agent.ts`

## Risks & Mitigations

### Risk: Breaking IPC Handlers
**Mitigation**: Keep agentManager parameter in handler registration temporarily, mark as deprecated, remove in follow-up

### Risk: Breaking Tests
**Mitigation**: Update tests in same commit as code changes, ensure tests pass before merge

### Risk: Missing Hidden Dependencies
**Mitigation**: Run full test suite, check for any runtime errors after each phase

### Risk: Breaking Renderer or Other Consumers
**Mitigation**: AgentManager was only used internally in main process, not exposed via IPC

## Dependencies

- None - this is purely a refactoring of main process code
- Can be implemented independently of other features
- No changes required to renderer or IPC layer

## Timeline

Estimated effort: **1 day** for complete migration

Phases:
1. **Phase 1**: Remove AgentManager from WorkflowDeps and workflow graph (30 minutes)
2. **Phase 2**: Update handlers and main process (30 minutes)
3. **Phase 3**: Clean up agent files and type exports (30 minutes)
4. **Phase 4**: Update tests and validate (1-2 hours)
5. **Phase 5**: Documentation updates (30 minutes)

## Validation Strategy

1. **Unit tests**: All existing tests pass without modification or with minimal updates
2. **Integration tests**: Chat workflow continues to function correctly
3. **Static analysis**: No remaining references to AgentManager in production code
4. **Type checking**: TypeScript compilation succeeds without errors

## Open Questions

1. **Should we keep specialized-agent.ts for reference?** - No, it's unused and can be removed
2. **Do we need deprecation warnings?** - No, AgentManager is internal-only, not in public API
3. **Keep or remove tool-registry.ts?** - Keep it - it's used by other services

## Reference Implementation

See `openspec/changes/deprecate-agent-manager/specs/agent-manager/spec.md` for detailed specification of changes.
