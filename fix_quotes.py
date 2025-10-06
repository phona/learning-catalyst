#!/usr/bin/env python3
"""
Fix quote issues in Python files.
"""

import os
import re

def fix_file(file_path: str) -> bool:
    """Fix quote issues in a file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Fix excessive quotes in docstrings
        content = re.sub(r'""""""', '"""', content)
        content = re.sub(r'"""""""', '"""', content)
        content = re.sub(r'""""""""', '"""', content)
        
        # Fix quotes at beginning of line
        lines = content.split('\n')
        fixed_lines = []
        
        for line in lines:
            # Skip comments
            if line.strip().startswith('#'):
                fixed_lines.append(line)
                continue
            
            # Fix quotes at the beginning
            if line.startswith('""""'):
                line = line.replace('""""', '"""', 1)
            
            # Fix quotes with indentation
            if '    """"' in line:
                line = line.replace('""""', '"""', 1)
            
            fixed_lines.append(line)
        
        content = '\n'.join(fixed_lines)
        
        # Write back if changed
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        
        return False
    except Exception as e:
        print(f"Error fixing {file_path}: {e}")
        return False

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