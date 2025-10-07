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

    def __init__(self, extraction_mode: str = "headers"):
        """
        Initialize the markdown parser with a specific extraction mode

        Args:
            extraction_mode: How to extract concepts from markdown
                "headers" - Extract based on headers (default)
                "sections" - Extract based on sections with headers
                "paragraphs" - Extract based on paragraphs
                "code_blocks" - Extract code blocks as concepts
        """
        self.extraction_mode = extraction_mode
        self.headers = []
        self.content_sections = []
        self.code_blocks = []

    def parse_file(self, file_path: str) -> Dict[str, Any]:
        """
        Parse a Markdown file and extract its content
        """
        with open(file_path, "r", encoding="utf-8") as f:
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

        return {"headers": headers, "code_blocks": code_blocks, "sections": sections, "full_content": content}

    def _extract_headers(self, content: str) -> List[Dict[str, Any]]:
        """
        Extract headers from markdown content
        """
        header_pattern = r"^(#{1,6})\s+(.+)$"
        headers = []

        for line_num, line in enumerate(content.split("\n")):
            match = re.match(header_pattern, line.strip())
            if match:
                headers.append({"level": len(match.group(1)), "title": match.group(2).strip(), "line_number": line_num})

        return headers

    def _extract_code_blocks(self, content: str) -> List[Dict[str, Any]]:
        """
        Extract code blocks from markdown content
        """
        code_block_pattern = r"```(\w*)\n(.*?)```"
        code_blocks = []

        for match in re.finditer(code_block_pattern, content, re.DOTALL):
            code_blocks.append({"language": match.group(1), "content": match.group(2).strip()})

        return code_blocks

    def _extract_sections(self, content: str, headers: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Extract content sections based on headers
        """
        lines = content.split("\n")
        sections = []

        if not headers:
            # If no headers, return the entire content as one section
            return [{"title": "Document", "content": content, "level": 0}]

        # Add sections based on headers
        for i, header in enumerate(headers):
            start_line = header["line_number"] + 1
            end_line = len(lines)  # Default to end of file

            # If there's a next header, the section ends there
            if i + 1 < len(headers):
                end_line = headers[i + 1]["line_number"]

            # Extract content for this section
            section_content = "\n".join(lines[start_line:end_line])

            sections.append({"title": header["title"], "content": section_content.strip(), "level": header["level"]})

        return sections

    def find_concepts_in_file(self, file_path: str) -> List[Dict[str, Any]]:
        """
        Find and return concepts from a markdown file based on the extraction mode
        """
        parsed_content = self.parse_file(file_path)
        concepts = []

        if self.extraction_mode == "headers":
            concepts = self._extract_header_concepts(parsed_content, file_path)
        elif self.extraction_mode == "sections":
            concepts = self._extract_section_concepts(parsed_content, file_path)
        elif self.extraction_mode == "paragraphs":
            concepts = self._extract_paragraph_concepts(parsed_content, file_path)
        elif self.extraction_mode == "code_blocks":
            concepts = self._extract_code_block_concepts(parsed_content, file_path)

        return concepts

    def _create_concept_id(self, title: str) -> str:
        """
        Create a unique ID for a concept based on its title
        """
        # Convert title to a safe ID format
        id_str = re.sub(r"[^a-zA-Z0-9\s-]", "", title.lower())
        id_str = re.sub(r"\s+", "_", id_str.strip())
        return f"md:{id_str}"

    def _extract_header_concepts(self, parsed_content: Dict[str, Any], file_path: str) -> List[Dict[str, Any]]:
        """Extract concepts based on headers"""
        concepts = []
        for section in parsed_content["sections"]:
            if section["content"].strip():  # Only create concepts for non-empty sections
                concept = {
                    "id": self._create_concept_id(section["title"]),
                    "title": section["title"],
                    "content": section["content"],
                    "source_file": file_path,
                    "granularity": "headers",
                    "level": section.get("level", 1),
                    "metadata": {
                        "word_count": len(section["content"].split()),
                        "char_count": len(section["content"]),
                    },
                }
                concepts.append(concept)
        return concepts

    def _extract_section_concepts(self, parsed_content: Dict[str, Any], file_path: str) -> List[Dict[str, Any]]:
        """Extract concepts based on sections with more context"""
        concepts = []
        for i, section in enumerate(parsed_content["sections"]):
            if section["content"].strip():
                # Include some context from previous section if available
                context = ""
                if i > 0:
                    prev_section = parsed_content["sections"][i - 1]
                    context = f"Context: {prev_section['title']}\n"

                concept = {
                    "id": self._create_concept_id(section["title"]),
                    "title": section["title"],
                    "content": context + section["content"],
                    "source_file": file_path,
                    "granularity": "sections",
                    "level": section.get("level", 1),
                    "metadata": {
                        "word_count": len(section["content"].split()),
                        "char_count": len(section["content"]),
                        "has_context": bool(context),
                    },
                }
                concepts.append(concept)
        return concepts

    def _extract_paragraph_concepts(self, parsed_content: Dict[str, Any], file_path: str) -> List[Dict[str, Any]]:
        """Extract concepts based on paragraphs"""
        concepts = []
        full_content = parsed_content["full_content"]
        paragraphs = re.split(r"\n\s*\n", full_content)

        for i, paragraph in enumerate(paragraphs):
            if paragraph.strip() and len(paragraph.strip()) > 50:  # Skip short paragraphs
                # Try to find a title for this paragraph
                title = f"Paragraph {i+1}"
                for header in parsed_content["headers"]:
                    header_line_count = len(full_content.split("\n"))
                    if header["line_number"] < header_line_count and full_content.find(paragraph) > full_content.find(
                        header["title"]
                    ):
                        title = header["title"]
                        break

                concept = {
                    "id": self._create_concept_id(title) + f"_p{i+1}",
                    "title": title,
                    "content": paragraph,
                    "source_file": file_path,
                    "granularity": "paragraphs",
                    "level": 1,  # Paragraphs don't have levels
                    "metadata": {
                        "word_count": len(paragraph.split()),
                        "char_count": len(paragraph),
                        "paragraph_index": i,
                    },
                }
                concepts.append(concept)
        return concepts

    def _extract_code_block_concepts(self, parsed_content: Dict[str, Any], file_path: str) -> List[Dict[str, Any]]:
        """Extract code blocks as concepts"""
        concepts = []
        for i, code_block in enumerate(parsed_content["code_blocks"]):
            # Find the nearest header to use as title
            title = f"Code Example {i+1}"
            if code_block.get("language"):
                title = f"{code_block['language']} Example {i+1}"

            # Find context around the code block
            content = code_block["content"]
            full_content = parsed_content["full_content"]
            code_pos = full_content.find(code_block["content"])

            # Look for headers before this code block
            for header in parsed_content["headers"]:
                header_pos = full_content.find(header["title"])
                if header_pos < code_pos and header_pos > code_pos - 1000:  # Within 1000 chars
                    title = f"{header['title']} - {title}"
                    break

            concept = {
                "id": self._create_concept_id(title),
                "title": title,
                "content": f"```{code_block.get('language', '')}\n{content}\n```",
                "source_file": file_path,
                "granularity": "code_blocks",
                "level": 1,
                "metadata": {
                    "language": code_block.get("language", "unknown"),
                    "line_count": len(content.split("\n")),
                    "char_count": len(content),
                },
            }
            concepts.append(concept)
        return concepts


def scan_workspace_for_markdown(workspace_path: str) -> List[str]:
    """
    Scan a workspace directory for all markdown files
    """
    workspace = Path(workspace_path)
    markdown_files = list(workspace.glob("**/*.md"))
    return [str(f) for f in markdown_files]


def extract_all_concepts(workspace_path: str, extraction_mode: str = "headers") -> List[Dict[str, Any]]:
    """
    Extract all concepts from all markdown files in a workspace

    Args:
        workspace_path: Path to the workspace directory
        extraction_mode: How to extract concepts from markdown
            "headers" - Extract based on headers (default)
            "sections" - Extract based on sections with headers
            "paragraphs" - Extract based on paragraphs
            "code_blocks" - Extract code blocks as concepts

    Returns:
        List of extracted concepts
    """
    parser = MarkdownParser(extraction_mode)
    all_concepts = []

    markdown_files = scan_workspace_for_markdown(workspace_path)

    for file_path in markdown_files:
        try:
            concepts = parser.find_concepts_in_file(file_path)
            all_concepts.extend(concepts)
        except (IOError, OSError, ValueError) as e:
            print(f"Error parsing {file_path}: {str(e)}")

    return all_concepts
