"""
Markdown parser utility for Learning Catalyst
Handles parsing markdown files and extracting content for AI processing
"""
import re
from pathlib import Path
from typing import Any, Dict, List


class MarkdownParser:
    """
    A utility class for parsing Markdown files and extracting structured content
    """

    def __init__(self):
        self.headers = []
        self.content_sections = []
        self.code_blocks = []

    def parse_file(self, file_path: str) -> Dict[str, Any]:
        """
        Parse a Markdown file and extract its content
        """
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        return self.parse_content(content)

    def parse_content(self, content: str) -> Dict[str, Any]:
        """
        Parse Markdown content and return structured data
        """
        # Extract headers with their levels and content
        headers = self._extract_headers(content)

        # Extract code blocks
        code_blocks = self._extract_code_blocks(content)

        # Extract content sections based on headers
        sections = self._extract_sections(content, headers)

        return {
            'headers': headers,
            'code_blocks': code_blocks,
            'sections': sections,
            'full_content': content
        }

    def _extract_headers(self, content: str) -> List[Dict[str, Any]]:
        """
        Extract headers from markdown content
        """
        header_pattern = r'^(#{1,6})\s+(.+)$'
        headers = []

        for line_num, line in enumerate(content.split('\n')):
            match = re.match(header_pattern, line.strip())
            if match:
                headers.append({
                    'level': len(match.group(1)),
                    'title': match.group(2).strip(),
                    'line_number': line_num
                })

        return headers

    def _extract_code_blocks(self, content: str) -> List[Dict[str, Any]]:
        """
        Extract code blocks from markdown content
        """
        code_block_pattern = r'```(\w*)\n(.*?)```'
        code_blocks = []

        for match in re.finditer(code_block_pattern, content, re.DOTALL):
            code_blocks.append({
                'language': match.group(1),
                'content': match.group(2).strip()
            })

        return code_blocks

    def _extract_sections(self, content: str, headers: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Extract content sections based on headers
        """
        lines = content.split('\n')
        sections = []

        if not headers:
            # If no headers, return the entire content as one section
            return [{
                'title': 'Document',
                'content': content,
                'level': 0
            }]

        # Add sections based on headers
        for i, header in enumerate(headers):
            start_line = header['line_number'] + 1
            end_line = len(lines)  # Default to end of file

            # If there's a next header, the section ends there
            if i + 1 < len(headers):
                end_line = headers[i + 1]['line_number']

            # Extract content for this section
            section_content = '\n'.join(lines[start_line:end_line])

            sections.append({
                'title': header['title'],
                'content': section_content.strip(),
                'level': header['level']
            })

        return sections

    def find_concepts_in_file(self, file_path: str) -> List[Dict[str, Any]]:
        """
        Find and return concepts from a markdown file
        """
        parsed_content = self.parse_file(file_path)
        concepts = []

        # For each header/section in the file, create a concept
        for section in parsed_content['sections']:
            if section['content'].strip():  # Only create concepts for non-empty sections
                concept = {
                    'id': self._create_concept_id(section['title']),
                    'title': section['title'],
                    'content': section['content'],
                    'source_file': file_path,
                    'granularity': 'headers',  # Default granularity
                    'level': section.get('level', 1),
                    'metadata': {
                        'word_count': len(section['content'].split()),
                        'char_count': len(section['content'])
                    }
                }
                concepts.append(concept)

        return concepts

    def _create_concept_id(self, title: str) -> str:
        """
        Create a unique ID for a concept based on its title
        """
        # Convert title to a safe ID format
        id_str = re.sub(r'[^a-zA-Z0-9\s-]', '', title.lower())
        id_str = re.sub(r'\s+', '_', id_str.strip())
        return f"md:{id_str}"


def scan_workspace_for_markdown(workspace_path: str) -> List[str]:
    """
    Scan a workspace directory for all markdown files
    """
    workspace = Path(workspace_path)
    markdown_files = list(workspace.glob("**/*.md"))
    return [str(f) for f in markdown_files]


def extract_all_concepts(workspace_path: str) -> List[Dict[str, Any]]:
    """
    Extract all concepts from all markdown files in a workspace
    """
    parser = MarkdownParser()
    all_concepts = []

    markdown_files = scan_workspace_for_markdown(workspace_path)

    for file_path in markdown_files:
        try:
            concepts = parser.find_concepts_in_file(file_path)
            all_concepts.extend(concepts)
        except (IOError, OSError, ValueError) as e:
            print(f"Error parsing {file_path}: {str(e)}")

    return all_concepts
