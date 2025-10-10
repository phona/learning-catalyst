# Learning Catalyst Technical Specification

## 🔧 System Architecture Overview

```text
┌─────────────────────────────────────────────────────────────────────┐
│                         CLI Interface Layer                         │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    Command Palette Input                     │   │
│  │                                                              │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐  │   │
│  │  │   /help         │  │   /concepts     │  │   /config    │  │   │
│  │  │   /models       │  │   /tokens       │  │   /quit      │  │   │
│  │  │   /preference   │  │   /knowledge-map│  │   ...        │  │   │
│  │  └─────────────────┘  └─────────────────┘  └──────────────┘  │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                              │                                     │
│                              ▼                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                   Autocomplete Engine                        │   │
│  │                                                              │   │
│  │  Provides real-time suggestions as users type commands       │   │
│  │  e.g., typing "/con" and pressing TAB shows:                 │   │
│  │       /concepts                                              │   │
│  │       /config                                                │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────────┐
│                           Logic Layer                               │
│  ┌─────────────────┐  ┌────────────────┐  ┌──────────────────────┐  │
│  │  Catalyst Agent │  │Challenge Engine│  │   State Manager      │  │
│  │                 │  │                │  │                      │  │
│  │  Intent         │  │  Question      │  │  Save/Load State     │  │
│  │  Interpretation │  │  Generation    │  │  Checkpoints         │  │
│  └─────────────────┘  └────────────────┘  └──────────────────────┘  │
│                              │                                     │
│  ┌────────────────────────────▼──────────────────────────────────┐  │
│  │                   Model Abstraction Layer                     │  │
│  │                                                               │  │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐   │  │
│  │  │  OpenAI         │  │  Anthropic      │  │  Local       │   │  │
│  │  │  Provider       │  │  Provider       │  │  Provider    │   │  │
│  │  └─────────────────┘  └─────────────────┘  └──────────────┘   │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                              │                                     │
│  ┌────────────────────────────▼──────────────────────────────────┐  │
│  │                   Preferences Manager                         │  │
│  │                                                               │  │
│  │  Manages AI provider configurations and API keys              │  │
│  │  Handles application preferences                              │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────────┐
│                           Data Layer                                │
│  ┌─────────────────┐  ┌────────────────┐  ┌──────────────────────┐  │
│  │ SQLite DB       │  │ Vector DB      │  │ Local Files          │  │
│  │ (Q&A History,   │  │ (Content       │  │ (Markdown)           │  │
│  │ Concepts,       │  │ Retrieval)     │  │                      │  │
│  │ Proficiency)    │  │ (Phase 3+)     │  │                      │  │
│  └─────────────────┘  └────────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

## Component Specifications

### 9. Concept Building System

#### Responsibilities
- Automatically parse Markdown files to identify learning concepts
- Support different extraction modes (headers, summaries, full content)
- Create structured representation of learning materials
- Build concept relationships and dependencies
- Handle concept metadata management
- Support concept validation and duplicate detection

#### Interface Definition
```python
class ConceptBuilder:
    def __init__(self, db_manager, model_service):
        self.db_manager = db_manager
        self.model_service = model_service
        self.concepts = []
        self.relationships = []
    
    def extract_concepts_from_markdown(self, file_path: str, granularity: str) -> List[Concept]:
        """Extract concepts from a Markdown file based on specified granularity"""
        
    def extract_concepts_from_directory(self, dir_path: str, granularity: str) -> List[Concept]:
        """Extract concepts from all Markdown files in a directory"""
    
    def build_concept_relationships(self) -> List[ConceptRelationship]:
        """Build relationships between extracted concepts"""
    
    def save_concepts_to_db(self) -> None:
        """Persist extracted concepts to the database"""
    
    def validate_concepts(self) -> List[ValidationResult]:
        """Validate extracted concepts for consistency and quality"""
    
    def detect_duplicate_concepts(self) -> List[List[Concept]]:
        """Identify and group duplicate concepts"""
    
    def summarize_concepts(self) -> List[ConceptSummary]:
        """Generate summaries for extracted concepts"""

@dataclass
class Concept:
    id: str
    title: str
    content: str
    source_file: str
    granularity: str
    level: int  # For hierarchical organization
    metadata: Dict[str, Any]
    timestamp: datetime

@dataclass
class ConceptRelationship:
    source_id: str
    target_id: str
    relationship_type: str
    strength: float

@dataclass
class ValidationResult:
    concept_id: str
    is_valid: bool
    issues: List[str]

@dataclass
class ConceptSummary:
    concept_id: str
    summary: str
    key_points: List[str]
    difficulty_score: float
```

#### Concept Extraction Modes

The Concept Building System supports three extraction modes as specified in CONCEPT-R1 requirement:

1. **Headers Only Mode** (granularity="headers"):
   - Extracts concepts based solely on Markdown headers
   - Fastest extraction method
   - Suitable for well-structured notes with clear hierarchy
   - Each header becomes a concept with the content under it

2. **Summaries Mode** (granularity="summaries"):
   - Extracts headers and generates summaries of their content
   - Balance between speed and accuracy
   - Better for complex topics requiring distillation
   - Uses AI model to generate concise summaries

3. **Full Content Mode** (granularity="full_content"):
   - Extracts complete content with detailed structure
   - Most accurate but resource-intensive
   - Suitable for in-depth analysis and complex materials
   - Preserves all original content with hierarchical structure

#### Implementation Details
- Uses Markdown parsing libraries to identify structure
- Implements configurable regex patterns for header detection
- Integrates with Model Abstraction Layer for summary generation
- Stores extracted concepts in SQLite database
- Maintains audit trails for extraction processes

### 1. CLI Interface

#### Responsibilities
- Render conversational history in a clear, readable format
- Accept and distinguish between user input and system commands
- Handle special commands prefixed with `/`
- Provide visual feedback during AI processing
- Manage graceful shutdowns and state saving
- Integrate with local Markdown files for content-aware responses (PENDING)

#### Interface Definition
```
class CLIInterface:
    def display_message(self, message: str) -> None
    def get_user_input(self) -> str
    def process_command(self, command: str) -> bool  # Returns True if command handled
    def render_conversation_history(self, history: List[Message]) -> None
    def show_typing_indicator(self) -> None
    def clear_screen(self) -> None
```

#### Command Support
The CLI Interface supports a comprehensive set of slash commands for accessing all features:

##### Core Navigation Commands
- `/help` - Show available commands with descriptions
  - Usage: `/help`
  - Example output:
    ```
    Available Slash Commands
    ┌────────────────────┬────────────────────────────────────────────┐
    │ Command            │ Description                                │
    ├────────────────────┼────────────────────────────────────────────┤
    │ /help              │ Show this help message (you're here!)      │
    │ /concepts          │ Show available learning concepts           │
    │ /reset             │ Reset the learning session                 │
    │ /quit or /exit     │ Exit the application                       │
    └────────────────────┴────────────────────────────────────────────┘
    ```

- `/concepts` - Browse available learning materials
  - Usage: `/concepts`
  - Example output:
    ```
    📚 Available learning concepts:
      1. Data Structures
         Fundamental concepts in computer science data organization
      2. Algorithms
         Step-by-step procedures for calculations and problem-solving
    ```

- `/reset` - Reset the current learning session
  - Usage: `/reset`
  - Example output:
    ```
    Session reset. Configuration remains unchanged.
    You can continue learning with your current settings.
    ```

- `/quit` - Exit the application
  - Usage: `/quit` or `/q`
  - Example output:
    ```
    Thanks for using Learning Catalyst. Goodbye! 👋
    ```

##### Configuration Commands
- `/config` - View current AI configuration
  - Usage: `/config`
  - Example output:
    ```
    Current AI configuration: openai - gpt-4
    Configuration is set and ready to use.
    ```

- `/set-config` - Configure AI provider and model
  - Usage: `/set-config`
  - Example interaction:
    ```
    Which AI provider? (openai/anthropic/chatglm/siliconflow/deepseek/local): openai
    Which model would you like to use?: gpt-4
    Please enter your API key: ************************************************
    ✅ AI configuration updated: openai - gpt-4
    ```

- `/models` - List all available AI models
  - Usage: `/models`
  - Example output:
    ```
    📋 Available AI Models:
    • openai - gpt-4: Configured default model for openai
    • openai - gpt-3.5-turbo: Example model for openai
    • anthropic - claude-3-opus: Example model for anthropic
    ```

- `/preference` - Manage application preferences
  - Usage: `/preference list` or `/preference set [key] [value]`
  - Example output for list:
    ```
    📋 Current Preferences:
    {
      "ai": {
        "default_provider": "openai",
        "default_model": "gpt-4"
      },
      "ui": {
        "theme": "dark"
      }
    }
    ```
  - Example for set:
    ```
    /preference set ui.theme light
    ✅ Preference ui.theme set to light
    ```

##### Analytics Commands
- `/tokens` - View token usage statistics
  - Usage: `/tokens` or `/tokens [model_name]`
  - Example output for summary:
    ```
    📊 Token Usage Summary:
      Total Tokens (Last 30 days): 12500
      Input Tokens: 7800
      Output Tokens: 4700
    ```
  - Example for detailed usage:
    ```
    /tokens gpt-4
    📊 Detailed Token Usage for gpt-4:
    ┌─────────────────────┬──────────────┬───────────────┬──────────────┐
    │ Timestamp           │ Input Tokens │ Output Tokens │ Context      │
    ├─────────────────────┼──────────────┼───────────────┼──────────────┤
    │ 2024-05-15 10:30:22 │ 450          │ 280           │ explanation  │
    │ 2024-05-15 09:15:47 │ 320          │ 195           │ challenge    │
    └─────────────────────┴──────────────┴───────────────┴──────────────┘
    ```

- `/knowledge-map` - Display knowledge structure
  - Usage: `/knowledge-map`
  - Example output:
    ```
    🗺️  Knowledge Map:
      Concepts:
        • Data Structures (ID: ds-001)
        • Algorithms (ID: alg-002)
      
      Relationships:
        Data Structures → Algorithms
    ```

### 2. Catalyst Agent

#### Responsibilities
- Interpret user intent from natural language input
- Determine if input is query, challenge request, or answer
- Generate appropriate prompts for Model Abstraction Layer
- Create context-aware startup messages
- Manage conversation context and short-term memory

#### Interface Definition
```python
class CatalystAgent:
    def interpret_intent(self, user_input: str) -> IntentType
    def generate_explanation_prompt(self, query: str, context: str) -> str
    def generate_welcome_prompt(self, session_state: SessionState) -> str
    def evaluate_answer(self, question: str, user_answer: str, correct_answer: str) -> AnswerEvaluation
    def generate_onboarding_prompt(self, markdown_files: List[str]) -> str
    def analyze_conversation_history(self) -> str
```

#### Intent Types
- QUERY: User is asking for information
- CHALLENGE_REQUEST: User wants a question/challenge
- ANSWER: User is responding to a previous challenge
- CONVERSATION: General conversation continuation

### 3. Challenge Engine

#### Responsibilities
- Generate questions based on current learning context
- Support various question types (MCQ, open-ended, fill-in-the-blank)
- Process and evaluate user answers
- Store Q&A pairs in database

#### Interface Definition
```python
class ChallengeEngine:
    def generate_question(self, context: str, question_type: QuestionType, difficulty: DifficultyLevel) -> Question
    def evaluate_answer(self, question: Question, user_answer: str) -> AnswerEvaluation
    def store_qa_pair(self, question: Question, user_answer: str, evaluation: AnswerEvaluation) -> None
    def get_current_challenge(self) -> Optional[Question]
    def clear_current_challenge(self) -> None
```

### 4. State Manager

#### Responsibilities
- Save application state on exit
- Load state on startup
- Manage manual checkpoints
- Handle conversation history persistence

#### Interface Definition
```python
class StateManager:
    def save_state(self, state: ApplicationState) -> None
    def load_state(self) -> Optional[ApplicationState]
    def save_checkpoint(self, name: str, state: ApplicationState) -> None
    def load_checkpoint(self, name: str) -> Optional[ApplicationState]
    def list_checkpoints(self) -> List[str]
    def export_state(self, path: str) -> None
    def import_state(self, path: str) -> ApplicationState
```

### 5. Model Abstraction Layer

#### Responsibilities
- Provide unified interface for various LLM providers
- Handle provider-specific authentication
- Manage rate limiting and API errors
- Support model switching

#### Interface Definition
```python
class ModelProvider:
    def generate_response(self, prompt: str, context: Optional[dict] = None) -> str
    def validate_api_key(self) -> bool
    def get_provider_info(self) -> ProviderInfo

class ModelAbstractionLayer:
    def register_provider(self, provider: ModelProvider) -> None
    def set_active_model(self, model_id: str) -> bool
    def generate_response(self, prompt: str) -> str
    def validate_api_key(self, provider_id: str, api_key: str) -> bool
```

### 6. Configuration Manager

#### Responsibilities
- Store and retrieve AI provider configurations
- Manage API keys securely
- Handle application preferences
- Provide configuration validation

#### Interface Definition
```python
class ConfigurationManager:
    def load_config(self) -> Configuration
    def save_config(self, config: Configuration) -> None
    def get_active_model(self) -> str
    def set_active_model(self, model_id: str) -> bool
    def add_provider(self, provider: ProviderConfig) -> bool
    def remove_provider(self, provider_id: str) -> bool
    def list_providers(self) -> List[ProviderConfig]
```

### 7. Data Layer

#### SQLite Database Schema
```sql
-- User profiles and preferences
CREATE TABLE user_profiles (
    id INTEGER PRIMARY KEY,
    selected_model TEXT,
    preferences JSON
);

-- Q&A history
CREATE TABLE qa_history (
    id INTEGER PRIMARY KEY,
    question TEXT,
    user_answer TEXT,
    ai_feedback TEXT,
    timestamp DATETIME,
    concept_id TEXT
);

-- Concepts (Phase 2+)
CREATE TABLE concepts (
    id TEXT PRIMARY KEY,
    title TEXT,
    content TEXT,
    metadata JSON
);

-- Token usage tracking
CREATE TABLE token_usage (
    id INTEGER PRIMARY KEY,
    model_name TEXT,
    provider TEXT,
    input_tokens INTEGER,
    output_tokens INTEGER,
    total_tokens INTEGER,
    timestamp DATETIME,
    context TEXT
);
```

### 8. Command Palette Input

#### Responsibilities
- Provide centralized access to all application commands
- Parse slash-prefixed commands and their arguments
- Route commands to appropriate handlers
- Maintain command registry with descriptions and aliases

#### Interface Definition
```python
class CommandPalette:
    def register_command(self, name: str, description: str, handler: Callable, aliases: List[str] = None) -> None
    def parse_command(self, input_text: str) -> Tuple[Optional[str], str]  # Returns (command_name, args)
    def execute_command(self, command_name: str, args: str = "") -> bool
    def get_available_commands(self) -> List[CommandInfo]
    def get_command_help(self, command_name: str) -> str
```

#### Command Support
- All existing slash commands (/help, /concepts, /models, etc.)
- Support for command aliases (e.g., /q for /quit)
- Extensible architecture for adding new commands

#### Implementation Example
```python
# Registering commands with the CommandPalette
command_palette = CommandPalette()

# Register the help command
command_palette.register_command(
    name="help",
    description="Show this help message",
    handler=handle_help_command,
    aliases=["h"]
)

# Register the concepts command
command_palette.register_command(
    name="concepts",
    description="Show available learning concepts",
    handler=handle_concepts_command,
    aliases=["c"]
)

# Parsing and executing commands
user_input = "/help"
command = command_palette.parse_command(user_input)
if command:
    command_palette.execute_command(command.name, command.args)
```

### 9. Autocomplete Suggestions

#### Responsibilities
- Provide real-time suggestions as users type commands
- Improve discoverability and reduce typing errors
- Filter suggestions based on typed characters

#### Interface Definition
```
class AutocompleteEngine:
    def __init__(self, get_commands_callback: Callable[[], List[str]])
    def complete(self, text: str, state: int) -> str
    def refresh_commands(self) -> None
```

#### Implementation Example
```python
# Initialize autocomplete engine
def get_available_commands():
    return ["/help", "/concepts", "/config", "/models", "/tokens", "/knowledge-map"]

autocomplete_engine = AutocompleteEngine(get_available_commands)

# Usage example:
# User types "/con" and presses TAB
# System suggests: /concepts, /config
```

#### Usage Examples
```bash
# Type '/' then press TAB to see all available commands
/

# Suggestions show below:
# /concepts
# /config
# /help
# /models
# /tokens
# /knowledge-map

# Type partial command name then press TAB for suggestions
/con

# Suggestions show below:
# /concepts
# /config

# Continue typing for more specific suggestions
/conf

# Suggestions show below:
# /config
```

## 🔧 Implementation Guidelines

### Command Handler Structure
Each command should follow a consistent pattern:
1. Parse input and validate arguments
2. Execute the core functionality
3. Format and display results
4. Handle errors gracefully

### Error Handling
All commands should:
- Validate input parameters
- Catch and handle exceptions
- Provide meaningful error messages
- Maintain application stability

### Performance Considerations
- Use asynchronous operations where appropriate
- Cache frequently accessed data
- Limit database queries
- Optimize rendering for large data sets