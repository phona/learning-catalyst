# API Optimization

---
title: Learning Catalyst API Optimization Guide
description: AI service communication optimization, request batching, and performance tuning
version: 1.0.0
last_updated: 2025-10-08
---

## Overview

This guide covers comprehensive API optimization techniques for Learning Catalyst, focusing on AI service communication, request optimization, caching strategies, and performance monitoring. Proper API optimization is crucial for maintaining responsive user experience and managing costs effectively.

## API Performance Architecture

### Request Processing Pipeline

```text
┌─────────────────────────────────────────────────────────────┐
│                  API Request Pipeline                         │
│                                                             │
│  User Input → Validation → Queue → Processing → Response      │
│      ↓           ↓          ↓         ↓          ↓          │
│   Input     Request    Rate     AI API    Response    User       │
│   Checking  Formatting  Limit   Call      Caching   Display    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Optimization Layers

1. **Input Layer**: Input validation and preprocessing
2. **Queue Layer**: Request queuing and rate limiting
3. **Processing Layer**: API call optimization and batching
4. **Cache Layer**: Response caching and storage
5. **Output Layer**: Response formatting and delivery

## Request Batching and Parallelization

### Intelligent Request Batching

```python
import asyncio
import time
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field
from collections import defaultdict, deque
import aiohttp
import json

@dataclass
class BatchRequest:
    """Individual request within a batch."""
    id: str
    prompt: str
    context: Dict[str, Any]
    model: Optional[str] = None
    priority: int = 0
    created_at: float = field(default_factory=time.time)
    callback: Optional[callable] = None

@dataclass
class BatchResponse:
    """Response for a batched request."""
    request_id: str
    content: str
    model: str
    provider: str
    tokens_used: Dict[str, int]
    response_time: float
    success: bool
    error_message: Optional[str] = None

class BatchProcessor:
    """Intelligent batch processing for API requests."""

    def __init__(self, max_batch_size: int = 10, max_wait_time: float = 2.0):
        self.max_batch_size = max_batch_size
        self.max_wait_time = max_wait_time
        self.request_queue = deque()
        self.processing = False
        self.stats = {
            'total_requests': 0,
            'batches_processed': 0,
            'avg_batch_size': 0,
            'total_response_time': 0
        }

    async def add_request(self, request: BatchRequest) -> BatchResponse:
        """Add request to batch and return response."""
        # Create future for response
        response_future = asyncio.Future()
        request.callback = response_future

        # Add to queue
        self.request_queue.append(request)
        self.stats['total_requests'] += 1

        # Start processing if not already running
        if not self.processing:
            asyncio.create_task(self._process_batch())

        # Wait for response
        return await response_future

    async def _process_batch(self):
        """Process batch of requests."""
        self.processing = True

        while self.request_queue:
            # Collect batch
            batch = []
            batch_start_time = time.time()

            # Wait for requests or timeout
            while (len(batch) < self.max_batch_size and
                   (time.time() - batch_start_time) < self.max_wait_time):
                if self.request_queue:
                    batch.append(self.request_queue.popleft())
                else:
                    await asyncio.sleep(0.01)

            if not batch:
                continue

            # Sort by priority
            batch.sort(key=lambda x: x.priority, reverse=True)

            # Process batch
            batch_responses = await self._execute_batch(batch)

            # Return responses
            for response in batch_responses:
                if response.request_id in [req.id for req in batch]:
                    for request in batch:
                        if request.id == response.request_id and request.callback:
                            if not request.callback.done():
                                request.callback.set_result(response)

            # Update stats
            self.stats['batches_processed'] += 1
            self.stats['avg_batch_size'] = (
                (self.stats['avg_batch_size'] * (self.stats['batches_processed'] - 1) + len(batch)) /
                self.stats['batches_processed']
            )

        self.processing = False

    async def _execute_batch(self, batch: List[BatchRequest]) -> List[BatchResponse]:
        """Execute batch of requests."""
        # Group requests by model and provider
        groups = self._group_requests(batch)

        responses = []
        for group_key, group_requests in groups.items():
            group_responses = await self._execute_group(group_requests, group_key)
            responses.extend(group_responses)

        return responses

    def _group_requests(self, batch: List[BatchRequest]) -> Dict[tuple, List[BatchRequest]]:
        """Group requests by model and provider."""
        groups = defaultdict(list)

        for request in batch:
            key = (request.model, request.context.get('provider', 'default'))
            groups[key].append(request)

        return dict(groups)

    async def _execute_group(self, requests: List[BatchRequest],
                           group_key: tuple) -> List[BatchResponse]:
        """Execute group of similar requests."""
        model, provider = group_key

        # Check if we can batch these requests
        if len(requests) == 1:
            # Single request
            response = await self._execute_single(requests[0])
            return [response]
        else:
            # Multiple requests - try to optimize
            if self._can_batch_requests(requests):
                return await self._execute_batched_requests(requests, model, provider)
            else:
                # Execute in parallel
                return await self._execute_parallel_requests(requests)

    def _can_batch_requests(self, requests: List[BatchRequest]) -> bool:
        """Check if requests can be batched efficiently."""
        # Check if requests are similar enough for batching
        if len(requests) < 2:
            return False

        # All requests should have similar context
        first_context = requests[0].context
        for request in requests[1:]:
            if (request.context.get('session_id') != first_context.get('session_id') or
                request.context.get('user_id') != first_context.get('user_id')):
                return False

        # Prompts should be short enough for batching
        total_length = sum(len(req.prompt) for req in requests)
        if total_length > 8000:  # Arbitrary limit
            return False

        return True

    async def _execute_batched_requests(self, requests: List[BatchRequest],
                                       model: str, provider: str) -> List[BatchResponse]:
        """Execute multiple requests as a single batched request."""
        # Combine prompts
        combined_prompt = self._combine_prompts(requests)

        # Create single batch request
        batch_request = BatchRequest(
            id="batch_" + "_".join(req.id for req in requests),
            prompt=combined_prompt,
            context=requests[0].context,
            model=model,
            priority=max(req.priority for req in requests)
        )

        # Execute single request
        batch_response = await self._execute_single(batch_request)

        # Parse combined response
        return self._parse_batch_response(batch_response, requests)

    def _combine_prompts(self, requests: List[BatchRequest]) -> str:
        """Combine multiple prompts into a single batch prompt."""
        prompt_parts = []
        for i, request in enumerate(requests):
            prompt_parts.append(f"REQUEST {i+1}:\n{request.prompt}")

        combined_prompt = "\n\n".join(prompt_parts)
        combined_prompt += "\n\nPlease provide separate responses for each request, formatted as:\n"
        combined_prompt += "RESPONSE 1:\n...\nRESPONSE 2:\n..."

        return combined_prompt

    def _parse_batch_response(self, batch_response: BatchResponse,
                             original_requests: List[BatchRequest]) -> List[BatchResponse]:
        """Parse combined response into individual responses."""
        responses = []
        content = batch_response.content

        # Split content by response markers
        response_parts = content.split("RESPONSE")[1:]  # Skip empty first part

        for i, request in enumerate(original_requests):
            if i < len(response_parts):
                part_content = response_parts[i].strip()
                # Remove any remaining response markers
                part_content = part_content.split("\n", 1)[1] if "\n" in part_content else part_content

                response = BatchResponse(
                    request_id=request.id,
                    content=part_content,
                    model=batch_response.model,
                    provider=batch_response.provider,
                    tokens_used=batch_response.tokens_used,  # Rough estimate
                    response_time=batch_response.response_time,
                    success=True
                )
            else:
                # Create error response if parsing failed
                response = BatchResponse(
                    request_id=request.id,
                    content="",
                    model=batch_response.model,
                    provider=batch_response.provider,
                    tokens_used={},
                    response_time=batch_response.response_time,
                    success=False,
                    error_message="Failed to parse batch response"
                )

            responses.append(response)

        return responses

    async def _execute_parallel_requests(self, requests: List[BatchRequest]) -> List[BatchResponse]:
        """Execute multiple requests in parallel."""
        semaphore = asyncio.Semaphore(5)  # Limit concurrent requests

        async def execute_with_semaphore(request):
            async with semaphore:
                return await self._execute_single(request)

        tasks = [execute_with_semaphore(req) for req in requests]
        return await asyncio.gather(*tasks, return_exceptions=True)

    async def _execute_single(self, request: BatchRequest) -> BatchResponse:
        """Execute single API request."""
        try:
            start_time = time.time()

            # Get AI manager from context
            ai_manager = request.context.get('ai_manager')
            if not ai_manager:
                raise ValueError("AI manager not available in context")

            # Generate response
            ai_response = await ai_manager.generate_response(
                prompt=request.prompt,
                model=request.model,
                context=request.context
            )

            response_time = time.time() - start_time

            return BatchResponse(
                request_id=request.id,
                content=ai_response.content,
                model=ai_response.model,
                provider=ai_response.provider,
                tokens_used=ai_response.tokens_used,
                response_time=response_time,
                success=True
            )

        except Exception as e:
            return BatchResponse(
                request_id=request.id,
                content="",
                model="",
                provider="",
                tokens_used={},
                response_time=0,
                success=False,
                error_message=str(e)
            )

    def get_stats(self) -> Dict[str, Any]:
        """Get batch processing statistics."""
        return {
            **self.stats,
            'queue_size': len(self.request_queue),
            'processing': self.processing,
            'efficiency': (
                self.stats['avg_batch_size'] if self.stats['batches_processed'] > 0 else 0
            )
        }
```

### Request Prioritization

```python
from enum import Enum
from typing import Dict, Any
import heapq

class RequestPriority(Enum):
    CRITICAL = 1    # User interactions, error handling
    HIGH = 2        # Learning requests, explanations
    NORMAL = 3      # Background tasks, analytics
    LOW = 4         # Maintenance, cleanup

class PriorityProcessor:
    """Priority-based request processing."""

    def __init__(self):
        self.queues = {priority: [] for priority in RequestPriority}
        self.processing = False
        self.current_priority = RequestPriority.NORMAL

    async def add_request(self, request: BatchRequest,
                         priority: RequestPriority = RequestPriority.NORMAL) -> BatchResponse:
        """Add request with specified priority."""
        request.priority = priority.value
        heapq.heappush(self.queues[priority], (-request.created_at, request))

        if not self.processing:
            asyncio.create_task(self._process_priority_queue())

        return await request.callback

    async def _process_priority_queue(self):
        """Process requests by priority."""
        self.processing = True

        while any(self.queues.values()):
            # Check queues in priority order
            for priority in RequestPriority:
                if self.queues[priority]:
                    self.current_priority = priority
                    request = heapq.heappop(self.queues[priority])[1]

                    # Process high-priority requests immediately
                    if priority in [RequestPriority.CRITICAL, RequestPriority.HIGH]:
                        response = await self._execute_single(request)
                        if not request.callback.done():
                            request.callback.set_result(response)
                    else:
                        # Batch lower priority requests
                        batch = [request]
                        while (len(self.queues[priority]) > 0 and
                               len(batch) < 5):  # Smaller batches for low priority
                            next_request = heapq.heappop(self.queues[priority])[1]
                            batch.append(next_request)

                        batch_responses = await self._execute_parallel_requests(batch)
                        for response in batch_responses:
                            if not response.request_id.endswith('_batch'):
                                for req in batch:
                                    if (req.id == response.request_id and
                                        req.callback and not req.callback.done()):
                                        req.callback.set_result(response)

        self.processing = False

    def get_queue_stats(self) -> Dict[str, Any]:
        """Get queue statistics."""
        return {
            priority.name.lower(): len(queue)
            for priority, queue in self.queues.items()
        }
```

## Caching Strategies

### Multi-Level Caching Architecture

```python
import hashlib
import time
import json
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
from threading import RLock

@dataclass
class CacheEntry:
    """Cache entry with metadata."""
    content: Any
    created_at: float
    last_accessed: float
    access_count: int
    size_bytes: int
    ttl_seconds: int

class MemoryCache:
    """High-performance in-memory cache."""

    def __init__(self, max_size_mb: int = 100, default_ttl: int = 3600):
        self.max_size_bytes = max_size_mb * 1024 * 1024
        self.default_ttl = default_ttl
        self.cache: Dict[str, CacheEntry] = {}
        self.current_size_bytes = 0
        self.lock = RLock()
        self.stats = {
            'hits': 0,
            'misses': 0,
            'evictions': 0,
            'total_requests': 0
        }

    def _generate_key(self, prompt: str, model: str, context: Dict[str, Any]) -> str:
        """Generate cache key from request parameters."""
        # Create deterministic key from request parameters
        key_data = {
            'prompt': prompt,
            'model': model,
            'context': {
                'user_id': context.get('user_id'),
                'session_id': context.get('session_id'),
                'temperature': context.get('temperature', 0.7),
                'max_tokens': context.get('max_tokens', 2000)
            }
        }

        key_string = json.dumps(key_data, sort_keys=True)
        return hashlib.sha256(key_string.encode()).hexdigest()

    def get(self, prompt: str, model: str, context: Dict[str, Any]) -> Optional[Any]:
        """Get cached response if available and not expired."""
        key = self._generate_key(prompt, model, context)

        with self.lock:
            self.stats['total_requests'] += 1

            if key not in self.cache:
                self.stats['misses'] += 1
                return None

            entry = self.cache[key]
            current_time = time.time()

            # Check TTL
            if current_time - entry.created_at > entry.ttl_seconds:
                del self.cache[key]
                self.current_size_bytes -= entry.size_bytes
                self.stats['misses'] += 1
                return None

            # Update access statistics
            entry.last_accessed = current_time
            entry.access_count += 1
            self.stats['hits'] += 1

            return entry.content

    def set(self, prompt: str, model: str, context: Dict[str, Any],
             content: Any, ttl_seconds: Optional[int] = None) -> bool:
        """Cache response with TTL."""
        key = self._generate_key(prompt, model, context)
        ttl = ttl_seconds or self.default_ttl
        current_time = time.time()

        # Calculate size
        content_size = len(json.dumps(content, default=str).encode())
        total_size = content_size + 200  # Overhead estimation

        with self.lock:
            # Check if we need to evict entries
            while (self.current_size_bytes + total_size > self.max_size_bytes and
                   self.cache):
                self._evict_lru()

            # Check if updating existing entry
            if key in self.cache:
                old_entry = self.cache[key]
                self.current_size_bytes -= old_entry.size_bytes

            # Add new entry
            entry = CacheEntry(
                content=content,
                created_at=current_time,
                last_accessed=current_time,
                access_count=1,
                size_bytes=total_size,
                ttl_seconds=ttl
            )

            self.cache[key] = entry
            self.current_size_bytes += total_size

        return True

    def _evict_lru(self):
        """Evict least recently used entry."""
        if not self.cache:
            return

        # Find LRU entry
        lru_key = min(self.cache.keys(),
                     key=lambda k: self.cache[k].last_accessed)

        lru_entry = self.cache[lru_key]
        del self.cache[lru_key]
        self.current_size_bytes -= lru_entry.size_bytes
        self.stats['evictions'] += 1

    def clear(self):
        """Clear all cached entries."""
        with self.lock:
            self.cache.clear()
            self.current_size_bytes = 0

    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        with self.lock:
            total_requests = self.stats['total_requests']
            hit_rate = (self.stats['hits'] / total_requests * 100) if total_requests > 0 else 0

            return {
                **self.stats,
                'hit_rate_percent': hit_rate,
                'current_size_bytes': self.current_size_bytes,
                'max_size_bytes': self.max_size_bytes,
                'usage_percent': (self.current_size_bytes / self.max_size_bytes * 100),
                'entries_count': len(self.cache)
            }

class SmartCache:
    """Intelligent caching with multiple strategies."""

    def __init__(self):
        self.memory_cache = MemoryCache(max_size_mb=50, default_ttl=1800)
        self.semantic_cache = SemanticCache()
        self.pattern_cache = PatternCache()

    async def get(self, prompt: str, model: str, context: Dict[str, Any]) -> Optional[Any]:
        """Get cached response using multiple strategies."""
        # Try exact match first
        response = self.memory_cache.get(prompt, model, context)
        if response:
            return response

        # Try semantic match
        response = await self.semantic_cache.get(prompt, model, context)
        if response:
            # Cache the semantic result
            self.memory_cache.set(prompt, model, context, response)
            return response

        # Try pattern match
        response = await self.pattern_cache.get(prompt, model, context)
        if response:
            self.memory_cache.set(prompt, model, context, response)
            return response

        return None

    async def set(self, prompt: str, model: str, context: Dict[str, Any],
                 content: Any):
        """Cache response using multiple strategies."""
        # Always cache in memory cache
        self.memory_cache.set(prompt, model, context, content)

        # Cache in semantic cache if content is substantial
        if len(str(content)) > 500:
            await self.semantic_cache.set(prompt, model, context, content)

        # Cache in pattern cache if pattern detected
        pattern = self._detect_pattern(prompt)
        if pattern:
            await self.pattern_cache.set(pattern, model, context, content)

    def _detect_pattern(self, prompt: str) -> Optional[str]:
        """Detect if prompt matches a known pattern."""
        patterns = {
            'explanation': [
                'explain', 'what is', 'how does', 'why is', 'describe'
            ],
            'code_generation': [
                'write code', 'implement', 'create function', 'generate code'
            ],
            'debugging': [
                'debug', 'fix error', 'troubleshoot', 'why is not working'
            ],
            'comparison': [
                'compare', 'difference between', 'versus', 'vs'
            ]
        }

        prompt_lower = prompt.lower()
        for pattern_type, keywords in patterns.items():
            if any(keyword in prompt_lower for keyword in keywords):
                return pattern_type

        return None

    def get_stats(self) -> Dict[str, Any]:
        """Get comprehensive cache statistics."""
        return {
            'memory_cache': self.memory_cache.get_stats(),
            'semantic_cache': self.semantic_cache.get_stats(),
            'pattern_cache': self.pattern_cache.get_stats()
        }

class SemanticCache:
    """Semantic caching for similar prompts."""

    def __init__(self):
        self.cache = {}  # Simplified semantic cache
        self.vector_cache = {}  # Would use actual vector embeddings

    async def get(self, prompt: str, model: str, context: Dict[str, Any]) -> Optional[Any]:
        """Get semantically similar cached response."""
        # This is a simplified implementation
        # In practice, would use vector embeddings and similarity search
        key = self._get_semantic_key(prompt, model)

        if key in self.cache:
            return self.cache[key]['content']

        return None

    async def set(self, prompt: str, model: str, context: Dict[str, Any], content: Any):
        """Store content with semantic key."""
        key = self._get_semantic_key(prompt, model)
        self.cache[key] = {
            'content': content,
            'prompt': prompt,
            'model': model,
            'created_at': time.time()
        }

    def _get_semantic_key(self, prompt: str, model: str) -> str:
        """Generate semantic key from prompt."""
        # Simplified semantic hashing
        # In practice, would use text embeddings
        words = prompt.lower().split()
        important_words = [w for w in words if len(w) > 3][:5]
        return f"{model}_{'_'.join(sorted(important_words))}"

    def get_stats(self) -> Dict[str, Any]:
        """Get semantic cache statistics."""
        return {
            'entries_count': len(self.cache),
            'total_entries': len(self.cache)
        }

class PatternCache:
    """Pattern-based caching for similar request types."""

    def __init__(self):
        self.patterns = {}

    async def get(self, prompt: str, model: str, context: Dict[str, Any]) -> Optional[Any]:
        """Get cached response for detected pattern."""
        pattern = self._extract_pattern(prompt, context)
        if pattern and pattern in self.patterns:
            pattern_entry = self.patterns[pattern]
            if model in pattern_entry['responses']:
                return pattern_entry['responses'][model]

        return None

    async def set(self, pattern: str, model: str, context: Dict[str, Any], content: Any):
        """Cache response for pattern."""
        if pattern not in self.patterns:
            self.patterns[pattern] = {
                'responses': {},
                'count': 0
            }

        self.patterns[pattern]['responses'][model] = content
        self.patterns[pattern]['count'] += 1

    def _extract_pattern(self, prompt: str, context: Dict[str, Any]) -> Optional[str]:
        """Extract pattern from prompt and context."""
        # Simplified pattern extraction
        if context.get('is_explanation', False):
            return 'explanation'
        elif context.get('is_code_generation', False):
            return 'code_generation'
        elif 'error' in prompt.lower():
            return 'error_handling'

        return None

    def get_stats(self) -> Dict[str, Any]:
        """Get pattern cache statistics."""
        return {
            'patterns_count': len(self.patterns),
            'total_responses': sum(p['count'] for p in self.patterns.values())
        }
```

## Request Optimization Techniques

### Request Deduplication

```python
from typing import Set
from collections import defaultdict

class RequestDeduplicator:
    """Deduplicate identical requests to avoid redundant API calls."""

    def __init__(self):
        self.pending_requests: Dict[str, asyncio.Future] = {}
        self.completed_requests: Dict[str, Dict[str, Any]] = {}
        self.stats = {
            'duplicates_prevented': 0,
            'cache_hits': 0
        }

    def _generate_request_key(self, prompt: str, model: str, context: Dict[str, Any]) -> str:
        """Generate unique key for request."""
        key_data = {
            'prompt': prompt,
            'model': model,
            'context': {
                'temperature': context.get('temperature', 0.7),
                'max_tokens': context.get('max_tokens', 2000),
                'user_id': context.get('user_id')
            }
        }
        return hashlib.sha256(json.dumps(key_data, sort_keys=True).encode()).hexdigest()

    async def execute_request(self, prompt: str, model: str, context: Dict[str, Any],
                           execute_func: callable) -> Any:
        """Execute request with deduplication."""
        key = self._generate_request_key(prompt, model, context)

        # Check if request is currently pending
        if key in self.pending_requests:
            self.stats['duplicates_prevented'] += 1
            return await self.pending_requests[key]

        # Check if request was recently completed
        if key in self.completed_requests:
            completed = self.completed_requests[key]
            if (time.time() - completed['completed_at']) < 300:  # 5 minutes
                self.stats['cache_hits'] += 1
                return completed['response']

        # Create future for new request
        future = asyncio.Future()
        self.pending_requests[key] = future

        try:
            # Execute the request
            response = await execute_func(prompt, model, context)

            # Store result
            self.completed_requests[key] = {
                'response': response,
                'completed_at': time.time()
            }

            # Clean up completed requests periodically
            self._cleanup_completed_requests()

            return response

        except Exception as e:
            # Clean up on error
            if key in self.pending_requests:
                del self.pending_requests[key]
            raise

        finally:
            # Clean up pending request
            if key in self.pending_requests:
                del self.pending_requests[key]

    def _cleanup_completed_requests(self):
        """Clean up old completed requests."""
        current_time = time.time()
        cutoff_time = current_time - 600  # 10 minutes

        expired_keys = [
            key for key, completed in self.completed_requests.items()
            if completed['completed_at'] < cutoff_time
        ]

        for key in expired_keys:
            del self.completed_requests[key]

    def get_stats(self) -> Dict[str, Any]:
        """Get deduplication statistics."""
        return {
            **self.stats,
            'pending_requests': len(self.pending_requests),
            'completed_requests': len(self.completed_requests)
        }
```

### Request Compression

```python
import gzip
import zlib
import pickle
from typing import Any, Dict

class RequestCompressor:
    """Compress request data to reduce bandwidth usage."""

    def __init__(self):
        self.compression_methods = {
            'gzip': self._gzip_compress,
            'zlib': self._zlib_compress,
            'pickle': self._pickle_compress
        }
        self.decompression_methods = {
            'gzip': self._gzip_decompress,
            'zlib': self._zlib_decompress,
            'pickle': self._pickle_decompress
        }

    def compress_request(self, request_data: Dict[str, Any], method: str = 'gzip') -> bytes:
        """Compress request data."""
        if method not in self.compression_methods:
            raise ValueError(f"Unsupported compression method: {method}")

        # Serialize data
        serialized = json.dumps(request_data).encode('utf-8')

        # Compress
        compressed = self.compression_methods[method](serialized)

        return compressed

    def decompress_request(self, compressed_data: bytes, method: str = 'gzip') -> Dict[str, Any]:
        """Decompress request data."""
        if method not in self.decompression_methods:
            raise ValueError(f"Unsupported decompression method: {method}")

        # Decompress
        decompressed = self.decompression_methods[method](compressed_data)

        # Deserialize
        return json.loads(decompressed.decode('utf-8'))

    def _gzip_compress(self, data: bytes) -> bytes:
        """Compress data using gzip."""
        return gzip.compress(data)

    def _gzip_decompress(self, compressed_data: bytes) -> bytes:
        """Decompress data using gzip."""
        return gzip.decompress(compressed_data)

    def _zlib_compress(self, data: bytes) -> bytes:
        """Compress data using zlib."""
        return zlib.compress(data)

    def _zlib_decompress(self, compressed_data: bytes) -> bytes:
        """Decompress data using zlib."""
        return zlib.decompress(compressed_data)

    def _pickle_compress(self, data: bytes) -> bytes:
        """Compress data using pickle."""
        return pickle.dumps(data)

    def _pickle_decompress(self, compressed_data: bytes) -> bytes:
        """Decompress data using pickle."""
        return pickle.loads(compressed_data)

    def get_compression_stats(self, original_data: Dict[str, Any]) -> Dict[str, Any]:
        """Get compression statistics for different methods."""
        original_bytes = json.dumps(original_data).encode('utf-8')
        original_size = len(original_bytes)

        stats = {
            'original_size_bytes': original_size,
            'methods': {}
        }

        for method in self.compression_methods.keys():
            try:
                compressed = self.compression_methods[method](original_bytes)
                compressed_size = len(compressed)
                compression_ratio = (original_size - compressed_size) / original_size * 100

                stats['methods'][method] = {
                    'compressed_size_bytes': compressed_size,
                    'compression_ratio_percent': compression_ratio,
                    'space_saved_bytes': original_size - compressed_size
                }
            except Exception as e:
                stats['methods'][method] = {
                    'error': str(e)
                }

        return stats
```

## Performance Monitoring and Analytics

### API Performance Monitor

```python
import time
import statistics
from typing import Dict, List, Any, Optional
from collections import deque
from dataclasses import dataclass, field

@dataclass
class APIMetrics:
    """API performance metrics for a single request."""
    request_id: str
    provider: str
    model: str
    endpoint: str
    method: str
    timestamp: float
    request_size_bytes: int
    response_size_bytes: int
    response_time: float
    success: bool
    error_code: Optional[str] = None
    tokens_used: Optional[Dict[str, int]] = None
    cache_hit: bool = False

class APIPerformanceMonitor:
    """Monitor and analyze API performance."""

    def __init__(self, max_metrics: int = 10000):
        self.max_metrics = max_metrics
        self.metrics = deque(maxlen=max_metrics)
        self.real_time_stats = {}
        self.alerts = []

    def record_request(self, metrics: APIMetrics):
        """Record API request metrics."""
        self.metrics.append(metrics)
        self._update_real_time_stats(metrics)
        self._check_alerts(metrics)

    def _update_real_time_stats(self, metrics: APIMetrics):
        """Update real-time statistics."""
        # Update provider stats
        provider = metrics.provider
        if provider not in self.real_time_stats:
            self.real_time_stats[provider] = {
                'total_requests': 0,
                'successful_requests': 0,
                'failed_requests': 0,
                'total_response_time': 0,
                'avg_response_time': 0,
                'min_response_time': float('inf'),
                'max_response_time': 0,
                'total_tokens': {'input': 0, 'output': 0, 'total': 0},
                'cache_hits': 0,
                'error_codes': {}
            }

        stats = self.real_time_stats[provider]
        stats['total_requests'] += 1

        if metrics.success:
            stats['successful_requests'] += 1
        else:
            stats['failed_requests'] += 1

        stats['total_response_time'] += metrics.response_time
        stats['avg_response_time'] = stats['total_response_time'] / stats['total_requests']
        stats['min_response_time'] = min(stats['min_response_time'], metrics.response_time)
        stats['max_response_time'] = max(stats['max_response_time'], metrics.response_time)

        if metrics.tokens_used:
            for token_type, count in metrics.tokens_used.items():
                stats['total_tokens'][token_type] += count

        if metrics.cache_hit:
            stats['cache_hits'] += 1

        if metrics.error_code:
            error_code = metrics.error_code
            stats['error_codes'][error_code] = stats['error_codes'].get(error_code, 0) + 1

    def _check_alerts(self, metrics: APIMetrics):
        """Check for performance alerts."""
        alerts = []

        # High response time alert
        if metrics.response_time > 10.0:  # 10 seconds
            alerts.append({
                'type': 'slow_response',
                'severity': 'warning',
                'message': f"Slow response time: {metrics.response_time:.2f}s",
                'request_id': metrics.request_id,
                'provider': metrics.provider,
                'model': metrics.model
            })

        # Very high response time alert
        if metrics.response_time > 30.0:  # 30 seconds
            alerts.append({
                'type': 'very_slow_response',
                'severity': 'critical',
                'message': f"Very slow response time: {metrics.response_time:.2f}s",
                'request_id': metrics.request_id,
                'provider': metrics.provider,
                'model': metrics.model
            })

        # Failure alert
        if not metrics.success:
            alerts.append({
                'type': 'request_failure',
                'severity': 'error',
                'message': f"Request failed: {metrics.error_code}",
                'request_id': metrics.request_id,
                'provider': metrics.provider,
                'model': metrics.model
            })

        # Add alerts to list
        self.alerts.extend(alerts)

        # Keep only recent alerts
        if len(self.alerts) > 100:
            self.alerts = self.alerts[-100:]

    def get_performance_summary(self, time_window_minutes: int = 60) -> Dict[str, Any]:
        """Get performance summary for specified time window."""
        if not self.metrics:
            return {'error': 'No metrics available'}

        current_time = time.time()
        cutoff_time = current_time - (time_window_minutes * 60)

        recent_metrics = [
            m for m in self.metrics
            if m.timestamp >= cutoff_time
        ]

        if not recent_metrics:
            return {'error': 'No recent metrics available'}

        # Calculate summary statistics
        response_times = [m.response_time for m in recent_metrics]
        successful_requests = [m for m in recent_metrics if m.success]
        failed_requests = [m for m in recent_metrics if not m.success]
        cache_hits = [m for m in recent_metrics if m.cache_hit]

        summary = {
            'time_window_minutes': time_window_minutes,
            'total_requests': len(recent_metrics),
            'successful_requests': len(successful_requests),
            'failed_requests': len(failed_requests),
            'success_rate_percent': len(successful_requests) / len(recent_metrics) * 100,
            'cache_hit_rate_percent': len(cache_hits) / len(recent_metrics) * 100,
            'response_time_stats': {
                'avg_seconds': statistics.mean(response_times),
                'median_seconds': statistics.median(response_times),
                'min_seconds': min(response_times),
                'max_seconds': max(response_times),
                'std_dev_seconds': statistics.stdev(response_times) if len(response_times) > 1 else 0
            },
            'provider_breakdown': self._get_provider_breakdown(recent_metrics),
            'model_breakdown': self._get_model_breakdown(recent_metrics),
            'recent_alerts': [alert for alert in self.alerts if alert['timestamp'] >= cutoff_time]
        }

        return summary

    def _get_provider_breakdown(self, metrics: List[APIMetrics]) -> Dict[str, Any]:
        """Get performance breakdown by provider."""
        providers = {}
        for metric in metrics:
            provider = metric.provider
            if provider not in providers:
                providers[provider] = {
                    'requests': 0,
                    'successful': 0,
                    'failed': 0,
                    'response_times': [],
                    'cache_hits': 0
                }

            providers[provider]['requests'] += 1
            providers[provider]['response_times'].append(metric.response_time)

            if metric.success:
                providers[provider]['successful'] += 1
            else:
                providers[provider]['failed'] += 1

            if metric.cache_hit:
                providers[provider]['cache_hits'] += 1

        # Calculate statistics for each provider
        for provider, data in providers.items():
            if data['response_times']:
                data['avg_response_time'] = statistics.mean(data['response_times'])
                data['success_rate'] = data['successful'] / data['requests'] * 100
                data['cache_hit_rate'] = data['cache_hits'] / data['requests'] * 100
            else:
                data['avg_response_time'] = 0
                data['success_rate'] = 0
                data['cache_hit_rate'] = 0

        return providers

    def _get_model_breakdown(self, metrics: List[APIMetrics]) -> Dict[str, Any]:
        """Get performance breakdown by model."""
        models = {}
        for metric in metrics:
            model = f"{metric.provider}/{metric.model}"
            if model not in models:
                models[model] = {
                    'requests': 0,
                    'successful': 0,
                    'failed': 0,
                    'response_times': [],
                    'total_tokens': {'input': 0, 'output': 0, 'total': 0},
                    'cache_hits': 0
                }

            models[model]['requests'] += 1
            models[model]['response_times'].append(metric.response_time)

            if metric.success:
                models[model]['successful'] += 1
            else:
                models[model]['failed'] += 1

            if metric.cache_hit:
                models[model]['cache_hits'] += 1

            if metric.tokens_used:
                for token_type, count in metric.tokens_used.items():
                    models[model]['total_tokens'][token_type] += count

        # Calculate statistics for each model
        for model, data in models.items():
            if data['response_times']:
                data['avg_response_time'] = statistics.mean(data['response_times'])
                data['success_rate'] = data['successful'] / data['requests'] * 100
                data['cache_hit_rate'] = data['cache_hits'] / data['requests'] * 100
                data['avg_tokens_per_request'] = data['total_tokens']['total'] / data['requests']
            else:
                data['avg_response_time'] = 0
                data['success_rate'] = 0
                data['cache_hit_rate'] = 0
                data['avg_tokens_per_request'] = 0

        return models

    def get_alerts(self, severity: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
        """Get recent alerts, optionally filtered by severity."""
        alerts = self.alerts

        if severity:
            alerts = [alert for alert in alerts if alert['severity'] == severity]

        return alerts[-limit:] if limit else alerts

    def export_metrics(self, filename: str, format: str = 'json'):
        """Export metrics to file."""
        if format.lower() == 'json':
            data = {
                'metrics': [
                    {
                        'request_id': m.request_id,
                        'provider': m.provider,
                        'model': m.model,
                        'timestamp': m.timestamp,
                        'response_time': m.response_time,
                        'success': m.success,
                        'error_code': m.error_code,
                        'cache_hit': m.cache_hit
                    }
                    for m in self.metrics
                ],
                'real_time_stats': self.real_time_stats,
                'alerts': self.alerts
            }

            with open(filename, 'w') as f:
                json.dump(data, f, indent=2)

        print(f"Metrics exported to {filename}")
```

## Usage Examples and Best Practices

### Complete API Optimization Setup

```python
# Initialize optimization components
batch_processor = BatchProcessor(max_batch_size=5, max_wait_time=1.5)
priority_processor = PriorityProcessor()
smart_cache = SmartCache()
deduplicator = RequestDeduplicator()
performance_monitor = APIPerformanceMonitor()

class OptimizedAIClient:
    """Optimized AI client with all optimization features."""

    def __init__(self):
        self.batch_processor = batch_processor
        self.cache = smart_cache
        self.deduplicator = deduplicator
        self.monitor = performance_monitor

    async def generate_response(self, prompt: str, model: str, context: Dict[str, Any],
                               priority: RequestPriority = RequestPriority.NORMAL) -> str:
        """Generate optimized AI response."""
        # Check cache first
        cached_response = await self.cache.get(prompt, model, context)
        if cached_response:
            return cached_response

        # Create batch request
        request = BatchRequest(
            id=f"req_{int(time.time() * 1000)}",
            prompt=prompt,
            model=model,
            context=context,
            priority=priority.value
        )

        # Execute with deduplication
        response = await self.deduplicator.execute_request(
            prompt, model, context,
            lambda p, m, c: self._execute_api_call(p, m, c)
        )

        # Cache the response
        await self.cache.set(prompt, model, context, response)

        return response

    async def _execute_api_call(self, prompt: str, model: str, context: Dict[str, Any]) -> str:
        """Execute actual API call with monitoring."""
        start_time = time.time()

        try:
            # Simulate API call
            await asyncio.sleep(1.0)  # Simulate network delay
            response = f"AI response to: {prompt[:50]}..."

            # Record metrics
            metrics = APIMetrics(
                request_id=f"req_{int(time.time() * 1000)}",
                provider=context.get('provider', 'openai'),
                model=model,
                endpoint='/chat/completions',
                method='POST',
                timestamp=start_time,
                request_size_bytes=len(prompt.encode()),
                response_size_bytes=len(response.encode()),
                response_time=time.time() - start_time,
                success=True,
                tokens_used={'input': len(prompt.split()), 'output': len(response.split()), 'total': len(prompt.split()) + len(response.split())},
                cache_hit=False
            )

            self.monitor.record_request(metrics)

            return response

        except Exception as e:
            # Record error metrics
            error_metrics = APIMetrics(
                request_id=f"req_{int(time.time() * 1000)}",
                provider=context.get('provider', 'openai'),
                model=model,
                endpoint='/chat/completions',
                method='POST',
                timestamp=start_time,
                request_size_bytes=len(prompt.encode()),
                response_size_bytes=0,
                response_time=time.time() - start_time,
                success=False,
                error_code=str(e)
            )

            self.monitor.record_request(error_metrics)
            raise

# Usage example
async def main():
    client = OptimizedAIClient()

    # Multiple requests will be batched automatically
    responses = await asyncio.gather(*[
        client.generate_response(
            f"What is {topic}?",
            "gpt-3.5-turbo",
            {"user_id": "user1", "session_id": "session1"}
        )
        for topic in ["Python", "machine learning", "data science", "AI", "web development"]
    ])

    for i, response in enumerate(responses):
        print(f"Response {i+1}: {response[:100]}...")

    # Get performance summary
    summary = client.monitor.get_performance_summary(10)  # Last 10 minutes
    print(f"Performance Summary: {summary}")

    # Get cache statistics
    cache_stats = client.cache.get_stats()
    print(f"Cache Statistics: {cache_stats}")

if __name__ == "__main__":
    asyncio.run(main())
```

## Related Documentation

- **[Memory Management](memory-management.md)**: Memory optimization techniques
- **[Caching Strategies](caching-strategies.md)**: Advanced caching patterns
- **[Performance Monitoring](performance-monitoring.md)**: Monitoring and alerting
- **[CLI Commands API](../api-reference/cli-commands.md)**: Command reference

---

*Last updated: October 8, 2025*
*Version: 1.0.0*
*Category: Performance Optimization*