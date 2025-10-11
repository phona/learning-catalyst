# Context Management Implementation Guide

---
title: Context Management Implementation Guide
description: Comprehensive implementation guide for conversation context, compression, and memory management
version: 1.0.0
last_updated: 2025-10-09
difficulty: "Intermediate"
estimated_time: "45 minutes"
---

## Overview

This guide provides detailed implementation patterns for context management in Learning Catalyst, including conversation context tracking, compression algorithms, memory optimization, and debugging features. Context management is essential for maintaining coherent conversations while managing memory usage and performance.

## Context Management Architecture

### Context Management Components

```text
┌─────────────────────────────────────────────────────────────┐
│                 Context Management System                   │
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │  Context Store  │  │  Compression    │  │  Debug Mode  │ │
│  │                 │  │  Engine         │  │  Controller  │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
│           │                    │                    │         │
│           ▼                    ▼                    ▼         │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │            Session & Memory Manager                    │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Core Components

1. **Context Store**: Manages conversation history and context data
2. **Compression Engine**: Optimizes context while preserving essential information
3. **Debug Controller**: Provides detailed logging and monitoring
4. **Rate Limiter**: Controls request timing and pacing
5. **Memory Monitor**: Tracks and optimizes memory usage

## Implementation Guide

### 1. Context Store Implementation

```python
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, asdict
import json
import time
from datetime import datetime, timedelta

@dataclass
class ContextEntry:
    """Single context entry in conversation history."""
    id: str
    timestamp: datetime
    role: str  # 'user', 'assistant', 'system'
    content: str
    tokens_used: int
    metadata: Dict[str, Any]
    importance_score: float = 1.0  # 0.0 to 1.0, used for compression

@dataclass
class ContextSummary:
    """Compressed context summary."""
    summary_text: str
    key_points: List[str]
    preserved_entries: List[str]  # Entry IDs to preserve
    compression_ratio: float
    created_at: datetime

class ContextStore:
    """Manages conversation context and history."""

    def __init__(self, max_context_size: int = 8192, max_entries: int = 100):
        self.max_context_size = max_context_size
        self.max_entries = max_entries
        self.entries: List[ContextEntry] = []
        self.summaries: List[ContextSummary] = []
        self.current_tokens = 0

    def add_entry(self, role: str, content: str, tokens_used: int,
                  metadata: Optional[Dict[str, Any]] = None) -> str:
        """Add a new context entry."""
        entry_id = f"ctx_{int(time.time() * 1000)}"

        entry = ContextEntry(
            id=entry_id,
            timestamp=datetime.now(),
            role=role,
            content=content,
            tokens_used=tokens_used,
            metadata=metadata or {},
            importance_score=self._calculate_importance(role, content)
        )

        self.entries.append(entry)
        self.current_tokens += tokens_used

        # Enforce limits
        self._enforce_limits()

        return entry_id

    def _calculate_importance(self, role: str, content: str) -> float:
        """Calculate importance score for context entry."""
        base_score = 0.5

        # Role-based importance
        if role == 'system':
            base_score += 0.3
        elif role == 'user':
            base_score += 0.2

        # Content-based importance
        content_lower = content.lower()

        # Questions and explanations are important
        if any(keyword in content_lower for keyword in ['explain', 'what is', 'how to', '?']):
            base_score += 0.2

        # Code examples are important
        if '```' in content or any(lang in content_lower for lang in ['python', 'javascript', 'java']):
            base_score += 0.15

        # Errors and solutions are very important
        if any(keyword in content_lower for keyword in ['error', 'issue', 'problem', 'solution', 'fix']):
            base_score += 0.25

        return min(base_score, 1.0)

    def _enforce_limits(self):
        """Enforce context size and entry limits."""
        # Remove oldest entries if exceeding entry limit
        while len(self.entries) > self.max_entries:
            removed = self.entries.pop(0)
            self.current_tokens -= removed.tokens_used

        # Compress if exceeding token limit
        if self.current_tokens > self.max_context_size:
            self._compress_context()

    def get_context_string(self, include_summaries: bool = True) -> str:
        """Get formatted context string for AI requests."""
        context_parts = []

        # Add summaries if available
        if include_summaries and self.summaries:
            latest_summary = self.summaries[-1]
            context_parts.append(f"[Previous Conversation Summary]\n{latest_summary.summary_text}")

            if latest_summary.key_points:
                context_parts.append(f"[Key Points]\n" + "\n".join(f"• {point}" for point in latest_summary.key_points))

        # Add recent entries
        for entry in self.entries:
            role_prefix = {
                'user': 'User',
                'assistant': 'Assistant',
                'system': 'System'
            }.get(entry.role, entry.role.title())

            context_parts.append(f"{role_prefix}: {entry.content}")

        return "\n\n".join(context_parts)

    def get_context_stats(self) -> Dict[str, Any]:
        """Get current context statistics."""
        return {
            'total_entries': len(self.entries),
            'total_tokens': self.current_tokens,
            'max_tokens': self.max_context_size,
            'available_tokens': self.max_context_size - self.current_tokens,
            'summaries_count': len(self.summaries),
            'oldest_entry': self.entries[0].timestamp.isoformat() if self.entries else None,
            'newest_entry': self.entries[-1].timestamp.isoformat() if self.entries else None,
            'utilization_percentage': (self.current_tokens / self.max_context_size) * 100
        }
```

### 2. Compression Engine Implementation

```python
import re
from typing import List, Tuple
from collections import Counter
import hashlib

class ContextCompressor:
    """Compresses conversation context while preserving important information."""

    def __init__(self, target_reduction: float = 0.5):
        self.target_reduction = target_reduction  # Target reduction ratio

    def compress_context(self, entries: List[ContextEntry]) -> Tuple[List[ContextEntry], ContextSummary]:
        """Compress context entries and return reduced entries + summary."""
        if len(entries) < 5:  # Don't compress very short conversations
            return entries, None

        # Calculate target number of entries to keep
        target_entries = max(3, int(len(entries) * (1 - self.target_reduction)))

        # Sort entries by importance and recency
        scored_entries = self._score_entries(entries)

        # Select entries to preserve
        preserved_entries = self._select_entries_to_preserve(scored_entries, target_entries)

        # Generate summary of removed entries
        summary = self._generate_summary(entries, preserved_entries)

        return preserved_entries, summary

    def _score_entries(self, entries: List[ContextEntry]) -> List[Tuple[ContextEntry, float]]:
        """Score entries based on importance and recency."""
        scored = []
        now = datetime.now()

        for entry in entries:
            # Base importance score
            score = entry.importance_score

            # Recency bonus (more recent = higher score)
            hours_ago = (now - entry.timestamp).total_seconds() / 3600
            recency_bonus = max(0, 1 - (hours_ago / 24))  # Decay over 24 hours
            score += recency_bonus * 0.3

            # Length penalty (very long entries might be less essential)
            if len(entry.content) > 1000:
                score *= 0.9

            scored.append((entry, score))

        # Sort by score (descending)
        scored.sort(key=lambda x: x[1], reverse=True)
        return scored

    def _select_entries_to_preserve(self, scored_entries: List[Tuple[ContextEntry, float]],
                                  target_count: int) -> List[ContextEntry]:
        """Select entries to preserve during compression."""
        preserved = []

        # Always preserve system messages and recent entries
        recent_threshold = datetime.now() - timedelta(hours=1)

        for entry, score in scored_entries:
            # Always preserve system messages
            if entry.role == 'system':
                preserved.append(entry)
                continue

            # Always preserve very recent entries
            if entry.timestamp > recent_threshold:
                preserved.append(entry)
                continue

            # Preserve high-scoring entries until target reached
            if len(preserved) < target_count:
                preserved.append(entry)

        return preserved

    def _generate_summary(self, original_entries: List[ContextEntry],
                         preserved_entries: List[ContextEntry]) -> ContextSummary:
        """Generate summary of compressed context."""
        # Find entries that were removed
        preserved_ids = {entry.id for entry in preserved_entries}
        removed_entries = [entry for entry in original_entries if entry.id not in preserved_ids]

        # Extract key information from removed entries
        key_concepts = self._extract_key_concepts(removed_entries)
        topics_discussed = self._extract_topics(removed_entries)

        # Generate summary text
        summary_text = self._create_summary_text(removed_entries, key_concepts, topics_discussed)

        # Calculate compression ratio
        original_tokens = sum(entry.tokens_used for entry in original_entries)
        preserved_tokens = sum(entry.tokens_used for entry in preserved_entries)
        compression_ratio = 1 - (preserved_tokens / original_tokens) if original_tokens > 0 else 0

        return ContextSummary(
            summary_text=summary_text,
            key_points=key_concepts,
            preserved_entries=[entry.id for entry in preserved_entries],
            compression_ratio=compression_ratio,
            created_at=datetime.now()
        )

    def _extract_key_concepts(self, entries: List[ContextEntry]) -> List[str]:
        """Extract key concepts from entries."""
        concepts = []

        for entry in entries:
            # Look for definitions and explanations
            content = entry.content.lower()

            # Find definition patterns
            definition_patterns = [
                r'(\w+) is (?:a |an )?([^.]*)',
                r'(\w+) refers to ([^.}]*)',
                r'definition of (\w+)[^:]*: ([^.}]*)',
            ]

            for pattern in definition_patterns:
                matches = re.findall(pattern, content, re.IGNORECASE)
                for match in matches:
                    if isinstance(match, tuple):
                        concept = match[0].strip()
                        definition = match[1].strip() if len(match) > 1 else ""
                        if len(concept) > 2 and len(definition) > 5:
                            concepts.append(f"{concept}: {definition}")

            # Look for code-related concepts
            if '```' in entry.content:
                # Extract language and purpose
                code_match = re.search(r'```(\w+)', entry.content)
                if code_match:
                    language = code_match.group(1)
                    concepts.append(f"Code example in {language}")

        # Remove duplicates and limit to most important
        unique_concepts = list(set(concepts))
        return unique_concepts[:10]  # Limit to top 10 concepts

    def _extract_topics(self, entries: List[ContextEntry]) -> List[str]:
        """Extract main topics from entries."""
        topic_keywords = Counter()

        # Common technical topics
        technical_topics = [
            'python', 'javascript', 'react', 'node', 'database', 'api',
            'algorithm', 'data structure', 'machine learning', 'ai',
            'web development', 'frontend', 'backend', 'cloud', 'docker'
        ]

        for entry in entries:
            content_lower = entry.content.lower()
            for topic in technical_topics:
                if topic in content_lower:
                    topic_keywords[topic] += 1

        # Return most common topics
        return [topic for topic, count in topic_keywords.most_common(5)]

    def _create_summary_text(self, removed_entries: List[ContextEntry],
                           key_concepts: List[str], topics: List[str]) -> str:
        """Create human-readable summary text."""
        summary_parts = []

        # Topics discussed
        if topics:
            summary_parts.append(f"Topics discussed: {', '.join(topics)}")

        # Key concepts learned
        if key_concepts:
            summary_parts.append(f"Key concepts: {'; '.join(key_concepts[:3])}")

        # Number of interactions compressed
        summary_parts.append(f"Compressed {len(removed_entries)} conversation turns")

        return ". ".join(summary_parts) + "."
```

### 3. Debug Mode Controller

```python
import logging
import time
from typing import Dict, Any, Optional
from dataclasses import dataclass

@dataclass
class APICallMetrics:
    """Metrics for individual API calls."""
    request_id: str
    timestamp: datetime
    provider: str
    model: str
    request_tokens: int
    response_tokens: int
    response_time: float
    success: bool
    error_message: Optional[str] = None

class DebugController:
    """Controls debug mode and provides detailed monitoring."""

    def __init__(self):
        self.debug_enabled = False
        self.logger = self._setup_logger()
        self.api_metrics: List[APICallMetrics] = []
        self.context_snapshots: List[Dict[str, Any]] = []

    def _setup_logger(self) -> logging.Logger:
        """Set up debug logger."""
        logger = logging.getLogger('learning_catalyst_debug')
        logger.setLevel(logging.DEBUG)

        # Create console handler
        handler = logging.StreamHandler()
        handler.setLevel(logging.DEBUG)

        # Create formatter
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        handler.setFormatter(formatter)

        logger.addHandler(handler)
        return logger

    def enable_debug_mode(self):
        """Enable debug mode."""
        self.debug_enabled = True
        self.logger.info("Debug mode enabled")

    def disable_debug_mode(self):
        """Disable debug mode."""
        self.debug_enabled = False
        self.logger.info("Debug mode disabled")

    def log_api_call(self, request_id: str, provider: str, model: str,
                    request_tokens: int, response_tokens: int,
                    response_time: float, success: bool,
                    error_message: Optional[str] = None):
        """Log API call metrics."""
        metrics = APICallMetrics(
            request_id=request_id,
            timestamp=datetime.now(),
            provider=provider,
            model=model,
            request_tokens=request_tokens,
            response_tokens=response_tokens,
            response_time=response_time,
            success=success,
            error_message=error_message
        )

        self.api_metrics.append(metrics)

        if self.debug_enabled:
            self._log_api_call_details(metrics)

    def _log_api_call_details(self, metrics: APICallMetrics):
        """Log detailed API call information."""
        if metrics.success:
            self.logger.info(
                f"API Call - {metrics.provider}/{metrics.model} | "
                f"Tokens: {metrics.request_tokens}→{metrics.response_tokens} | "
                f"Time: {metrics.response_time:.2f}s | "
                f"Cost: ${self._calculate_cost(metrics):.4f}"
            )
        else:
            self.logger.error(
                f"API Call Failed - {metrics.provider}/{metrics.model} | "
                f"Error: {metrics.error_message}"
            )

    def _calculate_cost(self, metrics: APICallMetrics) -> float:
        """Calculate estimated cost for API call."""
        # Simplified cost calculation (would use actual provider pricing)
        provider_costs = {
            'openai': {'input': 0.03, 'output': 0.06},
            'deepseek': {'input': 0.14, 'output': 0.28},
            'anthropic': {'input': 3.00, 'output': 15.00}
        }

        costs = provider_costs.get(metrics.provider, {'input': 0.01, 'output': 0.02})

        input_cost = (metrics.request_tokens / 1000) * costs['input']
        output_cost = (metrics.response_tokens / 1000) * costs['output']

        return input_cost + output_cost

    def log_context_snapshot(self, context_stats: Dict[str, Any]):
        """Log context usage snapshot."""
        self.context_snapshots.append({
            'timestamp': datetime.now(),
            'stats': context_stats.copy()
        })

        if self.debug_enabled:
            self.logger.info(
                f"Context Usage - {context_stats['total_tokens']}/{context_stats['max_tokens']} tokens "
                f"({context_stats['utilization_percentage']:.1f}%)"
            )

    def get_debug_summary(self) -> Dict[str, Any]:
        """Get comprehensive debug summary."""
        if not self.api_metrics:
            return {'message': 'No API calls recorded'}

        # Calculate statistics
        total_calls = len(self.api_metrics)
        successful_calls = sum(1 for m in self.api_metrics if m.success)
        failed_calls = total_calls - successful_calls

        total_tokens = sum(m.request_tokens + m.response_tokens for m in self.api_metrics)
        total_cost = sum(self._calculate_cost(m) for m in self.api_metrics)
        avg_response_time = sum(m.response_time for m in self.api_metrics) / total_calls

        # Provider breakdown
        provider_stats = {}
        for metrics in self.api_metrics:
            if metrics.provider not in provider_stats:
                provider_stats[metrics.provider] = {
                    'calls': 0,
                    'tokens': 0,
                    'cost': 0.0,
                    'avg_time': 0.0
                }

            stats = provider_stats[metrics.provider]
            stats['calls'] += 1
            stats['tokens'] += metrics.request_tokens + metrics.response_tokens
            stats['cost'] += self._calculate_cost(metrics)
            stats['avg_time'] += metrics.response_time

        # Calculate averages
        for stats in provider_stats.values():
            stats['avg_time'] = stats['avg_time'] / stats['calls']

        return {
            'debug_enabled': self.debug_enabled,
            'api_calls': {
                'total': total_calls,
                'successful': successful_calls,
                'failed': failed_calls,
                'success_rate': (successful_calls / total_calls) * 100 if total_calls > 0 else 0
            },
            'usage': {
                'total_tokens': total_tokens,
                'total_cost': total_cost,
                'avg_response_time': avg_response_time
            },
            'providers': provider_stats,
            'context_snapshots': len(self.context_snapshots)
        }
```

### 4. Rate Limiter Implementation

```python
import asyncio
import time
from typing import Dict, Optional
from dataclasses import dataclass
from datetime import datetime, timedelta

@dataclass
class RateLimitRule:
    """Rate limiting rule for a provider."""
    requests_per_minute: int
    tokens_per_minute: int
    requests_per_hour: Optional[int] = None
    tokens_per_hour: Optional[int] = None

class RateLimiter:
    """Manages API rate limiting and request timing."""

    def __init__(self):
        self.provider_rules: Dict[str, RateLimitRule] = {
            'openai': RateLimitRule(
                requests_per_minute=60,
                tokens_per_minute=90000,  # 90K tokens/min for GPT-4
                requests_per_hour=3500,
                tokens_per_hour=200000
            ),
            'deepseek': RateLimitRule(
                requests_per_minute=60,
                tokens_per_minute=320000,  # 320K tokens/min
                requests_per_hour=2000,
                tokens_per_hour=10000000  # 10M tokens/hour
            ),
            'anthropic': RateLimitRule(
                requests_per_minute=50,
                tokens_per_minute=40000,   # 40K tokens/min
                requests_per_hour=5000,
                tokens_per_hour=5000000   # 5M tokens/hour
            )
        }

        self.request_history: Dict[str, List[datetime]] = {}
        self.token_history: Dict[str, List[Tuple[datetime, int]]] = {}

    async def wait_if_needed(self, provider: str, tokens: int = 0) -> float:
        """Wait if rate limit would be exceeded, returns wait time."""
        rule = self.provider_rules.get(provider)
        if not rule:
            return 0.0

        current_time = datetime.now()
        wait_times = []

        # Check per-minute limits
        wait_times.append(self._check_minute_limit(provider, rule, current_time, tokens))

        # Check per-hour limits if defined
        if rule.requests_per_hour or rule.tokens_per_hour:
            wait_times.append(self._check_hour_limit(provider, rule, current_time, tokens))

        max_wait = max(wait_times) if wait_times else 0.0

        if max_wait > 0:
            await asyncio.sleep(max_wait)

        return max_wait

    def _check_minute_limit(self, provider: str, rule: RateLimitRule,
                          current_time: datetime, tokens: int) -> float:
        """Check and enforce per-minute rate limits."""
        cutoff_time = current_time - timedelta(minutes=1)

        # Clean old history
        if provider in self.request_history:
            self.request_history[provider] = [
                req_time for req_time in self.request_history[provider]
                if req_time > cutoff_time
            ]

        if provider in self.token_history:
            self.token_history[provider] = [
                (req_time, req_tokens) for req_time, req_tokens in self.token_history[provider]
                if req_time > cutoff_time
            ]

        # Check current usage
        recent_requests = len(self.request_history.get(provider, []))
        recent_tokens = sum(tokens for _, tokens in self.token_history.get(provider, []))

        # Calculate wait times
        request_wait = 0.0
        token_wait = 0.0

        if recent_requests >= rule.requests_per_minute:
            # Find oldest request and calculate wait time
            if self.request_history[provider]:
                oldest_request = min(self.request_history[provider])
                request_wait = 60.0 - (current_time - oldest_request).total_seconds()

        if recent_tokens + tokens > rule.tokens_per_minute:
            # Calculate time needed for token limit to reset
            if self.token_history[provider]:
                tokens_needed = rule.tokens_per_minute - recent_tokens
                if tokens_needed <= 0:
                    oldest_token_time = min(time for time, _ in self.token_history[provider])
                    token_wait = 60.0 - (current_time - oldest_token_time).total_seconds()

        return max(0.0, request_wait, token_wait)

    def _check_hour_limit(self, provider: str, rule: RateLimitRule,
                        current_time: datetime, tokens: int) -> float:
        """Check and enforce per-hour rate limits."""
        cutoff_time = current_time - timedelta(hours=1)

        # Clean old history (reuse minute history but filter by hour)
        if provider in self.request_history:
            recent_requests = [
                req_time for req_time in self.request_history[provider]
                if req_time > cutoff_time
            ]
        else:
            recent_requests = []

        if provider in self.token_history:
            recent_tokens = sum(
                tokens for req_time, tokens in self.token_history[provider]
                if req_time > cutoff_time
            )
        else:
            recent_tokens = 0

        # Calculate wait times
        request_wait = 0.0
        token_wait = 0.0

        if rule.requests_per_hour and recent_requests >= rule.requests_per_hour:
            if recent_requests:
                oldest_request = min(recent_requests)
                request_wait = 3600.0 - (current_time - oldest_request).total_seconds()

        if rule.tokens_per_hour and recent_tokens + tokens > rule.tokens_per_hour:
            if recent_tokens > 0:
                oldest_token_time = min(
                    time for time, _ in self.token_history[provider]
                    if time > cutoff_time
                )
                token_wait = 3600.0 - (current_time - oldest_token_time).total_seconds()

        return max(0.0, request_wait, token_wait)

    def record_request(self, provider: str, tokens: int):
        """Record a completed API request."""
        current_time = datetime.now()

        if provider not in self.request_history:
            self.request_history[provider] = []
        if provider not in self.token_history:
            self.token_history[provider] = []

        self.request_history[provider].append(current_time)
        self.token_history[provider].append((current_time, tokens))

        # Clean old history periodically
        self._cleanup_old_history()

    def _cleanup_old_history(self):
        """Clean up old request history to prevent memory leaks."""
        cutoff_time = datetime.now() - timedelta(hours=2)

        for provider in list(self.request_history.keys()):
            self.request_history[provider] = [
                req_time for req_time in self.request_history[provider]
                if req_time > cutoff_time
            ]

            # Remove empty provider entries
            if not self.request_history[provider]:
                del self.request_history[provider]

        for provider in list(self.token_history.keys()):
            self.token_history[provider] = [
                (req_time, tokens) for req_time, tokens in self.token_history[provider]
                if req_time > cutoff_time
            ]

            # Remove empty provider entries
            if not self.token_history[provider]:
                del self.token_history[provider]

    def get_rate_limit_status(self, provider: str) -> Dict[str, Any]:
        """Get current rate limit status for a provider."""
        rule = self.provider_rules.get(provider)
        if not rule:
            return {'error': f'No rate limit rules for provider: {provider}'}

        current_time = datetime.now()
        minute_cutoff = current_time - timedelta(minutes=1)
        hour_cutoff = current_time - timedelta(hours=1)

        # Calculate current usage
        recent_requests = len([
            req_time for req_time in self.request_history.get(provider, [])
            if req_time > minute_cutoff
        ])

        recent_tokens = sum(
            tokens for req_time, tokens in self.token_history.get(provider, [])
            if req_time > minute_cutoff
        )

        hourly_requests = len([
            req_time for req_time in self.request_history.get(provider, [])
            if req_time > hour_cutoff
        ])

        hourly_tokens = sum(
            tokens for req_time, tokens in self.token_history.get(provider, [])
            if req_time > hour_cutoff
        )

        return {
            'provider': provider,
            'per_minute': {
                'requests_used': recent_requests,
                'requests_limit': rule.requests_per_minute,
                'requests_remaining': max(0, rule.requests_per_minute - recent_requests),
                'tokens_used': recent_tokens,
                'tokens_limit': rule.tokens_per_minute,
                'tokens_remaining': max(0, rule.tokens_per_minute - recent_tokens)
            },
            'per_hour': {
                'requests_used': hourly_requests,
                'requests_limit': rule.requests_per_hour,
                'requests_remaining': max(0, rule.requests_per_hour - hourly_requests) if rule.requests_per_hour else None,
                'tokens_used': hourly_tokens,
                'tokens_limit': rule.tokens_per_hour,
                'tokens_remaining': max(0, rule.tokens_per_hour - hourly_tokens) if rule.tokens_per_hour else None
            }
        }
```

### 5. Integrated Context Manager

```python
class ContextManager:
    """Main context management system integrating all components."""

    def __init__(self, max_context_size: int = 8192, debug_mode: bool = False):
        self.context_store = ContextStore(max_context_size)
        self.compressor = ContextCompressor()
        self.debug_controller = DebugController()
        self.rate_limiter = RateLimiter()

        if debug_mode:
            self.debug_controller.enable_debug_mode()

    async def add_message(self, role: str, content: str, tokens_used: int,
                         metadata: Optional[Dict[str, Any]] = None) -> str:
        """Add a message to the conversation context."""
        entry_id = self.context_store.add_entry(role, content, tokens_used, metadata)

        # Log context snapshot if debug mode is enabled
        if self.debug_controller.debug_enabled:
            self.debug_controller.log_context_snapshot(
                self.context_store.get_context_stats()
            )

        return entry_id

    def get_context_for_request(self, include_summaries: bool = True) -> str:
        """Get formatted context for AI request."""
        return self.context_store.get_context_string(include_summaries)

    async def compress_context(self) -> Dict[str, Any]:
        """Manually trigger context compression."""
        if len(self.context_store.entries) < 5:
            return {
                'success': False,
                'message': 'Context too short for compression',
                'entries_before': len(self.context_store.entries),
                'entries_after': len(self.context_store.entries)
            }

        original_entries = self.context_store.entries.copy()
        preserved_entries, summary = self.compressor.compress_context(original_entries)

        # Update context store
        self.context_store.entries = preserved_entries
        self.context_store.summaries.append(summary)

        # Recalculate token count
        self.context_store.current_tokens = sum(entry.tokens_used for entry in preserved_entries)

        if self.debug_controller.debug_enabled:
            self.debug_controller.logger.info(
                f"Context compressed: {len(original_entries)} → {len(preserved_entries)} entries "
                f"({summary.compression_ratio:.1%} reduction)"
            )

        return {
            'success': True,
            'entries_before': len(original_entries),
            'entries_after': len(preserved_entries),
            'compression_ratio': summary.compression_ratio,
            'summary_text': summary.summary_text,
            'key_points': summary.key_points
        }

    async def wait_for_rate_limit(self, provider: str, tokens: int = 0) -> float:
        """Wait if rate limit would be exceeded."""
        wait_time = await self.rate_limiter.wait_if_needed(provider, tokens)

        if wait_time > 0 and self.debug_controller.debug_enabled:
            self.debug_controller.logger.info(
                f"Rate limiting: waiting {wait_time:.1f}s for {provider}"
            )

        return wait_time

    def record_api_usage(self, provider: str, model: str, request_tokens: int,
                        response_tokens: int, response_time: float,
                        success: bool, error_message: Optional[str] = None):
        """Record API usage for debugging and rate limiting."""
        request_id = f"req_{int(time.time() * 1000)}"

        # Log to debug controller
        self.debug_controller.log_api_call(
            request_id, provider, model, request_tokens,
            response_tokens, response_time, success, error_message
        )

        # Record for rate limiting
        total_tokens = request_tokens + response_tokens
        self.rate_limiter.record_request(provider, total_tokens)

    def get_status(self) -> Dict[str, Any]:
        """Get comprehensive context management status."""
        context_stats = self.context_store.get_context_stats()
        debug_summary = self.debug_controller.get_debug_summary()

        # Get rate limit status for common providers
        rate_limit_status = {}
        for provider in ['openai', 'deepseek', 'anthropic']:
            rate_limit_status[provider] = self.rate_limiter.get_rate_limit_status(provider)

        return {
            'context': context_stats,
            'debug': debug_summary,
            'rate_limits': rate_limit_status,
            'compression_available': len(self.context_store.entries) >= 5,
            'debug_enabled': self.debug_controller.debug_enabled
        }

    def toggle_debug_mode(self) -> bool:
        """Toggle debug mode on/off."""
        if self.debug_controller.debug_enabled:
            self.debug_controller.disable_debug_mode()
            return False
        else:
            self.debug_controller.enable_debug_mode()
            return True
```

## Command Implementation

### Context Command Implementation

```python
from src.cli.commands import BaseCommand
from src.api.response import Response
from src.context.context_manager import ContextManager
import argparse

class ContextCommand(BaseCommand):
    """Context management command."""

    def __init__(self):
        super().__init__()
        self.name = "context"
        self.description = "Monitor and manage conversation context"
        self.aliases = ["ctx"]
        self.category = "system"

    def add_arguments(self, parser: argparse.ArgumentParser):
        """Add context command arguments."""
        parser.add_argument(
            '--detailed', '-d',
            action='store_true',
            help='Show detailed context information'
        )
        parser.add_argument(
            '--format', '-f',
            choices=['text', 'json'],
            default='text',
            help='Output format'
        )

    async def execute(self, args: argparse.Namespace, context: CommandContext) -> Response:
        """Execute context command."""
        try:
            context_manager = getattr(context, 'context_manager', None)
            if not context_manager:
                return Response.error(
                    "CONTEXT_MANAGER_UNAVAILABLE",
                    "Context manager not available in current context"
                )

            status = context_manager.get_status()
            context_stats = status['context']

            if args.format == 'json':
                return Response.success({
                    'context_stats': context_stats,
                    'full_status': status if args.detailed else None
                })

            # Format text output
            output_lines = [
                "= Context Usage:",
                f"  Current: {context_stats['total_tokens']:,} tokens",
                f"  Maximum: {context_stats['max_tokens']:,} tokens",
                f"  Available: {context_stats['available_tokens']:,} tokens",
                f"  Utilization: {context_stats['utilization_percentage']:.1f}%",
                f"  Entries: {context_stats['total_entries']}",
                f"  Summaries: {context_stats['summaries_count']}"
            ]

            if args.detailed:
                output_lines.extend([
                    "",
                    "= Detailed Information:",
                    f"  Oldest Entry: {context_stats['oldest_entry']}",
                    f"  Newest Entry: {context_stats['newest_entry']}",
                    f"  Compression Available: {status['compression_available']}",
                    f"  Debug Mode: {'Enabled' if status['debug_enabled'] else 'Disabled'}"
                ])

                # Add rate limit information
                output_lines.append("")
                output_lines.append("= Rate Limits:")
                for provider, limits in status['rate_limits'].items():
                    if 'error' not in limits:
                        minute_limits = limits['per_minute']
                        output_lines.append(
                            f"  {provider.title()}: "
                            f"{minute_limits['requests_used']}/{minute_limits['requests_limit']} req/min, "
                            f"{minute_limits['tokens_used']:,}/{minute_limits['tokens_limit']:,} tokens/min"
                        )

            return Response.success({
                'message': '\n'.join(output_lines),
                'context_stats': context_stats
            })

        except Exception as e:
            return Response.error(
                "CONTEXT_COMMAND_ERROR",
                f"Error executing context command: {str(e)}"
            )

class CompressCommand(BaseCommand):
    """Context compression command."""

    def __init__(self):
        super().__init__()
        self.name = "compress"
        self.description = "Compress conversation context to save memory"
        self.aliases = ["comp"]
        self.category = "system"

    async def execute(self, args: argparse.Namespace, context: CommandContext) -> Response:
        """Execute compress command."""
        try:
            context_manager = getattr(context, 'context_manager', None)
            if not context_manager:
                return Response.error(
                    "CONTEXT_MANAGER_UNAVAILABLE",
                    "Context manager not available in current context"
                )

            result = await context_manager.compress_context()

            if result['success']:
                output_lines = [
                    "✅ Conversation compressed successfully",
                    f"  Entries: {result['entries_before']} → {result['entries_after']}",
                    f"  Compression: {result['compression_ratio']:.1%} reduction",
                    f"  Summary: {result['summary_text']}"
                ]

                if result['key_points']:
                    output_lines.append("  Key Points Preserved:")
                    for point in result['key_points'][:3]:  # Show top 3
                        output_lines.append(f"    • {point}")

                return Response.success({
                    'message': '\n'.join(output_lines),
                    'compression_result': result
                })
            else:
                return Response.success({
                    'message': f"⚠️ {result['message']}",
                    'compression_result': result
                })

        except Exception as e:
            return Response.error(
                "COMPRESS_COMMAND_ERROR",
                f"Error compressing context: {str(e)}"
            )

class WaitCommand(BaseCommand):
    """Wait command for rate limiting and pacing."""

    def __init__(self):
        super().__init__()
        self.name = "wait"
        self.description = "Wait for specified number of seconds"
        self.aliases = ["w"]
        self.category = "system"

    def add_arguments(self, parser: argparse.ArgumentParser):
        """Add wait command arguments."""
        parser.add_argument(
            'seconds',
            type=int,
            help='Number of seconds to wait'
        )
        parser.add_argument(
            '--reason',
            help='Reason for waiting (displayed during wait)'
        )

    async def execute(self, args: argparse.Namespace, context: CommandContext) -> Response:
        """Execute wait command."""
        try:
            if args.seconds <= 0:
                return Response.error(
                    "INVALID_WAIT_TIME",
                    "Wait time must be a positive integer"
                )

            # Display wait message
            reason_text = f" ({args.reason})" if args.reason else ""
            wait_message = f"✓ Waiting {args.seconds} seconds{reason_text}..."

            # Perform the wait
            import asyncio
            await asyncio.sleep(args.seconds)

            return Response.success({
                'message': wait_message,
                'wait_time': args.seconds,
                'reason': args.reason
            })

        except Exception as e:
            return Response.error(
                "WAIT_COMMAND_ERROR",
                f"Error during wait: {str(e)}"
            )

class VerboseCommand(BaseCommand):
    """Verbose mode toggle command."""

    def __init__(self):
        super().__init__()
        self.name = "verbose"
        self.description = "Toggle verbose debug mode"
        self.aliases = ["debug", "vb"]
        self.category = "system"

    def add_arguments(self, parser: argparse.ArgumentParser):
        """Add verbose command arguments."""
        parser.add_argument(
            'state',
            choices=['on', 'off'],
            nargs='?',
            help='Turn verbose mode on or off (omit to toggle)'
        )

    async def execute(self, args: argparse.Namespace, context: CommandContext) -> Response:
        """Execute verbose command."""
        try:
            context_manager = getattr(context, 'context_manager', None)
            if not context_manager:
                return Response.error(
                    "CONTEXT_MANAGER_UNAVAILABLE",
                    "Context manager not available in current context"
                )

            # Determine desired state
            if args.state:
                desired_state = args.state == 'on'
                current_state = context_manager.debug_controller.debug_enabled

                if current_state == desired_state:
                    state_text = "already" if desired_state else "not"
                    return Response.success({
                        'message': f"Verbose mode is {state_text} {args.state}"
                    })

                # Set desired state
                if desired_state:
                    context_manager.debug_controller.enable_debug_mode()
                    result_state = True
                else:
                    context_manager.debug_controller.disable_debug_mode()
                    result_state = False
            else:
                # Toggle current state
                result_state = context_manager.toggle_debug_mode()

            state_text = "enabled" if result_state else "disabled"
            return Response.success({
                'message': f"= Verbose mode {state_text}",
                'verbose_state': result_state
            })

        except Exception as e:
            return Response.error(
                "VERBOSE_COMMAND_ERROR",
                f"Error toggling verbose mode: {str(e)}"
            )
```

## Usage Examples

### Basic Context Management

```python
# Initialize context manager
context_manager = ContextManager(max_context_size=8192, debug_mode=True)

# Add conversation messages
await context_manager.add_message('user', 'What is machine learning?', 25)
await context_manager.add_message('assistant', 'Machine learning is...', 150)

# Get context for API request
context_string = context_manager.get_context_for_request()

# Check context status
status = context_manager.get_status()
print(f"Context usage: {status['context']['utilization_percentage']:.1f}%")
```

### Compression Workflow

```python
# When context gets large, compress it
if status['context']['utilization_percentage'] > 80:
    compression_result = await context_manager.compress_context()
    print(f"Compressed context by {compression_result['compression_ratio']:.1%}")
```

### Rate Limiting

```python
# Before API call, wait if needed
provider = 'openai'
tokens_needed = 500

wait_time = await context_manager.wait_for_rate_limit(provider, tokens_needed)
if wait_time > 0:
    print(f"Waited {wait_time:.1f}s due to rate limits")

# Make API call...
response = await make_api_call(prompt, provider)

# Record usage
context_manager.record_api_usage(
    provider, 'gpt-4', 50, 200, 1.5, True
)
```

### Debug Mode

```python
# Enable debug mode
context_manager.debug_controller.enable_debug_mode()

# API calls will now be logged with detailed information
# Context usage will be tracked automatically

# Get debug summary
debug_summary = context_manager.debug_controller.get_debug_summary()
print(f"Total API cost: ${debug_summary['usage']['total_cost']:.4f}")
```

## Testing

### Unit Tests

```python
import pytest
from unittest.mock import AsyncMock
from src.context.context_manager import ContextManager, ContextStore

class TestContextStore:
    def test_add_entry(self):
        """Test adding context entries."""
        store = ContextStore(max_context_size=100, max_entries=10)

        entry_id = store.add_entry('user', 'Hello', 5)
        assert entry_id.startswith('ctx_')
        assert len(store.entries) == 1
        assert store.current_tokens == 5

    def test_context_limit_enforcement(self):
        """Test context size limit enforcement."""
        store = ContextStore(max_context_size=100, max_entries=5)

        # Add entries that exceed the limit
        for i in range(10):
            store.add_entry('user', f'Message {i}', 15)

        # Should enforce limits
        assert len(store.entries) <= 5
        assert store.current_tokens <= 100

    def test_importance_scoring(self):
        """Test importance scoring algorithm."""
        store = ContextStore()

        # System messages should have higher importance
        system_score = store._calculate_importance('system', 'System instructions')
        user_score = store._calculate_importance('user', 'Regular message')

        assert system_score > user_score

class TestContextCompressor:
    def test_compression(self):
        """Test context compression."""
        from src.context.context_manager import ContextCompressor

        compressor = ContextCompressor(target_reduction=0.5)

        # Create test entries
        entries = []
        for i in range(10):
            entries.append(ContextEntry(
                id=f"ctx_{i}",
                timestamp=datetime.now(),
                role='user' if i % 2 == 0 else 'assistant',
                content=f"Message {i}",
                tokens_used=10,
                metadata={},
                importance_score=0.5
            ))

        preserved, summary = compressor.compress_context(entries)

        assert len(preserved) < len(entries)
        assert summary is not None
        assert summary.compression_ratio > 0

    def test_key_concept_extraction(self):
        """Test key concept extraction."""
        compressor = ContextCompressor()

        entries = [
            ContextEntry(
                id="1", timestamp=datetime.now(), role='assistant',
                content="Python is a high-level programming language.",
                tokens_used=10, metadata={}, importance_score=0.8
            )
        ]

        concepts = compressor._extract_key_concepts(entries)
        assert len(concepts) > 0
        assert any('python' in concept.lower() for concept in concepts)

class TestRateLimiter:
    @pytest.mark.asyncio
    async def test_rate_limiting(self):
        """Test rate limiting functionality."""
        from src.context.context_manager import RateLimiter

        limiter = RateLimiter()

        # Add some requests to history
        current_time = datetime.now()
        for i in range(30):  # Add 30 requests (should trigger rate limit for some providers)
            limiter.record_request('openai', 100)

        # Next request should trigger wait
        wait_time = await limiter.wait_if_needed('openai', 100)
        assert wait_time >= 0  # Should wait if rate limit exceeded

    def test_rate_limit_status(self):
        """Test rate limit status reporting."""
        limiter = RateLimiter()

        status = limiter.get_rate_limit_status('openai')

        assert 'provider' in status
        assert 'per_minute' in status
        assert 'requests_used' in status['per_minute']
        assert 'requests_limit' in status['per_minute']
```

### Integration Tests

```python
@pytest.mark.asyncio
async def test_full_context_workflow():
    """Test complete context management workflow."""
    context_manager = ContextManager(max_context_size=1000, debug_mode=True)

    # Add conversation
    await context_manager.add_message('user', 'Explain Python decorators', 8)
    await context_manager.add_message('assistant', 'Python decorators are...', 200)

    # Check status
    status = context_manager.get_status()
    assert status['context']['total_entries'] == 2
    assert status['debug_enabled'] == True

    # Test rate limiting
    wait_time = await context_manager.wait_for_rate_limit('openai', 100)
    assert isinstance(wait_time, float)

    # Record API usage
    context_manager.record_api_usage('openai', 'gpt-4', 8, 200, 1.5, True)

    # Check debug summary
    debug_summary = context_manager.debug_controller.get_debug_summary()
    assert debug_summary['api_calls']['total'] == 1

    # Test compression
    if status['compression_available']:
        result = await context_manager.compress_context()
        assert result['success'] == True
```

## Best Practices

### Context Management

1. **Set Appropriate Limits**: Configure context size based on model capabilities
2. **Monitor Usage**: Regularly check context utilization to prevent overflow
3. **Use Compression**: Compress context when approaching limits
4. **Preserve Important Information**: Ensure critical context isn't lost during compression

### Rate Limiting

1. **Know Provider Limits**: Understand rate limits for each AI provider
2. **Implement Graceful Waiting**: Use async waiting to avoid blocking
3. **Track Usage**: Monitor request patterns and token consumption
4. **Handle Errors**: Implement proper error handling for rate limit violations

### Debug Mode

1. **Use in Development**: Enable debug mode during development and testing
2. **Monitor Costs**: Track API usage and costs in real-time
3. **Log Key Events**: Log important events for troubleshooting
4. **Control Verbosity**: Provide different levels of debug output

### Performance

1. **Clean History**: Regularly clean old request history
2. **Optimize Storage**: Use efficient data structures for context storage
3. **Async Operations**: Use async/await for I/O operations
4. **Memory Management**: Monitor and optimize memory usage

---

*Last updated: October 9, 2025*
*Version: 1.0.0*
*Category: Implementation Guides*