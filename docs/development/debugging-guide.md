        label = snapshot["label"]
            prefix = label.split()[0] if label else "unknown"
            label_groups[prefix] = label_groups.get(prefix, [])

        if self.debug_mode:
            print(f"[DEBUG] Memory analysis:")
            print(f"   Total snapshots: {total_snapshots}")
            print(f"   Total delta: {total_memory_delta:.2f}MB")
            print(f"   Peak delta: {peak_memory_delta:.2f}MB}")
            print(f"   Label groups: {list(label_groups.keys())}")

        return {
            "total_snapshots": total_snapshots,
            "total_memory_delta": total_memory_delta,
            "peak_memory_delta": peak_memory_delta,
            "baseline_memory": self.baseline_memory,
            "current_memory": self.memory_snapshots[-1]["total_memory"] if self.memory_snapshots else 0,
            "label_groups": label_groups,
            "snapshots": self.memory_snapshots
        }

    def detect_memory_leaks(self) -> List[Dict[str, Any]]:
        """Detect potential memory leaks"""

        if not self.memory_snapshots:
            return []

        leaks = []

        # Look for continuously growing memory usage
        for i in range(1, len(self.memory_snapshots)):
            prev_snapshot = self.memory_snapshots[i-1]
            curr_snapshot = self.memory_snapshots[i]

            # Check if memory is consistently growing
            if (curr_snapshot["memory_delta"] > prev_snapshot["memory_delta"] * 1.1 and
                curr_snapshot["memory_delta"] > 1.0):  # More than 1MB growth

                leaks.append({
                    "snapshot": curr_snapshot,
                    "index": i,
                    "growth_trend": "increasing"
                })

        if self.debug_mode and leaks:
            print(f"[DEBUG] Memory leak detection:")
            print(f"   Potential leaks detected: {len(leaks)}")

        return leaks

# Memory debugger usage
memory_debugger = MemoryDebugger(debug_mode=True)

# Start memory tracking
memory_debugger.start_memory_tracking()

# Take snapshots during operation
memory_debugger.take_memory_snapshot("Before operation")
# ... perform operation ...
memory_debugger.take_memory_snapshot("After operation")

# Analyze memory usage
analysis = memory_debugger.analyze_memory_usage()
print(f"Memory analysis: {analysis}")

# Detect memory leaks
leaks = memory_debugger.detect_memory_leaks()
print(f"Memory leaks detected: {leaks}")
```

## 💾 Database and State Debugging

### Debug Database Operations

**Debug Database Connections:**

```python
# Debug database operations and connections
import sqlite3
import asyncio
from typing import Dict, Any, List
from pathlib import Path

class DebugDatabaseManager:
    def __init__(self, debug_mode: bool = False):
        self.debug_mode = debug_mode
        self.connection_pool = []

    def debug_connection_test(self, db_path: str) -> Dict[str, Any]:
        """Debug database connection and schema"""

        if self.debug_mode:
            print(f"[DEBUG] Testing database connection: {db_path}")
            print(f"[DEBUG] File exists: {Path(db_path).exists()}")

        try:
            # Test file access
            if not Path(db_path).exists():
                return {
                    "status": "error",
                    "error": "Database file not found",
                    "path": db_path
                }

            # Test SQLite connection
            conn = sqlite3.connect(db_path)

            if self.debug_mode:
                print(f"[DEBUG] SQLite connection established")
                print(f"[DEBUG] SQLite version: {sqlite3.sqlite_version}")

            # Check database schema
            cursor = conn.cursor()
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = cursor.fetchall()

            if self.debug_mode:
                print(f"[DEBUG] Tables found: {len(tables)}")
                for table in tables:
                    print(f"[DEBUG]   - {table[0]}")

            # Test basic query
            cursor.execute("SELECT COUNT(*) FROM sqlite_master")
            count = cursor.fetchone()[0]

            if self.debug_mode:
                print(f"[DEBUG] Total objects in master: {count}")

            conn.close()

            return {
                "status": "success",
                "path": db_path,
                "tables": [t[0] for t in tables],
                "total_objects": count,
                "sqlite_version": sqlite3.sqlite_version
            }

        except sqlite3.Error as e:
            if self.debug_mode:
                print(f"[DEBUG] ❌ SQLite error: {e}")

            return {
                "status": "error",
                "error": f"SQLite error: {e}",
                "path": db_path
            }

        except Exception as e:
            if self.debug_mode:
                print(f"[DEBUG] ❌ Unexpected error: {e}")

            return {
                "status": "error",
                "error": f"Unexpected error: {e}",
                "path": db_path
            }

    def debug_table_structure(self, db_path: str, table_name: str) -> Dict[str, Any]:
        """Debug table structure and data"""

        if self.debug_mode:
            print(f"[DEBUG] Analyzing table structure: {table_name}")

        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()

            # Get table schema
            cursor.execute(f"PRAGMA table_info({table_name})")
            columns = cursor.fetchall()

            if self.debug_mode:
                print(f"[DEBUG] Columns in {table_name}: {len(columns)}")
                for col in columns:
                    print(f"[DEBUG]   - {col[1]} {col[2]} (NULL: {col[3]}, PK: {col[5]})")

            # Get row count
            cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
            row_count = cursor.fetchone()[0]

            if self.debug_mode:
                print(f"[DEBUG] Total rows: {row_count}")

            # Get sample data
            cursor.execute(f"SELECT * FROM {table_name} LIMIT 5")
            sample_data = cursor.fetchall()

            if self.debug_mode:
                print(f"[DEBUG] Sample data rows: {len(sample_data)}")
                for i, row in enumerate(sample_data):
                    print(f"[DEBUG]   Row {i+1}: {row}")

            conn.close()

            return {
                "status": "success",
                "table_name": table_name,
                "columns": columns,
                "row_count": row_count,
                "sample_data": sample_data
            }

        except Exception as e:
            if self.debug_mode:
                print(f"[DEBUG] ❌ Table analysis error: {e}")

            return {
                "status": "error",
                "error": f"Table analysis error: {e}",
                "table_name": table_name
            }

    async def debug_async_operations(self, db_path: str) -> Dict[str, Any]:
        """Debug async database operations"""

        if self.debug_mode:
            print("[DEBUG] Testing async database operations")

        try:
            # Simulate async database operations
            conn = sqlite3.connect(db_path)

            # Test async read operation
            start_time = time.time()

            # Simulate async work
            await asyncio.sleep(0.1)

            end_time = time.time()

            if self.debug_mode:
                print(f"[DEBUG] Async operation completed in {end_time - start_time:.3f}s")

            conn.close()

            return {
                "status": "success",
                "duration": end_time - start_time,
                "async_works": True
            }

        except Exception as e:
            if self.debug_mode:
                print(f"[DEBUG] ❌ Async operation error: {e}")

            return {
                "status": "error",
                "error": f"Async operation error: {e}"
            }

# Debug database manager usage
debug_db = DebugDatabaseManager(debug_mode=True)

# Test database connection
db_test = debug_db.debug_connection_test("/path/to/database.db")
print(f"Database connection test: {db_test}")

# Test table structure
table_debug = debug_db.debug_table_structure("/path/to/database.db", "concepts")
print(f"Table structure debug: {table_debug}")

# Test async operations
async_test = await debug_db.debug_async_operations("/path/to/database.db")
print(f"Async operations debug: {async_test}")
```

### Debug State Management

**Debug State Persistence:**

```python
# Debug state management and persistence
import json
import pickle
from typing import Dict, Any, Optional
from datetime import datetime
from pathlib import Path

class DebugStateManager:
    def __init__(self, debug_mode: bool = False):
        self.debug_mode = debug_mode
        self.state_history = []

    def debug_save_state(self, state_data: Dict[str, Any], file_path: str) -> Dict[str, Any]:
        """Debug state saving with detailed logging"""

        if self.debug_mode:
            print(f"[DEBUG] 💾 Saving state to: {file_path}")
            print(f"[DEBUG] State data keys: {list(state_data.keys())}")

        try:
            # Create directory if needed
            Path(file_path).parent.mkdir(parents=True, exist_ok=True)

            # Save as JSON
            json_path = Path(file_path).with_suffix('.json')

            state_to_save = {
                "data": state_data,
                "timestamp": datetime.now().isoformat(),
                "version": "1.0.0",
                "debug_mode": self.debug_mode,
                "checksum": self._calculate_checksum(state_data)
            }

            with open(json_path, 'w', encoding='utf-8') as f:
                json.dump(state_to_save, f, indent=2)

            if self.debug_mode:
                print(f"[DEBUG] State saved successfully")
                print(f"[DEBUG] File size: {json_path.stat().st_size} bytes")
                print(f"[DEBUG] Checksum: {state_to_save['checksum']}")

            # Store in history
            self.state_history.append({
                "action": "save",
                "file_path": file_path,
                "timestamp": datetime.now().isoformat(),
                "state_keys": list(state_data.keys()),
                "file_size": json_path.stat().st_size,
                "success": True
            })

            return {
                "status": "success",
                "file_path": file_path,
                "state_size": len(str(state_data)),
                "checksum": state_to_save['checksum']
            }

        except Exception as e:
            if self.debug_mode:
                print(f"[DEBUG] ❌ State save failed: {e}")

            return {
                "status": "error",
                "error": f"State save error: {e}",
                "file_path": file_path
            }

    def debug_load_state(self, file_path: str) -> Dict[str, Any]:
        """Debug state loading with validation"""

        if self.debug_mode:
            print(f"[DEBUG] Loading state from: {file_path}")
            print(f"[DEBUG] File exists: {Path(file_path).exists()}")

        try:
            json_path = Path(file_path).with_suffix('.json')

            if not json_path.exists():
                return {
                    "status": "error",
                    "error": "State file not found",
                    "file_path": file_path
                }

            with open(json_path, 'r', encoding='utf-8') as f:
                loaded_state = json.load(f)

            # Validate state structure
            validation_result = self._validate_state_structure(loaded_state)

            if self.debug_mode:
                print(f"[DEBUG] State validation: {validation_result['is_valid']}")
                if not validation_result['is_valid']:
                    print(f"[DEBUG] Validation errors: {validation_result['errors']}")

            if validation_result['is_valid']:
                # Store in history
                self.state_history.append({
                    "action": "load",
                    "file_path": file_path,
                    "timestamp": datetime.now().isoformat(),
                    "state_keys": list(loaded_state.get('data', {}).keys()),
                    "file_size": json_path.stat().st_size,
                    "success": True
                })

                if self.debug_mode:
                    print(f"[DEBUG] State loaded successfully")
                    print(f"[DEBUG] State timestamp: {loaded_state.get('timestamp', 'unknown')}")
                    print(f"[DEBUG] Version: {loaded_state.get('version', 'unknown')}")

                return {
                    "status": "success",
                    "state": loaded_state,
                    "validation": validation_result,
                    "file_path": file_path
                }
            else:
                return {
                    "status": "error",
                    "error": "State validation failed",
                    "validation": validation_result,
                    "file_path": file_path
                }

        except json.JSONDecodeError as e:
            if self.debug_mode:
                print(f"[DEBUG] ❌ JSON decode error: {e}")

            return {
                "status": "error",
                "error": f"JSON decode error: {e}",
                "file_path": file_path
            }

        except Exception as e:
            if self.debug_mode:
                print(f"[DEBUG] ❌ State load error: {e}")

            return {
                "status": "error",
                "error": f"State load error: {e}",
                "file_path": file_path
            }

    def _validate_state_structure(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """Validate state structure"""

        errors = []

        # Check required fields
        required_fields = ['data', 'timestamp', 'version']
        for field in required_fields:
            if field not in state:
                errors.append(f"Missing required field: {field}")

        # Check data types
        if 'data' in state and not isinstance(state['data'], dict):
            errors.append("State data must be a dictionary")

        # Check timestamp format
        if 'timestamp' in state:
            try:
                datetime.fromisoformat(state['timestamp'])
            except ValueError:
                errors.append("Invalid timestamp format")

        # Check version format
        if 'version' in state:
            if not isinstance(state['version'], str):
                errors.append("Version must be a string")

        return {
            "is_valid": len(errors) == 0,
            "errors": errors
        }

    def _calculate_checksum(self, data: Dict[str, Any]) -> str:
        """Calculate checksum for data integrity"""
        import hashlib

        # Create a deterministic string representation
        data_str = json.dumps(data, sort_keys=True)
        return hashlib.md5(data_str.encode()).hexdigest()

    def get_state_history_summary(self) -> Dict[str, Any]:
        """Get summary of state operations"""

        if not self.state_history:
            return {"error": "No state history available"}

        total_operations = len(self.state_history)
        save_operations = sum(1 for h in self.state_history if h['action'] == 'save')
        load_operations = sum(1 for h in self.state_history if h['action'] == 'load')
        error_operations = total_operations - save_operations - load_operations

        return {
            "total_operations": total_operations,
            "save_operations": save_operations,
            "load_operations": load_operations,
            "error_operations": error_operations,
            "success_rate": (save_operations + load_operations) / total_operations * 100 if total_operations > 0 else 0,
            "recent_operations": self.state_history[-5:] if self.state_history else []
        }

# Debug state manager usage
debug_state = DebugStateManager(debug_mode=True)

# Test state saving
test_state = {
    "user_id": "test_user",
    "conversation_context": {"topic": "Python decorators"},
    "current_state": {"learning": True},
    "preferences": {"theme": "dark"}
}

state_save_result = debug_state.debug_save_state(test_state, "/test/state.json")
print(f"State save result: {state_save_result}")

# Test state loading
state_load_result = debug_state.debug_load_state("/test/state.json")
print(f"State load result: {state_load_result}")

# Get history summary
history_summary = debug_state.get_state_history_summary()
print(f"State history summary: {history_summary}")
```

## 🔧 Advanced Debugging Tools

### Comprehensive Diagnostic System

**Built-in Diagnostic Commands:**

```python
# Comprehensive diagnostic system for Learning Catalyst
class LearningCatalystDiagnostics:
    def __init__(self):
        self.console = Console()
        self.checks = []

    def run_full_diagnostic(self) -> Dict[str, Any]:
        """Run comprehensive system diagnostic"""

        self.console.print("🔍 Learning Catalyst Diagnostic Tool")
        self.console.print("=" * 50)

        diagnostic_results = {}

        # System checks
        diagnostic_results['system'] = self._check_system()

        # Configuration checks
        diagnostic_results['configuration'] = self._check_configuration()

        # AI provider checks
        diagnostic_results['ai_providers'] = await self._check_ai_providers()

        # Database checks
        diagnostic_results['database'] = self._check_database()

        # Memory checks
        diagnostic_results['memory'] = self._check_memory()

        # Generate summary
        self._print_diagnostic_summary(diagnostic_results)

        return diagnostic_results

    def _check_system(self) -> Dict[str, Any]:
        """Check system requirements"""

        system_checks = {
            "python_version": self._check_python_version(),
            "dependencies": self._check_dependencies(),
            "disk_space": self._check_disk_space(),
            "memory": self._check_memory_usage(),
            "permissions": self._check_file_permissions()
        }

        # Display system checks
        self.console.print("\n🖥️ System Requirements:")
        for check_name, check_result in system_checks.items():
            status = "✅" if check_result['status'] else "❌"
            message = check_result['message']
            self.console.print(f"  {status} {check_name}: {message}")

        return system_checks

    def _check_python_version(self) -> Dict[str, Any]:
        """Check Python version requirements"""
        import sys

        version_info = sys.version_info
        required_version = (3, 9)  # Python 3.9+

        is_valid = version_info >= required_version
        status = "✅" if is_valid else "❌"
        version_str = f"{version_info.major}.{version_info.minor}.{version_info.micro}"

        return {
            "status": is_valid,
            "version": version_str,
            "required": f"{required_version[0]}.{required_version[1]}.x",
            "message": f"Python {version_str} (>= {required_version_str})"
        }

    def _check_dependencies(self) -> Dict[str, Any]:
        """Check required dependencies"""
        required_packages = [
            'rich', 'typer', 'aiohttp', 'sqlite3'
        ]

        dependency_status = {}
        missing_packages = []

        for package in required_packages:
            try:
                __import__(package)
                dependency_status[package] = {"status": "✅", "message": "Available"}
            except ImportError as e:
                dependency_status[package] = {"status": "❌", "message": f"Missing: {e}"}
                missing_packages.append(package)

        return {
            "status": len(missing_packages) == 0,
            "dependencies": dependency_status,
            "missing_packages": missing_packages
        }

    def _check_ai_providers(self) -> Dict[str, Any]:
        """Check AI provider connections"""

        providers_status = {}

        # Check OpenAI
        providers_status['openai'] = self._check_openai_connection()

        # Check other providers as needed
        # providers_status['deepseek'] = self._check_deepseek_connection()
        providers_status['siliconflow'] = self._check_siliconflow_connection()

        # Display provider checks
        self.console.print("\n🤖️ AI Provider Status:")
        for provider, status in providers_status.items():
            status_icon = "✅" if status['status'] else "❌"
            message = status['message']
            self.console.print(f"  {status_icon} {provider.title()}: {message}")

        return providers_status

    def _check_database(self) -> Dict[str, Any]:
        """Check database connectivity and structure"""

        db_status = {}

        # Check if database file exists
        db_path = self._get_database_path()

        if not os.path.exists(db_path):
            db_status['file'] = {"status": "❌", "message": "Database file not found"}
        else:
            db_status['file'] = {"status": "✅", "message": "Database file exists"}

        # Check database connection
        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()

            # Check if tables exist
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
            tables = cursor.fetchall()

            db_status['connection'] = {"status": "✅", "message": "Connected", "tables": len(tables)}

            conn.close()

            # Check critical tables
            required_tables = ['concepts', 'user_profiles', 'assessment_sessions']
            missing_tables = [t for t in required_tables if t not in [table[0] for table in tables]]

            if missing_tables:
                db_status['missing_tables'] = {"status": "⚠️", "message": f"Missing tables: {missing_tables}"}
            else:
                db_status['tables'] = {"status": "✅", "message": "All required tables present"}

        except Exception as e:
            db_status['connection'] = {"status": "❌", "message": f"Connection error: {e}"}

        return db_status

    def _check_memory_usage(self) -> Dict[str, Any]:
        """Check memory usage"""

        try:
            import psutil
            process = psutil.Process()
            memory_info = process.memory_info()

            available_memory = psutil.virtual_memory().available / (1024 * 1024 * 1024)  # Convert to GB
            used_memory = memory_info.rss / (1024 * 1024)
            memory_usage_percent = (used_memory / (available_memory + used_memory)) * 100

            memory_status = "✅" if memory_usage_percent < 80 else "⚠️"

            return {
                "status": memory_status,
                "used_memory_mb": used_memory,
                "available_memory_gb": available_memory,
                "usage_percent": memory_usage_percent,
                "message": f"Memory usage: {memory_usage_percent:.1f}% ({used_memory:.1f}MB / {available_memory:.1f}GB)"
            }

        except ImportError:
            return {
                "status": "❌", "message": "Memory info unavailable (psutil not available)"}

            except Exception as e:
                return {
                "status": "❌", "message": f"Memory check error: {e}"
            }

    def _print_diagnostic_summary(self, results: Dict[str, Any]) -> Dict[str, Any]:
        """Print diagnostic summary"""

        overall_status = "✅" if all(
            results.get('system', {}).get('status') == "✅" and
            results.get('configuration', {}).get('status') == "✅" and
            results.get('database', {}).get('status') == "✅"
        ) else "⚠️"

        self.console.print(f"\n🎯 Overall Status: {overall_status}")

        # Count issues
        issues = []
        for category, category_results in results.items():
            if category_results.get('status') != "✅":
                issues.extend(category_results.get('missing_tables', []))
                issues.extend([f"{category}: {category_results.get('message')}"])

        if issues:
            self.console.print(f"⚠️ Issues found: {len(issues)}")
            for issue in issues[:5]:  # Show first 5 issues
                self.console.print(f"  • {issue}")

        if not issues:
            self.console.print("✅ All systems operational!")

# Diagnostic tool usage
diagnostics = LearningCatalystDiagnostics()
diagnostic_results = diagnostics.run_full_diagnostic()
```

### Real-Time Monitoring

**Live Debug Monitor:**

```python
# Real-time debugging and monitoring system
import threading
import time
import queue
from typing import Dict, Any, List

class RealTimeMonitor:
    def __init__(self, debug_mode: bool = False):
        self.debug_mode = debug_mode
        self.monitoring = False
        self.log_queue = queue.Queue()
        self.callbacks = []

    def start_monitoring(self) -> None:
        """Start real-time monitoring"""

        if self.debug_mode:
            print("[DEBUG] 🔄 Starting real-time monitoring")

        self.monitoring = True
        monitor_thread = threading.Thread(target=self._monitor_loop, daemon=True)
        monitor_thread.start()

    def stop_monitoring(self) -> None:
        """Stop real-time monitoring"""

        if self.debug_mode:
            print("[DEBUG] ⏹️ Stopping real-time monitoring")

        self.monitoring = False

    def add_log_callback(self, callback):
        """Add callback for log events"""
        self.callbacks.append(callback)

    def _monitor_loop(self) -> None:
        """Main monitoring loop"""

        while self.monitoring:
            try:
                if not self.log_queue.empty():
                    time.sleep(0.1)
                    continue

                # Get log entry
                log_entry = self.log_queue.get()

                # Call all callbacks
                for callback in self.callbacks:
                    try:
                        callback(log_entry)
                    except Exception as e:
                        if self.debug_mode:
                            print(f"[DEBUG] Callback error: {e}")

            except Exception as e:
                if self.debug_mode:
                    print(f"[DEBUG] Monitor loop error: {e}")

                time.sleep(0.1)

    def log_event(self, event_type: str, data: Dict[str, Any]) -> None:
        """Log an event for real-time monitoring"""

        log_entry = {
            "timestamp": time.time(),
            "type": event_type,
            "data": data
        }

        try:
            self.log_queue.put_nowait(log_entry, timeout=1.0)
        except queue.Full:
            if self.debug_mode:
                print("[DEBUG] ⚠️ Log queue full - dropping event")

    def create_debug_logger_callback(self) -> callable:
        """Create a debug logging callback"""

        def debug_callback(log_entry: Dict[str, Any]) -> None:
            timestamp = log_entry.get('timestamp', 0)
            event_type = log_entry.get('type', 'unknown')
            data = log_entry.get('data', {})

            print(f"[{timestamp}] {event_type}: {data}")

        return debug_callback

# Real-time monitoring usage
monitor = RealTimeMonitor(debug_mode=True)

# Add debug callback
debug_callback = monitor.create_debug_callback()
monitor.add_log_callback(debug_callback)

# Start monitoring
monitor.start_monitoring()

# Log some events
monitor.log_event("command_start", {"command": "/explain", "args": ["Python decorators"]})
monitor.log_event("ai_request", {"provider": "openai", "model": "gpt-4"})
monitor.log_event("user_interaction", {"action": "input_received", "length": 15})

# Stop monitoring
monitor.stop_monitoring()
```

## 📋 Quick Reference: Common Debugging Commands

### CLI Debug Commands

```bash
# Enable debug mode
Learning Catalyst > /debug on
✓ Debug mode enabled
✓ Verbose logging activated
✅ Stack traces enabled
✅ Performance monitoring active

# Run comprehensive diagnostic
Learning Catalyst > /diagnostic
= System Diagnostic Report:
  Installation: ✓ OK
  Configuration: ✗ AI provider needed
  Dependencies: ✓ All present
  Memory: ✓ 245MB used
  Database: ✓ Connected
  AI Providers: ❌ OpenAI (connection failed), Deepseek (✓)
  Recent Errors: 2 (AI connection issues)

# Test specific components
Learning Catalyst > /test cli
✓ CLI Framework: Working
✓ Command Registry: Working
✓ Input/Output: Working

Learning Catalyst > /test ai
❌ AI Service: Connection failed
❌ Provider: openai
❌ Model: gpt-4

Learning Catalyst > /test knowledge
✓ Knowledge Graph: Working
✓ Concept Builder: Working
✓ Database: Connected

# Enable performance monitoring
Learning Catalyst > /performance on
✓ Performance monitoring enabled
Learning Catalyst > explain quantum computing
[DEBUG] Command: explain quantum computing
[DEBUG] Execution time: 2.3s
[DEBUG] Tokens used: 156
[DEBUG] Cost: $0.004
[DEBUG] Memory delta: +12MB

# View error logs
Learning Catalyst > /logs tail -f
Learning Catalyst > /logs error.log
[2024-10-08 14:30:15] ERROR: AI request failed
[2024-10-08 14:30:15] ERROR: Provider: openai
[2024-10-08 14:30:15] ERROR: Rate limit exceeded

# Clear logs
Learning Catalyst > /logs clear
✓ All logs cleared
```

### AI Provider Debug Commands

```bash
# Test all providers
Learning Catalyst > /config providers test
= Provider Test Results:
┌─ OpenAI Test Results ────────────────────────────────────────┐
│  ✅ Connection: 1.2s latency
│  ✅ Authentication: API key valid
│  ✅ Models: 3 models available
│  ⚠️ Rate Limit: 4,999 tokens/min (80% used)
│  ✅ Quota: $2.34 remaining this month
└───────────────────────────────────────────────┘

# Test specific provider
Learning Catalyst > /config provider openai test
✅ OpenAI: Connected and working

# Debug API key issues
Learning Catalyst > /config validate openai
= API Key Validation:
✅ Format: Correct (starts with sk-)
✅ Length: Appropriate (51 characters)
✅ Characters: Valid characters only
✅ Status: Valid and active

# Test model switching
Learning Catalyst > /config model switch
🔄 Model Selection Dialog
[Select from available models...]
Learning Catalyst > /config model use gpt-3.5-turbo
🤖 Model switched to: gpt-3.5-turbo
```

### Knowledge System Debug Commands

```bash
# Debug knowledge graph
Learning Catalyst > /debug knowledge-graph
= Knowledge Graph Debug:
┌─ Graph Structure:
│  Total concepts: 47
│  Total edges: 63
│  Orphan concepts: 3
│  Circular dependencies: 0
│  Max depth: 4
│  Connected components: 3
└─────────────────────────────────────────────────────┘

# Debug concept extraction
Learning Catalyst > /debug concepts-extraction python
= Concept Extraction Debug:
┌─ Analyzing: /path/to/python
│  Files found: 12
│  Concepts extracted: 34
│  Extraction time: 2.3s
│  Average confidence: 0.87
└─────────────────────────────────────────────────────┘

# Test knowledge graph operations
Learning Catalyst > /test knowledge-graph python
✅ Graph construction: Working
✅ Node addition: Working
✅ Path generation: Working
✅ Dependency resolution: Working
✅ Cycle detection: Working
```

### Assessment Engine Debug Commands

```bash
# Debug assessment engine
Learning Catalyst > /debug assessment
= Assessment Engine Debug:
┌─ Question Generation: Working
├─ Answer Evaluation: Working
├─ Difficulty Adjustment: Working
└─────────────────────────────────────────────────────┘

# Test quiz generation
Learning Catalyst > /test quiz python
✅ Question Generation: Working
✅ Interactive Quiz Interface: Working
✅ Answer Evaluation: Working
✅ Performance Analytics: Working

# Test specific quiz
Learning Catalyst > /test quiz single --topic "Python decorators"
= Single Quiz Test:
✅ Question ID: quiz_001
✅ Question Type: multiple_choice
✅ Correct Answer: "A function that modifies another function"
✅ User Answer: "A function that wraps another function"
✅ Evaluation: Correct
✅ Time Taken: 45s
✅ Hints Used: 0

# Debug assessment analytics
Learning Catalyst > /debug analytics python
= Assessment Analytics Debug:
┌─ Total Assessments: 15
├─ Average Score: 78%
├─ Performance Trend: Improving (+15%)
├─ Difficulty Progress: intermediate → advanced
└─────────────────────────────────────────────────────┘
```

### Performance Debug Commands

```bash
# Performance analysis
Learning Catalyst > /performance
= Performance Metrics:
┌─ Average Response Time: 2.1s
┌─ Peak Memory: 156MB
┌─ Total Tokens: 1,234
┌─ API Response Time: 1.8s
└─────────────────────────────────────────────────────┘

# Memory usage analysis
Learning Catalyst > /memory analyze
= Memory Analysis:
┌─ Current Usage: 156MB
┌─ Peak Usage: 189MB
┌─ Available Memory: 8.2GB
┌─ Memory Efficiency: 1.9% usage
└─────────────────────────────────────────────────────┘

# Cache debugging
Learning Catalyst > /cache debug
= Cache Debug Information:
┌─ Cache Size: 50MB limit
┌─ Current Usage: 234MB
┌─ Cache Hit Rate: 87%
├─ Cache Evictions: 3
└─────────────────────────────────────────────────────┘

# Profile specific operations
Learning Catalyst > /profile explain "Python decorators"
= Performance Profile:
┌─ Operation: explain "Python decorators"
├─ Total Time: 2.34s
├─ AI Response Time: 1.8s
├─ Processing Time: 0.4s
┌─ Memory Impact: +12MB
└─────────────────────────────────────────────────────┘
```

## 🎯 Error Classification and Solutions

### Common Error Patterns

**Authentication Errors:**
```bash
# Error 401: Unauthorized
Learning Catalyst > explain Python concepts
❌ Error: AI request failed
🔍 [DEBUG] AI Provider: openai, Model: gpt-4
🔍 [DEBUG] Error: 401 Unauthorized

# Solutions:
1. Check API key: Learning Catalyst > /config validate openai
2. Test connection: Learning Catalyst > /config provider test openai
3. Regenerate API key if needed
4. Check account quotas and billing
```

**Network Errors:**
```bash
# Connection timeout
Learning Catalyst > explain complex topic
❌ Error: Request timeout after 30 seconds
🔍 [DEBUG] Provider: openai, Model: gpt-4
🔍 [DEBUG] Error: asyncio.TimeoutError

# Solutions:
1. Check internet connectivity
2. Test with simpler prompts
3. Switch to faster model
4. Check rate limits
5. Test with alternative provider
```

**Memory Errors:**
```bash
# Memory allocation error
Learning Catalyst > analyze large dataset
❌ Error: MemoryError: Unable to allocate 500MB
🔍 [DEBUG] Available memory: 2.1GB
🔍 [DEBUG] Requested memory: 2.6GB

# Solutions:
1. Clear cache: Learning Catalyst > /cache clear
2. Reduce batch size
3. Use streaming responses
4. Add memory optimization
5. Upgrade system resources
```

## 💡 Getting Help with Debugging

### Built-in Help System

```bash
# General debugging help
Learning Catalyst > /help debugging
= Debug Commands:
  /debug on/off - Enable/disable debug mode
  /diagnostic - Run comprehensive diagnostic
  /performance - Check performance metrics
  /memory - Analyze memory usage
  /logs - View error logs
  /test <component> - Test specific component

# Component-specific debugging
Learning Catalyst > /help debugging ai
Learning Catalyst > /help debugging knowledge-graph
Learning Catalyst > /help debugging assessment
```

### Getting Support

**When All Else Fails:**

1. **Export Diagnostic Data**
   ```bash
   Learning Catalyst > /export-diagnostic diagnostic.json
   ```

2. **Create Bug Report**
   ```bash
   Learning Catalyst > /bug-report
   ```

3. **Check Known Issues**
   ```bash
   Learning Catalyst > /issues
   ```

---

*Last updated: October 8, 2025*
*Version: 2.0.0*
*See also: [Testing Documentation](testing/), [CLI Development Guide](cli-development.md), [Troubleshooting Examples](../../examples/troubleshooting.md)*