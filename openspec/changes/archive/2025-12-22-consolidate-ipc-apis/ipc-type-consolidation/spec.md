# IPC Type Consolidation Specification

**Capability**: Consolidate Partially-Used API Types
**Change ID**: `consolidate-ipc-apis`

## MODIFIED Requirements

### Requirement: Consolidate Sessions API Types
**Priority**: P0 (Critical)
**Effort**: S

The Sessions API currently has 10 methods defined but only 6 are used in the renderer. This requirement SHALL consolidate the API to only include used methods by removing unused methods and ensuring type definitions match handler implementations.

#### Scenario: Remove Unused Sessions API Methods
**Given** the current Sessions API has 10 methods defined
**When** types are consolidated
**Then** the following methods SHALL be REMOVED from `SessionsAPI` interface:
- `getRecentSessions`
- `search`
- `getStatistics`

**And** only these 6 methods SHALL REMAIN:
- `list`
- `get`
- `create`
- `update`
- `updateTitle`
- `delete`

**And** the `SessionsAPI` interface MUST match this signature:
```typescript
export interface SessionsAPI {
  list: (options?: { query?: string; limit?: number; offset?: number }) => Promise<
    APIResponse<{
      sessions: SessionDisplay[];
      total: number;
      hasMore: boolean;
    }>
  >;
  create: (
    payload: SessionCreateRequest,
  ) => Promise<APIResponse<{ sessionId: string; session?: SessionDisplay }>>;
  get: (sessionId: string) => Promise<APIResponse<SessionDisplay | undefined>>;
  update: (
    sessionId: string,
    updates: SessionUpdateRequest,
  ) => Promise<APIResponse<SessionDisplay | undefined>>;
  updateTitle: (sessionId: string, title: string) => Promise<APIResponse<void>>;
  delete: (sessionId: string) => Promise<APIResponse<{ deleted: boolean }>>;
}
```

#### Scenario: Sessions API Types Match Handlers
**Given** the Sessions API type definitions
**When** compared with `main/handlers/sessions-handlers.ts`
**Then** all type signatures must match exactly:
- `sessions:list` handler return type matches `SessionsAPI.list` return type
- `sessions:get` handler return type matches `SessionsAPI.get` return type
- `sessions:create` handler return type matches `SessionsAPI.create` return type
- `sessions:update` handler return type matches `SessionsAPI.update` return type
- `sessions:update-title` handler return type matches `SessionsAPI.updateTitle` return type
- `sessions:delete` handler return type matches `SessionsAPI.delete` return type

**And** TypeScript compilation must succeed with no errors

---

### Requirement: Consolidate Knowledge API Types
**Priority**: P0 (Critical)
**Effort**: S

The Knowledge API currently has 7 methods defined but only 2 are used in the renderer. This requirement SHALL consolidate the API to only include used methods by removing unused methods and ensuring type definitions match handler implementations.

#### Scenario: Remove Unused Knowledge API Methods
**Given** the current Knowledge API has 7 methods defined
**When** types are consolidated
**Then** the following methods must be REMOVED from `KnowledgeAPI` interface:
- `exploreConcept`
- `getRelatedConcepts`
- `getKnowledgeMap`
- `parseConcepts`
- `clearParsingJobs`

**And** only these 2 methods must REMAIN:
- `ingestConcepts`
- `searchKnowledge`

**And** the `KnowledgeAPI` interface must match this signature:
```typescript
export interface KnowledgeAPI {
  ingestConcepts: (params: {
    result: ConceptParsingResult;
    plan?: ConceptIngestionPlan;
    options?: {
      userId?: string;
      materialId?: string;
      sessionId?: string;
      source?: string;
    };
  }) => Promise<APIResponse<KnowledgeIngestionResult>>;

  searchKnowledge: (query: string) => Promise<APIResponse<KnowledgeSearchResultDisplay>>;
}
```

#### Scenario: Knowledge API Types Match Handlers
**Given** the Knowledge API type definitions
**When** compared with `main/handlers/knowledge-handlers.ts`
**Then** all type signatures must match exactly:
- `knowledge:ingest-concepts` handler return type matches `KnowledgeAPI.ingestConcepts` return type
- `knowledge:search` handler return type matches `KnowledgeAPI.searchKnowledge` return type

**And** TypeScript compilation must succeed with no errors

---

### Requirement: Consolidate Settings API Types
**Priority**: P0 (Critical)
**Effort**: S

The Settings API currently has 15+ methods defined but only 2 are used in the renderer. This requirement SHALL consolidate the API to only include used methods by removing unused methods and ensuring type definitions match handler implementations.

#### Scenario: Remove Unused Settings API Methods
**Given** the current Settings API has 15+ methods defined
**When** types are consolidated
**Then** all methods must be REMOVED except:
- `getAppVersion`
- `quit`

**And** the `SettingsAPI` interface must match this signature:
```typescript
export interface SettingsAPI {
  getAppVersion: () => Promise<string>;
  quit: () => Promise<void>;
}
```

**And** the `SettingsUtility` interface (if separate) must also be consolidated

#### Scenario: Settings API Types Match Handlers
**Given** the Settings API type definitions
**When** compared with `main/handlers/settings-handlers.ts`
**Then** all type signatures must match exactly:
- `settings:getAppVersion` handler return type matches `SettingsAPI.getAppVersion` return type
- `settings:quitApp` handler channel name must be aligned (currently `settings:quitApp`)

**And** TypeScript compilation must succeed with no errors

---

### Requirement: Consolidate Chat API Types
**Priority**: P0 (Critical)
**Effort**: S

The Chat API has deprecated streaming methods that SHALL be removed in favor of the newer aiSDK.stream API. This requirement SHALL remove deprecated streaming types and ensure only used methods remain.

#### Scenario: Remove Deprecated Chat Streaming
**Given** the current Chat API has deprecated streaming methods
**When** types are consolidated
**Then** deprecated streaming types must be REMOVED

**And** only these methods must REMAIN:
- `generateTitle`
- `getMessages`

**And** the `ChatAPI` interface must match this signature:
```typescript
export interface ChatAPI {
  generateTitle: (messageText: string) => Promise<APIResponse<string>>;
  getMessages: (
    threadId: string,
    options?: { limit?: number; offset?: number },
  ) => Promise<APIResponse<{sessions: ChatHistoryMessage[], hasMore: boolean, total: number}>>;
}
```

#### Scenario: Chat API Uses aiSDK.stream Instead
**Given** the old `chat:start-stream` IPC channel
**When** types are consolidated
**Then** the old streaming API must be removed
**And** the `aiSDK.stream` must be used instead

**And** TypeScript compilation must succeed with no errors

---

## REMOVED Requirements

### Requirement: Remove Unused Display Types
**Priority**: P1 (High)
**Effort**: M

Display types defined for unused APIs should be removed to eliminate dead code.

#### Scenario: Remove Orphaned Display Types
**Given** display types are defined for unused APIs
**When** types are consolidated
**Then** the following display types must be REMOVED:
- From Learning API: `LearningSessionDisplay`, `LearningProgressDisplay`, `LearningPathDisplay`, `SessionCompletionDisplay`, `SessionSearchResultDisplay`
- From Analytics API: `DashboardDisplay`, `ProgressChartDisplay`, `UsageStatsDisplay`, `TokenUsageDisplay`, all request/response types
- From Content API: `ProjectDisplay`, `ImportResultDisplay`, `ContentRecommendationDisplay`, `ResourceSearchResultDisplay`, `DocumentAnalysisDisplay`
- From Agents API: `AgentDisplay`, `AgentContext`, `AgentSettings`, `ResponseStyleSettings`, `AgentCapabilitiesDisplay`, `FeatureDemoDisplay`

**And** only display types for kept APIs must remain:
- Chat: `ChatHistoryMessage`, `ConversationDisplay`, `MessageDisplay`, etc.
- Sessions: `SessionDisplay` (kept)
- Knowledge: `ConceptParsingResult`, `KnowledgeSearchResultDisplay`, etc.
- Settings: Minimal display types (if any)

**And** TypeScript compilation must succeed without errors

---

## Validation Criteria

All scenarios must satisfy:
- ✅ TypeScript compilation succeeds without errors
- ✅ Types match handler implementations exactly
- ✅ No orphaned type definitions remain
- ✅ API surface reduced from 80+ to 25 methods
- ✅ All kept APIs have matching handlers
- ✅ No breaking changes to runtime behavior
