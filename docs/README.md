# Learning Catalyst Documentation

> Transform learning from boring studying into exciting discovery through AI-powered exploration

## Overview

Learning Catalyst is an **AI-powered desktop application** built with Electron, TypeScript, React, and LangChain. It helps you master any subject through conversational learning, visual knowledge maps, and personalized practice.

**Current branch**: `feature-main-process` - Modern service-oriented architecture

## Quick Navigation

### 👤 For New Users

Start here if you're new to Learning Catalyst:

1. **[Getting Started](GETTING-STARTED.md)** - Install and run in 5 minutes
2. **[User Guide](USER-GUIDE/)** - Learn how to use the desktop application
   - [Dashboard Overview](USER-GUIDE/dashboard.md)
   - [Chat Interface](USER-GUIDE/chat-interface.md)
   - [Knowledge Graphs](USER-GUIDE/knowledge-graphs.md)
   - [Learning Sessions](USER-GUIDE/learning-sessions.md)
   - [Settings](USER-GUIDE/settings.md)

3. **[Product Vision](../docs/product-blueprint.md)** - Understand the learning philosophy

### 🚀 For Developers

Technical documentation for contributors and developers:

1. **[Developer Guide](DEVELOPER-GUIDE/)** - Start here for technical details
   - [Architecture](DEVELOPER-GUIDE/architecture.md) - System design
   - [Electron API](DEVELOPER-GUIDE/electron-api.md) - IPC contracts
   - [Database Design](DEVELOPER-GUIDE/database.md) - Kysely schema
   - [Services](DEVELOPER-GUIDE/services.md) - Main process services
   - [Agent System](DEVELOPER-GUIDE/agents.md) - Multi-agent orchestration
   - [Performance](DEVELOPER-GUIDE/performance.md) - Memory optimization

## Key Features

### 🧠 AI-Powered Learning
- **Natural Conversations**: Chat with AI tutors about any topic
- **Multi-Provider Support**: OpenAI, ChatGLM, DeepSeek, local models
- **Real-time Streaming**: Watch responses appear with live metrics
- **Thinking Visualization**: See AI reasoning (ChatGLM models)

### 🗺️ Visual Knowledge Discovery
- **Knowledge Maps**: Explore concept relationships visually
- **Progress Tracking**: See what you've mastered and what's next
- **Learning Paths**: Personalized sequences based on your goals
- **Achievement System**: Earn badges for milestones

### 💾 Session Management
- **Save & Resume**: Pick up where you left off anytime
- **Checkpoints**: Create snapshots of important learning moments
- **Full History**: Complete conversation transcripts
- **Export Data**: Take your learning elsewhere

### 📊 Analytics & Insights
- **Learning Analytics**: Track progress across sessions
- **Token Usage**: Monitor API costs in real-time
- **Performance Metrics**: Understand your learning patterns
- **Achievement Dashboard**: Celebrate your progress

### ⚙️ Configurable & Private
- **AI Provider Switching**: Change models without losing context
- **Local-First Storage**: Your data stays on your machine
- **Offline Mode**: Continue learning without internet
- **Custom Models**: Use local models (Ollama, Llama.cpp)

## System Architecture

### Multi-Process Design

```
Learning Catalyst Application
├── Main Process (Node.js)
│   ├── AI Providers & Models
│   ├── Database (SQLite + Kysely)
│   ├── Agent Orchestration
│   ├── File System
│   └── IPC Handlers (8 API domains)
│
├── Renderer Process (React)
│   ├── Dashboard & UI
│   ├── Chat Interface
│   ├── Knowledge Visualization
│   └── State Management (Zustand)
│
└── IPC Communication
    ├── Preload Script (Security)
    ├── Type-Safe Contracts
    └── Streaming Support
```

### Core Technologies

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Desktop Framework** | Electron | Cross-platform desktop app |
| **Frontend** | React + TypeScript | Modern UI components |
| **State Management** | Zustand | Lightweight state store |
| **Backend** | Node.js Main Process | AI services & data layer |
| **Database** | SQLite + Kysely | Type-safe relational storage |
| **Vector DB** | Qdrant | Semantic search & discovery |
| **AI Integration** | LangChain | Multi-provider AI orchestration |
| **Build Tool** | Vite | Fast dev & optimized builds |

## Documentation Structure

```
docs/
├── README.md                           # This file
├── GETTING-STARTED.md                  # Quick start guide
├── product-blueprint.md                # User vision & philosophy
│
├── USER-GUIDE/                         # End-user documentation
│   ├── dashboard.md                    # Desktop app overview
│   ├── chat-interface.md               # AI chat features
│   ├── knowledge-graphs.md             # Visual learning
│   ├── learning-sessions.md            # Save/restore progress
│   └── settings.md                     # Configuration
│
└── DEVELOPER-GUIDE/                    # Technical documentation
    ├── README.md                       # Developer onboarding
    ├── architecture.md                 # System design
    ├── electron-api.md                 # IPC contracts ⭐
    ├── database.md                     # Schema & migrations ⭐
    ├── services.md                     # Main process services
    ├── agents.md                       # Multi-agent system
    └── performance.md                  # Memory optimization
```

## Learning Paths

### Path 1: New User → Happy Learner

```
1. Read: GETTING-STARTED.md
2. Install: npm install && npm run dev
3. Watch: USER-GUIDE/dashboard.md
4. Explore: USER-GUIDE/chat-interface.md
5. Practice: Ask questions naturally!
```

### Path 2: Developer → Contributor

```
1. Read: DEVELOPER-GUIDE/README.md
2. Understand: DEVELOPER-GUIDE/architecture.md
3. Deep Dive: DEVELOPER-GUIDE/electron-api.md
4. Database: DEVELOPER-GUIDE/database.md
5. Services: DEVELOPER-GUIDE/services.md
6. Start Coding!
```

### Path 3: Power User → Expert

```
1. Understand: product-blueprint.md (vision)
2. Master: USER-GUIDE/knowledge-graphs.md
3. Optimize: USER-GUIDE/settings.md
4. Scale: USER-GUIDE/learning-sessions.md
```

### Path 4: Maintainer → Architect

```
1. Architecture: DEVELOPER-GUIDE/architecture.md
2. Performance: DEVELOPER-GUIDE/performance.md
3. Agents: DEVELOPER-GUIDE/agents.md
4. Database: DEVELOPER-GUIDE/database.md
5. Design: API contracts & evolution
```

## Current Implementation Status

### ✅ Implemented & Working

- **Database Layer**: Kysely with SQLite, 15+ migrations
- **Electron API**: 8 domains (chat, learning, knowledge, analytics, sessions, agents, content, settings)
- **Main Process Services**: Functional pattern with dependency injection
- **Memory System**: Multi-layer memory (episodic, semantic, procedural)
- **Agent Lifecycle**: Agent creation, activation, state management
- **Performance**: Memory leak prevention, Vite optimization

### 🚧 In Development

- **Renderer Components**: React UI for all features
- **Knowledge Visualization**: Graph rendering & interaction
- **Agent Tools**: Specialized learning/practice agents
- **Analytics Dashboard**: Progress charts & insights

### 📋 Planned

- **Multi-User Support**: User authentication & profiles
- **Collaboration Features**: Shared learning sessions
- **Plugin System**: Extensible agent capabilities
- **Cloud Sync**: Optional cloud backup

## Getting Started

### Prerequisites

- **Node.js**: 18+ (LTS recommended)
- **npm**: 9+ or **pnpm**: 8+
- **OS**: Windows 10+, macOS 10.15+, or Linux
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 1GB free space

### Installation

```bash
# Clone repository
git clone https://github.com/your-org/learning-catalyst.git
cd learning-catalyst

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### First Run

1. Launch: `npm run dev`
2. Configure AI provider (Settings)
3. Start chatting: Ask "What can you help me learn?"
4. Explore: Check out your knowledge map
5. Save progress: Create a checkpoint

## Troubleshooting

### Common Issues

**Build fails**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run dev
```

**Database errors**
```bash
# Reset database
rm -rf .catalyst
npm run dev
```

**High memory usage**
- Check: DEVELOPER-GUIDE/performance.md
- Run: Multi-process memory monitor

### Getting Help

- **Documentation**: This docs folder
- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions
- **Code**: Browse the codebase directly

## Contributing

We welcome contributions! Please see our contributing guidelines:

1. **Read**: DEVELOPER-GUIDE/README.md
2. **Understand**: Architecture & coding patterns
3. **Follow**: TypeScript strict mode
4. **Test**: All tests must pass
5. **Document**: Update docs for new features

### Development Workflow

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run tests
npm test

# Type check
npm run type-check

# Lint
npm run lint
```

## Technology Highlights

### Type-Safe Database
- **Kysely Query Builder**: Type-safe SQL queries
- **Generated Types**: Full TypeScript coverage
- **Migration System**: Versioned schema changes

### Secure IPC
- **8 API Domains**: Organized by functionality
- **Preload Script**: Secure boundary
- **Type Contracts**: Compile-time API safety

### Modern Architecture
- **Functional Pattern**: Services with injected dependencies
- **No Classes**: Pure functions and factories
- **Testable**: Easy to mock and test

### Performance First
- **Memory Monitoring**: Multi-process memory tracking
- **Vite Optimization**: Fast dev builds
- **Lazy Loading**: Components load on demand

## License

MIT License - see LICENSE file for details

## Support

- **Documentation**: This folder
- **Community**: GitHub Discussions
- **Bugs**: GitHub Issues
- **Security**: security@learningcatalyst.dev

---

**Ready to start learning?** → [GETTING-STARTED.md](GETTING-STARTED.md)

**Want to contribute?** → [DEVELOPER-GUIDE/README.md](DEVELOPER-GUIDE/README.md)

**Need help?** → Check the USER-GUIDE or open an issue

---

*Last Updated: November 2025*
*Version: 1.0*
