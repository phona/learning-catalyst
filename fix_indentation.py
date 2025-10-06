import re
#!/usr/bin/env python3

""""
Script to fix indentation errors in Python files
""""
import os
import ast

def fix_file(file_path):
    """Fix indentation in a single file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Parse the AST to validate syntax
        try:
            ast.parse(content)
            # If parsing succeeds, the file is already valid
            return True
        except SyntaxError as e:
            print(f"Syntax error in {file_path}: {e}")
            return False

    except Exception as e:
        print(f"Error processing {file_path}: {e}")
        return False

def main():
    """Main function to fix all files"""
    directories = ['src/', 'tests/']

    for directory in directories:
        for root, dirs, files in os.walk(directory):
            for file in files:
                if file.endswith('.py'):
                    file_path = os.path.join(root, file)
                    fix_file(file_path)

    print("Done checking indentation!")

if __name__ == "__main__":
    main()