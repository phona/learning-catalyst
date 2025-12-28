# IPC API Removal Specification

**Capability**: Remove Unused API Domains
**Change ID**: `consolidate-ipc-apis`

## REMOVED Requirements

### Requirement: Remove Learning API Domain
**Priority**: P0 (Critical)
**Effort**: M

#### Scenario: Learning API Types Removed
**Given** the current codebase has Learning API type definitions
**When** the consolidation change is applied
**Then** the following files must be deleted:
- `shared/types/electron-api/learning-api.ts`
- All Learning API type exports from `shared/types/electron-api/index.ts`

**And** the `ElectronAPI` interface must no longer include:
```typescript
learning: LearningAPI;
```

**And** the following types must not be exported from index:
- `LearningAPI`
- `LearningSessionDisplay`
- `LearningProgressDisplay`
- `LearningPathDisplay`
- `SessionDisplay`
- `AchievementDisplay`
- `SessionCompletionDisplay`
- `SessionSearchResultDisplay`
- `LearningContext`

**And** TypeScript compilation must succeed without errors

#### Scenario: Learning API Handlers Removed
**Given** Learning API handlers are registered in main process
**When** the consolidation change is applied
**Then** the following must be removed:
- All handler functions from `main/handlers/learning-handlers.ts`
- Import and call to `setupLearningHandlers` in `main/handlers/index.ts`
- All Learning API related imports

**And** the IPC channels must not be registered:
- `learning:get-path`
- `learning:start-session`
- `learning:get-progress`
- `learning:pause-session`
- `learning:resume-session`
- `learning:complete-session`
- `learning:get-recent-sessions`
- `learning:search-sessions`

**And** the application must compile and start without errors

---

### Requirement: Remove Analytics API Domain
**Priority**: P0 (Critical)
**Effort**: M

#### Scenario: Analytics API Types Removed
**Given** the current codebase has Analytics API type definitions
**When** the consolidation change is applied
**Then** the following files must be deleted:
- `shared/types/electron-api/analytics-api.ts`
- All Analytics API type exports from `shared/types/electron-api/index.ts`

**And** the `ElectronAPI` interface must no longer include:
```typescript
analytics: AnalyticsAPI;
```

**And** the following types must not be exported from index:
- `AnalyticsAPI`
- `DashboardDisplay`
- `ProgressChartDisplay`
- `AchievementDisplay` (Analytics version)
- `UsageStatsDisplay`
- `TokenUsageDisplay`
- `ProgressChartRequest`
- `UsageStatsRequest`
- `TokenUsageRequest`
- `SessionHistoryRequest`
- `LearningTrendsRequest`
- `TimeStatsRequest`
- `ExportDataRequest`
- `ImportDataRequest`
- `ImportResult`
- `ImportError`
- `ImportWarning`

**And** TypeScript compilation must succeed without errors

#### Scenario: Analytics API Handlers Removed
**Given** Analytics API handlers are registered in main process
**When** the consolidation change is applied
**Then** the following must be removed:
- All handler functions from `main/handlers/analytics-complete-handlers.ts`
- Import and call to `setupCompleteAnalyticsHandlers` in `main/handlers/index.ts`
- All Analytics API related imports

**And** the IPC channels must not be registered:
- `analytics:get-dashboard`
- `analytics:get-progress-chart`
- `analytics:get-achievements`
- `analytics:unlock-achievement`
- `analytics:get-usage-stats`
- `analytics:get-token-usage`
- `analytics:track-event`
- `analytics:get-concept-progress`
- `analytics:get-session-history`
- `analytics:check-achievements`
- `analytics:get-learning-trends`
- `analytics:get-study-streak`
- `analytics:get-time-stats`
- `analytics:export-data`
- `analytics:import-data`

**And** the application must compile and start without errors

---

### Requirement: Remove Content API Domain
**Priority**: P0 (Critical)
**Effort**: M

#### Scenario: Content API Types Removed
**Given** the current codebase has Content API type definitions
**When** the consolidation change is applied
**Then** the following files must be deleted:
- `shared/types/electron-api/content-api.ts`
- All Content API type exports from `shared/types/electron-api/index.ts`

**And** the `ElectronAPI` interface must no longer include:
```typescript
content: ContentAPI;
```

**And** the following types must not be exported from index:
- `ContentAPI`
- `ProjectDisplay`
- `ImportResultDisplay`
- `ContentRecommendationDisplay`
- `ResourceSearchResultDisplay`
- `DocumentAnalysisDisplay`
- `ConceptExtractionDisplay`
- `KnowledgeExtractionDisplay`

**And** TypeScript compilation must succeed without errors

#### Scenario: Content API Handlers Removed
**Given** Content API handlers are registered in main process
**When** the consolidation change is applied
**Then** the following must be removed:
- All handler functions from `main/handlers/content-handlers.ts`
- Import and call to `setupContentHandlers` in `main/handlers/index.ts`
- All Content API related imports

**And** the IPC channels must not be registered:
- `content:explore-projects`
- `content:import-content`
- `content:get-recommendations`
- `content:search-resources`
- `content:analyze-document`
- `content:extract-concepts`

**And** the application must compile and start without errors

---

### Requirement: Remove Agents API Domain
**Priority**: P0 (Critical)
**Effort**: M

#### Scenario: Agents API Types Removed
**Given** the current codebase has Agents API type definitions
**When** the consolidation change is applied
**Then** the following files must be deleted:
- `shared/types/electron-api/agent-api.ts`
- All Agents API type exports from `shared/types/electron-api/index.ts`

**And** the `ElectronAPI` interface must no longer include:
```typescript
agents: AgentsAPI;
```

**And** the following types must not be exported from index:
- `AgentsAPI`
- `AgentDisplay`
- `AgentContext`
- `AgentSettings`
- `ResponseStyleSettings`
- `AgentCapabilitiesDisplay`
- `AgentCapability`
- `FeatureDemoDisplay`
- `DemoStep`
- `AgentPerformanceMetrics`
- `AgentComparison`

**And** TypeScript compilation must succeed without errors

#### Scenario: No Agents API Handlers to Remove
**Given** Agents API types are defined but no handlers exist
**When** the consolidation change is applied
**Then** no handler changes are needed
**And** the `ElectronAPI` interface must simply omit the `agents` property

**And** TypeScript compilation must succeed without errors

---

## Validation Criteria

All scenarios must satisfy:
- ✅ TypeScript compilation succeeds without errors
- ✅ No dead imports or exports remain
- ✅ Application starts and runs without runtime errors
- ✅ No references to removed APIs exist in codebase
- ✅ Test suite passes (after updates)
