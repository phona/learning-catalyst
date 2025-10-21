# Async Key Handling System

## Overview

Async key handling system built around coroutines, providing non-blocking keyboard interaction for CLI applications.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Async Key System                        │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────┐  │
│  │   Input     │    │   Event     │    │   Panel     │    │  App    │  │
│  │  Handler    │───►│   Loop      │───►│  System     │───►│   Entry │  │
│  │             │    │             │    │             │    │         │  │
│  │ • Raw I/O   │    │ • Routing   │    │ • Contexts  │    │ • Init  │  │
│  │ • Streams   │    │ • Contexts  │    │ • State Mgmt │    │ • Loop  │  │
│  │ • Async     │    │ • Handlers  │    │ • Rendering │    │ • Clean │  │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. KeyHandler

Low-level async key detection using native I/O and keyboard library.

```python
import asyncio
import sys
import keyboard
from typing import Optional

class KeyHandler:
    """Async key input with keyboard library support"""

    def __init__(self, use_keyboard_lib: bool = False):
        self.use_keyboard_lib = use_keyboard_lib and keyboard.is_supported()
        self.key_queue = asyncio.Queue()
        self._listener = None

    async def __aenter__(self):
        await self.start()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.stop()

    async def start(self):
        """Initialize key handler"""
        if self.use_keyboard_lib:
            self._setup_keyboard_library()
        else:
            self._setup_native()

    async def stop(self):
        """Cleanup resources"""
        if self._listener:
            keyboard.unhook(self._listener)

    def _setup_keyboard_library(self):
        """Setup keyboard library hooking"""
        def on_key(event):
            if event.event_type == keyboard.KEY_DOWN:
                key = self._map_key(event.name)
                asyncio.run_coroutine_threadsafe(
                    self.key_queue.put(key), asyncio.get_event_loop()
                )
        self._listener = keyboard.hook(on_key)

    def _setup_native(self):
        """Setup native terminal input"""
        import termios, tty
        self.fd = sys.stdin.fileno()
        self.old_settings = termios.tcgetattr(self.fd)
        tty.setcbreak(self.fd)
        asyncio.create_task(self._read_native_keys())

    async def _read_native_keys(self):
        """Read keys from native terminal"""
        loop = asyncio.get_event_loop()
        while True:
            future = loop.create_future()
            loop.add_reader(self.fd, lambda: future.set_result(sys.stdin.read(1)))
            key = await future
            loop.remove_reader(self.fd)
            await self.key_queue.put(key)

    def _map_key(self, key_name: str) -> str:
        """Map keyboard library keys to terminal codes"""
        mapping = {
            'space': ' ', 'enter': '\r', 'tab': '\t',
            'backspace': '\x7f', 'esc': '\x1b',
            'up': '\x1b[A', 'down': '\x1b[B',
            'left': '\x1b[D', 'right': '\x1b[C'
        }
        return mapping.get(key_name.lower(), key_name)

    async def read_key(self, timeout: Optional[float] = None) -> Optional[str]:
        """Read single key asynchronously"""
        try:
            return await asyncio.wait_for(self.key_queue.get(), timeout)
        except asyncio.TimeoutError:
            return None
```

**Key Features:**
- Dual mode: native I/O + keyboard library
- Auto-detection of keyboard library support
- Cross-platform key mapping
- Simple async queue interface
- Context manager support

### 2. EventLoop

Central event coordination with context-aware routing.

```python
class EventLoop:
    """Async event processing and routing"""

    async def start(self, key_handler):
        """Start event processing loop"""
        async for key in self._create_key_stream():
            await self._process_event(key)

    def register_handler(self, key, handler, context=None):
        """Register async key handler"""
        if context:
            self.context_handlers[context][key] = handler
        else:
            self.global_handlers[key] = handler
```

**Key Features:**
- Pure asyncio event processing
- Context-aware handler routing
- Async generator-based key streaming
- Global and context-specific handlers

### 3. TextInputHandler

Advanced text input with async validation and completion.

```python
class TextInputHandler:
    """Async text input with cursor management"""

    async def get_input(self, key_handler) -> Optional[str]:
        """Get input with full async editing support"""
        self._setup_handlers()
        await self.event_loop.start(key_handler)
        return self.buffer if not self._cancelled else None

    async def _handle_tab(self, key: str) -> str:
        """Async tab completion"""
        if self.completer:
            completions = await self.completer.complete_async(self.buffer)
            if completions:
                self.buffer = completions[0]
                await self._update_display()
```

**Key Features:**
- Native async cursor management
- Background validation and completion
- Async history navigation
- Event-driven display updates

## Panel System

### 4. Panel Base Class

Foundation for async panels with event-driven rendering.

```python
class Panel:
    """Async panel base class"""

    async def activate(self, key_handler):
        """Activate panel with async event handling"""
        self.event_loop = EventLoop()
        self.render_task = asyncio.create_task(self._render_loop())
        await self.event_loop.start(key_handler)

    async def request_render(self):
        """Request render update via queue"""
        await self.update_queue.put('render')
```

### 5. ConfigPanel

Configuration panel with async operations.

```python
class ConfigPanel(Panel):
    """Async configuration management"""

    async def _execute_action(self, action: str):
        """Execute panel actions asynchronously"""
        if action == "provider":
            await self._change_provider_async()
        elif action == "api_key":
            await self._configure_api_key_async()
```

### 6. PanelManager

Application coordination with panel switching.

```python
class PanelManager:
    """Async panel coordination and switching"""

    async def run_async(self):
        """Main application loop"""
        async with KeyHandler() as key_handler:
            while self.running:
                if self.current_panel == self.conversation_panel:
                    await self._handle_conversation_mode()
                else:
                    await self._handle_panel_mode()
```

## Key Event Flow

```
User Input → AsyncNativeKeyHandler → AsyncNativeEventLoop → Panel Handler → Response
    ↓               ↓                      ↓                    ↓            ↓
  Key Press    → Raw I/O Detection → Event Routing → Async Processing → UI Update
```

## Usage Example

```python
async def main():
    # Auto-detect best method (tries keyboard library first)
    async with KeyHandler() as key_handler:
        text_input = TextInputHandler("Name: ")
        name = await text_input.get_input(key_handler)

    # Force keyboard library usage for global hooking
    async with KeyHandler(use_keyboard_lib=True) as key_handler:
        selection = SelectionPanel("Choose:", ["Option 1", "Option 2"])
        choice = await selection.run_selection(key_handler)

    print(f"Selected: {choice}")

# Installation
# pip install keyboard

asyncio.run(main())
```

## Key Features Summary

- **Dual Mode Architecture**: Native I/O + keyboard library integration
- **Auto-Detection**: Automatically chooses best input method
- **Global Key Hooking**: Capture keys system-wide with keyboard library
- **Cross-Platform**: Works on Windows/Linux/macOS with fallbacks
- **Event Streaming**: Async queue-based key processing
- **Context-Aware Routing**: Different handlers for different panels
- **Simple Interface**: Unified `read_key()` API regardless of mode
- **Resource Management**: Automatic cleanup and terminal restoration

## Integration Benefits

1. **Responsive UI**: No blocking operations during key handling
2. **Concurrent Operations**: Background validation, completion, AI responses
3. **Clean Architecture**: Separation of concerns with async patterns
4. **Scalability**: Handles complex operations without blocking user interface
5. **Modern Python**: Leverages asyncio best practices and patterns

This async architecture provides a foundation for building highly responsive CLI applications that can handle complex operations seamlessly without blocking the user interface.