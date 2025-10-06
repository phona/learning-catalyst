"""
Analytics command handlers
"""

import asyncio
from typing import Any, Dict, List

from .base import BaseCommandHandler, CommandInfo


class AnalyticsCommandHandler(BaseCommandHandler):
    """Handler for analytics-related commands"""

    def get_commands(self) -> List[CommandInfo]:
        """Return list of analytics commands"""
        return [
            CommandInfo(
                name="tokens",
                description="Show token usage statistics",
                aliases=["usage"],
                usage="/tokens [model_name]",
                category="Analytics",
            ),
        ]

    def _tokens_command(self, args: List[str], context: Dict[str, Any]) -> None:
        """Handler for the tokens command"""
        try:
            # Import required modules inside the handler to avoid circular imports
            from src.cli.system_commands_handler import SystemCommandsHandlerImpl

            # Create system commands handler
            system_handler = SystemCommandsHandlerImpl(
                self.context.db_manager, None, self.context.preferences_manager
            )

            # Get model name from args if provided
            model_name = args[0] if args else ""

            if model_name:
                # Get detailed usage for specific model
                detailed_usage = asyncio.run(system_handler.get_detailed_token_usage(model_name))

                content = f"📊 Detailed Token Usage for {model_name}:\n\n"
                if detailed_usage:
                    for record in detailed_usage:
                        content += f"• {record['timestamp']}: {record['input_tokens']} input, {record['output_tokens']} output tokens\n"
                        if record.get('context') and record['context'] != 'unknown':
                            content += f"  Context: {record['context']}\n"
                else:
                    content = f"📊 No detailed usage records found for model: {model_name}"
            else:
                # Get summary usage
                token_usage = asyncio.run(system_handler.get_token_usage())

                content = "📊 Token Usage Summary (Last 30 days):\n\n"
                content += f"• Total Tokens: {token_usage.get('total_tokens', 0)}\n"
                content += f"• Input Tokens: {token_usage.get('input_tokens', 0)}\n"
                content += f"• Output Tokens: {token_usage.get('output_tokens', 0)}\n"

            self._display_message(content)

        except Exception as e:
            self._display_error("Error retrieving token usage", str(e))