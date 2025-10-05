"""
Command Palette implementation for Learning Catalyst CLI
"""
from dataclasses import dataclass
from typing import Any, Callable, Dict, List, Optional

from src.cli.interface import CLIInterface
from src.data.models.extended_models import Message


@dataclass
class CommandInfo:
    """Data class to store command information"""
    name: str
    description: str
    aliases: List[str]
    handler: Callable
    usage: str = ""
    category: str = "General"


class CommandPalette:
    """Command palette for managing and executing CLI commands"""

    def __init__(self, cli_interface: CLIInterface):
        self.cli_interface = cli_interface
        self.commands: Dict[str, CommandInfo] = {}
        self.context: Dict[str, Any] = {}
        self._register_default_commands()

    def _register_default_commands(self) -> None:
        """Register default system commands"""
        # These will be connected to actual implementations later
        self.register_command(
            name="help",
            description="Show available commands",
            aliases=["h", "?"],
            handler=self._help_command,
            usage="/help [command]",
            category="System"
        )

        self.register_command(
            name="clear",
            description="Clear the screen",
            aliases=["cls"],
            handler=self._clear_command,
            category="System"
        )

        self.register_command(
            name="quit",
            description="Exit the application",
            aliases=["exit", "q"],
            handler=self._quit_command,
            category="System"
        )

        self.register_command(
            name="reset",
            description="Reset the conversation",
            aliases=["restart"],
            handler=self._reset_command,
            category="System"
        )

        self.register_command(
            name="checkpoint",
            description="Manage checkpoints",
            aliases=["cp"],
            handler=self._checkpoint_command,
            usage="/checkpoint [save|load|list] [name]",
            category="System"
        )

        self.register_command(
            name="set-config",
            description="Configure AI provider and model",
            aliases=["config"],
            handler=self._set_config_command,
            category="Configuration"
        )

        # Register Phase 1 commands for core learning functionality
        self.register_command(
            name="concepts",
            description="View available learning concepts and materials",
            aliases=["topics"],
            handler=self._concepts_command,
            usage="/concepts [--list] [--search <term>]",
            category="Learning"
        )

        self.register_command(
            name="explain",
            description="Request an explanation for a concept",
            aliases=["exp"],
            handler=self._explain_command,
            usage="/explain <concept>",
            category="Learning"
        )

        self.register_command(
            name="quiz",
            description="Request a quiz or challenge on a concept",
            aliases=["challenge"],
            handler=self._quiz_command,
            usage="/quiz <concept>",
            category="Learning"
        )

    def register_command(self, name: str, description: str, aliases: List[str],
                        handler: Callable, usage: str = "", category: str = "General") -> None:
        """Register a new command"""
        command_info = CommandInfo(
            name=name,
            description=description,
            aliases=aliases,
            handler=handler,
            usage=usage,
            category=category
        )

        # Register the command with its name
        self.commands[name] = command_info

        # Register the command with each alias
        for alias in aliases:
            self.commands[alias] = command_info

    def execute_command(self, command_input: str, context: Optional[Dict[str, Any]] = None) -> bool:
        """
        Execute a command based on user input

        Args:
            command_input: The command string (including / prefix)
            context: Optional context data to pass to the command handler

        Returns:
            bool: True if command was executed, False if command not found
        """
        if not command_input.startswith('/'):
            return False

        # Parse command and arguments
        parts = command_input[1:].strip().split()
        if not parts:
            return False

        command_name = parts[0].lower()
        args = parts[1:] if len(parts) > 1 else []

        # Find the command
        if command_name in self.commands:
            command_info = self.commands[command_name]
            try:
                # Merge provided context with instance context
                merged_context = self.context.copy()
                if context:
                    merged_context.update(context)

                # Execute the command handler
                command_info.handler(args, merged_context)
                return True
            except Exception as e:
                self.cli_interface.display_message(
                    Message(role="system", content=f"Error executing command: {str(e)}")
                )
                return True
        else:
            self.cli_interface.display_message(
                Message(role="system", content=f"Unknown command: {command_name}. Type /help for available commands.")
            )
            return True

    def get_command_list(self) -> List[CommandInfo]:
        """Get list of unique commands (without duplicates from aliases)"""
        unique_commands = {}
        for name, command in self.commands.items():
            unique_commands[command.name] = command
        return list(unique_commands.values())

    def get_command_by_name(self, name: str) -> Optional[CommandInfo]:
        """Get command by name or alias"""
        return self.commands.get(name.lower())

    def _help_command(self, args: List[str], context: Dict[str, Any]) -> None:
        """Handler for the help command"""
        if args:
            # Show help for specific command
            command_name = args[0]
            command_info = self.get_command_by_name(command_name)
            if command_info:
                self.cli_interface.display_message(
                    Message(
                        role="system",
                        content=f"{command_info.name} - {command_info.description}\n"
                                f"Usage: /{command_info.name} {command_info.usage}\n"
                                f"Aliases: {', '.join(command_info.aliases) if command_info.aliases else 'None'}"
                    )
                )
            else:
                self.cli_interface.display_message(
                    Message(role="system", content=f"Command '{command_name}' not found.")
                )
        else:
            # Show all commands
            commands = self.get_command_list()

            # Group commands by category
            categories = {}
            for command in commands:
                if command.category not in categories:
                    categories[command.category] = []
                categories[command.category].append(command)

            help_text = "Available Commands:\n"
            for category, cmds in categories.items():
                help_text += f"\n{category}:\n"
                for command in cmds:
                    help_text += f"  /{command.name} - {command.description}\n"

            help_text += "\nType /help <command> for more information about a specific command."

            self.cli_interface.display_message(
                Message(role="system", content=help_text)
            )

    def _clear_command(self, args: List[str], context: Dict[str, Any]) -> None:
        """Handler for the clear command"""
        self.cli_interface.clear_screen()

    def _quit_command(self, args: List[str], context: Dict[str, Any]) -> None:
        """Handler for the quit command"""
        # This would typically set a flag to exit the application
        self.cli_interface.display_message(
            Message(role="system", content="Goodbye!")
        )
        # In a real implementation, we would signal the application to exit

    def _reset_command(self, args: List[str], context: Dict[str, Any]) -> None:
        """Handler for the reset command"""
        self.cli_interface.display_message(
            Message(role="system", content="Conversation has been reset.")
        )
        # In a real implementation, this would reset the conversation state

    def _checkpoint_command(self, args: List[str], context: Dict[str, Any]) -> None:
        """Handler for the checkpoint command"""
        if not args:
            self.cli_interface.display_message(
                Message(role="system", content="Usage: /checkpoint [save|load|list] [name]")
            )
            return

        action = args[0].lower()
        checkpoint_name = args[1] if len(args) > 1 else None

        if action == "list":
            # In a real implementation, this would fetch and display checkpoints
            self.cli_interface.display_message(
                Message(role="system", content="Listing checkpoints...")
            )
        elif action == "save":
            if checkpoint_name:
                self.cli_interface.display_message(
                    Message(role="system", content=f"Saving checkpoint: {checkpoint_name}")
                )
            else:
                self.cli_interface.display_message(
                    Message(role="system", content="Please provide a name for the checkpoint.")
                )
        elif action == "load":
            if checkpoint_name:
                self.cli_interface.display_message(
                    Message(role="system", content=f"Loading checkpoint: {checkpoint_name}")
                )
            else:
                self.cli_interface.display_message(
                    Message(role="system", content="Please provide a checkpoint name to load.")
                )
        else:
            self.cli_interface.display_message(
                Message(role="system", content="Invalid checkpoint action. Use save, load, or list.")
            )

    def _set_config_command(self, args: List[str], context: Dict[str, Any]) -> None:
        """Handler for the set-config command"""
        # Import required modules inside the handler to avoid circular imports
        from rich.prompt import Prompt

        from utils.preferences_manager import PreferencesManager

        # Get workspace path from context
        workspace_path = context.get('workspace_path', '.')

        # Initialize preferences manager
        prefs_manager = PreferencesManager(workspace_path)

        try:
            # Get available providers
            providers = ["openai", "anthropic", "chatglm", "siliconflow", "deepseek", "local"]

            self.cli_interface.display_message(
                Message(role="system", content="Available providers: " + ", ".join(providers))
            )

            # Select provider
            while True:
                provider = Prompt.ask("Select provider").strip().lower()
                if provider in providers:
                    break
                self.cli_interface.display_message(
                    Message(role="system", content=f"Invalid provider. Please select from: {', '.join(providers)}")
                )

            # Get API key if needed
            if provider != "local":
                api_key = Prompt.ask(f"Enter API key for {provider}", password=True).strip()
                if api_key:
                    # Save API key
                    prefs_manager.set_preference(f"ai.{provider}_api_key", api_key)

            # For local models, we don't need an API key
            if provider == "local":
                self.cli_interface.display_message(
                    Message(role="system", content="Note: For local models, make sure your local server is running.")
                )

            # Select model
            # In a real implementation, we would dynamically fetch available models from the provider
            # For now, we'll provide some common model examples
            model_examples = {
                "openai": ["gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"],
                "anthropic": ["claude-3-opus", "claude-3-sonnet", "claude-3-haiku"],
                "chatglm": ["chatglm3-6b", "chatglm4-9b"],
                "siliconflow": ["Qwen/Qwen2-7B-Instruct", "deepseek-ai/deepseek-v2-chat"],
                "deepseek": ["deepseek-chat", "deepseek-coder"],
                "local": ["llama3", "mistral", "phi3"]
            }

            examples = model_examples.get(provider, [])
            if examples:
                self.cli_interface.display_message(
                    Message(role="system", content=f"Suggested models for {provider}: {', '.join(examples)}")
                )

            model = Prompt.ask("Enter model name").strip()

            # Save configuration
            prefs_manager.set_preference("ai.default_provider", provider)
            prefs_manager.set_preference("ai.default_model", model)

            self.cli_interface.display_message(
                Message(role="system", content=f"Configuration saved: {provider}/{model}")
            )

        except Exception as e:
            self.cli_interface.display_message(
                Message(role="system", content=f"Error configuring provider: {str(e)}")
            )

    def _concepts_command(self, args: List[str], context: Dict[str, Any]) -> None:
        """Handler for the concepts command"""
        try:
            # Import required modules inside the handler to avoid circular imports
            from src.data.models.extended_models import Message
            from src.core.knowledge_navigator import SQLiteKnowledgeNavigator
            import os

            # Get workspace path from context
            workspace_path = context.get('workspace_path', '.')
            
            # Initialize knowledge navigator
            learningspace_path = os.path.join(workspace_path, ".catalyst")
            db_path = os.path.join(learningspace_path, "data.db")
            knowledge_navigator = SQLiteKnowledgeNavigator(db_path)
            
            # Get available concepts
            import asyncio
            concepts = asyncio.run(knowledge_navigator.get_available_concepts())
            
            if not concepts:
                self.cli_interface.display_message(
                    Message(
                        role="system", 
                        content="No concepts found. Please make sure you have Markdown files in your workspace."
                    )
                )
                return

            # Format and display concepts
            content = "📚 Available Learning Concepts:\n\n"
            for concept in concepts[:20]:  # Limit to first 20 concepts
                content += f"• {concept.title}\n"
                if hasattr(concept, 'prerequisites') and concept.prerequisites:
                    content += f"  Prerequisites: {', '.join(concept.prerequisites)}\n"
                content += "\n"
            
            if len(concepts) > 20:
                content += f"... and {len(concepts) - 20} more concepts\n\n"
            
            content += "💡 Tip: Use /explain <concept-name> to learn more about a specific concept\n"
            content += "💡 Tip: Use /quiz <concept-name> to test your knowledge\n"
            
            self.cli_interface.display_message(
                Message(role="system", content=content)
            )
            
        except Exception as e:
            self.cli_interface.display_message(
                Message(role="system", content=f"Error retrieving concepts: {str(e)}")
            )

    def _explain_command(self, args: List[str], context: Dict[str, Any]) -> None:
        """Handler for the explain command"""
        if not args:
            self.cli_interface.display_message(
                Message(
                    role="system", 
                    content="Usage: /explain <concept-name>\nPlease specify what you'd like to learn about."
                )
            )
            return

        try:
            # Import required modules inside the handler to avoid circular imports
            from src.data.models.extended_models import Message
            from src.core.catalyst_agent import CatalystAgentImpl
            from src.ai.service import ModelAbstractionService
            import os

            # Get workspace path from context
            workspace_path = context.get('workspace_path', '.')
            
            # Initialize components
            model_service = ModelAbstractionService()
            
            # Get preferences manager to retrieve user's preferred provider and model
            from src.utils.preferences_manager import PreferencesManager
            prefs_manager = PreferencesManager(workspace_path)
            
            # Get user's preferred provider and model
            default_provider = prefs_manager.get_preference('ai.default_provider')
            default_model = prefs_manager.get_preference('ai.default_model')
            
            # Note: Providers will be configured by the user through the /models command
            # The model service will be set up with the user's preferred configuration
            
            learningspace_path = os.path.join(workspace_path, ".catalyst")
            db_path = os.path.join(learningspace_path, "data.db")
            
            from src.core.knowledge_navigator import SQLiteKnowledgeNavigator
            knowledge_navigator = SQLiteKnowledgeNavigator(db_path)
            
            catalyst_agent = CatalystAgentImpl(model_service, knowledge_navigator=knowledge_navigator)
            
            # Search for the requested concept
            import asyncio
            concept_name = " ".join(args)
            concepts = asyncio.run(knowledge_navigator.get_available_concepts())
            
            # Find matching concept (simple matching for now)
            target_concept = None
            for concept in concepts:
                if concept_name.lower() in concept.title.lower():
                    target_concept = concept
                    break
            
            if not target_concept:
                self.cli_interface.display_message(
                    Message(
                        role="system", 
                        content=f"No concept found matching '{concept_name}'. Try using /concepts to see available topics."
                    )
                )
                return

            # Generate explanation using the catalyst agent
            explanation = asyncio.run(catalyst_agent.generate_explanation(
                target_concept, 
                {"learning_level": "intermediate"}
            ))
            
            self.cli_interface.display_message(
                Message(
                    role="system", 
                    content=f"📘 Explanation: {target_concept.title}\n\n{explanation}"
                )
            )
            
        except Exception as e:
            self.cli_interface.display_message(
                Message(role="system", content=f"Error generating explanation: {str(e)}")
            )

    def _quiz_command(self, args: List[str], context: Dict[str, Any]) -> None:
        """Handler for the quiz command"""
        if not args:
            self.cli_interface.display_message(
                Message(
                    role="system", 
                    content="Usage: /quiz <concept-name>\nPlease specify what you'd like to be quizzed on."
                )
            )
            return

        try:
            # Import required modules inside the handler to avoid circular imports
            from src.data.models.extended_models import Message
            from src.core.catalyst_agent import CatalystAgentImpl
            from src.ai.service import ModelAbstractionService
            import os

            # Get workspace path from context
            workspace_path = context.get('workspace_path', '.')
            
            # Initialize components
            model_service = ModelAbstractionService()
            # Note: In a real implementation, we would properly configure the provider
            # For now, we'll proceed with the configuration
            
            learningspace_path = os.path.join(workspace_path, ".catalyst")
            db_path = os.path.join(learningspace_path, "data.db")
            
            from src.core.knowledge_navigator import SQLiteKnowledgeNavigator
            knowledge_navigator = SQLiteKnowledgeNavigator(db_path)
            
            catalyst_agent = CatalystAgentImpl(model_service, knowledge_navigator=knowledge_navigator)
            
            # Search for the requested concept
            import asyncio
            concept_name = " ".join(args)
            concepts = asyncio.run(knowledge_navigator.get_available_concepts())
            
            # Find matching concept (simple matching for now)
            target_concept = None
            for concept in concepts:
                if concept_name.lower() in concept.title.lower():
                    target_concept = concept
                    break
            
            if not target_concept:
                self.cli_interface.display_message(
                    Message(
                        role="system", 
                        content=f"No concept found matching '{concept_name}'. Try using /concepts to see available topics."
                    )
                )
                return

            # Generate challenge using the catalyst agent
            challenge_data = asyncio.run(catalyst_agent.generate_challenge(
                target_concept, 
                {"challenge_type": "multiple-choice", "difficulty": "medium"}
            ))
            
            self.cli_interface.display_message(
                Message(
                    role="system", 
                    content=f"❓ Challenge: {target_concept.title}\n\n{challenge_data.get('challenge_text', 'Challenge content not available.')}"
                )
            )
            
        except Exception as e:
            self.cli_interface.display_message(
                Message(role="system", content=f"Error generating challenge: {str(e)}")
            )
