/**
 * Vite Memory Leak Prevention Plugin
 *
 * This plugin monitors Vite's memory usage and implements strategies
 * to prevent memory leaks during development.
 */

import { performance } from 'perf_hooks';

function viteMemoryPlugin(options = {}) {
  const {
    maxMemoryMB = 800,
    checkIntervalMs = 30000,
    enableCleanup = true,
    verbose = false
  } = options;

  let checkInterval = null;
  let lastCleanup = 0;

  return {
    name: 'vite-memory-plugin',

    configureServer(server) {
      if (!enableCleanup) return;

      if (verbose) console.log('🧠 Vite Memory Plugin: Active');

      // Start memory monitoring
      checkInterval = setInterval(() => {
        const memoryUsage = process.memoryUsage();
        const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
        const heapTotalMB = memoryUsage.heapTotal / 1024 / 1024;
        const rssMB = memoryUsage.rss / 1024 / 1024;

        if (verbose) {
          console.log(`🧠 Vite Memory: RSS=${rssMB.toFixed(1)}MB, Heap=${heapUsedMB.toFixed(1)}/${heapTotalMB.toFixed(1)}MB`);
        }

        // Check if memory usage is high
        if (rssMB > maxMemoryMB) {
          if (verbose) console.warn(`⚠️  High memory usage: ${rssMB.toFixed(1)}MB > ${maxMemoryMB}MB`);

          // Force garbage collection if available
          if (global.gc) {
            if (verbose) console.log('🗑️  Forcing garbage collection...');
            global.gc();
          }

          // Clear build cache
          if (Date.now() - lastCleanup > 60000) { // Don't clean more than once per minute
            if (verbose) console.log('🧹 Clearing Vite build cache...');
            try {
              // Clear module graph cache
              if (server.moduleGraph) {
                server.moduleGraph.invalidateAll();
              }

              // Clear transform cache
              if (server.transformRequest) {
                // Force re-evaluation of modules
                const modules = Array.from(server.moduleGraph.urlToModuleMap?.keys() || []);
                modules.forEach(url => {
                  try {
                    server.moduleGraph.invalidateModule(server.moduleGraph.getModuleById(url));
                  } catch (e) {
                    // Ignore errors during cleanup
                  }
                });
              }

              lastCleanup = Date.now();
              if (verbose) console.log('✅ Build cache cleared');
            } catch (error) {
              if (verbose) console.error('❌ Error clearing cache:', error.message);
            }
          }
        }

        // Check for memory leaks (continuous growth)
        if (performance.memory && verbose) {
          const perfMemory = performance.memory;
          const usedMB = perfMemory.usedJSHeapSize / 1024 / 1024;
          const totalMB = perfMemory.totalJSHeapSize / 1024 / 1024;
          const limitMB = perfMemory.jsHeapSizeLimit / 1024 / 1024;

          if (usedMB > limitMB * 0.9 && verbose) {
            console.warn(`🚨 Approaching heap limit: ${usedMB.toFixed(1)}MB / ${limitMB.toFixed(1)}MB`);
          }
        }

      }, checkIntervalMs);
    },

    buildEnd() {
      // Clean up on build end
      if (checkInterval) {
        clearInterval(checkInterval);
        checkInterval = null;
      }
    },

    configurePreviewServer(server) {
      // Also monitor preview server
      this.configureServer(server);
    }
  };
}

export default viteMemoryPlugin;