"""
Configuration command handlers
"""

import json
from typing import Any, Dict, List

from .base import BaseCommandHandler, CommandInfo


class ConfigurationCommandHandler(BaseCommandHandler):
    """Handler for configuration-related commands"""

    def get_commands(self) -> List[CommandInfo]:
        """Return list of configuration commands"""
        return [
            CommandInfo(
                name="set-config",
                description="Configure AI provider and model",
                aliases=["config"],
                category="Configuration",
            ),
            CommandInfo(
                name="models",
                description="List available AI models",
                aliases=["m"],
                category="Configuration",
            ),
            CommandInfo(
                name="preference",
                description="Manage application preferences",
                aliases=["pref"],
                usage="/preference [list|set] [key] [value]",
                category="Configuration",
            ),
        ]

    def _set_config_command(self, args: List[str], context: Dict[str, Any]) -> None:
        """Handler for the set-config command"""
        try:
            # Import required modules inside the handler to avoid circular imports
            from src.ai.service import ModelAbstractionService

            # Get available providers from ModelAbstractionService
            ai_service = ModelAbstractionService()
            providers = list(ai_service.providers.keys())

            self._display_message("Available providers: " + ", ".join(providers))
            self._display_message("💡 Tip: Press Ctrl+C to cancel and return to main prompt")

            # Select provider with Ctrl+C handling
            try:
                while True:
                    try:
                        provider = self._safe_input("Select provider").lower()
                        if provider in providers:
                            break
                        self._display_message(
                            f"Invalid provider. Please select from: {', '.join(providers)}"
                        )
                    except KeyboardInterrupt:
                        self._display_message("❌ Configuration cancelled. Returning to main prompt.")
                        return
            except KeyboardInterrupt:
                self._display_message("❌ Configuration cancelled. Returning to main prompt.")
                return

            # Get API key if needed with Ctrl+C handling
            api_key = None
            if provider != "local":
                try:
                    api_key = self._safe_input(f"Enter API key for {provider}")
                    if api_key:
                        # Save API key
                        self.context.preferences_manager.set_preference(f"ai.{provider}_api_key", api_key)
                        self._display_message(f"✅ API key saved for {provider}")
                except KeyboardInterrupt:
                    self._display_message("❌ Configuration cancelled. Returning to main prompt.")
                    return

            # For local models, we don't need an API key
            if provider == "local":
                self._display_message("Note: For local models, make sure your local server is running.")

            # Select model with Ctrl+C handling
            # In a real implementation, we would dynamically fetch available models from the provider
            # For now, we'll provide some common model examples
            model_examples = {
                "openai": ["gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"],
                "anthropic": ["claude-3-opus", "claude-3-sonnet", "claude-3-haiku"],
                "chatglm": ["chatglm3-6b", "chatglm4-9b"],
                "siliconflow": ["Qwen/Qwen2-7B-Instruct", "deepseek-ai/deepseek-v2-chat"],
                "deepseek": ["deepseek-chat", "deepseek-coder"],
                "local": ["llama3", "mistral", "phi3"],
            }

            examples = model_examples.get(provider, [])
            if examples:
                self._display_message(f"Suggested models for {provider}: {', '.join(examples)}")

            try:
                model = self._safe_input("Enter model name")
            except KeyboardInterrupt:
                self._display_message("❌ Configuration cancelled. Returning to main prompt.")
                return

            # Save configuration
            self.context.preferences_manager.set_preference("ai.default_provider", provider)
            self.context.preferences_manager.set_preference("ai.default_model", model)

            # Update the existing provider with the new API key if provided
            if api_key:
                ai_service = ModelAbstractionService()
                ai_service.update_provider_api_key(provider, api_key)

            self._display_message(f"Configuration saved: {provider}/{model}")

        except KeyboardInterrupt:
            self._display_message("❌ Configuration cancelled. Returning to main prompt.")
        except Exception as e:
            self._display_error("Error configuring provider", str(e))

    def _models_command(self, args: List[str], context: Dict[str, Any]) -> None:
        """Handler for the models command"""
        try:
            # Import required modules inside the handler to avoid circular imports
            from src.cli.system_commands_handler import SystemCommandsHandlerImpl
            import asyncio

            # Create system commands handler and get models
            system_handler = SystemCommandsHandlerImpl(
                self.context.db_manager, None, self.context.preferences_manager
            )

            # Get available models
            available_models = asyncio.run(system_handler.list_available_models())

            if available_models:
                content = "📋 Available AI Models:\n\n"

                # Group models by provider
                providers = {}
                for model in available_models:
                    provider = model["provider"]
                    if provider not in providers:
                        providers[provider] = []
                    providers[provider].append(model)

                # Display models grouped by provider
                for provider, models in providers.items():
                    content += f"🔹 {provider.upper()}:\n"
                    for model in models:
                        marker = "⭐" if model.get("is_default") else "  "
                        content += f"  {marker} {model['model']}\n"
                        if model.get("description"):
                            content += f"     {model['description']}\n"
                    content += "\n"

                content += "💡 Use /set-config to change your AI provider and model"
            else:
                content = "📋 No models configured. Please set up your AI provider first using /set-config"

            self._display_message(content)

        except Exception as e:
            self._display_error("Error retrieving models", str(e))

    def _preference_command(self, args: List[str], context: Dict[str, Any]) -> None:
        """Handler for the preference command"""
        try:
            # Import required modules inside the handler to avoid circular imports
            from src.cli.system_commands_handler import SystemCommandsHandlerImpl
            import asyncio

            # Create system commands handler
            system_handler = SystemCommandsHandlerImpl(
                self.context.db_manager, None, self.context.preferences_manager
            )

            if not args:
                content = "Usage: /preference [list|set] [key] [value]\n"
                content += "Examples:\n"
                content += "  /preference list\n"
                content += "  /preference set learning.style advanced\n"
                content += "  /preference set ui.theme dark"
                self._display_message(content)
                return

            action = args[0].lower()

            if action == "list":
                # List all preferences
                preferences = asyncio.run(system_handler.list_preferences())
                
                content = "📋 Current Preferences:\n\n"
                if preferences:
                    for key, value in preferences.items():
                        content += f"• {key}: {value}\n"
                else:
                    content += "No preferences set."
                
                self._display_message(content)

            elif action == "set":
                if len(args) < 3:
                    content = "Error: Key and value required for set operation\n"
                    content += "Usage: /preference set <key> <value>"
                    self._display_message(content)
                    return

                key = args[1]
                value_str = " ".join(args[2:])

                # Try to parse value as JSON first, then as basic types
                try:
                    value = json.loads(value_str)
                except json.JSONDecodeError:
                    # Try to parse as number
                    try:
                        if "." in value_str:
                            value = float(value_str)
                        else:
                            value = int(value_str)
                    except ValueError:
                        # Check for boolean
                        if value_str.lower() in ("true", "false"):
                            value = value_str.lower() == "true"
                        else:
                            # Keep as string
                            value = value_str

                # Set the preference
                success = asyncio.run(system_handler.set_preference(key, value))

                if success:
                    content = f"✅ Preference '{key}' set to '{value}'"
                else:
                    content = f"❌ Failed to set preference '{key}'"
                
                self._display_message(content)

            else:
                content = f"Unknown action: {action}. Use 'list' or 'set'."
                self._display_message(content)

        except Exception as e:
            self._display_error("Error managing preferences", str(e))