#!/usr/bin/env python3
"""
Comprehensive test runner for ConfigManager test suite.

This script provides a convenient way to run all configuration-related tests
with different options and generates detailed reports.
"""

import sys
import subprocess
import argparse
from pathlib import Path


def run_command(cmd, description):
    """Run a command and return success status."""
    print(f"\n{'='*60}")
    print(f"Running: {description}")
    print(f"Command: {' '.join(cmd)}")
    print(f"{'='*60}")

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        print(result.stdout)
        if result.stderr:
            print("STDERR:", result.stderr)
        return True
    except subprocess.CalledProcessError as e:
        print(f"ERROR: Command failed with exit code {e.returncode}")
        print("STDOUT:", e.stdout)
        print("STDERR:", e.stderr)
        return False


def main():
    """Main test runner function."""
    parser = argparse.ArgumentParser(description="Run ConfigManager test suite")
    parser.add_argument(
        "--coverage",
        action="store_true",
        help="Run tests with coverage report"
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Run tests with verbose output"
    )
    parser.add_argument(
        "--specific",
        type=str,
        help="Run specific test file (e.g., 'test_config_structure_validation.py')"
    )
    parser.add_argument(
        "--integration-only",
        action="store_true",
        help="Run only integration tests"
    )
    parser.add_argument(
        "--unit-only",
        action="store_true",
        help="Run only unit tests"
    )
    parser.add_argument(
        "--config-only",
        action="store_true",
        help="Run only configuration-related tests"
    )

    args = parser.parse_args()

    # Base pytest command
    base_cmd = ["python", "-m", "pytest"]

    if args.verbose:
        base_cmd.append("-v")

    if args.coverage:
        base_cmd.extend(["--cov=src.core.config", "--cov-report=term-missing", "--cov-report=html"])

    # Determine test targets
    test_files = []

    if args.specific:
        test_files = [f"tests/unit/configuration/{args.specific}"]
    elif args.integration_only:
        test_files = ["tests/integration/test_config_file_system_integration.py"]
    elif args.unit_only:
        test_files = [
            "tests/unit/configuration/test_config_structure_validation.py",
            "tests/unit/configuration/test_provider_management.py",
            "tests/unit/configuration/test_custom_provider_support.py",
            "tests/unit/configuration/test_edge_cases.py",
            "tests/unit/configuration/test_error_handling_and_rollback.py",
            "tests/unit/configuration/test_config_manager_fixed.py"
        ]
    elif args.config_only:
        test_files = [
            "tests/unit/configuration/",
            "tests/integration/test_config_file_system_integration.py"
        ]
    else:
        # Default: run all config tests
        test_files = [
            "tests/unit/configuration/",
            "tests/integration/test_config_file_system_integration.py"
        ]

    # Run tests
    success_count = 0
    total_count = len(test_files)

    for test_file in test_files:
        if Path(test_file).exists():
            cmd = base_cmd + [test_file]
            if run_command(cmd, f"Running {test_file}"):
                success_count += 1
        else:
            print(f"WARNING: Test file not found: {test_file}")

    # Print summary
    print(f"\n{'='*60}")
    print("TEST SUMMARY")
    print(f"{'='*60}")
    print(f"Total test files: {total_count}")
    print(f"Successful: {success_count}")
    print(f"Failed: {total_count - success_count}")

    if success_count == total_count:
        print("✅ All tests passed!")
        return 0
    else:
        print("❌ Some tests failed!")
        return 1


if __name__ == "__main__":
    sys.exit(main())