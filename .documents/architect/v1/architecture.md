# Learning Catalyst - Software Architecture Document

## 1. Introduction

### 1.1 Purpose
This document describes the architectural design for the Learning Catalyst project - an AI-driven interactive command-line learning application designed to guide users through Markdown-based learning materials. The application operates within a user-specified workspace directory and stores all data in a `.learningspace` subdirectory. The architecture supports multiple AI providers including OpenAI, Claude, ChatGLM, SiliconFlow, DeepSeek, and local models. Additionally, users can configure custom embedding and rerank models to enhance content retrieval and relevance. The application provides system commands (prefixed with /) for users to check token usage, available models, knowledge map structure, and configure preferences using key-value syntax stored in a JSON configuration file. The design is intended to support progressive enhancement across three phases: MVP, Gamified Progression, and Autonomous Tutor.

### 1.2 Scope
This architecture covers the core modules, data persistence systems, and integration points required to implement the Learning Catalyst command-line platform that operates within user-defined workspaces. The application creates a `.learningspace` directory in the workspace to store all data. The design ensures support for multiple AI providers including OpenAI, Claude, ChatGLM, SiliconFlow, DeepSeek, and local models, with user-configurable settings. Additionally, users can configure custom embedding and rerank models for enhanced content retrieval. The application includes slash-prefixed system commands (/models, /tokens, /knowledge-map, /preference) for users to monitor token usage, view available models, explore the knowledge structure, and configure preferences using key-value syntax with support for string, number, boolean, and JSON values (similar to npm config set). The architecture maintains system performance and security while providing maximum flexibility for AI model selection.

### 1.3 Document Conventions
- The architecture is designed using a layered approach
- Component interactions are represented with clear interfaces
- All diagrams are represented in mermaid format
- Security considerations are marked with 🔐
- Performance considerations are marked with ⚡

---

## 2. Architectural Overview

### 2.1 Layered Architecture
The system follows a clean architecture pattern with distinct layers:

```
┌─────────────────────────────────────┐
│         Presentation Layer          │
├─────────────────────────────────────┤
│         Application Layer           │
├─────────────────────────────────────┤
│         Domain Layer                │
├─────────────────────────────────────┤
│         Infrastructure Layer        │
└─────────────────────────────────────┘
```

### 2.2 High-Level Component Diagram

```mermaid
graph TB
    subgraph "Presentation Layer"
        CLI[Command Line Interface]
    end

    subgraph "Application Layer"
        NA[Knowledge Navigator]
        CA[Catalyst Agent]
        CE[Challenge Engine]
        CM[Checkpoint Manager]
        AA[Assessment Engine]
        AD[Analytics Dashboard]
        SC[System Commands Handler]
    end

    subgraph "Infrastructure Layer"
        MAL[Model Abstraction Layer]
        DB[(SQLite Database with Vector Support)]
        AI[(External LLM APIs)]
    end

    CLI --> NA
    CLI --> CA
    CLI --> CM
    CLI --> SC
    
    NA --> CA
    CA --> CE
    CA --> CM
    CE --> AA
    AA --> AD
    
    SC --> MAL
    SC --> DB
    SC --> FS[File System (preferences.json)]
    CA --> MAL
    MAL --> AI
    NA --> DB
    CA --> DB
    CE --> DB
    CM --> DB
    AA --> DB
    AD --> DB
```

---

## 3. Core Modules Architecture

### 3.1 Knowledge Navigator
**Purpose**: Displays knowledge map and available user actions

**Responsibilities**:
- Load and parse Markdown learning materials
- Generate visual knowledge map
- Provide concept selection interface
- Handle navigation between concepts

**Technology Stack**:
- Python Markdown parser for content processing
- Graph visualization library for knowledge map
- Command-line interaction handler

**Interface**:
```python
from abc import ABC, abstractmethod
from typing import List, Dict, Optional, Any
from dataclasses import dataclass
import asyncio

@dataclass
class KnowledgeMap:
    concepts: List[Dict[str, Any]]
    relationships: List[Dict[str, Any]]

@dataclass
class Concept:
    id: str
    title: str
    content: str
    prerequisites: List[str]
    difficulty: int

@dataclass
class UserProgress:
    concept_id: str
    completed: bool
    score: float

class KnowledgeNavigator(ABC):
    @abstractmethod
    async def load_content(self, file_path: str) -> KnowledgeMap:
        """Load and parse Markdown content into a knowledge map"""
        pass
    
    @abstractmethod
    async def get_available_concepts(self) -> List[Concept]:
        """Get list of available concepts"""
        pass
    
    @abstractmethod
    def get_concept_path(self, concept_id: str) -> List[Concept]:
        """Get the learning path to reach a specific concept"""
        pass
    
    @abstractmethod
    def update_progress(self, concept_id: str, progress: UserProgress) -> None:
        """Update progress for a specific concept"""
        pass
```

### 3.2 Catalyst Agent
**Purpose**: Core AI-driven module that generates explanations, creates challenges, and provides guidance

**Responsibilities**:
- Generate AI-based explanations from Markdown content
- Create prompts for challenge generation
- Interface with the Model Abstraction Layer
- Personalize content based on user profile and history

**Technology Stack**:
- Python prompt engineering framework
- Content personalization engine
- Context management system

**Interface**:
```python
from abc import ABC, abstractmethod
from typing import List, Dict, Optional, Any
from dataclasses import dataclass
import asyncio

@dataclass
class Challenge:
    id: str
    question: str
    options: Optional[List[str]] = None  # For multiple choice
    challenge_type: str  # "multiple_choice", "open_ended", etc.
    concept_id: str

@dataclass 
class Evaluation:
    is_correct: bool
    feedback: str
    score: float

@dataclass
class UserProfile:
    id: str
    preferences: Dict[str, Any]
    competency_profile: Dict[str, Any]
    ai_config: Dict[str, Any]

@dataclass
class Context:
    user_profile: UserProfile
    current_concept: Concept
    interaction_history: List[Dict[str, Any]]

class CatalystAgent(ABC):
    @abstractmethod
    async def generate_explanation(self, concept: Concept, context: Context) -> str:
        """Generate AI-based explanation for a concept"""
        pass
    
    @abstractmethod
    async def generate_challenge(self, concept: Concept, context: Context) -> Challenge:
        """Generate an AI-based challenge for a concept"""
        pass
    
    @abstractmethod
    async def evaluate_answer(self, answer: str, expected: str, context: Context) -> Evaluation:
        """Evaluate user's answer to a challenge"""
        pass
    
    @abstractmethod
    async def suggest_next_concepts(self, profile: UserProfile, progress: UserProgress) -> List[Concept]:
        """Suggest next concepts based on user profile and progress"""
        pass
    
    @abstractmethod
    async def track_token_usage(self, model: str, input_tokens: int, output_tokens: int, context: str) -> None:
        """Track token usage for analytics and reporting"""
        pass
```

### 3.3 Challenge Engine
**Purpose**: Works with the Catalyst Agent to present AI-generated questions

**Responsibilities**:
- Format and present challenges to users
- Collect and validate user responses
- Determine challenge types (multiple-choice, open-ended, etc.)
- Integrate with evaluation systems

**Interface**:
```python
from abc import ABC, abstractmethod
from typing import List, Dict, Optional, Any
from dataclasses import dataclass
import asyncio

@dataclass
class UserAnswer:
    challenge_id: str
    answer_text: str
    timestamp: str

@dataclass
class ChallengeResult:
    challenge_id: str
    user_answer: UserAnswer
    evaluation: Evaluation
    is_correct: bool

class ChallengeEngine(ABC):
    @abstractmethod
    def present_challenge(self, challenge: Challenge) -> None:
        """Present a challenge to the user"""
        pass
    
    @abstractmethod
    async def collect_answer(self) -> UserAnswer:
        """Collect answer from user"""
        pass
    
    @abstractmethod
    async def validate_answer(self, user_answer: UserAnswer, challenge: Challenge) -> ChallengeResult:
        """Validate user's answer to a challenge"""
        pass
    
    @abstractmethod
    def adapt_challenge(self, challenge: Challenge, user_profile: UserProfile) -> Challenge:
        """Adapt challenge based on user profile"""
        pass
```

### 3.4 Checkpoint Manager
**Purpose**: Saves/loads progress states

**Responsibilities**:
- Serialize user progress and state
- Handle checkpoint creation and restoration
- Compress state data for efficient storage
- Manage auto-save functionality

**Technology Stack**:
- Python serialization (pickle or JSON)
- Compression algorithms (gzip)
- SQLite persistence service

**Interface**:
```python
from abc import ABC, abstractmethod
from typing import List, Dict, Optional, Any
from dataclasses import dataclass
import asyncio
import json

@dataclass
class ApplicationState:
    user_profile: UserProfile
    current_concept: Concept
    interaction_history: List[Dict[str, Any]]
    progress_data: Dict[str, Any]

@dataclass
class Checkpoint:
    id: str
    user_id: str
    state_data: str  # JSON string of the state
    created_at: str
    description: str

class CheckpointManager(ABC):
    @abstractmethod
    async def create_checkpoint(self, state: ApplicationState) -> Checkpoint:
        """Create a checkpoint from current application state"""
        pass
    
    @abstractmethod
    async def load_checkpoint(self, checkpoint_id: str) -> ApplicationState:
        """Load application state from checkpoint"""
        pass
    
    @abstractmethod
    async def auto_save(self, state: ApplicationState) -> None:
        """Automatically save current state"""
        pass
    
    @abstractmethod
    async def list_checkpoints(self) -> List[Checkpoint]:
        """List available checkpoints for user"""
        pass
```

### 3.5 Model Abstraction Layer
**Purpose**: Provides a unified interface for communicating with various LLM providers

**Responsibilities**:
- Abstract communication with different AI providers
- Handle API key management and validation
- Normalize responses from different providers
- Route requests to the appropriate provider

**Technology Stack**:
- Python HTTP clients (httpx/requests)
- Provider adapter patterns
- Authentication and validation service
- Rate limiting and cost monitoring

**Interface**:
```python
from abc import ABC, abstractmethod
from typing import List, Dict, Optional, Any, Union
from dataclasses import dataclass
import asyncio

@dataclass
class Message:
    role: str  # "system", "user", "assistant"
    content: str

@dataclass 
class AIResponse:
    content: str
    model: str
    usage: Dict[str, int]  # tokens used
    timestamp: str

@dataclass
@dataclass
class Credentials:
    provider: str  # "openai", "anthropic", "chatglm", "siliconflow", "deepseek", "local", "embedding", "rerank"
    api_key: str
    base_url: Optional[str] = None
    additional_config: Optional[Dict[str, Any]] = None  # For provider-specific settings

@dataclass
class EmbeddingResponse:
    embeddings: List[List[float]]
    model: str
    usage: Dict[str, int]  # tokens used

@dataclass
class RerankResponse:
    results: List[Dict[str, Any]]  # with document and relevance score
    model: str

@dataclass
class ProviderCapabilities:
    supports_streaming: bool
    max_tokens: int
    supported_models: List[str]
    input_cost_per_token: float
    output_cost_per_token: float
    supports_embeddings: bool
    supports_rerank: bool

class ModelAbstractionLayer(ABC):
    @abstractmethod
    async def send_message(
        self, 
        provider: str, 
        model: str, 
        messages: List[Message],
        temperature: float = 0.7
    ) -> AIResponse:
        """Send message to LLM provider and get response"""
        pass
    
    @abstractmethod
    async def get_embeddings(
        self,
        provider: str,
        model: str,
        texts: List[str],
        dimensions: Optional[int] = None
    ) -> EmbeddingResponse:
        """Get embeddings for texts using specified provider and model"""
        pass
    
    @abstractmethod
    async def rerank(
        self,
        provider: str,
        model: str,
        query: str,
        documents: List[str],
        top_k: int = 10
    ) -> RerankResponse:
        """Rerank documents based on query relevance"""
        pass
    
    @abstractmethod
    async def validate_credentials(self, provider: str, credentials: Credentials) -> bool:
        """Validate API credentials for a provider"""
        pass
    
    @abstractmethod
    async def list_available_models(self, provider: str) -> List[str]:
        """Get list of available models for a provider"""
        pass
    
    @abstractmethod
    async def get_provider_capabilities(self, provider: str) -> ProviderCapabilities:
        """Get capabilities information for a provider"""
        pass
```

### 3.6 Analytics Dashboard
**Purpose**: Shows proficiency, weak areas, and learning trends

**Responsibilities**:
- Visualize user progress and performance
- Generate learning trend reports
- Identify weak concepts
- Provide actionable insights

**Technology Stack**:
- Python data visualization (matplotlib, plotext for terminal)
- Analytics processing engine
- Report generation system

**Interface**:
```python
from abc import ABC, abstractmethod
from typing import List, Dict, Optional, Any
from dataclasses import dataclass
from datetime import datetime
import asyncio

@dataclass
class TimePeriod:
    start_date: datetime
    end_date: datetime

@dataclass
class ProgressReport:
    user_id: str
    concepts_mastered: int
    concepts_in_progress: int
    overall_score: float
    time_spent: int  # in minutes
    report_date: str

@dataclass
class TrendData:
    user_id: str
    metric: str  # e.g. "accuracy", "time_per_question"
    data_points: List[Dict[str, Any]]  # with date and value
    trend_direction: str  # "improving", "declining", "stable"

@dataclass
class AnalyticsExport:
    user_id: str
    export_data: str  # JSON string of all analytics data
    export_format: str  # "json", "csv", etc.
    timestamp: str

class AnalyticsDashboard(ABC):
    @abstractmethod
    async def generate_progress_report(self, user_id: str) -> ProgressReport:
        """Generate overall progress report for user"""
        pass
    
    @abstractmethod
    async def identify_weak_areas(self, user_id: str) -> List[Concept]:
        """Identify concepts where user is struggling"""
        pass
    
    @abstractmethod
    async def generate_trend_data(self, user_id: str, period: TimePeriod) -> TrendData:
        """Generate trend data for specific metric over time period"""
        pass
    
    @abstractmethod
    async def export_analytics(self, user_id: str) -> AnalyticsExport:
        """Export analytics data for user"""
        pass
```

### 3.7 Assessment Engine
**Purpose**: Background process for evaluating user progress and adapting difficulty

**Responsibilities**:
- Analyze user performance patterns
- Update competency profiles
- Adjust difficulty levels based on performance
- Generate adaptive learning recommendations

**Technology Stack**:
- Python pattern recognition algorithms
- Statistical analysis for difficulty adaptation
- Background processing with asyncio

**Interface**:
```python
from abc import ABC, abstractmethod
from typing import List, Dict, Optional, Any
from dataclasses import dataclass
import asyncio

@dataclass
class InteractionHistory:
    user_id: str
    interactions: List[Dict[str, Any]]  # question, answer, result, timestamp

@dataclass
class AnalysisResult:
    user_id: str
    strengths: List[str]  # concept IDs or topic areas
    weaknesses: List[str]  # concept IDs or topic areas
    performance_trends: Dict[str, float]  # concept_id -> trend score
    confidence_level: float

@dataclass
class CompetencyProfile:
    user_id: str
    skills: Dict[str, float]  # concept_id -> competency level (0-1)
    learning_style: str
    preferred_difficulty: int
    last_updated: str

@dataclass
class Recommendations:
    user_id: str
    next_concepts: List[Concept]
    difficulty_adjustments: Dict[str, int]  # concept_id -> recommended difficulty
    study_focus: List[str]
    timestamp: str

class AssessmentEngine(ABC):
    @abstractmethod
    async def analyze_performance(self, user_id: str, history: InteractionHistory) -> AnalysisResult:
        """Analyze user's performance patterns"""
        pass
    
    @abstractmethod
    async def update_competency_profile(self, user_id: str, analysis: AnalysisResult) -> CompetencyProfile:
        """Update user's competency profile based on analysis"""
        pass
    
    @abstractmethod
    async def determine_adaptive_difficulty(self, user_id: str, concept: Concept) -> int:
        """Determine appropriate difficulty level for user on a concept"""
        pass
    
    @abstractmethod
    async def generate_recommendations(self, user_id: str, profile: CompetencyProfile) -> Recommendations:
        """Generate personalized learning recommendations"""
        pass
```

### 3.8 System Commands Handler
**Purpose**: Handle system-level commands for model information, token usage, and configuration

**Responsibilities**:
- Provide available models information to users
- Track and display token usage statistics
- Manage model configuration and switching
- Handle user system queries

**Technology Stack**:
- Command parsing and validation
- Statistics aggregation and reporting
- Model management utilities

**Interface**:
```python
from abc import ABC, abstractmethod
from typing import List, Dict, Optional, Any
from dataclasses import dataclass
import asyncio

@dataclass
class ModelInfo:
    provider: str
    model_name: str
    capabilities: List[str]  # e.g., ["chat", "embedding", "rerank"]
    max_tokens: int
    description: str

@dataclass
class TokenUsage:
    model: str
    input_tokens: int
    output_tokens: int
    total_tokens: int
    timestamp: str
    context: str  # what the tokens were used for

@dataclass
class TokenUsageSummary:
    total_input_tokens: int
    total_output_tokens: int
    total_tokens: int
    usage_by_model: Dict[str, TokenUsage]
    period_start: str
    period_end: str

class SystemCommandsHandler(ABC):
    @abstractmethod
    async def list_available_models(self) -> List[ModelInfo]:
        """Get list of all configured and available models"""
        pass
    
    @abstractmethod
    async def get_token_usage(self, period_days: int = 30) -> TokenUsageSummary:
        """Get token usage summary for specified period"""
        pass
    
    @abstractmethod
    async def get_detailed_token_usage(self, model_name: str = None) -> List[TokenUsage]:
        """Get detailed token usage records, optionally filtered by model"""
        pass
    
    @abstractmethod
    async def show_model_capabilities(self, model_name: str) -> ModelInfo:
        """Show detailed capabilities of a specific model"""
        pass
    
    @abstractmethod
    async def get_knowledge_map(self) -> KnowledgeMap:
        """Get the current knowledge map structure for display"""
        pass
    
    @abstractmethod
    async def list_preferences(self) -> Dict[str, Any]:
        """List all current user preferences from preferences.json"""
        pass
    
    @abstractmethod
    async def set_preference(self, key: str, value: Union[str, int, float, bool, Dict[str, Any]]) -> bool:
        """Set a specific configuration preference using key-value format in preferences.json (e.g., ui.theme, learning.difficulty_level, features.ai_enhancements) similar to npm config set"""
        pass
```

### 3.8.1 System Commands Handler Type Hints
The interface uses the following type hints requiring import from typing:
```python
from typing import List, Dict, Optional, Any, Union
```

---

## 4. Phase-Specific Architecture

### 4.1 Phase 1 Architecture (BYOK AI-Powered MVP)

#### 4.1.1 Component Interactions
```mermaid
sequenceDiagram
    participant U as User
    participant CLI as Command Line Interface
    participant CA as Catalyst Agent
    participant SC as System Commands Handler
    participant MAL as Model Abstraction Layer
    participant LLM as External LLM (OpenAI/Claude/ChatGLM/SiliconFlow/DeepSeek)
    participant EMB as Embedding/Rerank Models
    
    U->>CLI: Launch Application
    CLI->>U: Request AI Configuration
    U->>CLI: Provide Provider/Model/API Key for LLM, Embedding, Rerank
    CLI->>MAL: Validate Credentials
    MAL->>LLM: Validate API Key
    MAL->>EMB: Validate Embedding/Rerank Config
    LLM-->>MAL: Validation Result
    EMB-->>MAL: Validation Result
    MAL-->>CLI: Credentials Valid
    
    U->>CLI: Select Concept "Binary Trees"
    CLI->>CA: Get Explanation for Concept
    CA->>NA: Get Markdown Content
    NA-->>CA: Markdown Content
    
    CA->>MAL: Get Embeddings for Content
    MAL->>EMB: Request Embeddings
    EMB-->>MAL: Embeddings Response
    MAL-->>CA: Embeddings
    
    CA->>MAL: Generate Explanation Prompt
    MAL->>LLM: Send Prompt
    LLM-->>MAL: Generated Explanation
    MAL-->>CA: Explanation Response
    CA-->>CLI: AI-Generated Explanation
    
    CA->>MAL: Generate Challenge Prompt
    MAL->>LLM: Send Prompt
    LLM-->>MAL: Generated Challenge
    MAL-->>CA: Challenge Response
    CA-->>CLI: AI-Generated Challenge
    
    U->>CLI: Provide Answer
    CLI->>CE: Evaluate Answer
    CE->>MAL: Evaluate Answer (if needed)
    MAL->>LLM: Evaluate Answer
    LLM-->>MAL: Evaluation Result
    MAL-->>CE: Result
    CE-->>CLI: Answer Evaluation
    CLI->>DB: Store Q&A Interaction
    
    Note over U, DB: System Commands Examples
    
    U->>CLI: Command "models"
    CLI->>SC: Request Available Models
    SC->>MAL: Get Provider Capabilities
    MAL-->>SC: Model Information
    SC-->>CLI: Available Models List
    CLI-->>U: Display Available Models
    
    U->>CLI: Command "tokens"
    CLI->>SC: Request Token Usage
    SC->>DB: Query Token Usage Data
    DB-->>SC: Token Usage Records
    SC-->>CLI: Token Usage Summary
    CLI-->>U: Display Token Usage
    
    U->>CLI: Command "/knowledge-map"
    CLI->>SC: Request Knowledge Map
    SC->>NA: Get Knowledge Map Structure
    NA-->>SC: Knowledge Map Data
    SC-->>CLI: Formatted Knowledge Map
    CLI-->>U: Display Knowledge Map Tree
    
    U->>CLI: Command "/preference list"
    CLI->>SC: Request Preferences List
    SC->>FS: Read preferences.json
    FS-->>SC: Preferences Data
    SC-->>CLI: Formatted Preferences List
    CLI-->>U: Display All Configuration Settings
    
    U->>CLI: Command "/preference set ui.theme dark"
    CLI->>SC: Set Preference Request
    SC->>FS: Update preferences.json
    FS-->>SC: Update Confirmation
    SC-->>CLI: Preference Set Confirmation
    CLI-->>U: Theme Changed to Dark
    
    U->>CLI: Command "/preference set learning.difficulty_level 7"
    CLI->>SC: Set Preference Request (number)
    SC->>FS: Update preferences.json
    FS-->>SC: Update Confirmation
    SC-->>CLI: Preference Set Confirmation
    CLI-->>U: Difficulty Level Set to 7
    
    U->>CLI: Command "/preference set features.enable_audio false"
    CLI->>SC: Set Preference Request (boolean)
    SC->>FS: Update preferences.json
    FS-->>SC: Update Confirmation
    SC-->>CLI: Preference Set Confirmation
    CLI-->>U: Audio Feature Disabled
```

#### 4.1.2 Key Features Architecture
- Mandatory AI Setup flow
- Core game loop with AI explanation and challenges
- Basic progress tracking
- Manual checkpoint management
- System commands for token usage and available models:
  - `/models` - List all configured AI providers and their capabilities
  - `/tokens` - Show token usage summary for current session/period
  - `/tokens <model_name>` - Show detailed token usage for specific model
  - `/models info <model_name>` - Show detailed information about a specific model
  - `/knowledge-map` - Display the learning concept map/tree structure
  - `/preference list` - Show all current configuration settings
  - `/preference set <key> <value>` - Set a configuration value using key-value format (like npm config set git.url http://example.com), supporting string, number, boolean, and JSON values (e.g., theme, difficulty level, enable feature)

### 4.2 Phase 2 Architecture (Gamified Progression)

#### 4.2.1 Extended Component Interactions
- Integration of Assessment Engine with game loop
- Analytics Dashboard implementation
- Automatic difficulty adjustment
- Enhanced user preferences system

#### 4.2.2 New System Flows
```mermaid
flowchart TD
    subgraph "Enhanced CLI Learning Loop"
        A[User Selects Concept via CLI] --> B[Catalyst Agent Generates Explanation]
        B --> C[CLI Displays Explanation to User]
        C --> D[Challenge Engine Generates Challenge]
        D --> E[CLI Presents Challenge to User]
        E --> F[User Provides Answer via CLI]
        F --> G[Assessment Engine Analyzes Performance]
        G --> H[Update Competency Profile]
        H --> I[Adjust Difficulty if Needed]
        I --> J[CLI Presents Next Challenge]
        J --> K[Store Interaction Data]
        K --> A
        
        F --> L[Analytics Dashboard Updates Stats]
    end
    
    subgraph "System Command Flows"
        S1[User Enters /models Command] --> S2[System Commands Handler Lists Models]
        S3[User Enters /knowledge-map Command] --> S4[System Commands Handler Displays Map]
        S5[User Enters /tokens Command] --> S6[System Commands Handler Shows Token Usage]
        S7[User Enters /preference list Command] --> S8[System Commands Handler Lists Config]
        S9[User Enters /preference set ui.theme dark] --> S10[System Commands Handler Sets Config]
        S11[User Enters /preference set learning.difficulty_level 7] --> S12[System Commands Handler Sets Config (number)]
        S13[User Enters /preference set features.enable_audio false] --> S14[System Commands Handler Sets Config (boolean)]
    end
    
    subgraph "Background Processes"
        M[Periodic Assessment Analysis] --> N[Update User Profile]
        O[Auto-Save Process via CLI] --> P[Update Checkpoints]
    end
```

### 4.3 Phase 3 Architecture (AI-Driven Catalyst)

#### 4.3.1 Advanced Features Architecture
- Navigator Mode implementation
- Proactive AI guidance system
- Long-term memory with vector storage
- Advanced personalization engine

#### 4.3.2 Enhanced Component Interactions
- Vector DB integration for conversation history
- AI-driven path suggestion system
- Advanced semantic evaluation
- Context-aware content generation
- Enhanced system command capabilities:
  - `/knowledge-map` shows detailed relationship visualization
  - `/models` includes recommendation for optimal model selection
  - `/tokens` provides detailed analytics by learning context
  - `/preference` allows advanced configuration with support for various data types (string, number, boolean, JSON) using key-value syntax for complex settings

---

## 5. Data Architecture

### 5.1 Workspace Structure
The application operates within a workspace directory and creates a `.learningspace` subdirectory to store all application data:

```
workspace/
├── .learningspace/                 # Application data directory
│   ├── data.db                     # SQLite database file (includes token usage tracking)
│   ├── config.json                 # Application configuration
│   ├── preferences.json            # User preferences with key-value support (like npm config)
│   ├── checkpoints/                # Checkpoint storage
│   │   └── [checkpoint_id].json
│   ├── content_chunks/             # Processed content chunks
│   │   └── [concept_id].json
│   ├── reports/                    # Generated reports (token usage, model info)
│   │   └── [report_type]_[date].txt
│   └── logs/                       # Application logs
│       └── [date].log
├── learning_materials/             # User's learning content
│   ├── concepts.md
│   └── ...
└── README.md
```

### 5.2 Database Schema

#### 5.1.1 Relational Database (SQLite)
```sql
-- User Profiles
CREATE TABLE user_profiles (
    id TEXT PRIMARY KEY,  -- Using TEXT for UUID in SQLite
    created_at TEXT,      -- Using TEXT for TIMESTAMP in SQLite (ISO 8601 format)
    preferences TEXT,     -- JSON stored as TEXT in SQLite
    competency_profile TEXT,  -- JSON stored as TEXT in SQLite
    ai_config TEXT,       -- JSON stored as TEXT in SQLite
    current_checkpoint_id TEXT
);

-- Q&A History
CREATE TABLE qa_history (
    id TEXT PRIMARY KEY,  -- Using TEXT for UUID in SQLite
    user_id TEXT REFERENCES user_profiles(id),
    concept_id TEXT,
    challenge_type TEXT,
    challenge_text TEXT,
    user_answer TEXT,
    ai_evaluation TEXT,   -- JSON stored as TEXT in SQLite
    timestamp TEXT,       -- Using TEXT for TIMESTAMP in SQLite (ISO 8601 format)
    score REAL            -- Using REAL instead of DECIMAL in SQLite
);

-- Checkpoints
CREATE TABLE checkpoints (
    id TEXT PRIMARY KEY,  -- Using TEXT for UUID in SQLite
    user_id TEXT REFERENCES user_profiles(id),
    state_data TEXT,      -- JSON stored as TEXT in SQLite
    created_at TEXT,      -- Using TEXT for TIMESTAMP in SQLite (ISO 8601 format)
    description TEXT
);

-- Concepts
CREATE TABLE concepts (
    id TEXT PRIMARY KEY,
    title TEXT,
    content TEXT,
    prerequisites TEXT,   -- JSON array stored as TEXT in SQLite
    difficulty_level INTEGER
);

-- Create indexes for performance
CREATE INDEX idx_qa_history_user_id ON qa_history(user_id);
CREATE INDEX idx_qa_history_concept_id ON qa_history(concept_id);
CREATE INDEX idx_qa_history_timestamp ON qa_history(timestamp);
CREATE INDEX idx_checkpoints_user_id ON checkpoints(user_id);
CREATE INDEX idx_checkpoints_created_at ON checkpoints(created_at);

-- Token Usage Tracking
CREATE TABLE token_usage (
    id TEXT PRIMARY KEY,
    model_name TEXT,
    provider TEXT,
    input_tokens INTEGER,
    output_tokens INTEGER,
    total_tokens INTEGER,
    timestamp TEXT,  -- ISO 8601 format
    user_id TEXT REFERENCES user_profiles(id),
    context TEXT  -- What the tokens were used for (e.g. "explanation", "challenge", "embedding")
);

-- Create indexes for token usage queries
CREATE INDEX idx_token_usage_user_id ON token_usage(user_id);
CREATE INDEX idx_token_usage_model_name ON token_usage(model_name);
CREATE INDEX idx_token_usage_timestamp ON token_usage(timestamp);
```

#### 5.2.1 Preferences Storage
User preferences are stored in a dedicated JSON configuration file within the `.learningspace` directory:
```
.learningspace/preferences.json
```

The file contains a JSON structure allowing hierarchical configuration with support for key-value preferences similar to npm config:
```json
{
  "ui": {
    "theme": "dark",
    "font_size": 12,
    "show_line_numbers": true
  },
  "learning": {
    "difficulty_level": 5,
    "learning_style": "visual",
    "daily_goal_minutes": 30,
    "enable_audio": false
  },
  "ai": {
    "default_provider": "openai",
    "default_model": "gpt-4",
    "temperature": 0.7,
    "enable_rag": true,
    "max_context_tokens": 4096
  },
  "features": {
    "show_completion_percentage": true,
    "auto_save_checkpoints": true,
    "notification_settings": {
      "enabled": true,
      "interval_minutes": 15
    }
  }
}
```

#### 5.2.2 Vector Storage (SQLite-VSS)
- Content chunks with vector embeddings using user-configured embedding models for semantic search
- Stored as additional columns in SQLite tables using SQLite-VSS extension
- Conversation history with vector embeddings
- User interaction embeddings for personalization
- Support for multiple embedding models with model tracking
- Example schema extension for vectors:
```sql
-- Add vector support to concepts table
ALTER TABLE concepts ADD COLUMN content_embedding BLOB;  -- Vector embedding stored as binary data
ALTER TABLE concepts ADD COLUMN embedding_model TEXT;   -- Track which embedding model was used

-- Create table for storing content chunks with embeddings
CREATE TABLE content_chunks (
    id TEXT PRIMARY KEY,
    concept_id TEXT REFERENCES concepts(id),
    chunk_text TEXT,
    chunk_embedding BLOB,  -- Vector embedding stored as binary data
    embedding_model TEXT,  -- Track which embedding model was used
    chunk_index INTEGER
);

-- Create table for storing conversation history with embeddings
CREATE TABLE conversation_history (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES user_profiles(id),
    conversation_embedding BLOB,  -- Vector embedding of conversation
    conversation_text TEXT,
    embedding_model TEXT,          -- Track which embedding model was used
    timestamp TEXT,
    context_tags TEXT  -- JSON array of context tags
);

-- Create indexes for vector search performance
-- Note: SQLite-VSS provides vector similarity functions for searching
```

### 5.3 Data Flow Architecture
The data flow operates within the workspace context, with all data stored in the `.learningspace` directory:

```mermaid
graph LR
    subgraph "Workspace Context"
        subgraph "Input Sources"
            MD[Markdown Content from Workspace]
            US[User Interactions]
            AI[AI Responses]
        end
        
        subgraph "Processing"
            P[Data Processor]
            V[Vectorizer]
        end
        
        subgraph "Storage"
            RDB[(data.db in .learningspace)]
            CFG[(preferences.json in .learningspace)]
        end
        
        subgraph "Retrieval"
            SR[Structured Retrieval]
            VR[Vector Retrieval via SQLite-VSS]
            CR[Configuration Retrieval]
        end
    end
    
    MD --> P
    US --> P
    AI --> P
    
    P --> RDB
    P --> V
    V --> RDB  -- Vector embeddings stored within SQLite
    US --> CFG  -- User preferences stored in JSON
    
    RDB --> SR
    RDB --> VR  -- Vector operations handled via SQLite-VSS extension
    CFG --> CR
```

---

## 6. Integration Architecture

### 6.1 External LLM Integration
```mermaid
graph LR
    A[Catalyst Agent] --> B[Model Abstraction Layer]
    B --> C[OpenAI Provider]
    B --> D[Claude Provider]
    B --> E[Local Model Provider]
    B --> F[ChatGLM Provider]
    B --> G[SiliconFlow Provider]
    B --> H[DeepSeek Provider]
    B --> I[Embedding Provider]
    B --> J[Rerank Provider]
    
    C --> K[OpenAI API]
    D --> L[Anthropic API]
    E --> M[Local LLM Server]
    F --> N[ChatGLM API/Model]
    G --> O[SiliconFlow API/Model]
    H --> P[DeepSeek API/Model]
    I --> Q[Embedding API/Model]
    J --> R[Rerank API/Model]
```

### 6.2 File System Integration
```mermaid
graph LR
    A[System Commands Handler] --> B[preferences.json]
    A --> C[.learningspace Directory]
    
    B --> D[Preference Key Processor]
    D --> E[Configuration Parser]
    
    F[CLI Interface] --> A
    E --> F
```

### 6.2 Security Architecture 🔐
- API key encryption at rest
- Secure credential validation
- Rate limiting and monitoring
- User data isolation
- Audit logging for AI interactions

### 6.3 Performance Architecture ⚡
- Caching layer for frequently accessed content within workspace
- Asynchronous processing for AI operations
- Local file system access for efficient workspace operations
- Single file database with efficient vector operations via SQLite-VSS
- Optimized vector search using SQLite extensions
- Efficient token usage tracking without performance impact
- Workspace initialization optimization

---

## 7. Deployment Architecture

### 7.1 CLI Application Deployment
The application is designed as a command-line tool that operates within a workspace directory, creating a `.learningspace` subdirectory for data storage:

```mermaid
graph TB
    subgraph "Workspace Environment"
        subgraph "User Directory"
            WS[Workspace Root]
            LS[.learningspace Directory]
        end
        
        subgraph "CLI Application"
            CLI[Command Line Interface]
            CORE[Core Application Logic]
            WORKER[Background Worker]
        end
        
        subgraph "Local Storage"
            DB[(data.db in .learningspace)]
        end
        
        subgraph "External Services"
            LLM1[OpenAI API]
            LLM2[Claude API]
        end
    end
    
    WS --> LS
    CLI --> CORE
    CORE --> DB
    WORKER --> DB
    CORE --> LLM1
    CORE --> LLM2
    LS --> DB
```

For multi-user scenarios, separate workspace directories per user:
```mermaid
graph TB
    subgraph "Multi-User Deployment"
        subgraph "User 1 Workspace"
            WS1[User1/Workspace]
            LS1[.learningspace]
            CLI1[CLI App]
            DB1[(data.db)]
        end
        
        subgraph "User 2 Workspace"
            WS2[User2/Workspace]
            LS2[.learningspace]
            CLI2[CLI App]
            DB2[(data.db)]
        end
        
        subgraph "Shared External Services"
            LLM1[OpenAI API]
            LLM2[Claude API]
        end
    end
    
    WS1 --> LS1
    WS2 --> LS2
    CLI1 --> DB1
    CLI2 --> DB2
    LS1 --> DB1
    LS2 --> DB2
    CLI1 --> LLM1
    CLI2 --> LLM1
    CLI1 --> LLM2
    CLI2 --> LLM2
```

### 7.2 Scalability Patterns
- Workspace-per-user for data isolation
- File-based SQLite with concurrent access optimization within workspace
- SQLite-VSS for vector operations within the same file
- Asynchronous job queues for AI processing
- Optional separate workspaces for high-usage scenarios

---

## 8. Non-Functional Requirements

### 8.1 Performance Requirements ⚡
- Load concept & checkpoint within <2s
- AI response time <10s for standard queries (API-dependent)
- Support for single-user or small group scenarios
- Handle large Markdown books (100+ chapters)
- Efficient file-based storage with SQLite

### 8.2 Security Requirements 🔐
- End-to-end encryption for sensitive data
- Secure API key storage and transmission
- Rate limiting to prevent abuse
- Workspace-level data isolation

### 8.3 Reliability Requirements
- Auto-save checkpoints on exit to .learningspace directory
- System recovery from unexpected failures
- Workspace initialization on first run in current directory
- Backup and restore capabilities within workspace
- Safe handling of .learningspace directory permissions

### 8.4 Maintainability Requirements
- Modular architecture supporting new AI providers (OpenAI, Claude, ChatGLM, SiliconFlow, DeepSeek, local models)
- Support for user-configured embedding and rerank models
- System commands for token usage and model information tracking
- Key-value preference configuration system (like npm config)
- Clear separation of concerns
- Comprehensive logging and monitoring for all model types
- Automated testing coverage

### 8.5 Extensibility Requirements
- Database abstraction layer to support multiple database backends
- Performance monitoring and alerting for database operations
- Migration path readiness for scaling scenarios
- Plugin architecture for optional heavy-duty database backends
- Provider adapter pattern to easily add new LLM services

---

## 9. Technology Stack

### 9.1 Backend Technologies
- **Language**: Python (or Node.js/Go for high performance)
- **Framework**: FastAPI (or Express.js/Fiber)
- **Databases**: SQLite for structured data, SQLite-VSS for vector storage
- **Authentication**: JWT tokens with secure session management
- **Caching**: Redis for session and content caching

### 9.2 AI Integration Technologies
- **LLM Abstraction**: Custom wrapper supporting multiple providers
- **Prompt Management**: Prompt engineering framework
- **Embedding Models**: OpenAI embeddings, Sentence Transformers, local embedding models, or user-configured embedding models
- **Rerank Models**: Support for user-configured rerank models (e.g., cross-encoders, custom ranking algorithms)
- **Vector Storage**: SQLite-VSS (SQLite Vector Similarity Search) 
- **AI Models**: OpenAI GPT, Claude, ChatGLM, SiliconFlow, DeepSeek, Local models (Ollama/Llama.cpp)

### 9.3 CLI Presentation Layer
- **Framework**: Rich (for advanced terminal UI with theme support)
- **Command Parser**: Click or Typer (for command handling with / prefix support)
- **Text Formatting**: Markdown processing libraries
- **Visualization**: Plotext or Terminal-based charts for analytics
- **System Commands**: Dedicated command handlers for token usage, model information, knowledge map, and user preferences
- **Command Format**: Support for slash-prefixed commands (/models, /knowledge-map, /tokens, /preference)
- **Configuration**: Support for user preference settings with key-value syntax via preferences.json (similar to npm config set)
- **Preference Key Support**: Ability to reference hierarchical configuration using dot notation (like npm config)
- **Multi-type Values**: Support for string, number, boolean, and JSON values in preferences (like npm config)

### 9.4 Infrastructure
- **Workspace Management**: Directory creation and management utilities
- **Containerization**: Docker with Docker Compose (optional)
- **Orchestration**: Optional for multi-user scenarios
- **CI/CD**: GitHub Actions
- **Monitoring**: Logging with Python logging module
- **Configuration**: JSON-based configuration with key-value preference support in .learningspace directory
- **Preference Libraries**: Libraries to handle key-value preference queries and updates (like npm config)

---

## 10. Evolution Strategy

### 10.1 Phase Transition Plan
- Phase 1 provides the core foundation
- Phase 2 builds on existing interfaces with new components
- Phase 3 integrates advanced AI capabilities with minimal core changes

### 10.2 Backward Compatibility
- Maintain stable APIs between phases
- Versioned endpoints for new features
- Migration scripts for database schema changes
- Feature flags for gradual rollouts

### 10.3 Future Extensibility
- Plugin architecture for new AI providers (already supporting OpenAI, Claude, ChatGLM, SiliconFlow, DeepSeek, and local models)
- Extensible embedding and rerank model interfaces for custom models
- Modular components for easy enhancement
- Standardized interfaces for third-party integrations
- Extensible data models for new features

---

## 11. Risk Considerations

### 11.1 Technical Risks
- **LLM API Cost & Latency**: Implement rate limiting and cost monitoring across multiple providers
- **Quality of AI Generation**: Extensive prompt testing and evaluation for each provider (OpenAI, Claude, ChatGLM, SiliconFlow, DeepSeek)
- **Custom Model Integration**: Ensuring compatibility and performance with user-configured embedding and rerank models
- **Performance with SQLite**: Optimize queries and use proper indexing
- **Vector Operations Performance**: Ensure SQLite-VSS provides adequate performance for vector similarity searches
- **Scalability Limitations**: SQLite may face limitations with concurrent access or very large datasets
- **Provider Integration Complexity**: Managing different APIs and requirements for multiple LLM providers
- **Data Privacy**: Secure handling of user interactions with AI services

### 11.2 Mitigation Strategies
- Implement circuit breakers for external API calls across all providers
- Use caching for frequently requested content and embedding results
- Optimize SQLite schema and queries with proper indexing
- Profile and optimize vector search operations with custom embedding models
- Monitor and alert on API usage and costs per provider
- Implement standardized testing framework for all LLM and embedding providers
- Validate custom embedding and rerank model configurations before use
- Regular performance testing and optimization
- Plan for database migration strategy if scalability needs arise

### 11.3 Database Extension Considerations
If performance issues arise with the lightweight database approach, consider these extensions:

#### 11.3.1 Hybrid Approach
- Keep user profiles and core data in SQLite
- Migrate heavy vector operations to dedicated vector database (Pinecone, Weaviate, or Qdrant) if needed
- Use database abstraction layer to make switching easier

#### 11.3.2 Performance Monitoring
- Implement performance metrics for database operations
- Set alerts for slow queries (>500ms)
- Monitor vector search performance specifically
- Plan for migration if response times exceed user expectations

#### 11.3.3 Caching Strategy Enhancement
- Implement Redis for frequently accessed content
- Cache vector embeddings to reduce computation
- Cache search results for common queries
- Use memory-mapped files for static content

#### 11.3.4 Optional Migration Path
- Maintain database abstraction layer to allow switching to PostgreSQL if needed
- Use database migration tools to support schema evolution
- Implement feature flags to enable/disable different database backends
- Design API contracts that remain stable across database changes