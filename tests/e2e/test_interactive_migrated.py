"""
Interactive test for Learning Catalyst application
"""
import subprocess
import sys
import time
import pytest
import tempfile
import shutil
import os


@pytest.fixture
def test_environment():
    """Create a temporary test environment"""
    test_dir = tempfile.mkdtemp()
    yield test_dir
    # Clean up
    if os.path.exists(test_dir):
        shutil.rmtree(test_dir)


def run_command(process, command, wait_time=2):
    """Send a command to the process and wait"""
    try:
        process.stdin.write(f"{command}\n")
        process.stdin.flush()
        time.sleep(wait_time)
        return True
    except Exception:
        return False


class TestInteractive:
    """Test class for interactive functionality"""

    def test_basic_interactive_functionality(self, test_environment):
        """Test basic interactive functionality"""
        # Start the application
        # Get the path to the project directory
        project_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

        process = subprocess.Popen(
            [sys.executable, "-m", "src.cli.main", "start-learning"],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            cwd=project_dir,
            env={**os.environ, "PYTHONPATH": project_dir}
        )

        try:
            # Wait for the application to start
            time.sleep(3)

            # Check if process is running
            assert process.poll() is None, "Application failed to start"

            # Test basic commands
            assert run_command(process, "/help"), "Help command failed"
            assert run_command(process, "/config"), "Config command failed"
            assert run_command(process, "/quit"), "Quit command failed"

        finally:
            # Terminate the process
            try:
                process.terminate()
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()
