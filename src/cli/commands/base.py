"""
Base command classes for the CLI command system
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum
from typing import Any, Callable, Dict, List, Optional, Type, TypeVar, Union


class CommandCategory(Enum):
    """Command categories for organization"""

    SYSTEM = "System"
    CONFIG = "Configuration"
    LEARNING = "Learning"
    ANALYTICS = "Analytics"
    GENERAL = "General"


@dataclass
class CommandInfo:
    """Information about a command"""

    name: str
    description: str
    aliases: List[str]
    usage: str = ""
    category: str = "General"
    examples: Optional[List[str]] = None

    def __post_init__(self):
        if self.examples is None:
            self.examples = []


@dataclass
class CommandResult:
    """Result of command execution"""

    success: bool
    message: str = ""
    data: Any = None
    error: Optional[str] = None

    def __bool__(self):
        return self.success


# Type variable for BaseCommand subclasses
T = TypeVar("T", bound="BaseCommand")


@dataclass
class CommandDecoratorConfig:
    """Configuration for command decorator"""

    name: str
    description: str = ""
    aliases: Optional[List[str]] = None
    usage: str = ""
    category: Union[str, CommandCategory] = "General"
    examples: Optional[List[str]] = None


def command(config: CommandDecoratorConfig):
    """Decorator for registering commands"""

    def decorator(obj: Union[Type[T], Callable[..., Any]]) -> Union[Type[T], Callable[..., Any]]:
        # Store command metadata on the object
        setattr(obj, "_command_name", config.name)
        setattr(obj, "_command_description", config.description)
        setattr(obj, "_command_aliases", config.aliases or [])
        setattr(obj, "_command_usage", config.usage)
        # Handle both string and CommandCategory enum values
        if isinstance(config.category, CommandCategory):
            setattr(obj, "_command_category", config.category.value)
        else:
            setattr(obj, "_command_category", config.category)
        setattr(obj, "_command_examples", config.examples or [])
        return obj

    return decorator


class BaseCommand(ABC):
    """Abstract base class for all commands"""

    # Class attributes to be set by the decorator
    _command_name: str
    _command_description: str
    _command_aliases: List[str]
    _command_usage: str
    _command_category: str
    _command_examples: List[str]

    def __init__(self):
        self.info = self.get_info()

    @abstractmethod
    def get_info(self) -> CommandInfo:
        """Get command information"""

    @abstractmethod
    async def execute(self, args: List[str], context: Dict[str, Any]) -> CommandResult:
        """Execute the command"""

    def can_execute(self, _args: List[str], _context: Dict[str, Any]) -> bool:
        """Check if the command can be executed with the given args and context"""
        return True

    def validate_args(self, _args: List[str]) -> Optional[str]:
        """Validate command arguments and return error message if invalid"""
        return None
