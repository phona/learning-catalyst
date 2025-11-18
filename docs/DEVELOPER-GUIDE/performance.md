# Performance & Optimization Guide

This guide covers **performance optimization strategies** for Learning Catalyst, including memory management, build optimization, and runtime performance.

## Performance Overview

### Multi-Process Architecture

Learning Catalyst runs **multiple processes**, each with different performance characteristics:

```
┌─────────────────────────────────────────────────────────┐
│                Learning Catalyst                         │
│                                                          │
│  ┌──────────────────┐      ┌──────────────────┐         │
│  │  Main Process    │      │ Renderer Process │         │
│  │   (Node.js)      │      │   (Chromium)     │         │
│  │                  │      │                  │         │
│  │  Memory: ~150MB  │      │  Memory: ~200MB  │         │
│  │  Stable ✓        │      │  Varies ✓        │         │
│  └──────────────────┘      └──────────────────┘         │
│                                                          │
│  ┌──────────────────┐      ┌──────────────────┐         │
│  │  Vite Dev Server │      │  Qdrant Vector   │         │
│  │   (Node.js)      │      │    Database      │         │
│  │                  │      │                  │         │
│  │  Memory: ~300MB  │      │  Memory: ~125MB  │         │
│  │  Optimized ✓     │      │  Stable ✓        │         │
│  └──────────────────┘      └──────────────────┘         │
└─────────────────────────────────────────────────────────┘
```

## Memory Management

### Understanding the Memory Leak Issue

**Problem**: Development server memory growing from 300MB to 1GB+

**Root Cause**:
- Vite file watching 50,000+ node_modules files
- No exclusions for large directories
- Unlimited chunk sizes
- No garbage collection triggers

**Solution**: Multi-pronged optimization

### Vite Configuration Optimization

**File**: `vite.config.ts`

#### 1. File Watching Exclusions

```typescript
// ✅ Optimized configuration
export default defineConfig({
  server: {
    watch: {
      usePolling: false,      // Reduces CPU usage
      interval: 1000,         // Check every second (not continuous)

      // CRITICAL: Exclude large directories
      ignored: [
        '**/node_modules/**',      // 50,000+ files
        '**/dist/**',              // Build artifacts
        '**/dist-electron/**',     // Electron builds
        '**/.git/**',             // Git history
        '**/test_workspace/**',   // User data (can be large)
        '**/external/**',         // Large binaries
        '**/coverage/**',         // Test coverage
        '**/.cache/**',           // Cache directories
        '**/*.log',               // Log files
        '**/.DS_Store',           // System files
        '**/Thumbs.db'            // System files
      ]
    },
    hmr: {
      port: 5174  // Separate HMR port
    }
  }
});
```

#### 2. Dependency Optimization

```typescript
export default defineConfig({
  optimizeDeps: {
    include: [
      // Only include essential dependencies
      'react',
      'react-dom',
      'zustand',
      '@tanstack/react-query'
    ],

    exclude: [
      // Large packages not needed in dev
      '@anthropic-ai/claude-code',
      'qdrant-js',
      'sqlite-electron',
      // Add other large deps
    ],

    // Limit pre-bundling
    force: false,  // Don't force rebuild
    maxSize: 1000 * 1000  // 1MB chunks
  }
});
```

#### 3. Build Optimization

```typescript
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        // Manual chunks for better tree-shaking
        manualChunks: {
          // Vendor chunks
          'vendor-react': ['react', 'react-dom'],
          'vendor-ui': ['zustand', '@tanstack/react-query'],
          'vendor-electron': ['electron'],

          // Limit chunk size
          maxFileSize: 500 * 1024,  // 500KB per chunk

          // Add warnings
          chunkFileNames: (chunkInfo) => {
            const facadeModuleId = chunkInfo.facadeModuleId
              ? chunkInfo.facadeModuleId.split('/').pop()
              : 'chunk';
            return `js/[name]-[hash].js`;
          }
        }
      }
    },

    // Dev build optimizations
    ...(isServe && {
      minify: false,           // Skip minification (faster builds)
      sourcemap: true,         // But keep sourcemaps
      chunkSizeWarningLimit: 1000
    })
  }
});
```

### Custom Memory Monitoring Plugin

**File**: `vite-memory-plugin.ts`

```typescript
function viteMemoryPlugin(options: MemoryPluginOptions = {}) {
  const {
    maxMemoryMB = 600,
    checkIntervalMs = 15000,
    enableCleanup = true,
    verbose = false
  } = options;

  return {
    name: 'vite-memory-plugin',

    configureServer(server) {
      console.log(`🧠 Vite Memory Plugin: Active (max: ${maxMemoryMB}MB)`);

      const checkInterval = setInterval(() => {
        const memoryUsage = process.memoryUsage();
        const rssMB = memoryUsage.rss / 1024 / 1024;
        const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;

        if (verbose) {
          console.log(
            `📊 Memory: RSS=${rssMB.toFixed(1)}MB, Heap=${heapUsedMB.toFixed(1)}MB`
          );
        }

        // Check if over limit
        if (rssMB > maxMemoryMB) {
          console.warn(
            `⚠️  High memory usage: ${rssMB.toFixed(1)}MB (limit: ${maxMemoryMB}MB)`
          );

          // Force garbage collection (if available)
          if (global.gc && enableCleanup) {
            console.log('🧹 Forcing garbage collection...');
            global.gc();
          }

          // Clear Vite module cache
          if (enableCleanup) {
            console.log('🗑️  Clearing Vite module cache...');
            server.moduleGraph.invalidateAll();
          }

          // Warn about potential issues
          console.warn(
            '💡 Consider:\n' +
            '   - Restarting dev server\n' +
            '   - Closing other apps\n' +
            '   - Checking for memory leaks in code'
          );
        }
      }, checkIntervalMs);

      // Cleanup on server close
      server.httpServer?.on('close', () => {
        clearInterval(checkInterval);
      });
    }
  };
}
```

**Usage in vite.config.ts:**

```typescript
import { viteMemoryPlugin } from './vite-memory-plugin';

export default defineConfig({
  plugins: [
    react(),

    // Memory monitoring in dev only
    ...(isServe ? [
      viteMemoryPlugin({
        maxMemoryMB: 600,
        checkIntervalMs: 15000,
        enableCleanup: true,
        verbose: process.env.DEBUG_MEMORY === 'true'
      })
    ] : [])
  ]
});
```

### Multi-Process Memory Monitoring

**File**: `monitor-memory.js`

```javascript
#!/usr/bin/env node

const { exec } = require('child_process');
const os = require('os');

class MultiProcessMemoryMonitor {
  constructor() {
    this.processes = new Map();
    this.interval = null;
  }

  async getAllNodeProcesses() {
    return new Promise((resolve, reject) => {
      if (os.platform() === 'win32') {
        // Windows
        exec(
          'wmic process where "name=\'node.exe\'" get ProcessId,CommandLine /value',
          (err, stdout) => {
            if (err) return reject(err);
            resolve(this.parseWindowsProcesses(stdout));
          }
        );
      } else {
        // Unix-like
        exec(
          "ps aux | grep -E 'node|vite|electron' | grep -v grep",
          (err, stdout) => {
            if (err) return reject(err);
            resolve(this.parseUnixProcesses(stdout));
          }
        );
      }
    });
  }

  parseWindowsProcesses(output) {
    const processes = [];
    const lines = output.split('\r\r\n').filter(l => l.trim());

    for (const line of lines) {
      if (line.includes('learning-catalyst') || line.includes('vite')) {
        const pid = line.split('=')[1]?.trim();
        if (pid) {
          processes.push({ pid, name: 'node.exe', command: 'learning-catalyst' });
        }
      }
    }
    return processes;
  }

  parseUnixProcesses(output) {
    const processes = [];
    const lines = output.split('\n');

    for (const line of lines) {
      if (line.includes('learning-catalyst') || line.includes('vite')) {
        const parts = line.split(/\s+/);
        processes.push({
          pid: parts[1],
          name: parts[10],
          cpu: parts[2],
          mem: parts[3],
          command: parts.slice(10).join(' ')
        });
      }
    }
    return processes;
  }

  calculateGrowth(process, history) {
    if (!history || history.length < 2) return 0;

    const latest = parseFloat(process.mem);
    const previous = parseFloat(history[history.length - 1].mem);

    return latest - previous;
  }

  async checkMemory() {
    try {
      const processes = await this.getAllNodeProcesses();

      for (const process of processes) {
        if (!this.processes.has(process.pid)) {
          this.processes.set(process.pid, []);
        }

        const history = this.processes.get(process.pid);
        history.push({ ...process, timestamp: Date.now() });

        // Keep only last 10 entries
        if (history.length > 10) {
          history.shift();
        }

        const growth = this.calculateGrowth(process, history);
        const memoryMB = parseFloat(process.mem);

        // Check for memory leak (growth > 5MB per check)
        if (growth > 5) {
          console.log(
            `🚨 MEMORY LEAK: PID ${process.pid} (${process.command}) ` +
            `growing at ${growth.toFixed(1)}MB/check`
          );
        }

        // Log memory usage
        console.log(
          `📊 PID ${process.pid}: ${memoryMB.toFixed(1)}MB ` +
          `(growth: ${growth > 0 ? '+' : ''}${growth.toFixed(1)}MB) - ${process.command}`
        );
      }
    } catch (error) {
      console.error('Error checking memory:', error.message);
    }
  }

  start(intervalMs = 30000) {
    console.log('🔍 Starting multi-process memory monitor...');
    console.log(`📝 Checking every ${intervalMs / 1000} seconds\n`);

    this.interval = setInterval(() => {
      this.checkMemory();
    }, intervalMs);

    // Initial check
    this.checkMemory();
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      console.log('\n🛑 Memory monitor stopped');
    }
  }
}

// Start monitor if run directly
if (require.main === module) {
  const monitor = new MultiProcessMemoryMonitor();

  process.on('SIGINT', () => {
    monitor.stop();
    process.exit(0);
  });

  monitor.start(30000);  // Check every 30 seconds
}

module.exports = MultiProcessMemoryMonitor;
```

**Usage:**

```bash
# Run memory monitor in background
node monitor-memory.js

# Or with custom interval
node monitor-memory.js 15000  # Check every 15 seconds
```

## Runtime Performance

### React Component Optimization

#### 1. Lazy Loading

```typescript
// ✅ Lazy load heavy components
import { lazy, Suspense } from 'react';

const KnowledgeMap = lazy(() => import('../components/KnowledgeMap'));
const AnalyticsDashboard = lazy(() => import('../components/AnalyticsDashboard'));

function App() {
  return (
    <div>
      <Suspense fallback={<div>Loading knowledge map...</div>}>
        <KnowledgeMap />
      </Suspense>
    </div>
  );
}
```

#### 2. Memoization

```typescript
// ✅ Memoize expensive calculations
import { useMemo, useCallback } from 'react';

function KnowledgeGraph({ concepts, relationships }) {
  // Memoize expensive computation
  const graphData = useMemo(() => {
    return buildGraphData(concepts, relationships);
  }, [concepts, relationships]);

  // Memoize event handlers
  const handleNodeClick = useCallback((nodeId: string) => {
    console.log('Node clicked:', nodeId);
  }, []);

  return <GraphVisualization data={graphData} onNodeClick={handleNodeClick} />;
}
```

#### 3. Virtualization

```typescript
// ✅ Virtualize large lists
import { FixedSizeList as List } from 'react-window';

function SessionList({ sessions }) {
  const Row = ({ index, style }) => (
    <div style={style}>
      <SessionItem session={sessions[index]} />
    </div>
  );

  return (
    <List
      height={600}
      itemCount={sessions.length}
      itemSize={80}
    >
      {Row}
    </List>
  );
}
```

### Database Query Optimization

#### 1. Proper Indexing

```typescript
// ✅ Index frequently queried columns
await db.schema
  .createIndex('idx_messages_session_id')
  .on('messages')
  .column('session_id')
  .execute();

await db.schema
  .createIndex('idx_messages_timestamp')
  .on('messages')
  .column('timestamp')
  .execute();

await db.schema
  .createIndex('idx_concepts_search')
  .on('concepts')
  .columns(['name', 'description'])
  .execute();
```

#### 2. Selective Queries

```typescript
// ✅ Select only needed columns
const sessions = await db
  .selectFrom('learning_sessions')
  .select(['id', 'title', 'start_time', 'updated_at'])  // Only needed columns
  .where('end_time', 'is', null)
  .limit(50)
  .execute();

// ❌ Avoid SELECT *
const sessions = await db
  .selectFrom('learning_sessions')
  .selectAll()  // Returns unnecessary columns
  .execute();
```

#### 3. Query Batching

```typescript
// ✅ Batch related queries
async function loadSession(sessionId: string) {
  const [session, messages, concepts] = await Promise.all([
    // Parallel queries
    db.selectFrom('learning_sessions').selectAll().where('id', '=', sessionId).executeTakeFirst(),
    db.selectFrom('messages').selectAll().where('session_id', '=', sessionId).execute(),
    db.selectFrom('concepts').selectAll().where('session_id', '=', sessionId).execute()
  ]);

  return { session, messages, concepts };
}

// ❌ Avoid sequential queries
const session = await db.selectFrom('learning_sessions')...;
const messages = await db.selectFrom('messages')...;  // Waits for previous
const concepts = await db.selectFrom('concepts')...;  // Waits for previous
```

### Caching Strategy

#### 1. In-Memory Caching

```typescript
// Simple cache implementation
class MemoryCache<T> {
  private store = new Map<string, { data: T; expires: number }>();
  private ttl: number;

  constructor(ttlMs: number) {
    this.ttl = ttlMs;
  }

  get(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expires) {
      this.store.delete(key);
      return null;
    }

    return entry.data;
  }

  set(key: string, data: T): void {
    this.store.set(key, {
      data,
      expires: Date.now() + this.ttl
    });
  }
}

// Usage
const sessionCache = new MemoryCache<Session>(5 * 60 * 1000);  // 5 minutes

async function getSession(sessionId: string): Promise<Session> {
  const cached = sessionCache.get(sessionId);
  if (cached) return cached;

  const session = await loadSessionFromDB(sessionId);
  sessionCache.set(sessionId, session);
  return session;
}
```

#### 2. Database Query Caching

```typescript
// Cache Kysely queries
async function getKnowledgeMap(sessionId: string) {
  const cacheKey = `knowledge-map:${sessionId}`;

  // Check cache first
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  // Query database
  const graphData = await db
    .selectFrom('concepts')
    .selectAll()
    .where('session_id', '=', sessionId)
    .execute();

  // Cache result
  await cache.set(cacheKey, graphData, 60 * 60 * 1000);  // 1 hour
  return graphData;
}
```

### Streaming and Real-Time Updates

#### 1. Streaming Responses

```typescript
// Stream AI responses for better UX
export async function sendMessageStream(
  message: string,
  onChunk: (chunk: string) => void
): Promise<void> {
  const stream = await aiService.stream(message);

  for await (const chunk of stream) {
    onChunk(chunk.content);
  }
}
```

#### 2. Debounced Updates

```typescript
// Debounce UI updates
import { useDebounce } from 'react-use';

function SearchBox() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (debouncedQuery) {
      search(debouncedQuery);
    }
  }, [debouncedQuery]);

  return (
    <input
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      placeholder="Search..."
    />
  );
}
```

## Performance Monitoring

### Built-in Metrics

```typescript
// Performance monitoring service
class PerformanceMonitor {
  static measure<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    return fn().finally(() => {
      const duration = performance.now() - start;
      loggerService.info(`Performance: ${name}`, { duration });
    });
  }

  static trackRender(componentName: string) {
    if (process.env.NODE_ENV === 'development') {
      performance.mark(`${componentName}-start`);
    }
  }

  static trackRenderEnd(componentName: string) {
    if (process.env.NODE_ENV === 'development') {
      performance.mark(`${componentName}-end`);
      performance.measure(
        componentName,
        `${componentName}-start`,
        `${componentName}-end`
      );
    }
  }
}

// Usage
await PerformanceMonitor.measure('loadSession', async () => {
  const session = await loadSessionFromDB(sessionId);
  return session;
});
```

### React DevTools Profiler

```typescript
// Wrap components with Profiler in development
function App() {
  if (process.env.NODE_ENV === 'development') {
    return (
      <Profiler
        id="App"
        onRender={(id, phase, actualDuration) => {
          console.log(`Profiler (${id}):`, {
            phase,
            actualDuration,
            phase: `${phase} phase`
          });
        }}
      >
        <MainApp />
      </Profiler>
    );
  }

  return <MainApp />;
}
```

## Performance Best Practices

### 1. Profile Before Optimizing

```bash
# Use Chrome DevTools to profile
# 1. Open DevTools (F12)
# 2. Go to Performance tab
# 3. Record while using app
# 4. Analyze flame graph
# 5. Find bottlenecks
```

### 2. Follow the 80/20 Rule

```
80% of performance issues come from 20% of the code.

Focus on:
• Hot paths (frequently executed)
• Large data structures
• Blocking operations
• Memory allocations
```

### 3. Use Appropriate Data Structures

```typescript
// ✅ Good: Use Map for frequent lookups
const conceptMap = new Map(concepts.map(c => [c.id, c]));
const concept = conceptMap.get(conceptId);  // O(1) lookup

// ❌ Avoid: Array.find() for frequent lookups
const concept = concepts.find(c => c.id === conceptId);  // O(n) lookup
```

### 4. Avoid Premature Optimization

```typescript
// ❌ Bad: Premature optimization
const complexOptimization = useMemo(() => {
  return expensiveCalculation(data);
}, [data]);  // Only use if data actually changes

// ✅ Good: Only optimize when needed
const value = simpleCalculation(data);  // Simple first
```

### 5. Monitor Memory in Development

```bash
# Regular checks
npm run dev &
node monitor-memory.js

# Watch for:
# - Continuous growth
# - Growth rate > 5MB/min
# - Process crashes
```

## Troubleshooting Performance Issues

### High Memory Usage

**Symptoms**: Dev server uses 1GB+ memory

**Solutions**:
```bash
1. Add file watching exclusions (see above)
2. Enable memory plugin
3. Restart dev server
4. Close other apps
5. Check for memory leaks in code
```

### Slow Build Times

**Symptoms**: `npm run dev` takes 30+ seconds

**Solutions**:
```typescript
// In vite.config.ts
export default defineConfig({
  build: {
    // Disable minification in dev
    minify: false,
    // Use esbuild (faster)
    minify: 'esbuild',
    // Chunk strategically
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom']
        }
      }
    }
  }
});
```

### Slow Queries

**Symptoms**: Database queries take 1+ seconds

**Solutions**:
```typescript
1. Add indexes (see above)
2. Use selective queries
3. Batch queries with Promise.all
4. Cache frequently accessed data
5. Paginate large result sets
```

### UI Lag/Sluggishness

**Symptoms**: UI doesn't respond smoothly

**Solutions**:
```typescript
1. Use React.memo for expensive components
2. Implement virtualization for lists
3. Debounce user input
4. Use useCallback for event handlers
5. Lazy load non-critical components
```

## Performance Checklist

### Development
- [ ] File watching exclusions configured
- [ ] Memory monitoring enabled
- [ ] Build chunk sizes limited
- [ ] No large dependencies in dev
- [ ] Lazy loading implemented

### Database
- [ ] Indexes on foreign keys
- [ ] Selective column queries
- [ ] Query batching where appropriate
- [ ] Cache implemented
- [ ] Slow queries identified

### React/UI
- [ ] React.memo for expensive components
- [ ] useCallback for event handlers
- [ ] Virtualization for large lists
- [ ] Lazy loading for routes
- [ ] Debounced search/input

### Monitoring
- [ ] Performance marks in place
- [ ] Memory monitor running
- [ ] React DevTools Profiler setup
- [ ] Performance metrics logged
- [ ] Regular performance reviews

## Environment Variables

```bash
# Enable performance logging
DEBUG_PERFORMANCE=true

# Enable memory debugging
DEBUG_MEMORY=true

# Set memory limit (MB)
NODE_OPTIONS="--max_old_space_size=512"

# Enable Vite debug
DEBUG=vite:*
```

## Related Documentation

- [Architecture Overview](./architecture.md)
- [Database Design](./database.md)
- [Services Guide](./services.md)

---

**Last Updated**: November 2025
**Version**: 1.0
