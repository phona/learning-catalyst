---
title: Performance Monitoring
description: Comprehensive performance monitoring, profiling, and alerting systems
version: 1.0.0
last_updated: 2025-10-08
---

# Performance Monitoring

## Overview

This guide covers comprehensive performance monitoring strategies for Learning Catalyst, including real-time metrics, performance profiling, alerting systems, and optimization recommendations.

## Monitoring Architecture

### 1. Monitoring Stack

```text
┌─────────────────────────────────────────────────────────────┐
│                    Monitoring Stack                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐  │
│  │   Metrics       │  │   Tracing       │  │   Logging    │  │
│  │   Collection    │  │   System        │  │   System     │  │
│  └─────────────────┘  └─────────────────┘  └──────────────┘  │
│         │                     │                     │         │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │              Performance Data Pipeline                      │  │
│  └─────────────────────────────────────────────────────────────┘  │
│         │                     │                     │         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐  │
│  │   Real-time     │  │   Analytics     │  │   Alerting   │  │
│  │   Dashboard     │  │   Engine        │  │   System     │  │
│  └─────────────────┘  └─────────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 2. Monitoring Implementation

```python
import time
import threading
import asyncio
import psutil
import gc
from typing import Dict, List, Any, Optional, Callable
from dataclasses import dataclass, field
from collections import deque
import json
import logging

@dataclass
class PerformanceMetric:
    """Single performance metric data point."""
    name: str
    value: float
    unit: str
    timestamp: float
    tags: Dict[str, str] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class PerformanceAlert:
    """Performance alert definition."""
    name: str
    condition: str
    threshold: float
    severity: str  # low, medium, high, critical
    enabled: bool = True
    cooldown: float = 300  # 5 minutes
    last_triggered: float = 0
    trigger_count: int = 0

class PerformanceMonitor:
    """Comprehensive performance monitoring system."""

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or {}
        self.metrics: Dict[str, deque] = {}  # Rolling metrics
        self.alerts: Dict[str, PerformanceAlert] = {}
        self.callbacks: List[Callable] = []
        self.is_monitoring = False
        self.monitor_thread = None
        self.collection_interval = self.config.get('collection_interval', 1.0)
        self.max_metrics_history = self.config.get('max_history', 1000)

        # Initialize built-in alerts
        self._setup_default_alerts()

    def _setup_default_alerts(self) -> None:
        """Setup default performance alerts."""
        default_alerts = [
            PerformanceAlert(
                name="high_memory_usage",
                condition="memory_usage",
                threshold=80.0,  # 80%
                severity="high"
            ),
            PerformanceAlert(
                name="high_cpu_usage",
                condition="cpu_usage",
                threshold=90.0,  # 90%
                severity="critical"
            ),
            PerformanceAlert(
                name="slow_response_time",
                condition="avg_response_time",
                threshold=5.0,  # 5 seconds
                severity="medium"
            ),
            PerformanceAlert(
                name="low_cache_hit_rate",
                condition="cache_hit_rate",
                threshold=50.0,  # 50%
                severity="low"
            )
        ]

        for alert in default_alerts:
            self.alerts[alert.name] = alert

    def start_monitoring(self) -> None:
        """Start performance monitoring in background thread."""
        if self.is_monitoring:
            return

        self.is_monitoring = True
        self.monitor_thread = threading.Thread(
            target=self._monitoring_loop,
            daemon=True
        )
        self.monitor_thread.start()
        logging.info("Performance monitoring started")

    def stop_monitoring(self) -> None:
        """Stop performance monitoring."""
        self.is_monitoring = False
        if self.monitor_thread:
            self.monitor_thread.join(timeout=5)
        logging.info("Performance monitoring stopped")

    def _monitoring_loop(self) -> None:
        """Main monitoring loop."""
        while self.is_monitoring:
            try:
                # Collect system metrics
                system_metrics = self._collect_system_metrics()
                for metric in system_metrics:
                    self._add_metric(metric)

                # Collect application metrics
                app_metrics = self._collect_application_metrics()
                for metric in app_metrics:
                    self._add_metric(metric)

                # Check alerts
                self._check_alerts()

                # Cleanup old metrics
                self._cleanup_old_metrics()

                time.sleep(self.collection_interval)

            except Exception as e:
                logging.error(f"Monitoring loop error: {e}")

    def _collect_system_metrics(self) -> List[PerformanceMetric]:
        """Collect system-level performance metrics."""
        metrics = []
        timestamp = time.time()

        # CPU metrics
        cpu_percent = psutil.cpu_percent(interval=None)
        metrics.append(PerformanceMetric(
            name="cpu_usage",
            value=cpu_percent,
            unit="percent",
            timestamp=timestamp,
            tags={"type": "system"}
        ))

        # Memory metrics
        memory = psutil.virtual_memory()
        metrics.append(PerformanceMetric(
            name="memory_usage",
            value=memory.percent,
            unit="percent",
            timestamp=timestamp,
            tags={"type": "system"},
            metadata={
                "available_gb": memory.available / (1024**3),
                "used_gb": memory.used / (1024**3)
            }
        ))

        # Process metrics
        process = psutil.Process()
        process_memory = process.memory_info()
        metrics.append(PerformanceMetric(
            name="process_memory_usage",
            value=process_memory.rss / (1024**2),  # MB
            unit="megabytes",
            timestamp=timestamp,
            tags={"type": "process"}
        ))

        return metrics

    def _collect_application_metrics(self) -> List[PerformanceMetric]:
        """Collect application-specific metrics."""
        metrics = []
        timestamp = time.time()

        # Garbage collection metrics
        gc_stats = gc.get_stats()
        total_collections = sum(stat['collections'] for stat in gc_stats)
        total_collected = sum(stat['collected'] for stat in gc_stats)

        metrics.append(PerformanceMetric(
            name="gc_collections",
            value=total_collections,
            unit="count",
            timestamp=timestamp,
            tags={"type": "gc"}
        ))

        metrics.append(PerformanceMetric(
            name="gc_objects_collected",
            value=total_collected,
            unit="count",
            timestamp=timestamp,
            tags={"type": "gc"}
        ))

        # Thread metrics
        thread_count = threading.active_count()
        metrics.append(PerformanceMetric(
            name="thread_count",
            value=thread_count,
            unit="count",
            timestamp=timestamp,
            tags={"type": "threads"}
        ))

        return metrics

    def _add_metric(self, metric: PerformanceMetric) -> None:
        """Add metric to rolling history."""
        if metric.name not in self.metrics:
            self.metrics[metric.name] = deque(maxlen=self.max_metrics_history)

        self.metrics[metric.name].append(metric)

        # Trigger callbacks
        for callback in self.callbacks:
            try:
                callback(metric)
            except Exception as e:
                logging.error(f"Metric callback error: {e}")

    def _check_alerts(self) -> None:
        """Check all configured alerts."""
        for alert in self.alerts.values():
            if not alert.enabled:
                continue

            # Check cooldown
            if time.time() - alert.last_triggered < alert.cooldown:
                continue

            # Get current metric value
            current_value = self._get_current_metric_value(alert.condition)
            if current_value is None:
                continue

            # Check threshold
            if self._evaluate_condition(current_value, alert.threshold, "gt"):
                self._trigger_alert(alert, current_value)

    def _get_current_metric_value(self, metric_name: str) -> Optional[float]:
        """Get current value for a metric."""
        if metric_name not in self.metrics or not self.metrics[metric_name]:
            return None

        return self.metrics[metric_name][-1].value

    def _evaluate_condition(self, value: float, threshold: float, operator: str) -> bool:
        """Evaluate alert condition."""
        if operator == "gt":
            return value > threshold
        elif operator == "lt":
            return value < threshold
        elif operator == "eq":
            return value == threshold
        else:
            return False

    def _trigger_alert(self, alert: PerformanceAlert, current_value: float) -> None:
        """Trigger performance alert."""
        alert.last_triggered = time.time()
        alert.trigger_count += 1

        # Log alert
        logging.warning(
            f"Performance alert triggered: {alert.name} "
            f"(current: {current_value}, threshold: {alert.threshold})"
        )

        # Call alert callbacks
        for callback in self.callbacks:
            try:
                if hasattr(callback, 'on_alert'):
                    callback.on_alert(alert, current_value)
            except Exception as e:
                logging.error(f"Alert callback error: {e}")

    def _cleanup_old_metrics(self) -> None:
        """Clean up old metrics beyond retention period."""
        current_time = time.time()
        retention_period = self.config.get('retention_period', 86400)  # 24 hours

        for metric_name, metric_deque in self.metrics.items():
            while (metric_deque and
                   current_time - metric_deque[0].timestamp > retention_period):
                metric_deque.popleft()

    def add_custom_metric(self, name: str, value: float, unit: str,
                         tags: Optional[Dict[str, str]] = None,
                         metadata: Optional[Dict[str, Any]] = None) -> None:
        """Add custom metric."""
        metric = PerformanceMetric(
            name=name,
            value=value,
            unit=unit,
            timestamp=time.time(),
            tags=tags or {},
            metadata=metadata or {}
        )
        self._add_metric(metric)

    def get_metric_history(self, metric_name: str,
                          duration: Optional[float] = None) -> List[PerformanceMetric]:
        """Get history for a specific metric."""
        if metric_name not in self.metrics:
            return []

        if duration is None:
            return list(self.metrics[metric_name])

        cutoff_time = time.time() - duration
        return [
            metric for metric in self.metrics[metric_name]
            if metric.timestamp > cutoff_time
        ]

    def get_performance_summary(self, duration: float = 3600) -> Dict[str, Any]:
        """Get performance summary over specified duration."""
        summary = {
            'timestamp': time.time(),
            'duration': duration,
            'metrics': {},
            'alerts': {
                'active': 0,
                'triggered_24h': sum(1 for alert in self.alerts.values()
                                    if alert.trigger_count > 0)
            }
        }

        cutoff_time = time.time() - duration

        # Summarize each metric
        for metric_name, metric_deque in self.metrics.items():
            recent_metrics = [
                m for m in metric_deque
                if m.timestamp > cutoff_time
            ]

            if recent_metrics:
                values = [m.value for m in recent_metrics]
                summary['metrics'][metric_name] = {
                    'count': len(values),
                    'avg': sum(values) / len(values),
                    'min': min(values),
                    'max': max(values),
                    'latest': values[-1],
                    'unit': recent_metrics[-1].unit
                }

        return summary

    def add_alert(self, alert: PerformanceAlert) -> None:
        """Add custom alert."""
        self.alerts[alert.name] = alert

    def remove_alert(self, alert_name: str) -> None:
        """Remove alert."""
        if alert_name in self.alerts:
            del self.alerts[alert_name]

    def register_callback(self, callback: Callable) -> None:
        """Register monitoring callback."""
        self.callbacks.append(callback)
```

### 2. Performance Profiler

```python
import cProfile
import pstats
import io
import time
import functools
from typing import Dict, List, Any, Optional, Callable
from dataclasses import dataclass
import threading

@dataclass
class ProfileResult:
    """Profiling result data."""
    function_name: str
    call_count: int
    total_time: float
    per_call_time: float
    cumulative_time: float
    percentage: float

class PerformanceProfiler:
    """Advanced performance profiling system."""

    def __init__(self):
        self.profiles: Dict[str, cProfile.Profile] = {}
        self.results: Dict[str, List[ProfileResult]] = {}
        self.enabled = False
        self.profile_lock = threading.Lock()

    def start_profiling(self, name: str) -> None:
        """Start profiling with specified name."""
        if not self.enabled:
            return

        with self.profile_lock:
            if name in self.profiles:
                self.profiles[name].enable()
            else:
                self.profiles[name] = cProfile.Profile()
                self.profiles[name].enable()

    def stop_profiling(self, name: str) -> Optional[List[ProfileResult]]:
        """Stop profiling and return results."""
        if not self.enabled or name not in self.profiles:
            return None

        with self.profile_lock:
            profile = self.profiles[name]
            profile.disable()

            # Get statistics
            stats_stream = io.StringIO()
            ps = pstats.Stats(profile, stream=stats_stream)
            ps.sort_stats('cumulative')
            ps.print_stats(20)  # Top 20 functions

            # Parse results
            results = self._parse_profile_results(stats_stream.getvalue())
            self.results[name] = results

            return results

    def _parse_profile_results(self, stats_text: str) -> List[ProfileResult]:
        """Parse profiling statistics text."""
        results = []
        lines = stats_text.split('\n')

        # Find the data section
        data_start = -1
        for i, line in enumerate(lines):
            if 'ncalls' in line and 'tottime' in line and 'cumtime' in line:
                data_start = i + 2
                break

        if data_start == -1:
            return results

        # Parse data lines
        total_time = 0.0
        for line in lines[data_start:]:
            if not line.strip():
                continue

            parts = line.split()
            if len(parts) >= 6:
                try:
                    call_count = int(parts[0])
                    total_time_func = float(parts[1])
                    per_call_time = float(parts[2])
                    cumulative_time = float(parts[3])
                    function_name = ' '.join(parts[5:])

                    result = ProfileResult(
                        function_name=function_name,
                        call_count=call_count,
                        total_time=total_time_func,
                        per_call_time=per_call_time,
                        cumulative_time=cumulative_time,
                        percentage=0.0  # Will be calculated later
                    )
                    results.append(result)
                    total_time = max(total_time, cumulative_time)

                except (ValueError, IndexError):
                    continue

        # Calculate percentages
        for result in results:
            if total_time > 0:
                result.percentage = (result.cumulative_time / total_time) * 100

        return results

    def enable(self) -> None:
        """Enable profiling."""
        self.enabled = True

    def disable(self) -> None:
        """Disable profiling and stop all active profiles."""
        self.enabled = False
        with self.profile_lock:
            for profile in self.profiles.values():
                profile.disable()

    def get_profile_results(self, name: str) -> Optional[List[ProfileResult]]:
        """Get profiling results for specified name."""
        return self.results.get(name)

    def get_top_functions(self, name: str, limit: int = 10) -> List[ProfileResult]:
        """Get top functions by cumulative time."""
        results = self.results.get(name, [])
        return sorted(results, key=lambda r: r.cumulative_time, reverse=True)[:limit]

    def clear_profile(self, name: str) -> None:
        """Clear profiling results for specified name."""
        with self.profile_lock:
            if name in self.profiles:
                del self.profiles[name]
            if name in self.results:
                del self.results[name]

    def clear_all_profiles(self) -> None:
        """Clear all profiling data."""
        with self.profile_lock:
            self.profiles.clear()
            self.results.clear()

def profile_function(name: Optional[str] = None):
    """Decorator to profile function execution."""
    def decorator(func: Callable) -> Callable:
        profiler = PerformanceProfiler()
        profiler.enable()

        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            profile_name = name or f"{func.__module__}.{func.__name__}"
            profiler.start_profiling(profile_name)

            try:
                result = func(*args, **kwargs)
                return result
            finally:
                profiler.stop_profiling(profile_name)

        return wrapper
    return decorator
```

### 3. Performance Dashboard

```python
import json
import time
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
import matplotlib.pyplot as plt
import numpy as np

@dataclass
class DashboardWidget:
    """Dashboard widget configuration."""
    widget_type: str  # metric, chart, alert, table
    title: str
    metrics: List[str]
    refresh_interval: float = 5.0
    config: Dict[str, Any] = None

class PerformanceDashboard:
    """Real-time performance monitoring dashboard."""

    def __init__(self, monitor: PerformanceMonitor):
        self.monitor = monitor
        self.widgets: Dict[str, DashboardWidget] = {}
        self.is_running = False
        self.dashboard_thread = None

    def add_widget(self, widget_id: str, widget: DashboardWidget) -> None:
        """Add widget to dashboard."""
        self.widgets[widget_id] = widget

    def remove_widget(self, widget_id: str) -> None:
        """Remove widget from dashboard."""
        if widget_id in self.widgets:
            del self.widgets[widget_id]

    def start_dashboard(self) -> None:
        """Start dashboard rendering."""
        if self.is_running:
            return

        self.is_running = True
        self.dashboard_thread = threading.Thread(
            target=self._dashboard_loop,
            daemon=True
        )
        self.dashboard_thread.start()

    def stop_dashboard(self) -> None:
        """Stop dashboard rendering."""
        self.is_running = False
        if self.dashboard_thread:
            self.dashboard_thread.join(timeout=5)

    def _dashboard_loop(self) -> None:
        """Main dashboard rendering loop."""
        while self.is_running:
            try:
                self._render_dashboard()
                time.sleep(1.0)  # Refresh every second
            except Exception as e:
                logging.error(f"Dashboard rendering error: {e}")

    def _render_dashboard(self) -> None:
        """Render current dashboard state."""
        # Clear screen
        print("\033[2J\033[H")

        # Render header
        self._render_header()

        # Render widgets
        for widget_id, widget in self.widgets.items():
            self._render_widget(widget_id, widget)

        # Render footer
        self._render_footer()

    def _render_header(self) -> None:
        """Render dashboard header."""
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
        print(f"Learning Catalyst Performance Dashboard - {timestamp}")
        print("=" * 80)
        print()

    def _render_widget(self, widget_id: str, widget: DashboardWidget) -> None:
        """Render individual widget."""
        print(f"┌─ {widget.title} ─")

        if widget.widget_type == "metric":
            self._render_metric_widget(widget)
        elif widget.widget_type == "chart":
            self._render_chart_widget(widget)
        elif widget.widget_type == "alert":
            self._render_alert_widget(widget)
        elif widget.widget_type == "table":
            self._render_table_widget(widget)

        print("└" + "─" * (len(widget.title) + 4))
        print()

    def _render_metric_widget(self, widget: DashboardWidget) -> None:
        """Render metric widget."""
        for metric_name in widget.metrics:
            current_value = self.monitor._get_current_metric_value(metric_name)
            if current_value is not None:
                print(f"  {metric_name}: {current_value:.2f}")
            else:
                print(f"  {metric_name}: N/A")

    def _render_chart_widget(self, widget: DashboardWidget) -> None:
        """Render simple ASCII chart widget."""
        for metric_name in widget.metrics:
            history = self.monitor.get_metric_history(metric_name, duration=300)  # 5 minutes
            if history:
                values = [m.value for m in history]
                self._render_ascii_chart(metric_name, values)

    def _render_ascii_chart(self, title: str, values: List[float]) -> None:
        """Render ASCII chart for values."""
        if not values:
            return

        height = 10
        width = 40

        # Normalize values
        min_val, max_val = min(values), max(values)
        if max_val == min_val:
            max_val += 1

        normalized = [(v - min_val) / (max_val - min_val) for v in values]

        # Create chart
        chart_rows = []
        for row in range(height, -1, -1):
            row_str = ""
            for col in range(width):
                if col < len(normalized):
                    value = normalized[col] * height
                    if value >= row:
                        row_str += "█"
                    else:
                        row_str += " "
                else:
                    row_str += " "
            chart_rows.append(f"  {row_str}")

        # Print chart
        print(f"  {title}")
        for row in chart_rows:
            print(row)
        print(f"  Min: {min_val:.2f}  Max: {max_val:.2f}")

    def _render_alert_widget(self, widget: DashboardWidget) -> None:
        """Render alert status widget."""
        active_alerts = [
            alert for alert in self.monitor.alerts.values()
            if alert.trigger_count > 0 and
            time.time() - alert.last_triggered < 3600  # Last hour
        ]

        if active_alerts:
            print("  ⚠️  Active Alerts:")
            for alert in active_alerts:
                last_triggered = time.strftime("%H:%M:%S",
                                              time.localtime(alert.last_triggered))
                print(f"    • {alert.name} ({alert.severity}) - {last_triggered}")
        else:
            print("  ✅ No active alerts")

    def _render_table_widget(self, widget: DashboardWidget) -> None:
        """Render table widget."""
        # This would render a formatted table of metrics
        print("  Metric Table (last hour average):")

        for metric_name in widget.metrics:
            history = self.monitor.get_metric_history(metric_name, duration=3600)
            if history:
                values = [m.value for m in history]
                avg_value = sum(values) / len(values)
                latest_value = values[-1]
                unit = history[-1].unit

                print(f"    {metric_name}: {avg_value:.2f} {unit} (latest: {latest_value:.2f})")

    def _render_footer(self) -> None:
        """Render dashboard footer."""
        summary = self.monitor.get_performance_summary()
        print(f"Memory Usage: {psutil.virtual_memory().percent:.1f}%  ")
        print(f"CPU Usage: {psutil.cpu_percent():.1f}%  ")
        print(f"Uptime: {time.strftime('%H:%M:%S', time.gmtime(time.time() - start_time))}")

    def export_dashboard_data(self, format: str = 'json') -> str:
        """Export dashboard data for external visualization."""
        data = {
            'timestamp': time.time(),
            'widgets': {}
        }

        for widget_id, widget in self.widgets.items():
            widget_data = {
                'type': widget.widget_type,
                'title': widget.title,
                'metrics': {}
            }

            for metric_name in widget.metrics:
                history = self.monitor.get_metric_history(metric_name, duration=3600)
                if history:
                    widget_data['metrics'][metric_name] = [
                        {
                            'timestamp': m.timestamp,
                            'value': m.value,
                            'unit': m.unit
                        }
                        for m in history
                    ]

            data['widgets'][widget_id] = widget_data

        if format == 'json':
            return json.dumps(data, indent=2)
        else:
            raise ValueError(f"Unsupported format: {format}")

    def create_default_dashboard(self) -> None:
        """Create a default dashboard with common widgets."""
        # System metrics widget
        self.add_widget("system_metrics", DashboardWidget(
            widget_type="metric",
            title="System Metrics",
            metrics=["cpu_usage", "memory_usage", "process_memory_usage"],
            refresh_interval=5.0
        ))

        # Performance charts widget
        self.add_widget("performance_charts", DashboardWidget(
            widget_type="chart",
            title="Performance Trends",
            metrics=["cpu_usage", "memory_usage"],
            refresh_interval=10.0
        ))

        # Alerts widget
        self.add_widget("alerts", DashboardWidget(
            widget_type="alert",
            title="Alert Status",
            metrics=[],
            refresh_interval=5.0
        ))

        # Application metrics table
        self.add_widget("app_metrics", DashboardWidget(
            widget_type="table",
            title="Application Metrics",
            metrics=["gc_collections", "thread_count", "cache_hit_rate"],
            refresh_interval=10.0
        ))
```

## Real-time Monitoring

### 1. Performance Metrics Collection

```python
import time
import threading
from typing import Dict, List, Any, Callable
from collections import defaultdict
import statistics

class RealTimeMetrics:
    """Real-time metrics collection and analysis."""

    def __init__(self, window_size: int = 60):
        self.window_size = window_size
        self.metrics: Dict[str, List[float]] = defaultdict(list)
        self.timestamps: Dict[str, List[float]] = defaultdict(list)
        self.lock = threading.Lock()

    def add_metric(self, name: str, value: float, timestamp: Optional[float] = None) -> None:
        """Add metric value with timestamp."""
        if timestamp is None:
            timestamp = time.time()

        with self.lock:
            self.metrics[name].append(value)
            self.timestamps[name].append(timestamp)

            # Keep only recent values within window
            cutoff_time = timestamp - self.window_size

            # Remove old values
            while (self.timestamps[name] and
                   self.timestamps[name][0] < cutoff_time):
                self.metrics[name].pop(0)
                self.timestamps[name].pop(0)

    def get_current_value(self, name: str) -> Optional[float]:
        """Get most recent metric value."""
        with self.lock:
            if self.metrics[name]:
                return self.metrics[name][-1]
            return None

    def get_statistics(self, name: str, duration: Optional[float] = None) -> Dict[str, float]:
        """Get statistical summary for metric."""
        with self.lock:
            values = self.metrics[name].copy()
            timestamps = self.timestamps[name].copy()

        if not values:
            return {}

        # Filter by duration if specified
        if duration is not None:
            cutoff_time = time.time() - duration
            filtered_values = []
            for value, timestamp in zip(values, timestamps):
                if timestamp > cutoff_time:
                    filtered_values.append(value)
            values = filtered_values

        if not values:
            return {}

        return {
            'count': len(values),
            'avg': statistics.mean(values),
            'min': min(values),
            'max': max(values),
            'median': statistics.median(values),
            'std_dev': statistics.stdev(values) if len(values) > 1 else 0,
            'sum': sum(values)
        }

    def get_rate(self, name: str, duration: float = 60.0) -> Optional[float]:
        """Calculate rate of change per second."""
        with self.lock:
            values = self.metrics[name].copy()
            timestamps = self.timestamps[name].copy()

        if len(values) < 2:
            return None

        # Get values within duration
        cutoff_time = time.time() - duration
        recent_values = []
        recent_timestamps = []

        for value, timestamp in zip(values, timestamps):
            if timestamp > cutoff_time:
                recent_values.append(value)
                recent_timestamps.append(timestamp)

        if len(recent_values) < 2:
            return None

        # Calculate rate
        time_diff = recent_timestamps[-1] - recent_timestamps[0]
        value_diff = recent_values[-1] - recent_values[0]

        if time_diff > 0:
            return value_diff / time_diff
        return None

    def get_percentile(self, name: str, percentile: float,
                      duration: Optional[float] = None) -> Optional[float]:
        """Get percentile value for metric."""
        with self.lock:
            values = self.metrics[name].copy()
            timestamps = self.timestamps[name].copy()

        if not values:
            return None

        # Filter by duration if specified
        if duration is not None:
            cutoff_time = time.time() - duration
            filtered_values = []
            for value, timestamp in zip(values, timestamps):
                if timestamp > cutoff_time:
                    filtered_values.append(value)
            values = filtered_values

        if not values:
            return None

        values.sort()
        index = int(len(values) * percentile / 100)
        return values[min(index, len(values) - 1)]

    def clear_metric(self, name: str) -> None:
        """Clear all values for a metric."""
        with self.lock:
            self.metrics[name].clear()
            self.timestamps[name].clear()

    def clear_all_metrics(self) -> None:
        """Clear all metrics."""
        with self.lock:
            self.metrics.clear()
            self.timestamps.clear()
```

### 2. Performance Alerts System

```python
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List, Dict, Any, Optional
import logging
import time

class AlertManager:
    """Advanced alert management system."""

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or {}
        self.alert_handlers: Dict[str, Callable] = {}
        self.alert_history: List[Dict[str, Any]] = []
        self.alert_cooldowns: Dict[str, float] = {}

        # Setup default handlers
        self._setup_default_handlers()

    def _setup_default_handlers(self) -> None:
        """Setup default alert handlers."""
        self.alert_handlers['log'] = self._log_alert
        self.alert_handlers['console'] = self._console_alert

        if self.config.get('email_enabled'):
            self.alert_handlers['email'] = self._email_alert

    def register_handler(self, name: str, handler: Callable) -> None:
        """Register custom alert handler."""
        self.alert_handlers[name] = handler

    def trigger_alert(self, alert_name: str, message: str, severity: str = 'medium',
                     metadata: Optional[Dict[str, Any]] = None) -> None:
        """Trigger an alert."""
        # Check cooldown
        if self._is_cooldown_active(alert_name):
            return

        alert_data = {
            'name': alert_name,
            'message': message,
            'severity': severity,
            'timestamp': time.time(),
            'metadata': metadata or {}
        }

        # Add to history
        self.alert_history.append(alert_data)

        # Keep only recent history (last 1000 alerts)
        if len(self.alert_history) > 1000:
            self.alert_history = self.alert_history[-1000:]

        # Set cooldown
        cooldown_period = self.config.get('alert_cooldown', 300)  # 5 minutes default
        self.alert_cooldowns[alert_name] = time.time() + cooldown_period

        # Handle alert
        self._handle_alert(alert_data)

    def _is_cooldown_active(self, alert_name: str) -> bool:
        """Check if alert is in cooldown period."""
        if alert_name not in self.alert_cooldowns:
            return False

        return time.time() < self.alert_cooldowns[alert_name]

    def _handle_alert(self, alert_data: Dict[str, Any]) -> None:
        """Process alert through all handlers."""
        for handler_name, handler in self.alert_handlers.items():
            try:
                handler(alert_data)
            except Exception as e:
                logging.error(f"Alert handler '{handler_name}' failed: {e}")

    def _log_alert(self, alert_data: Dict[str, Any]) -> None:
        """Log alert to file."""
        severity_map = {
            'low': logging.INFO,
            'medium': logging.WARNING,
            'high': logging.ERROR,
            'critical': logging.CRITICAL
        }

        level = severity_map.get(alert_data['severity'], logging.WARNING)
        logging.log(level, f"ALERT: {alert_data['name']} - {alert_data['message']}")

    def _console_alert(self, alert_data: Dict[str, Any]) -> None:
        """Print alert to console."""
        severity_symbols = {
            'low': '🔵',
            'medium': '🟡',
            'high': '🟠',
            'critical': '🔴'
        }

        symbol = severity_symbols.get(alert_data['severity'], '⚠️')
        print(f"{symbol} ALERT: {alert_data['name']} - {alert_data['message']}")

    def _email_alert(self, alert_data: Dict[str, Any]) -> None:
        """Send alert via email."""
        email_config = self.config.get('email', {})
        if not email_config:
            return

        try:
            msg = MIMEMultipart()
            msg['From'] = email_config.get('from')
            msg['To'] = email_config.get('to')
            msg['Subject'] = f"Learning Catalyst Alert: {alert_data['name']}"

            body = f"""
            Alert Details:
            - Name: {alert_data['name']}
            - Severity: {alert_data['severity']}
            - Message: {alert_data['message']}
            - Time: {time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(alert_data['timestamp']))}

            Metadata:
            {json.dumps(alert_data['metadata'], indent=2)}
            """

            msg.attach(MIMEText(body, 'plain'))

            # Send email (implementation depends on SMTP server)
            server = smtplib.SMTP(email_config.get('smtp_server'), email_config.get('smtp_port'))
            server.starttls()
            server.login(email_config.get('username'), email_config.get('password'))
            server.send_message(msg)
            server.quit()

            logging.info(f"Alert email sent: {alert_data['name']}")

        except Exception as e:
            logging.error(f"Failed to send alert email: {e}")

    def get_alert_statistics(self, duration: float = 86400) -> Dict[str, Any]:
        """Get alert statistics over specified duration."""
        cutoff_time = time.time() - duration
        recent_alerts = [
            alert for alert in self.alert_history
            if alert['timestamp'] > cutoff_time
        ]

        severity_counts = {}
        for alert in recent_alerts:
            severity = alert['severity']
            severity_counts[severity] = severity_counts.get(severity, 0) + 1

        return {
            'total_alerts': len(recent_alerts),
            'severity_breakdown': severity_counts,
            'unique_alert_names': len(set(alert['name'] for alert in recent_alerts)),
            'most_common_alert': self._get_most_common_alert(recent_alerts)
        }

    def _get_most_common_alert(self, alerts: List[Dict[str, Any]]) -> Optional[str]:
        """Get most frequently triggered alert."""
        if not alerts:
            return None

        alert_counts = {}
        for alert in alerts:
            name = alert['name']
            alert_counts[name] = alert_counts.get(name, 0) + 1

        return max(alert_counts, key=alert_counts.get)
```

## Performance Optimization

### 1. Performance Bottleneck Detection

```python
import time
import threading
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
import statistics

@dataclass
class BottleneckInfo:
    """Performance bottleneck information."""
    component: str
    metric_name: str
    current_value: float
    threshold: float
    severity: str
    recommendation: str
    detected_at: float

class BottleneckDetector:
    """Detects performance bottlenecks based on metrics."""

    def __init__(self, monitor: PerformanceMonitor):
        self.monitor = monitor
        self.bottlenecks: Dict[str, BottleneckInfo] = {}
        self.thresholds = self._setup_default_thresholds()

    def _setup_default_thresholds(self) -> Dict[str, Dict[str, Any]]:
        """Setup default bottleneck thresholds."""
        return {
            'memory_usage': {
                'threshold': 85.0,
                'severity': 'high',
                'recommendation': 'Consider increasing memory or optimizing memory usage'
            },
            'cpu_usage': {
                'threshold': 90.0,
                'severity': 'critical',
                'recommendation': 'Check for CPU-intensive operations and optimize algorithms'
            },
            'avg_response_time': {
                'threshold': 3.0,
                'severity': 'medium',
                'recommendation': 'Optimize slow operations and consider caching'
            },
            'cache_hit_rate': {
                'threshold': 60.0,
                'severity': 'low',
                'recommendation': 'Improve caching strategies and cache warming'
            },
            'gc_collections': {
                'threshold': 100,
                'severity': 'medium',
                'recommendation': 'Reduce object creation and implement object pooling'
            },
            'thread_count': {
                'threshold': 50,
                'severity': 'medium',
                'recommendation': 'Review thread usage and implement thread pooling'
            }
        }

    def detect_bottlenecks(self) -> List[BottleneckInfo]:
        """Detect current performance bottlenecks."""
        detected = []
        current_time = time.time()

        for metric_name, threshold_config in self.thresholds.items():
            current_value = self.monitor._get_current_metric_value(metric_name)

            if current_value is None:
                continue

            threshold = threshold_config['threshold']

            # Check if threshold is exceeded
            if self._is_bottleneck(metric_name, current_value, threshold):
                bottleneck_id = f"{metric_name}_{int(current_time // 60)}"  # Per-minute ID

                bottleneck = BottleneckInfo(
                    component=metric_name,
                    metric_name=metric_name,
                    current_value=current_value,
                    threshold=threshold,
                    severity=threshold_config['severity'],
                    recommendation=threshold_config['recommendation'],
                    detected_at=current_time
                )

                detected.append(bottleneck)
                self.bottlenecks[bottleneck_id] = bottleneck

        # Clean old bottlenecks (older than 1 hour)
        self._cleanup_old_bottlenecks(current_time)

        return detected

    def _is_bottleneck(self, metric_name: str, value: float, threshold: float) -> bool:
        """Determine if metric value indicates a bottleneck."""
        # Different logic for different metric types
        if metric_name in ['memory_usage', 'cpu_usage', 'avg_response_time', 'gc_collections', 'thread_count']:
            return value > threshold
        elif metric_name == 'cache_hit_rate':
            return value < threshold
        else:
            return False

    def _cleanup_old_bottlenecks(self, current_time: float) -> None:
        """Remove old bottleneck records."""
        cutoff_time = current_time - 3600  # 1 hour ago

        old_bottlenecks = [
            bottleneck_id for bottleneck_id, bottleneck in self.bottlenecks.items()
            if bottleneck.detected_at < cutoff_time
        ]

        for bottleneck_id in old_bottlenecks:
            del self.bottlenecks[bottleneck_id]

    def get_bottleneck_summary(self) -> Dict[str, Any]:
        """Get summary of current bottlenecks."""
        if not self.bottlenecks:
            return {
                'active_bottlenecks': 0,
                'severity_breakdown': {},
                'recommendations': []
            }

        severity_counts = {}
        recommendations = []

        for bottleneck in self.bottlenecks.values():
            severity = bottleneck.severity
            severity_counts[severity] = severity_counts.get(severity, 0) + 1

            if bottleneck.recommendation not in recommendations:
                recommendations.append(bottleneck.recommendation)

        return {
            'active_bottlenecks': len(self.bottlenecks),
            'severity_breakdown': severity_counts,
            'recommendations': recommendations,
            'most_critical': self._get_most_critical_bottleneck()
        }

    def _get_most_critical_bottleneck(self) -> Optional[BottleneckInfo]:
        """Get most critical current bottleneck."""
        if not self.bottlenecks:
            return None

        severity_order = {'critical': 4, 'high': 3, 'medium': 2, 'low': 1}

        most_critical = max(
            self.bottlenecks.values(),
            key=lambda b: (
                severity_order.get(b.severity, 0),
                b.current_value / b.threshold if b.threshold > 0 else 0
            )
        )

        return most_critical

    def update_threshold(self, metric_name: str, threshold: float,
                        severity: str = None, recommendation: str = None) -> None:
        """Update threshold for a metric."""
        if metric_name in self.thresholds:
            self.thresholds[metric_name]['threshold'] = threshold
            if severity:
                self.thresholds[metric_name]['severity'] = severity
            if recommendation:
                self.thresholds[metric_name]['recommendation'] = recommendation
        else:
            self.thresholds[metric_name] = {
                'threshold': threshold,
                'severity': severity or 'medium',
                'recommendation': recommendation or 'Review performance'
            }

    def get_optimization_recommendations(self) -> List[Dict[str, Any]]:
        """Get detailed optimization recommendations."""
        recommendations = []
        bottleneck_summary = self.get_bottleneck_summary()

        if bottleneck_summary['active_bottlenecks'] > 0:
            for bottleneck in self.bottlenecks.values():
                recommendation = {
                    'component': bottleneck.component,
                    'current_value': bottleneck.current_value,
                    'threshold': bottleneck.threshold,
                    'severity': bottleneck.severity,
                    'recommendation': bottleneck.recommendation,
                    'priority': self._calculate_priority(bottleneck),
                    'estimated_impact': self._estimate_impact(bottleneck)
                }
                recommendations.append(recommendation)

        # Sort by priority
        recommendations.sort(key=lambda r: r['priority'], reverse=True)

        return recommendations

    def _calculate_priority(self, bottleneck: BottleneckInfo) -> float:
        """Calculate priority score for bottleneck."""
        severity_scores = {'critical': 4.0, 'high': 3.0, 'medium': 2.0, 'low': 1.0}
        severity_score = severity_scores.get(bottleneck.severity, 2.0)

        # Factor in how much the threshold is exceeded
        excess_ratio = bottleneck.current_value / bottleneck.threshold

        return severity_score * excess_ratio

    def _estimate_impact(self, bottleneck: BottleneckInfo) -> str:
        """Estimate performance impact of bottleneck."""
        if bottleneck.severity == 'critical':
            return "Severe performance degradation, system may be unusable"
        elif bottleneck.severity == 'high':
            return "Significant performance impact, user experience affected"
        elif bottleneck.severity == 'medium':
            return "Moderate performance impact, noticeable slowdown"
        else:
            return "Minor performance impact, slight degradation"
```

### 2. Performance Optimization Engine

```python
import asyncio
import time
from typing import Dict, List, Any, Optional, Callable
from dataclasses import dataclass

@dataclass
class OptimizationAction:
    """Performance optimization action."""
    name: str
    description: str
    action_type: str  # 'cache', 'memory', 'algorithm', 'configuration'
    priority: int
    estimated_improvement: float
    implementation_complexity: str  # 'low', 'medium', 'high'
    prerequisites: List[str]
    implementation_func: Optional[Callable] = None

class PerformanceOptimizer:
    """Automated performance optimization system."""

    def __init__(self, monitor: PerformanceMonitor):
        self.monitor = monitor
        self.bottleneck_detector = BottleneckDetector(monitor)
        self.optimization_actions: List[OptimizationAction] = []
        self.implemented_actions: List[str] = []
        self.optimization_history: List[Dict[str, Any]] = []

        # Setup built-in optimization actions
        self._setup_builtin_optimizations()

    def _setup_builtin_optimizations(self) -> None:
        """Setup built-in optimization actions."""
        builtin_actions = [
            OptimizationAction(
                name="increase_cache_size",
                description="Increase memory cache size to improve hit rate",
                action_type="cache",
                priority=2,
                estimated_improvement=15.0,
                implementation_complexity="low",
                prerequisites=["cache_manager_access"],
                implementation_func=self._increase_cache_size
            ),
            OptimizationAction(
                name="enable_cache_warming",
                description="Enable cache warming for common queries",
                action_type="cache",
                priority=3,
                estimated_improvement=25.0,
                implementation_complexity="medium",
                prerequisites=["common_queries_data"],
                implementation_func=self._enable_cache_warming
            ),
            OptimizationAction(
                name="optimize_gc_settings",
                description="Optimize garbage collection settings",
                action_type="memory",
                priority=1,
                estimated_improvement=10.0,
                implementation_complexity="low",
                prerequisites=[],
                implementation_func=self._optimize_gc_settings
            ),
            OptimizationAction(
                name="implement_response_caching",
                description="Implement response caching for AI queries",
                action_type="cache",
                priority=4,
                estimated_improvement=40.0,
                implementation_complexity="high",
                prerequisites=["response_cache_implementation"],
                implementation_func=self._implement_response_caching
            )
        ]

        self.optimization_actions.extend(builtin_actions)

    def analyze_and_recommend(self) -> List[OptimizationAction]:
        """Analyze current performance and recommend optimizations."""
        # Detect bottlenecks
        bottlenecks = self.bottleneck_detector.detect_bottlenecks()

        # Get relevant optimization actions
        recommendations = []

        for bottleneck in bottlenecks:
            relevant_actions = self._get_relevant_actions(bottleneck)
            recommendations.extend(relevant_actions)

        # Remove duplicates and sort by priority
        unique_recommendations = list({action.name: action for action in recommendations}.values())
        unique_recommendations.sort(key=lambda a: a.priority, reverse=True)

        return unique_recommendations

    def _get_relevant_actions(self, bottleneck: BottleneckInfo) -> List[OptimizationAction]:
        """Get optimization actions relevant to a bottleneck."""
        relevant_actions = []

        # Map bottlenecks to relevant action types
        bottleneck_action_map = {
            'memory_usage': ['memory'],
            'cache_hit_rate': ['cache'],
            'avg_response_time': ['cache', 'algorithm'],
            'gc_collections': ['memory'],
            'cpu_usage': ['algorithm', 'configuration']
        }

        relevant_types = bottleneck_action_map.get(bottleneck.component, [])

        for action in self.optimization_actions:
            if (action.action_type in relevant_types and
                action.name not in self.implemented_actions):
                relevant_actions.append(action)

        return relevant_actions

    async def implement_optimization(self, action: OptimizationAction) -> bool:
        """Implement an optimization action."""
        if action.name in self.implemented_actions:
            return True

        # Check prerequisites
        if not self._check_prerequisites(action.prerequisites):
            logging.warning(f"Cannot implement {action.name}: prerequisites not met")
            return False

        # Record baseline metrics
        baseline = self.monitor.get_performance_summary(duration=300)  # 5 minutes

        try:
            # Implement the optimization
            start_time = time.time()

            if action.implementation_func:
                success = await action.implementation_func()
            else:
                success = await self._default_implementation(action)

            implementation_time = time.time() - start_time

            if success:
                # Record implementation
                self.implemented_actions.append(action.name)

                # Record in history
                self.optimization_history.append({
                    'action_name': action.name,
                    'timestamp': time.time(),
                    'implementation_time': implementation_time,
                    'baseline_metrics': baseline,
                    'success': True
                })

                logging.info(f"Successfully implemented optimization: {action.name}")
                return True
            else:
                logging.error(f"Failed to implement optimization: {action.name}")
                return False

        except Exception as e:
            logging.error(f"Error implementing optimization {action.name}: {e}")
            return False

    def _check_prerequisites(self, prerequisites: List[str]) -> bool:
        """Check if prerequisites are met for optimization."""
        # This would check system state, dependencies, etc.
        # For now, assume all prerequisites are met
        return True

    async def _default_implementation(self, action: OptimizationAction) -> bool:
        """Default implementation for optimization actions."""
        logging.info(f"Implementing optimization: {action.name}")

        # Simulate implementation time
        await asyncio.sleep(1)

        return True

    async def _increase_cache_size(self) -> bool:
        """Increase cache size optimization."""
        # Implementation would increase cache sizes
        logging.info("Increasing cache sizes...")
        return True

    async def _enable_cache_warming(self) -> bool:
        """Enable cache warming optimization."""
        # Implementation would enable cache warming
        logging.info("Enabling cache warming...")
        return True

    async def _optimize_gc_settings(self) -> bool:
        """Optimize garbage collection settings."""
        import gc

        # Optimize GC settings
        gc.set_threshold(700, 10, 10)

        logging.info("Optimized garbage collection settings")
        return True

    async def _implement_response_caching(self) -> bool:
        """Implement response caching optimization."""
        # Implementation would set up response caching
        logging.info("Implementing response caching...")
        return True

    def measure_optimization_impact(self, action_name: str,
                                   duration: float = 1800) -> Dict[str, Any]:
        """Measure the impact of an implemented optimization."""
        # Find optimization in history
        optimization_record = None
        for record in self.optimization_history:
            if record['action_name'] == action_name:
                optimization_record = record
                break

        if not optimization_record:
            return {'error': 'Optimization not found in history'}

        # Get current metrics
        current_metrics = self.monitor.get_performance_summary(duration=duration)
        baseline_metrics = optimization_record['baseline_metrics']

        # Calculate improvements
        improvements = self._calculate_improvements(baseline_metrics, current_metrics)

        return {
            'action_name': action_name,
            'implementation_time': optimization_record['timestamp'],
            'measurement_duration': duration,
            'baseline_metrics': baseline_metrics,
            'current_metrics': current_metrics,
            'improvements': improvements,
            'success': improvements.get('overall_improvement', 0) > 0
        }

    def _calculate_improvements(self, baseline: Dict[str, Any],
                               current: Dict[str, Any]) -> Dict[str, float]:
        """Calculate performance improvements."""
        improvements = {}

        # Compare metrics
        for metric_name, baseline_value in baseline.get('metrics', {}).items():
            if metric_name in current.get('metrics', {}):
                current_value = current['metrics'][metric_name]

                if metric_name in ['hit_rate']:
                    # Higher is better
                    improvement = ((current_value['avg'] - baseline_value['avg']) /
                                 baseline_value['avg']) * 100
                else:
                    # Lower is better (response times, usage)
                    improvement = ((baseline_value['avg'] - current_value['avg']) /
                                 baseline_value['avg']) * 100

                improvements[metric_name] = improvement

        # Calculate overall improvement
        if improvements:
            improvements['overall_improvement'] = statistics.mean(improvements.values())
        else:
            improvements['overall_improvement'] = 0.0

        return improvements

    def get_optimization_report(self) -> Dict[str, Any]:
        """Generate comprehensive optimization report."""
        # Get current bottlenecks
        bottlenecks = self.bottleneck_detector.detect_bottlenecks()

        # Get recommendations
        recommendations = self.analyze_and_recommend()

        # Get implemented actions impact
        implemented_impacts = []
        for action_name in self.implemented_actions:
            impact = self.measure_optimization_impact(action_name)
            implemented_impacts.append(impact)

        return {
            'timestamp': time.time(),
            'current_bottlenecks': len(bottlenecks),
            'bottleneck_summary': self.bottleneck_detector.get_bottleneck_summary(),
            'recommendations': [
                {
                    'name': action.name,
                    'priority': action.priority,
                    'estimated_improvement': action.estimated_improvement,
                    'complexity': action.implementation_complexity
                }
                for action in recommendations[:5]  # Top 5 recommendations
            ],
            'implemented_actions': len(self.implemented_actions),
            'implemented_impacts': implemented_impacts,
            'optimization_score': self._calculate_optimization_score()
        }

    def _calculate_optimization_score(self) -> float:
        """Calculate overall optimization score."""
        # Factors: number of bottlenecks, implemented actions, measured improvements
        bottlenecks = len(self.bottleneck_detector.bottlenecks)
        implemented = len(self.implemented_actions)

        # Start with base score
        score = 50.0

        # Penalize for bottlenecks
        score -= bottlenecks * 10

        # Reward for implemented actions
        score += implemented * 15

        # Reward for measured improvements
        total_improvement = 0
        for action_name in self.implemented_actions:
            impact = self.measure_optimization_impact(action_name)
            if 'improvements' in impact:
                total_improvement += impact['improvements'].get('overall_improvement', 0)

        score += total_improvement * 2

        return min(max(score, 0), 100)  # Clamp between 0-100
```

## Examples and Use Cases

### 1. Basic Performance Monitoring

```python
# Initialize monitoring system
monitor = PerformanceMonitor()
monitor.start_monitoring()

# Add custom metrics
monitor.add_custom_metric("query_processing_time", 1.2, "seconds")
monitor.add_custom_metric("api_calls_count", 150, "count")

# Get performance summary
summary = monitor.get_performance_summary()
print(f"Average CPU: {summary['metrics']['cpu_usage']['avg']:.1f}%")
print(f"Average memory: {summary['metrics']['memory_usage']['avg']:.1f}%")
```

### 2. Setting Up Performance Alerts

```python
# Initialize alert manager
alert_manager = AlertManager({
    'email_enabled': True,
    'email': {
        'smtp_server': 'smtp.gmail.com',
        'smtp_port': 587,
        'from': 'alerts@learningcatalyst.com',
        'to': 'admin@learningcatalyst.com',
        'username': 'alerts@learningcatalyst.com',
        'password': 'password'
    }
})

# Register custom alert handler
def slack_alert_handler(alert_data):
    # Send to Slack
    print(f"Slack Alert: {alert_data['name']} - {alert_data['message']}")

alert_manager.register_handler('slack', slack_alert_handler)

# Trigger alert
alert_manager.trigger_alert(
    "high_memory_usage",
    "Memory usage exceeded 90%",
    "high",
    {"current_usage": 92.5}
)
```

### 3. Performance Dashboard

```python
# Initialize dashboard
dashboard = PerformanceDashboard(monitor)
dashboard.create_default_dashboard()
dashboard.start_dashboard()

# The dashboard will now display real-time performance metrics
# in the console with automatic updates

# Add custom widget
dashboard.add_widget("custom_metrics", DashboardWidget(
    widget_type="table",
    title="Custom Metrics",
    metrics=["query_processing_time", "api_calls_count"],
    refresh_interval=5.0
))
```

### 4. Automated Optimization

```python
# Initialize optimizer
optimizer = PerformanceOptimizer(monitor)

# Get optimization recommendations
recommendations = optimizer.analyze_and_recommend()

# Implement top recommendation
if recommendations:
    top_action = recommendations[0]
    success = await optimizer.implement_optimization(top_action)

    if success:
        # Measure impact after 30 minutes
        await asyncio.sleep(1800)
        impact = optimizer.measure_optimization_impact(top_action.name)
        print(f"Optimization impact: {impact['improvements']}")
```

## CLI Integration

### Monitoring Commands

```bash
# Start performance monitoring
Learning Catalyst > /system monitor start
✅ Performance monitoring started

# Show real-time metrics
Learning Catalyst > /system metrics
📊 Current Performance:
  CPU Usage: 23.5%
  Memory Usage: 45.2%
  Response Time: 0.8s
  Cache Hit Rate: 78.5%

# Show performance summary
Learning Catalyst > /system performance summary
📈 Performance Summary (Last Hour):
  Average CPU: 25.3%
  Peak Memory: 52.1%
  Total Queries: 1,247
  Cache Hit Rate: 76.8%

# Check for bottlenecks
Learning Catalyst > /system bottlenecks
🔍 Performance Bottlenecks:
  ⚠️  Memory usage trending upward (currently: 45.2%)
  ✅ CPU usage is normal
  ✅ Response times are optimal

# Get optimization recommendations
Learning Catalyst > /system optimize recommendations
💡 Optimization Recommendations:
  1. Increase cache size (Priority: High, Est. improvement: 15%)
  2. Enable cache warming (Priority: Medium, Est. improvement: 25%)
```

## Troubleshooting

### Common Monitoring Issues

1. **High Memory Usage**
   - Check for memory leaks in long-running processes
   - Monitor garbage collection patterns
   - Review cache sizes and TTL settings

2. **Slow Response Times**
   - Profile slow operations
   - Check database query performance
   - Review API call batching

3. **High CPU Usage**
   - Profile CPU-intensive functions
   - Check for inefficient algorithms
   - Review threading patterns

### Performance Tuning Commands

```bash
# Adjust monitoring sensitivity
Learning Catalyst > /config set monitoring.collection_interval 0.5
✅ Collection interval set to 0.5 seconds

# Set custom alert threshold
Learning Catalyst > /config set alerts.memory_threshold 90
✅ Memory alert threshold set to 90%

# Enable performance profiling
Learning Catalyst > /system profile start ai_response_generation
✅ Profiling started for 'ai_response_generation'

# View profiling results
Learning Catalyst > /system profile show ai_response_generation
📊 Profile Results (Top 10 functions):
  1. openai_chat_completion (45.2% of total time)
  2. embedding_generation (23.1% of total time)
  3. response_processing (12.3% of total time)
```

## Related Documentation

- [Memory Management](memory-management.md)
- [Caching Strategies](caching-strategies.md)
- [API Optimization](api-optimization.md)
- [System Architecture](../system-architecture/README.md)