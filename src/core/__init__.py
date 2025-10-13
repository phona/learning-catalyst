"""
Core utilities and base classes for Learning Catalyst.

This module provides essential utilities and base functionality without over-engineering.
"""

from .config import ConfigManager
from .exceptions import *
from .models import *

__all__ = ['ConfigManager']