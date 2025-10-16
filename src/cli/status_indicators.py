"""
Status indicator system for Learning Catalyst CLI streaming interface.

Provides AI state management, status line generation, and context-aware hotkey hints.
"""

from enum import Enum
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
import time

from rich.text import Text
from rich.panel import Panel
from rich.console import Group
from rich.align import Align
from rich import box


class AIState(Enum):
    """AI response states for status tracking."""
    IDLE = "idle"
    THINKING = "thinking"
    RESPONDING = "responding"
    COMPLETE = "complete"
    ERROR = "error"
    CANCELLED = "cancelled"


@dataclass
class StateConfig:
    """Configuration for AI state display."""
    icon: str
    style: str
    description: str
    show_progress: bool = True
    allow_cancel: bool = True
    allow_toggle: bool = True


# State configurations with rich styling
STATE_CONFIGS: Dict[AIState, StateConfig] = {
    AIState.IDLE: StateConfig(
        icon="⚪",
        style="dim white",
        description="Ready",
        show_progress=False,
        allow_cancel=False,
        allow_toggle=False
    ),
    AIState.THINKING: StateConfig(
        icon="🔄",
        style="cyan",
        description="thinking",
        show_progress=True,
        allow_cancel=True,
        allow_toggle=True
    ),
    AIState.RESPONDING: StateConfig(
        icon="⚡",
        style="yellow",
        description="responding",
        show_progress=True,
        allow_cancel=True,
        allow_toggle=True
    ),
    AIState.COMPLETE: StateConfig(
        icon="✅",
        style="green",
        description="deeply thought",
        show_progress=False,
        allow_cancel=False,
        allow_toggle=True
    ),
    AIState.ERROR: StateConfig(
        icon="❌",
        style="red",
        description="error",
        show_progress=False,
        allow_cancel=False,
        allow_toggle=False
    ),
    AIState.CANCELLED: StateConfig(
        icon="⏹️",
        style="dim yellow",
        description="cancelled",
        show_progress=False,
        allow_cancel=False,
        allow_toggle=True
    )
}


@dataclass
class StreamingMetrics:
    """Metrics for streaming progress tracking."""
    start_time: float
    last_chunk_time: float
    thinking_word_count: int = 0
    response_word_count: int = 0
    total_chunks: int = 0

    @property
    def elapsed_time(self) -> float:
        """Get elapsed time in seconds."""
        return time.time() - self.start_time

    @property
    def words_per_second(self) -> float:
        """Calculate words per second."""
        total_words = self.thinking_word_count + self.response_word_count
        return total_words / max(self.elapsed_time, 0.1)

    @property
    def chunk_rate(self) -> float:
        """Calculate chunks per second."""
        return self.total_chunks / max(self.elapsed_time, 0.1)


class StatusIndicatorManager:
    """Manages status indicators and hotkey hints for streaming interface."""

    def __init__(self):
        """Initialize status indicator manager."""
        self._current_state = AIState.IDLE
        self._provider_name = "ai"
        self._model_name = "model"
        self._metrics: Optional[StreamingMetrics] = None
        self._thinking_visible = False

    def set_state(self, state: AIState) -> None:
        """
        Set the current AI state.

        Args:
            state: New AI state
        """
        self._current_state = state

    def set_provider_info(self, provider_name: str, model_name: str) -> None:
        """
        Set provider and model information.

        Args:
            provider_name: AI provider name
            model_name: Model name
        """
        self._provider_name = provider_name
        self._model_name = model_name

    def set_metrics(self, metrics: StreamingMetrics) -> None:
        """
        Set streaming metrics.

        Args:
            metrics: Current streaming metrics
        """
        self._metrics = metrics

    def set_thinking_visibility(self, visible: bool) -> None:
        """
        Set thinking process visibility.

        Args:
            visible: Whether thinking process is visible
        """
        self._thinking_visible = visible

    def create_status_line(self) -> Text:
        """
        Create the main status line with state indicator.

        Returns:
            Rich Text object with status line
        """
        config = STATE_CONFIGS[self._current_state]

        # Main status indicator
        status_parts = [
            Text(f"● {self._model_name} ", style="dim"),
            Text(config.icon, style=config.style),
            Text(f" {config.description}:", style=config.style)
        ]

        # Combine parts
        status_line = Text()
        for part in status_parts:
            status_line.append(part)

        return status_line

    def create_hotkey_hints(self) -> Text:
        """
        Create context-aware hotkey hints.

        Returns:
            Rich Text object with hotkey hints
        """
        config = STATE_CONFIGS[self._current_state]
        hints = []

        # Base hints
        if config.allow_toggle:
            toggle_icon = "🔍" if self._thinking_visible else "🔍"
            toggle_text = "Hide" if self._thinking_visible else "Show"
            hints.append(f"[Ctrl+O] {toggle_text} thinking")

        if config.allow_cancel:
            hints.append("[Ctrl+C] Cancel")

        # Metrics hint
        if self._metrics and config.show_progress:
            hints.append("📊 metrics")

        # Complete state hints
        if self._current_state == AIState.COMPLETE:
            hints.extend([
                "💾 Save",
                "📝 Copy",
                "🔄 Regenerate"
            ])

        # Join hints with bullets
        if hints:
            hint_text = "💡 " + " • ".join(hints)
            return Text(hint_text, style="dim blue")
        else:
            return Text("", style="dim")

    def create_metrics_display(self) -> Optional[Text]:
        """
        Create metrics display if available.

        Returns:
            Rich Text object with metrics or None
        """
        if not self._metrics:
            return None

        metrics_parts = []

        # Word counts
        if self._metrics.thinking_word_count > 0:
            metrics_parts.append(f"🧠 {self._metrics.thinking_word_count} thinking words")
        if self._metrics.response_word_count > 0:
            metrics_parts.append(f"💬 {self._metrics.response_word_count} response words")

        # Timing metrics
        if self._metrics.elapsed_time > 0:
            metrics_parts.append(f"⏱️ {self._metrics.elapsed_time:.1f}s")

        # Performance metrics
        if self._metrics.words_per_second > 0:
            metrics_parts.append(f"🚀 {self._metrics.words_per_second:.1f} words/s")

        if self._metrics.chunk_rate > 0:
            metrics_parts.append(f"📦 {self._metrics.chunk_rate:.1f} chunks/s")

        if metrics_parts:
            metrics_text = " • ".join(metrics_parts)
            return Text(metrics_text, style="dim cyan")
        else:
            return None

    def create_thinking_panel_title(self) -> Text:
        """
        Create title for thinking process panel.

        Returns:
            Rich Text object for panel title
        """
        return Text("🧠 Thinking Process", style="bold italic cyan")

    def create_status_panel(self) -> Panel:
        """
        Create a complete status panel with all indicators.

        Returns:
            Rich Panel with status information
        """
        elements = []

        # Main status line
        status_line = self.create_status_line()
        elements.append(status_line)

        # Metrics if available
        metrics = self.create_metrics_display()
        if metrics:
            elements.append(metrics)

        # Hotkey hints
        hints = self.create_hotkey_hints()
        if hints.plain:
            elements.append(hints)

        # Create panel
        if elements:
            content = Group(*elements)
            return Panel(
                content,
                box=box.ROUNDED,
                border_style="dim",
                padding=(0, 1)
            )
        else:
            return Panel(
                Text("No status information"),
                box=box.ROUNDED,
                border_style="dim"
            )

    def get_state_config(self) -> StateConfig:
        """
        Get configuration for current state.

        Returns:
            StateConfig for current state
        """
        return STATE_CONFIGS[self._current_state]

    def is_progress_state(self) -> bool:
        """
        Check if current state shows progress.

        Returns:
            True if state should show progress
        """
        return STATE_CONFIGS[self._current_state].show_progress

    def can_cancel(self) -> bool:
        """
        Check if current state allows cancellation.

        Returns:
            True if state allows cancellation
        """
        return STATE_CONFIGS[self._current_state].allow_cancel

    def can_toggle(self) -> bool:
        """
        Check if current state allows thinking toggle.

        Returns:
            True if state allows thinking toggle
        """
        return STATE_CONFIGS[self._current_state].allow_toggle


def create_progress_indicator(current: int, total: Optional[int] = None,
                            width: int = 20) -> Text:
    """
    Create a visual progress indicator.

    Args:
        current: Current progress value
        total: Total value (None for indeterminate)
        width: Width of progress bar

    Returns:
        Rich Text with progress indicator
    """
    if total is None:
        # Indeterminate progress
        pattern = "◐◓◑◒"
        pos = current % len(pattern)
        indicator = pattern[pos]
        return Text(f"[{indicator}]", style="yellow")
    else:
        # Determinate progress
        if total <= 0:
            return Text("[    ]", style="dim")

        filled = int((current / total) * width)
        filled = max(0, min(width, filled))

        bar = "█" * filled + "░" * (width - filled)
        percentage = (current / total) * 100

        return Text(f"[{bar}] {percentage:.0f}%", style="green")