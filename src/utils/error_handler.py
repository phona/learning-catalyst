"""
Centralized error handling utilities for Learning Catalyst
"""

import asyncio
import logging
import traceback
from functools import wraps
from pathlib import Path
from typing import Any, Callable, Dict, Optional

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.FileHandler("learning_catalyst.log"), logging.StreamHandler()],
)

logger = logging.getLogger(__name__)


class LearningCatalystError(Exception):
    """Base exception class for Learning Catalyst application"""

    def __init__(self, message: str, error_code: Optional[str] = None, context: Optional[Dict[str, Any]] = None):
        super().__init__(message)
        self.message = message
        self.error_code = error_code
        self.context = context or {}


class ConfigurationError(LearningCatalystError):
    """Raised when there are configuration issues"""


class APIError(LearningCatalystError):
    """Raised when API calls fail"""


class DatabaseError(LearningCatalystError):
    """Raised when database operations fail"""


class ValidationError(LearningCatalystError):
    """Raised when input validation fails"""


class FileOperationError(LearningCatalystError):
    """Raised when file operations fail"""


def handle_errors(
    error_types: type[Exception] | tuple[type[Exception], ...] = Exception,
    reraise: bool = False,
    default_return: Any = None,
    log_level: int = logging.ERROR,
):
    """
    Decorator for standardized error handling

    Args:
        error_types: Exception types to catch
        reraise: Whether to re-raise the exception after logging
        default_return: Default value to return if an error occurs
        log_level: Logging level to use for the error
    """

    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            try:
                return func(*args, **kwargs)
            except error_types as e:
                # Log the error with context
                error_context = {
                    "function": func.__name__,
                    "module": func.__module__,
                    "args": str(args)[:200],  # Limit length to avoid huge logs
                    "kwargs": str(kwargs)[:200],
                    "traceback": traceback.format_exc(),
                }

                logger.log(log_level, "Error in %s: %s", func.__name__, str(e), extra={"context": error_context})

                if reraise:
                    raise

                # Convert to appropriate LearningCatalystError if needed
                if not isinstance(e, LearningCatalystError):
                    LearningCatalystError(message=str(e), error_code=type(e).__name__, context=error_context)
                    return default_return

                return default_return

        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            try:
                return await func(*args, **kwargs)
            except error_types as e:
                # Log the error with context
                error_context = {
                    "function": func.__name__,
                    "module": func.__module__,
                    "args": str(args)[:200],  # Limit length to avoid huge logs
                    "kwargs": str(kwargs)[:200],
                    "traceback": traceback.format_exc(),
                }

                logger.log(log_level, "Error in async %s: %s", func.__name__, str(e), extra={"context": error_context})

                if reraise:
                    raise

                # Convert to appropriate LearningCatalystError if needed
                if not isinstance(e, LearningCatalystError):
                    LearningCatalystError(message=str(e), error_code=type(e).__name__, context=error_context)
                    return default_return

                return default_return

        # Return appropriate wrapper based on whether function is async
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        return wrapper

    return decorator


def log_info(message: str, context: Optional[Dict[str, Any]] = None) -> None:
    """Log informational messages with optional context"""
    logger.info(message, extra={"context": context or {}})


def log_warning(message: str, context: Optional[Dict[str, Any]] = None) -> None:
    """Log warning messages with optional context"""
    logger.warning(message, extra={"context": context or {}})


def log_error(message: str, context: Optional[Dict[str, Any]] = None) -> None:
    """Log error messages with optional context"""
    logger.error(message, extra={"context": context or {}})


def validate_file_path(file_path: str, must_exist: bool = True) -> Path:
    """Validate file path and return Path object"""
    path = Path(file_path)

    if must_exist and not path.exists():
        raise FileOperationError(f"File does not exist: {file_path}")

    if not must_exist and not path.parent.exists():
        raise FileOperationError(f"Parent directory does not exist: {path.parent}")

    return path


def validate_directory_path(dir_path: str, create_if_missing: bool = False) -> Path:
    """Validate directory path and return Path object"""
    path = Path(dir_path)

    if not path.exists():
        if create_if_missing:
            path.mkdir(parents=True, exist_ok=True)
        else:
            raise FileOperationError(f"Directory does not exist: {dir_path}")

    if not path.is_dir():
        raise FileOperationError(f"Path is not a directory: {dir_path}")

    return path


class ErrorReporter:
    """Utility class for reporting errors in a standardized way"""

    @staticmethod
    def report_api_error(
        endpoint: str,
        status_code: Optional[int] = None,
        response_text: Optional[str] = None,
        original_error: Optional[Exception] = None,
    ) -> APIError:
        """Create and return a standardized API error"""
        message = f"API call failed for endpoint: {endpoint}"
        if status_code:
            message += f" (HTTP {status_code})"

        context = {
            "endpoint": endpoint,
            "status_code": status_code,
            "response_text": response_text[:500] if response_text else None,
        }

        error = APIError(message, error_code="API_ERROR", context=context)
        if original_error:
            error.__cause__ = original_error
        return error

    @staticmethod
    def report_database_error(
        operation: str,
        table: Optional[str] = None,
        query: Optional[str] = None,
        original_error: Optional[Exception] = None,
    ) -> DatabaseError:
        """Create and return a standardized database error"""
        message = f"Database operation failed: {operation}"
        if table:
            message += f" on table: {table}"

        context = {"operation": operation, "table": table, "query": query[:200] if query else None}

        error = DatabaseError(message, error_code="DB_ERROR", context=context)
        if original_error:
            error.__cause__ = original_error
        return error

    @staticmethod
    def report_validation_error(
        field_name: str, field_value: Any, validation_rule: str, original_error: Optional[Exception] = None
    ) -> ValidationError:
        """Create and return a standardized validation error"""
        message = f"Validation failed for field '{field_name}': {validation_rule}"

        context = {"field_name": field_name, "field_value": str(field_value)[:100], "validation_rule": validation_rule}

        error = ValidationError(message, error_code="VALIDATION_ERROR", context=context)
        if original_error:
            error.__cause__ = original_error
        return error
