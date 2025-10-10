# Memory Management

---
title: Learning Catalyst Memory Management
description: Memory usage patterns, optimization techniques, and leak detection
version: 1.0.0
last_updated: 2025-10-08
---

## Overview

This guide covers memory management techniques for Learning Catalyst, including memory usage analysis, optimization strategies, garbage collection tuning, and leak detection. Proper memory management is crucial for maintaining application performance and stability, especially when dealing with large datasets and AI model interactions.

## Memory Architecture Overview

### Memory Usage Patterns

```text
┌─────────────────────────────────────────────────────────────┐
│                    Application Memory                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐  │
│  │   Code Segment  │  │    Data Segment │  │   Heap       │  │
│  │                 │  │                 │  │              │  │
│  │ • Instructions  │  │ • Global Vars   │  │ • Objects    │  │
│  │ • Functions     │  │ • Static Vars   │  │ • Lists      │  │
│  │ • Methods       │  │ • Constants     │  │ • Dicts      │  │
│  └─────────────────┘  └─────────────────┘  └──────────────┘  │
│                              │                                │
│                              ▼                                │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐  │
│  │      Stack      │  │   Cache Layer   │  │  Buffers     │  │
│  │                 │  │                 │  │              │  │
│  │ • Local Vars    │  │ • AI Responses  │  │ • I/O        │  │
│  │ • Function Calls│  │ • Session Data  │  │ • Network    │  │
│  │ • Return Addr   │  │ • Computed Data │  │ • Database   │  │
│  └─────────────────┘  └─────────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Memory Components

1. **Heap Memory**: Dynamic allocation for objects and data structures
2. **Stack Memory**: Function calls and local variables
3. **Cache Memory**: AI responses and frequently accessed data
4. **Buffer Memory**: I/O operations and network communications
5. **Code Memory**: Application bytecode and instructions

## Memory Usage Analysis

### Memory Profiling Tools

```python
import psutil
import tracemalloc
import gc
import objgraph
from typing import Dict, List, Any
from dataclasses import dataclass
from datetime import datetime

@dataclass
class MemorySnapshot:
    timestamp: datetime
    rss_mb: float  # Resident Set Size
    vms_mb: float  # Virtual Memory Size
    heap_size_mb: float
    cache_size_mb: float
    object_count: int
    gc_stats: Dict[str, Any]

class MemoryProfiler:
    """Comprehensive memory profiling and analysis."""

    def __init__(self):
        self.snapshots = []
        self.object_counts = {}

    def take_snapshot(self, label: str = "") -> MemorySnapshot:
        """Take a memory snapshot."""
        process = psutil.Process()

        # Get memory info
        memory_info = process.memory_info()
        rss_mb = memory_info.rss / 1024 / 1024
        vms_mb = memory_info.vms / 1024 / 1024

        # Get heap size (approximation)
        heap_size_mb = self._estimate_heap_size()

        # Get cache size
        cache_size_mb = self._estimate_cache_size()

        # Get object count
        object_count = len(gc.get_objects())

        # Get GC stats
        gc_stats = gc.get_stats() if hasattr(gc, 'get_stats') else {}

        snapshot = MemorySnapshot(
            timestamp=datetime.now(),
            rss_mb=rss_mb,
            vms_mb=vms_mb,
            heap_size_mb=heap_size_mb,
            cache_size_mb=cache_size_mb,
            object_count=object_count,
            gc_stats=gc_stats
        )

        self.snapshots.append(snapshot)
        return snapshot

    def _estimate_heap_size(self) -> float:
        """Estimate heap memory usage."""
        # Enable tracemalloc for accurate measurement
        if not tracemalloc.is_tracing():
            tracemalloc.start()

        current, peak = tracemalloc.get_traced_memory()
        return current / 1024 / 1024

    def _estimate_cache_size(self) -> float:
        """Estimate cache memory usage."""
        # This would be implemented based on your caching system
        from src.cache.cache_manager import get_cache_manager
        cache = get_cache_manager()
        return cache.get_memory_usage_mb()

    def analyze_memory_growth(self) -> Dict[str, Any]:
        """Analyze memory growth patterns."""
        if len(self.snapshots) < 2:
            return {"error": "Need at least 2 snapshots for analysis"}

        first = self.snapshots[0]
        last = self.snapshots[-1]

        duration = (last.timestamp - first.timestamp).total_seconds()
        rss_growth = last.rss_mb - first.rss_mb
        object_growth = last.object_count - first.object_count

        return {
            "duration_seconds": duration,
            "rss_growth_mb": rss_growth,
            "rss_growth_rate_mb_per_minute": (rss_growth / duration) * 60 if duration > 0 else 0,
            "object_growth": object_growth,
            "object_growth_rate_per_minute": (object_growth / duration) * 60 if duration > 0 else 0,
            "heap_growth_mb": last.heap_size_mb - first.heap_size_mb,
            "cache_growth_mb": last.cache_size_mb - first.cache_size_mb
        }

    def find_memory_leaks(self) -> List[Dict[str, Any]]:
        """Identify potential memory leaks."""
        leaks = []

        # Check for objects that should have been garbage collected
        if len(self.snapshots) >= 3:
            # Compare object counts over time
            object_trend = []
            for snapshot in self.snapshots:
                object_trend.append(snapshot.object_count)

            # Simple trend analysis
            if all(object_trend[i] < object_trend[i + 1] for i in range(len(object_trend) - 1)):
                leaks.append({
                    "type": "object_count_growth",
                    "description": "Object count consistently increasing",
                    "start_count": object_trend[0],
                    "end_count": object_trend[-1],
                    "growth": object_trend[-1] - object_trend[0]
                })

        # Check for large objects
        large_objects = self._find_large_objects()
        if large_objects:
            leaks.extend(large_objects)

        return leaks

    def _find_large_objects(self) -> List[Dict[str, Any]]:
        """Find unusually large objects."""
        large_objects = []
        threshold_mb = 10  # Objects larger than 10MB

        all_objects = gc.get_objects()
        for obj in all_objects:
            try:
                size = sys.getsizeof(obj) / 1024 / 1024
                if size > threshold_mb:
                    large_objects.append({
                        "type": "large_object",
                        "object_type": type(obj).__name__,
                        "size_mb": size,
                        "repr": str(obj)[:100]  # Truncated representation
                    })
            except (TypeError, AttributeError):
                continue

        return large_objects

    def generate_report(self) -> str:
        """Generate memory usage report."""
        if not self.snapshots:
            return "No memory snapshots available"

        report = []
        report.append("Memory Usage Report")
        report.append("=" * 50)

        # Current memory usage
        current = self.snapshots[-1]
        report.append(f"Current Memory Usage ({current.timestamp}):")
        report.append(f"  RSS: {current.rss_mb:.2f} MB")
        report.append(f"  VMS: {current.vms_mb:.2f} MB")
        report.append(f"  Heap: {current.heap_size_mb:.2f} MB")
        report.append(f"  Cache: {current.cache_size_mb:.2f} MB")
        report.append(f"  Objects: {current.object_count:,}")

        # Memory growth analysis
        if len(self.snapshots) >= 2:
            analysis = self.analyze_memory_growth()
            report.append("\nMemory Growth Analysis:")
            report.append(f"  Duration: {analysis['duration_seconds']:.1f} seconds")
            report.append(f"  RSS Growth: {analysis['rss_growth_mb']:.2f} MB")
            report.append(f"  Growth Rate: {analysis['rss_growth_rate_mb_per_minute']:.2f} MB/min")

            if analysis['rss_growth_rate_mb_per_minute'] > 5:
                report.append("  ⚠️  High memory growth rate detected!")

        # Memory leaks
        leaks = self.find_memory_leaks()
        if leaks:
            report.append("\nPotential Memory Issues:")
            for leak in leaks:
                report.append(f"  ⚠️  {leak['description']}")
        else:
            report.append("\n✅ No obvious memory issues detected")

        return "\n".join(report)

# Usage example
profiler = MemoryProfiler()

def monitor_memory_usage(func):
    """Decorator to monitor memory usage of functions."""
    def wrapper(*args, **kwargs):
        # Take snapshot before function
        profiler.take_snapshot(f"before_{func.__name__}")

        try:
            result = func(*args, **kwargs)
        finally:
            # Take snapshot after function
            profiler.take_snapshot(f"after_{func.__name__}")

            # Generate report
            report = profiler.generate_report()
            print(f"Memory Report for {func.__name__}:")
            print(report)

        return result
    return wrapper

@monitor_memory_usage
def memory_intensive_operation():
    """Example function that uses significant memory."""
    # Create large data structures
    large_list = [i for i in range(1000000)]
    large_dict = {f"key_{i}": f"value_{i}" for i in range(100000)}

    # Simulate processing
    time.sleep(0.1)

    # Clean up
    del large_list
    del large_dict

    return "Operation completed"
```

### Object Reference Analysis

```python
import weakref
import gc
from typing import Dict, Set, Any

class ReferenceAnalyzer:
    """Analyze object references to detect memory leaks."""

    def __init__(self):
        self.tracked_objects = {}

    def track_object(self, obj: Any, label: str = ""):
        """Track an object for reference analysis."""
        obj_id = id(obj)
        self.tracked_objects[obj_id] = {
            'object': obj,
            'label': label,
            'weak_ref': weakref.ref(obj),
            'creation_time': time.time()
        }

    def check_tracked_objects(self) -> Dict[str, Any]:
        """Check which tracked objects are still alive."""
        alive_objects = {}
        dead_objects = []

        for obj_id, info in self.tracked_objects.items():
            if info['weak_ref']() is not None:
                alive_objects[obj_id] = {
                    'label': info['label'],
                    'lifetime': time.time() - info['creation_time'],
                    'type': type(info['object']).__name__,
                    'size': sys.getsizeof(info['object'])
                }
            else:
                dead_objects.append({
                    'obj_id': obj_id,
                    'label': info['label'],
                    'lifetime': time.time() - info['creation_time']
                })

        return {
            'alive_count': len(alive_objects),
            'dead_count': len(dead_objects),
            'alive_objects': alive_objects,
            'dead_objects': dead_objects
        }

    def find_reference_chains(self, obj: Any) -> List[List[str]]:
        """Find reference chains that keep object alive."""
        objgraph.show_refs([obj], max_depth=3, filename='refs.png')
        return objgraph.get_backref_chain(obj)

    def analyze_gc_roots(self) -> Dict[str, Any]:
        """Analyze garbage collection roots."""
        gc.collect()  # Force garbage collection

        # Get all objects
        all_objects = gc.get_objects()

        # Categorize objects by type
        type_counts = {}
        for obj in all_objects:
            obj_type = type(obj).__name__
            type_counts[obj_type] = type_counts.get(obj_type, 0) + 1

        # Find types with many instances (potential leaks)
        suspicious_types = {
            obj_type: count for obj_type, count in type_counts.items()
            if count > 1000 and obj_type not in ['str', 'int', 'float', 'bool']
        }

        return {
            'total_objects': len(all_objects),
            'type_counts': dict(sorted(type_counts.items(), key=lambda x: x[1], reverse=True)[:20]),
            'suspicious_types': suspicious_types
        }

# Usage example
analyzer = ReferenceAnalyzer()

def analyze_function_memory():
    """Analyze memory usage in a function."""
    # Track some objects
    data = [i for i in range(100000)]
    analyzer.track_object(data, "large_list")

    # Check what's still alive
    status = analyzer.check_tracked_objects()
    print(f"Tracked objects status: {status}")

    # Analyze GC roots
    gc_analysis = analyzer.analyze_gc_roots()
    print(f"GC analysis: {gc_analysis}")

    return data
```

## Memory Optimization Techniques

### Efficient Data Structures

```python
import array
import sys
from typing import Any, List, Iterator
from dataclasses import dataclass

class MemoryEfficientStructures:
    """Demonstrate memory-efficient data structures."""

    @staticmethod
    def use_array_instead_of_list():
        """Use array for numeric data instead of list."""
        # List: ~76 bytes per integer (overhead)
        large_list = [i for i in range(1000000)]
        list_size = sys.getsizeof(large_list) + sum(sys.getsizeof(i) for i in large_list)

        # Array: ~4 bytes per integer (compact)
        large_array = array.array('i', range(1000000))
        array_size = sys.getsizeof(large_array)

        print(f"List size: {list_size / 1024 / 1024:.2f} MB")
        print(f"Array size: {array_size / 1024 / 1024:.2f} MB")
        print(f"Memory savings: {(list_size - array_size) / 1024 / 1024:.2f} MB")

        return large_array

    @staticmethod
    def use_generators_instead_of_lists():
        """Use generators to process data lazily."""
        def process_data_generator(n: int) -> Iterator[int]:
            """Generate processed data lazily."""
            for i in range(n):
                # Process one item at a time
                processed = i * i + 1
                yield processed

        def process_data_list(n: int) -> List[int]:
            """Process all data at once (memory intensive)."""
            return [i * i + 1 for i in range(n)]

        # Compare memory usage
        generator_result = list(process_data_generator(100000))
        list_result = process_data_list(100000)

        gen_size = sys.getsizeof(generator_result)
        list_size = sys.getsizeof(list_result)

        print(f"Generator result size: {gen_size / 1024:.2f} KB")
        print(f"List result size: {list_size / 1024:.2f} KB")

    @staticmethod
    def use_slots_for_classes():
        """Use __slots__ to reduce class memory overhead."""
        class RegularClass:
            def __init__(self, x, y, z):
                self.x = x
                self.y = y
                self.z = z

        class SlottedClass:
            __slots__ = ['x', 'y', 'z']

            def __init__(self, x, y, z):
                self.x = x
                self.y = y
                self.z = z

        # Create many instances
        regular_instances = [RegularClass(i, i+1, i+2) for i in range(10000)]
        slotted_instances = [SlottedClass(i, i+1, i+2) for i in range(10000)]

        regular_size = sum(sys.getsizeof(obj) for obj in regular_instances)
        slotted_size = sum(sys.getsizeof(obj) for obj in slotted_instances)

        print(f"Regular instances: {regular_size / 1024:.2f} KB")
        print(f"Slotted instances: {slotted_size / 1024:.2f} KB")
        print(f"Memory savings: {(regular_size - slotted_size) / 1024:.2f} KB")

    @staticmethod
    def use_tuples_instead_of_lists():
        """Use tuples for immutable data."""
        # List (mutable): More memory
        list_data = [(i, i+1, i+2) for i in range(100000)]
        list_size = sys.getsizeof(list_data) + sum(sys.getsizeof(item) for item in list_data)

        # Tuple (immutable): Less memory
        tuple_data = tuple((i, i+1, i+2) for i in range(100000))
        tuple_size = sys.getsizeof(tuple_data) + sum(sys.getsizeof(item) for item in tuple_data)

        print(f"List of tuples: {list_size / 1024:.2f} KB")
        print(f"Tuple of tuples: {tuple_size / 1024:.2f} KB")

@dataclass
class MemoryOptimizedConfig:
    """Memory-optimized configuration class."""
    __slots__ = ['ai_provider', 'model', 'temperature', 'max_tokens', 'cache_enabled']

    def __init__(self, ai_provider: str, model: str, temperature: float = 0.7,
                 max_tokens: int = 2000, cache_enabled: bool = True):
        self.ai_provider = ai_provider
        self.model = model
        self.temperature = temperature
        self.max_tokens = max_tokens
        self.cache_enabled = cache_enabled
```

### Garbage Collection Optimization

```python
import gc
import time
from typing import Dict, List, Any

class GarbageCollectionOptimizer:
    """Optimize garbage collection for better memory performance."""

    def __init__(self):
        self.original_thresholds = gc.get_threshold()

    def optimize_for_application(self):
        """Optimize GC settings for Learning Catalyst."""
        # Learning Catalyst characteristics:
        # - Many short-lived objects (AI responses, temporary data)
        # - Some long-lived objects (user sessions, caches)
        # - Periodic memory spikes (large processing tasks)

        # Set aggressive thresholds for frequent collection
        gc.set_threshold(700, 10, 10)  # Default is (700, 10, 10)

        # Enable debugging for monitoring
        gc.set_debug(gc.DEBUG_STATS)

    def optimize_for_batch_processing(self):
        """Optimize GC for batch processing scenarios."""
        # Less frequent collection during batch operations
        gc.set_threshold(1000, 15, 15)

    def optimize_for_interactive_use(self):
        """Optimize GC for interactive CLI use."""
        # More frequent collection for responsive feel
        gc.set_threshold(500, 5, 5)

    def force_collection(self, generation: int = 2):
        """Force garbage collection of specific generation."""
        collected = gc.collect(generation)
        print(f"Garbage collected generation {generation}: {collected} objects")
        return collected

    def get_gc_stats(self) -> Dict[str, Any]:
        """Get garbage collection statistics."""
        stats = gc.get_stats() if hasattr(gc, 'get_stats') else []
        counts = gc.get_count()

        return {
            'counts': counts,
            'stats': stats,
            'thresholds': gc.get_threshold(),
            'debug_flags': gc.get_debug()
        }

    def monitor_gc_performance(self, duration_seconds: int = 60) -> Dict[str, Any]:
        """Monitor GC performance over time."""
        start_time = time.time()
        gc_collections = []

        def gc_callback(phase, info):
            """Callback to track GC events."""
            gc_collections.append({
                'timestamp': time.time() - start_time,
                'phase': phase,
                'info': info
            })

        # Set up callback
        gc.callbacks.append(gc_callback)

        try:
            # Monitor for specified duration
            time.sleep(duration_seconds)
        finally:
            # Clean up callback
            gc.callbacks.remove(gc_callback)

        # Analyze collections
        if gc_collections:
            total_collections = len(gc_collections)
            avg_interval = duration_seconds / total_collections

            return {
                'duration_seconds': duration_seconds,
                'total_collections': total_collections,
                'avg_interval_seconds': avg_interval,
                'collections_per_minute': (total_collections / duration_seconds) * 60,
                'gc_events': gc_collections
            }
        else:
            return {
                'duration_seconds': duration_seconds,
                'total_collections': 0,
                'message': 'No garbage collections occurred'
            }

    def benchmark_gc_settings(self, test_function, test_iterations: int = 100) -> Dict[str, Any]:
        """Benchmark different GC settings."""
        results = {}

        # Test different threshold configurations
        threshold_configs = [
            (700, 10, 10),   # Default
            (500, 5, 5),     # Aggressive
            (1000, 15, 15),  # Conservative
            (300, 3, 3),     # Very aggressive
        ]

        for config in threshold_configs:
            gc.set_threshold(*config)

            # Warm up
            for _ in range(10):
                test_function()

            # Benchmark
            start_time = time.time()
            start_memory = psutil.Process().memory_info().rss

            for _ in range(test_iterations):
                test_function()

            end_time = time.time()
            end_memory = psutil.Process().memory_info().rss

            results[f"thresholds_{config}"] = {
                'time_seconds': end_time - start_time,
                'memory_delta_mb': (end_memory - start_memory) / 1024 / 1024,
                'gc_collections': gc.get_count()[0]  # Generation 0 collections
            }

        # Restore original thresholds
        gc.set_threshold(*self.original_thresholds)

        return results

# Usage example
optimizer = GarbageCollectionOptimizer()

def memory_intensive_test():
    """Test function that creates many objects."""
    data = []
    for i in range(1000):
        data.append({
            'id': i,
            'data': [j for j in range(100)],
            'metadata': {'created': time.time(), 'type': 'test'}
        })
    return data

# Benchmark GC settings
results = optimizer.benchmark_gc_settings(memory_intensive_test)
print("GC Benchmark Results:")
for config, result in results.items():
    print(f"{config}:")
    print(f"  Time: {result['time_seconds']:.3f}s")
    print(f"  Memory: {result['memory_delta_mb']:.2f}MB")
    print(f"  GC Collections: {result['gc_collections']}")
```

### Memory Pool Management

```python
import weakref
from typing import Dict, List, Any, Optional
from dataclasses import dataclass

@dataclass
class PoolItem:
    """Item in memory pool."""
    obj: Any
    in_use: bool = False
    last_used: float = 0
    ref_count: int = 0

class MemoryPool:
    """Generic memory pool for object reuse."""

    def __init__(self, factory_func, max_size: int = 100, cleanup_func=None):
        self.factory_func = factory_func
        self.max_size = max_size
        self.cleanup_func = cleanup_func
        self.pool: List[PoolItem] = []
        self.stats = {
            'created': 0,
            'reused': 0,
            'cleaned': 0
        }

    def acquire(self) -> Any:
        """Acquire object from pool."""
        # Find available object
        for item in self.pool:
            if not item.in_use:
                item.in_use = True
                item.last_used = time.time()
                item.ref_count += 1
                self.stats['reused'] += 1
                return item.obj

        # Create new object if pool not full
        if len(self.pool) < self.max_size:
            new_obj = self.factory_func()
            pool_item = PoolItem(
                obj=new_obj,
                in_use=True,
                last_used=time.time(),
                ref_count=1
            )
            self.pool.append(pool_item)
            self.stats['created'] += 1
            return new_obj

        # Pool full, create temporary object
        return self.factory_func()

    def release(self, obj: Any):
        """Release object back to pool."""
        for item in self.pool:
            if item.obj is obj:
                item.in_use = False
                item.ref_count = max(0, item.ref_count - 1)

                # Clean up object if cleanup function provided
                if self.cleanup_func:
                    self.cleanup_func(obj)
                break

    def cleanup(self, max_age_seconds: int = 300):
        """Clean up old or unused objects."""
        current_time = time.time()
        items_to_remove = []

        for item in self.pool:
            age = current_time - item.last_used
            if (not item.in_use and age > max_age_seconds) or item.ref_count <= 0:
                items_to_remove.append(item)

        for item in items_to_remove:
            self.pool.remove(item)
            self.stats['cleaned'] += 1

    def get_stats(self) -> Dict[str, Any]:
        """Get pool statistics."""
        in_use = sum(1 for item in self.pool if item.in_use)
        available = len(self.pool) - in_use

        return {
            **self.stats,
            'total_size': len(self.pool),
            'in_use': in_use,
            'available': available,
            'utilization': in_use / len(self.pool) if self.pool else 0
        }

# Example usage for AI response objects
class AIResponsePool(MemoryPool):
    """Memory pool for AI response objects."""

    def __init__(self, max_size: int = 50):
        def create_response():
            return {
                'content': '',
                'model': '',
                'tokens_used': 0,
                'response_time': 0.0,
                'metadata': {}
            }

        def cleanup_response(response):
            response['content'] = ''
            response['metadata'].clear()

        super().__init__(create_response, max_size, cleanup_response)

# Example usage for database connections
class ConnectionPool(MemoryPool):
    """Memory pool for database connections."""

    def __init__(self, connection_string: str, max_size: int = 10):
        def create_connection():
            import sqlite3
            return sqlite3.connect(connection_string, check_same_thread=False)

        def cleanup_connection(conn):
            # Reset connection state
            conn.rollback()

        super().__init__(create_connection, max_size, cleanup_connection)

class PoolManager:
    """Manage multiple memory pools."""

    def __init__(self):
        self.pools: Dict[str, MemoryPool] = {}

    def register_pool(self, name: str, pool: MemoryPool):
        """Register a memory pool."""
        self.pools[name] = pool

    def get_pool(self, name: str) -> Optional[MemoryPool]:
        """Get a registered pool."""
        return self.pools.get(name)

    def cleanup_all_pools(self, max_age_seconds: int = 300):
        """Clean up all registered pools."""
        for pool in self.pools.values():
            pool.cleanup(max_age_seconds)

    def get_all_stats(self) -> Dict[str, Dict[str, Any]]:
        """Get statistics for all pools."""
        return {name: pool.get_stats() for name, pool in self.pools.items()}

# Global pool manager
pool_manager = PoolManager()

# Register default pools
pool_manager.register_pool('ai_responses', AIResponsePool())

# Usage example
def use_pooled_resources():
    """Example of using pooled resources."""
    response_pool = pool_manager.get_pool('ai_responses')

    # Acquire response object
    response = response_pool.acquire()
    response['content'] = "This is a generated response"
    response['model'] = "gpt-4"
    response['tokens_used'] = 150

    # Use the response
    print(f"Generated: {response['content']}")

    # Release back to pool
    response_pool.release(response)

    # Check pool stats
    stats = response_pool.get_stats()
    print(f"Pool stats: {stats}")
```

## Memory Leak Detection

### Automatic Leak Detection

```python
import gc
import threading
import time
from typing import Dict, List, Callable, Any

class MemoryLeakDetector:
    """Automatic memory leak detection system."""

    def __init__(self, check_interval: int = 60, memory_threshold_mb: float = 100):
        self.check_interval = check_interval
        self.memory_threshold_mb = memory_threshold_mb
        self.monitoring = False
        self.baseline_memory = None
        self.leak_callbacks = []

    def start_monitoring(self):
        """Start automatic leak monitoring."""
        if self.monitoring:
            return

        self.monitoring = True
        self.baseline_memory = psutil.Process().memory_info().rss / 1024 / 1024

        monitor_thread = threading.Thread(target=self._monitor_loop, daemon=True)
        monitor_thread.start()

    def stop_monitoring(self):
        """Stop automatic leak monitoring."""
        self.monitoring = False

    def _monitor_loop(self):
        """Main monitoring loop."""
        while self.monitoring:
            try:
                self._check_for_leaks()
                time.sleep(self.check_interval)
            except Exception as e:
                print(f"Error in leak detection: {e}")

    def _check_for_leaks(self):
        """Check for memory leaks."""
        current_memory = psutil.Process().memory_info().rss / 1024 / 1024
        memory_increase = current_memory - self.baseline_memory

        if memory_increase > self.memory_threshold_mb:
            leak_info = {
                'timestamp': time.time(),
                'baseline_memory_mb': self.baseline_memory,
                'current_memory_mb': current_memory,
                'increase_mb': memory_increase,
                'gc_stats': gc.get_stats() if hasattr(gc, 'get_stats') else [],
                'object_count': len(gc.get_objects())
            }

            # Trigger leak callbacks
            for callback in self.leak_callbacks:
                callback(leak_info)

            # Update baseline
            self.baseline_memory = current_memory

    def add_leak_callback(self, callback: Callable[[Dict[str, Any]], None]):
        """Add callback for leak detection."""
        self.leak_callbacks.append(callback)

    def manual_leak_check(self) -> Dict[str, Any]:
        """Perform manual leak check."""
        # Force garbage collection
        collected = gc.collect()

        # Get current memory state
        process = psutil.Process()
        memory_info = process.memory_info()

        # Analyze object types
        all_objects = gc.get_objects()
        type_counts = {}
        for obj in all_objects:
            obj_type = type(obj).__name__
            type_counts[obj_type] = type_counts.get(obj_type, 0) + 1

        # Find suspicious object counts
        suspicious_types = {
            obj_type: count for obj_type, count in type_counts.items()
            if count > 1000 and obj_type not in ['str', 'int', 'float', 'bool', 'tuple']
        }

        return {
            'timestamp': time.time(),
            'memory_rss_mb': memory_info.rss / 1024 / 1024,
            'memory_vms_mb': memory_info.vms / 1024 / 1024,
            'objects_collected': collected,
            'total_objects': len(all_objects),
            'type_counts': dict(sorted(type_counts.items(),
                                     key=lambda x: x[1], reverse=True)[:10]),
            'suspicious_types': suspicious_types
        }

# Default leak callback
def default_leak_callback(leak_info: Dict[str, Any]):
    """Default callback for leak detection."""
    print(f"🚨 Memory Leak Detected!")
    print(f"  Memory Increase: {leak_info['increase_mb']:.2f} MB")
    print(f"  Current Memory: {leak_info['current_memory_mb']:.2f} MB")
    print(f"  Object Count: {leak_info['object_count']:,}")

    # Suggest actions
    print("  Suggested actions:")
    print("    1. Check for circular references")
    print("    2. Review object lifecycle management")
    print("    3. Consider using weak references")
    print("    4. Run memory profiler for detailed analysis")

# Initialize and start leak detector
leak_detector = MemoryLeakDetector()
leak_detector.add_leak_callback(default_leak_callback)
leak_detector.start_monitoring()
```

### Circular Reference Detection

```python
import gc
import weakref
from typing import Set, Dict, List, Any

class CircularReferenceDetector:
    """Detect circular references that prevent garbage collection."""

    def __init__(self):
        self.tracked_objects = {}

    def track_object(self, obj: Any, label: str = ""):
        """Track object for circular reference detection."""
        obj_id = id(obj)
        self.tracked_objects[obj_id] = {
            'object': obj,
            'label': label,
            'weak_ref': weakref.ref(obj)
        }

    def find_circular_references(self) -> List[Dict[str, Any]]:
        """Find circular references among tracked objects."""
        circular_refs = []

        for obj_id, info in self.tracked_objects.items():
            obj = info['weak_ref']()
            if obj is not None:
                refs = self._find_references_to(obj)
                if refs:
                    # Check if any reference leads back to original object
                    for ref_info in refs:
                        if self._references_back_to(obj, ref_info['object']):
                            circular_refs.append({
                                'object_id': obj_id,
                                'object_label': info['label'],
                                'object_type': type(obj).__name__,
                                'reference_chain': self._get_reference_chain(obj, ref_info['object'])
                            })
                            break

        return circular_refs

    def _find_references_to(self, obj: Any) -> List[Dict[str, Any]]:
        """Find objects that reference the given object."""
        references = []
        obj_id = id(obj)

        # Search through all objects
        all_objects = gc.get_objects()
        for ref_obj in all_objects:
            try:
                # Check if object has references to our target
                if hasattr(ref_obj, '__dict__'):
                    for attr_name, attr_value in ref_obj.__dict__.items():
                        if id(attr_value) == obj_id:
                            references.append({
                                'object': ref_obj,
                                'attribute': attr_name,
                                'type': type(ref_obj).__name__
                            })
                elif isinstance(ref_obj, (list, tuple, set)):
                    for i, item in enumerate(ref_obj):
                        if id(item) == obj_id:
                            references.append({
                                'object': ref_obj,
                                'index': i,
                                'type': type(ref_obj).__name__
                            })
                elif isinstance(ref_obj, dict):
                    for key, value in ref_obj.items():
                        if id(value) == obj_id:
                            references.append({
                                'object': ref_obj,
                                'key': key,
                                'type': type(ref_obj).__name__
                            })
            except (TypeError, AttributeError):
                continue

        return references

    def _references_back_to(self, target: Any, source: Any, visited: Set[int] = None) -> bool:
        """Check if source object references back to target."""
        if visited is None:
            visited = set()

        source_id = id(source)
        if source_id in visited:
            return False

        visited.add(source_id)

        # Check if source directly references target
        if id(target) in self._get_referenced_ids(source):
            return True

        # Recursively check references
        for ref_id in self._get_referenced_ids(source):
            ref_obj = self._get_object_by_id(ref_id)
            if ref_obj and self._references_back_to(target, ref_obj, visited.copy()):
                return True

        return False

    def _get_referenced_ids(self, obj: Any) -> Set[int]:
        """Get IDs of objects referenced by the given object."""
        referenced_ids = set()

        try:
            if hasattr(obj, '__dict__'):
                for attr_value in obj.__dict__.values():
                    referenced_ids.add(id(attr_value))
            elif isinstance(obj, (list, tuple, set)):
                for item in obj:
                    referenced_ids.add(id(item))
            elif isinstance(obj, dict):
                for value in obj.values():
                    referenced_ids.add(id(value))
        except (TypeError, AttributeError):
            pass

        return referenced_ids

    def _get_object_by_id(self, obj_id: int) -> Any:
        """Get object by ID (limited functionality)."""
        # This is a simplified implementation
        # In practice, you'd need a more sophisticated approach
        for tracked_info in self.tracked_objects.values():
            if id(tracked_info['weak_ref']()) == obj_id:
                return tracked_info['weak_ref']()
        return None

    def _get_reference_chain(self, start_obj: Any, end_obj: Any) -> List[str]:
        """Get reference chain from start to end object."""
        # Simplified implementation
        return [f"{type(start_obj).__name__} -> {type(end_obj).__name__}"]

    def generate_report(self) -> str:
        """Generate circular reference report."""
        circular_refs = self.find_circular_references()

        if not circular_refs:
            return "✅ No circular references detected among tracked objects"

        report = ["🔗 Circular References Detected:", "=" * 50]

        for ref in circular_refs:
            report.append(f"Object: {ref['object_label']} ({ref['object_type']})")
            report.append(f"  Reference Chain: {' -> '.join(ref['reference_chain'])}")
            report.append("")

        return "\n".join(report)

# Usage example
detector = CircularReferenceDetector()

def demonstrate_circular_reference():
    """Demonstrate circular reference detection."""
    class Node:
        def __init__(self, name):
            self.name = name
            self.parent = None
            self.children = []

        def add_child(self, child):
            child.parent = self
            self.children.append(child)

    # Create objects with circular references
    parent = Node("parent")
    child = Node("child")
    parent.add_child(child)

    # Track objects
    detector.track_object(parent, "parent_node")
    detector.track_object(child, "child_node")

    # Generate report
    report = detector.generate_report()
    print(report)
```

## Performance Monitoring and Alerting

### Memory Monitoring Dashboard

```python
import time
import json
from datetime import datetime, timedelta
from typing import Dict, List, Any

class MemoryMonitor:
    """Real-time memory monitoring system."""

    def __init__(self, history_size: int = 1000):
        self.history_size = history_size
        self.memory_history = []
        self.alerts = []
        self.thresholds = {
            'warning_mb': 500,
            'critical_mb': 1000,
            'growth_rate_mb_per_min': 50
        }

    def record_memory_usage(self):
        """Record current memory usage."""
        process = psutil.Process()
        memory_info = process.memory_info()

        snapshot = {
            'timestamp': datetime.now(),
            'rss_mb': memory_info.rss / 1024 / 1024,
            'vms_mb': memory_info.vms / 1024 / 1024,
            'percent': process.memory_percent(),
            'available_mb': psutil.virtual_memory().available / 1024 / 1024
        }

        self.memory_history.append(snapshot)

        # Maintain history size
        if len(self.memory_history) > self.history_size:
            self.memory_history.pop(0)

        # Check for alerts
        self._check_alerts(snapshot)

        return snapshot

    def _check_alerts(self, snapshot: Dict[str, Any]):
        """Check if memory usage triggers alerts."""
        alerts = []

        # Check absolute thresholds
        if snapshot['rss_mb'] > self.thresholds['critical_mb']:
            alerts.append({
                'level': 'critical',
                'message': f"Memory usage critical: {snapshot['rss_mb']:.2f} MB",
                'timestamp': snapshot['timestamp']
            })
        elif snapshot['rss_mb'] > self.thresholds['warning_mb']:
            alerts.append({
                'level': 'warning',
                'message': f"Memory usage high: {snapshot['rss_mb']:.2f} MB",
                'timestamp': snapshot['timestamp']
            })

        # Check growth rate
        if len(self.memory_history) >= 2:
            prev_snapshot = self.memory_history[-2]
            time_diff = (snapshot['timestamp'] - prev_snapshot['timestamp']).total_seconds()
            if time_diff > 0:
                growth_rate = ((snapshot['rss_mb'] - prev_snapshot['rss_mb']) / time_diff) * 60
                if growth_rate > self.thresholds['growth_rate_mb_per_min']:
                    alerts.append({
                        'level': 'warning',
                        'message': f"High memory growth rate: {growth_rate:.2f} MB/min",
                        'timestamp': snapshot['timestamp']
                    })

        # Store alerts
        self.alerts.extend(alerts)

        # Maintain alert history
        if len(self.alerts) > 100:
            self.alerts = self.alerts[-100:]

        # Print alerts
        for alert in alerts:
            level_symbol = "🔴" if alert['level'] == 'critical' else "🟡"
            print(f"{level_symbol} {alert['message']}")

    def get_memory_trend(self, minutes: int = 30) -> Dict[str, Any]:
        """Get memory usage trend."""
        cutoff_time = datetime.now() - timedelta(minutes=minutes)
        recent_data = [
            snapshot for snapshot in self.memory_history
            if snapshot['timestamp'] >= cutoff_time
        ]

        if not recent_data:
            return {"error": "No data available for specified time range"}

        # Calculate trend
        start_memory = recent_data[0]['rss_mb']
        end_memory = recent_data[-1]['rss_mb']
        memory_change = end_memory - start_memory

        avg_memory = sum(snapshot['rss_mb'] for snapshot in recent_data) / len(recent_data)
        max_memory = max(snapshot['rss_mb'] for snapshot in recent_data)
        min_memory = min(snapshot['rss_mb'] for snapshot in recent_data)

        return {
            'time_range_minutes': minutes,
            'data_points': len(recent_data),
            'start_memory_mb': start_memory,
            'end_memory_mb': end_memory,
            'memory_change_mb': memory_change,
            'growth_rate_mb_per_minute': memory_change / minutes,
            'average_memory_mb': avg_memory,
            'max_memory_mb': max_memory,
            'min_memory_mb': min_memory
        }

    def generate_report(self) -> str:
        """Generate comprehensive memory report."""
        if not self.memory_history:
            return "No memory data available"

        latest = self.memory_history[-1]
        trend_30min = self.get_memory_trend(30)
        trend_5min = self.get_memory_trend(5)

        report = [
            "Memory Usage Report",
            "=" * 50,
            f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            "",
            "Current Status:",
            f"  RSS Memory: {latest['rss_mb']:.2f} MB",
            f"  VMS Memory: {latest['vms_mb']:.2f} MB",
            f"  Memory Percent: {latest['percent']:.1f}%",
            f"  Available Memory: {latest['available_mb']:.2f} MB",
            "",
            "Recent Trends:",
            f"  Last 5 minutes: {trend_5min['memory_change_mb']:+.2f} MB",
            f"  Last 30 minutes: {trend_30min['memory_change_mb']:+.2f} MB",
            f"  Growth rate (30min): {trend_30min['growth_rate_mb_per_minute']:+.2f} MB/min",
            "",
            "Statistics (30 min):",
            f"  Average: {trend_30min['average_memory_mb']:.2f} MB",
            f"  Maximum: {trend_30min['max_memory_mb']:.2f} MB",
            f"  Minimum: {trend_30min['min_memory_mb']:.2f} MB"
        ]

        # Add alerts if any
        recent_alerts = [
            alert for alert in self.alerts
            if (datetime.now() - alert['timestamp']).total_seconds() < 300
        ]

        if recent_alerts:
            report.append("")
            report.append("Recent Alerts:")
            for alert in recent_alerts[-5:]:  # Show last 5 alerts
                level_symbol = "🔴" if alert['level'] == 'critical' else "🟡"
                report.append(f"  {level_symbol} {alert['timestamp'].strftime('%H:%M:%S')} - {alert['message']}")

        return "\n".join(report)

    def export_data(self, filename: str, format: str = 'json'):
        """Export memory monitoring data."""
        if format.lower() == 'json':
            data = {
                'history': [
                    {
                        'timestamp': snapshot['timestamp'].isoformat(),
                        'rss_mb': snapshot['rss_mb'],
                        'vms_mb': snapshot['vms_mb'],
                        'percent': snapshot['percent']
                    }
                    for snapshot in self.memory_history
                ],
                'alerts': [
                    {
                        'timestamp': alert['timestamp'].isoformat(),
                        'level': alert['level'],
                        'message': alert['message']
                    }
                    for alert in self.alerts
                ]
            }

            with open(filename, 'w') as f:
                json.dump(data, f, indent=2)

        print(f"Memory monitoring data exported to {filename}")

# Global memory monitor
memory_monitor = MemoryMonitor()

def start_memory_monitoring(interval_seconds: int = 30):
    """Start continuous memory monitoring."""
    import threading

    def monitor_loop():
        while True:
            try:
                memory_monitor.record_memory_usage()
                time.sleep(interval_seconds)
            except KeyboardInterrupt:
                print("Memory monitoring stopped")
                break

    monitor_thread = threading.Thread(target=monitor_loop, daemon=True)
    monitor_thread.start()
    return monitor_thread

# Usage example
if __name__ == "__main__":
    # Start monitoring
    monitor_thread = start_memory_monitoring(30)

    # Simulate some activity
    try:
        for i in range(10):
            print(f"Monitoring... ({i+1}/10)")
            time.sleep(10)
    except KeyboardInterrupt:
        pass

    # Generate final report
    print("\n" + memory_monitor.generate_report())
```

## Troubleshooting Memory Issues

### Common Memory Problems and Solutions

#### Issue: High Memory Usage
```bash
# Symptom: Application using too much memory
Learning Catalyst > /status
Memory: 1.2GB used (512MB available)

# Solution: Use memory profiling
Learning Catalyst > /memory profile
📊 Memory Profile:
  Total Objects: 45,678
  Large Objects: 12 (>10MB each)
  Memory Growth: +50MB in last hour

# Check specific object types
Learning Catalyst > /memory analyze --type dict
📋 Dictionary Objects: 12,345
  Total Memory: 234.5MB
  Average Size: 19KB
  Largest: dict (2.3MB)

# Clean up memory
Learning Catalyst > /memory cleanup
✓ Garbage collection completed
✓ Cache cleared: 45MB freed
✓ Memory optimized: 123MB total freed
```

#### Issue: Memory Leaks
```bash
# Symptom: Memory continuously increasing
Learning Catalyst > /memory trend
📈 Memory Trend (Last Hour):
  Start: 245MB
  Current: 567MB
  Growth: +322MB (+131%)
  Rate: +5.37MB/min

# Detect potential leaks
Learning Catalyst > /memory detect-leaks
🔍 Memory Leak Detection:
  Potential leaks found:
    1. Object count increasing: +5,234 objects
    2. Large objects accumulating: 8 objects >50MB
    3. Circular references detected: 3 chains

# Fix leaks
Learning Catalyst > /memory fix-leaks
✓ Circular references broken
✓ Object pools cleaned
✓ Memory reclaimed: 89MB
```

#### Issue: Frequent Garbage Collection
```bash
# Symptom: Application pausing frequently
Learning Catalyst > /memory gc-stats
🗑️ Garbage Collection Stats:
  Generation 0: 1,234 collections
  Generation 1: 234 collections
  Generation 2: 12 collections
  Total Time: 2.34s

# Optimize GC settings
Learning Catalyst > /memory gc-optimize
✓ GC thresholds optimized for current workload
✓ Collection frequency reduced by 45%
✓ Pause times reduced by 23%
```

### Memory Optimization Commands

```python
# Memory management commands implementation
class MemoryManagerCLI:
    """CLI commands for memory management."""

    @staticmethod
    def profile_memory():
        """Profile current memory usage."""
        profile = MemoryProfiler().take_snapshot("cli_profile")
        return profile

    @staticmethod
    def analyze_memory():
        """Analyze memory usage patterns."""
        analyzer = ReferenceAnalyzer()
        return analyzer.analyze_gc_roots()

    @staticmethod
    def cleanup_memory():
        """Perform memory cleanup."""
        # Force garbage collection
        collected = gc.collect()

        # Clear caches
        cache_manager = get_cache_manager()
        cache_freed = cache_manager.clear()

        # Clean up object pools
        pool_manager.cleanup_all_pools()

        return {
            'objects_collected': collected,
            'cache_freed_mb': cache_freed,
            'pools_cleaned': len(pool_manager.pools)
        }

    @staticmethod
    def detect_leaks():
        """Detect memory leaks."""
        leak_detector = MemoryLeakDetector()
        return leak_detector.manual_leak_check()

    @staticmethod
    def optimize_gc():
        """Optimize garbage collection settings."""
        optimizer = GarbageCollectionOptimizer()
        optimizer.optimize_for_application()
        return optimizer.get_gc_stats()
```

## Related Documentation

- **[API Optimization](api-optimization.md)**: API performance optimization
- **[Caching Strategies](caching-strategies.md)**: Memory-efficient caching
- **[Performance Monitoring](performance-monitoring.md)**: Performance tracking
- **[Implementation Guides](../implementation-guides/)**: Development best practices

---

*Last updated: October 8, 2025*
*Version: 1.0.0*
*Category: Performance Optimization*