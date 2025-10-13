"""
Learning Catalyst - AI-Powered Learning Platform

A comprehensive CLI-based learning platform with AI integration, knowledge management,
and multi-agent coordination capabilities.

Architecture:
    5-layer modular architecture with clear separation of concerns:
    1. User Interface Layer - CLI commands and interactive workflows
    2. Learning Intelligence Layer - AI tool orchestration and analytics
    3. Knowledge Management Layer - Concept graphs and semantic relationships
    4. AI Integration Layer - Multi-provider abstraction and model management
    5. Data Storage Layer - Entity models and configuration management
"""

__version__ = "0.1.0"
__author__ = "Learning Catalyst Team"

from .core import *
from .ai import *
from .knowledge import *
# from .tools import *  # Not implemented yet
# from .configuration import *  # Not implemented yet
# from .cli import *  # Not implemented yet
from .data import *