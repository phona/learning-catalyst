"""
Integration tests for Error Recovery Integration.

Following Test-Driven Development methodology, these tests define the expected behavior
of system resilience and error handling under various failure scenarios.
Tests cover graceful degradation, automatic recovery, and system stability.
"""

import pytest
import asyncio
import time
from typing import Dict, Any, List
from unittest.mock import Mock, AsyncMock, patch
from tests.test_helpers import (
    measure_async_performance,
    assert_async_performance_under
)


class TestErrorRecoveryIntegration:
    """Integration tests for error recovery and resilience."""

    @pytest.mark.integration
    @pytest.mark.error_recovery
    async def test_ai_service_failure_recovery(self):
        """Test AI service failure and automatic recovery."""
        from src.ai.service import AIService
        from src.ai.fallback_manager import FallbackManager

        ai_service = AIService()
        fallback_manager = FallbackManager()

        # Configure fallback providers
        await fallback_manager.configure_fallback_chain([
            {"name": "openai", "priority": 1},
            {"name": "anthropic", "priority": 2},
            {"name": "deepseek", "priority": 3}
        ])

        # Step 1: Test primary provider failure
        with patch.object(ai_service, '_call_provider_api') as mock_api:
            # Primary provider fails
            mock_api.side_effect = [
                Exception("OpenAI API unavailable"),
                {"response": "Response from fallback provider"}
            ]

            result = await ai_service.generate_response_with_fallback(
                prompt="Test question",
                fallback_chain=["openai", "anthropic", "deepseek"]
            )

            assert result['success'] is True
            assert 'fallback_used' in result['metadata']
            assert result['metadata']['fallback_provider'] == 'anthropic'

        # Step 2: Test multiple provider failures
        with patch.object(ai_service, '_call_provider_api') as mock_api:
            # All providers fail initially, then one succeeds
            mock_api.side_effect = [
                Exception("OpenAI API unavailable"),
                Exception("Anthropic API unavailable"),
                Exception("DeepSeek API unavailable"),
                {"response": "Response after retry"}
            ]

            result = await ai_service.generate_response_with_retry(
                prompt="Test question",
                max_retries=3,
                retry_delay=0.1
            )

            assert result['success'] is True
            assert 'retry_count' in result['metadata']
            assert result['metadata']['retry_count'] == 3

        # Step 3: Test complete provider outage handling
        with patch.object(ai_service, '_call_provider_api') as mock_api:
            mock_api.side_effect = Exception("All providers unavailable")

            result = await ai_service.generate_response_with_graceful_degradation(
                prompt="Test question"
            )

            assert result['success'] is False
            assert 'error' in result
            assert 'degraded_response' in result
            assert result['degraded_response']  # Should provide some fallback response

    @pytest.mark.integration
    @pytest.mark.error_recovery
    async def test_database_connection_recovery(self):
        """Test database connection failure and recovery."""
        from src.data.database_manager import DatabaseManager
        from src.data.connection_pool import ConnectionPool

        db_manager = DatabaseManager()
        connection_pool = ConnectionPool()

        # Step 1: Test connection timeout handling
        with patch.object(connection_pool, 'get_connection') as mock_conn:
            mock_conn.side_effect = asyncio.TimeoutError("Connection timeout")

            result = await db_manager.execute_query("SELECT * FROM sessions")
            assert result['success'] is False
            assert 'connection_timeout' in result['error']['code']

        # Step 2: Test connection recovery
        with patch.object(connection_pool, 'get_connection') as mock_conn:
            # First call fails, second succeeds
            mock_conn.side_effect = [
                asyncio.TimeoutError("Connection timeout"),
                Mock()  # Successful connection
            ]

            result = await db_manager.execute_query_with_retry(
                "SELECT * FROM sessions",
                max_retries=2,
                retry_delay=0.1
            )
            assert result['success'] is True

        # Step 3: Test connection pool exhaustion
        with patch.object(connection_pool, 'get_connection') as mock_conn:
            mock_conn.side_effect = Exception("Connection pool exhausted")

            result = await db_manager.execute_query_with_queue(
                "SELECT * FROM sessions",
                queue_timeout=2.0
            )
            assert result['success'] is False
            assert 'pool_exhausted' in result['error']['code']

        # Step 4: Test database-specific error handling
        with patch.object(db_manager, '_execute_query') as mock_exec:
            mock_exec.side_effect = Exception("Database locked")

            result = await db_manager.execute_transaction([
                "INSERT INTO sessions (id) VALUES (1)",
                "INSERT INTO sessions (id) VALUES (2)"
            ])

            assert result['success'] is False
            assert 'transaction_rollback' in result
            assert result['transaction_rollback'] is True

    @pytest.mark.integration
    @pytest.mark.error_recovery
    async def test_file_system_error_recovery(self):
        """Test file system error handling and recovery."""
        from src.data.file_manager import FileManager
        from src.data.backup_manager import BackupManager

        file_manager = FileManager()
        backup_manager = BackupManager()

        # Step 1: Test file not found handling
        result = await file_manager.read_file("/nonexistent/file.txt")
        assert result['success'] is False
        assert 'file_not_found' in result['error']['code']

        # Step 2: Test permission denied handling
        with patch('builtins.open', side_effect=PermissionError("Permission denied")):
            result = await file_manager.write_file("/restricted/file.txt", "content")
            assert result['success'] is False
            assert 'permission_denied' in result['error']['code']

        # Step 3: Test disk space handling
        with patch('os.statvfs') as mock_stat:
            # Simulate no disk space
            mock_stat.return_value = Mock(f_bavail=0, f_frsize=4096)

            result = await file_manager.write_file("/tmp/large_file.txt", "x" * 1000000)
            assert result['success'] is False
            assert 'insufficient_space' in result['error']['code']

        # Step 4: Test backup recovery
        # Create original file
        original_content = "Important data that needs backup"
        await file_manager.write_file("/tmp/test_file.txt", original_content)

        # Create backup
        backup_result = await backup_manager.create_backup("/tmp/test_file.txt")
        assert backup_result['success'] is True
        backup_path = backup_result['backup_path']

        # Simulate file corruption
        await file_manager.write_file("/tmp/test_file.txt", "corrupted data")

        # Recover from backup
        recovery_result = await backup_manager.restore_from_backup(
            original_path="/tmp/test_file.txt",
            backup_path=backup_path
        )
        assert recovery_result['success'] is True

        # Verify recovery
        recovered_content = await file_manager.read_file("/tmp/test_file.txt")
        assert recovered_content['content'] == original_content

    @pytest.mark.integration
    @pytest.mark.error_recovery
    async def test_memory_error_recovery(self):
        """Test memory exhaustion handling and recovery."""
        from src.core.memory_manager import MemoryManager
        from src.core.session_manager import SessionManager

        memory_manager = MemoryManager()
        session_manager = SessionManager()

        # Step 1: Test memory pressure detection
        with patch.object(memory_manager, 'get_memory_usage') as mock_memory:
            # Simulate high memory usage
            mock_memory.return_value = {
                "used_mb": 8000,  # 8GB used
                "total_mb": 8192,  # 8GB total
                "usage_percent": 97.7
            }

            pressure_detected = await memory_manager.detect_memory_pressure()
            assert pressure_detected['pressure_detected'] is True
            assert pressure_detected['severity'] == 'critical'

        # Step 2: Test automatic memory cleanup
        with patch.object(memory_manager, 'get_memory_usage') as mock_memory:
            mock_memory.return_value = {"used_mb": 7000, "total_mb": 8192, "usage_percent": 85.4}

            cleanup_result = await memory_manager.trigger_automatic_cleanup()
            assert cleanup_result['success'] is True
            assert 'memory_freed_mb' in cleanup_result['data']
            assert cleanup_result['data']['memory_freed_mb'] > 0

        # Step 3: Test session cleanup under memory pressure
        # Create many sessions
        sessions = []
        for i in range(100):
            session_result = await session_manager.create_session(
                user_id=f"memory_test_user_{i}",
                topic="Test Topic"
            )
            sessions.append(session_result['session_id'])

        # Simulate memory pressure and trigger cleanup
        with patch.object(memory_manager, 'detect_memory_pressure') as mock_pressure:
            mock_pressure.return_value = {"pressure_detected": True, "severity": "high"}

            cleanup_result = await session_manager.cleanup_sessions_under_pressure(
                memory_threshold_mb=1000,
                max_sessions_to_remove=50
            )
            assert cleanup_result['success'] is True
            assert cleanup_result['sessions_removed'] > 0

        # Step 4: Test graceful degradation when memory is critically low
        with patch.object(memory_manager, 'get_memory_usage') as mock_memory:
            mock_memory.return_value = {"used_mb": 8100, "total_mb": 8192, "usage_percent": 98.9}

            degraded_result = await memory_manager.enter_degraded_mode()
            assert degraded_result['success'] is True
            assert degraded_result['degraded_mode'] is True
            assert 'limited_functionality' in degraded_result['data']

    @pytest.mark.integration
    @pytest.mark.error_recovery
    async def test_network_error_recovery(self):
        """Test network error handling and recovery."""
        from src.ai.http_client import HTTPClient
        from src.network.circuit_breaker import CircuitBreaker

        http_client = HTTPClient()
        circuit_breaker = CircuitBreaker()

        # Step 1: Test connection timeout recovery
        with patch.object(http_client, '_make_request') as mock_request:
            mock_request.side_effect = asyncio.TimeoutError("Connection timeout")

            result = await http_client.get_with_retry(
                "https://example.com/api",
                max_retries=3,
                timeout=2.0
            )
            assert result['success'] is False
            assert 'connection_timeout' in result['error']['code']
            assert 'retry_count' in result['metadata']

        # Step 2: Test circuit breaker pattern
        await circuit_breaker.configure(
            failure_threshold=3,
            timeout=5.0,
            expected_exception=Exception
        )

        # Simulate repeated failures
        for i in range(4):
            with patch.object(http_client, '_make_request') as mock_request:
                mock_request.side_effect = Exception("Service unavailable")

                result = await circuit_breaker.call(
                    lambda: http_client.get("https://example.com/api")
                )

                if i < 3:
                    assert result['success'] is False
                    assert 'service_unavailable' in result['error']['code']
                else:
                    # Circuit breaker should be open
                    assert result['success'] is False
                    assert 'circuit_breaker_open' in result['error']['code']

        # Step 3: Test circuit breaker recovery
        # Wait for timeout period
        await asyncio.sleep(1.0)  # Shorter for test

        with patch.object(http_client, '_make_request') as mock_request:
            mock_request.return_value = Mock(status_code=200, text="Success")

            result = await circuit_breaker.call(
                lambda: http_client.get("https://example.com/api")
            )
            assert result['success'] is True

        # Step 4: Test network partition recovery
        with patch.object(http_client, '_make_request') as mock_request:
            # Simulate network partition
            mock_request.side_effect = Exception("Network unreachable")

            partition_result = await http_client.handle_network_partition(
                "https://example.com/api",
                partition_timeout=2.0
            )
            assert partition_result['success'] is False
            assert 'network_partition_detected' in partition_result['error']['code']

        # Test recovery after partition
        with patch.object(http_client, '_make_request') as mock_request:
            mock_request.return_value = Mock(status_code=200, text="Success")

            recovery_result = await http_client.attempt_recovery_after_partition(
                "https://example.com/api"
            )
            assert recovery_result['success'] is True

    @pytest.mark.integration
    @pytest.mark.error_recovery
    async def test_configuration_corruption_recovery(self):
        """Test configuration corruption detection and recovery."""
        from src.data.configuration_manager import ConfigurationManager
        from src.data.config_validator import ConfigValidator

        config_manager = ConfigurationManager()
        validator = ConfigValidator()

        # Step 1: Create valid configuration
        valid_config = {
            "ai": {
                "default_provider": "openai",
                "temperature": 0.7
            },
            "learning": {
                "difficulty": "intermediate"
            }
        }

        await config_manager.save_configuration(valid_config)

        # Step 2: Simulate configuration corruption
        corrupted_config = {
            "ai": {
                "default_provider": None,  # Invalid null value
                "temperature": 5.0  # Invalid value
            },
            "invalid_field": "corrupted_data"  # Unexpected field
        }

        # Save corrupted config
        await config_manager.save_configuration_raw(corrupted_config)

        # Step 3: Test corruption detection
        corruption_result = await config_manager.detect_configuration_corruption()
        assert corruption_result['success'] is True
        assert corruption_result['corruption_detected'] is True
        assert len(corruption_result['corruption_issues']) > 0

        # Step 4: Test automatic configuration recovery
        recovery_result = await config_manager.recover_from_corruption()
        assert recovery_result['success'] is True
        assert 'recovery_method' in recovery_result['data']

        # Step 5: Test configuration validation with fallback
        invalid_config = {
            "ai": {"temperature": "invalid_type"},  # Type mismatch
            "learning": {"difficulty": 999}  # Invalid enum value
        }

        validation_result = await validator.validate_with_fallback(
            invalid_config,
            fallback_config=valid_config
        )
        assert validation_result['success'] is True
        assert 'validation_passed' in validation_result['data']
        assert 'fallback_used' in validation_result['data']

        # Step 6: Test configuration backup restoration
        # Create backup before corruption
        await config_manager.create_configuration_backup()

        # Corrupt current configuration
        await config_manager.save_configuration_raw({"invalid": "config"})

        # Restore from backup
        restore_result = await config_manager.restore_from_latest_backup()
        assert restore_result['success'] is True
        assert 'backup_restored' in restore_result['data']

        # Verify restoration
        current_config = await config_manager.load_configuration()
        assert current_config['success'] is True
        assert 'ai' in current_config['data']

    @pytest.mark.integration
    @pytest.mark.error_recovery
    async def test_session_crash_recovery(self):
        """Test session crash detection and recovery."""
        from src.core.session_manager import SessionManager
        from src.core.crash_detector import CrashDetector

        session_manager = SessionManager()
        crash_detector = CrashDetector()

        # Step 1: Create session and add data
        session_result = await session_manager.create_session(
            user_id="crash_test_user",
            topic="Test Topic"
        )
        session_id = session_result['session_id']

        # Add session data
        await session_manager.add_learning_material(
            session_id,
            concept="Test Concept",
            content="Important session content"
        )

        # Step 2: Simulate session crash
        crash_info = {
            "session_id": session_id,
            "crash_time": time.time(),
            "crash_reason": "unexpected_termination",
            "last_known_state": {
                "current_concept": "Test Concept",
                "progress": 0.5,
                "interaction_count": 3
            }
        }

        await crash_detector.record_crash(crash_info)

        # Step 3: Test crash detection
        detected_crashes = await crash_detector.detect_unclean_sessions()
        assert len(detected_crashes) > 0
        assert detected_crashes[0]['session_id'] == session_id

        # Step 4: Test session recovery
        recovery_result = await session_manager.recover_crashed_session(session_id)
        assert recovery_result['success'] is True
        assert 'recovered_data' in recovery_result['data']
        assert recovery_result['data']['recovered_data']['current_concept'] == "Test Concept"

        # Step 5: Test session state consistency check
        consistency_result = await session_manager.verify_session_consistency(session_id)
        assert consistency_result['success'] is True
        assert consistency_result['data']['is_consistent'] is True

        # Step 6: Test partial data recovery
        # Create another session
        session2_result = await session_manager.create_session(
            user_id="partial_recovery_user",
            topic="Partial Recovery Test"
        )
        session2_id = session2_result['session_id']

        # Simulate partial data loss
        await session_manager.add_learning_material(
            session2_id,
            concept="Partial Concept",
            content="Partial content"
        )

        # Simulate crash with partial data
        await crash_detector.record_crash({
            "session_id": session2_id,
            "crash_time": time.time(),
            "partial_data_available": True,
            "recovery_points": [
                {"timestamp": time.time() - 300, "data_hash": "hash1"},
                {"timestamp": time.time() - 150, "data_hash": "hash2"}
            ]
        })

        partial_recovery = await session_manager.partial_session_recovery(session2_id)
        assert partial_recovery['success'] is True
        assert 'recovery_points_used' in partial_recovery['data']
        assert 'data_integrity_verified' in partial_recovery['data']

    @pytest.mark.integration
    @pytest.mark.error_recovery
    async def test_cascading_failure_prevention(self):
        """Test cascading failure prevention and containment."""
        from src.core.failure_detector import FailureDetector
        from src.core.circuit_breaker_manager import CircuitBreakerManager

        failure_detector = FailureDetector()
        circuit_breaker_manager = CircuitBreakerManager()

        # Step 1: Configure circuit breakers for different services
        await circuit_breaker_manager.configure_service_breakers({
            "ai_service": {
                "failure_threshold": 3,
                "timeout": 30.0,
                "half_open_max_calls": 2
            },
            "database": {
                "failure_threshold": 5,
                "timeout": 10.0,
                "half_open_max_calls": 3
            },
            "file_system": {
                "failure_threshold": 2,
                "timeout": 5.0,
                "half_open_max_calls": 1
            }
        })

        # Step 2: Simulate cascading failure scenario
        failure_sequence = []

        # AI service fails
        for i in range(4):
            result = await circuit_breaker_manager.call_service(
                "ai_service",
                lambda: asyncio.sleep(0.1)  # Simulate work
            )
            failure_sequence.append(("ai_service", result['success']))

        # Database fails
        for i in range(6):
            result = await circuit_breaker_manager.call_service(
                "database",
                lambda: asyncio.sleep(0.1)  # Simulate work
            )
            failure_sequence.append(("database", result['success']))

        # File system fails
        for i in range(3):
            result = await circuit_breaker_manager.call_service(
                "file_system",
                lambda: asyncio.sleep(0.1)  # Simulate work
            )
            failure_sequence.append(("file_system", result['success']))

        # Step 3: Verify circuit breaker activation
        ai_status = await circuit_breaker_manager.get_breaker_status("ai_service")
        db_status = await circuit_breaker_manager.get_breaker_status("database")
        fs_status = await circuit_breaker_manager.get_breaker_status("file_system")

        # All should be open due to failures
        assert ai_status['state'] == 'open'
        assert db_status['state'] == 'open'
        assert fs_status['state'] == 'open'

        # Step 4: Test cascading failure detection
        cascade_analysis = await failure_detector.analyze_cascading_failures(
            failure_sequence,
            service_dependencies={
                "ai_service": ["database"],
                "database": ["file_system"],
                "file_system": []
            }
        )
        assert cascade_analysis['cascading_detected'] is True
        assert 'failure_chain' in cascade_analysis['data']
        assert 'containment_suggestions' in cascade_analysis['data']

        # Step 5: Test automatic containment
        containment_result = await circuit_breaker_manager.trigger_automatic_containment()
        assert containment_result['success'] is True
        assert 'contained_services' in containment_result['data']
        assert len(containment_result['data']['contained_services']) >= 3

        # Step 6: Test gradual recovery
        recovery_plan = await failure_detector.create_gradual_recovery_plan(
            failed_services=["ai_service", "database", "file_system"]
        )
        assert recovery_plan['success'] is True
        assert 'recovery_sequence' in recovery_plan['data']
        assert len(recovery_plan['data']['recovery_sequence']) > 0

        # Verify recovery order (least dependent first)
        recovery_sequence = recovery_plan['data']['recovery_sequence']
        assert recovery_sequence[0] == 'file_system'  # No dependencies
        assert recovery_sequence[1] == 'database'    # Depends on file_system
        assert recovery_sequence[2] == 'ai_service'   # Depends on database

    @pytest.mark.integration
    @pytest.mark.error_recovery
    async def test_data_corruption_detection_and_recovery(self):
        """Test data corruption detection and recovery mechanisms."""
        from src.data.integrity_checker import IntegrityChecker
        from src.data.backup_manager import BackupManager

        integrity_checker = IntegrityChecker()
        backup_manager = BackupManager()

        # Step 1: Create test data with checksums
        test_data = {
            "user_id": "integrity_test_user",
            "sessions": [
                {"id": "session_1", "data": "important session data"},
                {"id": "session_2", "data": "more important data"}
            ],
            "preferences": {"theme": "dark", "language": "en"}
        }

        # Add integrity checksums
        data_with_integrity = await integrity_checker.add_integrity_checksums(test_data)
        assert 'integrity_checksums' in data_with_integrity

        # Save data with integrity information
        await backup_manager.save_with_integrity(data_with_integrity, "test_data.json")

        # Step 2: Simulate data corruption
        corrupted_data = test_data.copy()
        corrupted_data['sessions'][0]['data'] = "corrupted session data"

        # Step 3: Test corruption detection
        corruption_result = await integrity_checker.verify_data_integrity(
            corrupted_data,
            expected_checksums=data_with_integrity['integrity_checksums']
        )
        assert corruption_result['success'] is True
        assert corruption_result['data']['integrity_verified'] is False
        assert len(corruption_result['data']['corrupted_items']) > 0

        # Step 4: Test automatic corruption recovery
        recovery_result = await backup_manager.recover_from_corruption(
            "test_data.json",
            corruption_result['data']['corrupted_items']
        )
        assert recovery_result['success'] is True
        assert 'recovered_items' in recovery_result['data']
        assert len(recovery_result['data']['recovered_items']) > 0

        # Step 5: Test partial corruption handling
        # Create larger dataset
        large_dataset = {
            "records": [{"id": i, "data": f"data_{i}"} for i in range(1000)]
        }

        # Add integrity and backup
        large_with_integrity = await integrity_checker.add_integrity_checksums(large_dataset)
        await backup_manager.save_with_integrity(large_with_integrity, "large_dataset.json")

        # Corrupt some records
        corrupted_large = large_dataset.copy()
        for i in [100, 200, 300, 400, 500]:  # Corrupt 5 records
            corrupted_large['records'][i]['data'] = "corrupted"

        # Test partial corruption detection and recovery
        partial_recovery = await backup_manager.recover_partial_corruption(
            "large_dataset.json",
            corrupted_large
        )
        assert partial_recovery['success'] is True
        assert 'recovered_records' in partial_recovery['data']
        assert partial_recovery['data']['recovered_records'] == 5

        # Step 6: Test continuous integrity monitoring
        monitoring_result = await integrity_checker.start_continuous_monitoring(
            data_files=["test_data.json", "large_dataset.json"],
            check_interval=1.0  # Check every second
        )
        assert monitoring_result['success'] is True
        assert 'monitoring_active' in monitoring_result['data']

        # Wait a bit and stop monitoring
        await asyncio.sleep(2.0)
        stop_result = await integrity_checker.stop_continuous_monitoring()
        assert stop_result['success'] is True
        assert 'monitoring_stopped' in stop_result['data']

    @pytest.mark.integration
    @pytest.mark.error_recovery
    async def test_system_wide_resilience_test(self):
        """Test system-wide resilience under multiple failure scenarios."""
        from src.core.resilience_manager import ResilienceManager
        from src.core.system_monitor import SystemMonitor

        resilience_manager = ResilienceManager()
        system_monitor = SystemMonitor()

        # Step 1: Configure resilience policies
        await resilience_manager.configure_resilience_policies({
            "max_failure_rate": 0.1,  # 10% failure rate threshold
            "circuit_breaker_threshold": 5,
            "auto_recovery_enabled": True,
            "graceful_degradation_enabled": True
        })

        # Step 2: Start system monitoring
        monitoring_result = await system_monitor.start_monitoring()
        assert monitoring_result['success'] is True

        # Step 3: Simulate multiple concurrent failures
        async def simulate_service_failure(service_name, failure_rate=0.3):
            """Simulate service with certain failure rate."""
            import random
            results = []
            for i in range(20):
                if random.random() < failure_rate:
                    results.append(False)  # Failure
                else:
                    results.append(True)   # Success
                await asyncio.sleep(0.05)  # Small delay
            return {"service": service_name, "results": results}

        # Simulate failures across multiple services
        failure_simulations = [
            simulate_service_failure("ai_service", 0.4),  # 40% failure
            simulate_service_failure("database", 0.2),     # 20% failure
            simulate_service_failure("cache", 0.1),        # 10% failure
            simulate_service_failure("file_system", 0.3)   # 30% failure
        ]

        simulation_results = await asyncio.gather(*failure_simulations)

        # Step 4: Analyze system resilience
        resilience_analysis = await resilience_manager.analyze_system_resilience(
            simulation_results
        )
        assert resilience_analysis['success'] is True
        assert 'overall_health' in resilience_analysis['data']
        assert 'failure_hotspots' in resilience_analysis['data']

        # Step 5: Test automatic recovery actions
        recovery_actions = await resilience_manager.trigger_automatic_recovery(
            resilience_analysis['data']['failure_hotspots']
        )
        assert recovery_actions['success'] is True
        assert 'recovery_actions_taken' in recovery_actions['data']

        # Step 6: Test graceful degradation
        if resilience_analysis['data']['overall_health'] < 0.8:
            degradation_result = await resilience_manager.activate_graceful_degradation()
            assert degradation_result['success'] is True
            assert 'degraded_features' in degradation_result['data']
            assert 'essential_services_maintained' in degradation_result['data']

        # Step 7: Verify system stability after recovery
        stability_check = await system_monitor.check_system_stability()
        assert stability_check['success'] is True
        assert stability_check['data']['is_stable'] is True

        # Step 8: Generate resilience report
        resilience_report = await resilience_manager.generate_resilience_report()
        assert resilience_report['success'] is True
        report = resilience_report['data']

        assert 'incident_summary' in report
        assert 'recovery_timeline' in report
        assert 'resilience_metrics' in report
        assert 'improvement_recommendations' in report

        # Stop monitoring
        stop_monitoring = await system_monitor.stop_monitoring()
        assert stop_monitoring['success'] is True