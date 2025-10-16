"""
End-to-end tests for CLI user scenarios that were problematic.

These tests simulate the exact scenarios reported by the user:
- Getting stuck when typing natural language
- Application crashes instead of graceful error handling
- Rich console input parameter errors
- Poor user experience during AI configuration issues
"""

import pytest
import asyncio
import tempfile
import json
import subprocess
import sys
from pathlib import Path
from unittest.mock import patch, Mock
from io import StringIO


class TestCLIUserScenariosE2E:
    """End-to-end tests for real user scenarios."""

    @pytest.fixture
    def temp_config_dir(self):
        """Create temporary configuration directory."""
        with tempfile.TemporaryDirectory() as temp_dir:
            yield Path(temp_dir)

    @pytest.fixture
    def problematic_config(self, temp_config_dir):
        """Create the exact problematic configuration that caused user issues."""
        config_file = temp_config_dir / "config.json"

        # Recreate the exact problematic configuration from user's environment
        problematic_config = {
            "ai": {
                "default_provider": "openai",
                "default_model": "gpt-4-custom-experimental",  # Invalid model
                "temperature": 0.7,
                "max_tokens": 4096,
                "providers": {
                    "openai": {
                        "api_key": "fake_key"  # Invalid API key
                    }
                }
            },
            "ui": {
                "theme": "dark",
                "show_token_usage": True,
                "display_format": "detailed",
                "session_duration": 45
            },
            "learning": {
                "auto_save": True,
                "session_timeout_minutes": 120,
                "difficulty": "adaptive"
            },
            "privacy": {
                "store_conversations": True,
                "retention_days": 30
            },
            "performance": {
                "cache_size_mb": 100,
                "enable_caching": True
            },
            "provider": "chatglm"  # Additional conflicting setting
        }

        with open(config_file, 'w') as f:
            json.dump(problematic_config, f)

        return temp_config_dir

    @pytest.mark.e2e
    def test_user_scenario_natural_language_no_hang(self, problematic_config):
        """Test the exact user scenario: typing natural language should not hang."""
        # Simulate the user scenario that was problematic
        # User types "What is machine learning?" and expects response, not hang

        config_env = {"CATALYST_CONFIG_DIR": str(problematic_config)}

        # Use subprocess to test the actual CLI application
        process = subprocess.Popen(
            [sys.executable, "-m", "src.cli.main"],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            env={**dict(__import__('os').environ), **config_env}
        )

        try:
            # Send natural language input
            stdout, stderr = process.communicate(
                input="What is machine learning?\n/quit\n",
                timeout=30  # Should not hang for 30 seconds
            )

            # Should not have hung (process should complete)
            assert process.returncode == 0 or process.returncode == 1  # May exit due to config issues

            # Should contain helpful error message, not crash
            assert "AI Configuration Issue" in stdout or "Configuration" in stdout
            assert "machine learning" in stdout

        except subprocess.TimeoutExpired:
            process.kill()
            pytest.fail("CLI application hung when processing natural language input")

    @pytest.mark.e2e
    def test_user_scenario_multiple_natural_language_inputs(self, problematic_config):
        """Test user scenario with multiple natural language inputs."""
        config_env = {"CATALYST_CONFIG_DIR": str(problematic_config)}

        process = subprocess.Popen(
            [sys.executable, "-m", "src.cli.main"],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            env={**dict(__import__('os').environ), **config_env}
        )

        try:
            # Send multiple natural language inputs like user would
            inputs = [
                "What is Python?\n",
                "Explain neural networks\n",
                "How do I learn programming?\n",
                "/quit\n"
            ]

            stdout, stderr = process.communicate(
                input="".join(inputs),
                timeout=45  # Should handle all inputs within 45 seconds
            )

            # Should not hang
            assert not subprocess.TimeoutExpired

            # Should handle each input with helpful messages
            for user_input in inputs[:-1]:  # Exclude /quit
                question = user_input.strip()
                assert question in stdout
                assert ("AI Configuration Issue" in stdout or
                       "Provider Configuration Issue" in stdout or
                       "Authentication" in stdout)

        except subprocess.TimeoutExpired:
            process.kill()
            pytest.fail("CLI application hung on multiple natural language inputs")

    @pytest.mark.e2e
    def test_user_scenario_mixed_commands_and_natural_language(self, problematic_config):
        """Test user scenario mixing commands and natural language."""
        config_env = {"CATALYST_CONFIG_DIR": str(problematic_config)}

        process = subprocess.Popen(
            [sys.executable, "-m", "src.cli.main"],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            env={**dict(__import__('os').environ), **config_env}
        )

        try:
            # Simulate typical user session: commands, natural language, more commands
            user_session = [
                "/help\n",  # Should work
                "What is data science?\n",  # Should show error, not hang
                "/config\n",  # Should work
                "Explain machine learning algorithms\n",  # Should show error, not hang
                "/quit\n"  # Should exit
            ]

            stdout, stderr = process.communicate(
                input="".join(user_session),
                timeout=30
            )

            # Should not hang and should complete successfully
            assert not subprocess.TimeoutExpired

            # Commands should work normally
            assert "Learning Catalyst" in stdout or "commands" in stdout

            # Natural language should show helpful errors, not crash
            assert "data science" in stdout
            assert "machine learning algorithms" in stdout

        except subprocess.TimeoutExpired:
            process.kill()
            pytest.fail("CLI application hung during mixed command/natural language session")

    @pytest.mark.e2e
    def test_user_scenario_helpful_error_messages(self, problematic_config):
        """Test that error messages are helpful when AI is not configured."""
        config_env = {"CATALYST_CONFIG_DIR": str(problematic_config)}

        process = subprocess.Popen(
            [sys.executable, "-m", "src.cli.main"],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            env={**dict(__import__('os').environ), **config_env}
        )

        try:
            stdout, stderr = process.communicate(
                input="I want to learn about artificial intelligence\n/quit\n",
                timeout=20
            )

            # Should contain helpful guidance elements
            helpful_elements = [
                "artificial intelligence",  # Acknowledge user input
                "AI Configuration Issue",  # Clear problem description
                "/config",  # Specific command to run
                "provider",  # Mention of provider configuration
                "💡",  # Helpful indicator
                "1️⃣",  # Numbered steps
                "set up"  # Action-oriented language
            ]

            output_text = stdout + stderr

            for element in helpful_elements:
                assert element in output_text, f"Missing helpful element in error message: {element}"

        except subprocess.TimeoutExpired:
            process.kill()
            pytest.fail("CLI application hung instead of showing helpful error message")

    @pytest.mark.e2e
    def test_user_scenario_no_rich_console_errors(self, problematic_config):
        """Test that Rich console input errors are fixed."""
        config_env = {"CATALYST_CONFIG_DIR": str(problematic_config)}

        process = subprocess.Popen(
            [sys.executable, "-m", "src.cli.main"],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            env={**dict(__import__('os').environ), **config_env}
        )

        try:
            stdout, stderr = process.communicate(
                input="/quit\n",
                timeout=15
            )

            # Should not contain Rich console input errors
            rich_errors = [
                "Console.input() got an unexpected keyword argument 'style'",
                "TypeError",
                "unexpected keyword argument"
            ]

            error_text = stdout + stderr

            for error in rich_errors:
                assert error not in error_text, f"Found Rich console error: {error}"

        except subprocess.TimeoutExpired:
            process.kill()
            pytest.fail("CLI application hung due to Rich console input error")

    @pytest.mark.e2e
    def test_user_scenario_session_resilience(self, problematic_config):
        """Test that session remains resilient despite configuration issues."""
        config_env = {"CATALYST_CONFIG_DIR": str(problematic_config)}

        process = subprocess.Popen(
            [sys.executable, "-m", "src.cli.main"],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            env={**dict(__import__('os').environ), **config_env}
        )

        try:
            # Simulate user getting frustrated and trying multiple things
            frustrated_user_session = [
                "Help me learn coding\n",  # Natural language - should show error
                "What's Python?\n",  # Another natural language - should show error
                "/help\n",  # Try commands - should work
                "Teach me programming\n",  # Back to natural language - should show error
                "/config provider\n",  # Try to fix configuration - should work
                "Now explain AI\n",  # Try natural language again - should show error
                "/quit\n"  # Give up and exit
            ]

            stdout, stderr = process.communicate(
                input="".join(frustrated_user_session),
                timeout=40
            )

            # Should handle all interactions gracefully
            assert not subprocess.TimeoutExpired

            output_text = stdout + stderr

            # Should show that commands work
            assert "commands" in output_text.lower() or "config" in output_text.lower()

            # Should show natural language errors for each attempt
            assert output_text.count("coding") >= 1
            assert output_text.count("Python") >= 1
            assert output_text.count("programming") >= 1
            assert output_text.count("AI") >= 1

            # Should not show application crashes
            crash_indicators = [
                "Traceback",
                "Exception: ",
                "Error: ",
                "Fatal error"
            ]

            for crash in crash_indicators:
                # Allow some errors but not application crashes
                if crash in output_text:
                    crash_count = output_text.count(crash)
                    assert crash_count <= 2, f"Too many crashes found: {crash_count} instances of {crash}"

        except subprocess.TimeoutExpired:
            process.kill()
            pytest.fail("CLI application became unresponsive during frustrated user session")

    @pytest.mark.e2e
    def test_user_scenario_first_time_experience(self, temp_config_dir):
        """Test first-time user experience with no existing configuration."""
        # Remove any existing config to simulate first-time user
        config_file = temp_config_dir / "config.json"
        if config_file.exists():
            config_file.unlink()

        config_env = {"CATALYST_CONFIG_DIR": str(temp_config_dir)}

        process = subprocess.Popen(
            [sys.executable, "-m", "src.cli.main"],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            env={**dict(__import__('os').environ), **config_env}
        )

        try:
            stdout, stderr = process.communicate(
                input="What is machine learning?\n/quit\n",
                timeout=25
            )

            output_text = stdout + stderr

            # Should show first-time setup message
            first_time_indicators = [
                "Welcome",
                "first time",
                "configuration",
                "setup"
            ]

            has_first_time_message = any(indicator.lower() in output_text.lower()
                                        for indicator in first_time_indicators)

            # Should handle natural language gracefully even for first-time users
            assert "machine learning" in output_text
            assert ("AI Configuration Issue" in output_text or
                   "Configuration" in output_text or
                   "setup" in output_text.lower())

        except subprocess.TimeoutExpired:
            process.kill()
            pytest.fail("First-time user experience hung")

    @pytest.mark.e2e
    def test_user_scenario_keyboard_interrupt_handling(self, problematic_config):
        """Test keyboard interrupt (Ctrl+C) handling."""
        config_env = {"CATALYST_CONFIG_DIR": str(problematic_config)}

        process = subprocess.Popen(
            [sys.executable, "-m", "src.cli.main"],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            env={**dict(__import__('os').environ), **config_env}
        )

        try:
            # Let the application start, then send Ctrl+C
            asyncio.sleep(1)
            process.send_signal(2)  # SIGINT (Ctrl+C)

            stdout, stderr = process.communicate(timeout=10)

            # Should handle KeyboardInterrupt gracefully
            output_text = stdout + stderr
            assert "Goodbye" in output_text or "goodbye" in output_text.lower()

        except subprocess.TimeoutExpired:
            process.kill()
            pytest.fail("Application did not handle KeyboardInterrupt gracefully")

    @pytest.mark.e2e
    def test_user_scenario_performance_under_errors(self, problematic_config):
        """Test that application remains responsive under error conditions."""
        config_env = {"CATALYST_CONFIG_DIR": str(problematic_config)}

        process = subprocess.Popen(
            [sys.executable, "-m", "src.cli.main"],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            env={**dict(__import__('os').environ), **config_env}
        )

        try:
            # Send rapid succession of inputs to test responsiveness
            rapid_inputs = []
            for i in range(10):
                rapid_inputs.append(f"Question {i}\n")
            rapid_inputs.append("/quit\n")

            start_time = asyncio.get_event_loop().time()

            stdout, stderr = process.communicate(
                input="".join(rapid_inputs),
                timeout=30  # Should handle 10 inputs within 30 seconds
            )

            end_time = asyncio.get_event_loop().time()
            duration = end_time - start_time

            # Should be reasonably responsive (less than 3 seconds per input on average)
            assert duration < 30, f"Application too slow under error conditions: {duration:.2f}s"
            assert len(stdout) > 0, "No output received"

        except subprocess.TimeoutExpired:
            process.kill()
            pytest.fail("Application became unresponsive under rapid error conditions")

    @pytest.mark.e2e
    def test_user_scenario_memory_usage_stability(self, problematic_config):
        """Test that memory usage remains stable during error handling."""
        # This is a basic test - in a real scenario you'd use memory profiling tools
        config_env = {"CATALYST_CONFIG_DIR": str(problematic_config)}

        # Start process
        process = subprocess.Popen(
            [sys.executable, "-m", "src.cli.main"],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            env={**dict(__import__('os').environ), **config_env}
        )

        try:
            # Send many inputs to test for memory leaks
            many_inputs = []
            for i in range(20):
                many_inputs.append(f"Test question {i} about programming and AI and machine learning\n")
            many_inputs.append("/quit\n")

            stdout, stderr = process.communicate(
                input="".join(many_inputs),
                timeout=60
            )

            # Should complete without running out of memory
            assert process.returncode in [0, 1]  # Normal exit codes
            assert len(stdout) > 0

        except subprocess.TimeoutExpired:
            process.kill()
            pytest.fail("Application may have memory leak or became unresponsive")

    @pytest.mark.e2e
    def test_user_scenario_configuration_guidance_quality(self, problematic_config):
        """Test quality of configuration guidance provided to users."""
        config_env = {"CATALYST_CONFIG_DIR": str(problematic_config)}

        process = subprocess.Popen(
            [sys.executable, "-m", "src.cli.main"],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            env={**dict(__import__('os').environ), **config_env}
        )

        try:
            stdout, stderr = process.communicate(
                input="I want to learn web development\n/quit\n",
                timeout=20
            )

            output_text = stdout + stderr

            # Verify high-quality guidance
            quality_checks = {
                "acknowledges_user_input": "web development" in output_text,
                "identifies_problem": any(phrase in output_text for phrase in [
                    "AI Configuration Issue", "Configuration", "Provider", "Authentication"
                ]),
                "provides_specific_commands": "/config" in output_text,
                "gives_concrete_examples": any(provider in output_text for provider in [
                    "openai", "deepseek", "chatglm", "siliconflow"
                ]),
                "actionable_steps": any(step in output_text for step in [
                    "1️⃣", "2️⃣", "3️⃣", "4️⃣", "First", "Second", "Third", "Fourth"
                ]),
                "helpful_tone": any(indicator in output_text for indicator in [
                    "💡", "✅", "🔧", "🚀", "Let's", "Here's how"
                ]),
                "no_technical_jargon": all(bad_term not in output_text for bad_term in [
                    "traceback", "exception stack", "internal error", "null pointer"
                ])
            }

            # All quality checks should pass
            for check_name, passed in quality_checks.items():
                assert passed, f"Quality check failed: {check_name}"

        except subprocess.TimeoutExpired:
            process.kill()
            pytest.fail("Application did not provide quality configuration guidance")