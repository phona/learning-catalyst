"""
CLI interface for Learning Catalyst.

Command-line interface with slash commands and interactive features.
"""

from .interface import CLIInterface
from .commands import CommandProcessor, CommandResult

__all__ = ['CLIInterface', 'CommandProcessor', 'CommandResult']