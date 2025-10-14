"""
Command processing for Learning Catalyst CLI.

Handles slash commands and their execution.
"""

from abc import ABC, abstractmethod
from typing import Optional, Dict, Any, List
from dataclasses import dataclass
from datetime import datetime
import re

from ..core.config import ConfigManager
from .state import CLIState, LearningStyle, ResponseFormat
from ..core.exceptions import (
    ValidationError, AuthenticationError, ProviderRegistrationError,
    ModelNotFoundError, ProviderError
)
from ..core.models import ProviderConfig
from ..ai.factory import ModelFactory
from rich.console import Console



@dataclass
class CommandResult:
    """Result of command execution."""
    success: bool
    message: str
    data: Optional[Any] = None


class Command(ABC):
    """Base class for CLI commands."""

    def __init__(self, name: str, description: str):
        self.name = name
        self.description = description

    @abstractmethod
    async def execute(
        self,
        args: List[str],
        config: ConfigManager,
        state: CLIState
    ) -> CommandResult:
        """
        Execute the command.

        Args:
            args: Command arguments
            config: Configuration manager
            state: CLI state

        Returns:
            CommandResult with execution result
        """
        pass


class CommandGroup(Command):
    """A command that contains subcommands and manages help text."""

    def __init__(self, name: str, description: str, category: str = "General"):
        super().__init__(name, description)
        self.category = category
        self._subcommands: Dict[str, Command] = {}

    def register_subcommand(self, command: Command) -> None:
        """Register a subcommand."""
        self._subcommands[command.name] = command

    def get_subcommand(self, name: str) -> Optional[Command]:
        """Get a subcommand by name."""
        return self._subcommands.get(name)

    async def execute(
        self,
        args: List[str],
        config: ConfigManager,
        state: CLIState
    ) -> CommandResult:
        """Execute a subcommand or show help."""
        if not args:
            return self._show_help()

        subcommand_name = args[0]
        subcommand = self.get_subcommand(subcommand_name)

        if not subcommand:
            available = ", ".join(self._subcommands.keys())
            return CommandResult(
                False,
                f"Unknown subcommand '{subcommand_name}'. Available: {available}"
            )

        return await subcommand.execute(args[1:], config, state)

    def _show_help(self) -> CommandResult:
        """Show help for this command group."""
        if not self._subcommands:
            return CommandResult(True, f"/{self.name} - {self.description}")

        help_text = f"📋 {self.description}:\n\n"
        for subcommand in self._subcommands.values():
            help_text += f"  /{self.name} {subcommand.name} - {subcommand.description}\n"

        return CommandResult(True, help_text)




class ConfigProviderCommand(Command):
    """Provider configuration command."""

    def __init__(self):
        super().__init__("provider", "Manage AI provider configuration")

    async def execute(
        self,
        args: List[str],
        config: ConfigManager,
        state: CLIState
    ) -> CommandResult:
        if not args:
            return self._show_providers(config)

        if args[0] == "show" and len(args) >= 2:
            return self._show_provider_details(config, args[1])
        elif len(args) == 1:
            return await self._configure_provider(config, args[0])
        else:
            return CommandResult(False, "Invalid provider command format. Use: /config provider [name] [show]")

    def _show_providers(self, config: ConfigManager) -> CommandResult:
        """Show available providers."""
        providers = config.get("ai.providers", {})
        current_provider = config.get("ai.default_provider", "None")

        if not providers:
            return CommandResult(True, "📊 No AI providers configured. Use '/config provider [name]' to add one.")

        output = "📊 Available AI Providers:\n"
        for name, details in providers.items():
            status = "✅" if name == current_provider else "○"
            has_key = "✅" if details.get("api_key") else "❌"
            output += f"{status} {name}" + (" (current)" if name == current_provider else "")
            output += f" - API Key: {has_key}\n"

        return CommandResult(True, output)

    def _show_provider_details(self, config: ConfigManager, provider_name: str) -> CommandResult:
        """Show detailed provider information."""
        providers = config.get("ai.providers", {})
        if provider_name not in providers:
            return CommandResult(False, f"Provider '{provider_name}' not configured")

        provider_config = providers[provider_name]
        output = f"📊 {provider_name.title()} Provider Details:\n"
        output += f"Provider: {provider_name}\n"
        output += f"Status: ✅ Configured\n"
        output += f"API Base URL: {provider_config.get('base_url', 'Default')}\n"
        output += f"API Key: {'✅ Configured' if provider_config.get('api_key') else '❌ Missing'}\n"

        return CommandResult(True, output)

    async def _configure_provider(self, config: ConfigManager, provider_name: str) -> CommandResult:
        """Provider configuration with clear instructions."""
        output = f"🔧 **{provider_name.title()} Provider Configuration**\n\n"

        # Show API key URLs
        api_urls = {
            "openai": "https://platform.openai.com/api-keys",
            "deepseek": "https://platform.deepseek.com",
            "chatglm": "https://open.bigmodel.cn",
            "siliconflow": "https://siliconflow.cn"
        }

        if provider_name in api_urls:
            output += f"📝 **Step 1: Get API Key**\n"
            output += f"   Visit: {api_urls[provider_name]}\n"
            output += f"   Generate and copy your API key\n\n"

        output += f"📝 **Step 2: Set API Key**\n"
        output += f"   Use the command below with your actual API key:\n\n"
        output += f"   `set ai.providers.{provider_name}.api_key YOUR_API_KEY`\n\n"

        output += f"📝 **Step 3: Set as Default**\n"
        output += f"   Use: `set ai.default_provider {provider_name}`\n\n"

        output += f"💡 **Example Commands:**\n"
        output += f"   ```\n"
        output += f"   set ai.providers.{provider_name}.api_key sk-your-actual-api-key-here\n"
        output += f"   set ai.default_provider {provider_name}\n"
        output += f"   ```\n\n"

        output += f"🎯 **Next Steps:**\n"
        output += f"   • After setting API key, use '/config model' to select a model\n"
        output += f"   • You can use ANY valid model ID with {provider_name.title()}\n"
        output += f"   • Try: /config model gpt-4o (for OpenAI) or /config model deepseek-chat\n\n"

        output += f"⚠️ **Note:** The configuration system uses direct setting commands\n"
        output += f"   rather than interactive prompts for better scriptability and control."

        return CommandResult(True, output)


class ConfigModelCommand(Command):
    """Model configuration command."""

    def __init__(self):
        super().__init__("model", "Manage AI model configuration")

    async def execute(
        self,
        args: List[str],
        config: ConfigManager,
        state: CLIState
    ) -> CommandResult:
        if not args:
            return await self._show_models(config)
        elif len(args) == 1:
            return self._set_model(config, args[0])
        else:
            return CommandResult(False, "Invalid model command format. Use: /config model [name]")

    async def _show_models(self, config: ConfigManager) -> CommandResult:
        """Enhanced model selection with custom model ID support (non-interactive)."""
        current_model = config.get("ai.default_model", "None")
        current_provider = config.get("ai.default_provider", "None")
        providers = config.get("ai.providers", {})

        if not providers:
            return CommandResult(True, "🤖 No providers configured. Use '/config provider [name]' to add one.")

        # Get current provider's models
        if current_provider not in providers or not providers[current_provider].get("api_key"):
            return CommandResult(False, f"❌ Current provider '{current_provider}' not configured. Use '/config provider [name]' first.")

        output = f"🤖 **Model Selection for {current_provider.title()} Provider:**\n\n"

        try:
            provider_config = ProviderConfig(
                name=current_provider,
                api_key=providers[current_provider].get("api_key"),
                base_url=providers[current_provider].get("base_url")
            )

            provider = ModelFactory.get_provider_instance(provider_config)
            models = await provider.list_available_models()

            # Check if current model is custom
            is_custom_model = True
            model_list = []
            if models and models.get('chat'):
                model_list = list(models['chat'])
                is_custom_model = not any(model.model_id == current_model for model in model_list)

            # Show current custom model if set
            if is_custom_model and current_model != "None":
                output += f"✨ **Current Custom Model:**\n"
                output += f"   Currently set: {current_model} ✅\n\n"

            if models and models.get('chat'):
                # Display available models
                output += f"📋 **Available Models (for guidance):**\n\n"

                for i, model in enumerate(model_list, 1):
                    is_current = model.model_id == current_model
                    status = "✅" if is_current else "○"
                    output += f"[{i}] {model.model_id} {status}" + (" (current)" if is_current else "") + "\n"

                # Show custom model options
                output += f"\n✨ **Custom Model Options:**\n"
                output += f"[{len(model_list) + 1}] Enter custom model ID (experimental/beta models)\n\n"

                # Show custom model examples
                output += f"💡 **Custom Model Examples:**\n"
                if current_provider == "openai":
                    output += f"   /config model gpt-4o-2024-08-06        # Specific model version\n"
                    output += f"   /config model ft:gpt-4o:my-org:custom  # Fine-tuned model\n"
                    output += f"   /config model gpt-4o-audio-preview     # Preview/beta model\n"
                elif current_provider == "deepseek":
                    output += f"   /config model deepseek-coder-v2       # Specific version\n"
                    output += f"   /config model deepseek-chat-0320     # Date-specific model\n"
                elif current_provider in ["ollama", "localai"] or "localhost" in str(providers[current_provider].get("base_url", "")):
                    output += f"   /config model llama3.2:3b           # Specific size variant\n"
                    output += f"   /config model my-model:latest       # Your own model\n"
                    output += f"   /config model experimental:beta     # Experimental version\n"
                output += f"   /config model your-custom-model-name    # Any valid model ID\n\n"

                output += f"🎯 **How to Set Model:**\n"
                output += f"   Use any of these commands:\n\n"
                output += f"   **Select from listed models:**\n"
                for i, model in enumerate(model_list[:5], 1):  # Show first 5
                    output += f"   /config model {model.model_id}\n"
                if len(model_list) > 5:
                    output += f"   ... and {len(model_list) - 5} more models\n"

                output += f"\n   **Use any custom model ID:**\n"
                output += f"   /config model your-custom-model-name\n\n"

            else:
                # No models available or provider doesn't support model listing
                output += f"📋 **Model Configuration:**\n"
                output += f"Provider doesn't support model discovery or no models found.\n\n"
                output += f"💡 **You can set any model ID manually:**\n"
                if current_provider == "openai":
                    output += f"   /config model gpt-4o\n"
                    output += f"   /config model gpt-4-turbo\n"
                    output += f"   /config model ft:myorg:custom\n"
                else:
                    output += f"   /config model any-valid-model-id\n"
                output += f"\n"

            output += f"✨ **Any Model ID Works!**\n"
            output += f"The system will use exactly the model ID you specify.\n"
            output += f"Make sure the model exists and is accessible with your API key.\n\n"

            output += f"🔍 **Test Your Model:**\n"
            output += f"After setting a model, ask me a question to verify it works!"

            return CommandResult(True, output)

        except Exception as e:
            # On error, still allow manual model configuration
            output += f"❌ **Failed to load models from {current_provider}**\n"
            output += f"Error: {str(e)}\n\n"
            output += f"💡 **You can still set any model ID manually:**\n"
            output += f"   /config model [your-model-id]\n\n"

            return CommandResult(False, output)

    def _set_model(self, config: ConfigManager, model_name: str) -> CommandResult:
        """Set the active model - accepts any model ID with enhanced feedback."""
        config.set("ai.default_model", model_name)

        # Get provider context for better feedback
        current_provider = config.get("ai.default_provider", "Unknown")

        # Check if this looks like a special model type
        model_type = "custom"
        if model_name.startswith("ft:"):
            model_type = "fine-tuned"
        elif "preview" in model_name.lower() or "experimental" in model_name.lower():
            model_type = "preview/beta"
        elif any(x in model_name.lower() for x in ["gpt", "claude", "llama", "mistral", "qwen"]):
            # Could be official or still custom
            model_type = "specified"

        output = f"✅ **Custom Model Set: {model_name}**\n\n"
        output += f"🤖 **Model Configuration:**\n"
        output += f"   Provider: {current_provider}\n"
        output += f"   Model: {model_name} ({model_type})\n"
        output += f"   Status: Ready to use\n\n"

        output += f"💡 **Note:** The system will use exactly the model ID you specified.\n"
        output += f"   Make sure the model exists and is accessible with your API key.\n\n"

        if model_type == "fine-tuned":
            output += f"🎯 **Fine-Tuned Model:**\n"
            output += f"   Your fine-tuned model will follow its specialized training behavior.\n"
            output += f"   You can always switch back with: /config model {model_name}\n\n"
        elif model_type == "preview/beta":
            output += f"🔬 **Preview Model:**\n"
            output += f"   This appears to be a preview or experimental model.\n"
            output += f"   Expect potential changes and varying performance.\n\n"

        output += f"🔍 **Want to test it?** Ask me a question to verify the model works!"

        return CommandResult(True, output)


class ConfigSetupCommand(Command):
    """Setup wizard command for new users."""

    def __init__(self):
        super().__init__("setup", "Interactive setup wizard for new users")

    async def execute(
        self,
        args: List[str],
        config: ConfigManager,
        state: CLIState
    ) -> CommandResult:
        """Run the interactive setup wizard."""
        console = Console()

        output = "🚀 **Learning Catalyst Setup Wizard**\n\n"
        output += "Let's configure your AI provider step by step:\n\n"

        # Step 1: Provider selection with descriptions
        providers_info = {
            "openai": "Most popular, excellent general-purpose AI (GPT-4, GPT-3.5)",
            "deepseek": "Fast responses, cost-effective for coding tasks",
            "chatglm": "Strong reasoning capabilities, good for Chinese content",
            "siliconflow": "Multiple models in one API, good value",
            "openai-compatible": "Ollama, LocalAI, LM Studio, or custom endpoints"
        }

        console.print(output, style="bold blue")

        console.print("🎯 **Step 1: Choose AI Provider**\n", style="bold blue")
        for i, (provider, desc) in enumerate(providers_info.items(), 1):
            console.print(f"[{i}] {provider.title()}: {desc}")

        console.print(f"\n💡 Choose the provider that works best for you\n", style="dim")

        try:
            choice = input("Select provider [1-5]: ")
            choice_num = int(choice.strip())
            if not 1 <= choice_num <= 5:
                return CommandResult(False, "❌ Invalid selection. Please choose 1-5.")

            provider_list = list(providers_info.keys())
            selected_provider = provider_list[choice_num - 1]

            if selected_provider == "openai-compatible":
                return await self._setup_openai_compatible_provider(config, console)
            else:
                return await self._setup_standard_provider(config, console, selected_provider)

        except (ValueError, KeyboardInterrupt):
            return CommandResult(False, "❌ Invalid selection. Please enter a number.")

    async def _setup_standard_provider(self, config: ConfigManager, console, provider_name: str) -> CommandResult:
        """Setup standard AI provider."""
        console.print(f"\n🚀 **Step 2: Configure {provider_name.title()}**\n", style="bold blue")
        console.print(f"Get your API key from:", style="blue")

        api_urls = {
            "openai": "https://platform.openai.com/api-keys",
            "deepseek": "https://platform.deepseek.com",
            "chatglm": "https://open.bigmodel.cn",
            "siliconflow": "https://siliconflow.cn"
        }

        console.print(f"   {api_urls.get(provider_name, 'your provider dashboard')}\n", style="dim")

        try:
            api_key = input("Enter your API key: ")

            if not api_key.strip():
                return CommandResult(False, "❌ API key is required for provider configuration")

            # Store the API key and set as default provider
            config.set(f"ai.providers.{provider_name}.api_key", api_key.strip())
            config.set("ai.default_provider", provider_name)

            console.print(f"\n🚀 **Step 3: Testing Connection**\n", style="bold blue")
            console.print(f"🔍 Validating API key...", style="blue")

            # Test the configuration
            try:
                from ..ai.factory import ModelFactory
                from ..core.models import ProviderConfig

                provider_config = ProviderConfig(
                    name=provider_name,
                    api_key=api_key.strip()
                )

                provider = ModelFactory.get_provider_instance(provider_config)
                if provider:
                    console.print(f"✅ API key validated successfully!", style="bold green")
                    console.print(f"📡 Testing connection...", style="blue")
                    console.print(f"🤖 Fetching available models...", style="blue")

                    # Try to get models
                    try:
                        models = await provider.list_available_models()
                        if models and models.get('chat'):
                            console.print(f"✅ Found {len(models.chat)} available models!", style="bold green")
                        else:
                            console.print(f"ℹ️  No models found, but you can use custom model IDs", style="yellow")
                    except:
                        console.print(f"ℹ️  Could not fetch models, but you can use custom model IDs", style="yellow")

                    console.print(f"\n🚀 **Step 4: First Model Setup**\n", style="bold blue")
                    console.print(f"✅ **{provider_name.title()} Provider Configured!** 🎉\n", style="bold green")
                    console.print(f"💡 Next step: Use '/config model' to select your preferred model", style="blue")
                    console.print(f"✨ You can use ANY valid model ID with {provider_name.title()}!", style="yellow")
                    console.print(f"   Example: /config model gpt-4o\n", style="dim")

                    return CommandResult(True, f"✅ {provider_name.title()} provider configured successfully!")
                else:
                    return CommandResult(False, f"❌ Failed to initialize {provider_name} provider")

            except Exception as validation_error:
                return CommandResult(False, f"❌ Provider validation failed: {str(validation_error)}")

        except (ValueError, KeyboardInterrupt):
            return CommandResult(False, "❌ Setup cancelled by user.")

    async def _setup_openai_compatible_provider(self, config: ConfigManager, console) -> CommandResult:
        """Setup OpenAI-compatible provider."""
        console.print(f"\n🚀 **Step 2: Configure OpenAI-Compatible Provider**\n", style="bold blue")

        # Popular local services
        console.print(f"📋 **Popular Local Services:**\n", style="blue")
        local_services = {
            "1": ("Ollama", "http://localhost:11434/v1", False),
            "2": ("LocalAI", "http://localhost:8080/v1", False),
            "3": ("LM Studio", "http://localhost:1234/v1", False),
            "4": ("FastChat", "http://localhost:8000/v1", False),
            "5": ("Custom", "", True)
        }

        for num, (name, url, _) in local_services.items():
            console.print(f"[{num}] {name} - {url}")

        console.print(f"\nSelect service [1-5]: ", style="bold")
        try:
            service_choice = input("").strip()
            if service_choice not in local_services:
                return CommandResult(False, "❌ Invalid selection. Please choose 1-5.")

            service_name, default_url, is_custom = local_services[service_choice]

            if is_custom:
                console.print(f"\n📝 **Custom Provider Configuration:**\n", style="bold blue")
                provider_name = input("Provider name (e.g., 'local-ai', 'custom-groq'): ").strip()
                if not provider_name:
                    return CommandResult(False, "❌ Provider name is required")

                console.print(f"🔗 **API Endpoint Configuration:**\n", style="bold blue")
                console.print(f"Default: http://localhost:8080/v1\n", style="dim")
                base_url = input("Enter URL [press Enter for default]: ").strip()
                if not base_url:
                    base_url = "http://localhost:8080/v1"
            else:
                provider_name = service_name.lower()
                base_url = default_url

            console.print(f"\n🔑 **API Key Configuration:**\n", style="bold blue")
            console.print(f"API Key: (Optional for local providers)\n", style="dim")
            api_key = input("Enter API key [press Enter to skip]: ").strip()
            if not api_key:
                api_key = "not-required"

            # Store the configuration
            config.set(f"ai.providers.{provider_name}.api_key", api_key)
            config.set(f"ai.providers.{provider_name}.base_url", base_url)
            config.set("ai.default_provider", provider_name)

            console.print(f"\n🚀 **Step 3: Testing Connection**\n", style="bold blue")
            console.print(f"🔍 Validating endpoint...", style="blue")

            # Test the configuration
            try:
                from ..ai.factory import ModelFactory
                from ..core.models import ProviderConfig

                provider_config = ProviderConfig(
                    name=provider_name,
                    api_key=api_key if api_key != "not-required" else None,
                    base_url=base_url
                )

                provider = ModelFactory.get_provider_instance(provider_config)
                if provider:
                    console.print(f"✅ Endpoint configured successfully!", style="bold green")
                    console.print(f"📡 Testing connection...", style="blue")
                    console.print(f"🤖 Fetching available models...", style="blue")

                    # Try to get models
                    try:
                        models = await provider.list_available_models()
                        if models and models.get('chat'):
                            console.print(f"✅ Found {len(models.chat)} available models!", style="bold green")
                        else:
                            console.print(f"ℹ️  No models found, but you can use custom model IDs", style="yellow")
                    except:
                        console.print(f"ℹ️  Could not fetch models, but you can use custom model IDs", style="yellow")

                    console.print(f"\n✅ **{provider_name.title()} Provider Configured!** 🎉\n", style="bold green")
                    console.print(f"💡 Next step: Use '/config model' to select your preferred model", style="blue")
                    console.print(f"✨ You can use ANY valid model ID with {provider_name.title()}!", style="yellow")

                    return CommandResult(True, f"✅ {provider_name.title()} provider configured successfully!")
                else:
                    return CommandResult(False, f"❌ Failed to initialize {provider_name} provider")

            except Exception as validation_error:
                console.print(f"\n❌ **Configuration Failed**\n", style="red")
                console.print(f"Error: {str(validation_error)}\n", style="dim")
                console.print(f"💡 **Check:**\n", style="blue")
                console.print(f"   • Is {provider_name} running?\n")
                console.print(f"   • Is the URL correct: {base_url}\n")
                console.print(f"   • Any firewalls blocking the connection?")

                return CommandResult(False, f"❌ Provider validation failed: {str(validation_error)}")

        except (ValueError, KeyboardInterrupt):
            return CommandResult(False, "❌ Setup cancelled by user.")


class ConfigCommand(CommandGroup):
    """Configuration command group."""

    def __init__(self):
        super().__init__("config", "Manage configuration", "Configuration")
        self.register_subcommand(ConfigProviderCommand())
        self.register_subcommand(ConfigModelCommand())
        self.register_subcommand(ConfigSetupCommand())

    async def execute(
        self,
        args: List[str],
        config: ConfigManager,
        state: CLIState
    ) -> CommandResult:
        if not args:
            return self._show_all_config(config)

        # Check if it's a subcommand
        subcommand = self.get_subcommand(args[0])
        if subcommand:
            return await subcommand.execute(args[1:], config, state)

        # Handle simple config setting
        if len(args) == 1:
            return self._show_config_section(config, args[0])
        elif len(args) == 2:
            return self._set_config_value(config, args[0], args[1])
        else:
            return CommandResult(False, "Invalid config command format")

    def _show_all_config(self, config: ConfigManager) -> CommandResult:
        """Show enhanced configuration discovery interface."""
        all_config = config.get_all()

        if not isinstance(all_config, dict):
            return self._show_empty_config_interface()

        # Check if user has any AI providers configured
        providers = config.get("ai.providers", {})
        if not providers:
            return self._show_first_time_setup_interface()

        # Show current configuration with available options
        return self._show_config_dashboard(config, all_config)

    def _show_empty_config_interface(self) -> CommandResult:
        """Show configuration interface for users with no setup."""
        output = "⚙️ **Configuration Options:**\n\n"

        output += "🚀 **Quick Setup (Recommended)**\n"
        output += "   setup              - Interactive setup wizard for new users\n\n"

        output += "🤖 **AI Configuration:**\n"
        output += "   provider [name]    - Configure AI provider (openai, deepseek, chatglm, siliconflow)\n"
        output += "   model              - Select AI model after provider is configured\n\n"

        output += "🔧 **OpenAI-Compatible Providers:**\n"
        output += "   ollama             - Local models via Ollama\n"
        output += "   localai            - LocalAI server\n"
        output += "   [custom-name]      - Your OpenAI-compatible endpoint\n\n"

        output += "🎨 **Interface Settings:**\n"
        output += "   theme [name]       - Set color theme (light, dark, auto)\n"
        output += "   show-tokens [bool] - Show/hide token usage (true/false)\n\n"

        output += "🔧 **Advanced Options:**\n"
        output += "   proxy              - Configure proxy settings\n"
        output += "   timeout [seconds]  - Set request timeout\n"
        output += "   validate-all       - Check all configuration\n\n"

        output += "💡 **Usage Examples:**\n"
        output += "   /config setup           # Start guided setup\n"
        output += "   /config provider openai # Configure OpenAI\n"
        output += "   /config provider ollama # Configure Ollama locally\n"
        output += "   /config theme dark      # Set dark theme\n\n"

        output += "🎯 **New to Learning Catalyst?**\n"
        output += "   Use '/config setup' for guided configuration!"

        return CommandResult(True, output)

    def _show_first_time_setup_interface(self) -> CommandResult:
        """Show setup interface for first-time users."""
        output = "🚀 **Welcome to Learning Catalyst!**\n\n"
        output += "Let's get you configured with AI providers. Choose your setup method:\n\n"

        output += "1️⃣ **Quick Setup Wizard** (Recommended)\n"
        output += "   We'll guide you step-by-step through provider configuration\n"
        output += "   → /config setup\n\n"

        output += "2️⃣ **Manual Provider Configuration**\n"
        output += "   Choose and configure your AI provider manually\n\n"

        output += "🤖 **Available AI Providers:**\n"
        providers_info = {
            "openai": "Most popular, excellent general-purpose AI (GPT-4, GPT-3.5)",
            "deepseek": "Fast responses, cost-effective for coding tasks",
            "chatglm": "Strong reasoning capabilities, good for Chinese content",
            "siliconflow": "Multiple models in one API, good value"
        }

        for i, (provider, desc) in enumerate(providers_info.items(), 1):
            output += f"   [{i}] {provider.title()}: {desc}\n"

        output += f"\n🔧 **OpenAI-Compatible Options:**\n"
        output += f"   Ollama, LocalAI, LM Studio, FastChat, or any custom endpoint\n"
        output += f"   Use '/config provider [name]' for any compatible service\n\n"

        output += f"💡 **Quick Start Commands:**\n"
        output += f"   /config setup                    # Start guided setup\n"
        output += f"   /config provider openai          # Configure OpenAI directly\n"
        output += f"   /config provider ollama          # Configure Ollama locally\n"
        output += f"   /config provider custom-name     # Configure custom endpoint\n\n"

        output += f"✨ **Custom Model Support:**\n"
        output += f"   Any provider supports custom model IDs!\n"
        output += f"   Use: /config model [any-model-id]\n\n"

        output += f"✅ **What happens next?**\n"
        output += f"   1. Configure your preferred AI provider\n"
        output += f"   2. Select a model (any valid model ID works)\n"
        output += f"   3. Start learning with AI assistance!"

        return CommandResult(True, output)

    def _show_config_dashboard(self, config: ConfigManager, all_config: Dict) -> CommandResult:
        """Show configuration dashboard with current status and options."""
        current_provider = config.get("ai.default_provider", "Not configured")
        current_model = config.get("ai.default_model", "Not configured")

        output = "⚙️ **Configuration Dashboard:**\n\n"

        # Current AI Configuration Status
        output += "🤖 **AI Configuration Status:**\n"
        if current_provider != "Not configured":
            output += f"   Provider: {current_provider.title()} ✅\n"
            output += f"   Model: {current_model} ✅\n"
        else:
            output += f"   Provider: Not configured ❌\n"
            output += f"   Model: Not configured ❌\n"
        output += "\n"

        # Configuration Categories
        output += "📋 **Configuration Categories:**\n\n"

        # AI Configuration
        output += "🤖 **AI Configuration:**\n"
        output += "   provider [name]     - Change AI provider\n"
        output += "   model               - Select AI model\n"
        if current_provider != "Not configured":
            output += "   daily-limit [num]   - Set daily token limit\n"
            output += "   cost-alert [amt]    - Set cost alert threshold\n"
        output += "\n"

        # Custom Model Support
        output += "🔧 **Custom Model Support:**\n"
        output += "   ✨ **Any Model ID:** You can set any valid model ID\n"
        output += "   • Official models: gpt-4o, gpt-4-turbo, deepseek-chat, etc.\n"
        output += "   • Fine-tuned models: ft:org-name:model-name\n"
        output += "   • Preview/beta models: gpt-4o-preview, experimental variants\n"
        output += "   • Custom models: any-experimental-model, your-model-name\n\n"

        # OpenAI-Compatible Settings
        has_openai_compatible = any("openai_compatible" in str(v) or "base_url" in str(v) for v in all_config.values())
        if has_openai_compatible or current_provider not in ["openai", "deepseek", "chatglm", "siliconflow"]:
            output += "🔌 **OpenAI-Compatible Settings:**\n"
            output += "   custom-url [url]    - Set custom API endpoint\n"
            output += "   api-key [key]       - Update API key for compatible provider\n"
            output += "   test-connection     - Test provider connectivity\n"
            output += "\n"

        # Interface Settings
        output += "🎨 **Interface Settings:**\n"
        theme = config.get("ui.theme", "auto")
        show_tokens = config.get("ui.show_token_usage", True)
        output += f"   theme [name]        - Set theme (current: {theme})\n"
        output += f"   show-tokens [bool]  - Show tokens (current: {show_tokens})\n"
        output += "   response-length     - Set response length\n"
        output += "\n"

        # Advanced Settings (only show if configured)
        has_advanced = any(key in str(all_config) for key in ["proxy", "timeout", "retries"])
        if has_advanced:
            output += "🔧 **Advanced Settings:**\n"
            output += "   proxy               - Configure proxy settings\n"
            output += "   timeout [seconds]   - Set request timeout\n"
            output += "   retries [count]     - Set retry attempts\n"
            output += "   validate-all        - Check all configuration\n\n"

        # Quick Actions
        output += "⚡ **Quick Actions:**\n"
        if current_provider != "Not configured":
            output += "   [1] Switch Provider    [2] Change Model\n"
            output += "   [3] Test Connection   [4] Edit Settings\n"
        else:
            output += "   [1] Configure Provider [2] Run Setup Wizard\n"
        output += "   [0] Exit Configuration\n\n"

        # Help and Examples
        output += "💡 **Usage Examples:**\n"
        output += "   /config provider openai      # Switch to OpenAI\n"
        output += "   /config provider ollama      # Use Ollama locally\n"
        output += "   /config theme light          # Switch to light theme\n"
        output += "   /config show-tokens false    # Hide token usage\n"
        if current_provider != "Not configured":
            output += "   /config model                # See available models\n"
            output += "   /config model your-custom-model  # Use any model ID\n"
        output += "\n"

        output += "📖 **Help:**\n"
        output += "   Use '/config [section]' to see detailed configuration\n"
        output += "   Use '/help' to see all available commands"

        return CommandResult(True, output)

    def _show_config_section(self, config: ConfigManager, section: str) -> CommandResult:
        """Show specific configuration section."""
        section_config = config.get_section(section)
        if not section_config:
            return CommandResult(False, f"Configuration section '{section}' not found")

        output = f"⚙️ {section.upper()} Configuration:\n"
        for key, value in section_config.items():
            if "api_key" not in key.lower():
                output += f"  {key}: {value}"

        return CommandResult(True, output)

    def _set_config_value(self, config: ConfigManager, key: str, value: str) -> CommandResult:
        """Set a configuration value."""
        try:
            # Convert value to appropriate type
            if value.lower() in ("true", "false"):
                value = value.lower() == "true"
            elif value.isdigit():
                value = int(value)
            elif "." in value and value.replace(".", "").isdigit():
                value = float(value)

            config.set(key, value)
            return CommandResult(True, f"✅ Set {key} = {value}")
        except Exception as e:
            return CommandResult(False, f"❌ Failed to set {key}: {str(e)}")


class ClearCommand(Command):
    """Clear screen command."""

    def __init__(self):
        super().__init__("clear", "Clear the terminal screen")

    async def execute(
        self,
        args: List[str],
        config: ConfigManager,
        state: CLIState
    ) -> CommandResult:
        import os
        os.system('cls' if os.name == 'nt' else 'clear')
        return CommandResult(True, "Screen cleared")


class TokenUsageCommand(Command):
    """Token usage statistics command."""

    def __init__(self):
        super().__init__("tokens", "Show token usage statistics")

    async def execute(
        self,
        args: List[str],
        config: ConfigManager,
        state: CLIState
    ) -> CommandResult:
        # This would integrate with actual token tracking
        # For now, return placeholder data
        usage_data = {
            "total_tokens": 0,
            "prompt_tokens": 0,
            "completion_tokens": 0,
            "total_cost": 0.0,
            "requests_today": 0
        }

        output = "💰 Token Usage Statistics:\n"
        for key, value in usage_data.items():
            output += f"  {key.replace('_', ' ').title()}: {value}\n"

        return CommandResult(True, output, usage_data)


class CheckpointCommand(Command):
    """Session checkpoint management command."""

    def __init__(self):
        super().__init__("checkpoint", "Manage learning session checkpoints")

    async def execute(
        self,
        args: List[str],
        config: ConfigManager,
        state: CLIState
    ) -> CommandResult:
        if not args:
            return self._list_checkpoints()
        elif args[0] == "save":
            return self._save_checkpoint(config, state, args[1:] if len(args) > 1 else None)
        elif args[0] == "load":
            if len(args) < 2:
                return CommandResult(False, "Usage: /checkpoint load [name]")
            return self._load_checkpoint(config, state, args[1])
        else:
            return CommandResult(False, "Usage: /checkpoint [save [name]|load [name]]")

    def _list_checkpoints(self) -> CommandResult:
        """List all available checkpoints."""
        # For Phase 1 MVP, just show placeholder
        output = "📋 Available Checkpoints:\n"
        output += "  (No checkpoints found yet)\n"
        output += "   Use '/checkpoint save [name]' to create your first checkpoint!"

        return CommandResult(True, output)

    def _save_checkpoint(self, config: ConfigManager, state: CLIState, name_args: Optional[List[str]]) -> CommandResult:
        """Save current session as checkpoint."""
        if name_args:
            # Use provided name
            checkpoint_name = " ".join(name_args)
        else:
            # Auto-generate name with timestamp
            timestamp = datetime.now().strftime("%Y-%m-%d_%H%M%S")
            checkpoint_name = f"checkpoint_{timestamp}"

        # For Phase 1 MVP, just show success message
        # In future phases, this would save conversation history, context, etc.
        output = f"✅ Checkpoint saved: {checkpoint_name}"

        # Store checkpoint in state for this session
        if not hasattr(state, 'checkpoints'):
            state.checkpoints = {}
        state.checkpoints[checkpoint_name] = {
            "created_at": datetime.now().isoformat(),
            "conversation_history": state.conversation_history.copy()
        }

        return CommandResult(True, output)

    def _load_checkpoint(self, config: ConfigManager, state: CLIState, checkpoint_name: str) -> CommandResult:
        """Load a saved checkpoint."""
        if not hasattr(state, 'checkpoints') or checkpoint_name not in state.checkpoints:
            return CommandResult(False, f"❌ Checkpoint '{checkpoint_name}' not found")

        # For Phase 1 MVP, just show success message
        # In future phases, this would restore conversation history, context, etc.
        checkpoint_data = state.checkpoints[checkpoint_name]
        state.conversation_history = checkpoint_data.get("conversation_history", []).copy()

        output = f"🔄 Checkpoint loaded: {checkpoint_name}"
        return CommandResult(True, output)


class ContextCommand(Command):
    """Context management and analysis command."""

    def __init__(self):
        super().__init__("context", "Manage conversation context and memory")

    async def execute(
        self,
        args: List[str],
        config: ConfigManager,
        state: CLIState
    ) -> CommandResult:
        if not args:
            return self._show_context_info(state)
        elif args[0] == "clear":
            return self._clear_context(state)
        elif args[0] == "analyze":
            return self._analyze_context(state)
        else:
            return CommandResult(False, "Usage: /context [clear|analyze]")

    def _show_context_info(self, state: CLIState) -> CommandResult:
        """Show current context usage and information."""
        history_count = len(state.conversation_history)

        # Calculate estimated token usage (rough estimate: ~4 tokens per word)
        total_words = sum(len(msg.get("content", "").split()) for msg in state.conversation_history)
        estimated_tokens = total_words * 4

        # Get recent topics from conversation
        recent_topics = []
        for msg in state.conversation_history[-5:]:
            content = msg.get("content", "").lower()
            # Simple topic extraction
            if any(word in content for word in ["python", "javascript", "code", "programming"]):
                recent_topics.append("💻 Programming")
            elif any(word in content for word in ["explain", "what is", "define", "concept"]):
                recent_topics.append("🧠 Concept Learning")
            elif any(word in content for word in ["help", "how to", "fix", "problem"]):
                recent_topics.append("🔧 Problem Solving")

        # Remove duplicates and limit
        recent_topics = list(set(recent_topics))[:3]

        output = "🧩 **Conversation Context Analysis:**\n\n"
        output += f"📊 **Memory Usage:**\n"
        output += f"   • Messages: {history_count}/50 (max)\n"
        output += f"   • Estimated tokens: {estimated_tokens:,}\n"
        output += f"   • Memory efficiency: {'✅ Good' if history_count < 40 else '⚠️ High'}\n\n"

        if recent_topics:
            output += f"🏷️  **Recent Topics:** {', '.join(recent_topics)}\n\n"

        output += f"💡 **Context Management:**\n"
        output += f"   • Use '/compress' to optimize memory\n"
        output += f"   • Use '/context clear' to reset conversation\n"
        output += f"   • Use '/context analyze' for detailed analysis"

        return CommandResult(True, output)

    def _clear_context(self, state: CLIState) -> CommandResult:
        """Clear conversation context."""
        cleared_count = len(state.conversation_history)
        state.clear_history()

        output = f"🧹 **Context Cleared:**\n\n"
        output += f"   • Removed {cleared_count} messages from memory\n"
        output += f"   • Conversation history reset\n"
        output += f"   • AI context will start fresh\n\n"
        output += f"💡 Ready for a fresh learning session!"

        return CommandResult(True, output)

    def _analyze_context(self, state: CLIState) -> CommandResult:
        """Perform detailed context analysis."""
        if not state.conversation_history:
            return CommandResult(True, "🔍 **Context Analysis:** No conversation history to analyze")

        # Analyze conversation patterns
        user_messages = [msg for msg in state.conversation_history if msg["role"] == "user"]
        ai_messages = [msg for msg in state.conversation_history if msg["role"] == "assistant"]

        # Calculate average message length
        user_avg_len = sum(len(msg.get("content", "")) for msg in user_messages) // len(user_messages) if user_messages else 0
        ai_avg_len = sum(len(msg.get("content", "")) for msg in ai_messages) // len(ai_messages) if ai_messages else 0

        # Identify learning patterns
        questions_asked = sum(1 for msg in user_messages if "?" in msg.get("content", ""))
        concepts_discussed = len(set(msg.get("content", "").lower().split() for msg in user_messages))

        output = "🔍 **Detailed Context Analysis:**\n\n"
        output += f"📈 **Conversation Statistics:**\n"
        output += f"   • Total messages: {len(state.conversation_history)}\n"
        output += f"   • User messages: {len(user_messages)}\n"
        output += f"   • AI responses: {len(ai_messages)}\n"
        output += f"   • Questions asked: {questions_asked}\n"
        output += f"   • Unique concepts: {concepts_discussed}\n\n"

        output += f"📏 **Message Length Analysis:**\n"
        output += f"   • Avg user message: {user_avg_len} characters\n"
        output += f"   • Avg AI response: {ai_avg_len} characters\n"
        output += f"   • Detail level: {'🎯 Focused' if ai_avg_len < 500 else '📚 Comprehensive'}\n\n"

        output += f"🎯 **Learning Patterns:**\n"
        if questions_asked > len(user_messages) * 0.5:
            output += f"   • ❓ High inquiry rate - excellent learning approach!\n"
        if ai_avg_len > 300:
            output += f"   • 📖 Detailed explanations being provided\n"
        if concepts_discussed > 20:
            output += f"   • 🌟 Diverse topic exploration\n"

        return CommandResult(True, output)


class CompressCommand(Command):
    """Conversation compression and optimization command."""

    def __init__(self):
        super().__init__("compress", "Compress conversation to optimize memory and context")

    async def execute(
        self,
        args: List[str],
        config: ConfigManager,
        state: CLIState
    ) -> CommandResult:
        if not state.conversation_history:
            return CommandResult(True, "💬 **Compression:** No conversation to compress")

        original_count = len(state.conversation_history)

        # Perform intelligent compression
        compressed_history = self._intelligent_compress(state.conversation_history)
        state.conversation_history = compressed_history

        compression_ratio = (original_count - len(compressed_history)) / original_count * 100

        output = f"🗜️  **Conversation Compressed:**\n\n"
        output += f"   • Original messages: {original_count}\n"
        output += f"   • Compressed to: {len(compressed_history)}\n"
        output += f"   • Memory saved: {compression_ratio:.1f}%\n\n"

        if compression_ratio > 30:
            output += f"✅ **Excellent compression!** Key concepts preserved.\n"
        elif compression_ratio > 15:
            output += f"✅ **Good compression!** Context optimized.\n"
        else:
            output += f"ℹ️  **Light compression** - conversation already efficient.\n"

        output += f"\n💡 **What was preserved:**\n"
        output += f"   • Recent questions and answers\n"
        output += f"   • Key concepts and definitions\n"
        output += f"   • Code examples and important details"

        return CommandResult(True, output)

    def _intelligent_compress(self, history: List[Dict[str, str]]) -> List[Dict[str, str]]:
        """Intelligently compress conversation history while preserving key information."""
        if len(history) <= 10:
            return history  # Not enough to compress

        compressed = []

        # Always keep the most recent 6 messages
        recent_messages = history[-6:]
        compressed.extend(recent_messages)

        # From older messages, keep important ones
        older_messages = history[:-6]

        # Keep first message (often sets context)
        if older_messages:
            compressed.insert(0, older_messages[0])

        # Look for key conceptual messages in the middle
        for msg in older_messages[1:]:
            content = msg.get("content", "").lower()

            # Keep messages that contain important indicators
            if any(indicator in content for indicator in [
                "define", "explain", "what is", "how does", "example",
                "important", "key concept", "remember", "summary",
                "python", "javascript", "code", "function", "class"
            ]) and len(msg.get("content", "")) > 50:
                compressed.insert(-6, msg)  # Insert before recent messages

        # Remove duplicates while preserving order
        seen = set()
        unique_compressed = []
        for msg in compressed:
            content_hash = msg.get("content", "")[:100]  # Hash first 100 chars
            if content_hash not in seen:
                seen.add(content_hash)
                unique_compressed.append(msg)

        return unique_compressed


class LearnCommand(Command):
    """Interactive learning mode command."""

    def __init__(self):
        super().__init__("learn", "Start interactive learning mode with progress tracking")

    async def execute(
        self,
        args: List[str],
        config: ConfigManager,
        state: CLIState
    ) -> CommandResult:
        if not args:
            return self._start_learning_session(state)
        elif args[0] == "mode":
            return self._set_learning_mode(state, args[1:] if len(args) > 1 else [])
        elif args[0] == "topic":
            return self._set_learning_topic(state, args[1:] if len(args) > 1 else [])
        else:
            return self._start_topic_learning(state, " ".join(args))

    def _start_learning_session(self, state: CLIState) -> CommandResult:
        """Start a new learning session."""
        import uuid
        session_id = str(uuid.uuid4())[:8]
        state.start_learning_session(session_id)

        output = f"🎓 **Interactive Learning Session Started!**\n\n"
        output += f"📚 **Session ID:** {session_id}\n"
        output += f"🎯 **Mode:** {state.learning_mode.title()}\n"
        output += f"📝 **Status:** Ready to learn!\n\n"

        output += f"💡 **Learning Commands:**\n"
        output += f"   • /learn [topic] - Start learning about a specific topic\n"
        output += f"   • /learn mode [exploration|quiz|practice] - Change learning mode\n"
        output += f"   • /quiz - Test your knowledge with AI-generated questions\n"
        output += f"   • /progress - View your learning progress\n\n"

        output += f"🚀 **Ready!** Ask me about any topic and I'll track your learning journey!"

        return CommandResult(True, output)

    def _set_learning_mode(self, state: CLIState, mode_args: List[str]) -> CommandResult:
        """Set the learning mode."""
        if not mode_args:
            current_modes = ["exploration", "quiz", "practice"]
            output = f"🎯 **Available Learning Modes:**\n\n"
            for mode in current_modes:
                is_current = "✅" if mode == state.learning_mode else "○"
                output += f"   {is_current} {mode.title()}\n"
            output += f"\n💡 Use: /learn mode [mode] to change your learning approach"
            return CommandResult(True, output)

        mode = mode_args[0].lower()
        if mode not in ["exploration", "quiz", "practice"]:
            return CommandResult(False, "❌ Invalid mode. Use: exploration, quiz, or practice")

        old_mode = state.learning_mode
        state.learning_mode = mode

        output = f"🎯 **Learning Mode Changed:**\n\n"
        output += f"   From: {old_mode.title()}\n"
        output += f"   To: {mode.title()}\n\n"

        if mode == "exploration":
            output += f"💡 **Exploration Mode:** Learn at your own pace with detailed explanations and examples."
        elif mode == "quiz":
            output += f"💡 **Quiz Mode:** Test your knowledge with AI-generated questions and instant feedback."
        elif mode == "practice":
            output += f"💡 **Practice Mode:** Apply your knowledge with hands-on exercises and real-world problems."

        return CommandResult(True, output)

    def _set_learning_topic(self, state: CLIState, topic_args: List[str]) -> CommandResult:
        """Set the current learning topic."""
        if not topic_args:
            return CommandResult(False, "❌ Please specify a topic: /learn topic [topic name]")

        topic = " ".join(topic_args)
        state.current_topic = topic

        output = f"📚 **Learning Topic Set:**\n\n"
        output += f"   🎯 Current Topic: {topic}\n"
        output += f"   📝 Mode: {state.learning_mode.title()}\n\n"
        output += f"💡 I'll now focus our conversations around {topic} and track your progress!"

        return CommandResult(True, output)

    def _start_topic_learning(self, state: CLIState, topic: str) -> CommandResult:
        """Start learning about a specific topic."""
        state.current_topic = topic
        if not state.current_session:
            import uuid
            session_id = str(uuid.uuid4())[:8]
            state.start_learning_session(session_id)

        output = f"🎓 **Starting Learning Session:**\n\n"
        output += f"📚 **Topic:** {topic}\n"
        output += f"🎯 **Mode:** {state.learning_mode.title()}\n"
        output += f"🆔 **Session:** {state.current_session.session_id}\n\n"
        output += f"💡 **Let's begin!** Ask me anything about {topic} and I'll help you master it."

        return CommandResult(True, output)


class QuizCommand(Command):
    """Interactive quiz command."""

    def __init__(self):
        super().__init__("quiz", "Generate and take AI-powered quizzes")

    async def execute(
        self,
        args: List[str],
        config: ConfigManager,
        state: CLIState
    ) -> CommandResult:
        if not args:
            return self._start_quiz(state)
        elif args[0] == "results":
            return self._show_quiz_results(state)
        elif args[0] == "practice":
            return self._practice_mode(state, args[1:] if len(args) > 1 else [])
        else:
            return self._topic_quiz(state, " ".join(args))

    def _start_quiz(self, state: CLIState) -> CommandResult:
        """Start a general quiz based on recent learning."""
        if not state.current_session:
            return CommandResult(False, "❌ Start a learning session first with /learn")

        topics = state.current_session.topics_covered
        if not topics:
            return CommandResult(False, "❌ No topics learned yet. Ask some questions first!")

        output = f"🎯 **Quiz Time!**\n\n"
        output += f"📚 **Based on your recent learning:**\n"
        for topic in topics[-5:]:  # Show last 5 topics
            output += f"   • {topic}\n"
        output += f"\n💡 **Quiz Options:**\n"
        output += f"   • /quiz - General quiz on all topics\n"
        output += f"   • /quiz [topic] - Quiz on specific topic\n"
        output += f"   • /quiz practice - Practice mode\n"
        output += f"   • /quiz results - Show your quiz history"

        return CommandResult(True, output)

    def _show_quiz_results(self, state: CLIState) -> CommandResult:
        """Show quiz results and statistics."""
        if not state.current_session or not state.current_session.quiz_scores:
            return CommandResult(True, "📊 **No quiz results yet.** Take a quiz to see your progress!")

        scores = state.current_session.quiz_scores
        avg_score = sum(scores) / len(scores)
        best_score = max(scores)
        total_quizzes = len(scores)

        output = f"📊 **Quiz Results:**\n\n"
        output += f"   🎯 Total Quizzes: {total_quizzes}\n"
        output += f"   📈 Average Score: {avg_score:.1%}\n"
        output += f"   🏆 Best Score: {best_score:.1%}\n"
        output += f"   📝 Recent Scores: {', '.join(f'{s:.1%}' for s in scores[-3:])}\n\n"

        if avg_score >= 0.8:
            output += f"🌟 **Excellent Progress!** You're mastering the material!"
        elif avg_score >= 0.6:
            output += f"✅ **Good Progress!** Keep practicing to improve."
        else:
            output += f"💪 **Keep Learning!** Review the material and try again."

        return CommandResult(True, output)

    def _practice_mode(self, state: CLIState, topic_args: List[str]) -> CommandResult:
        """Start practice mode for hands-on learning."""
        topic = " ".join(topic_args) if topic_args else state.current_topic

        if not topic:
            return CommandResult(False, "❌ Specify a topic: /quiz practice [topic]")

        output = f"💻 **Practice Mode:** {topic}\n\n"
        output += f"🎯 **Get ready for hands-on exercises!**\n\n"
        output += f"💡 **How it works:**\n"
        output += f"   1. I'll give you practical problems related to {topic}\n"
        output += f"   2. You'll solve them with my guidance\n"
        output += f"   3. We'll review solutions and best practices\n\n"
        output += f"🚀 **Let's start practicing!** I'll provide your first exercise when you're ready."

        return CommandResult(True, output)

    def _topic_quiz(self, state: CLIState, topic: str) -> CommandResult:
        """Start a quiz on a specific topic."""
        output = f"🎯 **Topic Quiz:** {topic}\n\n"
        output += f"📝 **Quiz Mode Activated!**\n\n"
        output += f"💡 **Instructions:**\n"
        output += f"   • I'll ask you questions about {topic}\n"
        output += f"   • Answer each question to test your knowledge\n"
        output += f"   • I'll provide instant feedback and explanations\n\n"
        output += f"🚀 **Ready?** Let's begin with your first question!"

        return CommandResult(True, output)


class ProgressCommand(Command):
    """Learning progress tracking command."""

    def __init__(self):
        super().__init__("progress", "View detailed learning progress and achievements")

    async def execute(
        self,
        args: List[str],
        config: ConfigManager,
        state: CLIState
    ) -> CommandResult:
        if not args:
            return self._show_overall_progress(state)
        elif args[0] == "topics":
            return self._show_topic_progress(state)
        elif args[0] == "achievements":
            return self._show_achievements(state)
        else:
            return CommandResult(False, "Usage: /progress [topics|achievements]")

    def _show_overall_progress(self, state: CLIState) -> CommandResult:
        """Show comprehensive learning progress."""
        progress = state.get_learning_progress()

        output = f"📊 **Learning Progress Dashboard:**\n\n"

        # Overall stats
        output += f"🎯 **Overall Statistics:**\n"
        output += f"   • Total Concepts: {progress['total_concepts']}\n"
        output += f"   • Mastered Concepts: {progress['mastered_concepts']}\n"
        output += f"   • Mastery Level: {progress['mastery_percentage']:.1f}%\n"
        output += f"   • Average Mastery: {progress['average_mastery']:.1f}%\n"
        output += f"   • Learning Streak: {progress['learning_streak']} days\n\n"

        # Category breakdown
        if progress['categories']:
            output += f"📚 **Learning Categories:**\n"
            for category, count in progress['categories'].items():
                output += f"   • {category.title()}: {count} concepts\n"
            output += f"\n"

        # Current session
        if progress['current_session']:
            session = progress['current_session']
            output += f"🎯 **Current Session:**\n"
            output += f"   • Questions Asked: {session['questions_asked']}\n"
            output += f"   • Concepts Learned: {session['concepts_learned']}\n"
            output += f"   • Total Interactions: {session['total_interactions']}\n"
            if session['quiz_count'] > 0:
                output += f"   • Quizzes Taken: {session['quiz_count']}\n"
                output += f"   • Average Quiz Score: {session['average_quiz_score']:.1%}\n"
            output += f"\n"

        # Progress bar visualization
        mastery_pct = progress['mastery_percentage']
        bar_length = 20
        filled_length = int(bar_length * mastery_pct / 100)
        bar = "█" * filled_length + "░" * (bar_length - filled_length)
        output += f"📈 **Progress Visual:**\n"
        output += f"   {bar} {mastery_pct:.0f}%\n\n"

        # Recommendations
        if mastery_pct < 30:
            output += f"💡 **Keep Going!** You're just starting your learning journey.\n"
        elif mastery_pct < 60:
            output += f"🚀 **Great Progress!** You're building a solid foundation.\n"
        elif mastery_pct < 80:
            output += f"⭐ **Excellent!** You're becoming proficient in these topics.\n"
        else:
            output += f"🏆 **Outstanding!** You've mastered most of these concepts.\n"

        output += f"\n💡 **Next Steps:** Use '/learn [new topic]' to expand your knowledge!"

        return CommandResult(True, output)

    def _show_topic_progress(self, state: CLIState) -> CommandResult:
        """Show detailed progress for each topic."""
        if not state.knowledge_nodes:
            return CommandResult(True, "📚 **No topics learned yet.** Start learning to track progress!")

        output = f"📚 **Topic Progress Details:**\n\n"

        # Group by category
        categories = {}
        for node in state.knowledge_nodes.values():
            if node.category not in categories:
                categories[node.category] = []
            categories[node.category].append(node)

        for category, nodes in categories.items():
            output += f"📂 **{category.title()}:**\n"
            for node in sorted(nodes, key=lambda x: x.mastery_level, reverse=True):
                mastery_pct = node.mastery_level * 100
                bar_length = 15
                filled_length = int(bar_length * node.mastery_level)
                bar = "█" * filled_length + "░" * (bar_length - filled_length)

                status = "🏆" if mastery_pct >= 80 else "📚" if mastery_pct >= 50 else "🌱"
                output += f"   {status} {node.name}: {bar} {mastery_pct:.0f}% (Reviewed {node.review_count} times)\n"
            output += f"\n"

        return CommandResult(True, output)

    def _show_achievements(self, state: CLIState) -> CommandResult:
        """Show learning achievements and milestones."""
        progress = state.get_learning_progress()

        output = f"🏆 **Learning Achievements:**\n\n"

        # Concept achievements
        if progress['total_concepts'] >= 10:
            output += f"🌟 **Knowledge Explorer** - Learned 10+ concepts\n"
        if progress['total_concepts'] >= 25:
            output += f"🎓 **Dedicated Learner** - Learned 25+ concepts\n"
        if progress['total_concepts'] >= 50:
            output += f"📚 **Knowledge Master** - Learned 50+ concepts\n"

        output += f"\n"

        # Mastery achievements
        if progress['mastered_concepts'] >= 5:
            output += f"🎯 **Skill Builder** - Mastered 5+ concepts\n"
        if progress['mastered_concepts'] >= 15:
            output += f"⭐ **Expert Learner** - Mastered 15+ concepts\n"

        output += f"\n"

        # Streak achievements
        if progress['learning_streak'] >= 3:
            output += f"🔥 **Consistent Learner** - {progress['learning_streak']} day streak!\n"
        if progress['learning_streak'] >= 7:
            output += f"💪 **Weekly Warrior** - 7+ day learning streak!\n"

        output += f"\n💡 **Keep learning to unlock more achievements!**"

        return CommandResult(True, output)


class PersonalizeCommand(Command):
    """Personalization and learning preferences command."""

    def __init__(self):
        super().__init__("personalize", "Manage your learning preferences and personalization settings")

    async def execute(
        self,
        args: List[str],
        config: ConfigManager,
        state: CLIState
    ) -> CommandResult:
        if not args:
            return self._show_personalization_status(state)
        elif args[0] == "setup":
            return self._setup_personalization(state)
        elif args[0] == "style":
            return self._set_learning_style(state, args[1:] if len(args) > 1 else [])
        elif args[0] == "format":
            return self._set_response_format(state, args[1:] if len(args) > 1 else [])
        elif args[0] == "level":
            return self._set_technical_level(state, args[1:] if len(args) > 1 else [])
        elif args[0] == "interests":
            return self._manage_interests(state, args[1:] if len(args) > 1 else [])
        elif args[0] == "goals":
            return self._manage_goals(state, args[1:] if len(args) > 1 else [])
        elif args[0] == "toggle":
            return self._toggle_features(state, args[1:] if len(args) > 1 else [])
        else:
            return CommandResult(False, "Usage: /personalize [setup|style|format|level|interests|goals|toggle]")

    def _show_personalization_status(self, state: CLIState) -> CommandResult:
        """Show current personalization status and settings."""
        prefs = state.user_preferences
        metrics = state.personalization_metrics

        output = f"🎯 **Personalization Settings:**\n\n"

        # Learning preferences
        output += f"🎨 **Learning Style:** {prefs.learning_style.value.title()}\n"
        output += f"📝 **Response Format:** {prefs.response_format.value.title()}\n"
        output += f"📊 **Technical Level:** {prefs.technical_level.title()}\n"
        output += f"📏 **Response Length:** {prefs.preferred_response_length.title()}\n"
        output += f"🎚️  **Difficulty:** {prefs.difficulty_preference.title()}\n\n"

        # Features
        output += f"⚡ **Features:**\n"
        output += f"   • Code Examples: {'✅' if prefs.include_code_examples else '❌'}\n"
        output += f"   • Real-world Examples: {'✅' if prefs.use_real_world_examples else '❌'}\n"
        output += f"   • Progress Tracking: {'✅' if prefs.progress_tracking else '❌'}\n"
        output += f"   • Session Reminders: {'✅' if prefs.session_reminders else '❌'}\n\n"

        # Personalization insights
        output += f"📈 **Personalization Insights:**\n"
        output += f"   • Confidence Level: {state.personalization_confidence:.1%}\n"
        output += f"   • Adaptive Responses: {'✅' if state.adaptive_responses_enabled else '❌'}\n"
        output += f"   • First Time User: {'Yes' if state.first_time_user else 'No'}\n\n"

        # Interests and goals
        if prefs.topics_of_interest:
            output += f"🎯 **Interests:** {', '.join(prefs.topics_of_interest)}\n"
        if prefs.learning_goals:
            output += f"🎯 **Goals:** {', '.join(prefs.learning_goals)}\n"

        output += f"\n💡 **Customize:** Use '/personalize setup' to run the setup wizard"

        return CommandResult(True, output)

    def _setup_personalization(self, state: CLIState) -> CommandResult:
        """Run the personalization setup wizard."""
        console = Console()

        output = f"🎯 **Personalization Setup Wizard**\n\n"
        output += f"Let's customize your learning experience!\n\n"

        # Learning style selection
        output += f"🎨 **1. Learning Style:**\n"
        styles = list(LearningStyle)
        for i, style in enumerate(styles, 1):
            output += f"   [{i}] {style.value.title()}\n"
        output += f"\n💡 Choose the style that works best for you\n\n"

        # Technical level
        output += f"📊 **2. Technical Level:**\n"
        levels = ["beginner", "intermediate", "advanced"]
        for i, level in enumerate(levels, 1):
            desc = {
                "beginner": "New to programming/technical topics",
                "intermediate": "Some experience with technical concepts",
                "advanced": "Experienced with technical topics"
            }
            output += f"   [{i}] {level.title()}: {desc[level]}\n"
        output += f"\n"

        # Response format
        output += f"📝 **3. Response Format:**\n"
        formats = list(ResponseFormat)
        for i, fmt in enumerate(formats, 1):
            desc = {
                "concise": "Brief, to-the-point answers",
                "detailed": "Comprehensive explanations",
                "examples": "Focus on practical examples",
                "analogies": "Use analogies and metaphors",
                "step_by_step": "Break down into clear steps"
            }
            output += f"   [{i}] {fmt.value.title()}: {desc[fmt.value]}\n"
        output += f"\n"

        output += f"🚀 **Ready to configure!**\n\n"
        output += f"💡 **Use these commands to complete setup:**\n"
        output += f"   • /personalize style [choice] - Set learning style\n"
        output += f"   • /personalize level [choice] - Set technical level\n"
        output += f"   • /personalize format [choice] - Set response format\n"
        output += f"   • /personalize interests [topics] - Set your interests\n"
        output += f"   • /personalize goals [goals] - Set learning goals\n\n"

        output += f"🎯 **Example:** /personalize style visual"

        if state.first_time_user:
            state.mark_onboarding_completed()

        return CommandResult(True, output)

    def _set_learning_style(self, state: CLIState, style_args: List[str]) -> CommandResult:
        """Set the learning style."""
        if not style_args:
            output = f"🎨 **Available Learning Styles:**\n\n"
            for style in LearningStyle:
                desc = {
                    "visual": "Learn through diagrams, charts, and visual examples",
                    "auditory": "Learn through explanations and discussions",
                    "kinesthetic": "Learn through hands-on practice and exercises",
                    "reading": "Learn through text and documentation",
                    "mixed": "Combination of all learning methods"
                }
                is_current = "✅" if style == state.user_preferences.learning_style else "○"
                output += f"   {is_current} {style.value.title()}: {desc[style.value]}\n"
            output += f"\n💡 Use: /personalize style [choice]"
            return CommandResult(True, output)

        style_name = style_args[0].lower()
        try:
            new_style = LearningStyle(style_name)
            old_style = state.user_preferences.learning_style
            state.user_preferences.learning_style = new_style

            output = f"🎨 **Learning Style Updated:**\n\n"
            output += f"   From: {old_style.value.title()}\n"
            output += f"   To: {new_style.value.title()}\n\n"

            # Describe what this means
            descriptions = {
                "visual": "I'll use more visual descriptions, diagrams, and visual analogies",
                "auditory": "I'll provide clear explanations and conversational responses",
                "kinesthetic": "I'll focus on hands-on exercises and practical applications",
                "reading": "I'll provide well-structured text and written examples",
                "mixed": "I'll use a balanced approach with various learning methods"
            }
            output += f"💡 **What this means:** {descriptions[new_style.value]}"

            return CommandResult(True, output)

        except ValueError:
            return CommandResult(False, f"❌ Invalid learning style. Choose from: {', '.join(s.value for s in LearningStyle)}")

    def _set_response_format(self, state: CLIState, format_args: List[str]) -> CommandResult:
        """Set the response format preference."""
        if not format_args:
            output = f"📝 **Available Response Formats:**\n\n"
            for fmt in ResponseFormat:
                desc = {
                    "concise": "Short, to-the-point answers",
                    "detailed": "Comprehensive explanations with depth",
                    "examples": "Focus on practical examples and applications",
                    "analogies": "Use analogies and metaphors to explain concepts",
                    "step_by_step": "Break down into clear, numbered steps"
                }
                is_current = "✅" if fmt == state.user_preferences.response_format else "○"
                output += f"   {is_current} {fmt.value.title()}: {desc[fmt.value]}\n"
            output += f"\n💡 Use: /personalize format [choice]"
            return CommandResult(True, output)

        format_name = format_args[0].lower()
        try:
            new_format = ResponseFormat(format_name)
            old_format = state.user_preferences.response_format
            state.user_preferences.response_format = new_format

            output = f"📝 **Response Format Updated:**\n\n"
            output += f"   From: {old_format.value.title()}\n"
            output += f"   To: {new_format.value.title()}\n\n"

            return CommandResult(True, output)

        except ValueError:
            return CommandResult(False, f"❌ Invalid response format. Choose from: {', '.join(f.value for f in ResponseFormat)}")

    def _set_technical_level(self, state: CLIState, level_args: List[str]) -> CommandResult:
        """Set the technical level preference."""
        if not level_args:
            levels = ["beginner", "intermediate", "advanced"]
            output = f"📊 **Technical Levels:**\n\n"
            for level in levels:
                desc = {
                    "beginner": "Simple explanations, avoid jargon, define technical terms",
                    "intermediate": "Assume some background knowledge, moderate complexity",
                    "advanced": "Use technical language, dive deep into complex topics"
                }
                is_current = "✅" if level == state.user_preferences.technical_level else "○"
                output += f"   {is_current} {level.title()}: {desc[level]}\n"
            output += f"\n💡 Use: /personalize level [choice]"
            return CommandResult(True, output)

        level = level_args[0].lower()
        if level not in ["beginner", "intermediate", "advanced"]:
            return CommandResult(False, "❌ Invalid level. Choose: beginner, intermediate, or advanced")

        old_level = state.user_preferences.technical_level
        state.user_preferences.technical_level = level

        output = f"📊 **Technical Level Updated:**\n\n"
        output += f"   From: {old_level.title()}\n"
        output += f"   To: {level.title()}\n\n"

        return CommandResult(True, output)

    def _manage_interests(self, state: CLIState, interest_args: List[str]) -> CommandResult:
        """Manage topics of interest."""
        if not interest_args:
            if state.user_preferences.topics_of_interest:
                output = f"🎯 **Current Interests:**\n\n"
                for interest in state.user_preferences.topics_of_interest:
                    output += f"   • {interest}\n"
                output += f"\n💡 Add interests: /personalize interests [topic1, topic2, ...]"
            else:
                output = f"🎯 **No interests set yet.**\n\n"
                output += f"💡 Set your interests: /personalize interests [topic1, topic2, ...]\n"
                output += f"   Example: /personalize interests Python, AI, data science"
            return CommandResult(True, output)

        # Add new interests
        new_interests = [arg.rstrip(',') for arg in interest_args]
        for interest in new_interests:
            if interest not in state.user_preferences.topics_of_interest:
                state.user_preferences.topics_of_interest.append(interest)

        output = f"🎯 **Interests Updated:**\n\n"
        output += f"   Added: {', '.join(new_interests)}\n"
        output += f"   Total: {', '.join(state.user_preferences.topics_of_interest)}\n\n"
        output += f"💡 I'll use these to personalize your learning experience!"

        return CommandResult(True, output)

    def _manage_goals(self, state: CLIState, goal_args: List[str]) -> CommandResult:
        """Manage learning goals."""
        if not goal_args:
            if state.user_preferences.learning_goals:
                output = f"🎯 **Current Learning Goals:**\n\n"
                for goal in state.user_preferences.learning_goals:
                    output += f"   • {goal}\n"
                output += f"\n💡 Add goals: /personalize goals [goal1, goal2, ...]"
            else:
                output = f"🎯 **No learning goals set yet.**\n\n"
                output += f"💡 Set your goals: /personalize goals [goal1, goal2, ...]\n"
                output += f"   Example: /personalize goals Master Python basics, Build AI projects"
            return CommandResult(True, output)

        # Add new goals
        new_goals = [" ".join(goal_args)]  # Join all args as one goal
        for goal in new_goals:
            if goal not in state.user_preferences.learning_goals:
                state.user_preferences.learning_goals.append(goal)

        output = f"🎯 **Learning Goals Updated:**\n\n"
        output += f"   Added: {', '.join(new_goals)}\n"
        output += f"   Total: {len(state.user_preferences.learning_goals)} goal(s)\n\n"
        output += f"💡 I'll help you achieve these goals!"

        return CommandResult(True, output)

    def _toggle_features(self, state: CLIState, feature_args: List[str]) -> CommandResult:
        """Toggle personalization features."""
        if not feature_args:
            output = f"⚡ **Feature Toggles:**\n\n"
            output += f"   • Code Examples: {'✅' if state.user_preferences.include_code_examples else '❌'}\n"
            output += f"   • Real-world Examples: {'✅' if state.user_preferences.use_real_world_examples else '❌'}\n"
            output += f"   • Progress Tracking: {'✅' if state.user_preferences.progress_tracking else '❌'}\n"
            output += f"   • Session Reminders: {'✅' if state.user_preferences.session_reminders else '❌'}\n"
            output += f"   • Adaptive Responses: {'✅' if state.adaptive_responses_enabled else '❌'}\n\n"
            output += f"💡 Toggle: /personalize toggle [feature name]"
            return CommandResult(True, output)

        feature = feature_args[0].lower()
        feature_map = {
            "code": "include_code_examples",
            "examples": "use_real_world_examples",
            "progress": "progress_tracking",
            "reminders": "session_reminders",
            "adaptive": "adaptive_responses_enabled"
        }

        if feature not in feature_map:
            return CommandResult(False, f"❌ Unknown feature. Choose: {', '.join(feature_map.keys())}")

        attr_name = feature_map[feature]
        current_value = getattr(state.user_preferences, attr_name) if attr_name in state.user_preferences.__dict__ else getattr(state, attr_name)
        new_value = not current_value

        if attr_name in state.user_preferences.__dict__:
            setattr(state.user_preferences, attr_name, new_value)
        else:
            setattr(state, attr_name, new_value)

        output = f"⚡ **Feature Toggled:**\n\n"
        output += f"   {feature.title()}: {'✅ Enabled' if new_value else '❌ Disabled'}\n\n"
        output += f"💡 Changes will take effect in your next conversation!"

        return CommandResult(True, output)


class AchievementCommand(Command):
    """Achievement and gamification system command."""

    def __init__(self):
        super().__init__("achievements", "View achievements and progress tracking")

    async def execute(
        self,
        args: List[str],
        config: ConfigManager,
        state: CLIState
    ) -> CommandResult:
        if not args:
            return self._show_achievements_dashboard(state)
        elif args[0] == "progress":
            return self._show_progress_details(state)
        elif args[0] == "level":
            return self._show_level_info(state)
        elif args[0] == "recent":
            return self._show_recent_achievements(state)
        elif args[0] == "milestones":
            return self._show_milestones(state)
        else:
            return CommandResult(False, "Usage: /achievements [progress|level|recent|milestones]")

    def _show_achievements_dashboard(self, state: CLIState) -> CommandResult:
        """Show comprehensive achievements dashboard."""
        summary = state.get_achievement_summary()
        level_info = summary["level_info"]

        output = f"🏆 **Achievement Dashboard**\n\n"

        # Level and Progress
        output += f"🎯 **Current Level:** {level_info['current_level']} - {level_info['level_title']}\n"
        output += f"   Points: {level_info['total_points']} total, {level_info['points_to_next_level']} to next level\n"
        progress_bar = state.create_progress_bar(level_info['level_progress'], 20)
        output += f"   {progress_bar} {level_info['level_progress']:.0%}\n\n"

        # Achievement Statistics
        output += f"📊 **Achievement Statistics:**\n"
        output += f"   • Unlocked: {summary['unlocked_achievements']}/{summary['total_achievements']} ({summary['completion_rate']:.1f}%)\n"
        output += f"   • Total Points: {summary['total_points']}\n"
        output += f"   • Achievement Categories: {len(summary['categories'])}\n\n"

        # Category Breakdown
        if summary["categories"]:
            output += f"📂 **Progress by Category:**\n"
            for category, stats in summary["categories"].items():
                progress_pct = (stats["unlocked"] / stats["total"] * 100) if stats["total"] > 0 else 0
                category_icon = {
                    "learning": "📚",
                    "mastery": "🎯",
                    "engagement": "🔥",
                    "assessment": "📝",
                    "personalization": "🎨",
                    "exploration": "⌨️"
                }.get(category, "📋")

                bar = state.create_progress_bar(progress_pct / 100, 15)
                output += f"   {category_icon} {category.title()}: {stats['unlocked']}/{stats['total']} {bar} {progress_pct:.0f}%\n"
            output += f"\n"

        # Recent Achievements
        if summary["recent_achievements"]:
            output += f"🎉 **Recent Achievements:**\n"
            for achievement in summary["recent_achievements"][:3]:
                output += f"   • {achievement.icon} {achievement.title} ({achievement.points} pts)\n"
            output += f"\n"

        # Motivational Message
        output += f"{state.get_motivational_message()}"

        return CommandResult(True, output)

    def _show_progress_details(self, state: CLIState) -> CommandResult:
        """Show detailed progress tracking."""
        summary = state.get_achievement_summary()
        level_info = summary["level_info"]

        output = f"📈 **Detailed Progress Tracking**\n\n"

        # Level Progress
        output += f"🎯 **Level Progress:**\n"
        output += f"   Current Level: {level_info['current_level']} - {level_info['level_title']}\n"
        output += f"   Points: {level_info['total_points']} / {level_info['current_level'] * 100 + 100}\n"
        progress_bar = state.create_progress_bar(level_info['level_progress'], 30)
        output += f"   {progress_bar} {level_info['level_progress']:.1%}\n"
        output += f"   Points to next level: {level_info['points_to_next_level']}\n\n"

        # Achievement Progress
        output += f"🏆 **Achievement Progress:**\n"

        # Show in-progress achievements
        in_progress = []
        for achievement in state.achievements.values():
            if not achievement.unlocked and achievement.progress > 0:
                in_progress.append(achievement)

        if in_progress:
            output += f"   **In Progress:**\n"
            # Sort by progress (highest first)
            in_progress.sort(key=lambda x: x.progress, reverse=True)
            for achievement in in_progress[:5]:  # Show top 5
                bar = state.create_progress_bar(achievement.progress, 15)
                output += f"   • {achievement.icon} {achievement.title}\n"
                output += f"     {bar} {achievement.progress:.1%} - {achievement.description}\n"
        else:
            output += f"   **Start learning to unlock achievements!**\n"

        return CommandResult(True, output)

    def _show_level_info(self, state: CLIState) -> CommandResult:
        """Show detailed level information."""
        level_info = state.get_level_info()
        summary = state.get_achievement_summary()

        output = f"🎯 **Level Information**\n\n"

        output += f"**Current Level:** {level_info['current_level']} - {level_info['level_title']}\n\n"

        # Level Progress
        output += f"**Progress to Level {level_info['current_level'] + 1}:**\n"
        progress_bar = state.create_progress_bar(level_info['level_progress'], 30)
        output += f"{progress_bar} {level_info['level_progress']:.1%}\n"
        output += f"Points Earned: {level_info['total_points']} / {level_info['current_level'] * 100 + 100}\n"
        output += f"Points Needed: {level_info['points_to_next_level']}\n\n"

        # Level Benefits
        output += f"**Level Benefits:**\n"
        output += f"• Unlock new learning challenges\n"
        output += f"• Access advanced personalization features\n"
        output += f"• Gain recognition badges\n"
        output += f"• Unlock special learning modes\n\n"

        # Achievement Impact
        output += f"**Achievements Impact:**\n"
        output += f"• Total Points from Achievements: {summary['total_points']}\n"
        output += f"• Points from Levels: {(level_info['current_level'] - 1) * 100}\n"
        output += f"• Combined Score: {summary['total_points'] + ((level_info['current_level'] - 1) * 100)}\n"

        return CommandResult(True, output)

    def _show_recent_achievements(self, state: CLIState) -> CommandResult:
        """Show recently unlocked achievements."""
        summary = state.get_achievement_summary()

        if not summary["recent_achievements"]:
            return CommandResult(True, "📋 **No achievements unlocked yet.** Start learning to unlock your first achievement!")

        output = f"🎉 **Recent Achievements**\n\n"

        # Show all unlocked achievements, sorted by most recent
        unlocked = [
            a for a in state.achievements.values()
            if a.unlocked
        ]
        unlocked.sort(key=lambda x: x.unlocked_at or "", reverse=True)

        for achievement in unlocked:
            output += f"{achievement.icon} **{achievement.title}**\n"
            output += f"   {achievement.description}\n"
            output += f"   Points: {achievement.points} | Unlocked: {achievement.unlocked_at[:10] if achievement.unlocked_at else 'Unknown'}\n\n"

        return CommandResult(True, output)

    def _show_milestones(self, state: CLIState) -> CommandResult:
        """Show learning milestones and progress."""
        progress = state.get_learning_progress()

        output = f"📅 **Learning Milestones**\n\n"

        # Learning Milestones
        milestones = [
            {"title": "First Concept", "current": progress["total_concepts"], "target": 1, "icon": "🌱"},
            {"title": "Knowledge Explorer", "current": progress["total_concepts"], "target": 10, "icon": "🔍"},
            {"title": "Dedicated Learner", "current": progress["total_concepts"], "target": 25, "icon": "🎓"},
            {"title": "Knowledge Master", "current": progress["total_concepts"], "target": 50, "icon": "📚"},
        ]

        output += f"**Learning Journey:**\n"
        for milestone in milestones:
            progress_pct = min(1.0, milestone["current"] / milestone["target"]) if milestone["target"] > 0 else 0
            bar = state.create_progress_bar(progress_pct, 20)
            status = "✅" if progress_pct >= 1.0 else "🔄"
            output += f"   {status} {milestone['icon']} {milestone['title']}: {milestone['current']}/{milestone['target']}\n"
            output += f"       {bar} {progress_pct:.1%}\n"

        # Mastery Milestones
        mastery_milestones = [
            {"title": "Skill Builder", "current": progress["mastered_concepts"], "target": 5, "icon": "🎯"},
            {"title": "Expert Learner", "current": progress["mastered_concepts"], "target": 15, "icon": "⭐"},
            {"title": "Mastery Legend", "current": progress["mastered_concepts"], "target": 30, "icon": "🏆"},
        ]

        output += f"\n**Mastery Journey:**\n"
        for milestone in mastery_milestones:
            progress_pct = min(1.0, milestone["current"] / milestone["target"]) if milestone["target"] > 0 else 0
            bar = state.create_progress_bar(progress_pct, 20)
            status = "✅" if progress_pct >= 1.0 else "🔄"
            output += f"   {status} {milestone['icon']} {milestone['title']}: {milestone['current']}/{milestone['target']}\n"
            output += f"       {bar} {progress_pct:.1%}\n"

        # Streak Information
        output += f"\n**Consistency:**\n"
        streak = progress["learning_streak"]
        streak_milestones = [3, 7, 14, 30]
        for target in streak_milestones:
            status = "🔥" if streak >= target else "⏳"
            if streak >= target:
                output += f"   {status} {target}-day streak achieved!\n"
            else:
                output += f"   {status} {target}-day streak: {streak}/{target}\n"

        return CommandResult(True, output)


class CommandProcessor(CommandGroup):
    """Root command processor that manages all commands and subcommands."""

    def __init__(self):
        """Initialize command processor as root command group."""
        super().__init__("", "Learning Catalyst CLI", "System")
        self._register_default_commands()

    def _register_default_commands(self) -> None:
        """Register default commands and command groups.

        Command Organization Strategy:
        - Use CommandGroups to organize commands by functional category
        - Individual commands can be registered directly for simple operations
        - Commands in groups are accessed as /groupname command (e.g., /system clear)
        - Direct commands are accessed as /commandname (e.g., /config)
        """
        # For Phase 1 MVP, register commands directly to keep them simple
        # In future phases, consider organizing related commands into CommandGroups
        self.register_subcommand(ClearCommand())
        self.register_subcommand(TokenUsageCommand())
        self.register_subcommand(ConfigCommand())
        self.register_subcommand(CheckpointCommand())
        self.register_subcommand(ContextCommand())
        self.register_subcommand(CompressCommand())
        self.register_subcommand(LearnCommand())
        self.register_subcommand(QuizCommand())
        self.register_subcommand(ProgressCommand())
        self.register_subcommand(PersonalizeCommand())
        self.register_subcommand(AchievementCommand())

    def register_command(self, command: Command) -> None:
        """
        Register a new command (alias for register_subcommand for compatibility).

        Args:
            command: Command to register
        """
        self.register_subcommand(command)

    async def process_command(
        self,
        command_line: str,
        config: ConfigManager,
        state: CLIState
    ) -> CommandResult:
        """
        Process a command line.

        Args:
            command_line: Command line string
            config: Configuration manager
            state: CLI state

        Returns:
            CommandResult with execution result
        """
        # Remove leading slash and split
        command_line = command_line.lstrip('/')
        parts = command_line.split()

        if not parts:
            # No command provided, show help
            return self._show_help()

        # Handle help explicitly
        if parts[0] == "help":
            return self._show_help()

        # Use CommandGroup execute method (which supports partial matching)
        return await self.execute(parts, config, state)

    def list_commands(self) -> List[Command]:
        """
        List all registered commands.

        Returns:
            List of commands
        """
        commands = []
        for command in self._subcommands.values():
            commands.append(command)
            # If it's a command group, also list its subcommands
            if isinstance(command, CommandGroup):
                commands.extend(command._subcommands.values())
        return commands

    def get_command(self, name: str) -> Optional[Command]:
        """
        Get a command by name.

        Args:
            name: Command name

        Returns:
            Command or None if not found
        """
        return self.get_subcommand(name)

    async def execute(
        self,
        args: List[str],
        config: ConfigManager,
        state: CLIState
    ) -> CommandResult:
        """Override execute to support fuzzy matching and intelligent suggestions."""
        if not args:
            return self._show_help()

        # Try exact match first
        command = self.get_subcommand(args[0])

        # If no exact match, try fuzzy matching
        if not command:
            suggestion = self._get_command_suggestion(args[0])
            if suggestion:
                return CommandResult(
                    False,
                    f"Unknown command: /{args[0]}. Did you mean: {suggestion}?"
                )
            else:
                return CommandResult(
                    False,
                    f"Unknown command: /{args[0]}. Use '/help' to see available commands."
                )

        # Execute the command (this will handle CommandGroups with subcommands correctly)
        return await command.execute(args[1:], config, state)

    def _get_command_suggestion(self, command_name: str) -> Optional[str]:
        """Get command suggestion using fuzzy matching."""
        import difflib

        # Available commands for matching
        available_commands = list(self._subcommands.keys())

        # Find close matches
        matches = difflib.get_close_matches(command_name, available_commands, n=1, cutoff=0.6)

        if matches:
            return f"/{matches[0]}"

        # Check for partial matches
        for cmd in available_commands:
            if cmd.startswith(command_name.lower()) or command_name.lower() in cmd:
                return f"/{cmd}"

        return None

    def _show_help(self) -> CommandResult:
        """Show comprehensive help for all commands."""
        from rich.panel import Panel
        from rich.text import Text

        help_text = "🚀 Learning Catalyst - AI-Powered Learning Assistant\n\n"

        # Build help text from command groups and individual commands
        categories = {}

        for command in self._subcommands.values():
            if isinstance(command, CommandGroup):
                # Command groups get their own category
                if command.category not in categories:
                    categories[command.category] = []
                categories[command.category].append(command)
            else:
                # Individual commands go to "General" or their assigned category
                category = getattr(command, 'category', 'General')
                if category not in categories:
                    categories[category] = []
                categories[category].append(command)

        # Define category icons and order
        category_icons = {
            "System": "🔧",
            "Configuration": "⚙️",
            "Learning": "📚",
            "Analytics": "📊",
            "Session": "💾",
            "Context": "🧩",
            "General": "📋"
        }

        # Build help text by category
        for category_name in ["System", "Configuration", "Learning", "Analytics", "Session", "Context", "General"]:
            if category_name in categories:
                icon = category_icons.get(category_name, "📋")
                help_text += f"{icon} {category_name} Commands:\n"

                for command in categories[category_name]:
                    if isinstance(command, CommandGroup):
                        help_text += f"  /{command.name} - {command.description}\n"
                        # Show subcommands if group has any
                        if command._subcommands:
                            for subcmd in command._subcommands.values():
                                help_text += f"    /{command.name} {subcmd.name} - {subcmd.description}\n"
                    else:
                        help_text += f"  /{command.name} - {command.description}\n"

                help_text += "\n"

        # Add natural learning note
        help_text += "🧠 Natural Learning (No Commands Needed):\n"
        help_text += "  Just ask questions naturally in the shell:\n"
        help_text += "    • Explanations: \"Explain neural networks\"\n"
        help_text += "    • Practice: \"Test me on Python lists\"\n"
        help_text += "    • Learning: \"What should I learn next?\"\n\n"

        help_text += "💡 Simply ask questions directly without commands for natural learning!"

        # Create a Text object for better formatting
        help_content = Text.from_markup(help_text)

        # Create a bordered panel with the help content and proper spacing
        help_panel = Panel(
            help_content,
            title="Help",
            title_align="left",
            border_style="blue",
            padding=(1, 2)  # Add proper spacing around the content
        )

        return CommandResult(True, help_panel)