"""
Unit tests for AI response formatting and markdown highlighting.

This test suite verifies that the new response formatting system works correctly
with enhanced highlighting, clean separators, and proper markdown rendering.
"""

import pytest
from unittest.mock import MagicMock, patch
from rich.text import Text
from rich.rule import Rule

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src"))

from src.cli.interface import CLIInterface
from src.core.config import ConfigManager


class TestResponseFormatting:
    """Test suite for response formatting functionality."""

    @pytest.fixture
    def cli_interface(self):
        """Create a CLI interface for testing."""
        config_manager = ConfigManager()
        cli_interface = CLIInterface(config_manager)

        # Set up mock state
        cli_interface.state.current_provider = "test-provider"
        cli_interface.state.current_model = "test-model"

        return cli_interface

    def test_output_ai_response_format(self, cli_interface):
        """Test that AI responses are formatted with enhanced highlighting."""
        # Capture output
        output_calls = []
        def mock_handler(message):
            output_calls.append(str(message))

        cli_interface.set_output_handler("response", mock_handler)
        cli_interface.set_output_handler("markdown", mock_handler)

        # Test response content
        test_content = "Python is a programming language."

        # Call the formatting method
        cli_interface._output_ai_response(test_content)

        # Verify output structure
        assert len(output_calls) >= 5, "Should have multiple output calls (spacing, header, content, footer, spacing)"

        # Check that provider and model are in header
        header_found = any("test-provider:test-model" in call for call in output_calls)
        assert header_found, "Header should contain provider:model information"

        # Check that content is rendered
        content_found = any("Python is a programming language" in call for call in output_calls)
        assert content_found, "Response content should be included"

        # Check that word count is in footer
        footer_found = any("words" in call for call in output_calls)
        assert footer_found, "Footer should contain word count"

    def test_output_ai_response_with_complex_content(self, cli_interface):
        """Test formatting with complex markdown content."""
        output_calls = []
        def mock_handler(message):
            output_calls.append(str(message))

        cli_interface.set_output_handler("response", mock_handler)
        cli_interface.set_output_handler("markdown", mock_handler)

        # Complex content with markdown
        test_content = """# Python Programming

Python is a **high-level** programming language known for:

- Simple syntax
- Readability
- Large community

## Code Example

```python
print("Hello, World!")
```

*Python is versatile!*

[Learn more](https://python.org)"""

        # Call formatting method
        cli_interface._output_ai_response(test_content)

        # Verify complex content is handled
        all_output = " ".join(output_calls)
        assert "# Python Programming" in all_output
        assert "high-level" in all_output
        assert "Simple syntax" in all_output
        assert "print(" in all_output
        assert "Hello, World!" in all_output

    def test_output_ai_response_word_count_calculation(self, cli_interface):
        """Test that word count is calculated correctly."""
        output_calls = []
        def mock_handler(message):
            output_calls.append(str(message))

        cli_interface.set_output_handler("response", mock_handler)
        cli_interface.set_output_handler("markdown", mock_handler)

        # Test content with specific word count
        test_content = "One two three four five six seven eight nine ten."
        expected_word_count = 10

        # Call formatting method
        cli_interface._output_ai_response(test_content)

        # Check word count in output
        all_output = " ".join(output_calls)
        assert f"{expected_word_count} words" in all_output, f"Should show {expected_word_count} words in footer"

    def test_output_ai_response_empty_content(self, cli_interface):
        """Test formatting with empty content."""
        output_calls = []
        def mock_handler(message):
            output_calls.append(str(message))

        cli_interface.set_output_handler("response", mock_handler)
        cli_interface.set_output_handler("markdown", mock_handler)

        # Empty content
        test_content = ""

        # Should not raise an error
        cli_interface._output_ai_response(test_content)

        # Should still have proper structure
        assert len(output_calls) >= 4, "Should maintain structure even with empty content"

    def test_output_ai_response_special_characters(self, cli_interface):
        """Test formatting with special characters and Unicode."""
        output_calls = []
        def mock_handler(message):
            output_calls.append(str(message))

        cli_interface.set_output_handler("response", mock_handler)
        cli_interface.set_output_handler("markdown", mock_handler)

        # Content with special characters
        test_content = "Python supports Unicode: 🐍, 中文, العربية, русский"

        # Should handle special characters correctly
        cli_interface._output_ai_response(test_content)

        all_output = " ".join(output_calls)
        assert "🐍" in all_output
        assert "中文" in all_output
        assert "العربية" in all_output
        assert "русский" in all_output

    def test_output_ai_response_long_content(self, cli_interface):
        """Test formatting with very long content."""
        output_calls = []
        def mock_handler(message):
            output_calls.append(str(message))

        cli_interface.set_output_handler("response", mock_handler)
        cli_interface.set_output_handler("markdown", mock_handler)

        # Generate long content
        test_content = "This is a test. " * 100  # 100 repetitions

        # Should handle long content without issues
        cli_interface._output_ai_response(test_content)

        # Verify content is included
        all_output = " ".join(output_calls)
        assert "This is a test" in all_output
        assert len(all_output) > 1000, "Long content should be present"

    def test_output_ai_response_with_code_blocks(self, cli_interface):
        """Test formatting with code blocks."""
        output_calls = []
        def mock_handler(message):
            output_calls.append(str(message))

        cli_interface.set_output_handler("response", mock_handler)
        cli_interface.set_output_handler("markdown", mock_handler)

        # Content with various code blocks
        test_content = """Here's some code:

**Python:**
```python
def hello():
    print("Hello, World!")
```

**JavaScript:**
```javascript
function hello() {
    console.log("Hello, World!");
}
```

**Inline code:** `variable = "value"`"""

        cli_interface._output_ai_response(test_content)

        all_output = " ".join(output_calls)
        assert "def hello():" in all_output
        assert "function hello()" in all_output
        assert 'variable = "value"' in all_output

    def test_output_ai_response_provider_model_display(self, cli_interface):
        """Test that provider and model are displayed correctly."""
        output_calls = []
        def mock_handler(message):
            output_calls.append(str(message))

        cli_interface.set_output_handler("response", mock_handler)
        cli_interface.set_output_handler("markdown", mock_handler)

        # Test with different provider/model combinations
        test_cases = [
            ("openai", "gpt-4"),
            ("chatglm", "glm-4.5-air"),
            ("deepseek", "deepseek-chat"),
            ("unknown", "unknown-model")
        ]

        for provider, model in test_cases:
            output_calls.clear()
            cli_interface.state.current_provider = provider
            cli_interface.state.current_model = model

            cli_interface._output_ai_response("Test content")

            all_output = " ".join(output_calls)
            assert f"{provider}:{model}" in all_output, f"Should display {provider}:{model}"

    def test_output_ai_response_fallback_when_no_markdown_handler(self, cli_interface):
        """Test fallback behavior when markdown handler is not available."""
        output_calls = []
        def mock_handler(message):
            output_calls.append(str(message))

        # Only set response handler, no markdown handler
        cli_interface.set_output_handler("response", mock_handler)

        test_content = "Simple test content."

        # Should still work without markdown handler
        cli_interface._output_ai_response(test_content)

        # Should have the basic structure even without markdown handler
        assert len(output_calls) >= 4, "Should maintain basic response structure"

        # Should contain the content
        all_output = " ".join(output_calls)
        assert "Simple test content" in all_output

    def test_output_ai_response_multiple_calls(self, cli_interface):
        """Test multiple consecutive response outputs."""
        output_calls = []
        def mock_handler(message):
            output_calls.append(str(message))

        cli_interface.set_output_handler("response", mock_handler)
        cli_interface.set_output_handler("markdown", mock_handler)

        # Multiple responses
        responses = [
            "First response about Python.",
            "Second response about JavaScript.",
            "Third response about machine learning."
        ]

        for response in responses:
            cli_interface._output_ai_response(response)

        # Should handle multiple calls correctly
        assert len(output_calls) >= len(responses) * 4, "Each response should have proper structure"

        # All content should be present
        all_output = " ".join(output_calls)
        for response in responses:
            assert response in all_output

    def test_streaming_cancel_method(self, cli_interface):
        """Test the streaming cancel method."""
        # Initially not cancelled
        assert cli_interface._streaming_cancelled is False

        # Cancel streaming
        cli_interface.cancel_streaming()

        # Should be cancelled
        assert cli_interface._streaming_cancelled is True

        # Reset for next test
        cli_interface._streaming_cancelled = False


class TestResponseFormattingIntegration:
    """Integration tests for response formatting with other components."""

    def test_response_formatting_with_rich_components(self, cli_interface):
        """Test that Rich components are used correctly."""
        output_calls = []
        output_types = []

        def mock_handler(message):
            output_calls.append(message)
            output_types.append(type(message).__name__)

        cli_interface.set_output_handler("response", mock_handler)
        cli_interface.set_output_handler("markdown", mock_handler)

        test_content = "Test content with **bold** text."

        cli_interface._output_ai_response(test_content)

        # Should have used Rich components
        all_types = " ".join(output_types)
        assert any("Text" in all_types for _ in output_types), "Should use Rich Text components"

    def test_response_formatting_structure_consistency(self, cli_interface):
        """Test that response formatting maintains consistent structure."""
        output_calls = []
        def mock_handler(message):
            output_calls.append(str(message))

        cli_interface.set_output_handler("response", mock_handler)
        cli_interface.set_output_handler("markdown", mock_handler)

        test_content = "Test content."

        cli_interface._output_ai_response(test_content)

        # Should follow the expected structure: spacing, header, separator, content, separator, footer, spacing
        expected_structure = [
            "spacing (empty line)",
            "header with provider:model",
            "separator",
            "content",
            "separator",
            "footer with metrics",
            "spacing (empty line)"
        ]

        # Verify we have the expected number of elements
        assert len(output_calls) >= len(expected_structure), f"Should have at least {len(expected_structure)} output calls"

        # Check for separator patterns
        separator_pattern = "─"  # Rich rule character
        separator_count = sum(1 for call in output_calls if separator_pattern in call)
        assert separator_count >= 2, "Should have at least 2 separators (top and bottom)"


if __name__ == "__main__":
    # Run tests if script is executed directly
    pytest.main([__file__, "-v"])