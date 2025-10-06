#!/usr/bin/env python3
""""
Script to fix common flake8 issues
""""
import os
import re

def fix_file(file_path):
    """Fix common issues in a single file"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Fix trailing whitespace
    content = re.sub(r'[ \t]+$', '', content, flags=re.MULTILINE)

    # Fix blank lines with whitespace
    content = re.sub(r'^[ \t]+$[\r\n]*', '', content, flags=re.MULTILINE)

    # Fix missing newlines at end of file
    if content and not content.endswith('\n'):
        content += '\n'

    # Remove consecutive blank lines (keep max 2)
    content = re.sub(r'\n{3,}', '\n\n', content)

    # Write back the fixed content
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

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

    print("Done fixing common issues!")

if __name__ == "__main__":
    main()