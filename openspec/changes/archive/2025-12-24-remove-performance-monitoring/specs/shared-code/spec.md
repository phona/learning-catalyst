# Spec: Shared Code Node.js Dependencies

## ADDED Requirements

### Requirement: Shared Code Must Not Import Node.js-Only Modules

Code in `src/shared/` MUST NOT import Node.js-only modules (`os`, `fs`, `path`, `process`, etc.) because shared code can be imported by both main process (Node.js) and renderer process (browser).

**Priority**: P0 (Critical)
**Related Spec**: `renderer-structure`

#### Scenario: Importing os Module in Shared Code is Forbidden
**Given** a file in `src/shared/`
**When** the code needs to import Node.js modules
**Then** the import MUST NOT be in shared code
**And** Node.js-specific code MUST be in `src/main/`
**And** access to Node.js features MUST be via IPC/electronAPI

**Examples**:
```typescript
// ❌ FORBIDDEN - in src/shared/
import { totalmem } from 'os';
import { readFileSync } from 'fs';

// ✅ CORRECT - in src/main/
import { totalmem } from 'os';
import { readFileSync } from 'fs';

// ✅ CORRECT - in src/shared/ (renderer safe)
import { performance } from 'perf_hooks'; // Also available in browser
```

#### Scenario: Performance Monitoring Moved or Removed
**Given** performance monitoring uses `os.totalmem()`
**When** refactoring to fix shared code violations
**Then** either move to `src/main/services/` with IPC handlers
**Or** remove the functionality entirely
**And** update all imports in renderer code

**API Pattern**:
```typescript
// Main process (src/main/services/performance/performance-monitor.ts)
import os from 'os'; // ✅ OK here

export function createPerformanceMonitor() {
  return {
    getMemoryStats() {
      return {
        total: os.totalmem(),
        used: process.memoryUsage().rss,
      };
    },
  };
}

// Renderer via IPC
const stats = await window.electronAPI.performance.getMemoryStats();
```

## REMOVED Requirements

### Requirement: Performance Monitoring in Shared Code

*(Removed as part of this change - performance monitoring system deleted)*

**Priority**: N/A (Removed)

#### Scenario: Performance Monitor Factory Exported
*(REMOVED - this requirement is deleted)*
