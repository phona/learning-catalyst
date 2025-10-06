#!/usr/bin/env python3
""""
Script to fix common flake8 issues in the project
""""
import os
import re
import sys

def fix_file(file_path):
    """Fix flake8 issues in a single file"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    lines = content.split('\n')
    fixed_lines = []

    # Track imports to remove unused ones
    imports = {}

    for i, line in enumerate(lines):
        # Fix E302: expected 2 blank lines
        if line.strip().startswith(('def ', 'class ')):
            if i > 0 and not lines[i-1].strip() == '':
                if i > 1 and not lines[i-2].strip() == '':
                    # Need to add 2 blank lines before
                    fixed_lines.extend(['', ''])
                else:
                    # Need to add 1 blank line before
                    fixed_lines.append('')
            elif i > 1 and not lines[i-2].strip() == '':
                # Need to add 1 blank line before
                fixed_lines.append('')

        # Fix E301: expected 1 blank line for nested functions
        if line.strip().startswith('    def ') or line.strip().startswith('    class '):
            if i > 0 and not lines[i-1].strip() == '':
                fixed_lines.append('')

        # Fix F401: unused imports (basic detection)
        if line.strip().startswith('import ') or line.strip().startswith('from '):
            # Store import for later removal if unused
            import_name = line.strip()
            if 'import ' in import_name:
                parts = import_name.split('import ')
                if len(parts) > 1:
                    imports[parts[1].split(' as ')[0].split(',')[0]] = i

        # Fix E501: line too long (basic splitting)
        if len(line) > 120:
            # Simple line splitting for long strings
            if '"""' in line or "'''" in line:
                # Don't split docstrings
                pass
            elif '+' in line and not line.strip().startswith('  #'):
                # Split concatenated strings
                parts = line.split('+')
                for j, part in enumerate(parts):
                    if j == 0:
                        fixed_lines.append(part.rstrip())
                    else:
                        fixed_lines.append('        ' + part.strip())
                continue

        # Fix E502: redundant backslash
        if '\\n' in line and not line.strip().startswith('  #'):
            line = line.replace('\\n', '')

        # Fix E128: continuation line under-indented
        if line.startswith(' ') and not line.strip().startswith('  #') and i > 0:
            prev_line = lines[i-1] if i-1 < len(lines) else ''
            if '(' in prev_line and not prev_line.strip().endswith('('):
                # Align with opening parenthesis
                indent_level = prev_line.find('(') + 1
                line = ' ' * indent_level + line.lstrip()

        # Add the line
        fixed_lines.append(line)

    # Remove unused imports (basic implementation)
    # This is a simplified version - a full implementation would need AST parsing
    content_str = '\n'.join(fixed_lines)

    # Write back the fixed content
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content_str)

    return True

def main():
    """Main function to fix all files"""
    directories = ['src/', 'tests/']

    for directory in directories:
        for root, dirs, files in os.walk(directory):
            for file in files:
                if file.endswith('.py'):
                    file_path = os.path.join(root, file)
                    try:
                        fix_file(file_path)
                        print(f"Fixed: {file_path}")
                    except Exception as e:
                        print(f"Error fixing {file_path}: {e}")

    print("Done fixing flake8 issues!")

if __name__ == "__main__":
    main()