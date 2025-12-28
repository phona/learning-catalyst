# Proposal: Remove Performance Monitoring System

## Change ID
`remove-performance-monitoring`

## Summary
Remove the entire performance monitoring system (`performance-monitor.ts` and `performance-service.ts`) which is causing renderer process crashes due to Node.js module dependencies (`os`, `process`) being imported in shared code accessible by the renderer.

## Motivation

### Problem
The application crashes on startup with:
```
Uncaught Error: Module "os" has been externalized for browser compatibility.
Cannot access "os.totalmem" in client code.
```

**Root Cause**: `src/shared/utils/performance-monitor.ts` imports Node.js's `os` module (line 11: `import { totalmem } from 'os'`). Since this file is in `shared/`, it can be imported by both main process (Node.js) AND renderer process (browser). When `ProductionErrorBoundary.tsx` (a React component in the renderer) imports `performanceService`, which uses `performance-monitor`, the browser tries to load the `os` module and fails.

### Why This Architecture Existed
The performance monitoring system was designed as a "universal" utility that could work anywhere:
- Memory monitoring (`os.totalmem()`, `process.memoryUsage()`)
- Performance bottleneck detection
- Auto-optimization with cache clearing
- Health status reporting

This violates the project's core architectural principle: **Main process provides, Renderer process consumes**.

### Why Complete Removal vs IPC Migration
**Option A**: Move to main process + IPC layer
- Pro: Preserves functionality
- Con: Significant engineering effort (new handlers, types, preload)
- Con: Adds complexity for features that may not be actively used

**Option B**: Complete removal (CHOSEN)
- Pro: Immediate fix for the crash
- Pro: Removes unused/dead code
- Pro: Simplifies codebase
- Con: Loss of performance tracking features (mitigated: browser has built-in DevTools)

**Decision**: Remove completely because:
1. The error boundary still works without performance tracking
2. Modern browsers have excellent built-in profiling tools
3. The code appears to be over-engineered for the actual use case
4. Quick fix that unblocks development

## Impact

### Files Deleted
1. `src/shared/utils/performance-monitor.ts` - Core performance monitoring with Node.js dependencies
2. `src/shared/services/performance-service.ts` - Service layer using performance-monitor

### Files Modified
1. `src/shared/utils/index.ts` - Remove exports of performance-monitor types
2. `src/shared/components/ProductionErrorBoundary.tsx` - Remove performanceService usage

### Functionality Lost
- Error boundary will no longer track:
  - Performance metrics on errors
  - Recovery operation timing
  - Memory statistics display
- Health monitoring UI will show simplified status (no memory percentage)

### Functionality Preserved
- Error catching and display
- Retry mechanisms
- Recovery attempts
- Console logging
- Custom error callbacks

## Alternatives Considered

### Alternative 1: IPC-Based Performance API
Move performance monitoring to main process, expose via IPC.

**Pros**:
- Preserves all functionality
- Proper architecture (main provides, renderer consumes)

**Cons**:
- Requires new IPC handlers, types, preload setup
- More complex than needed for current use case
- Longer implementation time

**Decision**: Deferred - can be added later if performance profiling becomes critical

### Alternative 2: Browser-Native Performance API Only
Remove Node.js dependencies, use only `performance.now()`, `PerformanceObserver`.

**Pros**:
- Works in renderer
- No IPC needed

**Cons**:
- Cannot access system memory (`os.totalmem()`)
- Still requires significant refactoring
- Lose main process monitoring

**Decision**: Incomplete solution - the memory monitoring was a key feature

## Dependencies
- None (pure removal)

## Risks
- **Low Risk**: Removing unused/dead code
- **Medium Risk**: If performance monitoring was critical for production debugging, this would be a regression. Mitigation: Browser DevTools provide equivalent functionality.

## Success Criteria
1. Application starts without `os` module error
2. ProductionErrorBoundary still catches and displays errors
3. No build errors from missing imports
4. All tests pass

## Estimated Effort
- **Size**: S (Small)
- **Time**: 30 minutes
- **Complexity**: Low

## Related Specs
- `renderer-structure` - Shared code must not have Node.js dependencies
- `component-architecture` - Error boundaries are core components
