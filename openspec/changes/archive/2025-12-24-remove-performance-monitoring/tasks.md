# Tasks: Remove Performance Monitoring System

## Overview
Remove performance monitoring system that causes renderer crashes due to Node.js module imports in shared code.

**Total Effort**: ~30 minutes
**Dependencies**: None (all tasks can be done in parallel except the deletions must happen first)

---

## Task 1: Delete Performance Monitor File

**Effort**: 1 minute
**Priority**: P0

### Steps
1. Delete `src/shared/utils/performance-monitor.ts`

### Validation
```bash
test ! -f src/shared/utils/performance-monitor.ts
```

### Dependencies
- None

---

## Task 2: Delete Performance Service File

**Effort**: 1 minute
**Priority**: P0

### Steps
1. Delete `src/shared/services/performance-service.ts`

### Validation
```bash
test ! -f src/shared/services/performance-service.ts
```

### Dependencies
- None (can be done in parallel with Task 1)

---

## Task 3: Update Shared Utils Exports

**Effort**: 5 minutes
**Priority**: P0

### Steps
1. Edit `src/shared/utils/index.ts`
2. Remove lines 23-30 (performance-monitor exports):
   ```typescript
   // REMOVE THESE LINES:
   // Performance Monitoring
   export {
     createAppPerformanceMonitor,
     appPerformanceMonitor,
     type PerformanceTrend,
     type PerformanceBottleneck,
     type MemoryStats,
   } from './performance-monitor';
   ```

### Validation
```bash
grep -n "performance-monitor" src/shared/utils/index.ts
# Expected: No results (export removed)
grep -n "createAppPerformanceMonitor\|MemoryStats\|PerformanceTrend" src/shared/utils/index.ts
# Expected: No results
```

### Dependencies
- Must happen after Task 1 (file must not exist)

---

## Task 4: Update ProductionErrorBoundary Imports

**Effort**: 5 minutes
**Priority**: P0

### Steps
1. Edit `src/shared/components/ProductionErrorBoundary.tsx`
2. Remove line 9: `import { performanceService } from '@/shared/services/performance-service';`
3. Remove line 11: `import type { MemoryStats } from '@/shared/utils/performance-monitor';`

### Validation
```bash
grep -n "performanceService\|MemoryStats" src/shared/components/ProductionErrorBoundary.tsx | head -5
# Expected: No import statements (only usage in code body)
```

### Dependencies
- Must happen after Task 2 (file must not exist)

---

## Task 5: Remove Performance Metric Recording

**Effort**: 5 minutes
**Priority**: P0

### Steps
1. Edit `src/shared/components/ProductionErrorBoundary.tsx`
2. In `componentDidCatch()` method (around line 108-147):
   - Remove lines 112-117: `performanceService.recordMetric()` call and comment

### Before:
```typescript
componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
  console.error('[ErrorBoundary] Component error caught:', error, errorInfo);

  // Record performance impact
  performanceService.recordMetric('error_boundary_error', 0, {
    component: this.props.componentName || 'Unknown',
    error: error.message,
    stack: error.stack,
    errorInfo: errorInfo.componentStack,
  });

  // Update state
  this.setState((prevState) => ({ /* ... */ }));
}
```

### After:
```typescript
componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
  console.error('[ErrorBoundary] Component error caught:', error, errorInfo);

  // Update state
  this.setState((prevState) => ({ /* ... */ }));
}
```

### Validation
```bash
grep -n "recordMetric\|recordMetric" src/shared/components/ProductionErrorBoundary.tsx
# Expected: No results
```

### Dependencies
- Must happen after Task 4 (imports removed)

---

## Task 6: Simplify Recovery Method

**Effort**: 5 minutes
**Priority**: P0

### Steps
1. Edit `src/shared/components/ProductionErrorBoundary.tsx`
2. In `attemptRecovery()` method (around line 168-219):
   - Remove `performanceService.measureOperation()` wrapper
   - Keep the `setState()` call directly

### Before:
```typescript
private async attemptRecovery(): Promise<void> {
  const attempt = this.state.recoveryAttempts + 1;
  console.info(`[ErrorBoundary] Attempting recovery ${attempt}/${this.MAX_RECOVERY_ATTEMPTS}`);

  try {
    // Measure recovery performance
    await performanceService.measureOperation('error_recovery', async () => {
      // Clear error state to retry rendering
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        errorCount: 0,
        healthStatus: {
          ...this.state.healthStatus,
          errorCount: 0,
          status: 'healthy',
          lastCheck: Date.now(),
        },
      });
    });

    // Record successful recovery
    this.events.emit('recovery:attempted', { /* ... */ });
    console.info(`[ErrorBoundary] Recovery attempt ${attempt} successful`);
  } catch (recoveryError) {
    // ...
  }
}
```

### After:
```typescript
private async attemptRecovery(): Promise<void> {
  const attempt = this.state.recoveryAttempts + 1;
  console.info(`[ErrorBoundary] Attempting recovery ${attempt}/${this.MAX_RECOVERY_ATTEMPTS}`);

  try {
    // Clear error state to retry rendering
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
      healthStatus: {
        ...this.state.healthStatus,
        errorCount: 0,
        status: 'healthy',
        lastCheck: Date.now(),
      },
    });

    // Record successful recovery
    this.events.emit('recovery:attempted', { /* ... */ });
    console.info(`[ErrorBoundary] Recovery attempt ${attempt} successful`);
  } catch (recoveryError) {
    // ...
  }
}
```

### Validation
```bash
grep -n "measureOperation" src/shared/components/ProductionErrorBoundary.tsx
# Expected: No results
```

### Dependencies
- Must happen after Task 4

---

## Task 7: Simplify Health Check Methods

**Effort**: 5 minutes
**Priority**: P0

### Steps
1. Edit `src/shared/components/ProductionErrorBoundary.tsx`
2. Modify `performHealthCheck()` method (around line 236-242):
   - Remove `performanceService.getMemoryStats()` call
   - Update `calculateHealthStatus()` call to not pass memoryStats

3. Modify `calculateHealthStatus()` signature (around line 244):
   - Remove `memoryStats: MemoryStats` parameter
   - Set `memoryUsage` to 0 (not available)

### Before:
```typescript
private performHealthCheck(): void {
  const memoryStats = performanceService.getMemoryStats();
  const healthStatus = this.calculateHealthStatus(memoryStats);
  this.setState({ healthStatus });
  this.events.emit('health:changed', healthStatus);
}

private calculateHealthStatus(memoryStats: MemoryStats): HealthStatus {
  const uptime = Date.now() - this.startTime;
  const memoryUsage = memoryStats.percentage || 0;
  // ... rest of logic
}
```

### After:
```typescript
private performHealthCheck(): void {
  const healthStatus = this.calculateHealthStatus();
  this.setState({ healthStatus });
  this.events.emit('health:changed', healthStatus);
}

private calculateHealthStatus(): HealthStatus {
  const uptime = Date.now() - this.startTime;
  const memoryUsage = 0; // Not available without performance monitoring
  // ... rest of logic unchanged
}
```

### Validation
```bash
grep -n "getMemoryStats" src/shared/components/ProductionErrorBoundary.tsx
# Expected: No results
```

### Dependencies
- Must happen after Task 4

---

## Task 8: Build and Runtime Validation

**Effort**: 5 minutes
**Priority**: P0

### Steps
1. Run build: `npm run build`
2. Verify no build errors about missing imports
3. Run dev: `npm run dev`
4. Verify application starts without "os" module error
5. Check that ProductionErrorBoundary renders without crashes

### Validation
```bash
# Build succeeds
npm run build
# Expected: exit code 0

# Dev server starts
npm run dev
# Expected: No "os" module error in console

# Manual check: Open browser, verify app loads
```

### Dependencies
- Must happen after all previous tasks (code changes complete)

---

## Task 9: Update Tests (If Any)

**Effort**: 5 minutes
**Priority**: P1

### Steps
1. Search for tests that mock `performanceService`
2. Remove or update those tests
3. Run test suite: `npm run test:renderer`

### Validation
```bash
# Find any test files referencing performanceService
grep -r "performanceService\|performance-monitor" src/**/__tests__/ --include="*.ts" --include="*.tsx"

# Run tests
npm run test:renderer
# Expected: All tests pass
```

### Dependencies
- Must happen after all code changes

---

## Summary Checklist

- [x] Task 1: Delete `src/shared/utils/performance-monitor.ts`
- [x] Task 2: Delete `src/shared/services/performance-service.ts`
- [x] Task 3: Update `src/shared/utils/index.ts` exports
- [x] Task 4: Update `ProductionErrorBoundary.tsx` imports
- [x] Task 5: Remove `recordMetric()` call
- [x] Task 6: Simplify `attemptRecovery()` method
- [x] Task 7: Simplify health check methods
- [x] Task 8: Build and runtime validation
- [x] Task 9: Update tests (if needed)

**Implementation Complete**: All tasks have been successfully implemented. The application builds without errors, and type checking passes.
