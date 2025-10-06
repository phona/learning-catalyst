#!/usr/bin/env python3
"""
Script to fix unused imports and variables in the learning_catalyst project
"""

import os
import re

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
    
    # Fix unused imports and variables
    total_fixed = 0
    for file_path in python_files:
        fixed = False
        if fix_unused_imports(file_path):
            fixed = True
            print(f"Fixed unused imports in {file_path}")
        
        if fix_unused_variables(file_path):
            fixed = True
            print(f"Fixed unused variables in {file_path}")
        
        if fixed:
            total_fixed += 1
    
    print(f"\nTotal files fixed: {total_fixed}")
    
    # Run flake8 again to show remaining issues
    print("\nRunning flake8 to show remaining issues:")
    os.system('./venv/bin/flake8 src/ tests/ --count')

if __name__ == "__main__":
    main()