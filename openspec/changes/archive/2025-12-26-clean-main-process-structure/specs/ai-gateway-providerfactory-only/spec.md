# ai-gateway-providerfactory-only Specification

## Purpose
Ensure the main process uses a single AI gateway: `ProviderFactory`. This removes duplicated provider stacks and prevents config drift.

## ADDED Requirements

### Requirement: ProviderFactory Is the Only AI Gateway
Main process code MUST obtain chat models, embeddings, and rerank models only via `ProviderFactory`.

**Priority**: P0 (Critical)
**Effort**: M

#### Scenario: Agent Tool Uses ProviderFactory Chat Model
- **Given** an agent tool needs an LLM response
- **When** the tool executes
- **Then** it gets a chat model via `providerFactory.getModel(...)`
- **And** it invokes the model using LangChain APIs
- **And** no `ai-service` APIs are used.

---

### Requirement: ai-service Stack Is Removed
The project MUST NOT depend on `src/main/services/ai/*` or `src/main/services/core/ai/ai-service-manager.ts`.

**Priority**: P0 (Critical)
**Effort**: M

#### Scenario: No ai-service Imports Remain
- **Given** the main process codebase
- **When** searching for imports from `src/main/services/ai`
- **Then** there are no imports remaining
- **And** tests still pass.

