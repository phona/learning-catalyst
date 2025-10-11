# Analytics Implementation Guide

---
title: Analytics Implementation Guide
description: Comprehensive implementation guide for usage tracking, token monitoring, and learning analytics
version: 1.0.0
last_updated: 2025-10-09
difficulty: "Intermediate"
estimated_time: "60 minutes"
---

## Overview

This guide provides detailed implementation patterns for analytics in Learning Catalyst, including token usage tracking, cost monitoring, learning progress analytics, and performance metrics. The analytics system provides insights into usage patterns, learning effectiveness, and system performance.

## Analytics Architecture

### Analytics Components

```text
┌─────────────────────────────────────────────────────────────┐
│                    Analytics System                          │
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │  Usage Tracker  │  │  Cost Monitor   │  │  Performance │ │
│  │                 │  │                 │  │  Analyzer    │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
│           │                    │                    │         │
│           ▼                    ▼                    ▼         │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │            Analytics Data Store                         │ │
│  └─────────────────────────────────────────────────────────┘ │
│           │                    │                    │         │
│           ▼                    ▼                    ▼         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │  Dashboard API  │  │  Export Engine  │  │  Alert Sys   │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Core Components

1. **Usage Tracker**: Tracks API calls, token usage, and interaction patterns
2. **Cost Monitor**: Calculates and tracks costs across different providers
3. **Performance Analyzer**: Analyzes response times, error rates, and system performance
4. **Analytics Data Store**: Persistent storage for analytics data
5. **Dashboard API**: Provides data for visualization and reporting
6. **Export Engine**: Handles data export in various formats
7. **Alert System**: Monitors thresholds and sends notifications

## Implementation Guide

### 1. Usage Tracking System

```python
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
import json
import sqlite3
from enum import Enum

class InteractionType(Enum):
    """Types of interactions to track."""
    AI_REQUEST = "ai_request"
    COMMAND_EXECUTION = "command_execution"
    CHECKPOINT_SAVE = "checkpoint_save"
    CHECKPOINT_LOAD = "checkpoint_load"
    CONFIG_CHANGE = "config_change"
    ERROR_OCCURRED = "error_occurred"

@dataclass
class UsageRecord:
    """Single usage record."""
    id: str
    timestamp: datetime
    user_id: str
    session_id: str
    interaction_type: InteractionType
    details: Dict[str, Any]
    metadata: Dict[str, Any]

@dataclass
class TokenUsage:
    """Token usage record for API calls."""
    record_id: str
    provider: str
    model: str
    input_tokens: int
    output_tokens: int
    total_tokens: int
    cost: float
    response_time: float
    success: bool
    error_message: Optional[str] = None

class UsageTracker:
    """Tracks system usage and interactions."""

    def __init__(self, db_path: str):
        self.db_path = db_path
        self._init_database()

    def _init_database(self):
        """Initialize analytics database."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()

            # Usage records table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS usage_records (
                    id TEXT PRIMARY KEY,
                    timestamp DATETIME NOT NULL,
                    user_id TEXT NOT NULL,
                    session_id TEXT NOT NULL,
                    interaction_type TEXT NOT NULL,
                    details TEXT NOT NULL,
                    metadata TEXT NOT NULL
                )
            """)

            # Token usage table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS token_usage (
                    record_id TEXT PRIMARY KEY,
                    timestamp DATETIME NOT NULL,
                    user_id TEXT NOT NULL,
                    session_id TEXT NOT NULL,
                    provider TEXT NOT NULL,
                    model TEXT NOT NULL,
                    input_tokens INTEGER NOT NULL,
                    output_tokens INTEGER NOT NULL,
                    total_tokens INTEGER NOT NULL,
                    cost REAL NOT NULL,
                    response_time REAL NOT NULL,
                    success BOOLEAN NOT NULL,
                    error_message TEXT
                )
            """)

            # Create indexes for performance
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_usage_timestamp ON usage_records(timestamp)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_usage_user ON usage_records(user_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_token_timestamp ON token_usage(timestamp)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_token_user ON token_usage(user_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_token_provider ON token_usage(provider)")

            conn.commit()

    def record_usage(self, user_id: str, session_id: str,
                    interaction_type: InteractionType,
                    details: Dict[str, Any],
                    metadata: Optional[Dict[str, Any]] = None) -> str:
        """Record a usage event."""
        record_id = f"usage_{int(datetime.now().timestamp() * 1000)}"

        record = UsageRecord(
            id=record_id,
            timestamp=datetime.now(),
            user_id=user_id,
            session_id=session_id,
            interaction_type=interaction_type,
            details=details,
            metadata=metadata or {}
        )

        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO usage_records
                (id, timestamp, user_id, session_id, interaction_type, details, metadata)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                record.id,
                record.timestamp.isoformat(),
                record.user_id,
                record.session_id,
                record.interaction_type.value,
                json.dumps(record.details),
                json.dumps(record.metadata)
            ))
            conn.commit()

        return record_id

    def record_token_usage(self, user_id: str, session_id: str,
                         provider: str, model: str,
                         input_tokens: int, output_tokens: int,
                         cost: float, response_time: float,
                         success: bool, error_message: Optional[str] = None) -> str:
        """Record token usage for an API call."""
        record_id = f"token_{int(datetime.now().timestamp() * 1000)}"
        total_tokens = input_tokens + output_tokens

        token_usage = TokenUsage(
            record_id=record_id,
            provider=provider,
            model=model,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            total_tokens=total_tokens,
            cost=cost,
            response_time=response_time,
            success=success,
            error_message=error_message
        )

        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO token_usage
                (record_id, timestamp, user_id, session_id, provider, model,
                 input_tokens, output_tokens, total_tokens, cost, response_time,
                 success, error_message)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                token_usage.record_id,
                datetime.now().isoformat(),
                user_id,
                session_id,
                token_usage.provider,
                token_usage.model,
                token_usage.input_tokens,
                token_usage.output_tokens,
                token_usage.total_tokens,
                token_usage.cost,
                token_usage.response_time,
                token_usage.success,
                token_usage.error_message
            ))
            conn.commit()

        return record_id

    def get_usage_stats(self, user_id: str,
                       period: str = "day") -> Dict[str, Any]:
        """Get usage statistics for a user within a period."""
        # Calculate time range
        now = datetime.now()
        if period == "day":
            start_time = now - timedelta(days=1)
        elif period == "week":
            start_time = now - timedelta(weeks=1)
        elif period == "month":
            start_time = now - timedelta(days=30)
        else:
            raise ValueError(f"Invalid period: {period}")

        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()

            # Get token usage stats
            cursor.execute("""
                SELECT
                    COUNT(*) as total_requests,
                    SUM(input_tokens) as total_input_tokens,
                    SUM(output_tokens) as total_output_tokens,
                    SUM(total_tokens) as total_tokens,
                    SUM(cost) as total_cost,
                    AVG(response_time) as avg_response_time,
                    COUNT(CASE WHEN success = 1 THEN 1 END) as successful_requests,
                    provider,
                    model
                FROM token_usage
                WHERE user_id = ? AND timestamp >= ?
                GROUP BY provider, model
            """, (user_id, start_time.isoformat()))

            results = cursor.fetchall()

            # Aggregate stats
            stats = {
                'period': period,
                'start_time': start_time.isoformat(),
                'end_time': now.isoformat(),
                'total_requests': 0,
                'total_tokens': 0,
                'total_cost': 0.0,
                'avg_response_time': 0.0,
                'success_rate': 0.0,
                'providers': {}
            }

            for row in results:
                (requests, input_tokens, output_tokens, total_tokens,
                 cost, avg_response_time, successful_requests, provider, model) = row

                stats['total_requests'] += requests
                stats['total_tokens'] += total_tokens or 0
                stats['total_cost'] += cost or 0.0

                if provider not in stats['providers']:
                    stats['providers'][provider] = {
                        'models': {},
                        'total_requests': 0,
                        'total_tokens': 0,
                        'total_cost': 0.0
                    }

                stats['providers'][provider]['models'][model] = {
                    'requests': requests,
                    'input_tokens': input_tokens or 0,
                    'output_tokens': output_tokens or 0,
                    'total_tokens': total_tokens or 0,
                    'cost': cost or 0.0,
                    'avg_response_time': avg_response_time or 0.0,
                    'success_rate': (successful_requests / requests * 100) if requests > 0 else 0.0
                }

                stats['providers'][provider]['total_requests'] += requests
                stats['providers'][provider]['total_tokens'] += total_tokens or 0
                stats['providers'][provider]['total_cost'] += cost or 0.0

            # Calculate overall averages
            if stats['total_requests'] > 0:
                cursor.execute("""
                    SELECT AVG(response_time) as avg_time
                    FROM token_usage
                    WHERE user_id = ? AND timestamp >= ? AND success = 1
                """, (user_id, start_time.isoformat()))

                avg_time_result = cursor.fetchone()
                stats['avg_response_time'] = avg_time_result[0] if avg_time_result else 0.0

                cursor.execute("""
                    SELECT COUNT(CASE WHEN success = 1 THEN 1 END) * 100.0 / COUNT(*) as success_rate
                    FROM token_usage
                    WHERE user_id = ? AND timestamp >= ?
                """, (user_id, start_time.isoformat()))

                success_rate_result = cursor.fetchone()
                stats['success_rate'] = success_rate_result[0] if success_rate_result else 0.0

            return stats
```

### 2. Cost Monitoring System

```python
from typing import Dict, List
from dataclasses import dataclass
import sqlite3

@dataclass
class ProviderPricing:
    """Pricing information for an AI provider."""
    provider: str
    model: str
    input_cost_per_1k: float
    output_cost_per_1k: float
    currency: str = "USD"
    last_updated: datetime = None

class CostMonitor:
    """Monitors and analyzes costs across providers."""

    def __init__(self, db_path: str):
        self.db_path = db_path
        self.pricing_data = self._load_pricing_data()
        self._init_cost_tables()

    def _load_pricing_data(self) -> Dict[str, Dict[str, ProviderPricing]]:
        """Load pricing data for different providers."""
        return {
            'openai': {
                'gpt-4': ProviderPricing(
                    provider='openai',
                    model='gpt-4',
                    input_cost_per_1k=0.03,
                    output_cost_per_1k=0.06
                ),
                'gpt-4-turbo': ProviderPricing(
                    provider='openai',
                    model='gpt-4-turbo',
                    input_cost_per_1k=0.01,
                    output_cost_per_1k=0.03
                ),
                'gpt-3.5-turbo': ProviderPricing(
                    provider='openai',
                    model='gpt-3.5-turbo',
                    input_cost_per_1k=0.0015,
                    output_cost_per_1k=0.002
                )
            },
            'deepseek': {
                'deepseek-chat': ProviderPricing(
                    provider='deepseek',
                    model='deepseek-chat',
                    input_cost_per_1k=0.14,
                    output_cost_per_1k=0.28
                ),
                'deepseek-coder': ProviderPricing(
                    provider='deepseek',
                    model='deepseek-coder',
                    input_cost_per_1k=0.14,
                    output_cost_per_1k=0.28
                )
            },
            'anthropic': {
                'claude-3-sonnet-20240229': ProviderPricing(
                    provider='anthropic',
                    model='claude-3-sonnet-20240229',
                    input_cost_per_1k=3.00,
                    output_cost_per_1k=15.00
                ),
                'claude-3-haiku-20240307': ProviderPricing(
                    provider='anthropic',
                    model='claude-3-haiku-20240307',
                    input_cost_per_1k=0.25,
                    output_cost_per_1k=1.25
                )
            }
        }

    def _init_cost_tables(self):
        """Initialize cost tracking tables."""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS cost_tracking (
                    id TEXT PRIMARY KEY,
                    date DATE NOT NULL,
                    user_id TEXT NOT NULL,
                    provider TEXT NOT NULL,
                    model TEXT NOT NULL,
                    input_tokens INTEGER NOT NULL,
                    output_tokens INTEGER NOT NULL,
                    cost REAL NOT NULL,
                    requests INTEGER NOT NULL
                )
            """)

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS cost_alerts (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    alert_type TEXT NOT NULL,
                    threshold REAL NOT NULL,
                    current_value REAL NOT NULL,
                    period TEXT NOT NULL,
                    created_at DATETIME NOT NULL,
                    acknowledged BOOLEAN DEFAULT FALSE
                )
            """)

            # Create indexes
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_cost_date ON cost_tracking(date)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_cost_user ON cost_tracking(user_id)")

            conn.commit()

    def calculate_cost(self, provider: str, model: str,
                      input_tokens: int, output_tokens: int) -> float:
        """Calculate cost for API call."""
        if provider not in self.pricing_data:
            return 0.0

        if model not in self.pricing_data[provider]:
            # Use default pricing if model not found
            model = list(self.pricing_data[provider].keys())[0]

        pricing = self.pricing_data[provider][model]
        input_cost = (input_tokens / 1000) * pricing.input_cost_per_1k
        output_cost = (output_tokens / 1000) * pricing.output_cost_per_1k

        return input_cost + output_cost

    def record_cost(self, user_id: str, provider: str, model: str,
                   input_tokens: int, output_tokens: int, cost: float):
        """Record cost data."""
        cost_id = f"cost_{int(datetime.now().timestamp() * 1000)}"
        today = datetime.now().date()

        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()

            # Check if record exists for today
            cursor.execute("""
                SELECT id, requests FROM cost_tracking
                WHERE date = ? AND user_id = ? AND provider = ? AND model = ?
            """, (today.isoformat(), user_id, provider, model))

            existing = cursor.fetchone()

            if existing:
                # Update existing record
                record_id, requests = existing
                cursor.execute("""
                    UPDATE cost_tracking
                    SET input_tokens = input_tokens + ?,
                        output_tokens = output_tokens + ?,
                        cost = cost + ?,
                        requests = requests + 1
                    WHERE id = ?
                """, (input_tokens, output_tokens, cost, record_id))
            else:
                # Create new record
                cursor.execute("""
                    INSERT INTO cost_tracking
                    (id, date, user_id, provider, model, input_tokens, output_tokens, cost, requests)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
                """, (cost_id, today.isoformat(), user_id, provider, model,
                      input_tokens, output_tokens, cost))

            conn.commit()

    def get_cost_analysis(self, user_id: str, period: str = "month") -> Dict[str, Any]:
        """Get comprehensive cost analysis."""
        # Calculate date range
        now = datetime.now()
        if period == "day":
            start_date = now.date()
        elif period == "week":
            start_date = (now - timedelta(weeks=1)).date()
        elif period == "month":
            start_date = (now - timedelta(days=30)).date()
        else:
            raise ValueError(f"Invalid period: {period}")

        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()

            # Get daily costs
            cursor.execute("""
                SELECT date, SUM(cost) as daily_cost, SUM(requests) as daily_requests,
                       SUM(input_tokens) as daily_input, SUM(output_tokens) as daily_output
                FROM cost_tracking
                WHERE user_id = ? AND date >= ?
                GROUP BY date
                ORDER BY date DESC
            """, (user_id, start_date.isoformat()))

            daily_costs = []
            total_cost = 0.0
            total_requests = 0
            total_input_tokens = 0
            total_output_tokens = 0

            for row in cursor.fetchall():
                date, daily_cost, daily_requests, daily_input, daily_output = row
                daily_costs.append({
                    'date': date,
                    'cost': daily_cost,
                    'requests': daily_requests,
                    'input_tokens': daily_input,
                    'output_tokens': daily_output
                })
                total_cost += daily_cost
                total_requests += daily_requests
                total_input_tokens += daily_input
                total_output_tokens += daily_output

            # Get provider breakdown
            cursor.execute("""
                SELECT provider, model, SUM(cost) as provider_cost,
                       SUM(requests) as provider_requests,
                       SUM(input_tokens) as provider_input,
                       SUM(output_tokens) as provider_output
                FROM cost_tracking
                WHERE user_id = ? AND date >= ?
                GROUP BY provider, model
                ORDER BY provider_cost DESC
            """, (user_id, start_date.isoformat()))

            provider_breakdown = {}
            for row in cursor.fetchall():
                provider, model, cost, requests, input_tokens, output_tokens = row

                if provider not in provider_breakdown:
                    provider_breakdown[provider] = {
                        'total_cost': 0.0,
                        'total_requests': 0,
                        'models': {}
                    }

                provider_breakdown[provider]['models'][model] = {
                    'cost': cost,
                    'requests': requests,
                    'input_tokens': input_tokens,
                    'output_tokens': output_tokens,
                    'avg_cost_per_request': cost / requests if requests > 0 else 0
                }

                provider_breakdown[provider]['total_cost'] += cost
                provider_breakdown[provider]['total_requests'] += requests

            # Calculate statistics
            avg_cost_per_request = total_cost / total_requests if total_requests > 0 else 0
            avg_cost_per_1k_tokens = (total_cost / ((total_input_tokens + total_output_tokens) / 1000)) if (total_input_tokens + total_output_tokens) > 0 else 0

            return {
                'period': period,
                'start_date': start_date.isoformat(),
                'end_date': now.date().isoformat(),
                'total_cost': total_cost,
                'total_requests': total_requests,
                'total_input_tokens': total_input_tokens,
                'total_output_tokens': total_output_tokens,
                'avg_cost_per_request': avg_cost_per_request,
                'avg_cost_per_1k_tokens': avg_cost_per_1k_tokens,
                'daily_costs': daily_costs,
                'provider_breakdown': provider_breakdown
            }

    def check_cost_alerts(self, user_id: str) -> List[Dict[str, Any]]:
        """Check for cost alerts based on thresholds."""
        alerts = []

        # Get current month cost
        current_month_cost = self.get_cost_analysis(user_id, "month")['total_cost']

        # Define alert thresholds
        thresholds = [
            {'type': 'daily_budget', 'threshold': 10.0, 'period': 'day'},
            {'type': 'weekly_budget', 'threshold': 50.0, 'period': 'week'},
            {'type': 'monthly_budget', 'threshold': 200.0, 'period': 'month'}
        ]

        for threshold_config in thresholds:
            cost_data = self.get_cost_analysis(user_id, threshold_config['period'])

            if cost_data['total_cost'] > threshold_config['threshold']:
                alerts.append({
                    'type': threshold_config['type'],
                    'threshold': threshold_config['threshold'],
                    'current_cost': cost_data['total_cost'],
                    'period': threshold_config['period'],
                    'severity': 'high' if cost_data['total_cost'] > threshold_config['threshold'] * 1.5 else 'medium',
                    'message': f"Cost alert: ${cost_data['total_cost']:.2f} spent this {threshold_config['period']} (threshold: ${threshold_config['threshold']:.2f})"
                })

        return alerts
```

### 3. Performance Analyzer

```python
from typing import Dict, List, Tuple
from dataclasses import dataclass
import statistics

@dataclass
class PerformanceMetrics:
    """Performance metrics for analysis."""
    response_times: List[float]
    error_rates: Dict[str, float]
    success_rates: Dict[str, float]
    throughput: float  # requests per minute
    availability: float  # percentage

class PerformanceAnalyzer:
    """Analyzes system performance metrics."""

    def __init__(self, db_path: str):
        self.db_path = db_path

    def analyze_performance(self, user_id: str, period: str = "day") -> Dict[str, Any]:
        """Analyze performance metrics for a user."""
        # Calculate time range
        now = datetime.now()
        if period == "day":
            start_time = now - timedelta(days=1)
        elif period == "week":
            start_time = now - timedelta(weeks=1)
        elif period == "month":
            start_time = now - timedelta(days=30)
        else:
            raise ValueError(f"Invalid period: {period}")

        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()

            # Get response time metrics
            cursor.execute("""
                SELECT provider, model, response_time, success
                FROM token_usage
                WHERE user_id = ? AND timestamp >= ?
            """, (user_id, start_time.isoformat()))

            response_data = cursor.fetchall()

            # Analyze response times
            response_times_by_provider = {}
            success_rates_by_provider = {}
            total_requests = 0
            successful_requests = 0

            for provider, model, response_time, success in response_data:
                total_requests += 1
                if success:
                    successful_requests += 1

                key = f"{provider}/{model}"
                if key not in response_times_by_provider:
                    response_times_by_provider[key] = []

                response_times_by_provider[key].append(response_time)

            # Calculate statistics for each provider/model
            performance_stats = {}
            for key, times in response_times_by_provider.items():
                if times:
                    provider, model = key.split('/')

                    # Get success count for this specific provider/model
                    cursor.execute("""
                        SELECT COUNT(CASE WHEN success = 1 THEN 1 END), COUNT(*)
                        FROM token_usage
                        WHERE user_id = ? AND timestamp >= ? AND provider = ? AND model = ?
                    """, (user_id, start_time.isoformat(), provider, model))

                    successful, total = cursor.fetchone()
                    success_rate = (successful / total * 100) if total > 0 else 0

                    performance_stats[key] = {
                        'provider': provider,
                        'model': model,
                        'avg_response_time': statistics.mean(times),
                        'min_response_time': min(times),
                        'max_response_time': max(times),
                        'median_response_time': statistics.median(times),
                        'p95_response_time': self._percentile(times, 95),
                        'p99_response_time': self._percentile(times, 99),
                        'total_requests': total,
                        'successful_requests': successful,
                        'success_rate': success_rate,
                        'error_rate': 100 - success_rate
                    }

            # Calculate overall metrics
            overall_success_rate = (successful_requests / total_requests * 100) if total_requests > 0 else 0
            overall_error_rate = 100 - overall_success_rate

            # Calculate throughput (requests per minute)
            time_range_minutes = (now - start_time).total_seconds() / 60
            throughput = total_requests / time_range_minutes if time_range_minutes > 0 else 0

            return {
                'period': period,
                'total_requests': total_requests,
                'successful_requests': successful_requests,
                'overall_success_rate': overall_success_rate,
                'overall_error_rate': overall_error_rate,
                'throughput_rpm': throughput,
                'performance_by_provider': performance_stats,
                'recommendations': self._generate_performance_recommendations(performance_stats)
            }

    def _percentile(self, data: List[float], percentile: int) -> float:
        """Calculate percentile of data."""
        if not data:
            return 0.0

        sorted_data = sorted(data)
        index = (percentile / 100) * (len(sorted_data) - 1)

        if index.is_integer():
            return sorted_data[int(index)]
        else:
            lower_index = int(index)
            upper_index = lower_index + 1
            weight = index - lower_index
            return sorted_data[lower_index] * (1 - weight) + sorted_data[upper_index] * weight

    def _generate_performance_recommendations(self, performance_stats: Dict[str, Any]) -> List[str]:
        """Generate performance improvement recommendations."""
        recommendations = []

        # Check for slow response times
        for key, stats in performance_stats.items():
            if stats['avg_response_time'] > 5.0:  # 5 seconds threshold
                recommendations.append(
                    f"{key}: Average response time is {stats['avg_response_time']:.1f}s. "
                    "Consider using a faster model or optimizing prompts."
                )

            if stats['error_rate'] > 10:  # 10% error rate threshold
                recommendations.append(
                    f"{key}: Error rate is {stats['error_rate']:.1f}%. "
                    "Check API configuration and network connectivity."
                )

        # Check for consistency issues
        for key, stats in performance_stats.items():
            p99_time = stats['p99_response_time']
            avg_time = stats['avg_response_time']

            if p99_time > avg_time * 3:  # High variance
                recommendations.append(
                    f"{key}: High response time variance (P99: {p99_time:.1f}s, avg: {avg_time:.1f}s). "
                    "Consider implementing request timeout and retry logic."
                )

        if not recommendations:
            recommendations.append("Performance metrics are within acceptable ranges.")

        return recommendations
```

### 4. Analytics Dashboard API

```python
from typing import Dict, List, Any
from fastapi import FastAPI, HTTPException, Depends
from datetime import datetime, timedelta

class AnalyticsAPI:
    """REST API for analytics data."""

    def __init__(self, usage_tracker: UsageTracker, cost_monitor: CostMonitor,
                 performance_analyzer: PerformanceAnalyzer):
        self.usage_tracker = usage_tracker
        self.cost_monitor = cost_monitor
        self.performance_analyzer = performance_analyzer
        self.app = FastAPI(title="Learning Catalyst Analytics API")
        self._setup_routes()

    def _setup_routes(self):
        """Setup API routes."""

        @self.app.get("/api/v1/analytics/usage/{user_id}")
        async def get_usage_analytics(user_id: str, period: str = "day"):
            """Get usage analytics for a user."""
            try:
                return self.usage_tracker.get_usage_stats(user_id, period)
            except ValueError as e:
                raise HTTPException(status_code=400, detail=str(e))

        @self.app.get("/api/v1/analytics/cost/{user_id}")
        async def get_cost_analytics(user_id: str, period: str = "month"):
            """Get cost analytics for a user."""
            try:
                return self.cost_monitor.get_cost_analysis(user_id, period)
            except ValueError as e:
                raise HTTPException(status_code=400, detail=str(e))

        @self.app.get("/api/v1/analytics/performance/{user_id}")
        async def get_performance_analytics(user_id: str, period: str = "day"):
            """Get performance analytics for a user."""
            try:
                return self.performance_analyzer.analyze_performance(user_id, period)
            except ValueError as e:
                raise HTTPException(status_code=400, detail=str(e))

        @self.app.get("/api/v1/analytics/dashboard/{user_id}")
        async def get_dashboard_data(user_id: str):
            """Get comprehensive dashboard data."""
            try:
                # Get data for different periods
                usage_today = self.usage_tracker.get_usage_stats(user_id, "day")
                usage_week = self.usage_tracker.get_usage_stats(user_id, "week")
                cost_month = self.cost_monitor.get_cost_analysis(user_id, "month")
                performance_today = self.performance_analyzer.analyze_performance(user_id, "day")

                # Check for alerts
                alerts = self.cost_monitor.check_cost_alerts(user_id)

                return {
                    'user_id': user_id,
                    'generated_at': datetime.now().isoformat(),
                    'usage': {
                        'today': usage_today,
                        'week': usage_week
                    },
                    'costs': {
                        'month': cost_month
                    },
                    'performance': {
                        'today': performance_today
                    },
                    'alerts': alerts
                }

            except Exception as e:
                raise HTTPException(status_code=500, detail=str(e))

        @self.app.get("/api/v1/analytics/export/{user_id}")
        async def export_analytics(user_id: str, format: str = "json",
                                 period: str = "month"):
            """Export analytics data in various formats."""
            try:
                # Get all analytics data
                usage_data = self.usage_tracker.get_usage_stats(user_id, period)
                cost_data = self.cost_monitor.get_cost_analysis(user_id, period)
                performance_data = self.performance_analyzer.analyze_performance(user_id, period)

                export_data = {
                    'export_date': datetime.now().isoformat(),
                    'user_id': user_id,
                    'period': period,
                    'usage': usage_data,
                    'costs': cost_data,
                    'performance': performance_data
                }

                if format.lower() == "json":
                    return export_data
                elif format.lower() == "csv":
                    # Convert to CSV format (simplified)
                    return self._convert_to_csv(export_data)
                else:
                    raise HTTPException(status_code=400, detail="Unsupported format")

            except Exception as e:
                raise HTTPException(status_code=500, detail=str(e))

    def _convert_to_csv(self, data: Dict[str, Any]) -> str:
        """Convert analytics data to CSV format."""
        # Simplified CSV conversion
        csv_lines = ["Date,Provider,Model,Requests,Tokens,Cost,Response Time,Success Rate"]

        # Add daily cost data
        for daily_cost in data['costs']['daily_costs']:
            csv_lines.append(
                f"{daily_cost['date']},All,All,"
                f"{daily_cost['requests']},"
                f"{daily_cost['input_tokens'] + daily_cost['output_tokens']},"
                f"{daily_cost['cost']},,"
                f"{data['performance']['overall_success_rate']:.1f}%"
            )

        return "\n".join(csv_lines)
```

### 5. Command Implementation

```python
from src.cli.commands import BaseCommand
from src.api.response import Response
from src.analytics.usage_tracker import UsageTracker
from src.analytics.cost_monitor import CostMonitor
from src.analytics.performance_analyzer import PerformanceAnalyzer
import argparse

class TokensCommand(BaseCommand):
    """Token usage monitoring command."""

    def __init__(self):
        super().__init__()
        self.name = "tokens"
        self.description = "Monitor API token usage and costs"
        self.aliases = ["usage"]
        self.category = "analytics"

    def add_arguments(self, parser: argparse.ArgumentParser):
        """Add tokens command arguments."""
        parser.add_argument(
            '--period', '-p',
            choices=['day', 'week', 'month'],
            default='day',
            help='Time period for usage statistics'
        )
        parser.add_argument(
            '--detailed', '-d',
            action='store_true',
            help='Show detailed breakdown by provider and model'
        )
        parser.add_argument(
            '--format', '-f',
            choices=['text', 'json'],
            default='text',
            help='Output format'
        )

    async def execute(self, args: argparse.Namespace, context: CommandContext) -> Response:
        """Execute tokens command."""
        try:
            user_id = context.user_id
            db_path = getattr(context, 'analytics_db_path', 'analytics.db')

            # Initialize analytics components
            usage_tracker = UsageTracker(db_path)
            cost_monitor = CostMonitor(db_path)

            # Get usage statistics
            usage_stats = usage_tracker.get_usage_stats(user_id, args.period)
            cost_analysis = cost_monitor.get_cost_analysis(user_id, args.period)

            if args.format == 'json':
                return Response.success({
                    'usage_stats': usage_stats,
                    'cost_analysis': cost_analysis
                })

            # Format text output
            output_lines = [
                "💰 Token Usage Statistics",
                "",
                f"{args.period.upper()}'S USAGE:",
                f"├── Total Requests: {usage_stats['total_requests']:,}",
                f"├── Total Tokens: {usage_stats['total_tokens']:,}",
                f"├── Input Tokens: {sum(p['models'].get(model, {}).get('input_tokens', 0) for p in usage_stats['providers'].values() for model in p['models']):,}",
                f"├── Output Tokens: {sum(p['models'].get(model, {}).get('output_tokens', 0) for p in usage_stats['providers'].values() for model in p['models']):,}",
                f"├── Total Cost: ${cost_analysis['total_cost']:.4f}",
                f"├── Average Response Time: {usage_stats['avg_response_time']:.2f}s",
                f"└── Success Rate: {usage_stats['success_rate']:.1f}%"
            ]

            if args.detailed and usage_stats['providers']:
                output_lines.extend(["", "PROVIDER BREAKDOWN:"])

                for provider, provider_data in usage_stats['providers'].items():
                    output_lines.append(f"  📊 {provider.title()}:")

                    for model, model_data in provider_data['models'].items():
                        output_lines.extend([
                            f"    ├── Model: {model}",
                            f"    ├── Requests: {model_data['requests']:,}",
                            f"    ├── Tokens: {model_data['total_tokens']:,}",
                            f"    ├── Cost: ${model_data['cost']:.4f}",
                            f"    ├── Avg Response: {model_data['avg_response_time']:.2f}s",
                            f"    └── Success Rate: {model_data['success_rate']:.1f}%"
                        ])

                    # Provider totals
                    output_lines.extend([
                        f"    └── Provider Total:",
                        f"        ├── Requests: {provider_data['total_requests']:,}",
                        f"        ├── Tokens: {provider_data['total_tokens']:,}",
                        f"        └── Cost: ${provider_data['total_cost']:.4f}"
                    ])

                # Cost efficiency analysis
                if usage_stats['total_tokens'] > 0:
                    cost_per_1k = cost_analysis['total_cost'] / (usage_stats['total_tokens'] / 1000)
                    output_lines.extend([
                        "",
                        "COST EFFICIENCY:",
                        f"├── Cost per 1K tokens: ${cost_per_1k:.4f}",
                        f"├── Cost per request: ${cost_analysis['avg_cost_per_request']:.4f}",
                        f"└── Most cost-effective: {self._find_most_cost_effective(usage_stats)}"
                    ])

            # Add alerts if any
            alerts = cost_monitor.check_cost_alerts(user_id)
            if alerts:
                output_lines.extend(["", "⚠️  ALERTS:"])
                for alert in alerts:
                    severity_icon = "🔴" if alert['severity'] == 'high' else "🟡"
                    output_lines.append(f"  {severity_icon} {alert['message']}")

            output_lines.extend(["", f"Use /tokens --detailed for comprehensive breakdown."])

            return Response.success({
                'message': '\n'.join(output_lines),
                'usage_stats': usage_stats,
                'cost_analysis': cost_analysis
            })

        except Exception as e:
            return Response.error(
                "TOKENS_COMMAND_ERROR",
                f"Error retrieving token usage: {str(e)}"
            )

    def _find_most_cost_effective(self, usage_stats: Dict[str, Any]) -> str:
        """Find the most cost-effective provider/model combination."""
        best_efficiency = float('inf')
        best_provider = None

        for provider, provider_data in usage_stats['providers'].items():
            for model, model_data in provider_data['models'].items():
                if model_data['total_tokens'] > 0:
                    cost_per_1k = model_data['cost'] / (model_data['total_tokens'] / 1000)
                    if cost_per_1k < best_efficiency:
                        best_efficiency = cost_per_1k
                        best_provider = f"{provider}/{model}"

        return best_provider or "N/A"
```

## Testing

### Unit Tests

```python
import pytest
from unittest.mock import patch
from datetime import datetime, timedelta
from src.analytics.usage_tracker import UsageTracker, InteractionType

class TestUsageTracker:
    def test_record_usage(self):
        """Test usage recording."""
        with tempfile.NamedTemporaryFile(suffix='.db', delete=False) as db_file:
            tracker = UsageTracker(db_file.name)

            record_id = tracker.record_usage(
                user_id="test_user",
                session_id="test_session",
                interaction_type=InteractionType.AI_REQUEST,
                details={"model": "gpt-4", "tokens": 100}
            )

            assert record_id.startswith("usage_")

    def test_record_token_usage(self):
        """Test token usage recording."""
        with tempfile.NamedTemporaryFile(suffix='.db', delete=False) as db_file:
            tracker = UsageTracker(db_file.name)

            record_id = tracker.record_token_usage(
                user_id="test_user",
                session_id="test_session",
                provider="openai",
                model="gpt-4",
                input_tokens=50,
                output_tokens=100,
                cost=0.01,
                response_time=1.5,
                success=True
            )

            assert record_id.startswith("token_")

    def test_get_usage_stats(self):
        """Test usage statistics retrieval."""
        with tempfile.NamedTemporaryFile(suffix='.db', delete=False) as db_file:
            tracker = UsageTracker(db_file.name)

            # Record some usage
            tracker.record_token_usage(
                "test_user", "session1", "openai", "gpt-4",
                50, 100, 0.01, 1.5, True
            )
            tracker.record_token_usage(
                "test_user", "session1", "openai", "gpt-4",
                30, 80, 0.008, 1.2, True
            )

            stats = tracker.get_usage_stats("test_user", "day")

            assert stats['total_requests'] == 2
            assert stats['total_tokens'] == 260  # 50+100 + 30+80
            assert 'openai' in stats['providers']

class TestCostMonitor:
    def test_calculate_cost(self):
        """Test cost calculation."""
        monitor = CostMonitor(":memory:")

        # Test OpenAI GPT-4
        cost = monitor.calculate_cost("openai", "gpt-4", 1000, 2000)
        expected = (1000/1000 * 0.03) + (2000/1000 * 0.06)  # 0.03 + 0.12 = 0.15
        assert abs(cost - expected) < 0.001

        # Test unknown provider
        cost = monitor.calculate_cost("unknown", "model", 1000, 1000)
        assert cost == 0.0

    def test_cost_analysis(self):
        """Test cost analysis."""
        with tempfile.NamedTemporaryFile(suffix='.db', delete=False) as db_file:
            monitor = CostMonitor(db_file.name)

            # Record some costs
            monitor.record_cost("test_user", "openai", "gpt-4", 1000, 2000, 0.15)
            monitor.record_cost("test_user", "deepseek", "deepseek-chat", 500, 1000, 0.21)

            analysis = monitor.get_cost_analysis("test_user", "month")

            assert analysis['total_cost'] == 0.36  # 0.15 + 0.21
            assert 'openai' in analysis['provider_breakdown']
            assert 'deepseek' in analysis['provider_breakdown']

    def test_cost_alerts(self):
        """Test cost alert generation."""
        with tempfile.NamedTemporaryFile(suffix='.db', delete=False) as db_file:
            monitor = CostMonitor(db_file.name)

            # Record costs that should trigger alerts
            # Create high costs by recording many expensive requests
            for _ in range(100):
                monitor.record_cost("test_user", "anthropic", "claude-3", 1000, 2000, 0.33)

            alerts = monitor.check_cost_alerts("test_user")
            assert len(alerts) > 0
            assert any(alert['type'] == 'monthly_budget' for alert in alerts)
```

### Integration Tests

```python
@pytest.mark.asyncio
async def test_analytics_workflow():
    """Test complete analytics workflow."""
    with tempfile.NamedTemporaryFile(suffix='.db', delete=False) as db_file:
        # Initialize components
        usage_tracker = UsageTracker(db_file.name)
        cost_monitor = CostMonitor(db_file.name)
        performance_analyzer = PerformanceAnalyzer(db_file.name)

        user_id = "test_user"
        session_id = "test_session"

        # Simulate API usage
        for i in range(10):
            # Record usage
            usage_tracker.record_usage(
                user_id, session_id, InteractionType.AI_REQUEST,
                {"model": "gpt-4", "prompt": f"Test query {i}"}
            )

            # Record token usage
            input_tokens = 50 + i * 10
            output_tokens = 100 + i * 20
            cost = cost_monitor.calculate_cost("openai", "gpt-4", input_tokens, output_tokens)
            response_time = 1.0 + i * 0.1

            usage_tracker.record_token_usage(
                user_id, session_id, "openai", "gpt-4",
                input_tokens, output_tokens, cost, response_time, True
            )

            # Record cost
            cost_monitor.record_cost(user_id, "openai", "gpt-4", input_tokens, output_tokens, cost)

        # Test analytics retrieval
        usage_stats = usage_tracker.get_usage_stats(user_id, "day")
        assert usage_stats['total_requests'] == 10
        assert usage_stats['total_tokens'] > 0

        cost_analysis = cost_monitor.get_cost_analysis(user_id, "day")
        assert cost_analysis['total_cost'] > 0
        assert 'openai' in cost_analysis['provider_breakdown']

        performance_stats = performance_analyzer.analyze_performance(user_id, "day")
        assert performance_stats['total_requests'] == 10
        assert performance_stats['overall_success_rate'] == 100.0
```

## Best Practices

### Analytics Implementation

1. **Data Privacy**: Ensure user data is anonymized and stored securely
2. **Performance**: Use efficient database queries and indexing
3. **Retention**: Implement data retention policies to manage storage
4. **Accuracy**: Validate data integrity and handle edge cases

### Cost Monitoring

1. **Real-time Tracking**: Update costs immediately after API calls
2. **Alerting**: Implement proactive cost alerts and notifications
3. **Budget Management**: Support budget limits and spending controls
4. **Provider Optimization**: Help users choose cost-effective providers

### Performance Analysis

1. **Comprehensive Metrics**: Track response times, error rates, and availability
2. **Trend Analysis**: Identify performance patterns and anomalies
3. **Recommendations**: Provide actionable optimization suggestions
4. **Benchmarks**: Establish performance baselines and goals

### User Interface

1. **Clear Visualizations**: Use charts and graphs for data presentation
2. **Drill-down Capabilities**: Allow users to explore data in detail
3. **Export Options**: Support data export in multiple formats
4. **Responsive Design**: Ensure analytics work on all devices

---

*Last updated: October 9, 2025*
*Version: 1.0.0*
*Category: Implementation Guides*