#!/usr/bin/env python3
""""
Fix all remaining flake8 issues in the project.
""""

import os
import re
import ast
from typing import List, Tuple

def fix_file(file_path: str) -> bool:
    """Fix flake8 issues in a single file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        original_content = content

        # Fix syntax errors (unterminated strings)
        content = fix_unterminated_strings(content, file_path)

        # Fix indentation errors
        content = fix_indentation_errors(content, file_path)

        # Fix import issues
        content = fix_import_issues(content, file_path)

        # Fix blank line issues
        content = fix_blank_line_issues(content, file_path)

        # Fix undefined name issues for imports
        content = fix_undefined_names(content, file_path)

        # Fix line length issues
        content = fix_line_length(content, file_path)

        # Fix other common issues
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

def fix_unterminated_strings(content: str, file_path: str) -> str:
    """Fix unterminated string literals."""
    lines = content.split('\n')

    for i, line in enumerate(lines):
        # Skip comments
        if line.strip().startswith('  #'):
            continue

        # Count quotes
        single_quotes = line.count("'")'
        double_quotes = line.count('"')"

        # Check for odd number of quotes
        if single_quotes % 2 == 1 or double_quotes % 2 == 1:
            # Try to fix by adding missing quote at end
            if single_quotes % 2 == 1 and double_quotes % 2 == 0:
                if "'" in line:'
                    line = line.rstrip() + "'"'
            elif double_quotes % 2 == 1 and single_quotes % 2 == 0:
                if '"' in line:"
                    line = line.rstrip() + '"'"

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
        if i == 0 and line.startswith('    ') and not stripped.startswith('  #'):
            lines[i] = stripped
        # Fix unexpected indent after imports
        elif (i > 0 and 
              lines[i-1].strip().startswith(('import ', 'from ')) and 
              line.startswith('    ') and 
              not stripped.startswith(('  #', '"""', "'''"))):
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
    if 'pathlib' in content and 'import pathlib' not in content:
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

    # Add imports for project modules
    if 'BaseProvider' in content and 'from .base_provider import BaseProvider' not in content:
        import_additions.append('from .base_provider import BaseProvider')
    if 'BaseChatModel' in content and 'from .base_provider import BaseChatModel' not in content:
        import_additions.append('from .base_provider import BaseChatModel')
    if 'BaseEmbeddingModel' in content and 'from .base_provider import BaseEmbeddingModel' not in content:
        import_additions.append('from .base_provider import BaseEmbeddingModel')
    if 'BaseRerankModel' in content and 'from .base_provider import BaseRerankModel' not in content:
        import_additions.append('from .base_provider import BaseRerankModel')

    # Add imports for test modules
    if 'CliRunner' in content and 'from click.testing' not in content:
        import_additions.append('from click.testing import CliRunner')
    if 'AsyncMock' in content and 'from unittest.mock' in content and 'AsyncMock' not in content:
        import_additions.append('from unittest.mock import AsyncMock')

    # Insert imports at the beginning
    if import_additions:
        # Find where to insert imports
        insert_pos = 0
        for i, line in enumerate(lines):
            if line.strip().startswith(('import ', 'from ')):
                insert_pos = i + 1
            elif line.strip() and not line.strip().startswith(('import ', 'from ', '  #', '"""', "'''")):
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
        elif in_imports and fixed_lines[i].strip() and not fixed_lines[i].strip().startswith('  #'):
            # Add blank line after imports if missing
            if i > 0 and fixed_lines[i-1].strip():
                fixed_lines.insert(i, '')
                i += 1
            in_imports = False

    return '\n'.join(fixed_lines)

def fix_undefined_names(content: str, file_path: str) -> str:
    """Fix undefined name issues for project modules."""
    lines = content.split('\n')

    # Add imports for project modules based on file path
    if file_path.startswith('src/ai/providers/'):
        if 'BaseProvider' in content and 'from .base_provider import BaseProvider' not in content:
            lines.insert(0, 'from .base_provider import BaseProvider')
        if 'BaseChatModel' in content and 'from .base_provider import BaseChatModel' not in content:
            lines.insert(0, 'from .base_provider import BaseChatModel')
        if 'BaseEmbeddingModel' in content and 'from .base_provider import BaseEmbeddingModel' not in content:
            lines.insert(0, 'from .base_provider import BaseEmbeddingModel')
        if 'BaseRerankModel' in content and 'from .base_provider import BaseRerankModel' not in content:
            lines.insert(0, 'from .base_provider import BaseRerankModel')

    elif file_path.startswith('src/ai/'):
        if 'ModelAbstractionService' in content and 'from .service import ModelAbstractionService' not in content:
            lines.insert(0, 'from .service import ModelAbstractionService')
        if 'AIResponse' in content and 'from .service import AIResponse' not in content:
            lines.insert(0, 'from .service import AIResponse')
        if 'Message' in content and 'from .service import Message' not in content:
            lines.insert(0, 'from .service import Message')

    elif file_path.startswith('src/cli/'):
        if 'CommandPalette' in content and 'from .command_palette import CommandPalette' not in content:
            lines.insert(0, 'from .command_palette import CommandPalette')
        if 'app' in content and 'from .main import app' not in content:
            lines.insert(0, 'from .main import app')

    elif file_path.startswith('src/core/'):
        if 'CatalystAgent' in content and \
    'CatalystAgentImpl' in content and \
    'from .catalyst_agent import CatalystAgentImpl' not in content:
            lines.insert(0, 'from .catalyst_agent import CatalystAgentImpl')
        if 'SQLiteKnowledgeNavigator' in content and \
    'from .knowledge_navigator import SQLiteKnowledgeNavigator' not in content:
            lines.insert(0, 'from .knowledge_navigator import SQLiteKnowledgeNavigator')
        if 'DatabaseManager' in content and 'from ..data.database_manager import DatabaseManager' not in content:
            lines.insert(0, 'from ..data.database_manager import DatabaseManager')
        if 'VectorStorage' in content and 'from ..data.vector_storage import VectorStorage' not in content:
            lines.insert(0, 'from ..data.vector_storage import VectorStorage')
        if 'ChallengeEngine' in content and \
    'ChallengeEngineImpl' in content and \
    'from .challenge_engine import ChallengeEngineImpl' not in content:
            lines.insert(0, 'from .challenge_engine import ChallengeEngineImpl')
        if 'Concept' in content and 'from ..data.models.concept import Concept' not in content:
            lines.insert(0, 'from ..data.models.concept import Concept')
        if 'ConversationContext' in content and \
    'from .enhanced_state_manager import ConversationContext' not in content:
            lines.insert(0, 'from .enhanced_state_manager import ConversationContext')
        if 'IntentClassification' in content and \
    'from .enhanced_state_manager import IntentClassification' not in content:
            lines.insert(0, 'from .enhanced_state_manager import IntentClassification')
        if 'CompetencyProfile' in content and 'from .analytics_dashboard import CompetencyProfile' not in content:
            lines.insert(0, 'from .analytics_dashboard import CompetencyProfile')
        if 'TrendAnalyzer' in content and 'from .trend_analyzer import TrendAnalyzer' not in content:
            lines.insert(0, 'from .trend_analyzer import TrendAnalyzer')
        if 'TrendData' in content and 'from .trend_analyzer import TrendData' not in content:
            lines.insert(0, 'from .trend_analyzer import TrendData')
        if 'TimePeriod' in content and 'from .trend_analyzer import TimePeriod' not in content:
            lines.insert(0, 'from .trend_analyzer import TimePeriod')
        if 'WeakAreaIdentifier' in content and 'from .weak_area_identifier import WeakAreaIdentifier' not in content:
            lines.insert(0, 'from .weak_area_identifier import WeakAreaIdentifier')
        if 'ExportService' in content and 'from .export_service import ExportService' not in content:
            lines.insert(0, 'from .export_service import ExportService')
        if 'TokenUsageAnalytics' in content and 'from .token_usage_analytics import TokenUsageAnalytics' not in content:
            lines.insert(0, 'from .token_usage_analytics import TokenUsageAnalytics')
        if 'UserProgress' in content and 'from .state_manager import UserProgress' not in content:
            lines.insert(0, 'from .state_manager import UserProgress')
        if 'KnowledgeMap' in content and 'from .knowledge_navigator import KnowledgeMap' not in content:
            lines.insert(0, 'from .knowledge_navigator import KnowledgeMap')

    elif file_path.startswith('src/data/'):
        if 'VectorStorage' in content and 'from .vector_storage import VectorStorage' not in content:
            lines.insert(0, 'from .vector_storage import VectorStorage')
        if 'DatabaseManager' in content and 'from .database_manager import DatabaseManager' not in content:
            lines.insert(0, 'from .database_manager import DatabaseManager')

    elif file_path.startswith('src/utils/'):
        if 'WorkspaceManager' in content and 'from .workspace_manager import WorkspaceManager' not in content:
            lines.insert(0, 'from .workspace_manager import WorkspaceManager')
        if 'PreferencesManager' in content and 'from .preferences_manager import PreferencesManager' not in content:
            lines.insert(0, 'from .preferences_manager import PreferencesManager')

    elif file_path.startswith('tests/'):
        # Add imports for test modules
        if 'CatalystAgentImpl' in content and 'from src.core.catalyst_agent import CatalystAgentImpl' not in content:
            lines.insert(0, 'from src.core.catalyst_agent import CatalystAgentImpl')
        if 'ModelAbstractionService' in content and 'from src.ai.service import ModelAbstractionService' not in content:
            lines.insert(0, 'from src.ai.service import ModelAbstractionService')
        if 'AIResponse' in content and 'from src.ai.service import AIResponse' not in content:
            lines.insert(0, 'from src.ai.service import AIResponse')
        if 'Message' in content and 'from src.ai.service import Message' not in content:
            lines.insert(0, 'from src.ai.service import Message')
        if 'ConversationContext' in content and \
    'from src.core.enhanced_state_manager import ConversationContext' not in content:
            lines.insert(0, 'from src.core.enhanced_state_manager import ConversationContext')
        if 'IntentClassification' in content and \
    'from src.core.enhanced_state_manager import IntentClassification' not in content:
            lines.insert(0, 'from src.core.enhanced_state_manager import IntentClassification')
        if 'ChallengeEngineImpl' in content and \
    'from src.core.challenge_engine import ChallengeEngineImpl' not in content:
            lines.insert(0, 'from src.core.challenge_engine import ChallengeEngineImpl')
        if 'Concept' in content and 'from src.data.models.concept import Concept' not in content:
            lines.insert(0, 'from src.data.models.concept import Concept')
        if 'SQLiteKnowledgeNavigator' in content and \
    'from src.core.knowledge_navigator import SQLiteKnowledgeNavigator' not in content:
            lines.insert(0, 'from src.core.knowledge_navigator import SQLiteKnowledgeNavigator')
        if 'DatabaseManager' in content and 'from src.data.database_manager import DatabaseManager' not in content:
            lines.insert(0, 'from src.data.database_manager import DatabaseManager')
        if 'VectorStorage' in content and 'from src.data.vector_storage import VectorStorage' not in content:
            lines.insert(0, 'from src.data.vector_storage import VectorStorage')
        if 'WorkspaceManager' in content and 'from src.utils.workspace_manager import WorkspaceManager' not in content:
            lines.insert(0, 'from src.utils.workspace_manager import WorkspaceManager')
        if 'PreferencesManager' in content and \
    'from src.utils.preferences_manager import PreferencesManager' not in content:
            lines.insert(0, 'from src.utils.preferences_manager import PreferencesManager')
        if 'CompetencyProfile' in content and \
    'from src.core.analytics_dashboard import CompetencyProfile' not in content:
            lines.insert(0, 'from src.core.analytics_dashboard import CompetencyProfile')
        if 'TrendAnalyzer' in content and 'from src.core.trend_analyzer import TrendAnalyzer' not in content:
            lines.insert(0, 'from src.core.trend_analyzer import TrendAnalyzer')
        if 'TrendData' in content and 'from src.core.trend_analyzer import TrendData' not in content:
            lines.insert(0, 'from src.core.trend_analyzer import TrendData')
        if 'TimePeriod' in content and 'from src.core.trend_analyzer import TimePeriod' not in content:
            lines.insert(0, 'from src.core.trend_analyzer import TimePeriod')
        if 'WeakAreaIdentifier' in content and \
    'from src.core.weak_area_identifier import WeakAreaIdentifier' not in content:
            lines.insert(0, 'from src.core.weak_area_identifier import WeakAreaIdentifier')
        if 'ExportService' in content and 'from src.core.export_service import ExportService' not in content:
            lines.insert(0, 'from src.core.export_service import ExportService')
        if 'TokenUsageAnalytics' in content and \
    'from src.core.token_usage_analytics import TokenUsageAnalytics' not in content:
            lines.insert(0, 'from src.core.token_usage_analytics import TokenUsageAnalytics')
        if 'UserProgress' in content and 'from src.core.state_manager import UserProgress' not in content:
            lines.insert(0, 'from src.core.state_manager import UserProgress')
        if 'KnowledgeMap' in content and 'from src.core.knowledge_navigator import KnowledgeMap' not in content:
            lines.insert(0, 'from src.core.knowledge_navigator import KnowledgeMap')
        if 'CommandPalette' in content and 'from src.cli.command_palette import CommandPalette' not in content:
            lines.insert(0, 'from src.cli.command_palette import CommandPalette')
        if 'app' in content and 'from src.cli.main import app' not in content:
            lines.insert(0, 'from src.cli.main import app')

    return '\n'.join(lines)

def fix_line_length(content: str, file_path: str) -> str:
    """Fix line length issues."""
    lines = content.split('\n')

    for i, line in enumerate(lines):
        if len(line) > 120:
            # Try to break long lines
            if '(' in line and ')' in line:
                # Function call or definition
                lines[i] = break_long_line(line)
            elif ' and ' in line or ' or ' in line:
                # Logical expression
                lines[i] = break_long_line(line)

    return '\n'.join(lines)

def break_long_line(line: str) -> str:
    """Break a long line into multiple lines."""
    # Simple implementation - just break at common operators
    if ' and ' in line:
        parts = line.split(' and ')
        return ' and \\\n    '.join(parts)
    elif ' or ' in line:
        parts = line.split(' or ')
        return ' or \\\n    '.join(parts)
    elif ', ' in line and '(' in line:
        # Function arguments
        before_paren = line[:line.find('(') + 1]
        after_paren = line[line.find('(') + 1:]
        args = after_paren.split(', ')
        if len(args) > 1:
            return before_paren + '\n        ' + ',\n        '.join(args)

    return line

def fix_other_issues(content: str, file_path: str) -> str:
    """Fix other common issues."""
    lines = content.split('\n')

    for i, line in enumerate(lines):
        # Fix bare except
        if line.strip() == 'except:':
            lines[i] = line.replace('except:', 'except Exception:')

        # Fix inline comment spacing
        if '  #' in line and not line.strip().startswith('#'):
            before_comment = line[:line.find('  #')]
            comment = line[line.find('  #'):]
            if not before_comment.endswith('  '):
                lines[i] = before_comment.rstrip() + '  ' + comment

        # Fix unused variables (simple cases)
        if 'has_content = ' in line and 'has_content' not in content[line.find(line) + len(line):]:
            lines[i] = line.replace('has_content = ', '  # has_content = ')
        if 'has_challenge = ' in line and 'has_challenge' not in content[line.find(line) + len(line):]:
            lines[i] = line.replace('has_challenge = ', '  # has_challenge = ')
        if 'has_context = ' in line and 'has_context' not in content[line.find(line) + len(line):]:
            lines[i] = line.replace('has_context = ', '  # has_context = ')
        if 'map_found = ' in line and 'map_found' not in content[line.find(line) + len(line):]:
            lines[i] = line.replace('map_found = ', '  # map_found = ')

    return '\n'.join(lines)

def main():
    """Main function."""
    # Find all Python files
    python_files = []
    for root, dirs, files in os.walk('.'):
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