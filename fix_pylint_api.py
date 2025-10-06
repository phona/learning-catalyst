#!/usr/bin/env python3
"""
Script to fix remaining pylint API mismatch issues in the learning_catalyst project
"""

import os
import re

def fix_message_constructor(file_path):
    """Fix Message constructor calls"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Fix Message constructor calls to match the actual API
        # From: Message(role="user", content="text", provider="openai", token_usage=...)
        # To: Message(role="user", content="text", usage=...)
        content = re.sub(
            r'Message\(\s*role="([^"]+)"\s*,\s*content="([^"]+)"\s*,\s*provider="[^"]+"\s*,\s*token_usage=([^)]+)\)',
            r'Message(role="\1", content="\2", usage=\3)',
            content
        )
        
        content = re.sub(
            r'Message\(\s*role="([^"]+)"\s*,\s*content="([^"]+)"\s*,\s*provider="[^"]+"\s*,\s*error=([^)]+)\)',
            r'Message(role="\1", content="\2", error=\3)',
            content
        )
        
        # Fix Message constructor calls with missing usage parameter
        content = re.sub(
            r'Message\(\s*role="([^"]+)"\s*,\s*content="([^"]+)"\s*,\s*provider="[^"]+"\s*\)',
            r'Message(role="\1", content="\2")',
            content
        )
        
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        return False
    except Exception as e:
        print(f"Error fixing Message constructor in {file_path}: {e}")
        return False

def fix_concept_constructor(file_path):
    """Fix Concept constructor calls"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Fix Concept constructor calls
        # From: Concept(name="title", description="content", ...)
        # To: Concept(title="title", content="content", ...)
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
        print(f"Error fixing Concept constructor in {file_path}: {e}")
        return False

def fix_checkpoint_manager_calls(file_path):
    """Fix CheckpointManager method calls"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Fix save_checkpoint method calls
        content = re.sub(
            r'\.save_checkpoint\(',
            r'.create_checkpoint(',
            content
        )
        
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        return False
    except Exception as e:
        print(f"Error fixing CheckpointManager calls in {file_path}: {e}")
        return False

def fix_session_constructor(file_path):
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
        print(f"Error fixing Session constructor in {file_path}: {e}")
        return False

def fix_database_calls(file_path):
    """Fix database method calls"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Fix database method calls
        content = re.sub(
            r'\.get_record\(\s*id=([^)]+)\s*\)',
            r'.get_record(record_id=\1)',
            content
        )
        
        content = re.sub(
            r'\.get_record\(\s*\)',
            r'.get_record(record_id=None)',
            content
        )
        
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        return False
    except Exception as e:
        print(f"Error fixing database calls in {file_path}: {e}")
        return False

def fix_catalyst_agent_calls(file_path):
    """Fix CatalystAgent method calls"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Fix method calls that don't exist
        content = re.sub(
            r'\.generate_welcome_message\(',
            r'.generate_response(',
            content
        )
        
        content = re.sub(
            r'\.provide_resumption_suggestion\(',
            r'.generate_response(',
            content
        )
        
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        return False
    except Exception as e:
        print(f"Error fixing CatalystAgent calls in {file_path}: {e}")
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
        
        if fix_message_constructor(file_path):
            fixed = True
            print(f"Fixed Message constructor in {file_path}")
        
        if fix_concept_constructor(file_path):
            fixed = True
            print(f"Fixed Concept constructor in {file_path}")
        
        if fix_checkpoint_manager_calls(file_path):
            fixed = True
            print(f"Fixed CheckpointManager calls in {file_path}")
        
        if fix_session_constructor(file_path):
            fixed = True
            print(f"Fixed Session constructor in {file_path}")
        
        if fix_database_calls(file_path):
            fixed = True
            print(f"Fixed database calls in {file_path}")
        
        if fix_catalyst_agent_calls(file_path):
            fixed = True
            print(f"Fixed CatalystAgent calls in {file_path}")
        
        if fixed:
            total_fixed += 1
    
    print(f"\nTotal files fixed: {total_fixed}")
    
    # Run pylint again to show remaining issues
    print("\nRunning pylint to show remaining issues:")
    os.system('./venv/bin/pylint src/ tests/ --disable=all --enable=E0602,E0601,E1101,E1120,E1121,E1123,E1124,E1129,E1130,E1131,E1132,E1133,E1134,E1135,E1136,E1137,E1138,E1139,E1140,E1141,E1142')

if __name__ == "__main__":
    main()