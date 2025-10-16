"""
Enhanced streaming state management for Learning Catalyst CLI.

Provides comprehensive state tracking for live streaming with smooth transitions
and content separation between thinking and response phases.
"""

import time
from dataclasses import dataclass, field
from typing import Optional, Dict, Any, List
from enum import Enum

from .status_indicators import AIState, StreamingMetrics


@dataclass
class StreamingContent:
    """Container for streaming content with metadata."""
    thinking_content: str = ""
    response_content: str = ""
    accumulated_content: str = ""
    last_chunk: str = ""

    def add_chunk(self, chunk: str, is_thinking: bool = False) -> None:
        """
        Add a new chunk to the appropriate content.

        Args:
            chunk: Content chunk to add
            is_thinking: Whether this is part of thinking phase
        """
        self.last_chunk = chunk
        self.accumulated_content += chunk

        if is_thinking:
            self.thinking_content += chunk
        else:
            self.response_content += chunk

    def get_display_content(self) -> str:
        """
        Get content that should be displayed based on current state.

        Returns:
            Content to display
        """
        if self.response_content:
            return self.response_content
        elif self.thinking_content:
            return self.thinking_content
        else:
            return self.accumulated_content

    def get_word_counts(self) -> Dict[str, int]:
        """
        Get word counts for different content types.

        Returns:
            Dictionary with word counts
        """
        return {
            "thinking": len(self.thinking_content.split()) if self.thinking_content else 0,
            "response": len(self.response_content.split()) if self.response_content else 0,
            "total": len(self.accumulated_content.split()) if self.accumulated_content else 0
        }


@dataclass
class StreamingSession:
    """Complete streaming session state."""
    session_id: str
    start_time: float = field(default_factory=time.time)
    end_time: Optional[float] = None
    user_input: str = ""
    provider_name: str = "ai"
    model_name: str = "model"

    # State tracking
    current_state: AIState = AIState.IDLE
    previous_state: AIState = AIState.IDLE
    is_thinking_phase: bool = False

    # Content
    content: StreamingContent = field(default_factory=StreamingContent)

    # Metrics
    metrics: Optional[StreamingMetrics] = None
    chunk_count: int = 0

    # Display options
    thinking_visible: bool = False
    auto_hide_thinking: bool = True

    # Error handling
    last_error: Optional[str] = None
    retry_count: int = 0
    max_retries: int = 3

    def start_session(self, user_input: str, provider_name: str, model_name: str) -> None:
        """
        Initialize and start a new streaming session.

        Args:
            user_input: User's input that triggered the session
            provider_name: AI provider name
            model_name: Model name
        """
        self.session_id = f"session_{int(time.time() * 1000)}"
        self.start_time = time.time()
        self.user_input = user_input
        self.provider_name = provider_name
        self.model_name = model_name
        self.current_state = AIState.THINKING
        self.is_thinking_phase = True
        self.content = StreamingContent()
        self.metrics = StreamingMetrics(start_time=time.time(), last_chunk_time=time.time())
        self.chunk_count = 0
        self.last_error = None
        self.retry_count = 0

    def transition_to_state(self, new_state: AIState) -> bool:
        """
        Transition to a new state with validation.

        Args:
            new_state: New state to transition to

        Returns:
            True if transition was successful
        """
        # Validate state transition
        if not self._is_valid_transition(self.current_state, new_state):
            return False

        self.previous_state = self.current_state
        self.current_state = new_state

        # Handle special transitions
        if new_state == AIState.COMPLETE:
            self.end_time = time.time()
        elif new_state == AIState.ERROR:
            self.last_error = "State transition error"

        return True

    def _is_valid_transition(self, from_state: AIState, to_state: AIState) -> bool:
        """
        Validate if a state transition is allowed.

        Args:
            from_state: Current state
            to_state: Target state

        Returns:
            True if transition is valid
        """
        # Define valid transitions
        valid_transitions = {
            AIState.IDLE: [AIState.THINKING],
            AIState.THINKING: [AIState.RESPONDING, AIState.CANCELLED, AIState.ERROR],
            AIState.RESPONDING: [AIState.COMPLETE, AIState.CANCELLED, AIState.ERROR],
            AIState.COMPLETE: [AIState.IDLE],
            AIState.ERROR: [AIState.IDLE],
            AIState.CANCELLED: [AIState.IDLE]
        }

        return to_state in valid_transitions.get(from_state, [])

    def add_content_chunk(self, chunk: str, detect_phase: bool = True) -> bool:
        """
        Add a content chunk and update state accordingly.

        Args:
            chunk: Content chunk to add
            detect_phase: Whether to auto-detect thinking/response phase

        Returns:
            True if chunk was processed successfully
        """
        if not chunk or self.current_state in [AIState.COMPLETE, AIState.CANCELLED, AIState.ERROR]:
            return False

        # Update metrics
        self.chunk_count += 1
        if self.metrics:
            self.metrics.last_chunk_time = time.time()
            self.metrics.total_chunks = self.chunk_count

        # Detect phase transition if enabled
        if detect_phase:
            was_thinking = self.is_thinking_phase
            self.is_thinking_phase = self._detect_thinking_phase(
                self.content.accumulated_content + chunk
            )

            # Handle state transition
            if was_thinking and not self.is_thinking_phase:
                # Transition from thinking to responding
                self.transition_to_state(AIState.RESPONDING)
                self._extract_thinking_content()

        # Add content
        self.content.add_chunk(chunk, self.is_thinking_phase)

        # Update metrics
        if self.metrics:
            word_counts = self.content.get_word_counts()
            self.metrics.thinking_word_count = word_counts["thinking"]
            self.metrics.response_word_count = word_counts["response"]

        return True

    def _detect_thinking_phase(self, content: str) -> bool:
        """
        Detect if content indicates a thinking phase.

        Args:
            content: Content to analyze

        Returns:
            True if content appears to be in thinking phase
        """
        thinking_indicators = [
            "thinking:", "let me think", "i need to consider", "hmm",
            "well, let's see", "first, i should", "i should start by",
            "considering that", "to answer this", "let me break this down",
            "analyzing", "examining", "evaluating", "processing"
        ]

        response_indicators = [
            "\n\nanswer:", "\n\nresponse:", "\n\nhere's", "\n\nbased on",
            "now, let me", "here's the", "the answer is", "to summarize",
            "in conclusion", "therefore", "so,", "finally"
        ]

        content_lower = content.lower()

        # Check for response indicators first (stronger signal)
        for indicator in response_indicators:
            if indicator in content_lower:
                return False

        # Check for thinking indicators
        for indicator in thinking_indicators:
            if indicator in content_lower:
                return True

        # Default to current phase
        return self.is_thinking_phase

    def _extract_thinking_content(self) -> None:
        """Extract and separate thinking content from response content."""
        accumulated = self.content.accumulated_content

        # Look for transition markers
        transition_markers = [
            "\n\nanswer:", "\n\nresponse:", "\n\nhere's", "\n\nbased on",
            "now, let me", "here's the", "the answer is", "to summarize"
        ]

        for marker in transition_markers:
            if marker.lower() in accumulated.lower():
                parts = accumulated.lower().split(marker.lower(), 1)
                if len(parts) == 2:
                    self.content.thinking_content = parts[0].strip()
                    self.content.response_content = marker + parts[1].strip()
                    break

    def toggle_thinking_visibility(self) -> bool:
        """
        Toggle thinking process visibility.

        Returns:
            New visibility state
        """
        self.thinking_visible = not self.thinking_visible
        return self.thinking_visible

    def cancel_session(self, reason: str = "User cancelled") -> None:
        """
        Cancel the current session.

        Args:
            reason: Reason for cancellation
        """
        self.transition_to_state(AIState.CANCELLED)
        self.end_time = time.time()
        self.last_error = reason

    def mark_error(self, error: str) -> None:
        """
        Mark session as errored.

        Args:
            error: Error message
        """
        self.transition_to_state(AIState.ERROR)
        self.end_time = time.time()
        self.last_error = error

    def mark_complete(self) -> None:
        """Mark session as complete."""
        self.transition_to_state(AIState.COMPLETE)
        self.end_time = time.time()

    def get_duration(self) -> float:
        """
        Get session duration in seconds.

        Returns:
            Duration in seconds
        """
        end = self.end_time or time.time()
        return end - self.start_time

    def get_summary(self) -> Dict[str, Any]:
        """
        Get session summary information.

        Returns:
            Dictionary with session summary
        """
        word_counts = self.content.get_word_counts()

        return {
            "session_id": self.session_id,
            "user_input": self.user_input,
            "provider": self.provider_name,
            "model": self.model_name,
            "state": self.current_state.value,
            "duration": self.get_duration(),
            "chunk_count": self.chunk_count,
            "word_counts": word_counts,
            "thinking_visible": self.thinking_visible,
            "error": self.last_error,
            "thinking_content_length": len(self.content.thinking_content),
            "response_content_length": len(self.content.response_content)
        }

    def is_active(self) -> bool:
        """
        Check if session is currently active.

        Returns:
            True if session is active
        """
        return self.current_state in [AIState.THINKING, AIState.RESPONDING]

    def can_interact(self) -> bool:
        """
        Check if user can interact with session.

        Returns:
            True if interaction is allowed
        """
        return self.current_state not in [AIState.IDLE, AIState.COMPLETE, AIState.CANCELLED, AIState.ERROR]

    def reset(self) -> None:
        """Reset session to initial state."""
        self.current_state = AIState.IDLE
        self.previous_state = AIState.IDLE
        self.is_thinking_phase = False
        self.content = StreamingContent()
        self.metrics = None
        self.chunk_count = 0
        self.last_error = None
        self.retry_count = 0
        self.end_time = None


class StreamingStateManager:
    """Manages multiple streaming sessions and global state."""

    def __init__(self):
        """Initialize streaming state manager."""
        self._sessions: Dict[str, StreamingSession] = {}
        self._active_session_id: Optional[str] = None
        self._global_thinking_visible = False

    def create_session(self, user_input: str, provider_name: str, model_name: str) -> str:
        """
        Create a new streaming session.

        Args:
            user_input: User's input
            provider_name: AI provider name
            model_name: Model name

        Returns:
            Session ID
        """
        session = StreamingSession(
            session_id=f"session_{int(time.time() * 1000)}",
            thinking_visible=self._global_thinking_visible
        )

        session.start_session(user_input, provider_name, model_name)

        self._sessions[session.session_id] = session
        self._active_session_id = session.session_id

        return session.session_id

    def get_active_session(self) -> Optional[StreamingSession]:
        """
        Get the currently active session.

        Returns:
            Active session or None
        """
        if self._active_session_id:
            return self._sessions.get(self._active_session_id)
        return None

    def get_session(self, session_id: str) -> Optional[StreamingSession]:
        """
        Get a specific session by ID.

        Args:
            session_id: Session ID

        Returns:
            Session or None
        """
        return self._sessions.get(session_id)

    def end_active_session(self) -> None:
        """End the currently active session."""
        if self._active_session_id:
            session = self._sessions.get(self._active_session_id)
            if session:
                session.mark_complete()
            self._active_session_id = None

    def cancel_active_session(self, reason: str = "User cancelled") -> None:
        """
        Cancel the currently active session.

        Args:
            reason: Reason for cancellation
        """
        if self._active_session_id:
            session = self._sessions.get(self._active_session_id)
            if session:
                session.cancel_session(reason)
            self._active_session_id = None

    def set_global_thinking_visibility(self, visible: bool) -> None:
        """
        Set global thinking visibility preference.

        Args:
            visible: Whether thinking should be visible by default
        """
        self._global_thinking_visible = visible

    def cleanup_old_sessions(self, max_age_seconds: int = 3600) -> int:
        """
        Clean up old sessions to prevent memory leaks.

        Args:
            max_age_seconds: Maximum age for sessions

        Returns:
            Number of sessions cleaned up
        """
        current_time = time.time()
        to_remove = []

        for session_id, session in self._sessions.items():
            if not session.is_active() and (current_time - session.start_time) > max_age_seconds:
                to_remove.append(session_id)

        for session_id in to_remove:
            del self._sessions[session_id]

        return len(to_remove)