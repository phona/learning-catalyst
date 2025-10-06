#!/usr/bin/env python3
"""
Script to fix targeted flake8 issues in the learning_catalyst project
"""

import os
import re
import sys
from pathlib import Path

def fix_whitespace_issues(file_path):
    """Fix whitespace issues in a Python file"""
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

def fix_unused_imports(file_path):
    """Fix unused imports by commenting them out"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Track changes
        original_content = content
        
        # Get unused imports from flake8 output
        result = os.popen(f'./venv/bin/flake8 {file_path} --select=F401').read()
        unused_imports = []
        
        for line in result.strip().split('\n'):
            if line and 'F401' in line:
                parts = line.split()
                if len(parts) >= 3:
                    import_name = parts[2]
                    unused_imports.append(import_name)
        
        # Comment out unused imports
        for import_name in unused_imports:
            # Simple pattern matching for import statements
            patterns = [
                rf'^import {import_name}$',
                rf'^import {import_name} as .+$',
                rf'^from .+ import {import_name}$',
                rf'^from .+ import {import_name} as .+$',
                rf'^from .+ import .+{import_name}.+$'
            ]
            
            for pattern in patterns:
                content = re.sub(pattern, f'# \\g<0>  # F401 unused import', content, flags=re.MULTILINE)
        
        # Write back if changed
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        return False
    except Exception as e:
        print(f"Error fixing imports in {file_path}: {e}")
        return False

def fix_unused_variables(file_path):
    """Fix unused variables by prefixing with underscore"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Track changes
        original_content = content
        
        # Get unused variables from flake8 output
        result = os.popen(f'./venv/bin/flake8 {file_path} --select=F841').read()
        unused_vars = []
        
        for line in result.strip().split('\n'):
            if line and 'F841' in line:
                parts = line.split()
                if len(parts) >= 3:
                    var_name = parts[2].split("'")[1]  # Extract variable name
                    unused_vars.append(var_name)
        
        # Replace unused variables with underscore-prefixed versions
        for var_name in unused_vars:
            # Simple pattern matching for variable assignments
            pattern = rf'\b{var_name}\s*='
            content = re.sub(pattern, f'_{var_name} =', content)
        
        # Write back if changed
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        return False
    except Exception as e:
        print(f"Error fixing variables in {file_path}: {e}")
        return False

def fix_line_length(file_path):
    """Fix line length issues by breaking long lines"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Track changes
        original_content = content
        lines = content.split('\n')
        fixed_lines = []
        
        for line in lines:
            if len(line) > 120:
                # Simple heuristic: break at common separators
                if ' and ' in line and line.index(' and ') < 110:
                    idx = line.index(' and ')
                    fixed_lines.append(line[:idx])
                    fixed_lines.append('    and ' + line[idx+5:])
                elif ' or ' in line and line.index(' or ') < 110:
                    idx = line.index(' or ')
                    fixed_lines.append(line[:idx])
                    fixed_lines.append('    or ' + line[idx+4:])
                elif ', ' in line and line.rindex(', ') < 110:
                    idx = line.rindex(', ')
                    fixed_lines.append(line[:idx] + ',')
                    fixed_lines.append('     ' + line[idx+2:])
                else:
                    fixed_lines.append(line)
            else:
                fixed_lines.append(line)
        
        # Join lines back together
        fixed_content = '\n'.join(fixed_lines)
        
        # Write back if changed
        if fixed_content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(fixed_content)
            return True
        return False
    except Exception as e:
        print(f"Error fixing line length in {file_path}: {e}")
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
    
    # Fix issues in each file
    total_fixed = 0
    for file_path in python_files:
        print(f"Processing {file_path}...")
        
        # Fix whitespace issues first
        if fix_whitespace_issues(file_path):
            total_fixed += 1
            print(f"  Fixed whitespace issues")
        
        # Then fix unused imports
        if fix_unused_imports(file_path):
            total_fixed += 1
            print(f"  Fixed unused imports")
        
        # Then fix unused variables
        if fix_unused_variables(file_path):
            total_fixed += 1
            print(f"  Fixed unused variables")
        
        # Finally fix line length issues
        if fix_line_length(file_path):
            total_fixed += 1
            print(f"  Fixed line length issues")
    
    print(f"\nTotal files fixed: {total_fixed}")
    
    # Run flake8 again to show remaining issues
    print("\nRunning flake8 to show remaining issues:")
    os.system('./venv/bin/flake8 src/ tests/ --count')

if __name__ == "__main__":
    main()