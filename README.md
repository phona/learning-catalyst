# Learning Catalyst

Learning Catalyst is an AI-powered personalized learning platform that adapts to individual learning
styles and progress. It provides interactive learning experiences through AI-generated challenges
and concept explanations.

## Project Structure

```
learning_catalyst/
├── src/
│   ├── ai/                 # AI abstraction layer and provider implementations
│   │   ├── abstraction.py   # Abstract interface for AI operations
│   │   ├── service.py       # Implementation of AI service with provider management
│   │   └── providers/       # Individual AI provider implementations
│   │       ├── openai_provider.py
│   │       ├── anthropic_provider.py
│   │       └── ...          # Other provider implementations
│   ├── core/               # Core application logic
│   │   ├── catalyst_agent.py      # Main AI interaction handler
│   │   ├── challenge_engine.py    # Challenge generation and evaluation
│   │   ├── knowledge_navigator.py # Concept management and learning paths
│   │   ├── state_manager.py       # Application state and checkpoint management
│   │   └── ...                    # Other core components
│   ├── data/               # Data management and storage
│   │   ├── database_manager.py    # SQLite database operations
│   │   ├── vector_storage.py      # Vector embedding storage
│   │   └── models/                # Data models
│   │       ├── concept.py
│   │       ├── challenge.py
│   │       └── ...                # Other data models
│   ├── cli/                # Command-line interface
│   │   ├── main.py                # Main CLI entry point
│   │   ├── system_commands_handler.py # System command implementations
│   │   └── commands/              # Individual command implementations
│   └── utils/              # Utility functions
│       ├── preferences_manager.py # User preference management
│       └── workspace_manager.py   # Workspace initialization and management
├── tests/                  # Test suite
└── docs/                   # Documentation
```

## Key Components

### AI Abstraction Layer

The AI module provides a unified interface for interacting with different AI providers:

- OpenAI (GPT models)
- Anthropic (Claude models)
- ChatGLM (Zhipu AI models)
- SiliconFlow
- DeepSeek
- Local models (Ollama, Llama.cpp, etc.)

### Core Application Logic

The core module contains the main application logic:

- **CatalystAgent**: Main AI interaction handler that interprets user intents and generates
  responses
- **ChallengeEngine**: Generates and evaluates learning challenges
- **KnowledgeNavigator**: Manages learning concepts and determines learning paths
- **StateManager**: Handles application state persistence and checkpoint management

### Data Management

The data module handles all data storage and retrieval:

- **DatabaseManager**: SQLite database operations for user profiles, concepts, challenges, and
  progress
- **VectorStorage**: Storage and retrieval of vector embeddings for semantic search
- **Models**: Data classes for all application entities

### CLI Interface

The CLI provides a rich command-line interface with:

- Interactive learning sessions
- Slash commands for system operations (/help, /concepts, /models, /tokens, etc.)
- Configuration management
- Rich text formatting using the Rich library

## Features

1. **Personalized Learning Paths**: AI-driven learning paths based on user progress and preferences
2. **Interactive Challenges**: AI-generated challenges to test understanding
3. **Progress Tracking**: Detailed tracking of learning progress and competency
4. **Multiple AI Providers**: Support for various AI providers with unified interface
5. **Token Usage Analytics**: Track and analyze AI token consumption
6. **Knowledge Mapping**: Visual representation of concept relationships
7. **Rich CLI Interface**: Beautiful terminal interface with formatting and interactive elements

## Getting Started

1. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

2. Run the application:

   ```bash
   python -m src.cli.main
   ```

3. Follow the setup prompts to configure your AI provider

4. Use slash commands to navigate the application:
   - `/help` - Show available commands
   - `/concepts` - View available learning concepts
   - `/models` - List available AI models
   - `/tokens` - View token usage statistics

## Development

### Architecture Overview

The application follows a modular architecture with clear separation of concerns:

- **AI Layer**: Abstracts different AI providers behind a unified interface
- **Core Logic**: Implements the main application functionality
- **Data Layer**: Handles all data persistence and retrieval
- **CLI Interface**: Provides user interaction through command-line interface

### Data Models

Key data models include:

- **Concept**: Learning concepts with prerequisites and difficulty levels
- **Challenge**: AI-generated learning challenges
- **UserProfile**: User preferences and competency profiles
- **TokenUsage**: Tracking of AI token consumption
- **Checkpoint**: Application state snapshots for session persistence

### Extensibility

The application is designed to be easily extensible:

- Add new AI providers by implementing the ModelAbstractionLayer interface
- Extend data models by adding new classes in the data/models directory
- Add new CLI commands by creating modules in the cli/commands directory
