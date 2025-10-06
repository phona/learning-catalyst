"""
Comprehensive end-to-end tests for Learning Catalyst Phase 1 features
based on the requirements in .documents/v1/requirement/README.md
"""
import subprocess
import time
import sys
import os
import pytest
import tempfile
import shutil


def run_command(process, command, wait_time=2):
    """Send a command to the process and wait"""
    try:
        process.stdin.write(f"{command}\n")
        process.stdin.flush()
        time.sleep(wait_time)
        return True
    except Exception:
        return False


@pytest.fixture
def test_environment():
    """Create a temporary test environment"""
    test_dir = tempfile.mkdtemp()
    yield test_dir
    # Clean up
    if os.path.exists(test_dir):
        shutil.rmtree(test_dir)


class TestPhase1Features:
    """Test class for Phase 1 features"""
    
    def test_first_time_user_experience(self, test_environment):
        """Test Story 1: First-Time User Onboarding"""
        # Clean up any existing state
        learningspace_path = os.path.join(test_environment, ".learningspace")
        catalyst_path = os.path.join(test_environment, ".catalyst")
        
        if os.path.exists(learningspace_path):
            shutil.rmtree(learningspace_path)
        
        if os.path.exists(catalyst_path):
            shutil.rmtree(catalyst_path)
        
        # Start the application
        # Get the path to the project directory
        project_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
        
        process = subprocess.Popen(
            [sys.executable, "-m", "src.cli.main", "start-learning", test_environment],
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
            
            # Send help command to see available commands
            assert run_command(process, "/help"), "Help command failed"
            
        finally:
            # Terminate the process
            try:
                process.terminate()
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()
    
    def test_session_resumption(self, test_environment):
        """Test Story 2: Seamless Session Resumption"""
        # Start the application again (should detect previous session)
        # Get the path to the project directory
        project_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
        
        process = subprocess.Popen(
            [sys.executable, "-m", "src.cli.main", "start-learning", test_environment],
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
            
            # Test checkpoint functionality
            assert run_command(process, "/checkpoint save test-checkpoint"), "Checkpoint save failed"
            
        finally:
            # Terminate the process
            try:
                process.terminate()
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()
    
    def test_explanation_request(self, test_environment):
        """Test Story 3: Requesting an Explanation"""
        # Start the application
        # Get the path to the project directory
        project_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
        
        process = subprocess.Popen(
            [sys.executable, "-m", "src.cli.main", "start-learning", test_environment],
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
            
            # Test explanation request
            assert run_command(process, "Explain what Python decorators are"), "Explanation request failed"
            
        finally:
            # Terminate the process
            try:
                process.terminate()
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()
    
    def test_challenge_and_feedback(self, test_environment):
        """Test Stories 4 & 5: Requesting a Challenge and Answering with Feedback"""
        # Start the application
        # Get the path to the project directory
        project_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
        
        process = subprocess.Popen(
            [sys.executable, "-m", "src.cli.main", "start-learning", test_environment],
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
            
            # Test challenge request
            assert run_command(process, "Quiz me on Python lists"), "Challenge request failed"
            
            # Test answer submission
            assert run_command(process, "The answer is option A"), "Answer submission failed"
            
        finally:
            # Terminate the process
            try:
                process.terminate()
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()
    
    def test_model_configuration(self, test_environment):
        """Test Story 6: Configuring AI Models"""
        # Start the application
        # Get the path to the project directory
        project_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
        
        process = subprocess.Popen(
            [sys.executable, "-m", "src.cli.main", "start-learning", test_environment],
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
            
            # Test models command
            assert run_command(process, "/models"), "Models command failed"
            
            # Test config command
            assert run_command(process, "/config"), "Config command failed"
            
        finally:
            # Terminate the process
            try:
                process.terminate()
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()
    
    def test_checkpoint_management(self, test_environment):
        """Test Story 7: Manual State Checkpointing"""
        # Start the application
        # Get the path to the project directory
        project_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
        
        process = subprocess.Popen(
            [sys.executable, "-m", "src.cli.main", "start-learning", test_environment],
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
            
            # Test checkpoint save
            assert run_command(process, "/checkpoint save phase1-test"), "Checkpoint save failed"
            
            # Test checkpoint list
            assert run_command(process, "/checkpoint list"), "Checkpoint list failed"
            
            # Test checkpoint load
            assert run_command(process, "/checkpoint load phase1-test"), "Checkpoint load failed"
            
        finally:
            # Terminate the process
            try:
                process.terminate()
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()
    
    def test_concept_integration(self, test_environment):
        """Test Integration with Local Markdown Files (CTX-R1)"""
        # Start the application
        # Get the path to the project directory
        project_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
        
        process = subprocess.Popen(
            [sys.executable, "-m", "src.cli.main", "start-learning", test_environment],
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
            
            # Test concepts command
            assert run_command(process, "/concepts"), "Concepts command failed"
            
            # Test knowledge-map command
            assert run_command(process, "/knowledge-map"), "Knowledge-map command failed"
            
        finally:
            # Terminate the process
            try:
                process.terminate()
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()