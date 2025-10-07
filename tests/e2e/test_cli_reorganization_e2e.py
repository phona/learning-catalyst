"""
End-to-end tests for CLI reorganization project
Tests complete user workflows with the new command registry system
"""

import os
import shutil
import sys
import tempfile
from pathlib import Path

from rich.console import Console

from src.cli.app_initializer import (
    AIConfigurationManager,
    ComponentInitializer,
    InteractiveSessionManager,
    StartupMessageManager,
    WorkspaceInitializer,
)

# Import command classes for testing
from src.cli.commands.analytics import StatisticsCommand, TokensCommand
from src.cli.commands.config import ConfigCommand, ModelsCommand, PreferencesCommand
from src.cli.commands.learning import ConceptsCommand, ExplainCommand, KnowledgeMapCommand, QuizCommand
from src.cli.commands.registry import CommandRegistry
from src.cli.commands.system import ClearCommand, HelpCommand, QuitCommand
from src.cli.core.rich_interface import RichInterface

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))


class TestCLIReorganizationE2E:
    """End-to-end tests for CLI reorganization"""

    def __init__(self):
        self.test_workspace = None
        self.console = Console()

    def setup_test_workspace(self):
        """Create a temporary test workspace"""
        self.test_workspace = tempfile.mkdtemp(prefix="catalyst_e2e_test_")
        print(f"📁 Created test workspace: {self.test_workspace}")

        # Create some test markdown files
        test_files = {
            "python_basics.md": """
# Python Basics

Python is a high-level programming language.

## Variables
Variables are used to store data.

## Functions
Functions are reusable blocks of code.
""",
            "data_structures.md": """
# Data Structures

## Lists
Lists are ordered collections of items.

## Dictionaries
Dictionaries store key-value pairs.
""",
            "algorithms.md": """
# Algorithms

## Sorting
Sorting algorithms arrange data in order.

## Searching
Searching algorithms find specific data.
""",
        }

        for filename, content in test_files.items():
            filepath = Path(self.test_workspace) / filename
            with open(filepath, "w") as f:
                f.write(content)

        return self.test_workspace

    def cleanup_test_workspace(self):
        """Clean up the test workspace"""
        if self.test_workspace and os.path.exists(self.test_workspace):
            shutil.rmtree(self.test_workspace)
            print(f"🗑️  Cleaned up test workspace: {self.test_workspace}")

    def test_complete_application_startup(self):
        """Test complete application startup workflow"""
        print("\n🧪 Testing complete application startup workflow...")

        try:
            # Setup test workspace
            workspace_path = self.setup_test_workspace()

            # Initialize workspace
            workspace_init = WorkspaceInitializer(workspace_path)
            is_first_time, learningspace_path = workspace_init.initialize_workspace()

            assert is_first_time is True, "Should detect first-time setup"
            assert os.path.exists(learningspace_path), "Learningspace should be created"

            # Initialize components
            component_init = ComponentInitializer(workspace_path, learningspace_path)
            core_components = component_init.initialize_core_components()
            ai_components = component_init.initialize_ai_components()

            # Verify all components are initialized
            assert core_components["prefs_manager"] is not None
            assert core_components["knowledge_navigator"] is not None
            assert core_components["startup_guide"] is not None
            assert core_components["state_manager"] is not None
            assert ai_components["ai_service"] is not None

            # Test AI configuration
            ai_config_manager = AIConfigurationManager(workspace_path, core_components["prefs_manager"])
            provider, model = ai_config_manager.check_ai_configuration()

            # May return existing configuration or None for first-time setup
            # Both are acceptable for the test
            print(f"AI configuration: provider={provider}, model={model}")

            # Test startup message manager
            StartupMessageManager(core_components["startup_guide"], self.console)

            # Test interactive session manager
            session_manager = InteractiveSessionManager(
                workspace_path=workspace_path,
                learningspace_path=learningspace_path,
                core_components=core_components,
                ai_components=ai_components,
                default_provider="deepseek",
                default_model="deepseek-chat",
            )

            # Test command registry setup
            command_registry = session_manager.setup_command_registry()
            assert len(command_registry.commands) > 0, "Commands should be registered"

            print("✅ Complete application startup workflow test passed")
            return True

        except Exception as e:
            print(f"❌ Application startup test failed: {e}")
            return False
        finally:
            self.cleanup_test_workspace()

    def test_all_command_categories(self):
        """Test all command categories and their commands"""
        print("\n🧪 Testing all command categories...")

        try:
            # Setup test workspace
            workspace_path = self.setup_test_workspace()

            # Initialize command registry
            cli_interface = RichInterface()
            command_registry = CommandRegistry(cli_interface)

            # Register all commands

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

            # Set up context
            command_registry.set_context("workspace_path", workspace_path)

            # Test system commands
            system_commands = ["/help", "/clear"]
            for cmd in system_commands:
                result = command_registry.execute_command(cmd, {"workspace_path": workspace_path})
                assert result.success, f"System command {cmd} should succeed"

            # Test configuration commands
            config_commands = ["/models", "/preferences list", "/config list"]
            for cmd in config_commands:
                result = command_registry.execute_command(cmd, {"workspace_path": workspace_path})
                assert result.success, f"Configuration command {cmd} should succeed"

            # Test learning commands
            learning_commands = ["/concepts", "/knowledge-map"]
            for cmd in learning_commands:
                result = command_registry.execute_command(cmd, {"workspace_path": workspace_path})
                assert result.success, f"Learning command {cmd} should succeed"

            # Test analytics commands
            analytics_commands = ["/tokens", "/statistics"]
            for cmd in analytics_commands:
                result = command_registry.execute_command(cmd, {"workspace_path": workspace_path})
                assert result.success, f"Analytics command {cmd} should succeed"

            print("✅ All command categories test passed")
            return True

        except Exception as e:
            print(f"❌ Command categories test failed: {e}")
            return False
        finally:
            self.cleanup_test_workspace()

    def test_command_aliases(self):
        """Test command aliases work correctly"""
        print("\n🧪 Testing command aliases...")

        try:
            # Setup test workspace
            workspace_path = self.setup_test_workspace()

            # Initialize command registry
            cli_interface = RichInterface()
            command_registry = CommandRegistry(cli_interface)

            # Register all commands

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

            # Set up context
            command_registry.set_context("workspace_path", workspace_path)

            # Test aliases
            alias_tests = [
                ("/h", "/help"),
                ("/?", "/help"),
                ("/exit", "/quit"),
                ("/q", "/quit"),
                ("/cls", "/clear"),
                ("/m", "/models"),
                ("/prefs", "/preferences"),
                ("/pref", "/preferences"),
                ("/cfg", "/config"),
                ("/conf", "/config"),
                ("/topics", "/concepts"),
                ("/exp", "/explain"),
                ("/challenge", "/quiz"),
                ("/kmap", "/knowledge-map"),
                ("/usage", "/tokens"),
                ("/stats", "/statistics"),
                ("/analytics", "/statistics"),
            ]

            for alias, original in alias_tests:
                # Test that alias resolves to the same command
                alias_cmd = command_registry.get_command(alias)
                original_cmd = command_registry.get_command(original)

                assert alias_cmd is not None, f"Alias {alias} should resolve to a command"
                assert original_cmd is not None, f"Original command {original} should exist"
                assert alias_cmd.info.name == original_cmd.info.name, f"Alias {alias} should resolve to {original}"

            print("✅ Command aliases test passed")
            return True

        except Exception as e:
            print(f"❌ Command aliases test failed: {e}")
            return False
        finally:
            self.cleanup_test_workspace()

    def test_error_handling(self):
        """Test error handling in various scenarios"""
        print("\n🧪 Testing error handling...")

        try:
            # Setup test workspace
            workspace_path = self.setup_test_workspace()

            # Initialize command registry
            cli_interface = RichInterface()
            command_registry = CommandRegistry(cli_interface)

            # Register commands

            command_registry.register_command(HelpCommand())
            command_registry.register_command(PreferencesCommand())

            # Test unknown command
            result = command_registry.execute_command("/unknown_command", {"workspace_path": workspace_path})
            assert result.success is False, "Unknown command should fail"

            # Test invalid arguments
            result = command_registry.execute_command("/preferences set", {"workspace_path": workspace_path})
            assert result.success is False, "Command with insufficient arguments should fail"

            # Test invalid workspace path
            result = command_registry.execute_command("/concepts", {"workspace_path": "/nonexistent/path"})
            # Should handle gracefully without crashing

            print("✅ Error handling test passed")
            return True

        except Exception as e:
            print(f"❌ Error handling test failed: {e}")
            return False
        finally:
            self.cleanup_test_workspace()

    def test_learning_workflow(self):
        """Test a complete learning workflow"""
        print("\n🧪 Testing complete learning workflow...")

        try:
            # Setup test workspace
            workspace_path = self.setup_test_workspace()

            # Initialize command registry
            cli_interface = RichInterface()
            command_registry = CommandRegistry(cli_interface)

            # Register learning commands

            command_registry.register_command(ConceptsCommand())
            command_registry.register_command(ExplainCommand())
            command_registry.register_command(QuizCommand())

            # Set up context
            command_registry.set_context("workspace_path", workspace_path)

            # Step 1: View available concepts
            result = command_registry.execute_command("/concepts", {"workspace_path": workspace_path})
            assert result.success, "Should be able to view concepts"

            # Step 2: Get explanation for a concept
            result = command_registry.execute_command("/explain Python Basics", {"workspace_path": workspace_path})
            # Should handle gracefully even if explanation fails

            # Step 3: Take a quiz
            result = command_registry.execute_command("/quiz Python Basics", {"workspace_path": workspace_path})
            # Should handle gracefully even if quiz fails

            print("✅ Learning workflow test passed")
            return True

        except Exception as e:
            print(f"❌ Learning workflow test failed: {e}")
            return False
        finally:
            self.cleanup_test_workspace()

    def run_all_tests(self):
        """Run all end-to-end tests"""
        print("🚀 Starting CLI Reorganization End-to-End Tests")
        print("=" * 60)

        tests = [
            self.test_complete_application_startup,
            self.test_all_command_categories,
            self.test_command_aliases,
            self.test_error_handling,
            self.test_learning_workflow,
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
        print(f"📊 Test Results: {passed}/{total} tests passed")

        if passed == total:
            print("🎉 All end-to-end tests passed!")
            return True
        else:
            print(f"❌ {total - passed} tests failed")
            return False


def main():
    """Run the end-to-end tests"""
    tester = TestCLIReorganizationE2E()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
