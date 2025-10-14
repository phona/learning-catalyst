"""
CLI interface abstraction for Learning Catalyst.

Simple interface for handling user interactions and command processing.
"""

import asyncio
from abc import ABC, abstractmethod
from typing import Any, Callable, Dict, List, Optional
import difflib

from ..ai.factory import ModelFactory
from ..core.config import ConfigManager
from ..core.exceptions import AuthenticationError, ModelNotFoundError, ProviderError, ProviderRegistrationError, ValidationError
from ..core.logging import get_logger, log_function_call
from ..core.models import Message, ProviderConfig
from .commands import CommandProcessor
from .state import CLIState


class CLIInterface:
    """Main CLI interface for Learning Catalyst."""

    def __init__(self, config_manager: ConfigManager):
        """
        Initialize CLI interface.

        Args:
            config_manager: Configuration manager instance
        """
        self.config = config_manager
        self.command_processor = CommandProcessor()
        self.state = CLIState()
        self._output_handlers: Dict[str, Callable] = {}
        self._input_handler: Optional[Callable] = None
        self.logger = get_logger("cli_interface")

        # AI provider for Phase 1.2
        self._ai_provider = None
        self._ai_model = None

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
        from rich.panel import Panel
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
        Format and output AI response with Rich text formatting and visual separation.

        Args:
            content: AI response content
        """
        from rich.markdown import Markdown
        from rich.panel import Panel
        from rich.text import Text

        provider = self.state.current_provider or "unknown"
        model = self.state.current_model or "unknown"

        # Create Rich panel with markdown content
        title = Text(f"🤖 AI Response ({provider}:{model})", style="bold blue")
        panel = Panel(Markdown(content), title=title, border_style="blue", padding=(1, 2))

        # Use the rich_panel output handler if available, otherwise fallback to response
        if "rich_panel" in self._output_handlers:
            self.output(panel, "rich_panel")
        else:
            # Fallback: try to use response handler
            self.output(str(panel), "response")

    def get_user_input(self, prompt: str = "") -> str:
        """
        Get input from the user.

        Args:
            prompt: Optional prompt to display

        Returns:
            User input string
        """
        if self._input_handler:
            return self._input_handler(prompt)
        else:
            return input(prompt)  # Default fallback

    async def process_input(self, user_input: str) -> bool:
        """
        Process user input and handle commands.

        Args:
            user_input: Raw user input

        Returns:
            True if session should continue, False if should exit
        """
        self.state.user_input = user_input.strip()

        if not self.state.user_input:
            return True

        # Check for exit commands
        if self.state.user_input.lower() in ["/quit", "/exit", "quit", "exit"]:
            return False

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

        Args:
            user_input: User's conversational input
        """
        self.logger.info(f"Processing user input: {user_input[:50]}...")

        # Add to conversation history
        self.state.add_to_history("user", user_input)

        # Show typing indicator and progress feedback
        typing_task = asyncio.create_task(self._show_typing_indicator())

        try:
            # Try to get AI response with proper exception handling
            response = await self._get_ai_response_with_progress(user_input)

            # Cancel typing indicator
            typing_task.cancel()
            try:
                await typing_task
            except asyncio.CancelledError:
                pass

            if response["success"]:
                # SUCCESS PATH: Clean AI response output only
                self._output_ai_response(response["content"])
                self.state.add_to_history("assistant", response["content"])
                self.logger.info("AI response successful")

                # Extract and track learned concepts
                await self._extract_and_track_concepts(user_input, response["content"])

                # Show additional helpful suggestions
                await self._show_learning_suggestions(user_input, response["content"])
            else:
                # AI response failed but didn't throw exception
                error_msg = response.get("error", "Unknown error")
                self.logger.error(f"AI response failed: {error_msg}")
                self._handle_ai_error(user_input, error_msg)

        except asyncio.TimeoutError:
            # Handle timeout specifically
            self.logger.error("AI response timeout")
            self._handle_timeout_error(user_input)
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

    def _handle_timeout_error(self, user_input: str) -> None:
        """Handle timeout errors with specific guidance."""
        self.output(
            f"🧠 I understand you want to learn about: {user_input}\n\n"
            f"⏰ **AI Response Timed Out**\n"
            "💡 **Possible solutions:**\n"
            "  • Check your internet connection\n"
            "  • Verify your API key is valid\n"
            "  • Try a shorter question\n"
            "  • Use '/config' to check your provider setup",
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
        import difflib

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
        """Run the main interactive CLI loop."""
        await self.start_session()

        while self.state.session_active:
            try:
                user_input = self.get_user_input("🧠 ")
                should_continue = await self.process_input(user_input)
                self.state.session_active = should_continue
            except KeyboardInterrupt:
                self.output("\n👋 Goodbye!", "response")
                break
            except EOFError:
                break

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

    async def _get_ai_response(self, user_input: str) -> Dict[str, Any]:
        """Get AI response for user input."""
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

            # Add timeout to prevent hanging
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

            # Add timeout wrapper to prevent hanging
            response = await asyncio.wait_for(
                self._ai_model.send_message(messages, temperature=0.7, max_tokens=800), timeout=10.0  # 10 second timeout
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

    async def _show_typing_indicator(self) -> None:
        """Show animated typing indicator while AI is thinking."""
        import sys
        import time

        indicators = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]
        i = 0

        try:
            while True:
                # Print indicator with carriage return
                sys.stdout.write(f"\r🤖 AI is thinking{indicators[i]} ")
                sys.stdout.flush()
                i = (i + 1) % len(indicators)
                await asyncio.sleep(0.1)
        except asyncio.CancelledError:
            # Clean up the indicator line
            sys.stdout.write("\r" + " " * 30 + "\r")
            sys.stdout.flush()

    async def _get_ai_response_with_progress(self, user_input: str) -> Dict[str, Any]:
        """Get AI response with progress feedback."""
        self.output("🔍 Analyzing your question...", "info")

        if not self._ai_provider or not self._ai_model:
            self.logger.info("AI not initialized, starting initialization")
            try:
                await self._initialize_ai()
            except (ValidationError, AuthenticationError, ProviderRegistrationError, ModelNotFoundError) as e:
                self.logger.error(f"AI initialization failed: {e}")
                return {"success": False, "error": str(e)}

        try:
            self.logger.info(f"Sending request to AI model: {self._ai_model.model_id}")
            self.output("📚 Searching knowledge base...", "info")

            # Get personalized system prompt if enabled
            if self.state.should_adapt_response():
                system_content = self.state.get_personalized_system_prompt(user_input)
                self.output("🎯 Adapting to your learning style...", "info")
            else:
                system_content = "You are Learning Catalyst, an AI learning companion. Explain concepts clearly and provide helpful examples."

            # Add timeout to prevent hanging
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

            self.output("✨ Generating personalized response...", "info")

            # Add timeout wrapper to prevent hanging
            response = await asyncio.wait_for(
                self._ai_model.send_message(messages, temperature=0.7, max_tokens=800), timeout=10.0  # 10 second timeout
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
            import uuid
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