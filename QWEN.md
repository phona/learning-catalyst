# Learning Catalyst - AI-Driven Interactive Learning Game

## Project Overview

Learning Catalyst is an AI-driven interactive learning game designed to guide users through Markdown-based learning materials. It provides a knowledge map, adaptive challenges, checkpoints, and analytics. The system is designed to evolve from static learning delivery to an AI-driven adaptive tutor across multiple phases.

### Core Concept

The project aims to create an AI-powered gamified environment where users explore concepts, answer AI-generated challenges, and save progress. Key features include:
- Persistent storage for user progress, checkpoints, and profiles
- User-selectable AI models and providers for flexibility and cost management
- Progressive enhancement of analytics, gamification, and AI autonomy over subsequent phases

### Target Users
Self-learners, students, or professionals who benefit from an interactive, guided learning experience.

## Core Modules

- **Knowledge Navigator**: Displays knowledge map and available actions
- **Challenge Engine**: Works with the Catalyst Agent to present AI-generated questions
- **Checkpoint Manager**: Saves/loads progress states
- **Catalyst Agent**: Core AI-driven module that generates explanations, creates challenges, and provides guidance by interfacing with an LLM
- **Model Abstraction Layer**: Provides a unified interface for communicating with various LLM providers (e.g., OpenAI, Anthropic, local models)
- **Analytics Dashboard**: Shows proficiency, weak areas, trends (Phase 2+)
- **Assessment Engine**: Background process for evaluating user progress and adapting difficulty

## Development Phases

### Phase 1 – BYOK AI-Powered MVP (Current Focus)
Goal: Deliver a core interactive learning experience where the AI generates curriculum content and challenges on the fly.

- AI-generated explanations from source Markdown
- AI-generated challenges based on concept content
- LLM-based evaluation for simple answers
- User can select their preferred AI model and provider
- Basic progress tracking and manual checkpoints

### Phase 2 – Gamified Progression
Goal: Enhance the AI core with robust analytics, gamification, and smarter progression.

- Analytics Dashboard showing proficiency, weak areas, and learning trends
- Background Assessment Engine updates user's competency profile based on performance
- Rule-based adaptive difficulty
- Autosave checkpoints

### Phase 3 – AI-Driven Catalyst
Goal: Evolve the Catalyst Agent into a semi-autonomous tutor that can operate with more freedom.

- Navigator Mode allowing free-form Q&A with the AI about learning material
- AI-Driven Pathing where the AI suggests next concepts to study
- Long-term memory using vector context
- Fully AI-driven adaptive difficulty and content personalization

## Technical Architecture

### Layered Architecture
- **Presentation Layer**: Game UI (knowledge map, chat-like interface for AI interaction)
- **Logic Layer**: Catalyst Agent, Model Abstraction Layer, Challenge Engine, Assessment Engine
- **Data Layer**: Relational DB, Vector DB

### Data Persistence
- User Profiles (preferences, progress, competency profile, selected AI model/provider settings)
- Q&A Database (all concepts, AI-generated questions, user attempts, AI feedback, timestamps)
- Checkpoints (compressed state saves)
- System Configuration (available models, API endpoints, credentials management)
- Vector DB (for efficient semantic retrieval of content chunks to provide context to the LLM)

### Storage Technology
- SQLite/Postgres for profiles and Q&A history
- Vector DB (e.g., ChromaDB, FAISS) recommended for providing context to the LLM

## User Stories

### Phase 1 User Stories
1. **Initial AI Setup**: New users must configure their AI Provider, Model, and API Key with validation
2. **AI-Powered Exploration**: Users select concepts from knowledge map and receive AI-generated explanations
3. **Answering AI-Generated Challenges**: Dynamic challenges are generated and evaluated by the system
4. **Saving Progress**: Users can save checkpoints with their progress and performance statistics

### Phase 2 User Stories
1. **AI-Assisted Adaptive Difficulty**: System adjusts difficulty based on performance history
2. **Viewing Analytics**: Dashboard showing proficiency trends and strengths/weaknesses
3. **Changing AI Model**: Users can switch between configured AI models
4. **Autosave**: System restores user's last state after unexpected closure

### Phase 3 User Stories
1. **Personalized Explanations**: System adapts explanations based on learning style and past performance
2. **Semantic Evaluation**: LLM evaluates open-ended answers semantically
3. **Navigator Mode**: Free-form Q&A with the AI about learning materials
4. **Proactive AI Guidance**: AI suggests next learning topics based on competency profile

## Key Risks & Dependencies

1. **LLM API Cost & Latency**: Core user experience depends on performance and cost of external AI services
2. **Quality of AI Generation**: Quality of explanations and challenges depends on prompt engineering
3. **Data Privacy & Security**: Requires clear privacy policies for sending learning material to third-party APIs
4. **Initial Setup Complexity**: Integration with LLM APIs and vector DB increases initial development effort

## Building and Running

The project is in early development stages. No build system has been established yet, but based on the requirements document, the following technologies will be used:

- Backend: Likely Python, Node.js or Go for the core application
- Database: SQLite/PostgreSQL for relational data, Vector DB for content context
- AI Integration: Model abstraction layer for various LLM providers

## Development Conventions

- The architecture should be modular and extensible to support plugging in new LLM providers
- The Model Abstraction Layer must support multiple providers without requiring significant changes to the Catalyst Agent or core application logic
- Code should be designed for scalability to handle large Markdown books (100+ chapters)
- The system should load concepts and checkpoints within 2 seconds

## Project Status

This is a concept project in the design phase, with the requirements and user stories documented but no actual implementation yet. The focus is on creating an AI-driven learning platform with a clear roadmap across three phases.