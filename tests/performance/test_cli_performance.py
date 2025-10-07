"""
Performance tests for CLI reorganization project
Tests command execution performance and system efficiency
"""

import os
import shutil
import sys
import tempfile
import time
from pathlib import Path

from src.cli.commands.registry import CommandRegistry
from src.cli.core.rich_interface import RichInterface

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))


class TestCLIPerformance:
    """Performance tests for CLI reorganization"""

    def __init__(self):
        self.test_workspace = None
        self.results = {}

    def setup_test_workspace(self):
        """Create a temporary test workspace"""
        self.test_workspace = tempfile.mkdtemp(prefix="catalyst_perf_test_")
        return self.test_workspace

    def cleanup_test_workspace(self):
        """Clean up the test workspace"""
        if self.test_workspace and os.path.exists(self.test_workspace):
            shutil.rmtree(self.test_workspace)

    def test_command_registry_startup_time(self):
        """Test command registry startup performance"""
        print("\n⚡ Testing command registry startup time...")

        try:
            # Measure startup time
            start_time = time.time()

            cli_interface = RichInterface()
            command_registry = CommandRegistry(cli_interface)

            # Register all commands
            from src.cli.commands.analytics import StatisticsCommand, TokensCommand
            from src.cli.commands.config import ConfigCommand, ModelsCommand, PreferencesCommand
            from src.cli.commands.learning import ConceptsCommand, ExplainCommand, KnowledgeMapCommand, QuizCommand
            from src.cli.commands.system import ClearCommand, HelpCommand, QuitCommand

            command_registry.register_command(HelpCommand())
            command_registry.register_command(QuitCommand())
            command_registry.register_command(ClearCommand())
            command_registry.register_command(ModelsCommand())
            command_registry.register_command(PreferencesCommand())
            command_registry.register_command(ConfigCommand())
            command_registry.register_command(ConceptsCommand())
            command_registry.register_command(ExplainCommand())
            command_registry.register_command(QuizCommand())
            command_registry.register_command(KnowledgeMapCommand())
            command_registry.register_command(TokensCommand())
            command_registry.register_command(StatisticsCommand())

            end_time = time.time()
            startup_time = end_time - start_time

            self.results["registry_startup_time"] = startup_time
            print(f"✅ Registry startup time: {startup_time:.4f} seconds")

            # Assert reasonable startup time (< 1 second)
            assert startup_time < 1.0, f"Registry startup should be < 1 second, got {startup_time:.4f}s"

            return True

        except Exception as e:
            print(f"❌ Registry startup test failed: {e}")
            return False

    def test_command_execution_performance(self):
        """Test command execution performance"""
        print("\n⚡ Testing command execution performance...")

        try:
            # Setup
            workspace_path = self.setup_test_workspace()
            cli_interface = RichInterface()
            command_registry = CommandRegistry(cli_interface)

            # Register commands
            from src.cli.commands.analytics import TokensCommand
            from src.cli.commands.config import ModelsCommand
            from src.cli.commands.learning import ConceptsCommand
            from src.cli.commands.system import ClearCommand, HelpCommand

            command_registry.register_command(HelpCommand())
            command_registry.register_command(ClearCommand())
            command_registry.register_command(ModelsCommand())
            command_registry.register_command(ConceptsCommand())
            command_registry.register_command(TokensCommand())

            command_registry.set_context("workspace_path", workspace_path)

            # Test execution times for different commands
            test_commands = ["/help", "/clear", "/models", "/concepts", "/tokens"]

            execution_times = {}

            for command in test_commands:
                times = []
                # Run each command 5 times and average
                for _ in range(5):
                    start_time = time.time()
                    result = command_registry.execute_command(command, {"workspace_path": workspace_path})
                    end_time = time.time()

                    if result.success:
                        times.append(end_time - start_time)

                if times:
                    avg_time = sum(times) / len(times)
                    execution_times[command] = avg_time
                    print(f"  {command}: {avg_time:.4f}s average")

            self.results["command_execution_times"] = execution_times

            # Assert reasonable execution times (< 0.5 seconds for most commands)
            for command, avg_time in execution_times.items():
                if command not in ["/concepts"]:  # concepts might be slower due to database access
                    assert avg_time < 0.5, f"Command {command} should execute < 0.5s, got {avg_time:.4f}s"

            print("✅ Command execution performance test passed")
            return True

        except Exception as e:
            print(f"❌ Command execution performance test failed: {e}")
            return False
        finally:
            self.cleanup_test_workspace()

    def test_command_lookup_performance(self):
        """Test command lookup performance"""
        print("\n⚡ Testing command lookup performance...")

        try:
            # Setup
            cli_interface = RichInterface()
            command_registry = CommandRegistry(cli_interface)

            # Register all commands
            from src.cli.commands.analytics import StatisticsCommand, TokensCommand
            from src.cli.commands.config import ConfigCommand, ModelsCommand, PreferencesCommand
            from src.cli.commands.learning import ConceptsCommand, ExplainCommand, KnowledgeMapCommand, QuizCommand
            from src.cli.commands.system import ClearCommand, HelpCommand, QuitCommand

            command_registry.register_command(HelpCommand())
            command_registry.register_command(QuitCommand())
            command_registry.register_command(ClearCommand())
            command_registry.register_command(ModelsCommand())
            command_registry.register_command(PreferencesCommand())
            command_registry.register_command(ConfigCommand())
            command_registry.register_command(ConceptsCommand())
            command_registry.register_command(ExplainCommand())
            command_registry.register_command(QuizCommand())
            command_registry.register_command(KnowledgeMapCommand())
            command_registry.register_command(TokensCommand())
            command_registry.register_command(StatisticsCommand())

            # Test lookup times
            test_lookups = [
                "/help",
                "/h",
                "/?",  # System commands with aliases
                "/models",
                "/m",
                "/prefs",
                "/pref",  # Config commands with aliases
                "/concepts",
                "/topics",
                "/exp",
                "/quiz",  # Learning commands with aliases
                "/tokens",
                "/usage",
                "/stats",
                "/analytics",  # Analytics commands with aliases
            ]

            lookup_times = []

            # Perform 1000 lookups
            for _ in range(1000):
                for lookup in test_lookups:
                    start_time = time.time()
                    command_registry.get_command(lookup)
                    end_time = time.time()
                    lookup_times.append(end_time - start_time)

            avg_lookup_time = sum(lookup_times) / len(lookup_times)
            max_lookup_time = max(lookup_times)

            self.results["avg_lookup_time"] = avg_lookup_time
            self.results["max_lookup_time"] = max_lookup_time

            print(f"  Average lookup time: {avg_lookup_time:.6f}s")
            print(f"  Maximum lookup time: {max_lookup_time:.6f}s")

            # Assert reasonable lookup times (< 0.001 seconds average)
            assert avg_lookup_time < 0.001, f"Average lookup should be < 0.001s, got {avg_lookup_time:.6f}s"
            assert max_lookup_time < 0.01, f"Maximum lookup should be < 0.01s, got {max_lookup_time:.6f}s"

            print("✅ Command lookup performance test passed")
            return True

        except Exception as e:
            print(f"❌ Command lookup performance test failed: {e}")
            return False

    def test_memory_usage(self):
        """Test memory usage of the command system"""
        print("\n⚡ Testing memory usage...")

        try:
            import gc

            import psutil

            # Get initial memory usage
            process = psutil.Process()
            initial_memory = process.memory_info().rss / 1024 / 1024  # MB

            # Create multiple command registries
            registries = []
            for i in range(10):
                cli_interface = RichInterface()
                command_registry = CommandRegistry(cli_interface)

                # Register all commands
                from src.cli.commands.analytics import StatisticsCommand, TokensCommand
                from src.cli.commands.config import ConfigCommand, ModelsCommand, PreferencesCommand
                from src.cli.commands.learning import ConceptsCommand, ExplainCommand, KnowledgeMapCommand, QuizCommand
                from src.cli.commands.system import ClearCommand, HelpCommand, QuitCommand

                command_registry.register_command(HelpCommand())
                command_registry.register_command(QuitCommand())
                command_registry.register_command(ClearCommand())
                command_registry.register_command(ModelsCommand())
                command_registry.register_command(PreferencesCommand())
                command_registry.register_command(ConfigCommand())
                command_registry.register_command(ConceptsCommand())
                command_registry.register_command(ExplainCommand())
                command_registry.register_command(QuizCommand())
                command_registry.register_command(KnowledgeMapCommand())
                command_registry.register_command(TokensCommand())
                command_registry.register_command(StatisticsCommand())

                registries.append(command_registry)

            # Get memory usage after creating registries
            peak_memory = process.memory_info().rss / 1024 / 1024  # MB
            memory_increase = peak_memory - initial_memory

            # Clean up
            del registries
            gc.collect()

            final_memory = process.memory_info().rss / 1024 / 1024  # MB

            self.results["memory_increase"] = memory_increase
            self.results["final_memory"] = final_memory

            print(f"  Initial memory: {initial_memory:.2f} MB")
            print(f"  Peak memory: {peak_memory:.2f} MB")
            print(f"  Memory increase: {memory_increase:.2f} MB")
            print(f"  Final memory: {final_memory:.2f} MB")

            # Assert reasonable memory usage (< 50MB increase for 10 registries)
            assert memory_increase < 50, f"Memory increase should be < 50MB, got {memory_increase:.2f}MB"

            print("✅ Memory usage test passed")
            return True

        except ImportError:
            print("⚠️  psutil not available, skipping memory test")
            return True
        except Exception as e:
            print(f"❌ Memory usage test failed: {e}")
            return False

    def test_concurrent_command_execution(self):
        """Test concurrent command execution"""
        print("\n⚡ Testing concurrent command execution...")

        try:
            import queue
            import threading

            # Setup
            workspace_path = self.setup_test_workspace()
            cli_interface = RichInterface()
            command_registry = CommandRegistry(cli_interface)

            # Register commands
            from src.cli.commands.config import ModelsCommand
            from src.cli.commands.system import ClearCommand, HelpCommand

            command_registry.register_command(HelpCommand())
            command_registry.register_command(ClearCommand())
            command_registry.register_command(ModelsCommand())

            command_registry.set_context("workspace_path", workspace_path)

            # Test concurrent execution
            results_queue = queue.Queue()

            def execute_commands(thread_id):
                """Execute commands in a thread"""
                commands = ["/help", "/clear", "/models"]
                thread_results = []

                for command in commands:
                    start_time = time.time()
                    result = command_registry.execute_command(command, {"workspace_path": workspace_path})
                    end_time = time.time()

                    thread_results.append(
                        {
                            "thread_id": thread_id,
                            "command": command,
                            "success": result.success,
                            "execution_time": end_time - start_time,
                        }
                    )

                results_queue.put(thread_results)

            # Create and start multiple threads
            threads = []
            start_time = time.time()

            for i in range(5):
                thread = threading.Thread(target=execute_commands, args=(i,))
                threads.append(thread)
                thread.start()

            # Wait for all threads to complete
            for thread in threads:
                thread.join()

            end_time = time.time()
            total_time = end_time - start_time

            # Collect results
            all_results = []
            while not results_queue.empty():
                all_results.extend(results_queue.get())

            # Analyze results
            successful_commands = sum(1 for r in all_results if r["success"])
            total_commands = len(all_results)

            self.results["concurrent_execution_time"] = total_time
            self.results["concurrent_success_rate"] = successful_commands / total_commands

            print(f"  Total execution time: {total_time:.4f}s")
            print(f"  Success rate: {successful_commands}/{total_commands} ({successful_commands/total_commands*100:.1f}%)")

            # Assert all commands executed successfully
            assert (
                successful_commands == total_commands
            ), f"All commands should succeed, got {successful_commands}/{total_commands}"

            print("✅ Concurrent command execution test passed")
            return True

        except Exception as e:
            print(f"❌ Concurrent command execution test failed: {e}")
            return False
        finally:
            self.cleanup_test_workspace()

    def run_all_performance_tests(self):
        """Run all performance tests"""
        print("🚀 Starting CLI Performance Tests")
        print("=" * 60)

        tests = [
            self.test_command_registry_startup_time,
            self.test_command_execution_performance,
            self.test_command_lookup_performance,
            self.test_memory_usage,
            self.test_concurrent_command_execution,
        ]

        passed = 0
        total = len(tests)

        for test in tests:
            try:
                if test():
                    passed += 1
            except Exception as e:
                print(f"❌ Test {test.__name__} failed with exception: {e}")

        print("\n" + "=" * 60)
        print(f"📊 Performance Test Results: {passed}/{total} tests passed")

        # Print detailed results
        if self.results:
            print("\n📈 Detailed Performance Metrics:")
            for key, value in self.results.items():
                if isinstance(value, dict):
                    print(f"  {key}:")
                    for sub_key, sub_value in value.items():
                        print(f"    {sub_key}: {sub_value:.4f}")
                else:
                    print(f"  {key}: {value:.4f}")

        if passed == total:
            print("🎉 All performance tests passed!")
            return True
        else:
            print(f"❌ {total - passed} tests failed")
            return False


def main():
    """Run the performance tests"""
    tester = TestCLIPerformance()
    success = tester.run_all_performance_tests()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
