# Session System Architecture - Visual Diagrams

## Session System Flow Diagrams

### 1. Multi-Agent Session Processing Flow

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                            USER INTERACTION                                        │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐  │
│  │                           React UI Layer                                        │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │  │
│  │  │ ChatInput   │  │ MessageList │  │ SessionView │  │ SessionBtn  │                 │  │
│  │  │ Component  │  │ Component   │  │ Component   │  │ Component  │                 │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘                 │  │
│  └─────────────────────────────────────────────────────────────────────────────────┘  │
│                                    │                                             │
│                                    ▼                                             │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐  │
│  │                        Session Service (Renderer)                         │  │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐  │  │
│  │  │                  sessionService.sendMessage()                          │  │  │
│  │  │  ├─ Message Validation                                            │  │  │
│  │  │  ├─ Context Preparation                                         │  │  │
│  │  │  └─ IPC Call → Main Thread                                       │  │  │
│  │  └─────────────────────────────────────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────────────────────────────┘  │
│                                    │                                             │
│                                    ▼                                             │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐  │
│  │                           IPC COMMUNICATION                                │  │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐  │  │
│  │  │              window.electronAPI.sessions.sendMessage               │  │  │
│  │  │  ├─ sessionId: "session-123"                                    │  │  │
│  │  │  ├─ message: "Explain machine learning"                         │  │  │
│  │  │  ├─ context: { phase: "learning", level: "intermediate" }      │  │  │
│  │  │  └─ options: { strategy: "auto" }                                 │  │  │
│  │  └─────────────────────────────────────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────────────────────────────┘  │
│                                    │                                             │
│                                    ▼                                             │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐  │
│  │                        MAIN THREAD PROCESSING                              │  │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐  │  │
│  │  │                   MultiAgentSessionManager                           │  │  │
│  │  │  ├─ loadSession(sessionId)                                        │  │  │
│  │  │  ├─ determineStrategy(message, sessionState)                       │  │  │
│  │  │  └─ orchestrator.process()                                        │  │  │
│  │  └─────────────────────────────────────────────────────────────────────────┘  │  │
│  │                                    │                                             │
│  │                                    ▼                                             │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐  │  │
│  │  │                    CatalystOrchestrator                                 │  │  │
│  │  │  ├─ Analyze: "Explain machine learning"                           │  │  │
│  │  │  ├─ Strategy: "tool_calling" (single intelligent agent)            │  │  │
│  │  │  ├─ Tools: ["parseConcepts", "searchSessions"]                    │  │  │
│  │  │  └─ Agent: "learning"                                           │  │  │
│  │  └─────────────────────────────────────────────────────────────────────────┘  │  │
│  │                                    │                                             │
│  │                                    ▼                                             │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐  │  │
│  │  │                     ToolCallingAgent (Learning)                        │  │  │
│  │  │  ├─ Tool Selection: "parseConcepts"                              │  │  │
│  │  │  ├─ Database Query: Find related sessions                        │  │  │
│  │  │  ├─ Concept Analysis: Extract ML concepts                         │  │  │
│  │  │  ├─ Tool Selection: "createExercise"                              │  │  │
│  │  │  ├─ Exercise Generation: Create ML practice                       │  │  │
│  │  │  └─ Response Synthesis: Combine tool results                      │  │  │
│  │  └─────────────────────────────────────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────────────────────────────┘  │
│                                    │                                             │
│                                    ▼                                             │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐  │
│  │                        SESSION UPDATE PROCESS                                │  │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐  │  │
│  │  │                 updateSessionWithOrchestration()                        │  │  │
│  │  │  ├─ User Message: Add to messages array                           │  │  │
│  │  │  ├─ Assistant Response: Add to messages array                      │  │  │
│  │  │  ├─ Conversation State: Update learning phase, concepts          │  │  │
│  │  │  ├─ Agent History: Record tool usage and agent info               │  │  │
│  │  │  ├─ Statistics: Update message count, tokens, duration           │  │  │
│  │  │  └─ Database: Save complete enhanced session                       │  │  │
│  │  └─────────────────────────────────────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────────────────────────────┘  │
│                                    │                                             │
│                                    ▼                                             │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐  │
│  │                        DATABASE STORAGE                                     │  │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐  │  │
│  │  │                       sqlite-electron                                │  │  │
│  │  │  ├─ learning_sessions table                                        │  │  │
│  │  │  │  ├─ id, title, metadata, created_at                           │  │  │
│  │  │  │  ├─ agent_history JSON (agent transitions)                  │  │  │
│  │  │  │  ├─ conversation_state JSON (learning progress)             │  │  │
│  │  │  │  └─ orchestration_metadata JSON (strategy used)             │  │  │
│  │  │  ├─ messages table                                                   │  │  │
│  │  │  │  ├─ role, content, timestamp, tokens_used                   │  │  │
│  │  │  │  ├─ tool_calls JSON (tool execution data)                  │  │  │
│  │  │  │  └─ metadata JSON (concepts learned, ratings)              │  │  │
│  │  │  └─ checkpoints table                                               │  │  │
│  │  │    ├─ session_id, message_index, concepts_mastered             │  │  │
│  │  │    └─ exercises_completed, notes, tags                           │  │  │
│  │  └─────────────────────────────────────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────────────────────────────┘  │
│                                    │                                             │
│                                    ▼                                             │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐  │
│  │                           RESPONSE TO UI                                     │  │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐  │  │
│  │  │                   Enhanced Response Object                              │  │  │
│  │  │  ├─ response: "Machine learning is..."                           │  │  │
│  │  │  ├─ metadata:                                                     │  │  │
│  │  │  │  ├─ agentsInvolved: ["learning"]                             │  │  │
│  │  │  │  ├─ toolsUsed: ["parseConcepts", "createExercise"]            │  │  │
│  │  │  │  ├─ learningProgress: { conceptsLearned: 3, phase: "practice" } │  │  │
│  │  │  │  └─ tokensUsed: 1254                                          │  │  │
│  │  │  └─ sessionId: "session-123"                                      │  │  │
│  │  └─────────────────────────────────────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### 2. Multi-Agent Handoff Flow

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                            COMPLEX USER REQUEST                                 │
│  "I want to learn machine learning, get practice exercises, and then test my   │
│  understanding to make sure I've really learned it."                              │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                    ORCHESTRATION STRATEGY SELECTION                          │
│                                                                                     │
│  Request Analysis:                                                                │
│  ├─ Multiple learning phases (learn → practice → test)                           │
│  ├─ Different expertise needed                                                   │
│  └─ Complex workflow required                                                   │
│                                                                                     │
│  Strategy Selected: "handoff"                                                      │
│  ├─ Agents: ["learning", "practice", "assessment"]                               │
│  ├─ Sequence: ["concept_introduction", "practice_exercises", "assessment"]     │
│  └─ Context Preservation: Full conversation state across agents             │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                           HANDOFF MANAGER                                       │
│                                                                                     │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                        INITIAL PROCESSING                               │   │
│  │  │  ┌─────────────────────────────────────────────────────────────────┐ │   │
│  │  │  │                   Learning Agent (First)                              │ │   │
│  │  │  │  ├─ Analyze request complexity                                        │ │   │
│  │  │  │  ├─ Identify multiple learning needs                                  │ │   │
│  │  │  │  ├─ Decide handoff needed                                           │ │   │
│  │  │  │  └─ Response: "I'll help you learn ML concepts first..."          │ │   │
│  │  │  └─────────────────────────────────────────────────────────────────┘ │   │
│  │  │                                                                         │   │
│  │  │  ┌─────────────────────────────────────────────────────────────────┐ │   │
│  │  │  │                      HANDOFF PREPARATION                             │ │   │
│  │  │  │  HANDOFF_TO: practice                                                   │ │   │
│  │  │  │  REASON: User specifically requested practice exercises            │ │   │
│  │  │  │  CONTEXT: Covered ML basics: supervised learning, neural nets     │ │   │
│  │  │  │  NEXT_AGENT: Practice Agent                                      │ │   │
│  │  │  └─────────────────────────────────────────────────────────────────┘ │   │
│  │  └─────────────────────────────────────────────────────────────────────────┘   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                    │                                             │
│                                    ▼                                             │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │                        PRACTICE AGENT (Second)                             │   │
│  │  ├─ Context Received: ML basics covered, need practice                │   │
│  │  ├─ Tool Selection: createExercise, generateLearningPath               │   │
│  │  ├─ Exercise Generation: Creates Python coding exercises              │   │
│  │  ├─ Learning Path: Structured practice sequence                     │   │
│  │  └─ Response: "Great! Let's practice with these exercises..."            │   │
│  │                                                                         │   │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  │                     ASSESSMENT HANDOFF                                 │   │
│  │  │  │  HANDOFF_TO: assessment                                              │   │
│  │  │  │  REASON: User wants to test understanding                           │   │
│  │  │  │  CONTEXT: Completed exercises, ready for evaluation              │   │
│  │  │  │  NEXT_AGENT: Assessment Agent                                      │   │
│  │  │  │  PREVIOUS_PROGRESS: 3 exercises completed, all correct           │   │
│  │  │  └─────────────────────────────────────────────────────────────────┘ │   │
│  │  └─────────────────────────────────────────────────────────────────────────┘   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                    │                                             │
│                                    ▼                                             │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │                      ASSESSMENT AGENT (Third)                                │   │
│  │  ├─ Context Received: Practice completed, need evaluation              │   │
│  │  ├─ Tool Selection: searchSessions (review concepts), createQuiz       │   │
│  │  ├─ Quiz Generation: Creates ML assessment questions                │   │
│  │  ├─ Concept Review: Finds related sessions for context                │   │
│  │  └─ Response: "Let's test your understanding with these questions..."      │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                    │                                             │
│                                    ▼                                             │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐
│  │                      FINAL RESPONSE COMPILATION                                 │
│  │  ├─ Learning Agent Concepts + Practice Agent Exercises +            │   │
│  │  │    Assessment Agent Evaluation                                     │   │
│  │  ├─ Session Update with Complete Multi-Agent History                   │   │
│  │  ├─ Statistics Updated: 3 agents used, 7 tools executed              │   │
│  │  └─ Rich Response: Comprehensive learning package                       │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘
```

### 3. Session State Evolution

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                        SESSION STATE TRANSITIONS                               │
│                                                                                     │
│  Initial State:                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  conversation_state:                                                           │ │
│  │  ├─ current_topic: ""                                                         │ │
│  │  ├─ learning_objectives: []                                                  │ │
│  │  ├─ concepts_discussed: []                                                   │
│  │  ├─ session_phase: "introduction"                                          │ │
│  │  └─ user_level_assessment: "intermediate"                                    │ │
│  │  agent_history: []                                                            │ │
│  │  active_agents: []                                                           │ │
│  │  messages: []                                                                │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                    │                                             │
│  ↓ After "What is machine learning?" (Learning Agent)                         │
│                                    │                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  conversation_state:                                                           │ │
│  │  ├─ current_topic: "machine learning"                                       │ │
│  │  ├─ learning_objectives: ["understand ML basics"]                         │ │
│  │  ├─ concepts_discussed: ["supervised learning", "neural networks"]     │ │
│  │  ├─ session_phase: "exploration"                                             │ │
│  │  └─ user_level_assessment: "beginner"                                         │ │
│  │  agent_history: []                                                            │
│  │  active_agents: [{                                                           │ │
│  │  │  type: "learning",                                                           │ │
│  │  │  tools_used: ["parseConcepts"],                                           │ │
│  │  │  contribution_summary: "Explained ML fundamentals"                         │ │
│  │  │  first_message_index: 0, last_message_index: 1                             │ │
│  │  }]                                                                          │ │
│  │  messages: [user_msg, assistant_msg]                                         │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                    │                                             │
│  ↓ After "Give me practice exercises" (Handoff → Practice Agent)              │
│                                    │                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  conversation_state:                                                           │ │
│  │  ├─ current_topic: "machine learning practice"                              │ │
│  │  ├─ learning_objectives: ["understand ML basics", "practice skills"]      │ │
│  │  ├─ concepts_discussed: ["supervised learning", "neural networks",        │ │
│  │  │                     "practical applications"]                      │ │
│  │  ├─ session_phase: "practice"                                                   │ │
│  │  └─ user_level_assessment: "beginner" → "intermediate"                        │ │
│  │  agent_history: [{                                                           │ │
│  │  │  id: "trans-1",                                                              │ │
│  │  │  from_agent: "learning",                                                      │ │
│  │  │  to_agent: "practice",                                                       │ │
│  │  │  reason: "User requested practice exercises",                           │ │
│  │  │  timestamp: "...",                                                          │ │
│  │  │  message_index: 1                                                           │ │
│  │  │  context_snapshot: { topics: ["ML basics"], phase: "exploration" }   │ │
│  │  }]                                                                          │ │
│  │  active_agents: [                                                            │ │
│  │  │  { type: "learning", contribution_summary: "Explained basics" },       │ │
│  │  │  { type: "practice", tools_used: ["createExercise"],                     │ │
│  │  │    contribution_summary: "Generated 3 practice exercises",               │ │
│  │  │    first_message_index: 2, last_message_index: 3                           │ │
│  │  │  }                                                                          │ │
│  │  ]                                                                            │ │
│  │  messages: [user_msg, learning_response, practice_request, practice_response] │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                    │                                             │
│  ↓ After "Test my understanding" (Handoff → Assessment Agent)                  │
│                                    │                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  conversation_state:                                                           │ │
│  │  ├─ current_topic: "machine learning assessment"                              │ │
│  │  ├─ learning_objectives: ["understand ML basics", "practice skills",      │ │
│  │  │                     "validate understanding"]                           │ │
│  │  ├─ concepts_discussed: ["supervised learning", "neural networks",        │ │
│  │  │                     "practical applications", "evaluation methods"]     │ │
│  │  ├─ session_phase: "assessment"                                                 │ │
│  │  │  └─ user_level_assessment: "intermediate"                                     │ │
│  │  agent_history: [                                                            │ │
│  │  │  { from: "learning", to: "practice", ... },                              │ │
│  │  │  { from: "practice", to: "assessment", ... }                            │ │
│  │  ]                                                                            │ │
│  │  active_agents: [                                                            │ │
│  │  │  { type: "learning", contribution_summary: "Explained concepts" },     │ │
│  │  │  { type: "practice", contribution_summary: "Generated exercises" },     │ │
│  │  │  { type: "assessment", tools_used: ["createQuiz"],                      │ │
│  │  │    contribution_summary: "Created assessment quiz" }                    │ │
│  │  │  ]                                                                            │ │
│  │  messages: [user_msg, learning_response, practice_request, practice_response, │ │
│  │             assessment_request, assessment_response]                           │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### 4. Session Restoration Flow

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                        USER RETURNS TO PREVIOUS SESSION                         │
│                                                                                     │
│  User clicks on "Machine Learning Fundamentals" in session list               │
│  Session: "Created 3 days ago, 7 messages, 3 agents involved"                     │
└─────────────────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  ┌─────────────────────────────────────────────────────────────────────────────────┐  │
│  │                           React UI Session Restoration                        │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                     │  │
│  │  │ SessionList  │  │ LoadingIcon │  │ ChatView    │                     │  │
│  │  │ Component  │  │ Component  │  │ Component   │                     │  │
│  │  │  └─────────────┘  └─────────────┘  └─────────────┘                     │  │
│  │  │      ↓              ↓              ↓                        │  │
│  │  │  Click to restore   Loading message  Restored chat view            │  │
│  │  └─────────────────────────────────────────────────────────────────────────────────┘  │
│  └─────────────────────────────────────────────────────────────────────────────────┘  │
│                                    │                                             │
│                                    ▼                                             │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐  │
│  │                         Session Service (Renderer)                            │  │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐  │  │
│  │  │                    sessionService.restoreSession()                       │  │  │
│  │  │  ├─ sessionId: "session-123"                                       │  │  │
│  │  │  ├─ loadFullHistory: true                                            │  │  │
│  │  │  └─ restoreContext: true                                             │  │  │
│  │  └─────────────────────────────────────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────────────────────────────┘  │
│                                    │                                             │
│                                    ▼                                             │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐  │
│  │                              IPC COMMUNICATION                                 │  │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐  │  │
│  │  │              window.electronAPI.sessions.restore()                         │  │  │
│  │  │  ├─ sessionId: "session-123"                                       │  │  │
│  │  │  ├─ options: {                                                      │  │  │
│  │  │  │   loadFullHistory: true,                                        │  │  │
│  │  │  │   restoreContext: true                                           │  │  │
│  │  │  │   recommendedActions: true                                        │  │  │
│  │  │  │ }                                                                    │  │  │
│  │  │  └─────────────────────────────────────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────────────────────────────┘  │
│                                    │                                             │
│                                    ▼                                             │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐  │
│  │                         MAIN THREAD RESTORATION                               │  │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐  │  │
│  │  │                    MultiAgentSessionManager.restoreSession()                │  │  │
│  │  │  ├─ loadSession(sessionId): EnhancedSession                          │  │  │
│  │  │  ├─ reconstructAgentStates(session.agent_history)                      │  │  │
│  │  │  │  ├─ Learning Agent: last known state                             │  │  │
│  │  │  │  ├─ Practice Agent: completed exercises state                     │  │  │
│  │  │  │  └─ Assessment Agent: quiz state                                 │  │  │
│  │  │  ├─ reconstructConversationContext(session.conversation_state)          │  │  │
│  │  │  │  ├─ current_topic: "machine learning assessment"                  │  │  │
│  │  │  │  ├─ session_phase: "assessment"                                   │ │  │
│  │  │  │  ├─ user_level: "intermediate"                                    │ │ │
│  │  │  │  └─ learning_objectives: [...all objectives]                     │ │ │
│  │  │  ├─ getLastCheckpoint(sessionId)                                    │  │  │
│  │  │  │  └─ Checkpoint: "After ML basics, before final assessment"      │ │ │  │
│  │  │  │    ├─ concepts_mastered: ["supervised learning"]                  │ │ │  │
│  │  │  │    └─ exercises_completed: 3 (all correct)                       │ │ │  │
│  │  │  │    └─ context_snapshot: Full conversation state              │ │ │  │
│  │  │  └─ getRecommendedActions(checkpoint, sessionState)                  │  │  │
│  │  │    ├─ "Complete the assessment quiz to validate learning"              │ │ │
│  │  │    ├─ "Review concepts marked as needing more practice"            │ │ │ │
│  │  │    └─ "Consider advanced topics based on your progress"             │ │ │ │
│  │  │  └─ createRestoredSession(session, agentStates, context)               │  │  │
│  │  └─────────────────────────────────────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────────────────────────────┘  │
│                                    │                                             │
│                                    ▼                                             │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐  │
│  │                        DATABASE RESTORATION                                │  │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐  │  │
│  │  │                        sqlite-electron                                │  │  │
│  │  │  ├─ Query learning_sessions WHERE id = "session-123"                    │  │  │
│  │  │  ├─ Parse agent_history JSON:                                         │  │  │
│  │  │  │  ├─ Agent transitions: learning → practice → assessment          │  │  │
│  │  │  │  └─ Timestamps and reasons for each handoff                           │  │  │
│  │  │  ├─ Parse conversation_state JSON:                                     │  │  │
│  │  │  │  ├─ Current learning phase and objectives                           │  │  │
│  │  │  │  └─ User progress and assessment results                          │ │  │
│  │  │  ├─ Query messages WHERE session_id = "session-123" ORDER BY message_order │  │  │
│  │  │  │  ├─ Load all messages (user + assistant + tool results)             │  │  │
│  │  │  │  └─ Parse tool_calls JSON for each message                          │ │  │
│  │  │  └─ Return complete enhanced session data                              │  │  │
│  │  └─────────────────────────────────────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────────────────────────────┘  │
│                                    │                                             │
│                                    ▼                                             │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐  │
│  │                      RESPONSE TO UI WITH FULL CONTEXT                            │  │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐  │  │
│  │  │                      RestoredSession Object                              │  │  │
│  │  │  ├─ session: EnhancedSession with full history                        │  │  │
│  │  │  │  ├─ messages: All 7 messages including tool results                  │  │  │
│  │  │  │  ├─ metadata: Tags, learning objectives, progress                   │  │  │
│  │  │  │  └─ statistics: 15 minutes, 3 agents, 8 tools used               │  │  │
│  │  │  ├─ context: {                                                           │ │
│  │  │  │  ├─ lastActiveAgent: "assessment"                                  │ │ │
│  │  │  │  ├─ learningPhase: "assessment"                                      │ │ │
│  │  │  │  ├─ userLevel: "intermediate"                                       │ │ │
│  │  │  │  └─ canResume: true                                                 │ │ │
│  │  │  ├─ checkpoint: Checkpoint data from last save                        │ │ │
│  │  │  │  ├─ title: "After ML basics completion"                            │ │ │
│  │  │  │  └─ conceptsMastered: ["supervised learning"]                        │ │ │
│  │  │  ├─ recommendedActions: [                                                  │ │ │
│  │  │  │  "Complete the assessment quiz to validate learning",             │ │ │
│  │  │  │  "Review concepts that need more practice",                     │ │ │
│ │  │  │  "Consider advanced ML topics based on your progress"              │ │ │
│  │  │  │  ]                                                                    │ │ │
│  │  │  └─ restorationMetadata: {                                              │ │ │
│  │  │    ├─ agentsInvolved: ["learning", "practice", "assessment"],              │ │ │
│  │  │    ├─ lastActivity: "3 days ago",                                   │ │ │
│  │  │    └─ totalInteractions: 7                                               │ │ │
│  │  └─────────────────────────────────────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────────────────────────────┘  │
│                                    │                                             │
│                                    ▼                                             │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐  │
│  │                           USER SEES RESTORED SESSION                           │  │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐  │  │
│  │  │                        Chat Interface (Restored)                          │  │  │
│  │  │  ├─ Message 1: "What is machine learning?" (User)                         │  │  │
│  │  │  ├─ Message 2: "Machine learning is..." (Learning Agent)                │  │  │
│  │  │  ├─ Message 3: "Give me practice exercises" (User)                        │ │  │
│  │  │  ├─ Message 4: "Great! Here are some exercises..." (Practice Agent)      │  │  │
│  │  │  ├─ Message 5: "Test my understanding..." (User)                           │  │  │
│  │  │  ├─ Message 6: "Let's test your understanding..." (Assessment Agent)      │  │  │
│  │  │  └─ System Message: "📝 Session restored. Recommended next steps..." │  │  │
│  │  └─────────────────────────────────────────────────────────────────────────┘  │  │
│  │                                                                         │   │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  │                           Context Sidebar (Enhanced)                             │   │
│  │  │  ├─ Current Phase: Assessment ⚡                                          │   │
│  │  │  ├─ Your Level: Intermediate 📈                                               │   │
│  │  │  ├─ Concepts Mastered: Supervised Learning ✅                                │   │
│  │  │  ├─ Next Recommended: Complete Assessment Quiz                              │   │
│  │  │  ├─ Agents Used: Learning (2 msgs) → Practice (2 msgs) → Assessment (1 msg)│   │
│  │  │  └─ Last Checkpoint: 2 days ago                                      │   │
│  │  └─────────────────────────────────────────────────────────────────────────┘   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### 5. Database Schema for Multi-Agent Sessions

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              DATABASE SCHEMA                                  │
│                                                                                     │
│  learning_sessions:                                                                 │
│  ├─ id (PRIMARY KEY)                                                              │
│  ├─ title                                                                          │
│  ├─ description                                                                     │
│  ├─ created_at                                                                     │
│  ├─ updated_at                                                                     │
│  ├─ metadata (JSON)                                                                 │
│  │  ├─ tags, category, difficulty, learning_objectives                             │
│  │  └─ color, archived, pinned                                                   │
│  ├─ conversation_state (JSON)                                                         │
│  │  ├─ current_topic, learning_objectives, concepts_discussed                 │
│  │  ├─ session_phase, user_level_assessment, interaction_count             │
│  │  └─ last_agent_interaction                                                      │
│  ├─ agent_history (JSON)                                                             │
│  │  └─ Array of agent transitions with timestamps and reasons                   │
│  ├─ active_agents (JSON)                                                             │
│  │  └─ Array of agent info with contributions and tool usage                      │
│  ├─ orchestration_metadata (JSON)                                                     │
│  │  ├─ strategy_used, total_agent_switches, tools_executed                   │
│  │  └─ performance_metrics                                                       │
│  ├─ statistics                                                                      │
│  │  └─ message counts, tokens used, duration, scores                           │
│  └─ checkpoints (JSON)                                                               │
│      └─ Array of checkpoint data for learning progress tracking                 │
│                                                                                     │
│  messages:                                                                           │
│  ├─ id (PRIMARY KEY)                                                               │
│  ├─ session_id (FOREIGN KEY)                                                          │
│  ├─ role ('user' | 'assistant' | 'system' | 'tool')                                  │
│  ├─ content                                                                        │
│  ├─ timestamp                                                                     │
│  ├─ provider, model                                                                 │
│  ├─ tokens_used                                                                    │
│  ├─ tool_calls (JSON)                                                              │
│  │  └─ Array of tool execution data                                           │
│  ├─ metadata (JSON)                                                                 │
│  │  └─ user_rating, concepts_learned, confidence_score                           │
│  └─ message_order                                                                  │
│                                                                                     │
│  checkpoints:                                                                         │
│  ├─ id (PRIMARY KEY)                                                               │
│  ├─ session_id (FOREIGN KEY)                                                          │
  ├─ title, description                                                               │
│  ├─ created_at                                                                     │
│  ├─ message_index                                                                   │
│  ├─ concepts_mastered (JSON)                                                         │
│  ├─ concepts_reviewed (JSON)                                                         │
│  ├─ practice_exercises (JSON)                                                         │
│  │  └─ Array of completed exercises with feedback                        │
│  ├─ notes (JSON)                                                                    │
│  └─ tags (JSON)                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

These diagrams illustrate how the enhanced session system integrates seamlessly with multi-agent orchestration while maintaining perfect conversation continuity and rich learning progress tracking. The system preserves all the complexity of multi-agent interactions behind a simple, intuitive user interface!