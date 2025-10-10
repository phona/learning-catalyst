---
title: Caching Strategies
description: Advanced caching patterns and implementations for optimal performance
version: 1.0.0
last_updated: 2025-10-08
---

# Caching Strategies

## Overview

This guide covers advanced caching strategies and implementations for optimizing Learning Catalyst performance. Caching is critical for reducing API costs, improving response times, and enhancing user experience.

## Cache Types and Use Cases

### 1. In-Memory Cache

**Use Case**: Frequently accessed data with low memory requirements
**TTL**: 5-30 minutes
**Implementation**: Thread-safe LRU cache

```python
import time
import threading
from typing import Any, Optional, Dict
from dataclasses import dataclass
from collections import OrderedDict

@dataclass
class CacheEntry:
    """Single cache entry with TTL support."""
    value: Any
    timestamp: float
    ttl: float

    @property
    def is_expired(self) -> bool:
        return time.time() > (self.timestamp + self.ttl)

class MemoryCache:
    """Thread-safe in-memory LRU cache with TTL support."""

    def __init__(self, max_size: int = 1000, default_ttl: float = 1800):
        self.max_size = max_size
        self.default_ttl = default_ttl
        self._cache: OrderedDict[str, CacheEntry] = OrderedDict()
        self._lock = threading.RLock()
        self._stats = {
            'hits': 0,
            'misses': 0,
            'evictions': 0,
            'expirations': 0
        }

    def get(self, key: str) -> Optional[Any]:
        """Get value from cache, returning None if expired or not found."""
        with self._lock:
            if key not in self._cache:
                self._stats['misses'] += 1
                return None

            entry = self._cache[key]

            # Check expiration
            if entry.is_expired:
                del self._cache[key]
                self._stats['expirations'] += 1
                self._stats['misses'] += 1
                return None

            # Move to end (LRU)
            self._cache.move_to_end(key)
            self._stats['hits'] += 1
            return entry.value

    def set(self, key: str, value: Any, ttl: Optional[float] = None) -> None:
        """Set value in cache with optional TTL."""
        with self._lock:
            # Remove existing entry
            if key in self._cache:
                del self._cache[key]

            # Evict if necessary
            while len(self._cache) >= self.max_size:
                oldest_key = next(iter(self._cache))
                del self._cache[oldest_key]
                self._stats['evictions'] += 1

            # Add new entry
            entry = CacheEntry(
                value=value,
                timestamp=time.time(),
                ttl=ttl or self.default_ttl
            )
            self._cache[key] = entry

    def clear(self) -> None:
        """Clear all cache entries."""
        with self._lock:
            self._cache.clear()

    def cleanup_expired(self) -> int:
        """Remove expired entries and return count removed."""
        with self._lock:
            expired_keys = [
                key for key, entry in self._cache.items()
                if entry.is_expired
            ]

            for key in expired_keys:
                del self._cache[key]

            self._stats['expirations'] += len(expired_keys)
            return len(expired_keys)

    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        with self._lock:
            total_requests = self._stats['hits'] + self._stats['misses']
            hit_rate = self._stats['hits'] / total_requests if total_requests > 0 else 0

            return {
                **self._stats,
                'total_requests': total_requests,
                'hit_rate': hit_rate,
                'current_size': len(self._cache),
                'max_size': self.max_size
            }
```

### 2. Response Cache

**Use Case**: AI model responses for identical or similar queries
**TTL**: 24 hours - 7 days
**Implementation**: Semantic similarity + exact matching

```python
import hashlib
import json
import numpy as np
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

@dataclass
class CachedResponse:
    """Cached AI response with metadata."""
    query_hash: str
    query_text: str
    response: str
    timestamp: float
    ttl: float
    usage_count: int = 0
    last_used: Optional[float] = None
    similarity_threshold: float = 0.8

    def increment_usage(self) -> None:
        """Increment usage counter and update last used timestamp."""
        self.usage_count += 1
        self.last_used = time.time()

class ResponseCache:
    """Intelligent response cache with semantic similarity matching."""

    def __init__(self, max_size: int = 5000, default_ttl: float = 86400):
        self.max_size = max_size
        self.default_ttl = default_ttl
        self._cache: Dict[str, CachedResponse] = {}
        self._vectorizer = TfidfVectorizer(stop_words='english')
        self._vectors = {}  # Cache query vectors for similarity
        self._lock = threading.RLock()

    def _query_hash(self, query: str) -> str:
        """Generate hash for exact query matching."""
        return hashlib.sha256(query.encode()).hexdigest()

    def _get_similarity_vector(self, query: str) -> np.ndarray:
        """Get or create vectorized representation of query."""
        if query not in self._vectors:
            # Build vocabulary from all queries if needed
            if len(self._vectors) == 0:
                all_queries = list(self._cache.keys())
                self._vectorizer.fit(all_queries)

            try:
                vector = self._vectorizer.transform([query]).toarray()[0]
            except ValueError:
                # Handle case where query has no valid tokens
                vector = np.zeros(len(self._vectorizer.vocabulary_))

            self._vectors[query] = vector

        return self._vectors[query]

    def get_similar_response(self, query: str, threshold: float = 0.8) -> Optional[CachedResponse]:
        """Find semantically similar cached response."""
        if not self._cache:
            return None

        query_vector = self._get_similarity_vector(query)

        with self._lock:
            best_match = None
            best_similarity = 0.0

            for cached_response in self._cache.values():
                if cached_response.is_expired:
                    continue

                # Get vector for cached query
                cached_vector = self._get_similarity_vector(cached_response.query_text)

                # Calculate similarity
                similarity = cosine_similarity(
                    query_vector.reshape(1, -1),
                    cached_vector.reshape(1, -1)
                )[0][0]

                if similarity > threshold and similarity > best_similarity:
                    best_match = cached_response
                    best_similarity = similarity

            if best_match:
                best_match.increment_usage()
                return best_match

            return None

    def get(self, query: str, check_similarity: bool = True) -> Optional[str]:
        """Get cached response for query."""
        query_hash = self._query_hash(query)

        with self._lock:
            # Check exact match
            if query_hash in self._cache:
                cached_response = self._cache[query_hash]
                if not cached_response.is_expired:
                    cached_response.increment_usage()
                    return cached_response
                else:
                    del self._cache[query_hash]
                    if query_hash in self._vectors:
                        del self._vectors[query_hash]

            # Check semantic similarity if enabled
            if check_similarity:
                similar_response = self.get_similar_response(query)
                if similar_response:
                    return similar_response.response

            return None

    def set(self, query: str, response: str, ttl: Optional[float] = None) -> None:
        """Cache response for query."""
        query_hash = self._query_hash(query)

        with self._lock:
            # Evict if necessary
            while len(self._cache) >= self.max_size:
                # Remove least recently used expired entries first
                expired_keys = [
                    key for key, entry in self._cache.items()
                    if entry.is_expired
                ]

                if expired_keys:
                    oldest_key = expired_keys[0]
                else:
                    # Remove least recently used
                    oldest_key = min(
                        self._cache.keys(),
                        key=lambda k: self._cache[k].last_used or 0
                    )

                del self._cache[oldest_key]
                if oldest_key in self._vectors:
                    del self._vectors[oldest_key]

            # Add new entry
            cached_response = CachedResponse(
                query_hash=query_hash,
                query_text=query,
                response=response,
                timestamp=time.time(),
                ttl=ttl or self.default_ttl
            )

            self._cache[query_hash] = cached_response
            self._get_similarity_vector(query)  # Pre-compute vector
```

### 3. Vector Database Cache

**Use Case**: Long-term storage of concept embeddings and knowledge graphs
**TTL**: 30 days - permanent
**Implementation**: ChromaDB + similarity search

```python
import chromadb
from chromadb.config import Settings
from typing import List, Dict, Any, Optional, Tuple
import numpy as np

class VectorCache:
    """Persistent vector database cache for embeddings and similarity search."""

    def __init__(self, db_path: str = "./vector_cache"):
        self.client = chromadb.PersistentClient(path=db_path)
        self.collections = {}
        self._setup_collections()

    def _setup_collections(self) -> None:
        """Initialize collections for different data types."""
        try:
            # Concepts collection
            self.collections['concepts'] = self.client.get_or_create_collection(
                name="concepts",
                metadata={"description": "Cached concept embeddings"}
            )

            # Explanations collection
            self.collections['explanations'] = self.client.get_or_create_collection(
                name="explanations",
                metadata={"description": "Cached explanation embeddings"}
            )

            # Queries collection
            self.collections['queries'] = self.client.get_or_create_collection(
                name="queries",
                metadata={"description": "Cached query embeddings"}
            )

        except Exception as e:
            logger.error(f"Failed to setup vector cache collections: {e}")
            raise

    def add_concept(self, concept_id: str, embedding: List[float], metadata: Dict[str, Any]) -> None:
        """Add concept embedding to cache."""
        try:
            self.collections['concepts'].add(
                ids=[concept_id],
                embeddings=[embedding],
                metadatas=[metadata]
            )
        except Exception as e:
            logger.error(f"Failed to add concept to vector cache: {e}")

    def get_similar_concepts(self, query_embedding: List[float],
                           n_results: int = 5) -> List[Dict[str, Any]]:
        """Find similar concepts using vector similarity."""
        try:
            results = self.collections['concepts'].query(
                query_embeddings=[query_embedding],
                n_results=n_results
            )

            return [
                {
                    'id': results['ids'][0][i],
                    'metadata': results['metadatas'][0][i],
                    'distance': results['distances'][0][i]
                }
                for i in range(len(results['ids'][0]))
            ]
        except Exception as e:
            logger.error(f"Failed to query similar concepts: {e}")
            return []

    def cleanup_expired(self, days_threshold: int = 30) -> int:
        """Remove entries older than threshold days."""
        try:
            # This would require custom metadata with timestamps
            # Implementation depends on specific use case
            pass
        except Exception as e:
            logger.error(f"Failed to cleanup expired vector entries: {e}")
            return 0
```

## Cache Management System

### 1. Multi-Level Cache Manager

```python
from enum import Enum
from typing import Dict, Any, Optional, List
import threading
import time

class CacheLevel(Enum):
    """Cache hierarchy levels."""
    MEMORY = "memory"
    RESPONSE = "response"
    VECTOR = "vector"

class CacheManager:
    """Unified cache management system."""

    def __init__(self):
        self.caches = {
            CacheLevel.MEMORY: MemoryCache(max_size=1000),
            CacheLevel.RESPONSE: ResponseCache(max_size=5000),
            CacheLevel.VECTOR: VectorCache()
        }
        self._lock = threading.RLock()
        self._stats = {
            'total_requests': 0,
            'cache_hits': {level: 0 for level in CacheLevel},
            'cache_misses': {level: 0 for level in CacheLevel},
            'level_usage': {level: 0 for level in CacheLevel}
        }

    def get(self, key: str, cache_levels: Optional[List[CacheLevel]] = None) -> Optional[Any]:
        """Get value from cache hierarchy."""
        if cache_levels is None:
            cache_levels = [CacheLevel.MEMORY, CacheLevel.RESPONSE]

        with self._lock:
            self._stats['total_requests'] += 1

            for level in cache_levels:
                try:
                    value = self.caches[level].get(key)
                    if value is not None:
                        self._stats['cache_hits'][level] += 1
                        self._stats['level_usage'][level] += 1

                        # Promote to higher-level caches
                        self._promote_to_higher_levels(key, value, level)
                        return value
                    else:
                        self._stats['cache_misses'][level] += 1
                except Exception as e:
                    logger.error(f"Cache error at level {level}: {e}")
                    self._stats['cache_misses'][level] += 1

            return None

    def set(self, key: str, value: Any,
            cache_levels: Optional[List[CacheLevel]] = None,
            ttl: Optional[float] = None) -> None:
        """Set value in specified cache levels."""
        if cache_levels is None:
            cache_levels = [CacheLevel.MEMORY, CacheLevel.RESPONSE]

        with self._lock:
            for level in cache_levels:
                try:
                    self.caches[level].set(key, value, ttl)
                except Exception as e:
                    logger.error(f"Failed to set in cache {level}: {e}")

    def _promote_to_higher_levels(self, key: str, value: Any, source_level: CacheLevel) -> None:
        """Promote cached value to higher-level caches."""
        level_hierarchy = [CacheLevel.MEMORY, CacheLevel.RESPONSE, CacheLevel.VECTOR]
        source_index = level_hierarchy.index(source_level)

        # Promote to higher priority levels (lower index)
        for i in range(source_index):
            target_level = level_hierarchy[i]
            try:
                self.caches[target_level].set(key, value, ttl=3600)  # 1 hour TTL
            except Exception as e:
                logger.error(f"Failed to promote to {target_level}: {e}")

    def get_stats(self) -> Dict[str, Any]:
        """Get comprehensive cache statistics."""
        with self._lock:
            total_hits = sum(self._stats['cache_hits'].values())
            total_misses = sum(self._stats['cache_misses'].values())
            total_requests = total_hits + total_misses

            overall_hit_rate = total_hits / total_requests if total_requests > 0 else 0

            return {
                'total_requests': total_requests,
                'overall_hit_rate': overall_hit_rate,
                'cache_hits': self._stats['cache_hits'],
                'cache_misses': self._stats['cache_misses'],
                'level_usage': self._stats['level_usage'],
                'cache_specific_stats': {
                    level.value: cache.get_stats()
                    for level, cache in self.caches.items()
                    if hasattr(cache, 'get_stats')
                }
            }

    def cleanup_all(self) -> Dict[str, int]:
        """Clean up all caches and return counts of removed items."""
        results = {}

        for level, cache in self.caches.items():
            try:
                if hasattr(cache, 'cleanup_expired'):
                    count = cache.cleanup_expired()
                    results[level.value] = count
                elif hasattr(cache, 'clear'):
                    cache.clear()
                    results[level.value] = 0
            except Exception as e:
                logger.error(f"Failed to cleanup cache {level}: {e}")
                results[level.value] = 0

        return results

    def warm_up(self, warmup_data: Dict[str, Any]) -> None:
        """Warm up caches with initial data."""
        logger.info("Starting cache warm-up...")

        for key, data in warmup_data.items():
            try:
                self.set(key, data, ttl=86400)  # 24 hours
            except Exception as e:
                logger.error(f"Failed to warm up cache for key {key}: {e}")

        logger.info(f"Cache warm-up completed. Loaded {len(warmup_data)} entries.")
```

### 2. Cache Configuration

```python
from dataclasses import dataclass
from typing import Dict, Any, Optional
import json
import os

@dataclass
class CacheConfig:
    """Cache configuration settings."""
    # Memory cache settings
    memory_max_size: int = 1000
    memory_ttl: float = 1800  # 30 minutes

    # Response cache settings
    response_max_size: int = 5000
    response_ttl: float = 86400  # 24 hours
    similarity_threshold: float = 0.8

    # Vector cache settings
    vector_db_path: str = "./vector_cache"
    vector_collection_ttl: int = 2592000  # 30 days

    # Cleanup settings
    cleanup_interval: float = 3600  # 1 hour
    cleanup_threshold_days: int = 30

    # Warm-up settings
    enable_warmup: bool = True
    warmup_batch_size: int = 100

    @classmethod
    def from_file(cls, config_path: str) -> 'CacheConfig':
        """Load configuration from JSON file."""
        if os.path.exists(config_path):
            with open(config_path, 'r') as f:
                data = json.load(f)
            return cls(**data)
        return cls()

    def to_file(self, config_path: str) -> None:
        """Save configuration to JSON file."""
        os.makedirs(os.path.dirname(config_path), exist_ok=True)
        with open(config_path, 'w') as f:
            json.dump(self.__dict__, f, indent=2)

    def update(self, **kwargs) -> 'CacheConfig':
        """Update configuration with new values."""
        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)
        return self
```

## Performance Optimization

### 1. Cache Preloading

```python
import asyncio
from typing import List, Dict, Any

class CachePreloader:
    """Cache preloading system for improved performance."""

    def __init__(self, cache_manager: CacheManager):
        self.cache_manager = cache_manager
        self.preload_tasks = []

    async def preload_common_queries(self, common_queries: List[str]) -> None:
        """Preload cache with common queries."""
        logger.info(f"Preloading {len(common_queries)} common queries...")

        # Group queries by type for batch processing
        concept_queries = [q for q in common_queries if q.startswith(('what is', 'explain', 'define'))]
        learning_queries = [q for q in common_queries if q.startswith(('how to', 'learn', 'teach me'))]

        # Process in parallel batches
        tasks = [
            self._preload_query_batch(concept_queries),
            self._preload_query_batch(learning_queries)
        ]

        results = await asyncio.gather(*tasks, return_exceptions=True)

        logger.info(f"Preloading completed. Results: {results}")

    async def _preload_query_batch(self, queries: List[str]) -> int:
        """Preload a batch of queries."""
        loaded_count = 0

        for query in queries:
            try:
                # Check if already cached
                if self.cache_manager.get(query) is None:
                    # Generate and cache response (implementation-specific)
                    response = await self._generate_response(query)
                    self.cache_manager.set(query, response)
                    loaded_count += 1
            except Exception as e:
                logger.error(f"Failed to preload query '{query}': {e}")

        return loaded_count

    async def _generate_response(self, query: str) -> str:
        """Generate response for preloading (implementation-specific)."""
        # This would integrate with the actual AI response generation
        # For now, return a placeholder
        return f"Preloaded response for: {query}"

    def schedule_preload(self, cron_expression: str, queries: List[str]) -> None:
        """Schedule periodic cache preloading."""
        # Integration with scheduler like APScheduler
        pass
```

### 2. Adaptive Caching

```python
from typing import Dict, List, Tuple
import statistics
import time

class AdaptiveCacheManager:
    """Cache manager with adaptive TTL and sizing."""

    def __init__(self, base_cache_manager: CacheManager):
        self.cache_manager = base_cache_manager
        self.usage_patterns = {}
        self.performance_metrics = {}

    def record_access(self, key: str, response_time: float, cache_hit: bool) -> None:
        """Record access pattern for adaptive optimization."""
        if key not in self.usage_patterns:
            self.usage_patterns[key] = {
                'access_times': [],
                'response_times': [],
                'hit_count': 0,
                'miss_count': 0,
                'last_access': time.time()
            }

        pattern = self.usage_patterns[key]
        pattern['access_times'].append(time.time())
        pattern['response_times'].append(response_time)
        pattern['last_access'] = time.time()

        if cache_hit:
            pattern['hit_count'] += 1
        else:
            pattern['miss_count'] += 1

        # Keep only recent data (last 100 accesses)
        if len(pattern['access_times']) > 100:
            pattern['access_times'] = pattern['access_times'][-100:]
            pattern['response_times'] = pattern['response_times'][-100:]

    def calculate_optimal_ttl(self, key: str) -> float:
        """Calculate optimal TTL based on usage patterns."""
        if key not in self.usage_patterns:
            return 3600  # Default 1 hour

        pattern = self.usage_patterns[key]

        # Calculate access frequency
        access_times = pattern['access_times']
        if len(access_times) < 2:
            return 3600

        # Calculate average time between accesses
        intervals = [
            access_times[i] - access_times[i-1]
            for i in range(1, len(access_times))
        ]
        avg_interval = statistics.mean(intervals)

        # TTL should be proportional to access frequency
        # More frequently accessed items get longer TTL
        hit_rate = pattern['hit_count'] / (pattern['hit_count'] + pattern['miss_count'])

        # Adjust TTL based on hit rate and access frequency
        optimal_ttl = min(avg_interval * 2 * hit_rate, 86400)  # Max 24 hours
        optimal_ttl = max(optimal_ttl, 300)  # Min 5 minutes

        return optimal_ttl

    def optimize_cache_sizes(self) -> None:
        """Optimize cache sizes based on usage patterns."""
        # Analyze usage patterns to determine optimal cache sizes
        frequent_keys = [
            key for key, pattern in self.usage_patterns.items()
            if len(pattern['access_times']) > 10  # Frequently accessed
        ]

        # Increase memory cache for frequently accessed items
        if len(frequent_keys) > self.cache_manager.caches[CacheLevel.MEMORY].max_size:
            new_size = min(len(frequent_keys) * 2, 2000)
            logger.info(f"Optimizing memory cache size to {new_size}")
            # Implementation would resize the cache

        # Cleanup unused entries
        self._cleanup_unused_entries()

    def _cleanup_unused_entries(self) -> None:
        """Remove entries that haven't been accessed recently."""
        current_time = time.time()
        unused_threshold = 86400 * 7  # 7 days

        for key, pattern in list(self.usage_patterns.items()):
            if current_time - pattern['last_access'] > unused_threshold:
                # Remove from cache and usage patterns
                self.cache_manager.caches[CacheLevel.MEMORY].cache.pop(key, None)
                del self.usage_patterns[key]
                logger.info(f"Cleaned up unused cache entry: {key}")
```

## Monitoring and Analytics

### 1. Cache Performance Metrics

```python
from dataclasses import dataclass
from typing import Dict, List, Any
import time
import json

@dataclass
class CacheMetrics:
    """Cache performance metrics."""
    timestamp: float
    cache_type: str
    hit_rate: float
    miss_rate: float
    avg_response_time: float
    memory_usage: int
    entry_count: int
    eviction_count: int
    expiration_count: int

class CacheMonitor:
    """Cache performance monitoring and analytics."""

    def __init__(self, cache_manager: CacheManager):
        self.cache_manager = cache_manager
        self.metrics_history: List[CacheMetrics] = []
        self.monitoring_enabled = True
        self.monitoring_interval = 60  # 1 minute

    def collect_metrics(self) -> CacheMetrics:
        """Collect current cache metrics."""
        stats = self.cache_manager.get_stats()

        # Calculate average response time (simplified)
        avg_response_time = self._calculate_avg_response_time()

        metrics = CacheMetrics(
            timestamp=time.time(),
            cache_type="combined",
            hit_rate=stats['overall_hit_rate'],
            miss_rate=1 - stats['overall_hit_rate'],
            avg_response_time=avg_response_time,
            memory_usage=self._estimate_memory_usage(),
            entry_count=self._get_total_entry_count(),
            eviction_count=sum(
                cache_stats.get('evictions', 0)
                for cache_stats in stats['cache_specific_stats'].values()
            ),
            expiration_count=sum(
                cache_stats.get('expirations', 0)
                for cache_stats in stats['cache_specific_stats'].values()
            )
        )

        self.metrics_history.append(metrics)

        # Keep only last 24 hours of metrics
        cutoff_time = time.time() - 86400
        self.metrics_history = [
            m for m in self.metrics_history if m.timestamp > cutoff_time
        ]

        return metrics

    def _calculate_avg_response_time(self) -> float:
        """Calculate average cache response time."""
        # This would be measured during actual cache operations
        # For now, return a placeholder
        return 0.001  # 1ms

    def _estimate_memory_usage(self) -> int:
        """Estimate total memory usage of caches."""
        total_size = 0
        for cache in self.cache_manager.caches.values():
            if hasattr(cache, '_cache'):
                total_size += len(cache._cache) * 1024  # Rough estimate
        return total_size

    def _get_total_entry_count(self) -> int:
        """Get total number of entries across all caches."""
        total = 0
        for cache in self.cache_manager.caches.values():
            if hasattr(cache, '_cache'):
                total += len(cache._cache)
        return total

    def get_performance_summary(self) -> Dict[str, Any]:
        """Get performance summary over time."""
        if not self.metrics_history:
            return {}

        recent_metrics = self.metrics_history[-60:]  # Last hour

        return {
            'time_range_hours': 1,
            'avg_hit_rate': statistics.mean(m.hit_rate for m in recent_metrics),
            'avg_response_time': statistics.mean(m.avg_response_time for m in recent_metrics),
            'total_requests': sum(m.entry_count for m in recent_metrics),
            'memory_efficiency': self._calculate_memory_efficiency(recent_metrics),
            'cache_health_score': self._calculate_health_score(recent_metrics)
        }

    def _calculate_memory_efficiency(self, metrics: List[CacheMetrics]) -> float:
        """Calculate memory efficiency score."""
        if not metrics:
            return 0.0

        # Efficiency = hit_rate / memory_usage_ratio
        avg_hit_rate = statistics.mean(m.hit_rate for m in metrics)
        avg_memory_usage = statistics.mean(m.memory_usage for m in metrics)
        max_memory = 100 * 1024 * 1024  # 100MB

        memory_ratio = min(avg_memory_usage / max_memory, 1.0)
        efficiency = avg_hit_rate / (memory_ratio + 0.1)  # Avoid division by zero

        return min(efficiency, 1.0)

    def _calculate_health_score(self, metrics: List[CacheMetrics]) -> float:
        """Calculate overall cache health score."""
        if not metrics:
            return 0.0

        # Factors: hit rate, response time, eviction rate
        avg_hit_rate = statistics.mean(m.hit_rate for m in metrics)
        avg_response_time = statistics.mean(m.avg_response_time for m in metrics)
        total_evictions = sum(m.eviction_count for m in metrics)
        total_entries = sum(m.entry_count for m in metrics)

        eviction_rate = total_evictions / max(total_entries, 1)

        # Health score components
        hit_score = avg_hit_rate
        response_score = min(1.0, 0.01 / avg_response_time)  # Lower is better
        eviction_score = max(0.0, 1.0 - eviction_rate)

        # Weighted average
        health_score = (hit_score * 0.5 + response_score * 0.3 + eviction_score * 0.2)

        return min(health_score, 1.0)

    def export_metrics(self, format: str = 'json') -> str:
        """Export metrics for external analysis."""
        if format == 'json':
            return json.dumps([
                {
                    'timestamp': m.timestamp,
                    'cache_type': m.cache_type,
                    'hit_rate': m.hit_rate,
                    'avg_response_time': m.avg_response_time,
                    'memory_usage': m.memory_usage,
                    'entry_count': m.entry_count
                }
                for m in self.metrics_history
            ], indent=2)

        raise ValueError(f"Unsupported format: {format}")
```

### 2. Cache Optimization Recommendations

```python
from typing import List, Dict, Any
import statistics

class CacheOptimizer:
    """Provides optimization recommendations based on cache performance."""

    def __init__(self, cache_manager: CacheManager, monitor: CacheMonitor):
        self.cache_manager = cache_manager
        self.monitor = monitor

    def analyze_performance(self) -> List[Dict[str, Any]]:
        """Analyze cache performance and provide recommendations."""
        recommendations = []
        metrics = self.monitor.collect_metrics()

        # Hit rate analysis
        if metrics.hit_rate < 0.5:
            recommendations.append({
                'type': 'low_hit_rate',
                'severity': 'high',
                'description': 'Cache hit rate is below 50%',
                'recommendations': [
                    'Increase cache sizes',
                    'Review TTL settings',
                    'Analyze access patterns',
                    'Implement cache warm-up'
                ]
            })

        # Memory usage analysis
        if metrics.memory_usage > 100 * 1024 * 1024:  # 100MB
            recommendations.append({
                'type': 'high_memory_usage',
                'severity': 'medium',
                'description': 'Cache memory usage is high',
                'recommendations': [
                    'Reduce cache sizes',
                    'Implement more aggressive eviction policies',
                    'Use compression for cached data',
                    'Monitor for memory leaks'
                ]
            })

        # Eviction rate analysis
        if metrics.eviction_count > 1000:
            recommendations.append({
                'type': 'high_eviction_rate',
                'severity': 'medium',
                'description': 'High eviction rate detected',
                'recommendations': [
                    'Increase cache sizes',
                    'Review TTL settings',
                    'Implement cache warming for frequently evicted items',
                    'Consider using a larger cache tier'
                ]
            })

        # Response time analysis
        if metrics.avg_response_time > 0.01:  # 10ms
            recommendations.append({
                'type': 'slow_response_time',
                'severity': 'high',
                'description': 'Cache response time is slow',
                'recommendations': [
                    'Profile cache operations',
                    'Optimize data structures',
                    'Consider using faster storage for hot data',
                    'Review cache implementation for bottlenecks'
                ]
            })

        return recommendations

    def generate_optimization_plan(self) -> Dict[str, Any]:
        """Generate comprehensive optimization plan."""
        recommendations = self.analyze_performance()
        stats = self.cache_manager.get_stats()

        plan = {
            'timestamp': time.time(),
            'current_performance': {
                'hit_rate': stats['overall_hit_rate'],
                'total_entries': sum(
                    cache_stats.get('current_size', 0)
                    for cache_stats in stats['cache_specific_stats'].values()
                ),
                'memory_usage': self.monitor._estimate_memory_usage()
            },
            'recommendations': recommendations,
            'optimization_steps': []
        }

        # Generate specific optimization steps
        for rec in recommendations:
            if rec['type'] == 'low_hit_rate':
                plan['optimization_steps'].extend([
                    {
                        'action': 'increase_memory_cache_size',
                        'params': {'new_size': 2000},
                        'expected_impact': 'increase_hit_rate',
                        'priority': 'high'
                    },
                    {
                        'action': 'enable_cache_warmup',
                        'params': {'common_queries': True},
                        'expected_impact': 'improve_cold_start',
                        'priority': 'medium'
                    }
                ])

        return plan
```

## Examples and Use Cases

### 1. Basic Cache Usage

```python
# Initialize cache manager
cache_manager = CacheManager()

# Cache AI response
query = "What is machine learning?"
response = "Machine learning is a subset of artificial intelligence..."

cache_manager.set(query, response, ttl=86400)

# Retrieve from cache
cached_response = cache_manager.get(query)
if cached_response:
    print(f"Cache hit: {cached_response}")
else:
    print("Cache miss - generating new response...")
```

### 2. Response Cache with Similarity

```python
# Initialize response cache
response_cache = ResponseCache()

# Cache a response
response_cache.set(
    query="Explain neural networks",
    response="Neural networks are computing systems inspired by biological neural networks...",
    ttl=86400
)

# Find similar response for related query
similar_response = response_cache.get_similar_response(
    "How do neural networks work?",
    threshold=0.7
)

if similar_response:
    print(f"Found similar response: {similar_response.response[:100]}...")
```

### 3. Performance Monitoring

```python
# Initialize monitor
monitor = CacheMonitor(cache_manager)

# Collect metrics
metrics = monitor.collect_metrics()
print(f"Hit rate: {metrics.hit_rate:.2%}")
print(f"Memory usage: {metrics.memory_usage / 1024 / 1024:.1f} MB")

# Get performance summary
summary = monitor.get_performance_summary()
print(f"Health score: {summary['cache_health_score']:.2%}")
```

## Troubleshooting

### Common Issues and Solutions

1. **Low Hit Rate**
   - Check TTL settings are too aggressive
   - Verify cache warming is working
   - Analyze access patterns

2. **High Memory Usage**
   - Reduce cache sizes
   - Implement more aggressive eviction
   - Use compression

3. **Slow Response Times**
   - Profile cache operations
   - Check for contention issues
   - Optimize data structures

### Monitoring Commands

```bash
# Check cache statistics
Learning Catalyst > /system cache-stats
📊 Cache Performance:
  Hit Rate: 78.5%
  Memory Usage: 45.2 MB
  Total Entries: 12,345
  Health Score: 85%

# Analyze cache performance
Learning Catalyst > /system cache-analyze
🔍 Cache Analysis:
  ✅ Hit rate is healthy
  ⚠️  Memory usage is moderate
  ✅ Response times are optimal
```

## Related Documentation

- [API Optimization](api-optimization.md)
- [Memory Management](memory-management.md)
- [Performance Monitoring](performance-monitoring.md)
- [CLI Architecture](../system-architecture/cli-architecture.md)