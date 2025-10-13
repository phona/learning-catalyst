"""
CLI interface abstraction for Learning Catalyst.

Simple interface for handling user interactions and command processing.
"""

from abc import ABC, abstractmethod
from typing import Optional, Callable, Dict, Any, List

from ..core.config import ConfigManager
from ..core.models import Message, ProviderConfig
from ..core.exceptions import (
    ProviderError, ValidationError, AuthenticationError,
    ModelNotFoundError, ProviderRegistrationError
)
from ..ai.factory import ModelFactory
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

    def output(self, message: str, output_type: str = "response") -> None:
        """
        Output a message to the user.

        Args:
            message: Message to output
            output_type: Type of output
        """
        handler = self._output_handlers.get(output_type)
        if handler:
            handler(message)
        else:
            print(message)  # Default fallback

    async def get_user_input(self, prompt: str = "") -> str:
        """
        Get input from the user.

        Args:
            prompt: Optional prompt to display

        Returns:
            User input string
        """
        if self._input_handler:
            return await self._input_handler(prompt)
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
        if self.state.user_input.lower() in ['/quit', '/exit', 'quit', 'exit']:
            return False

        # Process commands
        if self.state.user_input.startswith('/'):
            await self._handle_command(self.state.user_input)
        else:
            # Handle regular conversation input
            await self._handle_conversation_input(self.state.user_input)

        return True

    async def _handle_command(self, command: str) -> None:
        """
        Handle slash commands.

        Args:
            command: Command string starting with /
        """
        try:
            result = await self.command_processor.process_command(
                command,
                self.config,
                self.state
            )

            if result.success:
                self.output(result.message, "response")
                if result.data:
                    self.output(str(result.data), "info")
            else:
                self.output(f"❌ {result.message}", "error")

        except Exception as e:
            self.output(f"❌ Error processing command: {str(e)}", "error")

    async def _handle_conversation_input(self, user_input: str) -> None:
        """
        Handle regular conversation input.

        Args:
            user_input: User's conversational input
        """
        # Add to conversation history
        self.state.add_to_history("user", user_input)

        # Try to get AI response
        response = await self._get_ai_response(user_input)

        if response["success"]:
            self.output(response["content"], "response")
            self.state.add_to_history("assistant", response["content"])
        else:
            # Fallback to setup message if AI not configured
            self.output(
                f"🧠 I understand you want to learn about: {user_input}\n\n"
                "💡 To get AI-powered responses, please configure an AI provider first:\n"
                "  • Use '/config provider openai' to set up OpenAI\n"
                "  • Or '/config provider deepseek' for DeepSeek\n"
                "  • Then ask me anything naturally!",
                "response"
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
            "config": {
                "theme": self.config.get("ui.theme"),
                "show_tokens": self.config.get("ui.show_token_usage")
            }
        }

    async def start_session(self) -> None:
        """Start the CLI session."""
        self.output("🚀 Welcome to Learning Catalyst!", "response")
        self.output("Type '/help' for available commands or '/quit' to exit.", "info")

        # Load default provider/model from config
        self.state.current_provider = self.config.get("ai.default_provider")
        self.state.current_model = self.config.get("ai.default_model")

        if self.state.current_provider:
            self.output(f"Using provider: {self.state.current_provider}", "info")
        if self.state.current_model:
            self.output(f"Using model: {self.state.current_model}", "info")

    async def run_interactive_loop(self) -> None:
        """Run the main interactive CLI loop."""
        await self.start_session()

        while self.state.session_active:
            try:
                user_input = await self.get_user_input("🧠 ")
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

        # Model discovery - first try available models
        models = await self._ai_provider.list_available_models()
        for model in models.chat:
            if model.model_id == model_name:
                self._ai_model = model
                return True

        # Model not found in available list - try custom model creation
        # This enables experimental/custom model usage per architecture
        try:
            self._ai_model = self._ai_provider.create_chat_model(model_name)
            return True
        except NotImplementedError:
            # Provider doesn't support custom models
            raise ModelNotFoundError(model_name, provider_name)

    async def _get_ai_response(self, user_input: str) -> Dict[str, Any]:
        """Get AI response for user input."""
        if not self._ai_provider or not self._ai_model:
            # Try to initialize if not already done
            try:
                await self._initialize_ai()
            except (ValidationError, AuthenticationError, ProviderRegistrationError, ModelNotFoundError) as e:
                return {"success": False, "error": str(e)}

        try:
            messages = [
                Message(role="system", content="You are Learning Catalyst, an AI learning companion. Explain concepts clearly and provide helpful examples."),
            ]

            # Add conversation history for context
            history = self.state.conversation_history[-6:]  # Keep last 6 messages
            for msg in history:
                messages.append(Message(role=msg["role"], content=msg["content"]))

            messages.append(Message(role="user", content=user_input))

            response = await self._ai_model.send_message(messages, temperature=0.7, max_tokens=800)

            return {
                "success": True,
                "content": response.content,
                "model": response.model,
                "usage": response.usage
            }

        except (ProviderError, ValidationError) as e:
            return {"success": False, "error": str(e)}
        except Exception as e:
            return {"success": False, "error": f"AI request failed: {str(e)}"}