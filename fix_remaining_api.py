#!/usr/bin/env python3
"""
Script to fix remaining pylint API mismatch issues in the learning_catalyst project
"""

import os
import re

def fix_ai_service_issues(file_path):
    """Fix AI service Message constructor calls"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Fix Message constructor in ai/service.py
        # From: Message(role="user", content="text", provider="openai", token_usage=...)
        # To: Message(role="user", content="text", usage=...)
        content = re.sub(
            r'Message\(\s*role="([^"]+)"\s*,\s*content="([^"]+)"\s*,\s*provider="([^"]+)"\s*,\s*token_usage=([^)]+)\)',
            r'Message(role="\1", content="\2", usage=\4)',
            content
        )
        
        content = re.sub(
            r'Message\(\s*role="([^"]+)"\s*,\s*content="([^"]+)"\s*,\s*provider="([^"]+)"\s*,\s*token_usage=([^)]+)\s*,\s*error=([^)]+)\)',
            r'Message(role="\1", content="\2", usage=\4, error=\5)',
            content
        )
        
        content = re.sub(
            r'Message\(\s*role="([^"]+)"\s*,\s*content="([^"]+)"\s*,\s*provider="([^"]+)"\s*,\s*error=([^)]+)\)',
            r'Message(role="\1", content="\2", error=\4)',
            content
        )
        
        # Fix Message constructor with missing provider parameter
        content = re.sub(
            r'Message\(\s*role="([^"]+)"\s*,\s*content="([^"]+)"\s*\)',
            r'Message(role="\1", content="\2")',
            content
        )
        
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        return False
    except Exception as e:
        print(f"Error fixing AI service issues in {file_path}: {e}")
        return False

def fix_base_provider_issues(file_path):
    """Fix base provider Message constructor calls"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Fix Message constructor in base_provider.py
        content = re.sub(
            r'Message\(\s*role="([^"]+)"\s*,\s*content="([^"]+)"\s*,\s*provider=([^,]+)\s*,\s*usage=([^)]+)\)',
            r'Message(role="\1", content="\2", usage=\4)',
            content
        )
        
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        return False
    except Exception as e:
        print(f"Error fixing base provider issues in {file_path}: {e}")
        return False

def fix_command_palette_issues(file_path):
    """Fix command palette Message import issues"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Fix Message import and usage
        content = re.sub(
            r'from src\.data\.models\.extended_models import Message',
            r'from src.data.models.extended_models import Message',
            content
        )
        
        # Fix Message constructor calls
        content = re.sub(
            r'Message\(\s*role="([^"]+)"\s*,\s*content="([^"]+)"\s*,\s*provider="([^"]+)"\s*,\s*token_usage=([^)]+)\)',
            r'Message(role="\1", content="\2", usage=\4)',
            content
        )
        
        content = re.sub(
            r'Message\(\s*role="([^"]+)"\s*,\s*content="([^"]+)"\s*,\s*provider="([^"]+)"\s*,\s*error=([^)]+)\)',
            r'Message(role="\1", content="\2", error=\4)',
            content
        )
        
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        return False
    except Exception as e:
        print(f"Error fixing command palette issues in {file_path}: {e}")
        return False

def fix_catalyst_agent_constructor(file_path):
    """Fix CatalystAgent constructor calls"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Fix CatalystAgent constructor calls
        # Add missing required parameters
        content = re.sub(
            r'CatalystAgentImpl\(\s*\)',
            r'CatalystAgentImpl(model_service=None, workspace_path=None)',
            content
        )
        
        content = re.sub(
            r'CatalystAgentImpl\(\s*db_manager=([^)]+)\s*\)',
            r'CatalystAgentImpl(model_service=None, workspace_path=None, db_manager=\1)',
            content
        )
        
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        return False
    except Exception as e:
        print(f"Error fixing CatalystAgent constructor in {file_path}: {e}")
        return False

def fix_all_concept_constructors(file_path):
    """Fix all Concept constructor calls"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Fix all Concept constructor calls
        # From: Concept(name="title", description="content", ...)
        # To: Concept(title="title", content="content", prerequisites=[], difficulty_level=1)
        content = re.sub(
            r'Concept\(\s*name="([^"]+)"\s*,\s*description="([^"]+)"[^)]*\)',
            r'Concept(title="\1", content="\2", prerequisites=[], difficulty_level=1)',
            content
        )
        
        # Fix more complex Concept constructors
        content = re.sub(
            r'Concept\(\s*name="([^"]+)"\s*,\s*description="([^"]+)"\s*,\s*relevance="([^"]+)"\s*,\s*session_id="([^"]+)"\s*,\s*mastery_level="([^"]+)"\s*\)',
            r'Concept(title="\1", content="\2", prerequisites=[], difficulty_level=1)',
            content
        )
        
        content = re.sub(
            r'Concept\(\s*name="([^"]+)"\s*,\s*description="([^"]+)"\s*,\s*relevance="([^"]+)"\s*,\s*session_id="([^"]+)"\s*\)',
            r'Concept(title="\1", content="\2", prerequisites=[], difficulty_level=1)',
            content
        )
        
        content = re.sub(
            r'Concept\(\s*name="([^"]+)"\s*,\s*description="([^"]+)"\s*,\s*relevance="([^"]+)"\s*,\s*session_id="([^"]+)"\s*,\s*source_path="([^"]+)"\s*,\s*parent_id="([^"]+)"\s*,\s*depth="([^"]+)"\s*\)',
            r'Concept(title="\1", content="\2", prerequisites=[], difficulty_level=1)',
            content
        )
        
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        return False
    except Exception as e:
        print(f"Error fixing Concept constructors in {file_path}: {e}")
        return False

def fix_session_constructors(file_path):
    """Fix Session constructor calls"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Fix Session constructor calls
        content = re.sub(
            r'Session\(\s*last_active_time=([^,]+)\s*,\s*id="([^"]+)"\s*\)',
            r'Session(id="\2")',
            content
        )
        
        # Fix Message constructor calls in Session context
        content = re.sub(
            r'Message\(\s*speaker="([^"]+)"\s*,\s*message="([^"]+)"\s*\)',
            r'Message(role="\1", content="\2")',
            content
        )
        
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        return False
    except Exception as e:
        print(f"Error fixing Session constructors in {file_path}: {e}")
        return False

def fix_usage_constructors(file_path):
    """Fix Usage constructor calls"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Fix Usage constructor calls
        content = re.sub(
            r'Usage\(\s*input_tokens=([^,]+)\s*,\s*output_tokens=([^)]+)\s*,\s*provider="([^"]+)"\s*\)',
            r'Usage(input_tokens=\1, output_tokens=\2)',
            content
        )
        
        content = re.sub(
            r'Usage\(\s*input_tokens=([^,]+)\s*,\s*output_tokens=([^)]+)\s*\)',
            r'Usage(input_tokens=\1, output_tokens=\2)',
            content
        )
        
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        return False
    except Exception as e:
        print(f"Error fixing Usage constructors in {file_path}: {e}")
        return False

def main():
    # Find all Python files in src/ and tests/ directories
    python_files = []
    for root, dirs, files in os.walk('src'):
        for file in files:
            if file.endswith('.py'):
                python_files.append(os.path.join(root, file))
    
    for root, dirs, files in os.walk('tests'):
        for file in files:
            if file.endswith('.py'):
                python_files.append(os.path.join(root, file))
    
    # Fix API issues
    total_fixed = 0
    for file_path in python_files:
        fixed = False
        
        if 'ai/service.py' in file_path and fix_ai_service_issues(file_path):
            fixed = True
            print(f"Fixed AI service issues in {file_path}")
        
        if 'base_provider.py' in file_path and fix_base_provider_issues(file_path):
            fixed = True
            print(f"Fixed base provider issues in {file_path}")
        
        if 'command_palette.py' in file_path and fix_command_palette_issues(file_path):
            fixed = True
            print(f"Fixed command palette issues in {file_path}")
        
        if fix_catalyst_agent_constructor(file_path):
            fixed = True
            print(f"Fixed CatalystAgent constructor in {file_path}")
        
        if fix_all_concept_constructors(file_path):
            fixed = True
            print(f"Fixed Concept constructors in {file_path}")
        
        if fix_session_constructors(file_path):
            fixed = True
            print(f"Fixed Session constructors in {file_path}")
        
        if fix_usage_constructors(file_path):
            fixed = True
            print(f"Fixed Usage constructors in {file_path}")
        
        if fixed:
            total_fixed += 1
    
    print(f"\nTotal files fixed: {total_fixed}")
    
    # Run pylint again to show remaining issues
    print("\nRunning pylint to show remaining issues:")
    os.system('./venv/bin/pylint src/ tests/ --disable=all --enable=E0602,E0601,E1101,E1120,E1121,E1123,E1124,E1129,E1130,E1131,E1132,E1133,E1134,E1135,E1136,E1137,E1138,E1139,E1140,E1141,E1142')

if __name__ == "__main__":
    main()