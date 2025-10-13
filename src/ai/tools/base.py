"""
Base classes for learning tools.

Simple tool interfaces following "less is more" principle.
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from dataclasses import dataclass


@dataclass
class ToolResult:
    """Result from tool execution."""
    success: bool
    data: Any = None
    message: str = ""
    error: Optional[str] = None

    def __post_init__(self):
        if self.success and not self.message:
            self.message = "Tool executed successfully"
        elif not self.success and not self.error:
            self.error = "Tool execution failed"


class Tool(ABC):
    """Base class for all learning tools."""

    def __init__(self, name: str, description: str):
        """Initialize tool.

        Args:
            name: Tool name
            description: Tool description
        """
        self.name = name
        self.description = description

    @abstractmethod
    async def execute(self, **kwargs) -> ToolResult:
        """
        Execute the tool.

        Args:
            **kwargs: Tool-specific parameters

        Returns:
            ToolResult with execution outcome
        """
        pass

    def get_parameters(self) -> Dict[str, Any]:
        """
        Get tool parameter schema.

        Returns:
            Dictionary describing required and optional parameters
        """
        return {
            "required": [],
            "optional": []
        }

    def validate_parameters(self, **kwargs) -> bool:
        """
        Validate tool parameters.

        Args:
            **kwargs: Parameters to validate

        Returns:
            True if parameters are valid
        """
        return True


class ToolRegistry:
    """Registry for managing learning tools."""

    def __init__(self):
        """Initialize tool registry."""
        self._tools: Dict[str, Tool] = {}

    def register_tool(self, tool: Tool) -> bool:
        """
        Register a tool.

        Args:
            tool: Tool to register

        Returns:
            True if registered successfully
        """
        if tool.name in self._tools:
            return False  # Tool already exists

        self._tools[tool.name] = tool
        return True

    def unregister_tool(self, name: str) -> bool:
        """
        Unregister a tool.

        Args:
            name: Tool name to unregister

        Returns:
            True if unregistered successfully
        """
        if name in self._tools:
            del self._tools[name]
            return True
        return False

    def get_tool(self, name: str) -> Optional[Tool]:
        """
        Get a tool by name.

        Args:
            name: Tool name

        Returns:
            Tool or None if not found
        """
        return self._tools.get(name)

    def list_tools(self) -> List[str]:
        """
        Get list of registered tool names.

        Returns:
            List of tool names
        """
        return list(self._tools.keys())

    def get_tool_info(self) -> Dict[str, Dict[str, Any]]:
        """
        Get information about all registered tools.

        Returns:
            Dictionary with tool information
        """
        info = {}
        for name, tool in self._tools.items():
            info[name] = {
                "name": tool.name,
                "description": tool.description,
                "parameters": tool.get_parameters()
            }
        return info

    async def execute_tool(self, name: str, **kwargs) -> ToolResult:
        """
        Execute a tool by name.

        Args:
            name: Tool name
            **kwargs: Tool parameters

        Returns:
            ToolResult from tool execution
        """
        tool = self._tools.get(name)
        if not tool:
            return ToolResult(
                success=False,
                error=f"Tool '{name}' not found"
            )

        # Validate parameters
        if not tool.validate_parameters(**kwargs):
            return ToolResult(
                success=False,
                error=f"Invalid parameters for tool '{name}'"
            )

        try:
            return await tool.execute(**kwargs)
        except Exception as e:
            return ToolResult(
                success=False,
                error=f"Tool execution failed: {str(e)}"
            )

    def get_tools_dict(self) -> Dict[str, Any]:
        """
        Get tools as a dictionary for agent consumption.

        Returns:
            Dictionary with tool functions
        """
        tools_dict = {}

        for name, tool in self._tools.items():
            # Create a wrapper function for the tool
            async def tool_wrapper(**kwargs):
                return await tool.execute(**kwargs)

            # Set the name properly (need to capture the current name)
            tool_wrapper.__name__ = name
            tools_dict[name] = tool_wrapper

        return tools_dict