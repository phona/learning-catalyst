# LangChain Migration - Architecture Diagrams

## Current Architecture (Before Migration)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              RENDERER PROCESS (Browser)                           │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                           React UI Layer                                  │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │  │
│  │  │ Chat UI     │  │ Discovery   │  │ Settings    │  │ Dashboard   │  │  │
│  │  │ Components  │  │ Components  │  │ Components  │  │ Components  │  │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                    │                                           │
│                                    ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                        State Management Layer                              │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                     │  │
│  │  │ UseChatStore │  │ UseAppStore │  │ UseConfig   │                     │  │
│  │  │ (Zustand)    │  │ (Zustand)    │  │ Store       │                     │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                     │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                    │                                           │
│                                    ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                        Business Logic Layer                               │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │                    AgentManager (PROBLEM)                          │  │  │
│  │  │  ├── createAgent() ❌ (AsyncLocalStorage needed)               │  │  │
│  │  │  ├── sendMessage() ❌ (LangChain in browser)                   │  │  │
│  │  │  └── Agent Tools ❌ (Database access issues)                   │  │  │
│  │  └─────────────────────────────────────────────────────────────────┘  │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │                  ConceptParsingService                            │  │  │
│  │  │  ├── parseConcepts() ❌ (LangChain needed)                     │  │  │
│  │  │  └── AI Analysis ❌ (Node.js APIs needed)                        │  │  │
│  │  └─────────────────────────────────────────────────────────────────┘  │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │                  SessionService                                   │  │
│  │  │  ├── searchSessions() ✅ (Works via IPC)                         │  │  │
│  │  │  └── saveMessage() ✅ (Works via IPC)                            │  │  │
│  │  └─────────────────────────────────────────────────────────────────┘  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │                  ConfigService                                     │  │
│  │  │  └── getConfig() ✅ (Works via IPC)                              │  │  │
│  │  └─────────────────────────────────────────────────────────────────┘  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                    │                                           │
│                                    ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                         IPC Communication Layer                           │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │                    Preload Script                                    │  │  │
│  │  │  ├── window.electronAPI ✅ (Working)                            │  │  │
│  │  │  └── Secure IPC Bridge ✅ (Working)                               │  │  │
│  │  └─────────────────────────────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                               MAIN PROCESS (Node.js)                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                        IPC Handlers Layer                                 │  │
│  │  ├── Database Handlers ✅ (sqlite-electron working)                   │  │
│  │  ├── File System Handlers ✅ (Working)                                │  │
│  │  └── Config Handlers ✅ (Working)                                     │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                    │                                           │
│                                    ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                       Database Layer                                     │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │                 sqlite-electron (WORKING)                          │  │  │
│  │  │  ├── Direct file access ✅                                         │  │  │
│  │  │  ├── Kysely ORM ✅                                                │  │  │
│  │  │  └── Full SQL Support ✅                                            │  │  │
│  │  └─────────────────────────────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────┘

PROBLEMS IDENTIFIED:
❌ AsyncLocalStorage not available in browser
❌ LangChain requires Node.js APIs (fs, crypto, events, etc.)
❌ Agent tools need database access but are in renderer
❌ Cross-thread service dependencies
```

## Target Architecture (After Migration)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              RENDERER PROCESS (Browser)                           │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                           React UI Layer                                  │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │  │
│  │  │ Chat UI     │  │ Discovery   │  │ Settings    │  │ Dashboard   │  │  │
│  │  │ Components  │  │ Components  │  │ Components  │  │ Components  │  │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                    │                                           │
│                                    ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                        State Management Layer                              │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                     │  │
│  │  │ UseChatStore │  │ UseAppStore │  │ UseConfig   │                     │  │
│  │  │ (Zustand)    │  │ (Zustand)    │  │ Store       │                     │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                     │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                    │                                           │
│                                    ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                      IPC Client Layer (UI ONLY)                            │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │                 AgentManager (IPC Proxy)                          │  │  │
│  │  │  ├── createAgent() ✅ (IPC call to main)                        │  │  │
│  │  │  ├── sendMessage() ✅ (IPC call to main)                        │  │  │
│  │  │  └── Streaming Support ✅ (MessageChannelMain)                   │  │  │
│  │  └─────────────────────────────────────────────────────────────────┘  │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │               SessionService (IPC Proxy)                         │  │  │
│  │  │  ├── searchSessions() ✅ (IPC call to main)                      │  │  │
│  │  │  └── saveMessage() ✅ (IPC call to main)                         │  │  │
│  │  └─────────────────────────────────────────────────────────────────┘  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │               ConfigService (IPC Proxy)                          │  │  │
│  │  │  └── getConfig() ✅ (IPC call to main)                           │  │  │
│  │  └─────────────────────────────────────────────────────────────────┘  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                    │                                           │
│                                    ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                         IPC Communication Layer                           │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │                    Preload Script                                    │  │  │
│  │  │  ├── langchain API ✅ (NEW - LangChain operations)             │  │  │
│  │  │  ├── service API ✅ (NEW - Service operations)                  │  │  │
│  │  │  ├── tool API ✅ (NEW - Tool execution)                         │  │  │
│  │  │  └── streaming API ✅ (NEW - Real-time responses)              │  │  │
│  │  └─────────────────────────────────────────────────────────────────┐  │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │                  MessageChannelMain                               │  │  │
│  │  │  ├── Streaming support ✅ (Real-time AI responses)              │  │  │
│  │  │  ├── Bidirectional communication ✅                             │  │  │
│  │  │  └── Backpressure handling ✅                                    │  │  │
│  │  └─────────────────────────────────────────────────────────────────┐  │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                               MAIN PROCESS (Node.js)                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                        IPC Handlers Layer                                 │  │
│  │  ├── langchain-handlers ✅ (NEW - LangChain operations)             │  │
│  │  ├── service-handlers ✅ (NEW - Service operations)                  │  │
│  │  ├── tool-execution-handlers ✅ (NEW - Tool execution)              │  │
│  │  ├── Database Handlers ✅ (Enhanced)                                 │  │
│  │  └── Error Handlers ✅ (NEW - Centralized error handling)            │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                    │                                           │
│                                    ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                    Business Logic Layer (Main Thread)                   │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │                 LangChainService (NEW)                            │  │  │
│  │  │  ├── AgentManagerMain ✅ (Full LangChain support)              │  │  │
│  │  │  ├── AsyncLocalStorage ✅ (Node.js API available)              │  │  │
│  │  │  ├── Streaming Support ✅ (Real-time responses)                 │  │  │
│  │  │  └── Tool Integration ✅ (Database-connected tools)              │  │  │
│  │  └─────────────────────────────────────────────────────────────────┐  │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │               SessionServiceMain (NEW)                           │  │  │
│  │  │  ├── Direct Database Access ✅ (Kysely + sqlite-electron)       │  │  │
│  │  │  ├── Full SQL Support ✅                                         │  │  │
│  │  │  └── Transaction Support ✅                                      │  │  │
│  │  └─────────────────────────────────────────────────────────────────┐  │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │                ConfigServiceMain (NEW)                           │  │  │
│  │  │  └── Electron Store ✅ (Direct configuration access)           │  │  │
│  │  └─────────────────────────────────────────────────────────────────┐  │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │               ToolExecutorService (NEW)                         │  │  │
│  │  │  ├── Secure Tool Execution ✅                                   │  │  │
│  │  │  ├── Database Access ✅ (Direct connection)                     │  │  │
│  │  │  └── Agent Tool Integration ✅                                  │  │  │
│  │  └─────────────────────────────────────────────────────────────────┐  │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │           ConceptParsingServiceMain (NEW)                       │  │  │
│  │  │  ├── LangChain Integration ✅ (Full AI support)                 │  │  │
│  │  │  ├── Node.js APIs ✅ (fs, crypto, events, etc.)               │  │  │
│  │  │  └── Direct Database Storage ✅                                 │  │  │
│  │  └─────────────────────────────────────────────────────────────────┐  │  │
│  └─────────────────────────────────────────────────────────────────────────┐  │
│                                    │                                           │
│                                    ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                    Agent Tools Layer (Main Thread)                      │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │                    Learning Tools (NEW)                           │  │  │
│  │  │  ├── parseConcepts ✅ (Database + LangChain)                    │  │  │
│  │  │  ├── searchSessions ✅ (Direct database access)                 │  │  │
│  │  │  ├── createExercise ✅ (Database storage)                       │  │  │
│  │  │  └── generateLearningPath ✅ (Database storage)                 │  │  │
│  │  └─────────────────────────────────────────────────────────────────┐  │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │                     Assessment Tools                             │  │  │
│  │  │  └── Quiz/Test Generation ✅ (Database + AI)                     │  │  │
│  │  └─────────────────────────────────────────────────────────────────┐  │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │                    Research Tools                                │  │  │
│  │  │  └── Information Gathering ✅ (Web + Database)                   │  │  │
│  │  └─────────────────────────────────────────────────────────────────┐  │  │
│  └─────────────────────────────────────────────────────────────────────────┐  │
│                                    │                                           │
│                                    ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                       Database Layer                                     │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │                 sqlite-electron (ENHANCED)                        │  │  │
│  │  │  ├── Direct File Access ✅                                        │  │  │
│  │  │  ├── Kysely ORM ✅                                                │  │  │
│  │  │  ├── Transaction Support ✅                                        │  │  │
│  │  │  ├── Agent Tool Integration ✅                                     │  │  │
│  │  │  └── Concept Storage ✅                                            │  │  │
│  │  └─────────────────────────────────────────────────────────────────┐  │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │                  Performance Monitoring                           │  │  │
│  │  │  ├── Memory Usage Tracking ✅                                      │  │  │
│  │  │  ├── Agent Performance Metrics ✅                                 │  │  │
│  │  │  └── IPC Performance ✅                                           │  │  │
│  │  └─────────────────────────────────────────────────────────────────┐  │  │
│  └─────────────────────────────────────────────────────────────────────────┐  │
└─────────────────────────────────────────────────────────────────────────────────┘

SUCCESS METRICS:
✅ AsyncLocalStorage available in main thread
✅ Full LangChain API support (fs, crypto, events, etc.)
✅ Agent tools with direct database access
✅ Clean UI/business logic separation
✅ Real-time streaming via MessageChannelMain
✅ Enhanced security through process isolation
✅ Better performance (UI not blocked by AI operations)
✅ Comprehensive error handling and monitoring
```

## Data Flow Comparison

### Current Flow (BROKEN)
```
User Input → React Component → AgentManager ❌ → LangChain ❌ → AI Response ❌
                 ↓                           ↓
            Zustand Store                Database ❌ (Cross-thread)
                 ↓                           ↓
            UI Update                    Session Data ❌
```

### Target Flow (WORKING)
```
User Input → React Component → AgentManager (IPC Proxy) → Main Thread → AgentManagerMain ✅ → LangChain ✅ → AI Response ✅
                 ↓                           ↓                    ↓
            Zustand Store                    IPC Response        Database ✅ (Direct access)
                 ↓                           ↓                    ↓
            UI Update                    Streaming Update       Tool Execution ✅
```

## Service Communication Flow

### Renderer → Main Thread Communication
```
Renderer Process                                    Main Thread
┌─────────────────┐    IPC Request    ┌─────────────────────────────────────┐
│ React Component │ ──────────────────→ │ LangChainService                      │
│                 │                    │ ├─ AgentManagerMain                   │
│                 │                    │ ├─ SessionServiceMain                 │
│                 │                    │ ├─ ConfigServiceMain                  │
│                 │                    │ ├─ ToolExecutorService                │
│                 │                    │ └─ ConceptParsingServiceMain         │
└─────────────────┘                    └─────────────────────────────────────┘
         ↑                                           ↓
         │                                    ┌─────────────┐
         │                                    │ Database     │
         │                                    │ (sqlite-     │
         │                                    │ electron)    │
         │                                    └─────────────┘
         │                                           ↓
         │                                    ┌─────────────┐
         │                                    │ LangChain    │
         │                                    │ (Full API)   │
         │                                    └─────────────┘
         ↓                                           ↓
┌─────────────────┐    IPC Response   ┌─────────────────────────────────────┐
│ UI Update       │ ◄───────────────── │ Processed Response                    │
│ (Streaming)     │                    │ (via MessageChannelMain)              │
└─────────────────┘                    └─────────────────────────────────────┘
```

## Agent Tool Execution Flow

### Tool Execution with Database Access
```
Agent Tool Request                    Main Thread Processing
┌─────────────────┐    IPC Call    ┌─────────────────────────────────────┐
│ Agent asks for  │ ───────────────→ │ ToolExecutorService                   │
│ tool execution  │                    │ ├─ Validate Tool Request             │
│ "parse_concepts" │                    │ ├─ Get Tool Definition               │
│                  │                    │ ├─ Execute Tool with Database Access │
│                  │                    │ │  ├─ Direct Kysely Query           │
│                  │                    │ │  ├─ LangChain Processing          │
│                  │                    │ │  └─ Result Processing             │
│                  │                    │ └─ Return Result via IPC            │
└─────────────────┘                    └─────────────────────────────────────┘
         ↑                                           ↓
         │ Tool Result                            Database Operations
         │                                    ┌─────────────────────────────────┐
         │                                    │ sqlite-electron                  │
         │                                    │ ├─ Insert Concepts              │
         │                                    │ ├─ Update Sessions              │
         │                                    │ ├─ Store Relationships          │
         │                                    │ └─ Query Existing Data         │
         │                                    └─────────────────────────────────┘
         ↓                                           ↓
┌─────────────────┐    IPC Response   ┌─────────────────────────────────────┐
│ Agent receives  │ ◄───────────────── │ Processed Tool Result                │
│ tool result      │                    │ (Formatted for Agent)                 │
└─────────────────┘                    └─────────────────────────────────────┘
```

## Migration Benefits Summary

### Technical Benefits
```
Before Migration ❌                    After Migration ✅
┌─────────────────┐                   ┌─────────────────────────────────────┐
│ AsyncLocalStorage │ ❌ Not Available  │ AsyncLocalStorage │ ✅ Available       │
│ LangChain APIs   │ ❌ Limited         │ LangChain APIs    │ ✅ Full Support     │
│ Database Access  │ ❌ IPC Overhead    │ Database Access   │ ✅ Direct Access    │
│ Tool Execution   │ ❌ Cross-thread    │ Tool Execution    │ ✅ Same Process     │
│ UI Performance   │ ❌ Blocking         │ UI Performance    │ ✅ Responsive       │
│ Error Handling   │ ❌ Scattered        │ Error Handling    │ ✅ Centralized      │
│ Security         │ ❌ Mixed Context   │ Security          │ ✅ Isolated         │
└─────────────────┘                   └─────────────────────────────────────┘
```

### User Experience Benefits
```
✅ Smooth real-time AI responses (no UI blocking)
✅ Faster agent tool execution (direct database access)
✅ Better error recovery (centralized error handling)
✅ Enhanced reliability (process isolation)
✅ Consistent performance (optimized IPC communication)
```