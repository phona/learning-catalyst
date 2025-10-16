"""
CLI interface abstraction for Learning Catalyst.

Simple interface for handling user interactions and command processing.
"""

import asyncio
import difflib
import os
import signal
import sys
import time
import uuid
from abc import ABC, abstractmethod
from enum import Enum
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, NamedTuple

# Rich imports
from rich.console import Console, Group
from rich.live import Live
from rich.markdown import Markdown
from rich.panel import Panel
from rich.rule import Rule
from rich.text import Text

# prompt-toolkit imports for enhanced CLI
from prompt_toolkit import PromptSession
from prompt_toolkit.completion import WordCompleter, NestedCompleter, Completer, Completion
from prompt_toolkit.history import FileHistory
from prompt_toolkit.key_binding import KeyBindings
from prompt_toolkit.shortcuts import confirm
from prompt_toolkit.document import Document
from prompt_toolkit.patch_stdout import patch_stdout

from ..ai.factory import ModelFactory
from ..core.config import ConfigManager
from ..core.exceptions import AuthenticationError, ModelNotFoundError, ProviderError, ProviderRegistrationError, ValidationError
from ..core.logging import get_logger, log_function_call
from ..core.models import Message, ProviderConfig, ChatResponse
from .commands import CommandProcessor
from .state import CLIState


class AIState(Enum):
    """AI processing states for live streaming display."""
    THINKING = "thinking"
    RESPONDING = "responding"
    COMPLETE = "complete"
    ERROR = "error"


class StreamingState(NamedTuple):
    """State for tracking streaming response phases."""
    is_thinking: bool = False
    thinking_content: str = ""
    response_content: str = ""
    start_time: float = 0.0
    last_chunk_time: float = 0.0


class LiveStreamingManager:
    """Simplified live streaming manager for balanced UX and reliability."""

    def __init__(self, model_name: str, output_handler: Callable, console: Console):
        self.model_name = model_name
        self.output_handler = output_handler
        self.console = console  # Use shared console
        self.live = None
        self.current_state = AIState.THINKING
        self.thinking_content = ""
        self.response_content = ""
        self.start_time = 0
        # Add missing word count attributes
        self.thinking_word_count = 0
        self.response_word_count = 0

        # Simple state configurations
        self.state_configs = {
            AIState.THINKING: ("🔄", "thinking", "cyan"),
            AIState.RESPONDING: ("⚡", "responding", "blue"),
            AIState.COMPLETE: ("✅", "deeply thought", "green"),
            AIState.ERROR: ("❌", "error", "red")
        }

    def start_streaming(self) -> None:
        """Initialize the Live display."""
        self.live = Live(refresh_per_second=4, console=self.console)
        self.start_time = time.time()
        self.live.start()

    def update_thinking_stream(self, chunk: str) -> None:
        """Update thinking content during streaming."""
        self.thinking_content += chunk
        self.thinking_word_count = len(self.thinking_content.split())
        self.current_state = AIState.THINKING
        self._refresh_display()

    def transition_to_response(self) -> None:
        """Transition from thinking to response state."""
        self.current_state = AIState.RESPONDING
        self._refresh_display()

    def update_response_stream(self, chunk: str) -> None:
        """Update response content during streaming."""
        self.response_content += chunk
        self.response_word_count = len(self.response_content.split())
        self.current_state = AIState.RESPONDING
        self._refresh_display()

    def finalize_response(self) -> None:
        """Finalize the response."""
        self.current_state = AIState.COMPLETE
        self._refresh_display()

  
    def _refresh_display(self) -> None:
        """Refresh the live display."""
        if self.live:
            content = self._create_content()
            self.live.update(content)

    def _create_content(self):
        """Create simple, reliable content layout."""
        elements = []

        # Status line
        status_line = self._create_status_line()
        elements.append(status_line)

        # Add thinking section if available
        if self.thinking_content.strip():
            elements.append(Text(""))
            elements.append(Rule("🤔 Thinking Process", style="cyan"))
            elements.append(Text(self.thinking_content))
            elements.append(Rule(style="cyan"))

        # Add response section or placeholder
        if self.response_content.strip():
            elements.append(Text(""))
            elements.append(Rule("💬 Response", style="blue"))
            elements.append(Markdown(self.response_content))
            elements.append(Rule(style="blue"))
        elif not self.thinking_content.strip():
            elements.append(Text(""))
            elements.append(Text(f"🔍 Processing your question...", style="dim italic"))

        # Add simple footer
        footer = self._create_footer()
        if footer:
            elements.append(Text(""))
            elements.append(footer)

        return Group(*elements)

    def _create_status_line(self) -> Text:
        """Create status line with appropriate icon and state."""
        icon, state_text, color = self.state_configs.get(self.current_state, self.state_configs[AIState.THINKING])

        if self.current_state == AIState.THINKING:
            return Text(f"● {self.model_name} {icon} {state_text}: Processing your question...", style=f"bold {color}")
        elif self.current_state == AIState.RESPONDING:
            return Text(f"● {self.model_name} {icon} {state_text}: Generating response...", style=f"bold {color}")
        elif self.current_state == AIState.COMPLETE:
            return Text(f"● {self.model_name} {icon} {state_text}: Response complete", style=f"bold {color}")
        else:
            return Text(f"● {self.model_name} {icon} {state_text}:", style=f"bold {color}")

    def _create_footer(self) -> Text:
        """Create footer with detailed statistics and controls."""
        current_time = time.time()
        elapsed_time = current_time - self.start_time

        # Build hints based on state
        hints = []
        if self.current_state in [AIState.THINKING, AIState.RESPONDING]:
            hints.append("[Ctrl+C] Cancel")

        # Detailed metrics
        word_count = len(self.response_content.split()) if self.response_content else 0
        thinking_word_count = len(self.thinking_content.split()) if self.thinking_content else 0

        # Calculate words per second for response
        response_wps = word_count / max(elapsed_time, 0.1) if word_count > 0 else 0

        if thinking_word_count > 0:
            metrics = f"📊 Response: {word_count} words ({response_wps:.1f} w/s) • Thinking: {thinking_word_count} words • ⏱️ {elapsed_time:.1f}s"
        else:
            metrics = f"📊 {word_count} words ({response_wps:.1f} w/s) • ⏱️ {elapsed_time:.1f}s"

        # Combine hints and metrics
        if hints:
            return Text(f"💡 {' • '.join(hints)} • {metrics}", style="dim")
        else:
            return Text(f"💡 {metrics}", style="dim")

    def stop_streaming(self) -> None:
        """Stop the live display."""
        if self.live:
            self.live.stop()


class CommandCompleter:
    """Command completion system for Learning Catalyst."""

    def __init__(self):
        # Base commands
        self.base_commands = [
            '/help', '/quit', '/clear', '/config', '/learn',
            '/tokens', '/checkpoint', '/progress', '/context',
            '/compress', '/quiz', '/personalize', '/achievements',
            '/statistics', '/export', '/import', '/reset'
        ]

        # Subcommands
        self.subcommands = {
            '/config': ['provider', 'model', 'setup', 'show', 'reset'],
            '/learn': ['mode', 'topic', 'session', 'style'],
            '/checkpoint': ['save', 'load', 'list', 'delete'],
            '/progress': ['topics', 'achievements', 'recent', 'goals'],
            '/personalize': ['style', 'format', 'level', 'interests'],
            '/context': ['show', 'clear', 'compress', 'size'],
            '/export': ['session', 'progress', 'config'],
            '/import': ['session', 'config']
        }

        # Learning topics (will be populated dynamically)
        self.learning_topics = [
            'python', 'javascript', 'data-science', 'machine-learning',
            'web-development', 'algorithms', 'databases', 'api',
            'testing', 'debugging', 'git', 'docker'
        ]

        # Create nested completer
        self.completer = self._create_completer()

    def _create_completer(self) -> Completer:
        """Create the hybrid command completer with root-level partial matching."""

        # Create word completers for different contexts
        # Remove the slash from base commands for better matching
        base_commands_without_slash = [cmd.lstrip('/') for cmd in self.base_commands]
        base_command_completer = WordCompleter(
            base_commands_without_slash,
            ignore_case=True
        )

        # Create subcommand completers
        subcommand_completers = {}
        for command, subcommands in self.subcommands.items():
            if command == '/learn':
                # Extend /learn with learning topics
                learn_subcommands = subcommands.copy()
                learn_subcommands.extend(self.learning_topics)
                subcommand_completers[command] = WordCompleter(
                    learn_subcommands,
                    ignore_case=True
                )
            else:
                subcommand_completers[command] = WordCompleter(
                    subcommands,
                    ignore_case=True
                )

        # Create a hybrid completer
        class HybridCommandCompleter(Completer):
            def __init__(self, base_completer, sub_completers, base_commands):
                self.base_completer = base_completer
                self.sub_completers = sub_completers
                self.base_commands = base_commands
                self.logger = get_logger("cli_interface")

            def get_completions(self, document, complete_event):
                text = document.text_before_cursor

                # Debug: Log what we're trying to complete
                import sys
                self.logger.info(f"DEBUG: get_completions called with text='{text}', cursor={document.cursor_position}")

                # If we have a space, we're in subcommand territory
                if ' ' in text:
                    # Split into command and subcommand parts
                    parts = text.split(' ', 1)
                    command = parts[0]

                    if command in self.sub_completers:
                        # Create a document for the subcommand part
                        sub_text = parts[1] if len(parts) > 1 else ''
                        sub_doc = Document(
                            text=sub_text,
                            cursor_position=len(sub_text)
                        )
                        return self.sub_completers[command].get_completions(sub_doc, complete_event)

                # Otherwise, use base command completion
                # Create a modified document without the slash for the base completer
                if text.startswith('/'):
                    modified_text = text[1:]  # Remove the slash
                    modified_doc = Document(
                        text=modified_text,
                        cursor_position=document.cursor_position - 1
                    )
                    base_completions = list(self.base_completer.get_completions(modified_doc, complete_event))
                else:
                    base_completions = list(self.base_completer.get_completions(document, complete_event))

                # Re-add the slash to completions with correct start_position
                corrected_completions = []
                for completion in base_completions:
                    # Calculate correct start_position
                    if text.startswith('/'):
                        # For commands starting with /, we want to replace everything after the slash
                        # So start_position should be -1 (replace everything after the /)
                        corrected_start_position = -1
                    else:
                        # For commands without slash, use original start_position
                        corrected_start_position = completion.start_position

                    corrected_completion = Completion(
                        text=f"/{completion.text}",
                        start_position=corrected_start_position,
                        display=completion.display,
                        display_meta=completion.display_meta
                    )
                    corrected_completions.append(corrected_completion)
                    self.logger.info(f"DEBUG: Generated completion: '{completion.text}' -> '{corrected_completion.text}' (start_position={corrected_start_position})")

                self.logger.info(f"DEBUG: Returning {len(corrected_completions)} completions for text='{text}'")
                return corrected_completions

        return HybridCommandCompleter(base_command_completer, subcommand_completers, self.base_commands)

    def add_learning_topic(self, topic: str):
        """Dynamically add a learning topic to completions."""
        if topic.lower() not in self.learning_topics:
            self.learning_topics.append(topic.lower())
            # Recreate completer with new topic
            self.completer = self._create_completer()

    def get_completer(self) -> Completer:
        """Get the current completer."""
        return self.completer


class EnhancedKeyBindings:
    """Enhanced key bindings for Learning Catalyst."""

    def __init__(self, cli_interface=None):
        self.cli_interface = cli_interface
        self.key_bindings = KeyBindings()
        self._setup_bindings()

    def _setup_bindings(self):
        """Setup key bindings."""

        @self.key_bindings.add('c-c')
        def _(event):
            """Handle Ctrl+C gracefully."""
            if self.cli_interface and hasattr(self.cli_interface, 'cancel_streaming'):
                self.cli_interface.cancel_streaming()
            else:
                event.app.exit(exception=KeyboardInterrupt("Use /quit to exit"))

        @self.key_bindings.add('c-l')
        def _(event):
            """Clear screen on Ctrl+L."""
            # Use Rich console clear method for better compatibility
            if self.cli_interface and hasattr(self.cli_interface, 'console'):
                self.cli_interface.console.clear()
            else:
                # Fallback to os.system
                os.system('clear' if os.name == 'posix' else 'cls')

  
    def get_bindings(self) -> KeyBindings:
        """Get the key bindings."""
        return self.key_bindings


class CLIInterface:
    """Main CLI interface for Learning Catalyst."""

    def __init__(self, config_manager: ConfigManager, console: Optional[Console] = None):
        """
        Initialize CLI interface.

        Args:
            config_manager: Configuration manager instance
            console: Shared Rich console instance (optional)
        """
        self.config = config_manager
        # Use shared console or create fallback with proper ANSI handling
        if console:
            self.console = console
        else:
            # Import the console creation function from main
            from .main import create_rich_console
            self.console = create_rich_console()
        self.command_processor = CommandProcessor()
        self.state = CLIState()
        self._output_handlers: Dict[str, Callable] = {}
        self._input_handler: Optional[Callable] = None
        self.logger = get_logger("cli_interface")

        # AI provider for Phase 1.2
        self._ai_provider = None
        self._ai_model = None

        # Enhanced streaming state
        self._streaming_cancelled = False
        self._streaming_state = StreamingState()

        # prompt-toolkit components for enhanced CLI
        self.command_completer = CommandCompleter()
        self.enhanced_key_bindings = EnhancedKeyBindings(self)
        self.prompt_session = None
        self._setup_prompt_session()

        # Quick shortcuts
        self.shortcuts = {
            'h': '/help',
            'q': '/quit',
            'c': '/clear',
            't': '/tokens',
            'p': '/progress',
            'l': '/learn',
            'cfg': '/config',
            'cls': '/clear'
        }

        # Setup signal handlers for cancellation
        self._setup_signal_handlers()

    def _setup_prompt_session(self):
        """Setup the prompt-toolkit session with robust fallback handling."""
        # Create history file path
        history_path = Path("test_workspace/history.txt")
        if not history_path.parent.exists():
            history_path.parent.mkdir(parents=True, exist_ok=True)

        # Try the simplest possible prompt session first
        try:
            self.logger.info("Attempting to create basic prompt session...")
            self.prompt_session = PromptSession(
                history=FileHistory(str(history_path.absolute())),
                wrap_lines=True,
            )
            self.logger.info("Basic prompt session initialized successfully")
        except Exception as e:
            self.logger.warning(f"Prompt session failed ({e}), using fallback mode")
            self.prompt_session = None
            self.logger.info("Operating in fallback mode - manual input with basic features")

    def _expand_shortcut(self, text: str) -> str:
        """Expand quick shortcuts."""
        text = text.strip()
        return self.shortcuts.get(text, text)

  
    def _setup_signal_handlers(self) -> None:
        """Setup signal handlers for cancellation."""
        # Handle SIGINT (Ctrl+C) for graceful cancellation
        def signal_handler(signum, frame):
            if not self._streaming_cancelled:
                self.logger.info("Received SIGINT, cancelling streaming")
                self.cancel_streaming()
            else:
                self.logger.info("Received second SIGINT, exiting")
                sys.exit(0)

        try:
            signal.signal(signal.SIGINT, signal_handler)
        except ValueError:
            # Signal handling not available in this environment
            self.logger.warning("Signal handling not available")

    
    def set_output_handler(self, output_type: str, handler: Callable) -> None:
        """
        Set output handler for different types of output.

        Args:
            output_type: Type of output (e.g., "response", "error", "info")
            handler: Handler function
        """
        self._output_handlers[output_type] = handler

    def set_input_handler(self, handler: Callable) -> None:
        """
        Set input handler for getting user input.

        Args:
            handler: Input handler function
        """
        self._input_handler = handler

    def output(self, message, output_type: str = "response") -> None:
        """
        Output a message to the user.

        Args:
            message: Message to output (can be string or Rich Panel)
            output_type: Type of output
        """
        # Check if message is a Rich Panel
        if isinstance(message, Panel):
            # Use the rich_panel output handler if available, otherwise fallback to response
            if "rich_panel" in self._output_handlers:
                handler = self._output_handlers["rich_panel"]
                handler(message)
            else:
                # Fallback: try to use response handler
                handler = self._output_handlers.get(output_type)
                if handler:
                    handler(str(message))
                else:
                    print(message)  # Default fallback
        else:
            # Handle regular string messages
            handler = self._output_handlers.get(output_type)
            if handler:
                handler(message)
            else:
                print(message)  # Default fallback

    def _output_ai_response(self, content: str) -> None:
        """
        Format and output AI response with enhanced markdown highlighting and separators.
        Replaces the old boxed output with clean header/footer separators.

        Args:
            content: AI response content
        """

        # Count words for metrics
        word_count = len(content.split())

        # Create clean header without provider/model info (redundant)
        header = Text("🤖 AI Response", style="bold blue")

        # Create footer with essential metrics and controls
        footer = Text(f"📊 {word_count} words | 💡 Type /help for commands", style="dim blue")

        # Output with clean separators
        self.output("", "response")  # Empty line for spacing
        self.output(header, "response")
        self.output(Rule(style="blue"), "response")

        # Render markdown content without box
        if "markdown" in self._output_handlers:
            self._output_handlers["markdown"](content)
        else:
            # Fallback: render markdown directly with shared console
            self.console.print(Markdown(content))

        self.output(Rule(style="blue"), "response")
        self.output(footer, "response")
        self.output("", "response")  # Empty line for spacing

    def _detect_thinking_phase(self, content: str) -> bool:
        """
        Detect if the current content indicates a thinking phase.

        Args:
            content: Current accumulated content

        Returns:
            True if content appears to be in thinking phase
        """
        # Look for common thinking indicators
        thinking_indicators = [
            "thinking:", "let me think", "i need to consider", "hmm",
            "well, let's see", "first, i should", "i should start by",
            "considering that", "to answer this", "let me break this down"
        ]

        content_lower = content.lower()
        return any(indicator in content_lower for indicator in thinking_indicators)

    def _extract_thinking_content(self, content: str) -> tuple[str, str]:
        """
        Extract thinking content from the main response.

        Args:
            content: Full content including potential thinking

        Returns:
            Tuple of (thinking_content, response_content)
        """
        # Simple heuristic: split on common thinking transition markers
        transition_markers = [
            "\n\nanswer:", "\n\nresponse:", "\n\nhere's", "\n\nbased on",
            "now, let me", "here's the", "the answer is", "to summarize"
        ]

        thinking_content = ""
        response_content = content

        for marker in transition_markers:
            if marker.lower() in content.lower():
                parts = content.lower().split(marker.lower(), 1)
                if len(parts) == 2:
                    thinking_content = parts[0].strip()
                    response_content = marker + parts[1].strip()
                    break

        return thinking_content, response_content

    def _create_thinking_panel(self, thinking_content: str) -> Any:
        """
        Create a styled panel for thinking content with distinct appearance.

        Args:
            thinking_content: Content to display in thinking panel

        Returns:
            Rich Panel with thinking content
        """

        if not thinking_content.strip():
            return None

        # Create thinking panel with distinct styling
        thinking_header = Text("🧠 Thinking Process", style="bold italic cyan")
        thinking_md = Markdown(thinking_content)

        return Panel(
            thinking_md,
            title=thinking_header,
            border_style="cyan",
            padding=(0, 1),
            title_align="left"
        )

    def _create_simplified_header(self, provider_name: str = None) -> Any:
        """
        Create a simplified header without verbose provider/model info.

        Args:
            provider_name: Optional provider name for context

        Returns:
            Rich Text with simplified header
        """

        # Simplified header: "🤖 AI Response (provider)"
        if provider_name:
            header_text = f"🤖 AI Response ({provider_name})"
        else:
            header_text = "🤖 AI Response"

        return Text(header_text, style="bold blue")

    def _create_simple_footer(self, word_count: int, elapsed_time: float, cancelled: bool = False) -> Any:
        """
        Create a simple footer with essential information only.

        Args:
            word_count: Number of words in response
            elapsed_time: Time elapsed in seconds
            cancelled: Whether response was cancelled

        Returns:
            Rich Text with simple footer
        """

        status = "⏹️ Cancelled" if cancelled else "✅"
        time_str = f"{elapsed_time:.1f}s"

        footer_text = f"{status} {word_count} words • {time_str} • [Ctrl+C] Cancel"
        return Text(footer_text, style="dim blue")

    async def _output_ai_response_streaming(self, user_input: str) -> Dict[str, Any]:
        """
        Enhanced streaming response with live thinking-state layout.

        This method implements:
        - Real-time streaming with Rich Live display and status indicators
        - Live thinking process visibility
        - Smooth state transitions (thinking → responding → complete)
        - Progressive content rendering with proper markdown support
        - Live metrics and essential hotkey hints

        Args:
            user_input: The user's input that triggered the response

        Returns:
            Dict with success status, content, thinking content, and metrics
        """
        # Reset streaming state
        self._streaming_cancelled = False
        self._streaming_state = StreamingState(
            start_time=asyncio.get_event_loop().time(),
            last_chunk_time=asyncio.get_event_loop().time()
        )

        provider_name = self.state.current_provider or "ai"

        # Create live streaming manager
        stream_manager = LiveStreamingManager(provider_name, self.output, self.console)

        
        try:
            # Start live streaming
            stream_manager.start_streaming()

            # Get streaming response from AI
            stream_response = await self._get_ai_response_streaming(user_input)

            if not stream_response["success"]:
                return stream_response

            # Process streaming with live updates
            accumulated = ""
            is_thinking = True
            thinking_complete = False

            if hasattr(stream_response["stream"], '__aiter__'):
                # Process async generator with live updates
                async for chunk in stream_response["stream"]:
                    # Check for cancellation
                    if self._streaming_cancelled:
                        break

                    # Handle thinking content
                    if chunk.reasoning_content:
                        # Update thinking stream
                        stream_manager.update_thinking_stream(chunk.reasoning_content)
                        # Update original state for compatibility
                        self._streaming_state = self._streaming_state._replace(
                            thinking_content=stream_manager.thinking_content
                        )

                    # Handle regular response content
                    elif chunk.content:
                        # Transition to response if we were in thinking mode
                        if is_thinking and chunk.content.strip():
                            is_thinking = False
                            thinking_complete = True
                            stream_manager.transition_to_response()

                        # Update response stream
                        stream_manager.update_response_stream(chunk.content)
                        # Update original state
                        self._streaming_state = self._streaming_state._replace(
                            is_thinking=False,
                            response_content=stream_manager.response_content
                        )
            else:
                # Regular response (non-streaming)
                response_obj = stream_response["stream"]

                # Handle ChatResponse wrapper
                if hasattr(response_obj, 'reasoning_content') or hasattr(response_obj, 'content'):
                    thinking = response_obj.reasoning_content if hasattr(response_obj, 'reasoning_content') else ""
                    response = response_obj.content if hasattr(response_obj, 'content') else str(response_obj)
                else:
                    # Fallback for old response format
                    full_content = response_obj.content if hasattr(response_obj, 'content') else str(response_obj)
                    thinking, response = self._extract_thinking_content(full_content)

                # Update stream manager with complete content
                stream_manager.thinking_content = thinking
                stream_manager.response_content = response
                stream_manager.thinking_word_count = len(thinking.split())
                stream_manager.response_word_count = len(response.split())
                stream_manager.transition_to_response()
                stream_manager.finalize_response()

                # Update original state
                self._streaming_state = self._streaming_state._replace(
                    is_thinking=False,
                    thinking_content=thinking,
                    response_content=response
                )

            # Finalize response
            stream_manager.finalize_response()
            await asyncio.sleep(0.5)  # Show final state briefly

            # Get final content from stream manager
            final_thinking = stream_manager.thinking_content
            final_response = stream_manager.response_content or final_thinking

            return {
                "success": True,
                "content": final_response,
                "thinking_content": final_thinking,
                "cancelled": self._streaming_cancelled,
                "metrics": {
                    "word_count": stream_manager.response_word_count,
                    "thinking_word_count": stream_manager.thinking_word_count,
                    "duration": time.time() - stream_manager.start_time,
                    "words_per_second": stream_manager.response_word_count / max(time.time() - stream_manager.start_time, 0.1)
                }
            }

        except Exception as e:
            self.logger.error(f"Live streaming error: {e}")
            return {"success": False, "error": str(e)}

        finally:
            # Cleanup
            stream_manager.stop_streaming()

            # Add spacing between conversations
            self.output("", "response")  # Empty line for spacing

    def cancel_streaming(self) -> None:
        """Cancel the current streaming response with enhanced feedback."""
        self._streaming_cancelled = True
        self.output("⏹️ Cancelling response...", "info")
        self.logger.info("Streaming response cancelled by user")

    async def get_user_input(self, prompt: str = "") -> str:
        """
        Get input from the user with enhanced prompt-toolkit support.

        Args:
            prompt: Optional prompt to display

        Returns:
            User input string
        """
        if self._input_handler:
            return self._input_handler(prompt)

        # Try to use enhanced prompt session if available
        if self.prompt_session:
            try:
                # Create enhanced prompt with context
                enhanced_prompt = self._get_enhanced_prompt()

                # Use proper async prompt with prompt-toolkit
                user_input = await self.prompt_session.prompt_async(enhanced_prompt)
                return user_input

            except KeyboardInterrupt:
                return "/quit"
            except EOFError:
                return "/quit"

        # Fallback to basic input with simple features
        try:
            enhanced_prompt = self._get_enhanced_prompt()
            user_input = input(enhanced_prompt).strip()

            # Shortcuts are now expanded in process_input()
    
            return user_input

        except KeyboardInterrupt:
            return "/quit"
        except EOFError:
            return "/quit"

    def _get_enhanced_prompt(self) -> str:
        """Get the enhanced prompt with context."""
        # Get current provider and model
        provider = self.state.current_provider or self.config.get("ai.default_provider", "chatglm")
        model = self.state.current_model or self.config.get("ai.default_model", "glm-4.5-air")

        # Add session context if available
        if hasattr(self.state, 'current_session') and self.state.current_session:
            # Add session info if available
            return f"🧠 ({provider}:{model})> "

        return f"🧠 ({provider}:{model})> "

    async def process_input(self, user_input: str) -> bool:
        """
        Process user input and handle commands with enhanced features.

        Args:
            user_input: Raw user input

        Returns:
            True if session should continue, False if should exit
        """
        self.state.user_input = user_input.strip()

        if not self.state.user_input:
            return True

        # CRITICAL FIX: Expand shortcuts BEFORE any other processing
        self.state.user_input = self._expand_shortcut(self.state.user_input)

        # Check for exit commands (including shortcuts)
        exit_commands = ["/quit", "/exit", "/q", "quit", "exit", "q"]
        if self.state.user_input.lower() in exit_commands:
            return False

        # Show enhanced features message on first interaction
        if not hasattr(self, '_enhanced_features_shown'):
            if self.prompt_session:
                self.output("✨ Enhanced CLI features active: Tab completion, Ctrl+R history search, shortcuts (h=help, q=quit)", "info")
            else:
                self.output("💡 Basic CLI features active: Use shortcuts (h=help, q=quit) and commands (/help, /config)", "info")
            self._enhanced_features_shown = True

        # Process commands
        if self.state.user_input.startswith("/"):
            await self._handle_command(self.state.user_input)
        else:
            # Handle regular conversation input
            await self._handle_conversation_input(self.state.user_input)

        return True

    async def _handle_command(self, command: str) -> None:
        """
        Handle slash commands with enhanced error handling and suggestions.

        Args:
            command: Command string starting with /
        """
        try:
            result = await self.command_processor.process_command(command, self.config, self.state)

            if result.success:
                self.output(result.message, "response")
                if result.data:
                    self.output(str(result.data), "info")
            else:
                # Enhanced error handling with suggestions
                self._handle_command_error(command, result.message)

        except Exception as e:
            self._handle_unexpected_command_error(command, e)

    async def _handle_conversation_input(self, user_input: str) -> None:
        """
        Handle regular conversation input with enhanced UX features.
        Uses streaming responses with fallback to non-streaming.

        Args:
            user_input: User's conversational input
        """
        self.logger.info(f"Processing user input: {user_input[:50]}...")

        # Add to conversation history
        self.state.add_to_history("user", user_input)

        # Show initial progress feedback
        self.output("🔍 Analyzing your question...", "info")

        try:
            # Try streaming response first
            response = await self._output_ai_response_streaming(user_input)

            if response["success"]:
                # Add to conversation history (main response only, not thinking)
                self.state.add_to_history("assistant", response["content"])
                self.logger.info("Streaming AI response successful")

                # Extract and track learned concepts
                await self._extract_and_track_concepts(user_input, response["content"])

                # Show additional helpful suggestions
                await self._show_learning_suggestions(user_input, response["content"])
            else:
                # Streaming failed - handle error
                error_msg = response.get("error", "Unknown error")
                self.logger.error(f"Streaming AI response failed: {error_msg}")
                self._handle_ai_error(user_input, error_msg)

        except (AuthenticationError, ModelNotFoundError, ProviderRegistrationError) as e:
            # Handle authentication and model errors
            self.logger.error(f"Authentication/Model error: {e}")
            self._handle_auth_error(user_input, e)
        except ValidationError as e:
            # Handle validation errors
            self.logger.error(f"Validation error: {e}")
            self._handle_validation_error(user_input, e)
        except ProviderError as e:
            # Handle general provider errors (connection issues, etc.)
            self.logger.error(f"Provider error: {e}")
            self._handle_provider_error(user_input, e)
        except Exception as e:
            # Ultimate fallback - any unexpected error
            self.logger.error(f"Unexpected error: {e}")
            self._handle_unexpected_error(user_input, e)

    def _handle_ai_error(self, user_input: str, error_msg: str) -> None:
        """Handle AI-specific errors with actionable guidance."""
        self.output(
            f"🧠 I understand you want to learn about: {user_input}\n\n"
            f"🤖 **AI Response Issue**\n"
            f"❌ **Error**: {error_msg}\n\n"
            "💡 **Let's get this fixed:**\n\n"
            "1️⃣  **Check current setup:**\n"
            "   /config\n\n"
            "2️⃣  **Configure a provider:**\n"
            "   /config provider openai\n"
            "   (or: deepseek, chatglm, siliconflow)\n\n"
            "3️⃣  **Select a model:**\n"
            "   /config model\n\n"
            "4️⃣  **Try your question again!**",
            "response",
        )

    def _handle_auth_error(self, user_input: str, error: Exception) -> None:
        """Handle authentication errors with specific guidance."""
        self.output(
            f"🧠 I understand you want to learn about: {user_input}\n\n"
            f"🔑 **Authentication or Model Issue**\n"
            f"❌ **Details**: {str(error)}\n\n"
            "💡 **Your API setup needs attention:**\n\n"
            "1️⃣  **Get an API key from your AI provider:**\n"
            "   • OpenAI: https://platform.openai.com/api-keys\n"
            "   • DeepSeek: https://platform.deepseek.com\n"
            "   • ChatGLM: https://open.bigmodel.cn\n\n"
            "2️⃣  **Configure the provider:**\n"
            "   /config provider openai\n"
            "   (Enter your API key when prompted)\n\n"
            "3️⃣  **Try asking your question again!**",
            "response",
        )

    def _handle_validation_error(self, user_input: str, error: Exception) -> None:
        """Handle validation errors with specific guidance."""
        self.output(
            f"🧠 I understand you want to learn about: {user_input}\n\n"
            f"🔌 **Configuration Validation Issue**\n"
            f"❌ **Details**: {str(error)}\n\n"
            "💡 **Let's fix your AI provider setup:**\n\n"
            "1️⃣  **Check your current configuration:**\n"
            "   /config\n\n"
            "2️⃣  **Configure or update your API key:**\n"
            "   /config provider openai  (for OpenAI)\n"
            "   /config provider deepseek  (for DeepSeek)\n\n"
            "3️⃣  **Select a model:**\n"
            "   /config model\n\n"
            "4️⃣  **Then try asking your question again!**",
            "response",
        )

    def _handle_provider_error(self, user_input: str, error: Exception) -> None:
        """Handle provider errors with specific guidance."""
        self.output(
            f"🧠 I understand you want to learn about: {user_input}\n\n"
            f"🔌 **Provider Connection Issue**\n"
            f"❌ **Details**: {str(error)}\n\n"
            "💡 **Let's fix your provider connection:**\n\n"
            "1️⃣  **Check your internet connection**\n"
            "2️⃣  **Verify provider status** (is the service up?)\n"
            "3️⃣  **Update your API key:**\n"
            "   /config provider openai\n\n"
            "4️⃣  **Try a different provider** if the issue persists",
            "response",
        )

    def _handle_command_error(self, command: str, error_message: str) -> None:
        """Handle command errors with intelligent suggestions."""
        # Try to provide "Did you mean?" suggestions
        suggestion = self._get_command_suggestion(command)

        if suggestion:
            self.output(
                f"❌ Unknown command: {command}\n"
                f"💡 **Did you mean:** {suggestion}\n\n"
                f"📋 **Available commands:**\n"
                f"   /help    - Show all available commands\n"
                f"   /config  - Configure AI provider\n"
                f"   /clear   - Clear screen\n"
                f"   /quit    - Exit application",
                "error"
            )
        else:
            self.output(f"❌ {error_message}", "error")

    def _handle_unexpected_command_error(self, command: str, error: Exception) -> None:
        """Handle unexpected command errors with specific guidance."""
        error_str = str(error).lower()

        # Provide specific guidance based on error type
        if "authentication" in error_str or "api key" in error_str:
            self.output(
                f"❌ **Authentication Error** for command: {command}\n\n"
                f"💡 **Fix your API configuration:**\n"
                f"   1. Check your API key: /config\n"
                f"   2. Reconfigure provider: /config provider openai\n"
                f"   3. Verify API key is valid and has credits",
                "error"
            )
        elif "connection" in error_str or "network" in error_str:
            self.output(
                f"❌ **Connection Error** for command: {command}\n\n"
                f"💡 **Check your connection:**\n"
                f"   1. Verify internet connectivity\n"
                f"   2. Check if AI provider service is operational\n"
                f"   3. Try again in a few moments",
                "error"
            )
        elif "timeout" in error_str:
            self.output(
                f"❌ **Timeout Error** for command: {command}\n\n"
                f"💡 **Request timed out:**\n"
                f"   1. Try the command again\n"
                f"   2. Check your internet speed\n"
                f"   3. Use /config to verify provider settings",
                "error"
            )
        else:
            self.output(
                f"❌ **Command Error**: {command}\n"
                f"🔍 **Details**: {str(error)}\n\n"
                f"💡 **Try these commands:**\n"
                f"   /help    - See available commands\n"
                f"   /config  - Check your configuration\n"
                f"   /clear   - Clear the screen",
                "error"
            )

    def _get_command_suggestion(self, command: str) -> Optional[str]:
        """Get command suggestion using fuzzy matching."""

        # Remove leading slash and normalize
        command_name = command.lstrip('/').lower()

        # Available commands for matching
        available_commands = [
            "help", "config", "clear", "quit", "exit",
            "tokens", "checkpoint", "context", "compress",
            "learn", "quiz", "progress", "personalize", "achievements"
        ]

        # Find close matches
        matches = difflib.get_close_matches(command_name, available_commands, n=1, cutoff=0.6)

        if matches:
            return f"/{matches[0]}"

        # Check for partial matches
        for cmd in available_commands:
            if cmd.startswith(command_name) or command_name in cmd:
                return f"/{cmd}"

        return None

    def _handle_unexpected_error(self, user_input: str, error: Exception) -> None:
        """Handle unexpected errors with actionable guidance."""
        self.output(
            f"🧠 I understand you want to learn about: {user_input}\n\n"
            f"🔧 **Unexpected Issue Encountered**\n"
            f"❌ **Error Details**: {str(error)}\n\n"
            "💡 **Here's what you can do:**\n\n"
            "1️⃣  **Try these commands to diagnose:**\n"
            "   /config                    # Check configuration\n"
            "   /help                     # See available commands\n\n"
            "2️⃣  **Reconfigure your AI provider:**\n"
            "   /config provider openai\n\n"
            "3️⃣  **The application will continue working!**\n"
            "   Commands like /help, /clear, /checkpoint always work.",
            "response",
        )

    def get_session_info(self) -> Dict[str, Any]:
        """
        Get current session information.

        Returns:
            Dictionary with session information
        """
        return {
            "active": self.state.session_active,
            "provider": self.state.current_provider,
            "model": self.state.current_model,
            "history_length": len(self.state.conversation_history),
            "config": {"theme": self.config.get("ui.theme"), "show_tokens": self.config.get("ui.show_token_usage")},
        }

    async def start_session(self) -> None:
        """Start the CLI session with minimal redundant messaging."""
        # Load default provider/model from config (silently)
        self.state.current_provider = self.config.get("ai.default_provider")
        self.state.current_model = self.config.get("ai.default_model")

        # Only show provider/model info if different from what's displayed in main welcome
        # This avoids redundant information since main.py already shows welcome panel

    async def run_interactive_loop(self) -> None:
        """Run the main interactive CLI loop with Ctrl+C cancellation support."""
        await self.start_session()

        # Use patch_stdout for proper prompt-toolkit integration (like official example)
        with patch_stdout():
            try:
                while self.state.session_active:
                    try:
                        # Use enhanced prompt - let get_user_input handle the prompt
                        user_input = await self.get_user_input()
                        should_continue = await self.process_input(user_input)
                        self.state.session_active = should_continue
                    except KeyboardInterrupt:
                        # Check if we're currently streaming and cancel if so
                        if self._streaming_cancelled is False:
                            self.output("\n⏹️ Cancelling response...", "info")
                            self.cancel_streaming()
                            continue
                        else:
                            self.output("\n👋 Goodbye!", "response")
                            break
                    except EOFError:
                        break
            except Exception as e:
                self.logger.error(f"Error in interactive loop: {e}")
                self.output(f"\n❌ Unexpected error: {str(e)}", "error")
        
    def stop_session(self) -> None:
        """Stop the CLI session."""
        self.state.session_active = False
        self.output("Session ended.", "info")

    @log_function_call("cli_interface")
    async def _initialize_ai(self) -> bool:
        """
        Initialize AI provider and model from configuration.

        Supports custom model IDs - users can specify any model ID
        and the system will attempt to use it exactly as specified.

        Returns:
            True if initialization successful

        Raises:
            ValidationError: If configuration is missing required fields
            AuthenticationError: If API key is invalid
            ProviderRegistrationError: If provider initialization fails
            ModelNotFoundError: If specified model is not available
        """
        provider_name = self.config.get("ai.default_provider")
        api_key = self.config.get(f"ai.providers.{provider_name}.api_key")
        model_name = self.config.get("ai.default_model", "gpt-3.5-turbo")

        self.logger.info(f"Initializing AI: provider={provider_name}, model={model_name}")

        # Configuration validation - raise specific errors
        if not provider_name:
            raise ValidationError("default_provider", None, "Provider name is required")
        if not api_key:
            raise AuthenticationError(provider_name, "API key is required")

        # Provider initialization
        config = ProviderConfig(name=provider_name, api_key=api_key)
        self._ai_provider = ModelFactory.get_provider_instance(config)

        if not self._ai_provider:
            raise ProviderRegistrationError(provider_name, "Failed to create provider instance")

        self.logger.info(f"Provider created: {provider_name}")

        # Model discovery - first try available models with timeout
        try:
            models = await asyncio.wait_for(
                self._ai_provider.list_available_models(), timeout=5.0  # 5 second timeout for model discovery
            )
            self.logger.info(f"Model discovery completed for {provider_name}")
        except asyncio.TimeoutError:
            self.logger.warning(f"Model discovery timed out, creating custom model: {model_name}")
            # If model discovery times out, try custom model directly
            self._ai_model = self._ai_provider.create_chat_model(model_name)
            return True

        # Handle both dict and object formats for backward compatibility
        chat_models = models.get("chat", []) if isinstance(models, dict) else models.chat
        self.logger.info(f"Found {len(chat_models)} available chat models")

        for model in chat_models:
            if model.model_id == model_name:
                self._ai_model = model
                self.logger.info(f"Model found and initialized: {model_name}")
                return True

        # Model not found in available list - try custom model creation
        # This enables experimental/custom model usage per architecture
        try:
            self.logger.info(f"Creating custom model: {model_name}")
            self._ai_model = self._ai_provider.create_chat_model(model_name)
            return True
        except NotImplementedError:
            # Provider doesn't support custom models
            raise ModelNotFoundError(model_name, provider_name)

    async def _get_ai_response_streaming(self, user_input: str) -> Dict[str, Any]:
        """
        Get streaming AI response for user input.

        Args:
            user_input: User's input

        Returns:
            Dict with success status and stream generator or response
        """
        if not self._ai_provider or not self._ai_model:
            self.logger.info("AI not initialized, starting initialization")
            # Try to initialize if not already done
            try:
                await self._initialize_ai()
            except (ValidationError, AuthenticationError, ProviderRegistrationError, ModelNotFoundError) as e:
                self.logger.error(f"AI initialization failed: {e}")
                return {"success": False, "error": str(e)}

        try:
            self.logger.info(f"Starting streaming request to AI model: {self._ai_model.model_id}")

            # Get personalized system prompt if enabled
            if self.state.should_adapt_response():
                system_content = self.state.get_personalized_system_prompt(user_input)
            else:
                system_content = "You are Learning Catalyst, an AI learning companion. Explain concepts clearly and provide helpful examples."

            # Build message list
            messages = [
                Message(role="system", content=system_content),
            ]

            # Add conversation history for context
            history = self.state.conversation_history[-6:]  # Keep last 6 messages
            for msg in history:
                messages.append(Message(role=msg["role"], content=msg["content"]))

            messages.append(Message(role="user", content=user_input))

            # Check if we should enable thinking for ChatGLM models
            enable_thinking = self.state.current_provider == "chatglm"

            # Start streaming - await the coroutine to get the actual response
            response = await self._ai_model.send_message(
                messages,
                temperature=0.7,
                max_tokens=2000,  # Increased for longer responses
                stream=True,
                enable_thinking=enable_thinking
            )

            self.logger.info(f"Streaming started successfully")
            return {"success": True, "stream": response}

        except Exception as e:
            self.logger.error(f"Error starting streaming: {e}")
            return {"success": False, "error": str(e)}

    async def _get_ai_response_fallback(self, user_input: str) -> Dict[str, Any]:
        """
        Fallback to non-streaming response if streaming fails.

        Args:
            user_input: User's input

        Returns:
            Dict with success status and content
        """
        try:
            self.logger.info("Using fallback non-streaming response")

            # Use the existing non-streaming method
            response = await self._get_ai_response(user_input)

            if response["success"]:
                # Output using the new non-boxed format
                self._output_ai_response(response["content"])

            return response

        except Exception as e:
            self.logger.error(f"Fallback response also failed: {e}")
            return {"success": False, "error": str(e)}

    async def _get_ai_response(self, user_input: str) -> Dict[str, Any]:
        """Get AI response for user input (fallback method)."""
        if not self._ai_provider or not self._ai_model:
            self.logger.info("AI not initialized, starting initialization")
            # Try to initialize if not already done
            try:
                await self._initialize_ai()
            except (ValidationError, AuthenticationError, ProviderRegistrationError, ModelNotFoundError) as e:
                self.logger.error(f"AI initialization failed: {e}")
                return {"success": False, "error": str(e)}

        try:
            self.logger.info(f"Sending request to AI model: {self._ai_model.model_id}")

            # Get personalized system prompt if enabled
            if self.state.should_adapt_response():
                system_content = self.state.get_personalized_system_prompt(user_input)
            else:
                system_content = "You are Learning Catalyst, an AI learning companion. Explain concepts clearly and provide helpful examples."

            # Add timeout to prevent hanging (reduced from 10 seconds)
            messages = [
                Message(
                    role="system",
                    content=system_content,
                ),
            ]

            # Add conversation history for context
            history = self.state.conversation_history[-6:]  # Keep last 6 messages
            for msg in history:
                messages.append(Message(role=msg["role"], content=msg["content"]))

            messages.append(Message(role="user", content=user_input))

            # Reduced timeout for non-streaming fallback
            response = await asyncio.wait_for(
                self._ai_model.send_message(messages, temperature=0.7, max_tokens=800), timeout=30.0
            )

            self.logger.info(f"AI response received successfully")
            return {"success": True, "content": response.content, "model": response.model, "usage": response.usage}

        except asyncio.TimeoutError:
            self.logger.error("AI response timeout")
            raise  # Re-raise to let the conversation handler catch it
        except (ProviderError, ValidationError) as e:
            self.logger.error(f"Provider error during AI request: {e}")
            raise  # Re-raise to let the conversation handler catch it
        except Exception as e:
            self.logger.error(f"Unexpected error during AI request: {e}")
            raise  # Re-raise to let the conversation handler catch it

    async def _show_learning_suggestions(self, user_input: str, ai_response: str) -> None:
        """Show contextual learning suggestions based on the conversation."""
        # Get personalized suggestions if available
        if self.state.should_adapt_response():
            personalized_suggestions = self.state.get_personalized_suggestions(user_input)
        else:
            personalized_suggestions = []

        # Also generate contextual suggestions as fallback
        suggestions = []
        user_lower = user_input.lower()

        # Topic-based suggestions
        if any(word in user_lower for word in ["explain", "what is", "how does", "define"]):
            suggestions.extend([
                "💡 Ask for examples: 'Can you give me a real-world example?'",
                "🔍 Go deeper: 'How does this relate to [topic]?'",
                "📝 Test yourself: 'Quiz me on this concept'"
            ])

        if any(word in user_lower for word in ["code", "programming", "python", "javascript"]):
            suggestions.extend([
                "💻 Practice: 'Show me a code example'",
                "🐛 Debug: 'What's wrong with this code?'",
                "🏗️ Build: 'Help me create a simple project'"
            ])

        if any(word in user_lower for word in ["learn", "study", "understand", "master"]):
            suggestions.extend([
                "📚 Structure learning: 'Create a learning plan for [topic]'",
                "🎯 Set goals: 'What should I learn next?'",
                "📊 Track progress: 'How can I measure my understanding?'"
            ])

        # Combine personalized and contextual suggestions
        all_suggestions = personalized_suggestions + suggestions

        # Show suggestions if we have any
        if all_suggestions:
            if personalized_suggestions:
                self.output("\n🎯 **Personalized Learning Suggestions:**", "info")
            else:
                self.output("\n🎯 **Learning Suggestions:**", "info")

            for suggestion in all_suggestions[:3]:  # Show max 3 suggestions
                self.output(f"   {suggestion}", "info")
            self.output("", "info")  # Empty line for spacing

        # Show personalization prompt for first-time users
        if self.state.first_time_user and len(self.state.conversation_history) >= 3:
            self.output("🔧 **Want more personalized suggestions?** Try: /personalize setup", "info")

    async def _extract_and_track_concepts(self, user_input: str, ai_response: str) -> None:
        """Extract and track learned concepts from the conversation."""
        # Start a learning session if not already active
        if not self.state.current_session:
            session_id = str(uuid.uuid4())[:8]
            self.state.start_learning_session(session_id)

        # Simple concept extraction based on conversation content
        content = (user_input + " " + ai_response).lower()

        # Programming concepts
        programming_concepts = [
            "variable", "function", "class", "method", "loop", "conditional", "array", "list",
            "dictionary", "algorithm", "data structure", "object oriented", "inheritance",
            "polymorphism", "recursion", "api", "framework", "library", "debugging"
        ]

        # Computer science concepts
        cs_concepts = [
            "artificial intelligence", "machine learning", "neural network", "algorithm",
            "data structure", "complexity", "big o notation", "sorting", "searching",
            "database", "sql", "web development", "frontend", "backend", "full stack"
        ]

        # Track identified concepts
        concepts_found = []
        for concept in programming_concepts + cs_concepts:
            if concept in content and concept not in [node.name for node in self.state.knowledge_nodes.values()]:
                concepts_found.append(concept)
                # Determine category
                if concept in programming_concepts:
                    category = "programming"
                else:
                    category = "computer science"

                # Track the concept
                self.state.track_concept_learned(concept, category)

        # If we found concepts, provide feedback
        if concepts_found:
            concepts_text = ", ".join(concepts_found[:3])  # Show first 3
            self.output(f"🎯 **Concepts Tracked:** {concepts_text}", "info")