# Learning Catalyst

Learning Catalyst is an AI-driven interactive learning game designed to guide users through Markdown-based learning materials. It provides a knowledge map, adaptive challenges, checkpoints, and analytics. The system is designed to evolve from static learning delivery to an AI-driven adaptive tutor across multiple phases.

## Features

- Interactive learning experience with AI-generated explanations and challenges
- Progress tracking and checkpoints
- Support for multiple AI providers (OpenAI, Claude, ChatGLM, SiliconFlow, DeepSeek, and local models)
- Markdown-based learning content
- Token usage tracking and analytics
- Configurable preferences with key-value support (like npm config)
- Phase 1 BYOK (Bring Your Own Key) AI-Powered MVP implemented:
  - AI configuration at first run
  - AI-generated explanations from Markdown content
  - AI-generated challenges with evaluation
  - Checkpoint saving and loading
  - Support for changing AI model preferences (Phase 2 ready)

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd learning-catalyst
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install the package:
   ```bash
   pip install -r requirements.txt
   pip install -e .
   ```

4. Initialize a workspace directory:
   ```bash
   mkdir my_learning_workspace
   cd my_learning_workspace
   ```

## Usage

1. Create a workspace directory with your learning materials (Markdown files)
2. Navigate to your workspace directory
3. Configure your AI provider for the first time:
   ```bash
   # Set your preferred AI provider and model
   learning-catalyst preference set ai.default_provider openai
   learning-catalyst preference set ai.default_model gpt-4o
   # Set your API key
   learning-catalyst preference set ai.openai_api_key your-api-key-here
   ```
4. Run the application:
   ```bash
   learning-catalyst start-learning
   ```

### CLI Commands

- `start-learning [workspace_path]` - Start the learning session
- `models` - List available AI models
- `tokens [model_name]` - Show token usage statistics
- `knowledge-map` - Display the knowledge map structure
- `preference list` - List all preferences
- `preference set key value` - Set a preference value

### Preferences

Preferences can be managed with key-value syntax similar to npm config:

```bash
# List all preferences
learning-catalyst preference list

# Set a preference
learning-catalyst preference set ui.theme dark
learning-catalyst preference set learning.difficulty_level 7
```

## Using with Zhipu AI Models (GLM)

You can configure Learning Catalyst to use Zhipu AI's GLM models:

**Important: Never commit your API keys to version control!**

### Configuration Options:

1. **Using environment variables:**
   ```bash
   export ZHIPU_API_KEY=your_actual_api_key_here
   export ZHIPU_BASE_URL=https://open.bigmodel.cn/api/paas/v4/
   learning-catalyst start-learning
   ```

2. **Using preferences (remember: only for local use!):**
   ```bash
   learning-catalyst preference set ai.default_provider chatglm
   learning-catalyst preference set ai.default_model glm-4.5-air
   # Configure other settings as needed
   ```

### Supported Models:
- Chat Model: `glm-4.5-air`
- Embedding Model: `embedding-3`

## Project Structure

```
learning_catalyst/
├── src/                           # Source code
│   ├── core/                      # Core application logic
│   │   ├── knowledge_navigator.py # Knowledge Navigator implementation
│   │   ├── catalyst_agent.py      # Catalyst Agent implementation
│   │   ├── challenge_engine.py    # Challenge Engine implementation
│   │   └── checkpoint_manager.py  # Checkpoint Manager implementation
│   ├── ai/                        # AI Integration Layer
│   │   ├── abstraction.py         # Model Abstraction Layer interface
│   │   ├── service.py             # Model Abstraction Service
│   │   └── providers/             # Individual provider implementations
│   ├── data/                      # Data persistence layer
│   │   ├── database_manager.py    # Database manager implementation
│   │   ├── vector_storage.py      # Vector storage implementation
│   │   └── models/                # Data models
│   ├── cli/                       # Command-line interface
│   │   ├── main.py                # Main CLI application
│   │   └── commands/              # CLI command implementations
│   └── utils/                     # Utility functions
│       ├── preferences_manager.py # Preferences manager implementation
│       └── workspace_manager.py   # Workspace creation/management
├── tests/                         # Test suite
├── docs/                          # Documentation
├── requirements.txt               # Python dependencies
├── setup.py                       # Package setup
└── README.md                      # Project README
```

## Development

To contribute to Learning Catalyst:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## Security Note

This application supports multiple AI providers including the Zhipu AI GLM models. When using API keys:

- Never commit API keys to version control
- Use environment variables or secure configuration methods
- Store credentials only locally
- Review code that handles credentials

## License

This project is licensed under the MIT License - see the LICENSE file for details.