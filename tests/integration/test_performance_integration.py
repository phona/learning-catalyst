"""
Integration tests for Performance Integration.

Following Test-Driven Development methodology, these tests define the expected behavior
of system performance under realistic loads. Tests cover response times, throughput,
resource utilization, and scalability patterns.
"""

import pytest
import asyncio
import time
import psutil
import threading
from typing import Dict, Any, List
from unittest.mock import Mock, AsyncMock, patch
from concurrent.futures import ThreadPoolExecutor
from tests.test_helpers import (
    measure_async_performance,
    assert_async_performance_under,
    measure_performance
)


class TestPerformanceIntegration:
    """Integration tests for system performance."""

    @pytest.mark.integration
    @pytest.mark.performance
    async def test_concurrent_user_load_performance(self):
        """Test system performance under concurrent user load."""
        from src.cli.main import CLIInterface
        from src.core.session_manager import SessionManager

        cli_interface = CLIInterface()
        session_manager = SessionManager()

        # Simulate 50 concurrent users
        concurrent_users = 50
        user_sessions = []

        # Create sessions for all users
        async def create_user_session(user_id):
            session_result = await session_manager.create_session(
                user_id=f"user_{user_id}",
                topic="Python Programming"
            )
            return session_result['session_id']

        # Measure session creation performance
        async with measure_async_performance() as perf:
            tasks = [create_user_session(i) for i in range(concurrent_users)]
            user_sessions = await asyncio.gather(*tasks)

        # Should handle 50 concurrent session creations efficiently
        assert perf.execution_time < 30.0  # 30 seconds max
        assert len(user_sessions) == concurrent_users

        # Simulate concurrent learning activities
        async def simulate_learning_activity(session_id, user_id):
            # Simulate various user interactions
            activities = [
                cli_interface.execute_command("/learn python basics"),
                cli_interface.execute_command("/knowledge-map"),
                cli_interface.execute_command("/tokens"),
                cli_interface.execute_command("What are variables in Python?"),
                cli_interface.execute_command("/help")
            ]

            results = []
            for activity in activities:
                result = await activity
                results.append(result)
                # Small delay between activities
                await asyncio.sleep(0.1)

            return {
                "user_id": user_id,
                "session_id": session_id,
                "activities_completed": len([r for r in results if r['success']])
            }

        # Measure concurrent activity performance
        async with measure_async_performance() as perf:
            tasks = [
                simulate_learning_activity(user_sessions[i], i)
                for i in range(min(20, concurrent_users))  # Test with 20 active users
            ]
            activity_results = await asyncio.gather(*tasks)

        # Performance assertions
        assert perf.execution_time < 60.0  # Should complete within 1 minute
        assert len(activity_results) == 20

        # Check success rates
        total_activities = sum(result['activities_completed'] for result in activity_results)
        expected_activities = 20 * 5  # 20 users * 5 activities each
        success_rate = total_activities / expected_activities
        assert success_rate >= 0.8  # At least 80% success rate

    @pytest.mark.integration
    @pytest.mark.performance
    async def test_memory_usage_under_load(self):
        """Test memory usage patterns under sustained load."""
        from src.ai.service import AIService
        from src.core.session_manager import SessionManager

        ai_service = AIService()
        session_manager = SessionManager()

        # Get initial memory usage
        process = psutil.Process()
        initial_memory = process.memory_info().rss / 1024 / 1024  # MB

        # Create memory-intensive workload
        sessions = []
        for i in range(100):  # 100 sessions
            session_result = await session_manager.create_session(
                user_id=f"memory_test_user_{i}",
                topic=f"Test Topic {i}"
            )
            sessions.append(session_result['session_id'])

            # Add some session data
            await session_manager.add_learning_material(
                sessions[-1],
                concept=f"Concept {i}",
                content=f"Large content block for session {i} " * 100  # Large content
            )

            # Add context items
            for j in range(10):
                await session_manager.add_context_item(
                    sessions[-1],
                    {
                        "type": "interaction",
                        "content": f"Interaction {j} " * 50,
                        "timestamp": f"2025-01-20T10:{j}:00Z"
                    }
                )

        # Check memory after session creation
        after_sessions_memory = process.memory_info().rss / 1024 / 1024  # MB
        memory_increase_sessions = after_sessions_memory - initial_memory

        # Simulate AI responses to increase memory usage
        for i in range(50):
            await ai_service.generate_response(
                f"Test prompt {i} with additional context to increase memory usage",
                session_id=sessions[i % len(sessions)]
            )

        # Check memory after AI responses
        after_ai_memory = process.memory_info().rss / 1024 / 1024  # MB
        memory_increase_ai = after_ai_memory - after_sessions_memory

        # Memory should be reasonable (less than 500MB increase for this test)
        assert memory_increase_sessions < 200  # Session creation should be memory efficient
        assert memory_increase_ai < 300  # AI responses should not leak memory

        # Test memory cleanup
        cleanup_start_memory = process.memory_info().rss / 1024 / 1024

        # Clean up sessions
        for session_id in sessions:
            await session_manager.terminate_session(session_id)

        # Force garbage collection
        import gc
        gc.collect()

        # Check memory after cleanup
        cleanup_end_memory = process.memory_info().rss / 1024 / 1024
        memory_recovered = cleanup_start_memory - cleanup_end_memory

        # Should recover significant memory
        assert memory_recovered > memory_increase_sessions * 0.5  # At least 50% recovery

    @pytest.mark.integration
    @pytest.mark.performance
    async def test_database_performance_under_load(self):
        """Test database performance under concurrent operations."""
        from src.data.database_manager import DatabaseManager
        from src.core.session_manager import SessionManager

        db_manager = DatabaseManager()
        session_manager = SessionManager()

        # Prepare data for bulk operations
        test_sessions = []
        for i in range(200):
            session_data = {
                "user_id": f"perf_test_user_{i}",
                "topic": f"Test Topic {i}",
                "session_data": {
                    "start_time": time.time(),
                    "interactions": 10,
                    "progress": 0.5
                }
            }
            test_sessions.append(session_data)

        # Test bulk insert performance
        async with measure_async_performance() as perf:
            insert_results = await db_manager.bulk_insert_sessions(test_sessions)

        assert perf.execution_time < 10.0  # Should complete within 10 seconds
        assert len(insert_results) == 200
        assert all(result['success'] for result in insert_results)

        # Test concurrent read operations
        session_ids = [result['session_id'] for result in insert_results]

        async def read_session_data(session_id):
            return await db_manager.get_session(session_id)

        async with measure_async_performance() as perf:
            read_tasks = [read_session_data(sid) for sid in session_ids[:100]]
            read_results = await asyncio.gather(*read_tasks)

        assert perf.execution_time < 5.0  # Should complete within 5 seconds
        assert len(read_results) == 100
        assert all(result is not None for result in read_results)

        # Test concurrent update operations
        async def update_session_data(session_id, update_index):
            update_data = {
                "last_activity": time.time(),
                "interaction_count": update_index,
                "progress": min(1.0, update_index / 100)
            }
            return await db_manager.update_session(session_id, update_data)

        async with measure_async_performance() as perf:
            update_tasks = [
                update_session_data(session_ids[i], i)
                for i in range(50)
            ]
            update_results = await asyncio.gather(*update_tasks)

        assert perf.execution_time < 8.0  # Should complete within 8 seconds
        assert len(update_results) == 50
        assert all(result['success'] for result in update_results)

        # Test query performance
        async with measure_async_performance() as perf:
            query_result = await db_manager.query_sessions({
                "filters": {
                    "user_id": {"$regex": "perf_test_user_"},
                    "session_data.progress": {"$gte": 0.0}
                },
                "limit": 100,
                "sort": [("session_data.start_time", -1)]
            })

        assert perf.execution_time < 3.0  # Queries should be fast
        assert len(query_result['sessions']) > 0

    @pytest.mark.integration
    @pytest.mark.performance
    async def test_ai_response_time_performance(self):
        """Test AI response time performance under various conditions."""
        from src.ai.service import AIService

        ai_service = AIService()

        # Test simple query response time
        simple_prompts = [
            "What is Python?",
            "Explain variables",
            "What is a function?",
            "Define list",
            "Explain loops"
        ]

        simple_times = []
        for prompt in simple_prompts:
            start_time = time.time()
            response = await ai_service.generate_response(prompt)
            end_time = time.time()
            simple_times.append(end_time - start_time)
            assert response['success'] is True

        # Simple queries should be fast
        average_simple_time = sum(simple_times) / len(simple_times)
        assert average_simple_time < 2.0  # Average under 2 seconds

        # Test complex query response time
        complex_prompts = [
            "Write a comprehensive guide to object-oriented programming in Python",
            "Explain machine learning algorithms with detailed examples",
            "Create a full-stack web application tutorial using Python",
            "Design a data analysis pipeline with Python",
            "Explain advanced Python concepts with real-world applications"
        ]

        complex_times = []
        for prompt in complex_prompts:
            start_time = time.time()
            response = await ai_service.generate_response(prompt)
            end_time = time.time()
            complex_times.append(end_time - start_time)
            assert response['success'] is True

        # Complex queries should still be reasonable
        average_complex_time = sum(complex_times) / len(complex_times)
        assert average_complex_time < 8.0  # Average under 8 seconds

        # Test concurrent request performance
        concurrent_prompts = [f"Test prompt {i}" for i in range(20)]

        async def make_concurrent_request(prompt):
            start_time = time.time()
            response = await ai_service.generate_response(prompt)
            end_time = time.time()
            return {
                "prompt": prompt,
                "response_time": end_time - start_time,
                "success": response['success']
            }

        async with measure_async_performance() as perf:
            concurrent_tasks = [make_concurrent_request(prompt) for prompt in concurrent_prompts]
            concurrent_results = await asyncio.gather(*concurrent_tasks)

        assert perf.execution_time < 15.0  # Should complete within 15 seconds
        assert len(concurrent_results) == 20

        # Analyze concurrent performance
        concurrent_times = [result['response_time'] for result in concurrent_results]
        average_concurrent_time = sum(concurrent_times) / len(concurrent_times)
        max_concurrent_time = max(concurrent_times)

        assert average_concurrent_time < 5.0  # Average under 5 seconds
        assert max_concurrent_time < 10.0  # No single request over 10 seconds

    @pytest.mark.integration
    @pytest.mark.performance
    async def test_file_io_performance(self):
        """Test file I/O performance for configuration and data storage."""
        from src.data.configuration_manager import ConfigurationManager
        from src.data.file_manager import FileManager

        config_manager = ConfigurationManager()
        file_manager = FileManager()

        # Test configuration file read/write performance
        large_config = {
            "ai": {f"setting_{i}": f"value_{i}" for i in range(1000)},
            "learning": {f"pref_{i}": f"val_{i}" for i in range(1000)},
            "ui": {f"option_{i}": f"choice_{i}" for i in range(1000)},
            "sessions": [
                {
                    "id": f"session_{i}",
                    "data": "x" * 1000  # 1KB per session
                }
                for i in range(500)
            ]
        }

        # Test write performance
        async with measure_async_performance() as perf:
            write_result = await config_manager.save_configuration(large_config)

        assert perf.execution_time < 5.0  # Should complete within 5 seconds
        assert write_result['success'] is True

        # Test read performance
        async with measure_async_performance() as perf:
            read_result = await config_manager.load_configuration()

        assert perf.execution_time < 2.0  # Should complete within 2 seconds
        assert read_result['success'] is True

        # Test bulk file operations
        test_files = []
        for i in range(100):
            file_content = f"Test file content {i} " * 100  # ~2KB per file
            file_path = f"/tmp/test_file_{i}.txt"
            await file_manager.write_file(file_path, file_content)
            test_files.append(file_path)

        # Test bulk read performance
        async with measure_async_performance() as perf:
            read_results = await file_manager.bulk_read_files(test_files)

        assert perf.execution_time < 3.0  # Should complete within 3 seconds
        assert len(read_results) == 100

        # Test concurrent file operations
        async def concurrent_file_operation(file_index):
            file_path = f"/tmp/concurrent_test_{file_index}.txt"
            content = f"Concurrent content {file_index} " * 50

            # Write
            await file_manager.write_file(file_path, content)

            # Read
            read_content = await file_manager.read_file(file_path)

            # Delete
            await file_manager.delete_file(file_path)

            return read_content == content

        async with measure_async_performance() as perf:
            concurrent_tasks = [concurrent_file_operation(i) for i in range(50)]
            concurrent_results = await asyncio.gather(*concurrent_tasks)

        assert perf.execution_time < 5.0  # Should complete within 5 seconds
        assert all(concurrent_results)  # All operations should succeed

    @pytest.mark.integration
    @pytest.mark.performance
    async def test_cache_performance(self):
        """Test caching system performance under load."""
        from src.core.cache_manager import CacheManager

        cache_manager = CacheManager(cache_size_mb=10)

        # Test cache write performance
        cache_items = {}
        for i in range(1000):
            key = f"test_key_{i}"
            value = f"test_value_{i} " * 100  # ~1KB per item
            cache_items[key] = value

        async with measure_async_performance() as perf:
            for key, value in cache_items.items():
                await cache_manager.set(key, value)

        assert perf.execution_time < 5.0  # Should complete within 5 seconds

        # Test cache read performance
        async with measure_async_performance() as perf:
            for key in cache_items.keys():
                cached_value = await cache_manager.get(key)
                assert cached_value == cache_items[key]

        assert perf.execution_time < 2.0  # Should be very fast (from cache)

        # Test concurrent cache operations
        async def concurrent_cache_access(operation_type, index):
            key = f"concurrent_key_{index}"
            value = f"concurrent_value_{index} " * 50

            if operation_type == "write":
                await cache_manager.set(key, value)
                return True
            elif operation_type == "read":
                result = await cache_manager.get(key)
                return result is not None
            elif operation_type == "delete":
                await cache_manager.delete(key)
                return True

        # Mix of concurrent operations
        async with measure_async_performance() as perf:
            tasks = []
            for i in range(200):
                if i % 3 == 0:
                    tasks.append(concurrent_cache_access("write", i))
                elif i % 3 == 1:
                    tasks.append(concurrent_cache_access("read", i))
                else:
                    tasks.append(concurrent_cache_access("delete", i))

            concurrent_results = await asyncio.gather(*tasks)

        assert perf.execution_time < 8.0  # Should complete within 8 seconds
        assert len(concurrent_results) == 200

        # Test cache eviction performance
        # Fill cache beyond capacity to trigger eviction
        large_items = []
        for i in range(20):  # 20 items of 1MB each = 20MB (exceeds 10MB limit)
            key = f"large_item_{i}"
            value = "x" * (1024 * 1024)  # 1MB item
            large_items.append((key, value))

        async with measure_async_performance() as perf:
            for key, value in large_items:
                await cache_manager.set(key, value)

        assert perf.execution_time < 10.0  # Should handle eviction efficiently

        # Verify cache size is maintained
        cache_stats = await cache_manager.get_statistics()
        assert cache_stats['current_size_mb'] <= 12  # Should be close to limit

    @pytest.mark.integration
    @pytest.mark.performance
    async def test_network_io_performance(self):
        """Test network I/O performance for API calls."""
        from src.ai.http_client import HTTPClient

        http_client = HTTPClient()

        # Test concurrent HTTP requests
        test_urls = [
            "https://httpbin.org/delay/1",  # 1 second delay
            "https://httpbin.org/delay/1",
            "https://httpbin.org/delay/1",
            "https://httpbin.org/delay/1",
            "https://httpbin.org/delay/1"
        ]

        async def make_request(url):
            start_time = time.time()
            try:
                response = await http_client.get(url)
                end_time = time.time()
                return {
                    "url": url,
                    "response_time": end_time - start_time,
                    "success": response.status_code == 200,
                    "status_code": response.status_code
                }
            except Exception as e:
                end_time = time.time()
                return {
                    "url": url,
                    "response_time": end_time - start_time,
                    "success": False,
                    "error": str(e)
                }

        # Test sequential requests
        async with measure_async_performance() as perf:
            sequential_results = []
            for url in test_urls:
                result = await make_request(url)
                sequential_results.append(result)

        sequential_time = perf.execution_time

        # Test concurrent requests
        async with measure_async_performance() as perf:
            concurrent_tasks = [make_request(url) for url in test_urls]
            concurrent_results = await asyncio.gather(*concurrent_tasks)

        concurrent_time = perf.execution_time

        # Concurrent should be significantly faster
        assert concurrent_time < sequential_time * 0.6  # At least 40% faster
        assert len(concurrent_results) == 5
        assert all(result['success'] for result in concurrent_results)

        # Test request timeout handling
        timeout_urls = [
            "https://httpbin.org/delay/5",  # 5 second delay
            "https://httpbin.org/delay/5"
        ]

        async def make_request_with_timeout(url):
            try:
                response = await http_client.get(url, timeout=2.0)  # 2 second timeout
                return {"url": url, "success": True, "timed_out": False}
            except asyncio.TimeoutError:
                return {"url": url, "success": False, "timed_out": True}
            except Exception as e:
                return {"url": url, "success": False, "error": str(e)}

        async with measure_async_performance() as perf:
            timeout_tasks = [make_request_with_timeout(url) for url in timeout_urls]
            timeout_results = await asyncio.gather(*timeout_tasks)

        assert perf.execution_time < 5.0  # Should complete quickly due to timeout
        assert all(result['timed_out'] for result in timeout_results)

    @pytest.mark.integration
    @pytest.mark.performance
    async def test_resource_cleanup_performance(self):
        """Test resource cleanup and garbage collection performance."""
        from src.core.resource_manager import ResourceManager
        from src.ai.service import AIService

        resource_manager = ResourceManager()
        ai_service = AIService()

        # Create many resources to test cleanup
        resources = []
        for i in range(100):
            resource = {
                "id": f"resource_{i}",
                "type": "memory",
                "data": "x" * 10000,  # 10KB per resource
                "created_at": time.time()
            }
            resources.append(resource)
            await resource_manager.register_resource(resource)

        # Monitor memory usage before cleanup
        process = psutil.Process()
        pre_cleanup_memory = process.memory_info().rss / 1024 / 1024  # MB

        # Test cleanup performance
        async with measure_async_performance() as perf:
            cleanup_results = []
            for resource in resources:
                result = await resource_manager.cleanup_resource(resource["id"])
                cleanup_results.append(result)

        cleanup_time = perf.execution_time
        post_cleanup_memory = process.memory_info().rss / 1024 / 1024  # MB

        # Cleanup should be fast and effective
        assert cleanup_time < 5.0  # Should complete within 5 seconds
        assert all(result['success'] for result in cleanup_results)
        assert post_cleanup_memory < pre_cleanup_memory * 0.9  # Should recover memory

        # Test automatic resource cleanup
        auto_resources = []
        for i in range(50):
            resource = {
                "id": f"auto_resource_{i}",
                "type": "temporary",
                "data": "y" * 5000,
                "ttl": 1.0,  # 1 second TTL
                "created_at": time.time()
            }
            auto_resources.append(resource)
            await resource_manager.register_resource(resource)

        # Wait for TTL to expire
        await asyncio.sleep(2.0)

        # Trigger automatic cleanup
        async with measure_async_performance() as perf:
            auto_cleanup_result = await resource_manager.cleanup_expired_resources()

        assert perf.execution_time < 3.0  # Should be fast
        assert auto_cleanup_result['cleaned_count'] == 50

        # Test session resource cleanup
        sessions = []
        for i in range(20):
            session_result = await ai_service.create_session(f"cleanup_test_user_{i}")
            sessions.append(session_result['session_id'])

            # Add some session data
            await ai_service.add_session_data(sessions[-1], {
                "content": "test data " * 100,
                "interactions": ["interaction"] * 10
            })

        # Batch cleanup sessions
        async with measure_async_performance() as perf:
            batch_cleanup_result = await resource_manager.batch_cleanup_sessions(sessions)

        assert perf.execution_time < 8.0  # Should complete within 8 seconds
        assert batch_cleanup_result['cleaned_count'] == 20

    @pytest.mark.integration
    @pytest.mark.performance
    async def test_scalability_limits(self):
        """Test system scalability limits and breaking points."""
        from src.cli.main import CLIInterface
        from src.core.session_manager import SessionManager

        cli_interface = CLIInterface()
        session_manager = SessionManager()

        # Test session creation scalability
        session_creation_times = []
        max_concurrent_sessions = 0

        for batch_size in [10, 25, 50, 100, 200]:
            try:
                async with measure_async_performance() as perf:
                    tasks = [
                        session_manager.create_session(
                            user_id=f"scale_test_user_{batch_size}_{i}",
                            topic=f"Test Topic {batch_size}_{i}"
                        )
                        for i in range(batch_size)
                    ]
                    results = await asyncio.gather(*tasks)

                success_count = len([r for r in results if r['success']])
                avg_time_per_session = perf.execution_time / batch_size

                session_creation_times.append({
                    "batch_size": batch_size,
                    "total_time": perf.execution_time,
                    "avg_time_per_session": avg_time_per_session,
                    "success_count": success_count,
                    "success_rate": success_count / batch_size
                })

                if success_count == batch_size:  # All successful
                    max_concurrent_sessions = batch_size

            except Exception as e:
                print(f"Failed at batch size {batch_size}: {e}")
                break

        # Should handle at least 100 concurrent sessions
        assert max_concurrent_sessions >= 100

        # Performance should degrade gracefully
        for i, data in enumerate(session_creation_times):
            if i > 0:
                prev_data = session_creation_times[i-1]
                # Performance degradation should be reasonable
                degradation_factor = data['avg_time_per_session'] / prev_data['avg_time_per_session']
                assert degradation_factor < 3.0  # Less than 3x degradation

        # Test response time scalability
        response_times = []
        for concurrent_requests in [1, 5, 10, 25, 50]:
            try:
                async def make_request(request_id):
                    start_time = time.time()
                    result = await cli_interface.execute_command("/help")
                    end_time = time.time()
                    return {
                        "request_id": request_id,
                        "response_time": end_time - start_time,
                        "success": result['success']
                    }

                async with measure_async_performance() as perf:
                    tasks = [
                        make_request(i)
                        for i in range(concurrent_requests)
                    ]
                    results = await asyncio.gather(*tasks)

                successful_requests = [r for r in results if r['success']]
                avg_response_time = sum(r['response_time'] for r in successful_requests) / len(successful_requests)

                response_times.append({
                    "concurrent_requests": concurrent_requests,
                    "avg_response_time": avg_response_time,
                    "success_rate": len(successful_requests) / concurrent_requests
                })

            except Exception as e:
                print(f"Response time test failed at {concurrent_requests} requests: {e}")
                break

        # Response times should remain reasonable even under load
        for data in response_times:
            assert data['avg_response_time'] < 10.0  # Under 10 seconds average
            assert data['success_rate'] >= 0.8  # At least 80% success rate