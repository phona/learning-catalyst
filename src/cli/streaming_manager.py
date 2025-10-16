"""
Live streaming manager for Learning Catalyst CLI.

Provides comprehensive live streaming interface with Rich Live display management,
real-time content updates, thinking process visibility, and smooth state transitions.
"""

import asyncio
import time
from typing import Any, Dict, List, Optional, Callable, AsyncGenerator
from contextlib import asynccontextmanager

from rich.live import Live
from rich.console import Console, Group
from rich.text import Text
from rich.markdown import Markdown
from rich.panel import Panel
from rich.rule import Rule
from rich.align import Align
from rich.columns import Columns
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, TimeElapsedColumn
from rich import box

from .streaming_state import StreamingSession, StreamingStateManager
from .status_indicators import AIState, StatusIndicatorManager, create_progress_indicator


class LiveStreamingManager:
    """Manages live streaming display with Rich Live and real-time updates."""

    def __init__(self, refresh_rate: int = 8, console: Optional[Console] = None):
        """
        Initialize live streaming manager.

        Args:
            refresh_rate: Display refresh rate per second
            console: Rich console instance (creates new one if None)
        """
        self.refresh_rate = refresh_rate
        self.console = console or Console()
        self.state_manager = StreamingStateManager()
        self.status_manager = StatusIndicatorManager()

        # Live display management
        self._live: Optional[Live] = None
        self._display_task: Optional[asyncio.Task] = None
        self._update_lock = asyncio.Lock()
        self._force_update = asyncio.Event()

        # Display components
        self._custom_panels: List[Callable] = []
        self._post_render_callbacks: List[Callable] = []

        # Performance tracking
        self._render_count = 0
        self._last_render_time = 0
        self._average_render_time = 0

    def add_custom_panel(self, panel_func: Callable[[], Any]) -> None:
        """
        Add a custom panel function to the display.

        Args:
            panel_func: Function that returns a Rich renderable
        """
        self._custom_panels.append(panel_func)

    def remove_custom_panel(self, panel_func: Callable[[], Any]) -> None:
        """
        Remove a custom panel function from the display.

        Args:
            panel_func: Function to remove
        """
        if panel_func in self._custom_panels:
            self._custom_panels.remove(panel_func)

    def add_post_render_callback(self, callback: Callable[[], None]) -> None:
        """
        Add a callback to execute after each render.

        Args:
            callback: Function to call after rendering
        """
        self._post_render_callbacks.append(callback)

    @asynccontextmanager
    async def streaming_session(self, user_input: str, provider_name: str, model_name: str):
        """
        Context manager for a streaming session.

        Args:
            user_input: User's input
            provider_name: AI provider name
            model_name: Model name

        Yields:
            Streaming session instance
        """
        session_id = self.state_manager.create_session(user_input, provider_name, model_name)
        session = self.state_manager.get_active_session()

        try:
            # Setup status manager
            self.status_manager.set_provider_info(provider_name, model_name)
            self.status_manager.set_state(AIState.THINKING)

            # Start live display
            await self._start_live_display()

            yield session

        finally:
            # Ensure session is properly ended
            if session and session.is_active():
                session.mark_complete()

            # Stop live display
            await self._stop_live_display()

    async def _start_live_display(self) -> None:
        """Start the Rich Live display."""
        if self._live is not None:
            return  # Already running

        self._live = Live(
            console=self.console,
            refresh_per_second=self.refresh_rate,
            transient=False
        )

        self._display_task = asyncio.create_task(self._display_loop())
        self._live.start()

    async def _stop_live_display(self) -> None:
        """Stop the Rich Live display."""
        if self._display_task:
            self._display_task.cancel()
            try:
                await self._display_task
            except asyncio.CancelledError:
                pass
            self._display_task = None

        if self._live:
            self._live.stop()
            self._live = None

    async def _display_loop(self) -> None:
        """Main display loop for live updates."""
        while True:
            try:
                # Check if we should update
                if self._force_update.is_set():
                    self._force_update.clear()

                # Create display content
                content = await self._create_display_content()

                # Update live display
                if self._live and content:
                    self._track_render_performance()
                    self._live.update(content)

                # Execute post-render callbacks
                for callback in self._post_render_callbacks:
                    try:
                        callback()
                    except Exception:
                        pass  # Ignore callback errors

                # Small delay to prevent excessive CPU usage
                await asyncio.sleep(1.0 / self.refresh_rate)

            except asyncio.CancelledError:
                break
            except Exception:
                # Continue loop even if there's an error
                await asyncio.sleep(0.1)

    def _track_render_performance(self) -> None:
        """Track rendering performance metrics."""
        current_time = time.time()
        if self._last_render_time > 0:
            render_time = current_time - self._last_render_time
            self._render_count += 1
            # Simple moving average
            self._average_render_time = (self._average_render_time * 0.9 + render_time * 0.1)
        self._last_render_time = current_time

    async def _create_display_content(self) -> Optional[Group]:
        """
        Create the complete display content for the current state.

        Returns:
            Rich Group with all display elements
        """
        session = self.state_manager.get_active_session()
        if not session:
            return None

        # Update status manager
        self.status_manager.set_state(session.current_state)
        if session.metrics:
            self.status_manager.set_metrics(session.metrics)
        self.status_manager.set_thinking_visibility(session.thinking_visible)

        elements = []

        # Create header
        header = self._create_header(session)
        elements.append(header)
        elements.append(Rule(style="blue"))

        # Add thinking panel if visible and has content
        if (session.thinking_visible and
            session.content.thinking_content.strip() and
            session.current_state in [AIState.THINKING, AIState.RESPONDING, AIState.COMPLETE]):

            thinking_panel = self._create_thinking_panel(session)
            elements.append(thinking_panel)
            elements.append(Rule(style="blue"))

        # Add main content
        content_panel = self._create_content_panel(session)
        if content_panel:
            elements.append(content_panel)

        # Add progress indicator for active states
        if session.is_active() and session.current_state in [AIState.THINKING, AIState.RESPONDING]:
            progress = self._create_progress_indicator(session)
            if progress:
                elements.append(Rule(style="dim"))
                elements.append(progress)

        # Add status line
        status_line = self._create_status_line(session)
        elements.append(Rule(style="blue"))
        elements.append(status_line)

        # Add custom panels
        for panel_func in self._custom_panels:
            try:
                custom_content = panel_func()
                if custom_content:
                    elements.append(custom_content)
            except Exception:
                pass  # Ignore custom panel errors

        return Group(*elements)

    def _create_header(self, session: StreamingSession) -> Text:
        """
        Create the header for the display.

        Args:
            session: Current streaming session

        Returns:
            Rich Text header
        """
        config = self.status_manager.get_state_config()

        # Main header with state indicator
        header_parts = [
            Text("● ", style="dim"),
            Text(session.model_name, style="bold"),
            Text(" ", style="dim"),
            Text(config.icon, style=config.style),
            Text(f" {config.description}:", style=config.style)
        ]

        header = Text()
        for part in header_parts:
            header.append(part)

        return header

    def _create_thinking_panel(self, session: StreamingSession) -> Panel:
        """
        Create the thinking process panel.

        Args:
            session: Current streaming session

        Returns:
            Rich Panel with thinking content
        """
        title = self.status_manager.create_thinking_panel_title()

        try:
            # Try to render as markdown
            content = Markdown(session.content.thinking_content)
        except Exception:
            # Fallback to plain text
            content = Text(session.content.thinking_content)

        return Panel(
            content,
            title=title,
            border_style="cyan",
            box=box.ROUNDED,
            padding=(0, 1)
        )

    def _create_content_panel(self, session: StreamingSession) -> Optional[Any]:
        """
        Create the main content panel.

        Args:
            session: Current streaming session

        Returns:
            Rich renderable content or None
        """
        display_content = session.content.get_display_content()

        if not display_content.strip():
            # Show placeholder for empty content
            if session.current_state == AIState.THINKING:
                return Text("🤔 Thinking...", style="dim italic")
            else:
                return None

        try:
            # Try to render as markdown
            return Markdown(display_content)
        except Exception:
            # Fallback to plain text
            return Text(display_content)

    def _create_progress_indicator(self, session: StreamingSession) -> Optional[Any]:
        """
        Create a progress indicator for active streaming.

        Args:
            session: Current streaming session

        Returns:
            Rich renderable progress indicator or None
        """
        if not session.is_active():
            return None

        # Create a progress bar
        progress = Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            BarColumn(),
            TextColumn("[progress.percentage]{task.percentage:>3.0f}%"),
            TimeElapsedColumn(),
            console=self.console
        )

        # Add progress task
        if session.current_state == AIState.THINKING:
            task_id = progress.add_task("Thinking...", total=100)
        elif session.current_state == AIState.RESPONDING:
            task_id = progress.add_task("Generating response...", total=100)
        else:
            return None

        # Update progress based on content length (heuristic)
        if session.metrics and session.metrics.elapsed_time > 0:
            # Estimate progress based on time and content
            time_progress = min(90, session.metrics.elapsed_time * 10)  # 10% per second, max 90%
            content_progress = min(90, len(session.content.accumulated_content) / 20)  # 1% per 20 chars
            progress_value = max(time_progress, content_progress)
            progress.update(task_id, completed=progress_value)

        return progress

    def _create_status_line(self, session: StreamingSession) -> Text:
        """
        Create the status line with hotkey hints.

        Args:
            session: Current streaming session

        Returns:
            Rich Text status line
        """
        return self.status_manager.create_hotkey_hints()

    async def update_content(self, chunk: str) -> None:
        """
        Update streaming content and trigger display refresh.

        Args:
            chunk: New content chunk
        """
        async with self._update_lock:
            session = self.state_manager.get_active_session()
            if session:
                session.add_content_chunk(chunk)
                self._force_update.set()

    async def toggle_thinking_visibility(self) -> bool:
        """
        Toggle thinking process visibility.

        Returns:
            New visibility state
        """
        session = self.state_manager.get_active_session()
        if session:
            new_visibility = session.toggle_thinking_visibility()
            self._force_update.set()
            return new_visibility
        return False

    async def cancel_streaming(self, reason: str = "User cancelled") -> None:
        """
        Cancel the current streaming session.

        Args:
            reason: Reason for cancellation
        """
        session = self.state_manager.get_active_session()
        if session:
            session.cancel_session(reason)
            self.status_manager.set_state(AIState.CANCELLED)
            self._force_update.set()

    async def mark_error(self, error: str) -> None:
        """
        Mark the current session as errored.

        Args:
            error: Error message
        """
        session = self.state_manager.get_active_session()
        if session:
            session.mark_error(error)
            self.status_manager.set_state(AIState.ERROR)
            self._force_update.set()

    async def mark_complete(self) -> None:
        """Mark the current session as complete."""
        session = self.state_manager.get_active_session()
        if session:
            session.mark_complete()
            self.status_manager.set_state(AIState.COMPLETE)
            self._force_update.set()

    def get_session_summary(self) -> Optional[Dict[str, Any]]:
        """
        Get summary of the current session.

        Returns:
            Session summary dictionary or None
        """
        session = self.state_manager.get_active_session()
        if session:
            return session.get_summary()
        return None

    def get_performance_metrics(self) -> Dict[str, Any]:
        """
        Get performance metrics for the streaming manager.

        Returns:
            Performance metrics dictionary
        """
        return {
            "render_count": self._render_count,
            "average_render_time": self._average_render_time,
            "refresh_rate": self.refresh_rate,
            "active_sessions": len([s for s in self.state_manager._sessions.values() if s.is_active()]),
            "total_sessions": len(self.state_manager._sessions)
        }

    async def cleanup(self) -> None:
        """Clean up resources and stop display."""
        await self._stop_live_display()
        self.state_manager.cleanup_old_sessions(max_age_seconds=0)  # Clean up all sessions


# Convenience function for creating streaming manager
def create_streaming_manager(refresh_rate: int = 8, console: Optional[Console] = None) -> LiveStreamingManager:
    """
    Create a new live streaming manager.

    Args:
        refresh_rate: Display refresh rate per second
        console: Rich console instance

    Returns:
        LiveStreamingManager instance
    """
    return LiveStreamingManager(refresh_rate=refresh_rate, console=console)