# Learning Catalyst System Architecture

## Document Information
- **Document Title**: Learning Catalyst System Architecture
- **Version**: v1.0
- **Date**: October 4, 2025
- **Author**: System Architect

## Table of Contents
1. [Introduction](#introduction)
2. [System Overview](#system-overview)
3. [Architectural Principles](#architectural-principles)
4. [High-Level Architecture](#high-level-architecture)
5. [Component Architecture](#component-architecture)
6. [Data Architecture](#data-architecture)
7. [System Interfaces](#system-interfaces)
8. [Security Considerations](#security-considerations)
9. [Phased Implementation](#phased-implementation)
10. [Quality Attributes](#quality-attributes)

## Introduction

### Purpose
This document describes the system architecture for Learning Catalyst, a local-first, conversational AI tutor application that operates within the command line interface. It provides a comprehensive view of the system's architecture to guide development, testing, and deployment.

### Scope
This architecture covers all aspects of the Learning Catalyst application, including its core modules, data flows, interfaces, and implementation phases. The system is designed to evolve from a guided conversational core in Phase 1 to a fully adaptive AI tutor in Phase 3.

### Document Conventions
- UML diagrams created using standard notation
- Component descriptions follow the format: Component Name, Responsibilities, Dependencies
- Technical terms defined in the glossary

## System Overview

### System Purpose
Learning Catalyst is a local-first, conversational AI tutor that operates within the command line. It fosters a natural, dialogue-led learning experience, proactively guiding users through their local Markdown-based materials. The application initiates the learning process from the moment it starts, suggesting next steps and ensuring a continuous, supportive journey.

### Key Features
- Proactive conversational interface with AI tutor that actively guides the conversation
- Guided startup and resumption with context-aware suggestions
- Context-aware learning grounded in user's local Markdown files
- Persistent state management with automatic save and resume
- Pluggable AI models with configurable providers and models
- Progressive enhancement from conversational tool to adaptive AI tutor

### Target Users
Self-learners, students, and professionals who want a supportive, AI-driven learning partner and value local data control.

## Architectural Principles

### Core Principles
1. **Local-First**: All user data, progress, and configuration must be stored on the user's local machine
2. **Proactive Guidance**: The AI should actively guide the conversation rather than passively respond to queries
3. **Context Awareness**: All AI responses should be grounded in the user's local learning materials
4. **Persistent State**: Application must automatically save full state on exit and load on startup
5. **Modular Design**: Components should be loosely coupled to enable easy enhancement and replacement
6. **Privacy by Design**: User data never leaves the local machine; learning materials are only sent to external AI services

### Design Decisions
- Using Click or Typer for CLI framework to provide a rich command-line experience
- SQLite for persistent data storage due to local-first requirement
- OpenAI-compatible interface for AI providers to ensure flexibility
- TOML for configuration files to provide human-readable format
- State manager handles mechanical aspects of saving/loading while Catalyst Agent interprets the state

## High-Level Architecture

### Layered Architecture
```
┌───────────────────────────────────┐
│        CLI Interface              │
│      (Conversation View)          │
└─────────────────┬─────────────────┘
                  │
┌─────────────────▼─────────────────┐
│          Logic Layer              │
│  ┌─────────────────┐  ┌───────────┐│
│  │ Catalyst Agent │  │Challenge  ││
│  │(Intent/AI Proc)│  │Engine     ││
│  └─────────────────┘  └───────────┘│
│  ┌─────────────────┐  ┌───────────┐│
│  │Model Abstraction│  │State      ││
│  │Layer           │  │Manager    ││
│  └─────────────────┘  └───────────┘│
│  ┌─────────────────┐  ┌───────────┐│
│  │Assessment Engine│  │Concept    ││
│  │                 │  │Building   ││
│  └─────────────────┘  │System     ││
│                       └───────────┘│
└─────────────────┬─────────────────┘
                  │
┌─────────────────▼─────────────────┐
│          Data Layer               │
│  ┌───────────┐  ┌───────────┐    │
│  │SQLite DB  │  │Vector DB  │    │
│  │(Q&A Hist) │  │(Content)  │    │
│  └───────────┘  └───────────┘    │
└───────────────────────────────────┘
```

### System Context Diagram
```
┌─────────────────┐
│   Learning      │
│   Catalyst      │
└─────────┬───────┘
          │
┌─────────▼─────────┐    ┌─────────────────────┐
│   Application     │    │ External AI APIs    │
│   Core Modules    │◄──►│ (OpenAI, Anthropic, │
│                   │    │  Local Models, etc) │
└─────────┬─────────┘    └─────────────────────┘
          │
┌─────────▼─────────┐
│ Local Markdown    │
│ Learning Content  │
└───────────────────┘
```

## Component Architecture

### Core Components

#### 1. CLI Interface
- **Responsibilities**: Renders the conversational dialogue, handles user input, processes system commands, manages display of conversation history
- **Dependencies**: Catalyst Agent, State Manager
- **Implementation Notes**: Uses Typer for command-line argument parsing, implements chat-like interface with scrolling history

#### 2. Catalyst Agent
- **Responsibilities**: Interprets user intent, generates responses, creates context-aware prompts, generates explanations, formulates challenges, evaluates answers, generates context-aware startup prompts
- **Dependencies**: Model Abstraction Layer, Challenge Engine, Knowledge Navigator
- **Implementation Notes**: Core AI processing module that drives the conversational experience

#### 3. Challenge Engine
- **Responsibilities**: Creates and evaluates questions based on current context, generates AI-generated questions (MCQ, open-ended), processes user answers
- **Dependencies**: Catalyst Agent, Model Abstraction Layer
- **Implementation Notes**: Works with Catalyst Agent to present and evaluate challenges

#### 4. State Manager
- **Responsibilities**: Handles mechanics of saving/loading application state, manages manual checkpoints, provides state to Catalyst Agent for interpretation
- **Dependencies**: None (independent component)
- **Implementation Notes**: Manages full conversational context and UI state; automatically saves on exit

#### 5. Model Abstraction Layer
- **Responsibilities**: Provides unified interface for communicating with various LLM providers, routes requests to selected model, handles API calls to external services
- **Dependencies**: Configuration Manager
- **Implementation Notes**: Implements OpenAI-compatible interface for all providers to ensure modularity

#### 6. Configuration Manager
- **Responsibilities**: Manages providers, models, API keys, user preferences, concept granularity settings
- **Dependencies**: None (independent component)
- **Implementation Notes**: Uses TOML/JSON files for human-readable configuration

#### 7. Analytics Dashboard (Phase 2)
- **Responsibilities**: Displays user proficiency and learning trends, provides statistical analysis of user performance
- **Dependencies**: Assessment Engine, SQLite DB
- **Implementation Notes**: Text-based dashboard for command-line interface

#### 8. Assessment Engine (Phase 2)
- **Responsibilities**: Background process to evaluate user performance, updates competency profiles, implements adaptive difficulty logic
- **Dependencies**: SQLite DB, Challenge Engine
- **Implementation Notes**: Uses metrics like correct answer rates or exponential moving averages

#### 9. Concept Building System (Phases 2-3)
- **Responsibilities**: Extracts concepts from Markdown files, builds knowledge graphs, tracks proficiency per concept, manages concept relationships
- **Dependencies**: Local Markdown files, SQLite DB
- **Implementation Notes**: Supports different granularity modes (headers, summaries, full_content)

### Component Relationships

```
┌─────────────────────────────────────────────────────────────────┐
│                    Learning Catalyst System                     │
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐ │
│  │   CLI Interface │────│ Catalyst Agent  │────│ Model Abst. │ │
│  │                 │    │                 │    │ Layer       │ │
│  └─────────────────┘    └─────────────────┘    └─────────────┘ │
│         │                        │                      │      │
│         │                        │                      │      │
│         │                        │                      │      │
│         │                ┌───────▼────────┐   ┌─────────▼─────┐│
│         │                │ Challenge Engine│   │ Config Mgr   ││
│         │                │                │   │               ││
│         │                └────────────────┘   └───────────────┘│
│         │                        │                      │      │
│         │                        │                      │      │
│         │                ┌───────▼────────┐   ┌─────────▼─────┐│
│         │                │  Knowledge     │   │ State Manager ││
│         │                │  Navigator     │   │               ││
│         │                └────────────────┘   └───────────────┘│
│         │                        │                      │      │
│         │                        │                      │      │
│         │                ┌───────▼────────┐   ┌─────────▼─────┐│
│         │                │  Assessment    │   │  Analytics    ││
│         │                │  Engine        │   │  Dashboard    ││
│         │                └────────────────┘   └───────────────┘│
│         │                        │                      │      │
│         │                        │                      │      │
│         │                ┌───────▼────────┐   ┌─────────▼─────┐│
│         │                │  Concept       │   │Vector Database││
│         │                │  Building      │   │               ││
│         │                │  System        │   │               ││
│         └────────────────►                ◄───►               ││
│                          └────────────────┘   └───────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Data Architecture

### Data Persistence Strategy

#### User Profiles (TOML/JSON)
- Location: `.catalyst/config.toml`
- Content: Preferences, long-term competency profile, selected AI model
- Structure:
```toml
[preferences]
default_provider = "openai"
default_model = "gpt-4o"
granularity = "summaries"  # "headers", "summaries", "full_content"

[models]
current_model = "openai:gpt-4o"

[competency_profile]
last_active = "2025-10-04T10:00:00Z"
overall_proficiency = 0.75
```

#### Q&A Database (SQLite)
- Location: `.catalyst/db.sqlite`
- Content: Log of concepts, AI-generated questions, user attempts, AI feedback
- Tables:
  - `concepts`: Concept ID, title, summary, dependencies, source files
  - `interactions`: Timestamp, user input, AI response, interaction type
  - `q_and_a`: Question ID, question text, answer text, correctness rating
  - `proficiency`: Concept ID, user_id, proficiency_score (0.0-1.0), timestamp

#### Application State (JSON)
- Location: `.catalyst/state.json`
- Content: Current conversational context and UI state
- Structure:
```json
{
  "conversation_history": [
    {
      "timestamp": "2025-10-04T10:00:00Z",
      "role": "user",
      "content": "Explain closures in JavaScript"
    },
    {
      "timestamp": "2025-10-04T10:00:05Z", 
      "role": "assistant",
      "content": "A closure is..."
    }
  ],
  "current_topic": "JavaScript Closures",
  "last_interaction_id": 123,
  "ui_state": {
    "current_view": "conversation",
    "scroll_position": 0
  }
}
```

#### System Configuration (TOML)
- Location: `.catalyst/config.toml`
- Content: Model definitions, provider configurations, API keys, concept granularity settings
- Structure:
```toml
[model_providers]
  [model_providers.openai]
  endpoint = "https://api.openai.com/v1"
  api_key = "sk-..."

  [model_providers.anthropic]
  endpoint = "https://api.anthropic.com/v1"
  api_key = "sk-ant-..."

[models]
  [models.gpt-4o]
  provider = "openai"
  model_name = "gpt-4o"

  [models.claude-3]
  provider = "anthropic"
  model_name = "claude-3-opus-20240229"

[knowledge]
concept_granularity = "summaries"
```

### Concept Data Model
Each concept in the database has a structure like this:

```json
{
  "id": "js_advanced:closures",
  "title": "Closures",
  "summary": "A function that remembers the environment in which it was created.",
  "source_files": ["./javascript/advanced.md#closures"],
  "dependencies": ["js_basics:functions", "js_basics:scope"],
  "unlocks": ["js_patterns:module_pattern"],
  "user_proficiency": 0.0 // A score from 0.0 to 1.0
}
```

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Data Flow                               │
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐ │
│  │ User Input  │───►│ Catalyst    │───►│ External AI APIs    │ │
│  │             │    │ Agent       │    │                     │ │
│  └─────────────┘    └─────────────┘    │ (Generate responses │ │
│         │                    │          │  explanations,      │ │
│         │                    │          │  challenges)       │ │
│         │                    │          └─────────────────────┘ │
│         │                    │                                  │
│         │                    ▼                                  │
│         │         ┌─────────────────┐                           │
│         │         │ Challenge Engine│                           │
│         │         │                 │                           │
│         │         └─────────────────┘                           │
│         │                    │                                  │
│         │                    │                                  │
│         │                    ▼                                  │
│         │        ┌─────────────────────┐                        │
│         └───────►│ Update Q&A Database │                        │
│                  │                     │                        │
│                  └─────────────────────┘                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

Phase 2 will add:
- Assessment Engine analyzing Q&A data
- Proficiency scores updating in SQLite DB
- Analytics Dashboard reading from database

Phase 3 will add:
- Vector database for semantic retrieval
- Knowledge graph updates based on user interactions

## System Interfaces

### User Interface
- **Primary Interface**: Command-line interface with conversational chat view
- **Input Types**:
  - Natural language queries (`"Explain closures in JavaScript"`)
  - Challenge requests (`"Quiz me on that"`)
  - System commands (prefixed with `/`)
- **Output**: AI-generated responses in chat format with scrolling history

### External Interfaces
- **AI Provider APIs**: OpenAI-compatible endpoints for all AI services
- **File System**: Access to local Markdown files in working directory
- **Configuration Files**: TOML/JSON files for settings and preferences

### System Commands
- `/clear` - Reset conversational context
- `/checkpoint save <name>` - Save named state snapshot
- `/checkpoint load <name>` - Load named state snapshot
- `/provider list` - List configured providers
- `/provider add` - Add new provider
- `/model add` - Add new model
- `/model use <model-id>` - Switch active model
- `/models` - List all configured models
- `/stats` (Phase 2) - Show analytics dashboard
- `/suggest` (Phase 3) - Get AI-driven recommendations
- `/rebuild` (Phase 2) - Re-analyze Markdown files
- `/status` - Show configuration status

### Internal Interfaces
- **Catalyst Agent API**: Intent interpretation, response generation, challenge evaluation
- **State Manager API**: Save/load application state, checkpoint management
- **Model Abstraction API**: Unified interface for all AI providers
- **Configuration Manager API**: Provider/model management and settings retrieval

## Security Considerations

### Data Privacy
- All user data stored locally on user's machine
- Markdown content only sent to external AI APIs for processing
- User responsible for choosing trusted AI providers
- No data transmitted to Learning Catalyst developers

### Authentication & Authorization
- No authentication required (local-first application)
- API keys stored in plaintext in local configuration files
- User responsible for securing configuration files (file permissions, .gitignore)

### Data Protection
- Configuration files added to .gitignore
- Restrictive file permissions recommended for .catalyst directory
- No sharing of configuration files containing API keys

### Secure Coding Practices
- Input sanitization for user queries
- Parameterized queries for database operations
- Validation of configuration inputs
- Secure handling of API keys

## Phased Implementation

### Phase 1 – MVP (Guided Conversational Core)

**Goal**: Establish the minimum viable product with guided conversational core functionality.

**Key Components Implemented**:
- CLI Interface with conversational chat
- Catalyst Agent with intent interpretation and response generation  
- Challenge Engine for question generation and evaluation
- State Manager for automatic save/load
- Model Abstraction Layer with OpenAI-compatible interface
- Configuration Manager for AI providers/models
- SQLite database for Q&A history

**Success Criteria**:
- Users greeted with relevant, AI-generated suggestions upon launch
- Application state successfully saved and restored
- Users can fully configure AI models
- Seamless transition between natural language and system commands

### Phase 2 – Enhanced Analytics & Adaptivity

**Goal**: Introduce formal concept modeling and adaptive learning capabilities.

**Additional Components**:
- Concept Building System for extracting concepts from Markdown
- Knowledge Graph Construction for concept relationships
- Assessment Engine for proficiency tracking
- Analytics Dashboard for performance visualization
- Rule-based adaptive difficulty

**Data Layer Enhancements**:
- Enhanced SQLite schema for concept tracking and proficiency scores
- Implementation of concept granularity modes
- Proficiency tracking with dependency management

### Phase 3 – AI-Driven Tutor

**Goal**: Evolve into a fully adaptive, personalized tutor with long-term memory.

**Additional Components**:
- Vector Database (ChromaDB/FAISS) for semantic retrieval
- Advanced Knowledge Graph with semantic relationships
- Enhanced Catalyst Agent with proactive topic initiation

**Data Layer Enhancements**:
- Vector database integration for long-term memory
- Enhanced concept relationships and semantic connections
- Advanced proficiency tracking with adaptive algorithms

## Quality Attributes

### Performance Requirements
- Application startup and state restoration under 2 seconds
- AI-driven startup prompts may take slightly longer (with streaming)
- Responsive performance with large knowledge bases
- Optimized API calls to reduce latency and cost

### Reliability Requirements
- Automatic state saving on exit to prevent data loss
- Proper error handling for external API failures
- Graceful degradation when AI services are unavailable
- Data integrity in SQLite database

### Security Requirements
- Local-first architecture with minimal data transmission
- Secure storage of API keys in configuration files
- Respect for user privacy and data control
- Clear security recommendations to users

### Maintainability Requirements
- Modular component design with clear interfaces
- Extensible model abstraction layer
- Human-readable configuration files
- Comprehensive logging for debugging

### Usability Requirements
- Proactive, guided startup experience
- Conversational interface with natural language processing
- Clear feedback for all user actions
- Intuitive system commands with helpful error messages