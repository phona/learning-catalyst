#!/usr/bin/env python3
"""
Script to fix critical flake8 issues in the learning_catalyst project
"""

import os
import re

def fix_whitespace_only(file_path):
    """Fix only whitespace issues in a Python file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Track changes
        original_content = content
        lines = content.split('\n')
        fixed_lines = []
        
        for line in lines:
            # Fix trailing whitespace
            fixed_line = line.rstrip()
            
            # Fix blank lines containing whitespace
            if fixed_line.strip() == '' and line != '':
                fixed_line = ''
            
            fixed_lines.append(fixed_line)
        
        # Join lines back together
        fixed_content = '\n'.join(fixed_lines)
        
        # Ensure file ends with newline
        if fixed_content and not fixed_content.endswith('\n'):
            fixed_content += '\n'
        
        # Write back if changed
        if fixed_content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(fixed_content)
            return True
        return False
    except Exception as e:
        print(f"Error fixing {file_path}: {e}")
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
    
    # Fix whitespace issues only
    total_fixed = 0
    for file_path in python_files:
        if fix_whitespace_only(file_path):
            total_fixed += 1
            print(f"Fixed whitespace in {file_path}")
    
    print(f"\nTotal files fixed: {total_fixed}")
    
    # Run flake8 again to show remaining issues
    print("\nRunning flake8 to show remaining issues:")
    os.system('./venv/bin/flake8 src/ tests/ --count')

if __name__ == "__main__":
    main()