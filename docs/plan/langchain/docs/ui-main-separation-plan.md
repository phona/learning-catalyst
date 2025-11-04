# UI/Main Process Architecture Separation Plan

## Executive Summary

**Objective**: Create a clean separation between UI layer (renderer process) and business logic layer (main process) to enable frontend developers to focus on building beautiful, intuitive user interfaces without dealing with complex business operations.

**Key Philosophy**: "UI-First, Business-Second" - The frontend should only care about presentation logic and user interactions, while all business complexity lives in the backend.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    RENDERER PROCESS                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   UI Components │  │   UI State      │  │   UI Helpers │ │
│  │   (React + TS)  │  │   Management    │  │   Services   │ │
│  │                 │  │   (Zustand)     │  │              │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
│           │                     │                     │      │
│           └─────────────────────┼─────────────────────┘      │
│                                 │                            │
│  ┌───────────────────────────────────────────────────────────┤
│  │                   UI API LAYER                            │
│  │          (UI-Optimized Interfaces)                        │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐  │
│  │  │   ChatAPI   │ │ SessionAPI  │ │    AgentAPI         │  │
│  │  │             │ │             │ │                     │  │
│  │  │ sendMessage │ │ getSessions │ │ selectAgent         │  │
│  │  │ sendStream  │ │ search      │ │ chatWithAgent       │  │
│  │  │ getTyping   │ │ create      │ │ getAgentStatus      │  │
│  │  └─────────────┘ └─────────────┘ └─────────────────────┘  │
│  └───────────────────────────────────────────────────────────┤
│                                 │                            │
│         IPC COMMUNICATION LAYER (Secure & Optimized)         │
│                                 │                            │
├─────────────────────────────────────────────────────────────┤
│                    MAIN PROCESS                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                BUSINESS LOGIC LAYER                     │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐ │ │
│  │  │LangChain    │ │ Session     │ │   Agent              │ │ │
│  │  │Service      │ │Service      │ │   Manager            │ │ │
│  │  │             │ │             │ │                     │ │ │
│  │  │ • Agents    │ │ • Storage   │ │ • Lifecycle          │ │ │
│  │  │ • Models    │ │ • Search    │ │ • Orchestration      │ │ │
│  │  │ • Tools     │ │ • Metadata  │ │ • Tool Execution     │ │ │
│  │  └─────────────┘ └─────────────┘ └─────────────────────┘ │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐ │ │
│  │  │ Knowledge   │ │ Config      │ │   Database           │ │ │
│  │  │ Graph       │ │ Service     │ │   Layer              │ │ │
│  │  │ Service     │ │             │ │                     │ │ │
│  │  │             │ │ • Settings  │ │ • SQLite             │ │ │
│  │  │ • Concepts  │ │ • Providers │ │ • Qdrant             │ │ │
│  │  │ • Relations │ │ • Models    │ │ • Migrations         │ │ │
│  │  │ • Maps      │ │             │ │                     │ │ │
│  │  └─────────────┘ └─────────────┘ └─────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────┐ │
└─────────────────────────────────────────────────────────────┘
```

## Core Principles

### 1. **UI-First Data Design**
All data structures exposed to the UI are optimized for display purposes, not database efficiency.

### 2. **Intent-Based APIs**
APIs are designed around user intentions, not technical operations.

### 3. **Progressive Enhancement**
UI works with minimal data and progressively enhances with richer information.

### 4. **Reactive by Default**
All UI updates happen through reactive streams, not polling.

## UI Layer Architecture (Renderer Process)

### Frontend Component Structure
```
src/renderer/
├── components/           # Pure presentation components
│   ├── views/           # Full page views
│   │   ├── chat/ChatView.tsx
│   │   ├── dashboard/DashboardView.tsx
│   │   └── settings/SettingsView.tsx
│   ├── features/        # Feature-specific components
│   │   ├── chat/
│   │   │   ├── ChatInterface.tsx
│   │   │   ├── MessageBubble.tsx
│   │   │   ├── ChatInput.tsx
│   │   │   └── AgentSelector.tsx
│   │   ├── sessions/
│   │   │   ├── SessionList.tsx
│   │   │   ├── SessionCard.tsx
│   │   │   └── SessionSearch.tsx
│   │   └── agents/
│   │       ├── AgentCard.tsx
│   │       ├── AgentCapabilities.tsx
│   │       └── AgentStatus.tsx
│   └── shared/          # Reusable UI components
│       ├── forms/Button.tsx
│       ├── forms/Input.tsx
│       ├── feedback/LoadingScreen.tsx
│       ├── feedback/ErrorBoundary.tsx
│       └── layout/Container.tsx
├── stores/              # Frontend state management
│   ├── chat/            # Chat-specific state
│   │   └── chatStore.ts
│   ├── sessions/        # Session management state
│   │   └── sessionStore.ts
│   └── app/             # Global application state
│       └── appStore.ts
├── services/            # Frontend API clients
│   ├── chat/            # Chat API client
│   │   └── chatClient.ts
│   ├── sessions/        # Session API client
│   │   └── sessionClient.ts
│   └── agents/          # Agent API client
│       └── agentClient.ts
├── hooks/               # Frontend-specific hooks
│   ├── chat/            # Chat-related hooks
│   │   ├── useChat.ts
│   │   └── useStreaming.ts
│   ├── sessions/        # Session-related hooks
│   │   └── useSessions.ts
│   └── agents/          # Agent-related hooks
│       └── useAgents.ts
└── utils/               # Frontend utilities
    ├── formatting/      # Data display formatting
    │   ├── dates.ts
    │   ├── durations.ts
    │   └── text.ts
    ├── validation/      # Input validation
    │   ├── forms.ts
    │   └── rules.ts
    └── constants/       # Frontend constants
        ├── themes.ts
        └── ui.ts
```

### Frontend Data Models (Optimized for Display)

```typescript
// src/renderer/types/session.ts - Session representation for display
interface SessionDisplay {
  id: string;
  title: string;
  preview: string;           // First 100 characters for card display
  messageCount: number;
  lastActivity: string;       // "2 min ago", "1 hour ago"
  duration: string;          // "15 min", "2 hours"
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
  isActive: boolean;
  hasUnreadMessages: boolean;
  agentType?: string;
  color?: string;            // For UI theming
}

// src/renderer/types/message.ts - Message representation for display
interface MessageDisplay {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;         // Relative time for display
  status: 'sending' | 'delivered' | 'error' | 'typing';
  agentInfo?: {
    type: string;
    avatar: string;
    color: string;
  };
  reactions?: {
    emoji: string;
    count: number;
  }[];
}

// src/renderer/types/agent.ts - Agent representation for display
interface AgentDisplay {
  id: string;
  type: 'learning' | 'tutoring' | 'assessment' | 'practice' | 'research';
  name: string;              // "Learning Assistant"
  description: string;       // One-line description
  avatar: string;            // Emoji or icon path
  color: string;             // Primary color for UI theming
  capabilities: string[];    // Short capability list for display
  isAvailable: boolean;
  isPremium?: boolean;       // For future monetization
  category: 'learning' | 'creative' | 'analysis';
  stats?: {
    sessionsCount: number;
    avgRating: number;
  };
}

// src/renderer/types/knowledge.ts - Knowledge representation for display
interface KnowledgeNodeDisplay {
  id: string;
  title: string;
  description: string;
  level: number;              // For visual hierarchy
  mastery: number;            // 0-100 for progress indication
  connections: number;        // Number of related concepts
  color: string;              // For visualization
  position?: { x: number; y: number }; // Pre-calculated layout
}
```

### Frontend Component Examples

#### Chat Interface (Pure Presentation Logic)
```typescript
// src/renderer/components/features/chat/ChatInterface.tsx
import React, { useState, useEffect } from 'react';
import { useChatStore } from '../../stores/chat/chatStore';
import { useStreaming } from '../../hooks/chat/useStreaming';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { AgentSelector } from '../agents/AgentSelector';
import { TypingIndicator } from './TypingIndicator';
import type { MessageDisplay } from '../../types/message';

export function ChatInterface({ sessionId }: { sessionId: string }) {
  const {
    messages,
    currentAgent,
    isTyping,
    addMessage,
    setTyping
  } = useChatStore();

  const { streamResponse } = useStreaming(sessionId);
  const [isSending, setIsSending] = useState(false);

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isSending) return;

    // Immediate UI feedback
    addMessage({
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: 'now',
      status: 'delivered'
    });

    setIsSending(true);
    setTyping(true);

    try {
      // Stream response with simple UI updates
      let assistantMessageId = Date.now().toString();
      let responseContent = '';

      // Add typing indicator
      addMessage({
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: 'now',
        status: 'typing',
        agentInfo: currentAgent
      });

      for await (const chunk of streamResponse(content)) {
        responseContent += chunk;
        // Update message content progressively
        useChatStore.getState().updateMessage(assistantMessageId, {
          content: responseContent,
          status: 'delivered'
        });
      }
    } catch (error) {
      // Handle error with user-friendly message
      addMessage({
        id: Date.now().toString(),
        role: 'system',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: 'now',
        status: 'error'
      });
    } finally {
      setIsSending(false);
      setTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header with agent selection */}
      <div className="border-b bg-white p-4">
        <AgentSelector
          sessionId={sessionId}
          currentAgent={currentAgent}
        />
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            isTyping={message.status === 'typing'}
          />
        ))}
        {isTyping && <TypingIndicator agent={currentAgent} />}
      </div>

      {/* Input area */}
      <div className="border-t bg-white p-4">
        <ChatInput
          onSendMessage={handleSendMessage}
          disabled={isSending}
          placeholder={currentAgent ?
            `Ask ${currentAgent.name} anything...` :
            "Select an agent to begin..."
          }
        />
      </div>
    </div>
  );
}
```

#### Session List (Display-Optimized)
```typescript
// src/renderer/components/features/sessions/SessionList.tsx
import React, { useState, useEffect } from 'react';
import { useSessionStore } from '../../stores/sessions/sessionStore';
import { SessionCard } from './SessionCard';
import { SearchInput } from '../../shared/forms/SearchInput';
import { FilterChips } from '../../shared/forms/FilterChips';
import { formatRelativeTime } from '../../utils/formatting/dates';
import type { SessionDisplay } from '../../types/session';

export function SessionList() {
  const {
    sessions,
    loading,
    searchSessions,
    deleteSession,
    selectSession
  } = useSessionStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');

  useEffect(() => {
    searchSessions({ query: searchQuery, filter: selectedFilter });
  }, [searchQuery, selectedFilter]);

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="session-list">
      {/* Search and filters */}
      <div className="sticky top-0 bg-white border-b p-4 space-y-3">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search sessions..."
        />
        <FilterChips
          options={[
            { value: 'all', label: 'All Sessions' },
            { value: 'active', label: 'Active' },
            { value: 'learning', label: 'Learning' },
            { value: 'tutoring', label: 'Tutoring' }
          ]}
          selected={selectedFilter}
          onSelect={setSelectedFilter}
        />
      </div>

      {/* Session cards */}
      <div className="p-4 space-y-3">
        {sessions.map((session) => (
          <SessionCard
            key={session.id}
            session={session}
            onClick={() => selectSession(session.id)}
            onDelete={() => deleteSession(session.id)}
          />
        ))}

        {sessions.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <div className="text-lg font-medium mb-2">No sessions found</div>
            <div className="text-sm">
              {searchQuery ?
                `No results for "${searchQuery}"` :
                "Start a new learning session to get started"
              }
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

### Frontend State Management (Zustand)

```typescript
// src/renderer/stores/chat/chatStore.ts
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { MessageDisplay } from '../../types/message';
import type { AgentDisplay } from '../../types/agent';

interface ChatState {
  // Current session state
  currentSessionId: string | null;
  messages: MessageDisplay[];
  currentAgent: AgentDisplay | null;
  isTyping: boolean;

  // Actions
  setCurrentSession: (sessionId: string) => void;
  addMessage: (message: MessageDisplay) => void;
  updateMessage: (messageId: string, updates: Partial<MessageDisplay>) => void;
  setTyping: (isTyping: boolean) => void;
  setCurrentAgent: (agent: AgentDisplay) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>()(
  subscribeWithSelector((set, get) => ({
    currentSessionId: null,
    messages: [],
    currentAgent: null,
    isTyping: false,

    setCurrentSession: (sessionId) => {
      set({ currentSessionId: sessionId });
      // Load messages for this session
      window.electronAPI.chat.getSession(sessionId)
        .then(({ messages }) => set({ messages }));
    },

    addMessage: (message) => set((state) => ({
      messages: [...state.messages, message]
    })),

    updateMessage: (messageId, updates) => set((state) => ({
      messages: state.messages.map(msg =>
        msg.id === messageId ? { ...msg, ...updates } : msg
      )
    })),

    setTyping: (isTyping) => set({ isTyping }),
    setCurrentAgent: (agent) => set({ currentAgent: agent }),
    clearMessages: () => set({ messages: [] })
  }))
);
```

### Frontend API Clients (Simple Wrappers)

```typescript
// src/renderer/services/chat/chatClient.ts
import type { MessageDisplay } from '../../types/message';

export class ChatClient {
  async sendMessage(sessionId: string, message: string): Promise<void> {
    return await window.electronAPI.chat.send({
      sessionId,
      message
    });
  }

  async *sendMessageStream(sessionId: string, message: string): AsyncIterable<string> {
    const stream = window.electronAPI.chat.sendStream({ sessionId, message });

    for await (const chunk of stream) {
      yield chunk;
    }
  }

  async getTypingStatus(sessionId: string): Promise<{ isTyping: boolean; agentId?: string }> {
    return await window.electronAPI.chat.getStatus(sessionId);
  }

  async getSession(sessionId: string): Promise<{ messages: MessageDisplay[] }> {
    return await window.electronAPI.chat.getSession(sessionId);
  }
}

export const chatClient = new ChatClient();
```

## Business Logic Layer (Main Process)

### Backend Service Architecture
```
src/main/services/
├── langchain/
│   ├── LangChainService.ts      # Core LangChain orchestration
│   ├── AgentManager.ts          # Agent lifecycle and management
│   ├── ModelFactory.ts          # AI model abstraction
│   └── tools/                   # Agent tools
│       ├── learning-tools.ts
│       ├── assessment-tools.ts
│       └── research-tools.ts
├── sessions/
│   ├── SessionService.ts        # Session business logic
│   ├── MessageService.ts        # Message handling
│   └── SearchService.ts         # Session search and filtering
├── agents/
│   ├── AgentOrchestrator.ts     # Agent execution logic
│   ├── ToolExecutor.ts          # Tool execution management
│   └── AgentRegistry.ts         # Agent configuration
├── knowledge/
│   ├── KnowledgeGraphService.ts # Concept relationships
│   ├── ConceptExtractor.ts      # AI-powered concept parsing
│   └── RelationshipMapper.ts    # Concept relationship analysis
├── config/
│   ├── ConfigService.ts         # Configuration management
│   ├── ProviderManager.ts       # AI provider management
│   └── SettingsService.ts       # User settings
└── database/
    ├── DatabaseService.ts       # Database operations
    ├── MigrationService.ts      # Schema migrations
    └── QueryService.ts          # Complex query handling
```

### Business Logic Examples

#### Session Service (Complex Business Logic)
```typescript
// src/main/services/sessions/SessionService.ts
export class SessionService {
  constructor(
    private db: DatabaseService,
    private knowledgeService: KnowledgeGraphService,
    private configService: ConfigService
  ) {}

  async createSession(params: CreateSessionParams): Promise<Session> {
    // Business logic for session creation
    const session = await this.db.sessions.create({
      id: generateId(),
      title: params.title || 'New Learning Session',
      description: params.description || '',
      agentType: params.agentType || 'learning',
      metadata: {
        difficulty: params.difficulty || 'medium',
        tags: params.tags || [],
        learningObjectives: params.learningObjectives || [],
        createdBy: 'user',
        createdAt: new Date().toISOString()
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Initialize knowledge graph for session
    await this.knowledgeService.initializeSessionGraph(session.id);

    // Apply default settings
    const defaultSettings = await this.configService.getDefaultSessionSettings();
    await this.configService.applySessionSettings(session.id, defaultSettings);

    return session;
  }

  async addMessage(sessionId: string, messageInput: AddMessageInput): Promise<Message> {
    // Complex business logic for message processing
    const session = await this.getSession(sessionId);

    // Process message content
    const processedMessage = await this.processMessageContent(messageInput);

    // Extract concepts from message
    const concepts = await this.extractConcepts(processedMessage.content);

    // Update knowledge graph
    await this.knowledgeService.addConcepts(sessionId, concepts);

    // Analyze learning patterns
    await this.analyzeLearningPatterns(sessionId, processedMessage);

    // Save message with all business metadata
    const message = await this.db.messages.create({
      sessionId,
      ...processedMessage,
      concepts: concepts.map(c => c.id),
      metadata: {
        processingTime: Date.now(),
        agentType: session.agentType,
        confidence: processedMessage.confidence
      }
    });

    // Update session statistics
    await this.updateSessionStatistics(sessionId);

    // Trigger real-time events
    this.eventEmitter.emit('message:added', { sessionId, message });

    return message;
  }

  private async processMessageContent(input: AddMessageInput): Promise<ProcessedMessage> {
    // Complex content processing
    const content = await this.sanitizeContent(input.content);
    const sentiment = await this.analyzeSentiment(content);
    const language = await this.detectLanguage(content);
    const complexity = await this.analyzeComplexity(content);

    return {
      content,
      sentiment,
      language,
      complexity,
      confidence: this.calculateConfidence(content),
      processedAt: new Date()
    };
  }

  private async extractConcepts(content: string): Promise<Concept[]> {
    // Use LangChain for concept extraction
    const conceptExtractor = new ConceptExtractor(this.configService);
    return await conceptExtractor.extract(content);
  }

  async searchSessions(query: SessionSearchQuery): Promise<SessionSearchResult> {
    // Complex search logic with multiple indices
    const textResults = await this.searchByContent(query.query);
    const conceptResults = await this.searchByConcepts(query.concepts);
    const tagResults = await this.searchByTags(query.tags);
    const dateResults = await this.searchByDateRange(query.dateRange);

    // Merge and rank results
    const mergedResults = this.mergeSearchResults([
      textResults,
      conceptResults,
      tagResults,
      dateResults
    ]);

    // Apply business rules for ranking
    const rankedResults = await this.rankSearchResults(mergedResults, query);

    // Convert to display-optimized format
    return {
      sessions: rankedResults.map(session => this.transformToDisplaySession(session)),
      total: rankedResults.length,
      hasMore: rankedResults.length > query.limit
    };
  }

  private transformToDisplaySession(session: Session): SessionDisplay {
    // Transform complex session object to display-optimized format
    return {
      id: session.id,
      title: session.title,
      preview: this.generatePreview(session),
      messageCount: session.messageCount,
      lastActivity: this.formatRelativeTime(session.updatedAt),
      duration: this.formatDuration(session.duration),
      difficulty: session.metadata.difficulty,
      tags: session.metadata.tags,
      isActive: session.isActive,
      hasUnreadMessages: session.unreadCount > 0,
      agentType: session.agentType,
      color: this.getAgentColor(session.agentType)
    };
  }

  private formatRelativeTime(date: Date): string {
    // Backend formatting logic for display
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`;
    return `${Math.floor(diffMins / 1440)} days ago`;
  }

  private formatDuration(milliseconds: number): string {
    // Backend formatting logic for display
    const minutes = Math.floor(milliseconds / 60000);
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }

  private getAgentColor(agentType: string): string {
    // Backend logic for agent theming
    const colors = {
      learning: '#3B82F6',
      tutoring: '#10B981',
      assessment: '#F59E0B',
      practice: '#EF4444',
      research: '#8B5CF6'
    };
    return colors[agentType] || '#6B7280';
  }
}
```

#### Agent Orchestrator (Complex Agent Logic)
```typescript
// src/main/services/agents/AgentOrchestrator.ts
export class AgentOrchestrator {
  constructor(
    private agentManager: AgentManager,
    private toolExecutor: ToolExecutor,
    private knowledgeService: KnowledgeGraphService
  ) {}

  async executeAgent(request: AgentExecutionRequest): Promise<AgentExecutionResponse> {
    // Complex agent execution logic
    const agent = await this.agentManager.getAgent(request.agentId);

    // Create execution context
    const context = await this.createExecutionContext(request);

    // Load relevant knowledge
    const relevantKnowledge = await this.loadRelevantKnowledge(
      request.input,
      context.sessionId
    );

    // Prepare tools for agent
    const tools = await this.prepareToolsForAgent(agent, context);

    // Execute agent with full LangChain capabilities
    const execution = await this.executeWithLangChain({
      agent,
      input: request.input,
      context: {
        ...context,
        knowledge: relevantKnowledge,
        tools
      },
      options: request.options
    });

    // Process execution results
    const processedResults = await this.processExecutionResults(execution);

    // Update knowledge graph based on agent interactions
    await this.updateKnowledgeFromExecution(context.sessionId, processedResults);

    return processedResults;
  }

  private async prepareToolsForAgent(agent: Agent, context: ExecutionContext): Promise<Tool[]> {
    // Complex tool preparation based on agent type and context
    const baseTools = await this.toolExecutor.getBaseTools();

    switch (agent.type) {
      case 'learning':
        return [
          ...baseTools,
          await this.createLearningTools(context),
          await this.createConceptAnalysisTools(context),
          await this.createKnowledgeTools(context)
        ];

      case 'tutoring':
        return [
          ...baseTools,
          await this.createTutoringTools(context),
          await this.createAssessmentTools(context),
          await this.createProgressTools(context)
        ];

      default:
        return baseTools;
    }
  }

  private async createLearningTools(context: ExecutionContext): Promise<Tool[]> {
    return [
      {
        name: 'explain_concept',
        description: 'Explain a concept in simple terms',
        schema: z.object({
          concept: z.string(),
          depth: z.enum(['basic', 'intermediate', 'advanced']),
          analogies: z.boolean().optional()
        }),
        execute: async (params) => {
          // Complex concept explanation logic
          const explanation = await this.generateExplanation(params, context);
          const examples = await this.generateExamples(params.concept, context);
          const analogies = params.analogies ?
            await this.generateAnalogies(params.concept, context) : [];

          return {
            explanation,
            examples,
            analogies,
            relatedConcepts: await this.findRelatedConcepts(params.concept, context)
          };
        }
      },
      {
        name: 'create_learning_path',
        description: 'Create a structured learning path for a topic',
        schema: z.object({
          topic: z.string(),
          currentLevel: z.enum(['beginner', 'intermediate', 'advanced']),
          goals: z.array(z.string())
        }),
        execute: async (params) => {
          // Complex learning path generation
          return await this.generateLearningPath(params, context);
        }
      }
    ];
  }
}
```

## IPC Communication Layer

### Display-Optimized IPC Handlers
```typescript
// electron/main/handlers/display-handlers.ts
export function setupDisplayHandlers() {
  const sessionService = new SessionService();
  const agentOrchestrator = new AgentOrchestrator();
  const knowledgeService = new KnowledgeGraphService();

  // Chat operations (Display-optimized)
  ipcMain.handle('chat:send', async (_, { sessionId, message }) => {
    try {
      const response = await sessionService.addMessage(sessionId, {
        content: message,
        role: 'user'
      });

      // Trigger agent response
      const agentResponse = await agentOrchestrator.executeAgent({
        agentId: response.agentId,
        input: message,
        sessionId,
        options: { stream: true }
      });

      return { success: true, messageId: response.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Session operations (Display-optimized)
  ipcMain.handle('sessions:list', async (_, { query, limit = 20, filter }) => {
    const searchResult = await sessionService.searchSessions({
      query,
      limit,
      filter,
      includeDisplay: true // Transform to display-optimized format
    });

    return {
      success: true,
      sessions: searchResult.sessions, // Already display-optimized
      total: searchResult.total,
      hasMore: searchResult.hasMore
    };
  });

  // Agent operations (simplified for display)
  ipcMain.handle('agents:list', async () => {
    const agents = await agentOrchestrator.getAvailableAgents();

    return {
      success: true,
      agents: agents.map(agent => ({
        id: agent.id,
        type: agent.type,
        name: agent.displayName,
        description: agent.shortDescription,
        avatar: agent.avatar,
        color: agent.themeColor,
        capabilities: agent.displayCapabilities,
        isAvailable: agent.isAvailable
      }))
    };
  });

  // Streaming chat (Display-optimized)
  ipcMain.handle('chat:stream', async (event, { sessionId, message }) => {
    const { port1, port2 } = new MessageChannelMain();

    // Start streaming in background
    agentOrchestrator.executeAgentStream({
      sessionId,
      input: message,
      onChunk: (chunk) => {
        port1.postMessage({ type: 'chunk', data: chunk });
      },
      onComplete: () => {
        port1.postMessage({ type: 'end' });
        port1.close();
      },
      onError: (error) => {
        port1.postMessage({ type: 'error', error: error.message });
        port1.close();
      }
    });

    // Send port to renderer
    event.senderFrame.postMessage('chat:stream-ready', [], [port2]);
  });
}
```

### Display-Optimized Preload API
```typescript
// electron/preload/display-api.ts
const displayAPI = {
  chat: {
    send: ({ sessionId, message }) =>
      ipcRenderer.invoke('chat:send', { sessionId, message }),

    sendStream: ({ sessionId, message }) => {
      return new Promise((resolve) => {
        // Listen for stream-ready message
        const streamReadyHandler = (event: any) => {
          const port = event.ports[0];

          const stream = {
            async *[Symbol.asyncIterator]() {
              const messageHandler = (event: MessageEvent) => {
                const { type, data, error } = event.data;

                switch (type) {
                  case 'chunk':
                    queue.push(data);
                    break;
                  case 'end':
                    done = true;
                    port.close();
                    break;
                  case 'error':
                    throw new Error(error);
                }
              };

              port.onmessage = messageHandler;
              port.start();

              const queue: string[] = [];
              let done = false;

              while (!done) {
                if (queue.length > 0) {
                  yield queue.shift()!;
                } else {
                  await new Promise(r => setTimeout(r, 10));
                }
              }
            }
          };

          resolve(stream);
          ipcRenderer.removeListener('chat:stream-ready', streamReadyHandler);
        };

        ipcRenderer.on('chat:stream-ready', streamReadyHandler);
        ipcRenderer.send('chat:stream', { sessionId, message });
      });
    },

    getSession: (sessionId: string) =>
      ipcRenderer.invoke('chat:get-session', sessionId),

    getStatus: (sessionId: string) =>
      ipcRenderer.invoke('chat:get-status', sessionId)
  },

  sessions: {
    list: ({ query, limit, filter }) =>
      ipcRenderer.invoke('sessions:list', { query, limit, filter }),

    create: ({ title, description, agentType }) =>
      ipcRenderer.invoke('sessions:create', { title, description, agentType }),

    get: (sessionId: string) =>
      ipcRenderer.invoke('sessions:get', sessionId),

    delete: (sessionId: string) =>
      ipcRenderer.invoke('sessions:delete', sessionId)
  },

  agents: {
    list: () => ipcRenderer.invoke('agents:list'),

    select: (sessionId: string, agentType: string) =>
      ipcRenderer.invoke('agents:select', { sessionId, agentType }),

    getStatus: (agentId: string) =>
      ipcRenderer.invoke('agents:get-status', agentId)
  }
};

contextBridge.exposeInMainWorld('electronAPI', displayAPI);
```

## Implementation Roadmap

### Phase 1: Foundation Setup (2-3 days)
1. **Create UI Data Models**
   - Define UISession, UIMessage, UIAgent interfaces
   - Create transformation utilities
   - Set up TypeScript types

2. **Implement Basic Business Services**
   - SessionService with core functionality
   - AgentManager with basic agent types
   - Database abstraction layer

3. **Set Up UI-State Management**
   - Zustand stores for chat, sessions, agents
   - Reactive patterns for real-time updates
   - Error boundary integration

### Phase 2: API Layer Implementation (3-4 days)
1. **Create UI-Focused IPC Handlers**
   - Transform complex business data to UI-optimized formats
   - Implement secure, validated API endpoints
   - Add streaming support for real-time updates

2. **Build UI Service Wrappers**
   - Simple service classes for API consumption
   - Error handling and retry logic
   - Response caching and optimization

3. **Implement Core UI Components**
   - ChatInterface with streaming support
   - SessionList with search and filtering
   - AgentSelector with visual feedback

### Phase 3: Advanced Features (2-3 days)
1. **Knowledge Graph Integration**
   - UI-optimized knowledge visualization
   - Interactive concept exploration
   - Learning progress tracking

2. **Advanced Agent Features**
   - Multi-agent conversations
   - Agent switching within sessions
   - Custom agent configurations

3. **Real-time Collaboration**
   - Live typing indicators
   - Real-time message updates
   - Presence awareness

### Phase 4: Polish & Optimization (1-2 days)
1. **Performance Optimization**
   - Lazy loading for large datasets
   - Virtual scrolling for long lists
   - Memory optimization for media-rich content

2. **UI/UX Refinement**
   - Smooth animations and transitions
   - Loading states and skeleton screens
   - Error states and recovery options

3. **Testing & Validation**
   - Unit tests for business logic
   - Integration tests for API layer
   - E2E tests for complete workflows

## Success Metrics

### Developer Experience
- [ ] UI components require no business logic knowledge
- [ ] New features can be built with UI-only changes
- [ ] Business logic changes don't break UI components
- [ ] Clear separation between data and presentation

### User Experience
- [ ] Instant UI feedback for all interactions
- [ ] Smooth real-time updates without jank
- [ ] Intuitive agent selection and switching
- [ ] Seamless session management and search

### Technical Excellence
- [ ] Type-safe communication between processes
- [ ] Comprehensive error handling and recovery
- [ ] Performance metrics meet targets
- [ ] Architecture supports future scalability

## Benefits of This Architecture

### For Frontend Developers
1. **Focus on UI/UX** - No need to understand complex business logic
2. **Faster Development** - Simple APIs and predictable data structures
3. **Better Testing** - UI components can be tested with mock data
4. **Creative Freedom** - Experiment with different UI patterns easily

### For Backend Developers
1. **Business Logic Focus** - No need to worry about presentation concerns
2. **Independent Evolution** - Business logic can change without breaking UI
3. **Performance Optimization** - Focus on data processing and algorithm efficiency
4. **Scalability** - Architecture supports multiple frontend clients

### For Users
1. **Responsive Interface** - Instant feedback and smooth interactions
2. **Intuitive Experience** - Clean, focused user interfaces
3. **Reliable Performance** - Stable, well-architected system
4. **Future-Proof** - Architecture supports new features and improvements

This separation plan creates a foundation where frontend developers can focus on building beautiful, user-friendly interfaces while backend developers handle complex business logic, all while maintaining clean communication through well-defined, UI-optimized APIs.