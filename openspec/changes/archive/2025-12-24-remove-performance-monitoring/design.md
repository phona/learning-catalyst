# Design: Remove Performance Monitoring System

## Architecture Context

### Current State (Broken)
```
┌─────────────────────────────────────────────────────────────┐
│                        shared/                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  performance-monitor.ts                              │  │
│  │  import { totalmem } from 'os'  ← Node.js only!     │  │
│  │                                                       │  │
│  │  - MemoryMonitor (uses os.totalmem)                 │  │
│  │  - PerformanceMonitor                                │  │
│  │  - createAppPerformanceMonitor()                     │  │
│  └──────────────────────────────────────────────────────┘  │
│                           ↑                                 │
│                           │ imports                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  performance-service.ts                              │  │
│  │  - ProductionPerformanceService                      │  │
│  │  - performanceService singleton                      │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           ↑
                           │ imports
┌─────────────────────────────────────────────────────────────┐
│  ProductionErrorBoundary.tsx (RENDERER)                     │
│  ❌ CRASH: Can't load 'os' module in browser               │
└─────────────────────────────────────────────────────────────┘
```

### Future State (After Removal)
```
┌─────────────────────────────────────────────────────────────┐
│  ProductionErrorBoundary.tsx (RENDERER)                     │
│  ✅ No performance monitoring imports                        │
│  ✅ Simple error catching + display                         │
│  ✅ Retry mechanisms                                        │
└─────────────────────────────────────────────────────────────┘

For performance profiling: Use browser DevTools (Performance tab)
```

## Removal Strategy

### Step 1: Delete Core Files
```bash
rm src/shared/utils/performance-monitor.ts
rm src/shared/services/performance-service.ts
```

### Step 2: Update Exports
Remove from `src/shared/utils/index.ts`:
```typescript
// REMOVED:
export {
  createAppPerformanceMonitor,
  appPerformanceMonitor,
  type PerformanceTrend,
  type PerformanceBottleneck,
  type MemoryStats,
} from './performance-monitor';
```

### Step 3: Simplify ProductionErrorBoundary

**Lines to Remove:**
- Line 9: `import { performanceService } from '@/shared/services/performance-service';`
- Line 11: `import type { MemoryStats } from '@/shared/utils/performance-monitor';`
- Lines 112-117: `performanceService.recordMetric()` call
- Lines 174-188: `performanceService.measureOperation()` call

**Lines to Modify:**

`performHealthCheck()` method (lines 236-242):
```typescript
// BEFORE:
private performHealthCheck(): void {
  const memoryStats = performanceService.getMemoryStats();
  const healthStatus = this.calculateHealthStatus(memoryStats);
  this.setState({ healthStatus });
  this.events.emit('health:changed', healthStatus);
}

// AFTER:
private performHealthCheck(): void {
  const healthStatus = this.calculateHealthStatus();
  this.setState({ healthStatus });
  this.events.emit('health:changed', healthStatus);
}
```

`calculateHealthStatus()` signature (line 244):
```typescript
// BEFORE:
private calculateHealthStatus(memoryStats: MemoryStats): HealthStatus {
  const uptime = Date.now() - this.startTime;
  const memoryUsage = memoryStats.percentage || 0;
  // ...
}

// AFTER:
private calculateHealthStatus(): HealthStatus {
  const uptime = Date.now() - this.startTime;
  const memoryUsage = 0; // Not available without performance monitoring
  // ... rest of logic unchanged
}
```

`attemptRecovery()` method (lines 168-219):
```typescript
// BEFORE:
await performanceService.measureOperation('error_recovery', async () => {
  this.setState({ /* ... */ });
});

// AFTER:
// Direct state update, no performance measurement
this.setState({ /* ... */ });
```

## Simplified Health Status

The health status UI will still work but with simplified data:

```typescript
interface HealthStatus {
  status: 'healthy' | 'degraded' | 'critical' | 'error';
  lastCheck: number;
  errorCount: number;
  uptime: number;
  memoryUsage: number;  // Will always be 0
  performanceScore: number; // Calculated without memory data
}
```

**Health Calculation (simplified):**
```typescript
private calculateHealthStatus(): HealthStatus {
  const uptime = Date.now() - this.startTime;
  const errorCount = this.state.errorCount;

  let status: HealthStatus['status'] = 'healthy';
  let performanceScore = 100;

  // Simplified: base on error count only
  if (errorCount >= 10) {
    status = 'critical';
    performanceScore = 20;
  } else if (errorCount >= 5) {
    status = 'degraded';
    performanceScore = 50;
  } else if (errorCount > 0) {
    status = 'degraded';
    performanceScore = 75;
  }

  return {
    status,
    lastCheck: Date.now(),
    errorCount,
    uptime,
    memoryUsage: 0, // Not available
    performanceScore,
  };
}
```

## Validation

### Build Validation
```bash
npm run build
# Should succeed without "Cannot find module '@/shared/services/performance-service'" errors
```

### Runtime Validation
```bash
npm run dev
# Should start without "os" module error
# Should load ProductionErrorBoundary without crashes
```

### Test Validation
```bash
npm run test:renderer
# Should pass all tests (update any tests that mock performanceService)
```

## Future Considerations

If performance monitoring becomes critical, implement properly:

1. **Main Process Performance Service** (`src/main/services/core/performance/`)
   - Has access to `os`, `process` modules
   - Tracks memory, bottlenecks, trends

2. **IPC API** (`src/shared/types/electron-api/performance-api.ts`)
   - Renderer-facing interface
   - Types: `MemoryStats`, `PerformanceTrend`, etc.

3. **IPC Handlers** (`src/main/handlers/performance-handlers.ts`)
   - `performance:getMemoryStats`
   - `performance:getBottlenecks`
   - `performance:recordMetric`

4. **Preload Exposure**
   - Expose via `window.electronAPI.performance`

5. **Renderer Usage**
   ```typescript
   const stats = await window.electronAPI.performance.getMemoryStats();
   ```

**For now**: Browser DevTools Performance tab is sufficient.
