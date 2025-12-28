# Tasks: Deprecate AgentManager in Favor of ProviderFactory

## Phase 1: Remove AgentManager from Workflow System

### Task 1.1: Update WorkflowDeps Type
- [ ] Open `src/main/services/domain/workflow/state.ts`
- [ ] Remove `agentManager: AgentManager` from `WorkflowDeps` interface (line 83)
- [ ] Update type import to remove AgentManager reference
- [ ] Verify TypeScript compilation

**Validation**: `npm run type-check` passes

### Task 1.2: Update createWorkflowGraph Signature
- [ ] Open `src/main/services/domain/workflow/index.ts`
- [ ] Remove `agentManager` parameter from `createWorkflowGraph()` function
- [ ] Update function body to remove agentManager usage
- [ ] Update all call sites in workflow files

**Validation**: `npm run type-check` passes, no AgentManager references in workflow

### Task 1.3: Remove AgentManager from Workflow Node Dependencies
- [ ] Check all workflow node files for agentManager in deps destructuring
- [ ] Remove any agentManager references (should be none - nodes use providerFactory)
- [ ] Update test files that mock agentManager

**Validation**: `npm run test:workflow` passes

## Phase 2: Update IPC Handlers and Main Process

### Task 2.1: Update ChatDependencies Interface
- [ ] Open `src/main/handlers/chat-handlers.ts`
- [ ] Remove `agentManager: AgentManager` from `ChatDependencies` interface (line 30)
- [ ] Remove `agentManager` from setupChatHandlers parameter destructuring
- [ ] Update workflow graph creation to remove agentManager

**Validation**: `npm run type-check` passes

### Task 2.2: Update Handler Registration
- [ ] Open `src/main/handlers/index.ts`
- [ ] Remove `agentManager: AgentManager` from services object (line 37)
- [ ] Remove `agentManager` from `setupAllIpcHandlers()` call in main process

**Validation**: `npm run type-check` passes

### Task 2.3: Update Main Process Initialization
- [ ] Open `src/main/index.ts`
- [ ] Remove `createAgentManager` import (line 27)
- [ ] Remove `agentManager` variable creation (lines 561-568)
- [ ] Remove `agentManager` from `setupAllIpcHandlers()` call (line 584)

**Validation**: Application starts successfully in dev mode

## Phase 3: Remove AgentManager Files and Types

### Task 3.1: Delete AgentManager Implementation
- [ ] Delete `src/main/services/agent/agent-manager.ts`
- [ ] Delete `src/main/services/agent/specialized-agent.ts`
- [ ] Delete `src/main/services/agent/learning-agent.ts`
- [ ] Delete `src/main/services/agent/tutoring-agent.ts`
- [ ] Delete `src/main/services/agent/supervisor-agent.ts`

**Validation**: No AgentManager files remain in codebase

### Task 3.2: Update Type Exports
- [ ] Search for `AgentManager` type exports
- [ ] Remove from any index.ts or barrel files
- [ ] Update `src/main/services/agent/index.ts` if it exists

**Validation**: `npm run type-check` passes

### Task 3.3: Clean Up Test Utils
- [ ] Update `src/test/utils/mocks/mock-agents.ts` to remove agentManager mocks
- [ ] Update `src/test/utils/helpers/agent-test-helpers.ts`
- [ ] Remove any agentManager references from test utilities

**Validation**: All test utilities compile without errors

## Phase 4: Update Tests

### Task 4.1: Update Workflow Tests
- [ ] Update `src/main/services/domain/workflow/__tests__/workflow-graph.test.ts`
- [ ] Remove agentManager mock setup
- [ ] Update mockDeps object to remove agentManager
- [ ] Update `src/main/services/domain/workflow/__tests__/full-workflow.test.ts`

**Validation**: Workflow tests pass

### Task 4.2: Update Node Tests
- [ ] Check all workflow node test files for agentManager references
- [ ] Remove agentManager from mockDeps in test files:
  - `src/main/services/domain/workflow/nodes/__tests__/assess-node.test.ts`
  - `src/main/services/domain/workflow/subgraphs/teach/__tests__/explain-node.test.ts`
  - `src/main/services/domain/workflow/subgraphs/practice/__tests__/askQuestion-node.test.ts`
  - And other workflow test files

**Validation**: All workflow node tests pass

### Task 4.3: Update Handler Tests
- [ ] Update `src/main/handlers/__tests__/sessions-checkpoint-dataflow.test.ts`
- [ ] Remove agentManager references

**Validation**: Handler tests pass

### Task 4.4: Run Complete Test Suite
- [ ] Run `npm run test:main` for main process tests
- [ ] Run `npm run test:renderer` for renderer tests
- [ ] Run `npm run test:integration` for cross-process tests
- [ ] Run `npm run test:complete` for full test suite

**Validation**: All tests pass

## Phase 5: Documentation and Cleanup

### Task 5.1: Update CLAUDE.md
- [ ] Open `CLAUDE.md`
- [ ] Remove references to AgentManager in architecture section
- [ ] Update multi-agent system section to reflect ProviderFactory usage
- [ ] Update agent creation examples to use ProviderFactory directly

**Validation**: Documentation is accurate and consistent

### Task 5.2: Update Service README
- [ ] Open `src/main/services/README.md`
- [ ] Remove AgentManager from service architecture overview
- [ ] Update examples to show ProviderFactory usage

**Validation**: README accurately reflects current architecture

### Task 5.3: Final Verification
- [ ] Search codebase for remaining AgentManager references:
  ```bash
  grep -r "AgentManager\|agentManager" src/main --include="*.ts" | grep -v test | grep -v "node_modules"
  ```
- [ ] Should return no results (except possibly in comments)
- [ ] Run full test suite one final time
- [ ] Run application in dev mode and verify chat functionality works

**Validation**: Zero AgentManager references in production code, all tests pass

## Post-Migration Checklist

- [ ] All production code uses ProviderFactory for AI model access
- [ ] Workflow nodes use `deps.providerFactory.getModel()` consistently
- [ ] No AgentManager type or implementation remains
- [ ] All tests pass without modification or with minimal updates
- [ ] Documentation updated to reflect provider-first architecture
- [ ] Application runs and functions correctly
- [ ] No regressions in chat or workflow functionality

## Rollback Plan

If issues arise:

1. Restore `agent-manager.ts` from git history
2. Re-add agentManager to WorkflowDeps
3. Re-add agentManager to workflow graph and handlers
4. Run tests to identify specific failures
5. Fix issues and re-attempt migration

**Estimated rollback time**: 15-30 minutes
