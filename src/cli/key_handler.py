"""
Enhanced key handling for Learning Catalyst CLI.

Provides basic key combination detection with proper async task cleanup and terminal handling.
"""

import asyncio
import logging
import sys
import termios
import threading
import tty
from select import select
from typing import Callable, Dict, Optional, Set

logger = logging.getLogger(__name__)


class KeyHandler:
    """Enhanced key handler with proper async task cleanup and terminal handling."""

    # Class-level set to track all instances for proper cleanup
    _instances: Set["KeyHandler"] = set()

    def __init__(self):
        """Initialize key handler."""
        self._running = False
        self._key_handlers: Dict[str, Callable] = {}
        self._original_settings = None
        self._loop: Optional[asyncio.AbstractEventLoop] = None
        self._task: Optional[asyncio.Task] = None
        self._cleanup_event = asyncio.Event()
        self._setup_lock = threading.Lock()
        self._initialized = False
        self._pending_futures: Set[asyncio.Future] = set()

        # Track this instance
        self._instances.add(self)

    def add_key_handler(self, key_combo: str, handler: Callable) -> None:
        """
        Add a handler for a specific key combination.

        Args:
            key_combo: Key combination (e.g., "ctrl+o", "ctrl+c")
            handler: Callback function to execute
        """
        normalized_combo = key_combo.lower()
        self._key_handlers[normalized_combo] = handler
        logger.info(f"Added key handler for: {key_combo}")

    def remove_key_handler(self, key_combo: str) -> None:
        """
        Remove a key handler.

        Args:
            key_combo: Key combination to remove
        """
        normalized_combo = key_combo.lower()
        if normalized_combo in self._key_handlers:
            del self._key_handlers[normalized_combo]
            logger.info(f"Removed key handler for: {key_combo}")

    def _get_key_nonblocking(self) -> Optional[str]:
        """
        Read a single key from stdin without blocking.

        Returns:
            Key character or None if no key available
        """
        try:
            # Use select for non-blocking read
            if select([sys.stdin], [], [], 0) == ([sys.stdin], [], []):
                key = sys.stdin.read(1)
                logger.debug(f"Key read: {repr(key)} (ord: {ord(key) if key else 'N/A'})")
                return key
        except (OSError, IOError) as e:
            logger.debug(f"Error reading key: {e}")
        except Exception as e:
            logger.error(f"Unexpected error reading key: {e}")
        return None

    def _detect_key_combo(self, key_sequence: str) -> Optional[str]:
        """
        Detect key combination from sequence.

        Args:
            key_sequence: Sequence of characters read from stdin

        Returns:
            Detected key combination or None
        """
        # Handle Ctrl+C (ASCII 3)
        if key_sequence == "\x03":
            logger.debug("Detected Ctrl+C")
            return "ctrl+c"

        # Handle Ctrl+D (ASCII 4)
        if key_sequence == "\x04":
            logger.debug("Detected Ctrl+D")
            return "ctrl+d"

        # Handle regular keys (normalize to lowercase)
        if len(key_sequence) == 1 and key_sequence.isprintable():
            logger.debug(f"Detected regular key: {key_sequence}")
            return key_sequence.lower()

        return None

    def _safe_execute_handler(self, handler: Callable, combo: str) -> None:
        """
        Safely execute a key handler.

        Args:
            handler: Handler function to execute
            combo: Key combination that triggered the handler
        """
        try:
            logger.info(f"Executing handler for {combo}")

            # Check if handler is a coroutine function
            if asyncio.iscoroutinefunction(handler):
                # For coroutine functions, we need to handle them differently
                # since we're in a different thread context
                try:
                    # Create a task in the main event loop if available
                    if self._loop and not self._loop.is_closed():
                        future = asyncio.run_coroutine_threadsafe(handler(), self._loop)
                        # Store the future for cleanup
                        self._pending_futures.add(future)

                        # Add callback to remove from pending set when done
                        future.add_done_callback(lambda f: self._pending_futures.discard(f))
                    else:
                        logger.warning(f"Cannot execute async handler for {combo}: no event loop")
                except Exception as e:
                    logger.error(f"Error scheduling async handler for {combo}: {e}")
            else:
                # Execute synchronous handlers directly
                handler()

        except Exception as e:
            logger.error(f"Error executing key handler for {combo}: {e}")

    async def _key_monitor(self) -> None:
        """Background task to monitor key presses with proper cleanup."""
        logger.info("Key monitoring started")

        terminal_set = False
        try:
            # Only set terminal to raw mode if we're in a TTY and have proper lock
            if sys.stdin.isatty() and self._setup_lock.acquire(blocking=False):
                try:
                    self._original_settings = termios.tcgetattr(sys.stdin)
                    tty.setraw(sys.stdin.fileno())
                    terminal_set = True
                    logger.debug("Terminal set to raw mode")
                except Exception as e:
                    logger.error(f"Error setting raw mode: {e}")
                finally:
                    self._setup_lock.release()

            # Main monitoring loop
            while self._running and not self._cleanup_event.is_set():
                try:
                    # Non-blocking key read
                    key = self._get_key_nonblocking()
                    if key:
                        combo = self._detect_key_combo(key)
                        if combo and combo in self._key_handlers:
                            handler = self._key_handlers[combo]
                            self._safe_execute_handler(handler, combo)

                    # Small delay to prevent CPU spinning
                    try:
                        await asyncio.wait_for(self._cleanup_event.wait(), timeout=0.01)
                        break  # Event was set, we should exit
                    except asyncio.TimeoutError:
                        continue  # Normal timeout, continue monitoring

                except Exception as e:
                    logger.error(f"Error in key monitor loop: {e}")
                    # Don't break the loop on individual errors, try to continue
                    await asyncio.sleep(0.1)

        except asyncio.CancelledError:
            logger.info("Key monitor task cancelled")
        except Exception as e:
            logger.error(f"Fatal error in key monitor: {e}")
        finally:
            # Restore terminal settings
            if terminal_set and self._original_settings and sys.stdin.isatty():
                if self._setup_lock.acquire(blocking=False):
                    try:
                        termios.tcsetattr(sys.stdin, termios.TCSADRAIN, self._original_settings)
                        logger.debug("Terminal settings restored")
                    except Exception as e:
                        logger.error(f"Error restoring terminal settings: {e}")
                    finally:
                        self._setup_lock.release()

            logger.info("Key monitoring stopped")

    def start(self, loop: Optional[asyncio.AbstractEventLoop] = None) -> None:
        """
        Start key monitoring with proper initialization.

        Args:
            loop: Event loop to use (defaults to current event loop)
        """
        with self._setup_lock:
            if self._running:
                logger.warning("Key handler already running")
                return

            try:
                self._running = True
                self._cleanup_event.clear()
                self._loop = loop or asyncio.get_event_loop()

                # Create the monitoring task
                self._task = self._loop.create_task(self._key_monitor())

                # Add a done callback to handle task completion
                self._task.add_done_callback(self._task_done_callback)

                self._initialized = True
                logger.info("Key handler started successfully")

            except Exception as e:
                logger.error(f"Error starting key handler: {e}")
                self._running = False
                self._initialized = False
                raise

    def _task_done_callback(self, task: asyncio.Task) -> None:
        """Handle task completion."""
        try:
            # Check if task completed with an exception
            if task.exception():
                logger.error(f"Key monitor task failed: {task.exception()}")
        except asyncio.CancelledError:
            logger.info("Key monitor task was cancelled")
        except Exception as e:
            logger.error(f"Error in task done callback: {e}")

    def stop(self) -> None:
        """Stop key monitoring with proper cleanup."""
        with self._setup_lock:
            if not self._running:
                return

            logger.info("Stopping key handler...")
            self._running = False

            # Cancel any pending futures
            for future in list(self._pending_futures):
                if not future.done():
                    try:
                        future.cancel()
                    except Exception:
                        pass  # Ignore errors during cleanup
            self._pending_futures.clear()

            # Signal the monitoring task to stop
            self._cleanup_event.set()

            # Cancel the task if it's still running
            if self._task and not self._task.done():
                try:
                    self._task.cancel()

                    # Simple approach: let the task cleanup naturally
                    # The CancelledError will be handled in _key_monitor()
                    # We don't need complex sync/async bridging here

                except Exception as e:
                    logger.error(f"Error cancelling key monitor task: {e}")

            self._task = None
            self._initialized = False
            logger.info("Key handler stopped")

    def __del__(self):
        """Cleanup when instance is destroyed."""
        try:
            if self._initialized:
                logger.warning("KeyHandler was not properly stopped before destruction")
                # Don't call self.stop() here as it may create coroutines in __del__
                # Just do minimal cleanup
                self._running = False
                self._initialized = False
                self._task = None
            if self in self._instances:
                self._instances.remove(self)
        except Exception:
            # Ignore errors during cleanup
            pass


class SimpleKeyHandler:
    """Simplified key handler that works with standard input."""

    def __init__(self, cli_interface):
        """
        Initialize simple key handler.

        Args:
            cli_interface: Reference to CLI interface for callbacks
        """
        self.cli_interface = cli_interface
        self._setup_handlers()

    def _setup_handlers(self) -> None:
        """Setup basic key handlers."""
        # This is kept for backward compatibility
        pass


# Global key handler management
_key_handler_instance: Optional[KeyHandler] = None
_key_handler_lock = threading.Lock()


def get_key_handler() -> Optional[KeyHandler]:
    """Get the global key handler instance thread-safely."""
    with _key_handler_lock:
        return _key_handler_instance


def initialize_key_handler(cli_interface) -> SimpleKeyHandler:
    """
    Initialize key handling for the CLI interface with proper error handling.

    Args:
        cli_interface: CLI interface to handle keys for

    Returns:
        Simple key handler instance as fallback
    """
    global _key_handler_instance

    with _key_handler_lock:
        try:
            # Try to create advanced key handler
            _key_handler_instance = KeyHandler()

            # Start monitoring - this might fail in some terminal environments
            try:
                _key_handler_instance.start()
                logger.info("Advanced key handler initialized successfully")
            except Exception as start_error:
                logger.error(f"Failed to start key handler: {start_error}")
                # Clean up the failed instance
                _key_handler_instance.stop()
                _key_handler_instance = None
                raise start_error

            return SimpleKeyHandler(cli_interface)

        except Exception as e:
            logger.warning(f"Failed to initialize advanced key handler: {e}")
            logger.info("Falling back to simple key handler")

            # Ensure we don't leave a partially initialized handler
            if _key_handler_instance:
                try:
                    _key_handler_instance.stop()
                except Exception:
                    pass
                _key_handler_instance = None

            # Fallback to simple handler
            return SimpleKeyHandler(cli_interface)


def cleanup_key_handler() -> None:
    """Cleanup the global key handler instance thread-safely."""
    global _key_handler_instance

    with _key_handler_lock:
        if _key_handler_instance:
            try:
                _key_handler_instance.stop()
                logger.info("Key handler cleaned up successfully")
            except Exception as e:
                logger.error(f"Error during key handler cleanup: {e}")
            finally:
                _key_handler_instance = None


# Cleanup all key handler instances (useful for testing)
def cleanup_all_key_handlers() -> None:
    """Cleanup all key handler instances."""
    with _key_handler_lock:
        # Copy the set to avoid modification during iteration
        instances = set(KeyHandler._instances)
        for instance in instances:
            try:
                instance.stop()
            except Exception as e:
                logger.error(f"Error cleaning up key handler instance: {e}")

        KeyHandler._instances.clear()
        _key_handler_instance = None