# Panel System Design Specification

## Overview

The Learning Catalyst CLI application uses an **interactive command-line prompt system** with temporary dialogs for specific commands. The main interface is always an active prompt (like bash/zsh) that accepts both natural language queries and slash commands. This design prioritizes simplicity, familiarity, and continuous interaction flow.

## Core Architecture

### CLI Prompt System Principles

1. **Always-Active Prompt**: The prompt is always ready for input like a shell
2. **Temporary Dialogs**: Commands show temporary interfaces that return to prompt
3. **Dual Input Modes**: Natural language for AI + slash commands for system functions
4. **Consistent Return Path**: ESC or completion always returns to prompt
5. **Shell-Like Behavior**: Familiar CLI patterns with enhanced AI capabilities

### Panel Types

#### 1. Conversation Prompt (Default)
- **Purpose**: Interactive command-line prompt for commands and AI conversation
- **Navigation**: Standard CLI prompt with tab completion, history, and natural language input
- **Key Features**: Slash commands (/config, /stats), AI chat, command execution
- **Behavior**: Like bash/zsh prompt - always active, always accepting input

#### 2. Configuration Dialog (Modal Overlay)
- **Purpose**: Interactive configuration setup invoked by `/config` command
- **Navigation**: Arrow keys + Enter for selections, text input for values
- **Key Features**: Provider selection, API key entry, model configuration
- **Behavior**: Temporary overlay that blocks the prompt until completed

#### 3. Statistics View (Temporary Display)
- **Purpose**: Show learning analytics when `/stats` command is used
- **Navigation**: Read-only display with optional drill-down via keys
- **Key Features**: Progress bars, session data, concept tracking
- **Behavior**: Temporary output that returns to prompt after viewing

#### 4. Help Display (Temporary Output)
- **Purpose**: Show command reference and help text
- **Navigation**: Scrollable text output
- **Key Features**: Command list, usage examples, keyboard shortcuts
- **Behavior**: Temporary help output that returns to prompt

#### 5. Checkpoint Interface (Dialog)
- **Purpose**: Save/load session functionality via `/checkpoint` command
- **Navigation**: Menu selection + text input for names
- **Key Features**: Session listing, save/load operations, naming
- **Behavior**: Dialog interface that returns to prompt when complete

## Detailed Panel Specifications

### Conversation Prompt

#### Interactive CLI Prompt Behavior
```
🧠> _
    ^ (Always active prompt waiting for input)
```

The conversation prompt works exactly like a shell prompt:

**Natural Language Mode:**
```
🧠> Explain recursion in programming

🤖 AI is responding...
💡 Press Ctrl+C to cancel • Input temporarily disabled

🤔 Thinking Process
────────────────
Let me think about recursion step by step...

💬 AI Response
────────────────
Recursion is a programming technique where a function calls itself...
[Full streaming response with code examples]

✅ Response complete • 156 words

💡 Learning Suggestions:
   • Ask for examples: "Give me another recursion example"
   • Test yourself: "Quiz me on recursion"
   • Go deeper: "How does recursion compare to iteration?"

🧠> _
```

**Command Mode (Slash Commands):**
```
🧠> /config

⚙️  Configuration Setup
══════════════════════════════════════════════════════════════════════════════

Current Settings:
  Provider: OpenAI
  Model: gpt-3.5-turbo
  Theme: Dark

Available Actions:
  1. Change AI provider
  2. Configure API key
  3. Select different model
  4. Adjust interface settings
  5. Return to conversation

Select action [1-5]: _
```

**Tab Completion:**
```
🧠> /conf[TAB]
/config      /checkpoint  /clear       /context
/console     /export      /help        /import

🧠> /config [TAB]
provider     model       setup       show        reset

🧠> /config prov[TAB]
🧠> /config provider _
```

**Command History:**
```
🧠> [UP ARROW]
🧠> /config provider openai

🧠> [UP ARROW]
🧠> Explain recursion in programming

🧠> [DOWN ARROW]
🧠> /config provider openai
```

#### Component Details

**Active Prompt:**
- Always ready for input (like bash prompt)
- Shows current context in prompt (provider:model)
- Accepts both natural language and slash commands
- Tab completion for commands and file paths

**Streaming Response Display:**
- Temporarily blocks input during AI responses
- Shows real-time streaming with thinking process
- Ctrl+C cancels current response
- Returns to prompt after completion

**Command Processing:**
- Slash commands trigger specific handlers
- Commands show temporary dialogs/interfaces
- Always return to prompt after command completion
- Command history with ↑/↓ navigation

**Context Awareness:**
- Prompt shows current provider and model
- Maintains conversation context
- Remembers previous exchanges for context
- Tracks learning progress and concepts

#### Behavior Specifications

**Input Processing:**
```python
def process_conversation_input(user_input: str):
    # 1. Check for slash commands
    if user_input.startswith('/'):
        return handle_command(user_input)

    # 2. Add to conversation history
    add_to_history("user", user_input)

    # 3. Process as learning query
    response = await get_ai_response(user_input)

    # 4. Display response with suggestions
    display_response(response)
    show_learning_suggestions(user_input, response)
```

**Streaming Display:**
```python
class StreamingDisplay:
    def start_streaming(self):
        # Show "AI is responding..." indicator
        # Disable input during streaming
        # Setup Rich Live display

    def update_content(self, thinking: str, response: str):
        # Update live display with new content
        # Maintain smooth scrolling
        # Preserve cursor position

    def complete_streaming(self):
        # Show completion status
        # Re-enable input
        # Generate learning suggestions
```

### Configuration Panel

#### Layout Structure
```
┌─ Configuration Header ───────────────────────────────────────────────────────┐
│  ⚙️ Configuration Settings • [ESC] Return to Conversation                   │
└──────────────────────────────────────────────────────────────────────────────┘

┌─ AI Provider Section ────────────────────────────────────────────────────────┐
│  > Current Provider: [OpenAI ▼]                                            │
│    ○ OpenAI (Active)                                                        │
│    ○ DeepSeek                                                              │
│    ○ ChatGLM                                                               │
│    ○ SiliconFlow                                                           │
│                                                                              │
│  > Model: [gpt-3.5-turbo ▼]                                                │
│    ○ gpt-3.5-turbo (Active)                                                │
│    ○ gpt-4                                                                  │
│    ○ gpt-4-turbo                                                            │
│                                                                              │
│  > API Key: [••••••••••••••••••••]                                          │
│    [Enter new API key: ___________________] [Test] [Save]                     │
└──────────────────────────────────────────────────────────────────────────────┘

┌─ Interface Section ──────────────────────────────────────────────────────────┐
│  > Theme: [○ Dark] [ Light ]                                                │
│  > Show Token Usage: [✓ Enabled] [ Disabled ]                               │
│  > Learning Mode: [✓ Adaptive] [ Standard ]                                 │
│  > Auto-save Sessions: [✓ Every 10 min] [ Disabled ]                        │
└──────────────────────────────────────────────────────────────────────────────┘

┌─ Navigation Help ────────────────────────────────────────────────────────────┐
│  ↑/↓ Navigate options • Enter Select/Change • ESC Return to conversation      │
└──────────────────────────────────────────────────────────────────────────────┘
```

#### Component Details

**AI Provider Section:**
- Dropdown-style selection with current value highlighted
- Visual indicator for active provider
- API key input with masking and validation
- Model selection dependent on available models for provider

**Interface Section:**
- Radio button style selections for preferences
- Toggle switches for boolean settings
- Auto-save options with configurable intervals
- Theme preview with live updates

**Navigation Help:**
- Context-sensitive keyboard shortcuts
- Current panel action hints
- Universal escape reminder

#### State Management

**Configuration Data Structure:**
```python
@dataclass
class ConfigState:
    # AI Settings
    provider: str = "openai"
    model: str = "gpt-3.5-turbo"
    api_keys: Dict[str, str] = field(default_factory=dict)

    # Interface Settings
    theme: str = "dark"
    show_token_usage: bool = True
    learning_mode: str = "adaptive"
    auto_save_interval: int = 600  # seconds

    # Learning Settings
    adaptive_responses: bool = True
    track_concepts: bool = True
    quiz_difficulty: str = "adaptive"
```

**Validation Logic:**
```python
def validate_config_change(section: str, key: str, value: str) -> bool:
    if section == "ai" and key == "api_key":
        return validate_api_key(current_provider, value)
    elif section == "interface" and key == "theme":
        return value in ["dark", "light"]
    elif section == "learning" and key == "quiz_difficulty":
        return value in ["beginner", "intermediate", "advanced", "adaptive"]
    return True
```

#### Navigation Behavior

**Option Selection:**
```python
class ConfigNavigation:
    def __init__(self):
        self.sections = ["ai_provider", "model", "api_key", "theme", "usage", "learning"]
        self.current_section = 0
        self.section_options = self.get_section_options()

    def handle_arrow_key(self, direction: str):
        if direction == "up":
            self.move_to_previous_option()
        elif direction == "down":
            self.move_to_next_option()

    def handle_enter(self):
        option = self.get_current_option()
        if option.type == "dropdown":
            self.show_dropdown_options()
        elif option.type == "toggle":
            self.toggle_boolean_value()
        elif option.type == "input":
            self.enter_input_mode()
```

**Input Mode:**
```python
def enter_input_mode(self, field: str):
    # Show input field with current value
    # Enable text editing
    # Add validation feedback
    # Provide save/cancel options

    current_value = self.get_config_value(field)
    display_input_field(field, current_value)

    while input_mode_active:
        user_input = get_user_input()
        if validate_input(field, user_input):
            save_config_value(field, user_input)
            show_success_message()
            break
        else:
            show_validation_error()
```

### Statistics Panel

#### Layout Structure
```
┌─ Statistics Header ─────────────────────────────────────────────────────────┐
│  📊 Learning Analytics • [ESC] Return to Conversation                         │
└──────────────────────────────────────────────────────────────────────────────┘

┌─ Overview Section ───────────────────────────────────────────────────────────┐
│  🎯 Learning Progress Summary                                               │
│  ┌────────────────────────────────────────────────────────────────────┐   │
│  │ Sessions: 15  •  Time: 4h 23min  •  Concepts: 23              │   │
│  │ Quiz Score: 87%  •  Streak: 7 days  •  Level: Intermediate     │   │
│  │ Achievement Points: 450  •  Next Milestone: 500 pts             │   │
│  └────────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────┘

┌─ Topic Mastery Section ─────────────────────────────────────────────────────┐
│  📚 Knowledge Areas Progress                                               │
│                                                                              │
│  > Python Programming: ████████░░ 80% (18/23 concepts)                    │
│  > Algorithms:        ██████░░░░ 60% (9/15 concepts)                      │
│  > Data Structures:   ████░░░░░░ 40% (6/15 concepts)                      │
│  > Machine Learning:  ██░░░░░░░░ 20% (3/15 concepts)                      │
│                                                                              │
│  [Enter] View detailed topic breakdown                                     │
└──────────────────────────────────────────────────────────────────────────────┘

┌─ Recent Activity Section ─────────────────────────────────────────────────────┐
│  📈 Learning Timeline                                                      │
│                                                                              │
│  Today:                                                                     │
│  • Learned recursion fundamentals                                           │
│  • Completed recursion quiz (100%)                                          │
│  • Practiced factorial examples                                             │
│                                                                              │
│  Yesterday:                                                                 │
│  • Studied sorting algorithms                                               │
│  • Mastered bubble sort and quick sort                                       │
│  • 45 minutes of focused learning                                           │
│                                                                              │
│  This Week:                                                                 │
│  • 12 concepts learned                                                     │
│  • 2h 15min total study time                                                │
│  • 3 quiz sessions completed                                                │
│                                                                              │
│  [Enter] View detailed activity log                                         │
└──────────────────────────────────────────────────────────────────────────────┘

┌─ Achievements Section ────────────────────────────────────────────────────────┐
│  🏆 Recent Achievements                                                    │
│                                                                              │
│  ✓ Recursion Master - Completed all recursion exercises                     │
│  ✓ Week Warrior - 7-day learning streak                                    │
│  ✓ Quick Learner - Mastered 5 concepts in one day                          │
│  ✓ Quiz Champion - 5 perfect quiz scores                                   │
│                                                                              │
│  [Enter] View all achievements                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

#### Data Visualization

**Progress Bars:**
- Visual representation of learning progress
- Color-coded based on mastery level
- Interactive with Enter key for details

**Achievement System:**
- Badge-style icons for accomplishments
- Progress tracking toward milestones
- Unlock conditions and rewards

**Timeline View:**
- Chronological display of learning activities
- Grouped by time periods (today, yesterday, this week)
- Detailed breakdown of concepts and time spent

#### Data Sources

**Learning Analytics:**
```python
@dataclass
class LearningStats:
    # Session Statistics
    total_sessions: int = 0
    total_time_minutes: int = 0
    average_session_length: float = 0.0

    # Concept Tracking
    concepts_learned: List[str] = field(default_factory=list)
    concepts_mastered: List[str] = field(default_factory=list)
    topic_progress: Dict[str, float] = field(default_factory=dict)

    # Quiz Performance
    quiz_attempts: int = 0
    quiz_average: float = 0.0
    quiz_streak: int = 0
    perfect_quizzes: int = 0

    # Engagement Metrics
    learning_streak: int = 0
    longest_streak: int = 0
    achievement_points: int = 0

    # Time Analytics
    study_time_by_day: Dict[str, int] = field(default_factory=dict)
    study_time_by_topic: Dict[str, int] = field(default_factory=dict)
    peak_learning_hours: List[int] = field(default_factory=list)
```

### Checkpoint Panel

#### Layout Structure
```
┌─ Checkpoint Header ──────────────────────────────────────────────────────────┐
│  💾 Session Management • [ESC] Return to Conversation                         │
└──────────────────────────────────────────────────────────────────────────────┘

┌─ Saved Sessions Section ─────────────────────────────────────────────────────┐
│  📁 Your Saved Checkpoints                                                 │
│                                                                              │
│  > python-basics                                                           │
│     Created: 2 days ago • Duration: 45min • 12 concepts                     │
│     Topics: variables, functions, loops, lists                              │
│     [Load] [Delete] [Rename]                                                │
│                                                                              │
│  > recursion-study                                                          │
│     Created: 1 week ago • Duration: 1h 20min • 8 concepts                  │
│     Topics: recursion, base cases, stack trace, examples                    │
│     [Load] [Delete] [Rename]                                                │
│                                                                              │
│  > algorithms-practice                                                     │
│     Created: 2 weeks ago • Duration: 2h 15min • 15 concepts                │
│     Topics: sorting, searching, complexity, big-O notation                  │
│     [Load] [Delete] [Rename]                                                │
│                                                                              │
│  [Enter] Create new checkpoint                                              │
└──────────────────────────────────────────────────────────────────────────────┘

┌─ Current Session Section ────────────────────────────────────────────────────┐
│  🔄 Current Session Status                                                 │
│                                                                              │
│  Session Duration: 23 minutes                                               │
│  Topics Covered: recursion, factorial examples, stack frames                │
│  Concepts Learned: 5                                                        │
│  Quiz Attempts: 2 (Average: 85%)                                            │
│                                                                              │
│  > Auto-save: [✓ Enabled] every 10 minutes                                  │
│  > Last saved: 5 minutes ago                                                │
│                                                                              │
│  [Enter] Save current session                                               │
└──────────────────────────────────────────────────────────────────────────────┘

┌─ Quick Actions Section ───────────────────────────────────────────────────────┐
│  ⚡ Quick Operations                                                        │
│                                                                              │
│  [1] Save current session as "checkpoint-timestamp"                        │
│  [2] Load most recent checkpoint                                            │
│  [3] Export session to file                                                │
│  [4] Import session from file                                               │
│                                                                              │
│  [Enter] Select action • Number keys for quick access                       │
└──────────────────────────────────────────────────────────────────────────────┘
```

#### Checkpoint Operations

**Save Operation:**
```python
def save_checkpoint(name: str = None):
    if not name:
        name = generate_checkpoint_name()

    checkpoint_data = {
        "name": name,
        "timestamp": datetime.now(),
        "duration": current_session.duration,
        "conversation_history": current_session.history,
        "concepts_learned": current_session.concepts,
        "quiz_results": current_session.quiz_scores,
        "context_data": current_session.context
    }

    save_to_file(checkpoint_data, f"checkpoints/{name}.json")
    show_success_message(f"Checkpoint '{name}' saved successfully")
```

**Load Operation:**
```python
def load_checkpoint(checkpoint_name: str):
    checkpoint_data = load_from_file(f"checkpoints/{checkpoint_name}.json")

    # Restore conversation history
    current_session.history = checkpoint_data["conversation_history"]

    # Restore learning context
    current_session.concepts = checkpoint_data["concepts_learned"]
    current_session.quiz_scores = checkpoint_data["quiz_results"]
    current_session.context = checkpoint_data["context_data"]

    # Update session metadata
    current_session.loaded_from_checkpoint = checkpoint_name

    show_success_message(f"Loaded checkpoint '{checkpoint_name}'")
```

### Help Panel

#### Layout Structure
```
┌─ Help Header ────────────────────────────────────────────────────────────────┐
│  📚 Learning Catalyst Help • [ESC] Return to Conversation                     │
└──────────────────────────────────────────────────────────────────────────────┘

┌─ Command Reference Section ───────────────────────────────────────────────────┐
│  🔧 Available Commands                                                     │
│                                                                              │
│  > /config                    Manage AI provider settings                   │
│  > /stats                     View learning progress                       │
│  > /checkpoint                Save/load learning sessions                  │
│  > /help                      Show this help panel                         │
│  > /clear                     Clear the screen                             │
│  > /quit                      Exit the application                         │
│                                                                              │
│  [Enter] View detailed command usage                                        │
└──────────────────────────────────────────────────────────────────────────────┘

┌─ Learning Commands Section ─────────────────────────────────────────────────┐
│  🎯 Learning Features                                                      │
│                                                                              │
│  > Just ask questions! (e.g., "Explain neural networks")                   │
│  > /quiz [topic]              Test your knowledge                          │
│  > /personalize setup         Adapt to your learning style                 │
│  > /examples [concept]        Show practical examples                      │
│                                                                              │
│  [Enter] View learning workflow                                             │
└──────────────────────────────────────────────────────────────────────────────┘

┌─ Keyboard Shortcuts Section ─────────────────────────────────────────────────┐
│  ⌨️  Quick Navigation                                                       │
│                                                                              │
│  Global Controls:                                                           │
│  • ESC                       Return to conversation panel                    │
│  • Tab                       Complete commands and topics                    │
│  • ↑/↓                       Navigate command history                       │
│  • Ctrl+C                    Cancel current response                       │
│                                                                              │
│  Panel Navigation:                                                            │
│  • ↑/↓/←/→                   Navigate options in any panel                   │
│  • Enter                     Select/activate current option                │
│  • ESC                       Always return to conversation                 │
│                                                                              │
│  [Enter] View complete shortcut reference                                    │
└──────────────────────────────────────────────────────────────────────────────┘

┌─ Tips Section ───────────────────────────────────────────────────────────────┐
│  💡 Pro Tips                                                               │
│                                                                              │
│  • Use Tab completion to discover available commands                        │
│  • Ask follow-up questions to dive deeper into topics                       │
│  • Use /checkpoint to save progress on complex topics                       │
│  • Try /quiz to test your understanding after learning new concepts         │
│  • Use /personalize to adapt the AI's teaching style to your preferences   │
│                                                                              │
│  [Enter] View more tips and best practices                                  │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Navigation System

### CLI Prompt Architecture

#### Command Processing Flow
```python
class CLICommandProcessor:
    def __init__(self):
        self.prompt_active = True
        self.current_command = ""
        self.dialog_active = False

    def process_input(self, user_input: str):
        """Process user input from the prompt"""

        # Check for slash commands
        if user_input.startswith('/'):
            return self.handle_command(user_input)

        # Process as natural language AI query
        return self.handle_ai_query(user_input)

    def handle_command(self, command: str):
        """Handle slash commands"""
        cmd_parts = command.split()
        cmd = cmd_parts[0]

        if cmd == "/config":
            self.show_config_dialog()
        elif cmd == "/stats":
            self.show_statistics()
        elif cmd == "/checkpoint":
            self.show_checkpoint_dialog()
        elif cmd == "/help":
            self.show_help()
        elif cmd == "/quit":
            return "exit"
        else:
            return f"Unknown command: {cmd}"

    def handle_ai_query(self, query: str):
        """Handle natural language queries to AI"""
        # Add to conversation history
        self.conversation.add_user_message(query)

        # Get AI response with streaming
        response = self.ai_provider.get_streaming_response(query)

        # Display response and add to history
        self.conversation.add_ai_response(response)

        return "continue"
```

#### Dialog System
```python
class DialogManager:
    def __init__(self):
        self.active_dialog = None

    def show_config_dialog(self):
        """Show configuration dialog"""
        self.active_dialog = ConfigDialog()
        return self.active_dialog.run()

    def show_checkpoint_dialog(self):
        """Show checkpoint management dialog"""
        self.active_dialog = CheckpointDialog()
        return self.active_dialog.run()

class ConfigDialog:
    def run(self):
        """Run configuration dialog and return to prompt"""
        while True:
            self.show_config_menu()

            choice = input("Select action [1-5]: ")

            if choice == "1":
                self.select_provider()
            elif choice == "2":
                self.configure_api_key()
            elif choice == "3":
                self.select_model()
            elif choice == "4":
                self.interface_settings()
            elif choice == "5":
                break  # Return to prompt

        return "dialog_complete"
```

#### Key Event Handling
```python
class PromptHandler:
    def __init__(self):
        self.prompt_session = PromptSession()
        self.command_processor = CLICommandProcessor()

    def handle_key(self, key: str):
        """Handle key input in the prompt"""

        # ESC key handling
        if key == "ESC":
            if self.in_dialog():
                self.cancel_dialog()
            elif self.streaming_active():
                self.cancel_streaming()
            return

        # Normal prompt input
        if not self.in_dialog() and not self.streaming_active():
            self.prompt_session.handle_key(key)

    def run_interactive_loop(self):
        """Main interactive CLI loop"""
        while True:
            try:
                # Get user input from prompt
                user_input = self.prompt_session.prompt("🧠> ")

                if not user_input.strip():
                    continue

                # Process the input
                result = self.command_processor.process_input(user_input)

                if result == "exit":
                    break

            except KeyboardInterrupt:
                self.handle_interrupt()
                continue
            except EOFError:
                break
```

### State Management

#### Panel State
```python
@dataclass
class PanelState:
    active_panel: str = "conversation"
    previous_panel: str = "conversation"
    panel_history: List[str] = field(default_factory=list)

    # Conversation state
    conversation_history: List[Dict] = field(default_factory=list)
    current_input: str = ""
    cursor_position: int = 0

    # Panel-specific states
    config_selection: int = 0
    stats_section: str = "overview"
    checkpoint_selected: str = ""
    help_category: str = "commands"
```

#### State Persistence
```python
class StateManager:
    def save_state(self):
        """Save current application state"""
        state = {
            "panel_state": self.panel_state,
            "conversation": self.conversation_state,
            "learning": self.learning_state,
            "config": self.config_state
        }
        save_to_file(state, "app_state.json")

    def restore_state(self):
        """Restore saved application state"""
        if os.path.exists("app_state.json"):
            state = load_from_file("app_state.json")
            self.panel_state = PanelState(**state["panel_state"])
            # Restore other states...
```

## Implementation Guidelines

### Panel Development Pattern

#### Base Panel Class
```python
class BasePanel:
    def __init__(self, name: str):
        self.name = name
        self.is_active = False
        self.navigation_state = {}

    def activate(self):
        """Called when panel becomes active"""
        self.is_active = True
        self.render()
        self.setup_navigation()

    def deactivate(self):
        """Called when panel becomes inactive"""
        self.is_active = False
        self.save_state()

    def render(self):
        """Render panel content"""
        raise NotImplementedError

    def handle_key(self, key: str):
        """Handle key input"""
        raise NotImplementedError

    def navigate(self, direction: str):
        """Handle navigation"""
        raise NotImplementedError

    def activate_selection(self):
        """Handle Enter key on current selection"""
        raise NotImplementedError
```

#### Panel Registration
```python
class PanelManager:
    def __init__(self):
        self.panels = {}
        self.active_panel = None

    def register_panel(self, panel: BasePanel):
        """Register a new panel"""
        self.panels[panel.name] = panel

    def switch_to_panel(self, panel_name: str):
        """Switch to specified panel"""
        if panel_name in self.panels:
            if self.active_panel:
                self.active_panel.deactivate()

            self.active_panel = self.panels[panel_name]
            self.active_panel.activate()
```

### Performance Considerations

#### Rendering Optimization
```python
class OptimizedRenderer:
    def __init__(self):
        self.render_cache = {}
        self.last_render = None

    def render_panel(self, panel: BasePanel):
        """Render panel with caching"""
        current_state = panel.get_state()

        if (self.last_render != current_state or
            panel.name not in self.render_cache):

            content = panel.generate_content()
            self.render_cache[panel.name] = content
            self.last_render = current_state

        return self.render_cache[panel.name]
```

#### Memory Management
```python
class MemoryManager:
    def __init__(self, max_history: int = 1000):
        self.max_history = max_history

    def trim_conversation_history(self, history: List[Dict]) -> List[Dict]:
        """Keep conversation history within memory limits"""
        if len(history) > self.max_history:
            return history[-self.max_history:]
        return history

    def cleanup_temp_data(self):
        """Clean up temporary data and cache"""
        self.clear_render_cache()
        self.cleanup_old_checkpoints()
```

## Testing Strategy

### Panel Testing Framework

#### Unit Tests
```python
class TestPanelNavigation:
    def test_panel_switching(self):
        """Test panel switching behavior"""
        manager = PanelManager()
        manager.switch_to_panel("config")
        assert manager.active_panel.name == "config"

        manager.handle_key("ESC")
        assert manager.active_panel.name == "conversation"

    def test_navigation_keys(self):
        """Test arrow key navigation in panels"""
        config_panel = ConfigPanel()
        config_panel.activate()

        initial_selection = config_panel.get_selected_index()
        config_panel.handle_key("DOWN")
        new_selection = config_panel.get_selected_index()

        assert new_selection == initial_selection + 1
```

#### Integration Tests
```python
class TestPanelIntegration:
    def test_conversation_to_config_flow(self):
        """Test complete flow from conversation to config and back"""
        # Start in conversation panel
        assert app.current_panel == "conversation"

        # Switch to config panel
        app.handle_command("/config")
        assert app.current_panel == "config"

        # Change a setting
        config_panel.navigate_to_setting("theme")
        config_panel.activate_selection()
        config_panel.select_option("light")
        config_panel.save_changes()

        # Return to conversation
        app.handle_key("ESC")
        assert app.current_panel == "conversation"

        # Verify setting was applied
        assert app.config.theme == "light"
```

### User Experience Testing

#### Usability Testing Protocol
1. **First-Time User Experience**
   - Can new users navigate to configuration easily?
   - Is the return to conversation intuitive?
   - Are keyboard shortcuts discoverable?

2. **Task Completion Testing**
   - Can users complete common configuration tasks?
   - How long does it take to switch between panels?
   - Are error messages helpful and recoverable?

3. **Accessibility Testing**
   - Can users navigate without mouse?
   - Are visual indicators clear for screen readers?
   - Is text contrast sufficient for readability?

## Conclusion

This CLI prompt system design provides a clean, intuitive interface for Learning Catalyst that balances power with familiarity. The always-active prompt approach ensures continuous interaction flow, while temporary dialogs for specific commands provide focused functionality without disrupting the primary learning experience.

The architecture is extensible, allowing new commands and dialogs to be added easily while maintaining consistent CLI patterns. The separation between the main prompt and temporary interfaces ensures each can evolve independently while providing a cohesive user experience.

The design prioritizes CLI familiarity and efficiency, making it accessible to users comfortable with terminal interfaces while providing enhanced AI capabilities for interactive learning.