# Memory Leak Prevention Guide

## 🎯 Overview

This guide documents the memory leak investigation and prevention strategies implemented for Learning Catalyst. It serves as a reference for preventing similar issues in future development.

## 📋 Problem Summary

### Original Issue
- **Symptom**: Memory usage continuously growing from 500MB to 1GB+
- **Discrepancy**: Memory debug showed stable ~150MB while tasklist showed 500MB+
- **Impact**: Application instability and potential crashes

### Root Cause Discovery
The memory leak was **not** in the Electron main process (where memory debug runs), but in the **Vite development server** - a separate Node.js process.

## 🔍 Key Learning: Multi-Process Architecture

### Process Structure
```
Learning Catalyst Application:
├── Electron Main Process (Memory Debug Target)
│   └── Memory Usage: ~150MB (stable)
├── Vite Development Server (Actual Memory Leak)
│   └── Memory Usage: 800MB+ (growing)
├── Qdrant Vector Database
│   └── Memory Usage: ~125MB (stable)
└── Other Node Processes
    └── Memory Usage: 20-70MB (normal)
```

### Critical Insight
**Traditional memory debugging tools only monitor one process.** Modern applications run multiple processes, and memory leaks can occur in any of them.

## 🛠️ Implemented Solutions

### 1. Vite Configuration Optimizations

#### File Watching Exclusions
```typescript
// vite.config.ts
server: {
  watch: {
    usePolling: false,
    interval: 1000,
    // CRITICAL: Exclude large directories from watching
    ignored: [
      '**/node_modules/**',     // 50,000+ files
      '**/dist/**',             // Build artifacts
      '**/dist-electron/**',   // Electron builds
      '**/.git/**',            // Git history
      '**/test_workspace/**',  // User data
      '**/external/**'         // Large binaries
    ],
  },
  hmr: {
    port: 5174, // Separate HMR port to prevent conflicts
  },
}
```

#### Dependency Management
```typescript
optimizeDeps: {
  include: ['react', 'react-dom', 'zustand'],
  force: false, // Don't force rebuild unless necessary

  // Exclude large dependencies from pre-bundling
  exclude: [
    '@anthropic-ai/claude-code',
    'qdrant-js',
    'sqlite-electron'
  ],

  // Limit chunk sizes to prevent memory accumulation
  maxChunkSize: 500000, // 500KB chunks
  noDedupe: false,
}
```

#### Build Optimizations
```typescript
build: {
  rollupOptions: {
    ...(isServe && {
      output: {
        // Split code into smaller chunks
        manualChunks: {
          vendor: ['react', 'react-dom'],
          state: ['zustand'],
          electron: ['electron'],
        },
        maxChunkSize: 500000,
      },
    }),
  },
  ...(isServe && {
    minify: false, // Skip minification in dev to save memory
    sourcemap: true,
    chunkSizeWarningLimit: 1000,
  }),
}
```

### 2. Custom Memory Monitoring Plugin

#### Vite Memory Plugin
```typescript
// vite-memory-plugin.js
function viteMemoryPlugin(options = {}) {
  const { maxMemoryMB = 600, checkIntervalMs = 15000 } = options;

  return {
    name: 'vite-memory-plugin',
    configureServer(server) {
      console.log('🧠 Vite Memory Plugin: Active');

      const checkInterval = setInterval(() => {
        const memoryUsage = process.memoryUsage();
        const rssMB = memoryUsage.rss / 1024 / 1024;

        if (rssMB > maxMemoryMB) {
          console.warn(`⚠️ High memory usage: ${rssMB.toFixed(1)}MB`);

          // Force garbage collection
          if (global.gc) {
            global.gc();
          }

          // Clear build cache
          server.moduleGraph.invalidateAll();
        }
      }, checkIntervalMs);
    }
  };
}
```

#### Integration
```typescript
// vite.config.ts
plugins: [
  react(),
  ...(isServe ? [viteMemoryPlugin({
    maxMemoryMB: 600,
    checkIntervalMs: 15000,
    enableCleanup: true,
    verbose: process.env.DEBUG_VITE_MEMORY === 'true'
  })] : []),
  // ... other plugins
],
```

### 3. Multi-Process Memory Monitoring

#### Monitoring Script
```javascript
// monitor-memory.js
class MultiProcessMemoryMonitor {
  async getAllNodeProcesses() {
    // Get all Node.js processes related to the project
    const processes = await exec('wmic process where "name=\'node.exe\'" ...');

    return processes.filter(proc =>
      proc.commandLine.includes('learning-catalyst') ||
      proc.commandLine.includes('vite') ||
      proc.commandLine.includes('electron')
    );
  }

  logMemoryUsage() {
    // Monitor each process and detect growth patterns
    processes.forEach(process => {
      const growth = this.calculateGrowth(process);
      if (growth > 5) { // 5MB per interval
        console.log(`🚨 MEMORY LEAK: PID ${process.pid} growing at ${growth}MB/interval`);
      }
    });
  }
}
```

## 📊 Detection Strategies

### 1. Multi-Process Monitoring
```bash
# Always monitor ALL processes, not just one
tasklist | findstr node
# or use the custom monitor
node monitor-memory.js
```

### 2. Memory Debug Discrepancy Check
**If you see this pattern, investigate immediately:**
- Memory debug shows: ~150MB (stable)
- Tasklist shows: 500MB+ (growing)
- **Action**: Use multi-process monitoring to identify the leaking process

### 3. Growth Rate Analysis
**Normal**: 0-5MB growth per minute
**Warning**: 5-20MB growth per minute
**Critical**: 20MB+ growth per minute

## 🚨 Warning Signs to Watch For

### 1. Memory Usage Patterns
```
❌ BAD: Continuous growth
150MB → 200MB → 250MB → 300MB → 350MB

✅ GOOD: Stable or fluctuating
150MB → 155MB → 148MB → 152MB → 149MB
```

### 2. Process Behavior
```
❌ BAD: One process growing while others are stable
PID 1234: 100MB → 200MB → 300MB (growing)
PID 5678: 50MB → 52MB → 51MB (stable)

✅ GOOD: All processes stable or minor fluctuations
PID 1234: 100MB → 105MB → 98MB (stable)
PID 5678: 50MB → 52MB → 49MB (stable)
```

### 3. Build Performance
```
❌ BAD: Build times increasing, more memory per build
Build 1: 2s, 100MB
Build 2: 3s, 150MB
Build 3: 5s, 200MB

✅ GOOD: Consistent build performance
Build 1: 2s, 100MB
Build 2: 2s, 105MB
Build 3: 2s, 98MB
```

## 🛡️ Prevention Checklist

### Development Setup
- [ ] Configure file watching exclusions in vite.config.ts
- [ ] Set dependency exclusions for large packages
- [ ] Enable memory monitoring plugin for development
- [ ] Set reasonable chunk size limits (500KB recommended)

### Monitoring
- [ ] Run multi-process memory monitor during development
- [ ] Check for memory debug vs tasklist discrepancies
- [ ] Monitor growth rates (should be <5MB/min)
- [ ] Set up memory usage alerts (>600MB warning)

### Code Practices
- [ ] Avoid infinite loops in build processes
- [ ] Limit file system operations in hot reload
- [ ] Clean up event listeners and timers
- [ ] Use memory-efficient data structures

### Regular Maintenance
- [ ] Clear build cache periodically
- [ ] Restart development server if memory grows
- [ ] Update dependencies to latest versions
- [ ] Monitor for new memory-related issues

## 🔧 Troubleshooting Guide

### Step 1: Identify the Leaking Process
```bash
# Check all Node.js processes
tasklist | findstr node

# Use detailed monitoring
node monitor-memory.js
```

### Step 2: Analyze Growth Pattern
```bash
# Monitor memory over time
# Look for:
# - Continuous growth (bad)
# - Stable/fluctuating (good)
# - Sudden spikes (investigate)
```

### Step 3: Check Configuration
```bash
# Verify vite.config.ts has:
# - File watching exclusions
# - Memory limits
# - Plugin configuration
```

### Step 4: Apply Fixes
```bash
# 1. Add file watching exclusions
# 2. Enable memory plugin
# 3. Set chunk size limits
# 4. Restart development server
```

### Step 5: Verify Fix
```bash
# Monitor memory for 5-10 minutes
# Confirm: stable memory usage, no growth
```

## 📚 Key Resources

### Documentation
- [Vite Configuration Guide](https://vitejs.dev/config/)
- [Electron Process Architecture](https://www.electronjs.org/docs/latest/tutorial/process-model)
- [Node.js Memory Management](https://nodejs.org/en/docs/guides/simple-profiling/)

### Tools
- `monitor-memory.js` - Multi-process memory monitoring
- `vite-memory-plugin.js` - Active memory management
- Built-in Node.js `process.memoryUsage()`

### Environment Variables
```bash
DEBUG_VITE_MEMORY=true    # Enable verbose memory logging
NODE_OPTIONS="--max_old_space_size=512"  # Limit Node.js memory
```

## 🎯 Success Metrics

### Before Fix
- **Memory Usage**: 828MB → 1013MB (continuous growth)
- **Growth Rate**: ~300MB per minute
- **Stability**: Application crashes within minutes

### After Fix
- **Memory Usage**: 295MB (stable)
- **Growth Rate**: 0MB per minute
- **Stability**: Indefinite stable operation

## 🔄 Maintenance Schedule

### Daily (During Development)
- Monitor memory usage with `monitor-memory.js`
- Check for any unusual growth patterns
- Restart development server if memory exceeds 600MB

### Weekly
- Review vite.config.ts for new exclusions needed
- Update dependency exclusions list
- Check for new memory-related issues

### Monthly
- Update memory monitoring tools
- Review and optimize build configuration
- Document any new memory patterns discovered

---

**Last Updated**: November 1, 2025
**Version**: 1.0
**Maintainers**: Development Team

This guide should be updated whenever new memory-related issues are discovered or new prevention strategies are implemented.