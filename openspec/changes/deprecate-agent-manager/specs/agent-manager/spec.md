# AgentManager Deprecation Specification

## Purpose

Remove the AgentManager abstraction layer and standardize on ProviderFactory for direct AI model access throughout the application. This simplifies the architecture by eliminating redundant abstractions and aligning with the existing pattern where workflow nodes already use ProviderFactory directly.

## MODIFIED Requirements

### Requirement: Remove AgentManager from WorkflowDeps

The WorkflowDeps interface SHALL be updated to remove the agentManager property.

#### Scenario: Workflow Graph Creation
- **WHEN** a developer creates a workflow graph instance
- **THEN** they no longer need to provide agentManager in the dependencies
- **AND** the workflow graph uses only providerFactory for AI model access

### Requirement: Update Workflow Graph Factory

The createWorkflowGraph function SHALL be updated to remove the agentManager parameter from its signature and implementation.

#### Scenario: Workflow Node Execution
- **WHEN** a workflow node needs to access an AI model
- **THEN** it uses deps.providerFactory.getModel() directly
- **AND** no indirect agentManager.runAgent() call is made

### Requirement: Remove AgentManager from Handler Registration

The chat handlers, handler registration, and main process initialization SHALL be updated to remove agentManager dependencies.

#### Scenario: IPC Handler Setup
- **WHEN** the main process sets up IPC handlers
- **THEN** agentManager is not passed to chat handlers
- **AND** workflow graph is created without agentManager dependency

## REMOVED Requirements

### Requirement: Delete AgentManager Implementation Files

The following files SHALL be removed from the codebase:

- `src/main/services/agent/agent-manager.ts`
- `src/main/services/agent/specialized-agent.ts`
- `src/main/services/agent/learning-agent.ts`
- `src/main/services/agent/tutoring-agent.ts`
- `src/main/services/agent/supervisor-agent.ts`

#### Scenario: Developer Attempts to Import AgentManager
- **WHEN** a developer attempts to import AgentManager
- **THEN** they receive a compilation error indicating the module has been removed
- **AND** they must use ProviderFactory instead

### Requirement: Remove Type Exports

AgentManager type exports SHALL be removed from all barrel files and dependent modules.

#### Scenario: Type Checking
- **WHEN** TypeScript compiles the codebase
- **THEN** no references to AgentManager type remain
- **AND** all type dependencies are resolved correctly

### Requirement: Update Test Mocks and Utilities

Test mock files and utilities SHALL be updated to remove agentManager references.

#### Scenario: Running Tests
- **WHEN** tests execute after migration
- **THEN** all mocks are updated to match new dependencies
- **AND** no test failures occur due to missing agentManager

## ADDED Requirements

### Requirement: Enforce ProviderFactory Usage Pattern

All AI model access SHALL use ProviderFactory directly without AgentManager abstraction.

#### Scenario: New Workflow Node Development
- **WHEN** a developer creates a new workflow node
- **THEN** they use deps.providerFactory.getModel() for AI model access
- **AND** they do not reference AgentManager

### Requirement: Preserve Configuration and Error Handling

ProviderFactory SHALL maintain all existing configuration validation and error handling capabilities.

#### Scenario: Configuration Change
- **WHEN** AI provider configuration changes
- **THEN** ProviderFactory handles configuration loading and validation
- **AND** errors are properly propagated to the application

## Implementation Details

### Type Changes

**WorkflowDeps Before**:
```typescript
export type WorkflowDeps = {
  agentManager: AgentManager;
  loggerService: LoggerService;
  checkpointer: BaseCheckpointSaver;
  configService: ConfigService;
  providerFactory: ProviderFactory;
  knowledgeService: KnowledgeService;
  practiceService: PracticeService;
  learningService: LearningService;
};
```

**WorkflowDeps After**:
```typescript
export type WorkflowDeps = {
  loggerService: LoggerService;
  checkpointer: BaseCheckpointSaver;
  configService: ConfigService;
  providerFactory: ProviderFactory;
  knowledgeService: KnowledgeService;
  practiceService: PracticeService;
  learningService: LearningService;
};
```

### Function Signature Changes

**createWorkflowGraph Before**:
```typescript
export function createWorkflowGraph({
  agentManager,
  loggerService,
  checkpointer,
  configService,
  providerFactory,
  knowledgeService,
  practiceService,
  learningService,
}: WorkflowDeps)
```

**createWorkflowGraph After**:
```typescript
export function createWorkflowGraph({
  loggerService,
  checkpointer,
  configService,
  providerFactory,
  knowledgeService,
  practiceService,
  learningService,
}: WorkflowDeps)
```

### Workflow Node Pattern (Unchanged)

All workflow nodes already follow this pattern:

```typescript
export async function nodeFunction(state: typeof WorkflowStateAnnotation.State, config: LangGraphRunnableConfig) {
  const deps = config.configurable as WorkflowDeps;
  const model = await deps.providerFactory.getModel();
  // Use model directly
}
```

No changes needed to workflow node implementations.

## Validation

### Static Analysis
- `grep -r "AgentManager\|agentManager" src/main --include="*.ts" | grep -v test` returns no results

### Type Checking
- `npm run type-check` completes without errors

### Testing
- All existing tests pass without modification or with minimal updates
- Workflow functionality continues to work correctly
- Chat interface operates normally

### Runtime Verification
- Application starts without errors
- AI model access works through ProviderFactory
- No runtime errors related to missing agentManager

## Migration Notes

### Low-Risk Factors
1. Workflow nodes already use ProviderFactory directly
2. No code calls agentManager.runAgent() or agentManager.getAgent()
3. ProviderFactory is already widely used (25+ workflow files)
4. Only type signatures and dependency injection change

### Breaking Changes
- **Internal API only**: AgentManager was not exposed via IPC, so no public API changes
- **Type signatures**: WorkflowDeps and function signatures change (internal types)
- **File deletion**: 5 files removed (all internal implementation)

### Backward Compatibility
- No backward compatibility concerns
- This is an internal refactoring with no external impact
- Renderer and IPC layer unaffected
