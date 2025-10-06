#!/usr/bin/env python3
"""
Fix all remaining flake8 issues in the project.
"""

import os
import re

def fix_file(file_path: str) -> bool:
    """Fix flake8 issues in a single file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Fix syntax errors
        content = fix_syntax_errors(content, file_path)
        
        # Fix indentation errors
        content = fix_indentation_errors(content, file_path)
        
        # Fix import issues
        content = fix_import_issues(content, file_path)
        
        # Fix blank line issues
        content = fix_blank_line_issues(content, file_path)
        
        # Fix undefined name issues
        content = fix_undefined_names(content, file_path)
        
        # Fix unused imports
        content = fix_unused_imports(content, file_path)
        
        # Fix other issues
        content = fix_other_issues(content, file_path)
        
        # Write back if changed
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        
        return False
    except Exception as e:
        print(f"Error fixing {file_path}: {e}")
        return False

def fix_syntax_errors(content: str, file_path: str) -> str:
    """Fix syntax errors."""
    lines = content.split('\n')
    
    for i, line in enumerate(lines):
        # Fix unterminated string literals
        if '"""' in line and line.count('"""') % 2 == 1:
            # Add missing quotes at end
            line = line.rstrip() + '"""'
            lines[i] = line
        
        # Fix unmatched parentheses
        if '(' in line and ')' not in line and not line.strip().endswith('\\'):
            # Check if it's a function call or definition that spans multiple lines
            if i < len(lines) - 1:
                next_line = lines[i+1]
                if not next_line.strip().startswith(')'):
                    # Add closing parenthesis
                    line = line.rstrip() + ')'
                    lines[i] = line
        
        # Fix unmatched brackets
        if '[' in line and ']' not in line and not line.strip().endswith('\\'):
            # Check if it's a list that spans multiple lines
            if i < len(lines) - 1:
                next_line = lines[i+1]
                if not next_line.strip().startswith(']'):
                    # Add closing bracket
                    line = line.rstrip() + ']'
                    lines[i] = line
        
        # Fix unmatched braces
        if '{' in line and '}' not in line and not line.strip().endswith('\\'):
            # Check if it's a dict that spans multiple lines
            if i < len(lines) - 1:
                next_line = lines[i+1]
                if not next_line.strip().startswith('}'):
                    # Add closing brace
                    line = line.rstrip() + '}'
                    lines[i] = line
    
    return '\n'.join(lines)

def fix_indentation_errors(content: str, file_path: str) -> str:
    """Fix indentation errors."""
    lines = content.split('\n')
    
    for i, line in enumerate(lines):
        stripped = line.lstrip()
        if not stripped:
            continue
        
        # Fix unexpected indent at module level
        if i == 0 and line.startswith('    ') and not stripped.startswith('#'):
            lines[i] = stripped
        
        # Fix unexpected indent after imports
        elif (i > 0 and 
              lines[i-1].strip().startswith(('import ', 'from ')) and 
              line.startswith('    ') and 
              not stripped.startswith(('#', '"""', "'''"))):
            lines[i] = stripped
    
    return '\n'.join(lines)

def fix_import_issues(content: str, file_path: str) -> str:
    """Fix import issues."""
    lines = content.split('\n')
    
    # Add missing imports based on usage
    import_additions = []
    
    # Check for common undefined imports
    if 'os' in content and 'import os' not in content:
        import_additions.append('import os')
    if 'sys' in content and 'import sys' not in content:
        import_additions.append('import sys')
    if 'time' in content and 'import time' not in content:
        import_additions.append('import time')
    if 'threading' in content and 'import threading' not in content:
        import_additions.append('import threading')
    if 'queue' in content and 'import queue' not in content:
        import_additions.append('import queue')
    if 'subprocess' in content and 'import subprocess' not in content:
        import_additions.append('import subprocess')
    if 'shutil' in content and 'import shutil' not in content:
        import_additions.append('import shutil')
    if 'tempfile' in content and 'import tempfile' not in content:
        import_additions.append('import tempfile')
    if 're' in content and 'import re' not in content:
        import_additions.append('import re')
    if 'sqlite3' in content and 'import sqlite3' not in content:
        import_additions.append('import sqlite3')
    if 'json' in content and 'import json' not in content:
        import_additions.append('import json')
    if 'pathlib' in content and 'from pathlib import Path' not in content:
        import_additions.append('from pathlib import Path')
    if 'typing' in content and 'from typing' not in content:
        import_additions.append('from typing import Dict, List, Optional, Any, Union')
    if 'datetime' in content and 'from datetime' not in content:
        import_additions.append('from datetime import datetime, timedelta')
    if 'pytest' in content and 'import pytest' not in content:
        import_additions.append('import pytest')
    if 'unittest.mock' in content or 'Mock' in content or 'MagicMock' in content or 'patch' in content:
        if 'from unittest.mock' not in content:
            import_additions.append('from unittest.mock import Mock, MagicMock, patch')
    if 'httpx' in content and 'import httpx' not in content:
        import_additions.append('import httpx')
    if 'readline' in content and 'import readline' not in content:
        import_additions.append('import readline')
    if 'atexit' in content and 'import atexit' not in content:
        import_additions.append('import atexit')
    if 'typer' in content and 'import typer' not in content:
        import_additions.append('import typer')
    if 'asyncio' in content and 'import asyncio' not in content:
        import_additions.append('import asyncio')
    if 'unittest' in content and 'import unittest' not in content:
        import_additions.append('import unittest')
    
    # Add imports for project modules based on file path
    if file_path.startswith('src/ai/providers/'):
        if 'BaseProvider' in content and 'from .base_provider import BaseProvider' not in content:
            import_additions.append('from .base_provider import BaseProvider')
        if 'BaseChatModel' in content and 'from .base_provider import BaseChatModel' not in content:
            import_additions.append('from .base_provider import BaseChatModel')
        if 'BaseEmbeddingModel' in content and 'from .base_provider import BaseEmbeddingModel' not in content:
            import_additions.append('from .base_provider import BaseEmbeddingModel')
        if 'BaseRerankModel' in content and 'from .base_provider import BaseRerankModel' not in content:
            import_additions.append('from .base_provider import BaseRerankModel')
    
    elif file_path.startswith('src/ai/'):
        if 'ModelAbstractionService' in content and 'from .service import ModelAbstractionService' not in content:
            import_additions.append('from .service import ModelAbstractionService')
        if 'AIResponse' in content and 'from .service import AIResponse' not in content:
            import_additions.append('from .service import AIResponse')
        if 'Message' in content and 'from .service import Message' not in content:
            import_additions.append('from .service import Message')
    
    elif file_path.startswith('src/cli/'):
        if 'CommandPalette' in content and 'from .command_palette import CommandPalette' not in content:
            import_additions.append('from .command_palette import CommandPalette')
        if 'app' in content and 'from .main import app' not in content:
            import_additions.append('from .main import app')
        if 'CLIInterfaceImpl' in content and 'from .interface import CLIInterfaceImpl' not in content:
            import_additions.append('from .interface import CLIInterfaceImpl')
        if 'Console' in content and 'from rich.console import Console' not in content:
            import_additions.append('from rich.console import Console')
        if 'Table' in content and 'from rich.table import Table' not in content:
            import_additions.append('from rich.table import Table')
        if 'Panel' in content and 'from rich.panel import Panel' not in content:
            import_additions.append('from rich.panel import Panel')
    
    elif file_path.startswith('src/core/'):
        if 'CatalystAgent' in content and 'CatalystAgentImpl' in content and 'from .catalyst_agent import CatalystAgentImpl' not in content:
            import_additions.append('from .catalyst_agent import CatalystAgentImpl')
        if 'SQLiteKnowledgeNavigator' in content and 'from .knowledge_navigator import SQLiteKnowledgeNavigator' not in content:
            import_additions.append('from .knowledge_navigator import SQLiteKnowledgeNavigator')
        if 'DatabaseManager' in content and 'from ..data.database_manager import DatabaseManager' not in content:
            import_additions.append('from ..data.database_manager import DatabaseManager')
        if 'VectorStorage' in content and 'from ..data.vector_storage import VectorStorage' not in content:
            import_additions.append('from ..data.vector_storage import VectorStorage')
        if 'ChallengeEngine' in content and 'ChallengeEngineImpl' in content and 'from .challenge_engine import ChallengeEngineImpl' not in content:
            import_additions.append('from .challenge_engine import ChallengeEngineImpl')
        if 'Concept' in content and 'from ..data.models.concept import Concept' not in content:
            import_additions.append('from ..data.models.concept import Concept')
        if 'ConversationContext' in content and 'from .enhanced_state_manager import ConversationContext' not in content:
            import_additions.append('from .enhanced_state_manager import ConversationContext')
        if 'IntentClassification' in content and 'from .enhanced_state_manager import IntentClassification' not in content:
            import_additions.append('from .enhanced_state_manager import IntentClassification')
        if 'CompetencyProfile' in content and 'from .analytics_dashboard import CompetencyProfile' not in content:
            import_additions.append('from .analytics_dashboard import CompetencyProfile')
        if 'TrendAnalyzer' in content and 'from .trend_analyzer import TrendAnalyzer' not in content:
            import_additions.append('from .trend_analyzer import TrendAnalyzer')
        if 'TrendData' in content and 'from .trend_analyzer import TrendData' not in content:
            import_additions.append('from .trend_analyzer import TrendData')
        if 'TimePeriod' in content and 'from .trend_analyzer import TimePeriod' not in content:
            import_additions.append('from .trend_analyzer import TimePeriod')
        if 'WeakAreaIdentifier' in content and 'from .weak_area_identifier import WeakAreaIdentifier' not in content:
            import_additions.append('from .weak_area_identifier import WeakAreaIdentifier')
        if 'ExportService' in content and 'from .export_service import ExportService' not in content:
            import_additions.append('from .export_service import ExportService')
        if 'TokenUsageAnalytics' in content and 'from .token_usage_analytics import TokenUsageAnalytics' not in content:
            import_additions.append('from .token_usage_analytics import TokenUsageAnalytics')
        if 'UserProgress' in content and 'from .state_manager import UserProgress' not in content:
            import_additions.append('from .state_manager import UserProgress')
        if 'KnowledgeMap' in content and 'from .knowledge_navigator import KnowledgeMap' not in content:
            import_additions.append('from .knowledge_navigator import KnowledgeMap')
        if 'ApplicationState' in content and 'from .enhanced_state_manager import ApplicationState' not in content:
            import_additions.append('from .enhanced_state_manager import ApplicationState')
        if 'StartupGuide' in content and 'from .startup_guide import StartupGuide' not in content:
            import_additions.append('from .startup_guide import StartupGuide')
        if 'StateManager' in content and 'from .state_manager import StateManager' not in content:
            import_additions.append('from .state_manager import StateManager')
        if 'CheckpointManagerImpl' in content and 'from .checkpoint_manager import CheckpointManagerImpl' not in content:
            import_additions.append('from .checkpoint_manager import CheckpointManagerImpl')
        if 'SystemCommandsHandlerImpl' in content and 'from .system_commands_handler import SystemCommandsHandlerImpl' not in content:
            import_additions.append('from .system_commands_handler import SystemCommandsHandlerImpl')
        if 'BasicAnalyticsDashboard' in content and 'from .basic_analytics_dashboard import BasicAnalyticsDashboard' not in content:
            import_additions.append('from .basic_analytics_dashboard import BasicAnalyticsDashboard')
    
    elif file_path.startswith('src/data/'):
        if 'VectorStorage' in content and 'from .vector_storage import VectorStorage' not in content:
            import_additions.append('from .vector_storage import VectorStorage')
        if 'DatabaseManager' in content and 'from .database_manager import DatabaseManager' not in content:
            import_additions.append('from .database_manager import DatabaseManager')
    
    elif file_path.startswith('src/utils/'):
        if 'WorkspaceManager' in content and 'from .workspace_manager import WorkspaceManager' not in content:
            import_additions.append('from .workspace_manager import WorkspaceManager')
        if 'PreferencesManager' in content and 'from .preferences_manager import PreferencesManager' not in content:
            import_additions.append('from .preferences_manager import PreferencesManager')
    
    elif file_path.startswith('tests/'):
        # Add imports for test modules
        if 'CatalystAgentImpl' in content and 'from src.core.catalyst_agent import CatalystAgentImpl' not in content:
            import_additions.append('from src.core.catalyst_agent import CatalystAgentImpl')
        if 'ModelAbstractionService' in content and 'from src.ai.service import ModelAbstractionService' not in content:
            import_additions.append('from src.ai.service import ModelAbstractionService')
        if 'AIResponse' in content and 'from src.ai.service import AIResponse' not in content:
            import_additions.append('from src.ai.service import AIResponse')
        if 'Message' in content and 'from src.ai.service import Message' not in content:
            import_additions.append('from src.ai.service import Message')
        if 'ConversationContext' in content and 'from src.core.enhanced_state_manager import ConversationContext' not in content:
            import_additions.append('from src.core.enhanced_state_manager import ConversationContext')
        if 'IntentClassification' in content and 'from src.core.enhanced_state_manager import IntentClassification' not in content:
            import_additions.append('from src.core.enhanced_state_manager import IntentClassification')
        if 'ChallengeEngineImpl' in content and 'from src.core.challenge_engine import ChallengeEngineImpl' not in content:
            import_additions.append('from src.core.challenge_engine import ChallengeEngineImpl')
        if 'Concept' in content and 'from src.data.models.concept import Concept' not in content:
            import_additions.append('from src.data.models.concept import Concept')
        if 'SQLiteKnowledgeNavigator' in content and 'from src.core.knowledge_navigator import SQLiteKnowledgeNavigator' not in content:
            import_additions.append('from src.core.knowledge_navigator import SQLiteKnowledgeNavigator')
        if 'DatabaseManager' in content and 'from src.data.database_manager import DatabaseManager' not in content:
            import_additions.append('from src.data.database_manager import DatabaseManager')
        if 'VectorStorage' in content and 'from src.data.vector_storage import VectorStorage' not in content:
            import_additions.append('from src.data.vector_storage import VectorStorage')
        if 'WorkspaceManager' in content and 'from src.utils.workspace_manager import WorkspaceManager' not in content:
            import_additions.append('from src.utils.workspace_manager import WorkspaceManager')
        if 'PreferencesManager' in content and 'from src.utils.preferences_manager import PreferencesManager' not in content:
            import_additions.append('from src.utils.preferences_manager import PreferencesManager')
        if 'CompetencyProfile' in content and 'from src.core.analytics_dashboard import CompetencyProfile' not in content:
            import_additions.append('from src.core.analytics_dashboard import CompetencyProfile')
        if 'TrendAnalyzer' in content and 'from src.core.trend_analyzer import TrendAnalyzer' not in content:
            import_additions.append('from src.core.trend_analyzer import TrendAnalyzer')
        if 'TrendData' in content and 'from src.core.trend_analyzer import TrendData' not in content:
            import_additions.append('from src.core.trend_analyzer import TrendData')
        if 'TimePeriod' in content and 'from src.core.trend_analyzer import TimePeriod' not in content:
            import_additions.append('from src.core.trend_analyzer import TimePeriod')
        if 'WeakAreaIdentifier' in content and 'from src.core.weak_area_identifier import WeakAreaIdentifier' not in content:
            import_additions.append('from src.core.weak_area_identifier import WeakAreaIdentifier')
        if 'ExportService' in content and 'from src.core.export_service import ExportService' not in content:
            import_additions.append('from src.core.export_service import ExportService')
        if 'TokenUsageAnalytics' in content and 'from src.core.token_usage_analytics import TokenUsageAnalytics' not in content:
            import_additions.append('from src.core.token_usage_analytics import TokenUsageAnalytics')
        if 'UserProgress' in content and 'from src.core.state_manager import UserProgress' not in content:
            import_additions.append('from src.core.state_manager import UserProgress')
        if 'KnowledgeMap' in content and 'from src.core.knowledge_navigator import KnowledgeMap' not in content:
            import_additions.append('from src.core.knowledge_navigator import KnowledgeMap')
        if 'CommandPalette' in content and 'from src.cli.command_palette import CommandPalette' not in content:
            import_additions.append('from src.cli.command_palette import CommandPalette')
        if 'app' in content and 'from src.cli.main import app' not in content:
            import_additions.append('from src.cli.main import app')
        if 'CLIInterfaceImpl' in content and 'from src.cli.interface import CLIInterfaceImpl' not in content:
            import_additions.append('from src.cli.interface import CLIInterfaceImpl')
        if 'AsyncMock' in content and 'from unittest.mock import AsyncMock' not in content:
            import_additions.append('from unittest.mock import AsyncMock')
        if 'ConceptBuilder' in content and 'from src.core.concept_builder import ConceptBuilder' not in content:
            import_additions.append('from src.core.concept_builder import ConceptBuilder')
        if 'StartupGuide' in content and 'from src.core.startup_guide import StartupGuide' not in content:
            import_additions.append('from src.core.startup_guide import StartupGuide')
        if 'ApplicationState' in content and 'from src.core.enhanced_state_manager import ApplicationState' not in content:
            import_additions.append('from src.core.enhanced_state_manager import ApplicationState')
        if 'CheckpointManagerImpl' in content and 'from src.core.checkpoint_manager import CheckpointManagerImpl' not in content:
            import_additions.append('from src.core.checkpoint_manager import CheckpointManagerImpl')
        if 'SystemCommandsHandlerImpl' in content and 'from src.core.system_commands_handler import SystemCommandsHandlerImpl' not in content:
            import_additions.append('from src.core.system_commands_handler import SystemCommandsHandlerImpl')
        if 'BasicAnalyticsDashboard' in content and 'from src.core.basic_analytics_dashboard import BasicAnalyticsDashboard' not in content:
            import_additions.append('from src.core.basic_analytics_dashboard import BasicAnalyticsDashboard')
    
    # Insert imports at the beginning
    if import_additions:
        # Find where to insert imports
        insert_pos = 0
        for i, line in enumerate(lines):
            if line.strip().startswith(('import ', 'from ')):
                insert_pos = i + 1
            elif line.strip() and not line.strip().startswith(('import ', 'from ', '#', '"""', "'''")):
                break
        
        # Insert new imports
        for imp in import_additions:
            lines.insert(insert_pos, imp)
            insert_pos += 1
    
    return '\n'.join(lines)

def fix_blank_line_issues(content: str, file_path: str) -> str:
    """Fix blank line issues."""
    lines = content.split('\n')
    fixed_lines = []
    
    i = 0
    while i < len(lines):
        line = lines[i]
        
        # Count consecutive blank lines
        blank_count = 0
        while i < len(lines) and not lines[i].strip():
            blank_count += 1
            i += 1
        
        # Fix too many blank lines
        if blank_count > 2:
            # Keep at most 2 blank lines
            for _ in range(min(2, blank_count)):
                fixed_lines.append('')
        elif blank_count > 0:
            # Add appropriate number of blank lines
            for _ in range(blank_count):
                fixed_lines.append('')
        
        # Add non-blank line
        if i < len(lines):
            fixed_lines.append(lines[i])
            i += 1
    
    # Fix missing blank lines after imports
    in_imports = False
    for i in range(len(fixed_lines)):
        if fixed_lines[i].strip().startswith(('import ', 'from ')):
            in_imports = True
        elif in_imports and fixed_lines[i].strip() and not fixed_lines[i].strip().startswith('#'):
            # Add blank line after imports if missing
            if i > 0 and fixed_lines[i-1].strip():
                fixed_lines.insert(i, '')
                i += 1
            in_imports = False
    
    # Fix missing blank lines after function/class definitions
    for i in range(len(fixed_lines) - 1):
        if (fixed_lines[i].strip().startswith(('def ', 'class ')) and 
            fixed_lines[i+1].strip() and 
            not fixed_lines[i+1].strip().startswith('#') and
            i < len(fixed_lines) - 2 and
            fixed_lines[i+2].strip()):
            # Add blank line
            fixed_lines.insert(i+1, '')
            break
    
    return '\n'.join(fixed_lines)

def fix_undefined_names(content: str, file_path: str) -> str:
    """Fix undefined name issues."""
    lines = content.split('\n')
    
    # Add type annotations for function parameters
    for i, line in enumerate(lines):
        if 'def ' in line and '(' in line and ')' in line:
            # Simple function definition
            if '->' not in line and ':' in line:
                # Add return type annotation
                line = line.replace(':', ' -> None:')
                lines[i] = line
    
    return '\n'.join(lines)

def fix_unused_imports(content: str, file_path: str) -> str:
    """Fix unused imports."""
    lines = content.split('\n')
    
    # Remove unused imports
    for i, line in enumerate(lines):
        if line.strip().startswith('import re') and 're.' not in content and ' re' not in content:
            lines[i] = '# ' + line
        elif line.strip().startswith('import os') and 'os.' not in content and ' os' not in content:
            lines[i] = '# ' + line
        elif line.strip().startswith('import sys') and 'sys.' not in content and ' sys' not in content:
            lines[i] = '# ' + line
        elif line.strip().startswith('import time') and 'time.' not in content and ' time' not in content:
            lines[i] = '# ' + line
        elif line.strip().startswith('import json') and 'json.' not in content and ' json' not in content:
            lines[i] = '# ' + line
        elif line.strip().startswith('import threading') and 'threading.' not in content and ' threading' not in content:
            lines[i] = '# ' + line
        elif line.strip().startswith('import queue') and 'queue.' not in content and ' queue' not in content:
            lines[i] = '# ' + line
        elif line.strip().startswith('import subprocess') and 'subprocess.' not in content and ' subprocess' not in content:
            lines[i] = '# ' + line
        elif line.strip().startswith('import shutil') and 'shutil.' not in content and ' shutil' not in content:
            lines[i] = '# ' + line
        elif line.strip().startswith('import tempfile') and 'tempfile.' not in content and ' tempfile' not in content:
            lines[i] = '# ' + line
        elif line.strip().startswith('from unittest.mock import') and 'Mock' not in content and 'MagicMock' not in content and 'patch' not in content:
            lines[i] = '# ' + line
    
    return '\n'.join(lines)

def fix_other_issues(content: str, file_path: str) -> str:
    """Fix other common issues."""
    lines = content.split('\n')
    
    for i, line in enumerate(lines):
        # Fix bare except
        if line.strip() == 'except:':
            lines[i] = line.replace('except:', 'except Exception:')
        
        # Fix inline comment spacing
        if '#' in line and not line.strip().startswith('#'):
            before_comment = line[:line.find('#')]
            comment = line[line.find('#'):]
            if not before_comment.endswith('  '):
                lines[i] = before_comment.rstrip() + '  ' + comment
        
        # Fix unused variables (simple cases)
        if 'has_content = ' in line and 'has_content' not in content[line.find(line) + len(line):]:
            lines[i] = line.replace('has_content = ', '# has_content = ')
        if 'has_challenge = ' in line and 'has_challenge' not in content[line.find(line) + len(line):]:
            lines[i] = line.replace('has_challenge = ', '# has_challenge = ')
        if 'has_context = ' in line and 'has_context' not in content[line.find(line) + len(line):]:
            lines[i] = line.replace('has_context = ', '# has_context = ')
        if 'map_found = ' in line and 'map_found' not in content[line.find(line) + len(line):]:
            lines[i] = line.replace('map_found = ', '# map_found = ')
        if 'welcome_back = ' in line and 'welcome_back' not in content[line.find(line) + len(line):]:
            lines[i] = line.replace('welcome_back = ', '# welcome_back = ')
        if 'suggestions_found = ' in line and 'suggestions_found' not in content[line.find(line) + len(line):]:
            lines[i] = line.replace('suggestions_found = ', '# suggestions_found = ')
        if 'db_path = ' in line and 'db_path' not in content[line.find(line) + len(line):]:
            lines[i] = line.replace('db_path = ', '# db_path = ')
        if 'db_manager = ' in line and 'db_manager' not in content[line.find(line) + len(line):]:
            lines[i] = line.replace('db_manager = ', '# db_manager = ')
        if 'vector_storage = ' in line and 'vector_storage' not in content[line.find(line) + len(line):]:
            lines[i] = line.replace('vector_storage = ', '# vector_storage = ')
        if 'challenge_engine = ' in line and 'challenge_engine' not in content[line.find(line) + len(line):]:
            lines[i] = line.replace('challenge_engine = ', '# challenge_engine = ')
        if 'db_mgr = ' in line and 'db_mgr' not in content[line.find(line) + len(line):]:
            lines[i] = line.replace('db_mgr = ', '# db_mgr = ')
        if 'prefs_mgr = ' in line and 'prefs_mgr' not in content[line.find(line) + len(line):]:
            lines[i] = line.replace('prefs_mgr = ', '# prefs_mgr = ')
    
    return '\n'.join(lines)

def main():
    """Main function."""
    # Find all Python files in src/ and tests/
    python_files = []
    for root, dirs, files in os.walk('src/'):
        for file in files:
            if file.endswith('.py'):
                python_files.append(os.path.join(root, file))
    
    for root, dirs, files in os.walk('tests/'):
        for file in files:
            if file.endswith('.py'):
                python_files.append(os.path.join(root, file))
    
    # Fix each file
    fixed_count = 0
    for file_path in python_files:
        if fix_file(file_path):
            print(f"Fixed: {file_path}")
            fixed_count += 1
    
    print(f"\nDone fixing {fixed_count} files!")

if __name__ == '__main__':
    main()