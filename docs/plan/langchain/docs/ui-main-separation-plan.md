# UI/Main Process Architecture Separation Plan

## Executive Summary

**Objective**: Create a clean separation between UI layer (renderer process) and business logic layer (main process) to enable frontend developers to focus on building beautiful, intuitive user interfaces without dealing with complex business operations.

**Key Philosophy**: "UI-First, Business-Second" - The frontend should only care about presentation logic and user interactions, while all business complexity lives in the backend.

## API Design Principles

Based on the comprehensive electronAPI structure, we follow these core principles:

1. **Intent-Over-Technical**: Methods describe user goals, not system operations
2. **Display-First**: All responses are optimized for immediate UI consumption
3. **Progressive Enhancement**: Basic info available immediately, rich details on demand
4. **Error Resilient**: Built-in error handling with user-friendly messages
5. **Type Safe**: Full TypeScript support with comprehensive interfaces

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           RENDERER PROCESS                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐ │
│  │   UI Components │  │   UI State      │  │      UI Services        │ │
│  │   (React + TS)  │  │   Management    │  │   (API Clients)         │ │
│  │                 │  │   (Zustand)     │  │                         │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────┘ │
│           │                     │                     │               │
│           └─────────────────────┼─────────────────────┘               │
│                                 │                                 │
│  ┌─────────────────────────────────────────────────────────────────────┤
│  │                    COMPREHENSIVE UI API LAYER                        │
│  │                   (7 API Domains - Intent-Based)                     │
│  │                                                                         │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────────────┐  │
│  │  │  Chat &     │ │  Learning   │ │         Knowledge &             │  │
│  │  │ Conversation│ │  & Sessions │ │       Discovery                 │  │
│  │  │             │ │             │ │                                 │  │
│  │  │ startConversation│ startLearningSession│ exploreConcept           │  │
│  │  │ sendMessageStream│ getSessionProgress│ getKnowledgeMap           │  │
│  │  │ getTypingIndicator│ getLearningPath│ getRelatedConcepts          │  │
│  │  │ getConversationHistory│ searchSessions│ searchKnowledge          │  │
│  │  └─────────────┘ └─────────────┘ └─────────────────────────────────┘  │
│  │                                                                         │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────────────┐  │
│  │  │ Analytics & │ │  Agent      │ │       Content &                 │  │
│  │  │  Progress   │ │ Management  │ │       Discovery                 │  │
│  │  │             │ │             │ │                                 │  │
│  │  │ getDashboard│ getAvailableAgents│ exploreLocalProjects          │  │
│  │  │ getProgressChart│ selectAgentForSession│ importLearningContent │  │
│  │  │ getAchievements│ setAgentPersonality│ getRecommendedContent     │  │
│  │  │ getTokenUsage│ getAgentCapabilities│ analyzeDocument           │  │
│  │  └─────────────┘ └─────────────┘ └─────────────────────────────────┘  │
│  │                                                                         │
│  │  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │  │                  Settings & Configuration                           │  │
│  │  │                                                                         │  │
│  │  │ getUserPreferences│ getAvailableProviders│ updateLearningSettings   │  │
│  │  │ updatePreferences│ configureProvider│ getLearningSettings           │  │
│  │  └─────────────────────────────────────────────────────────────────────┘  │
│  └─────────────────────────────────────────────────────────────────────────┤
│                                 │                                         │
│             IPC COMMUNICATION LAYER (Secure, Streaming & Optimized)       │
│                                 │                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                           MAIN PROCESS                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                      BUSINESS LOGIC LAYER                           │ │
│  │  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────────────┐ │ │
│  │  │  LangChain      │ │   Session       │ │        Agent             │ │ │
│  │  │  Service        │ │   Service       │ │        Manager            │ │ │
│  │  │                 │ │                 │ │                            │ │ │
│  │  │ • Multi-Agent   │ │ • Storage       │ │ • Lifecycle Management     │ │ │
│  │  │ • Model Factory │ │ • Search        │ │ • Orchestration           │ │ │
│  │  │ • Tool Execution│ │ • Metadata      │ │ • State Persistence       │ │ │
│  │  │ • Streaming     │ │ • Analytics     │ │ • Specialized Agents      │ │ │
│  │  └─────────────────┘ └─────────────────┘ └─────────────────────────┘ │ │
│  │  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────────────┐ │ │
│  │  │  Knowledge      │ │   Config        │ │        Database           │ │ │
│  │  │  Graph          │ │   Service       │ │        Layer              │ │ │
│  │  │  Service        │ │                 │ │                            │ │ │
│  │  │                 │ │ • Settings      │ │ • SQLite                 │ │ │
│  │  │ • Concepts      │ │ • Providers     │ │ • Qdrant (Vector DB)      │ │ │
│  │  │ • Relations     │ │ • Models        │ │ • Migrations             │ │ │
│  │  │ • Maps          │ │ • API Keys      │ │ • Checkpoints            │ │ │
│  │  └─────────────────┘ └─────────────────┘ └─────────────────────────┘ │ │
│  │  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────────────┐ │ │
│  │  │  Catalyst       │ │   Security      │ │        Tool               │ │ │
│  │  │  Service        │ │   Layer         │ │        Executor           │ │ │
│  │  │                 │ │                 │ │                            │ │ │
│  │  │ • AI Orchestration│ • Sandbox       │ │ • Secure Execution       │ │ │
│  │  │ • Concept Parsing│ • Validation     │ │ • Resource Management     │ │ │
│  │  │ • Content Analysis│ • Auth          │ │ • Performance Monitoring  │ │ │
│  │  └─────────────────┘ └─────────────────┘ └─────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────────────┐ │
└─────────────────────────────────────────────────────────────────────────┘
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

## Comprehensive API Domains Overview

### Domain 1: Chat & Conversation API
**Purpose**: Handle real-time conversations with AI agents, including streaming responses and conversation management.

**Key Features**:
- Streaming conversation responses with real-time typing indicators
- Conversation lifecycle management (start, pause, resume, end)
- Message history with display-optimized formatting
- Agent-specific conversation contexts

**Frontend Usage**:
```typescript
// Start a new conversation
const conversation = await window.electronAPI.chat.startConversation({
  agentType: 'learning',
  topic: 'React Hooks',
  preferences: {
    responseStyle: 'conversational',
    difficultyLevel: 'intermediate'
  }
});

// Send a message with streaming
const stream = await window.electronAPI.chat.sendMessageStream({
  conversationId: conversation.id,
  message: 'Explain useState in simple terms'
});

for await (const chunk of stream) {
  updateMessageContent(chunk);
}
```

### Domain 2: Learning & Sessions API
**Purpose**: Manage learning sessions, track progress, and handle educational workflows.

**Key Features**:
- Structured learning session creation with goals and difficulty levels
- Real-time progress tracking with learning analytics
- Learning path generation and management
- Session search and filtering capabilities

**Frontend Usage**:
```typescript
// Start a learning session
const session = await window.electronAPI.learning.startLearningSession({
  topic: 'Machine Learning Basics',
  goals: ['Understand supervised learning', 'Learn basic algorithms'],
  difficulty: 'beginner',
  agentType: 'learning',
  learningStyle: 'visual'
});

// Track progress
const progress = await window.electronAPI.learning.getSessionProgress(session.id);
displayProgressBar(progress.percentage);
```

### Domain 3: Knowledge & Discovery API
**Purpose**: Explore knowledge graphs, discover related concepts, and access educational content.

**Key Features**:
- Interactive concept exploration with multiple depth levels
- Knowledge graph visualization data
- Concept relationship mapping
- Practice exercise generation

**Frontend Usage**:
```typescript
// Explore a concept
const concept = await window.electronAPI.knowledge.exploreConcept('Machine Learning', 'intermediate');
displayConceptDetails(concept);

// Get knowledge map for visualization
const knowledgeMap = await window.electronAPI.knowledge.getKnowledgeMap(sessionId);
renderKnowledgeGraph(knowledgeMap);
```

### Domain 4: Analytics & Progress API
**Purpose**: Track learning analytics, display achievements, and provide insights into learning patterns.

**Key Features**:
- Comprehensive learning dashboard data
- Progress charts for different time ranges
- Achievement tracking and unlocking
- Token usage and cost monitoring

**Frontend Usage**:
```typescript
// Get learning dashboard
const dashboard = await window.electronAPI.analytics.getDashboard();
renderDashboard(dashboard);

// Get achievements for display
const achievements = await window.electronAPI.analytics.getAchievements();
showAchievementGallery(achievements);
```

### Domain 5: Agent Management API
**Purpose**: Manage AI agents, their capabilities, and user preferences for agent interactions.

**Key Features**:
- Agent discovery and selection
- Agent personality and style configuration
- Agent capability demonstration
- Session-specific agent preferences

**Frontend Usage**:
```typescript
// Get available agents
const agents = await window.electronAPI.agents.getAvailableAgents();
displayAgentSelection(agents);

// Set agent personality
await window.electronAPI.agents.setAgentPersonality('learning_001', 'friendly encouraging');
```

### Domain 6: Content & Discovery API
**Purpose**: Import, manage, and discover learning content from various sources.

**Key Features**:
- Local project exploration and content import
- Learning resource discovery and recommendations
- Document analysis for concept extraction
- Content search across multiple sources

**Frontend Usage**:
```typescript
// Import content from files
const result = await window.electronAPI.content.importLearningContent(fileList);
showImportResults(result);

// Get content recommendations
const recommendations = await window.electronAPI.content.getRecommendedContent('React', 'intermediate');
displayRecommendations(recommendations);
```

### Domain 7: Settings & Configuration API
**Purpose**: Manage user preferences, AI provider configuration, and application settings.

**Key Features**:
- User preferences management with display optimization
- AI provider configuration and authentication
- Learning-specific settings and goals
- Application-wide configuration management

**Frontend Usage**:
```typescript
// Get user preferences
const prefs = await window.electronAPI.settings.getUserPreferences();
applyUserSettings(prefs);

// Configure AI provider
await window.electronAPI.settings.configureProvider('openai', {
  apiKey: 'sk-...',
  model: 'gpt-4',
  temperature: 0.7
});
```

## UI Layer Architecture (Renderer Process)

### Frontend Component Structure
```
src/renderer/
├── components/           # Pure presentation components
│   ├── Analytics/        # Analytics and progress tracking
│   │   ├── Achievements.tsx
│   │   ├── LearningTrends.tsx
│   │   ├── ProgressChart.tsx
│   │   ├── SessionTracking.tsx
│   │   └── StudyStreak.tsx
│   ├── Chat/            # Chat interface components
│   │   ├── ChatArea.tsx
│   │   ├── ChatInput.tsx
│   │   ├── ChatInterface.tsx
│   │   └── MessageBubble.tsx
│   ├── Config/          # Settings and configuration
│   │   ├── AdvancedSettings.tsx
│   │   ├── ResponseSettings.tsx
│   │   ├── SettingsPanel.tsx
│   │   ├── UISettings.tsx
│   │   └── AIProviderSettings.tsx
│   ├── Dashboard/       # Learning dashboard
│   │   ├── KnowledgeMap.tsx
│   │   └── LearningDashboard.tsx
│   ├── Discovery/       # Content discovery and exploration
│   │   ├── ConceptParsingResults.tsx
│   │   ├── ContentDiscovery.tsx
│   │   ├── FileSelector.tsx
│   │   └── LocalProjectExplorer.tsx
│   ├── Knowledge/       # Knowledge graph visualization
│   │   ├── ConceptManager.tsx
│   │   ├── KnowledgeGraphVisualization.tsx
│   │   ├── KnowledgeSearch.tsx
│   │   └── RelationshipManager.tsx
│   ├── Layout/          # Application layout components
│   │   ├── Header.tsx
│   │   ├── SessionItem.tsx
│   │   ├── SessionList.tsx
│   │   ├── Sidebar.tsx
│   │   └── SidebarNavigation.tsx
│   ├── Session/         # Session management
│   │   └── SessionManager.tsx
│   ├── UI/              # Reusable UI components
│   │   ├── Accordion.tsx
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── ChatErrorBoundary.tsx
│   │   ├── ComponentErrorBoundary.tsx
│   │   ├── ErrorBoundary.tsx
│   │   ├── ErrorBoundaryEnhanced.tsx
│   │   ├── Input.tsx
│   │   ├── LoadingScreen.tsx
│   │   ├── ModuleStatusIndicator.tsx
│   │   ├── SettingsErrorBoundary.tsx
│   │   └── SyntaxHighlighterWrapper.tsx
│   ├── shared/          # Shared components (new organization)
│   │   ├── forms/
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── SearchInput.tsx
│   │   │   └── FilterChips.tsx
│   │   ├── layout/
│   │   │   ├── Card.tsx
│   │   │   └── Container.tsx
│   │   └── feedback/
│   │       ├── LoadingScreen.tsx
│   │       └── ErrorBoundary.tsx
│   └── views/           # Full page views
│       ├── chat/
│       │   └── ChatView.tsx
│       ├── dashboard/
│       │   └── DashboardView.tsx
│       └── settings/
│           └── SettingsView.tsx
├── stores/              # Frontend state management (Zustand)
│   ├── app/             # Global application state
│   │   └── appStore.ts
│   ├── chat/            # Chat functionality state
│   │   └── chatStore.ts
│   ├── sessions/        # Session management state
│   │   └── sessionStore.ts
│   └── agents/          # Agent management state
│       └── agentStore.ts
├── services/            # Frontend API clients and services
│   ├── agents/          # Agent API client
│   │   └── agentClient.ts
│   ├── chat/            # Chat API client
│   │   └── chatClient.ts
│   ├── sessions/        # Session API client
│   │   └── sessionClient.ts
│   └── index.ts         # Service exports
├── hooks/               # Frontend-specific hooks
│   ├── chat/            # Chat-related hooks
│   │   ├── useChat.ts
│   │   └── useStreaming.ts
│   ├── sessions/        # Session-related hooks
│   │   └── useSessions.ts
│   ├── agents/          # Agent-related hooks
│   │   └── useAgents.ts
│   └── useAppServices.tsx  # Main app services hook
├── types/               # Frontend TypeScript types
│   ├── agent.ts         # Agent display types
│   ├── index.ts         # Type exports
│   ├── knowledge.ts     # Knowledge display types
│   ├── message.ts       # Message display types
│   └── session.ts       # Session display types
├── utils/               # Frontend utilities
│   ├── formatting/      # Data display formatting
│   │   ├── dates.ts
│   │   ├── durations.ts
│   │   └── text.ts
│   ├── validation/      # Input validation
│   │   ├── forms.ts
│   │   └── rules.ts
│   └── constants/       # Frontend constants
│       ├── themes.ts
│       └── ui.ts
├── App.tsx              # React application root
└── main.tsx             # React application entry point
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
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { AgentSelector } from '../agents/AgentSelector';
import { TypingIndicator } from './TypingIndicator';
import type { MessageDisplay, ConversationDisplay } from '../../types';

export function ChatInterface({ conversationId }: { conversationId: string }) {
  const {
    messages,
    currentAgent,
    isTyping,
    addMessage,
    updateMessage,
    setTyping
  } = useChatStore();

  const [isSending, setIsSending] = useState(false);
  const [conversation, setConversation] = useState<ConversationDisplay | null>(null);

  // Load conversation details
  useEffect(() => {
    window.electronAPI.chat.getConversationHistory(conversationId)
      .then(({ messages: conversationMessages }) => {
        setMessages(conversationMessages);
      });
  }, [conversationId]);

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isSending) return;

    // Immediate UI feedback - add user message
    const userMessageId = Date.now().toString();
    addMessage({
      id: userMessageId,
      role: 'user',
      content,
      timestamp: 'now',
      status: 'delivered'
    });

    setIsSending(true);
    setTyping(true);

    // Add typing indicator placeholder
    const assistantMessageId = Date.now().toString();
    addMessage({
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: 'now',
      status: 'typing',
      agentInfo: currentAgent
    });

    try {
      // Use the comprehensive electron API for streaming
      const stream = await window.electronAPI.chat.sendMessageStream({
        conversationId,
        message: content
      });

      let responseContent = '';

      // Process streaming response
      for await (const chunk of stream) {
        responseContent += chunk;
        updateMessage(assistantMessageId, {
          content: responseContent,
          status: 'streaming'
        });
      }

      // Mark as complete
      updateMessage(assistantMessageId, {
        content: responseContent,
        status: 'delivered'
      });

    } catch (error) {
      // Handle error with user-friendly message
      updateMessage(assistantMessageId, {
        content: 'Sorry, I encountered an error. Please try again.',
        status: 'error'
      });

      // Log error for debugging
      window.electronAPI.handleError(error, 'sendMessage');
    } finally {
      setIsSending(false);
      setTyping(false);
    }
  };

  // Get typing indicator for real-time feedback
  useEffect(() => {
    const checkTypingStatus = async () => {
      if (conversationId) {
        const typing = await window.electronAPI.chat.getTypingIndicator(conversationId);
        setTyping(typing.isTyping);
      }
    };

    const interval = setInterval(checkTypingStatus, 1000);
    return () => clearInterval(interval);
  }, [conversationId, setTyping]);

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header with agent selection and conversation info */}
      <div className="border-b bg-white p-4">
        <AgentSelector
          conversationId={conversationId}
          currentAgent={currentAgent}
        />
        {conversation && (
          <div className="text-sm text-gray-500 mt-2">
            {conversation.messageCount} messages • Started {conversation.createdAt}
          </div>
        )}
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
import { SessionCard } from './SessionCard';
import { SearchInput } from '../../shared/forms/SearchInput';
import { FilterChips } from '../../shared/forms/FilterChips';
import type { LearningSessionDisplay, SessionSearchResultDisplay } from '../../types';

export function SessionList() {
  const [sessions, setSessions] = useState<LearningSessionDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');

  // Search sessions using the comprehensive API
  const searchSessions = async () => {
    setLoading(true);
    try {
      const result: SessionSearchResultDisplay = await window.electronAPI.learning.searchSessions(searchQuery, {
        agentType: selectedFilter === 'all' ? undefined : selectedFilter,
        limit: 20
      });
      setSessions(result.sessions);
    } catch (error) {
      window.electronAPI.handleError(error, 'searchSessions');
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  // Load initial sessions
  useEffect(() => {
    searchSessions();
  }, [searchQuery, selectedFilter]);

  // Delete a session
  const handleDeleteSession = async (sessionId: string) => {
    try {
      // This would be handled by a session management API
      await window.electronAPI.sessions.delete(sessionId);
      await searchSessions(); // Refresh the list
    } catch (error) {
      window.electronAPI.handleError(error, 'deleteSession');
    }
  };

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
          placeholder="Search learning sessions..."
        />
        <FilterChips
          options={[
            { value: 'all', label: 'All Sessions' },
            { value: 'active', label: 'Active' },
            { value: 'learning', label: 'Learning' },
            { value: 'tutoring', label: 'Tutoring' },
            { value: 'assessment', label: 'Assessment' },
            { value: 'practice', label: 'Practice' }
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
            onClick={() => {
              // Navigate to session or start conversation
              window.location.href = `/chat/${session.id}`;
            }}
            onDelete={() => handleDeleteSession(session.id)}
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

#### Learning Dashboard (Analytics Integration)
```typescript
// src/renderer/components/features/dashboard/LearningDashboard.tsx
import React, { useState, useEffect } from 'react';
import { LearningTrends } from '../Analytics/LearningTrends';
import { SessionTracking } from '../Analytics/SessionTracking';
import { StudyStreak } from '../Analytics/StudyStreak';
import { KnowledgeMap } from '../Knowledge/KnowledgeMapVisualization';
import type { DashboardDisplay, ProgressChartDisplay } from '../../types';

export function LearningDashboard() {
  const [dashboard, setDashboard] = useState<DashboardDisplay | null>(null);
  const [progressChart, setProgressChart] = useState<ProgressChartDisplay | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30days');

  // Load dashboard data using the analytics API
  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      try {
        // Get comprehensive dashboard data
        const dashboardData = await window.electronAPI.analytics.getDashboard();
        setDashboard(dashboardData);

        // Get progress chart data for selected time range
        const chartData = await window.electronAPI.analytics.getProgressChart(
          timeRange as any,
          null // all topics
        );
        setProgressChart(chartData);
      } catch (error) {
        window.electronAPI.handleError(error, 'loadDashboard');
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [timeRange]);

  if (loading || !dashboard) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="learning-dashboard p-6 space-y-6">
      {/* Header with overview */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-4">Learning Dashboard</h1>

        {/* Overview metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{dashboard.overview.totalSessions}</div>
            <div className="text-sm text-gray-500">Total Sessions</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">{dashboard.overview.currentStreak}</div>
            <div className="text-sm text-gray-500">Day Streak</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">{dashboard.overview.conceptsLearned}</div>
            <div className="text-sm text-gray-500">Concepts Learned</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600">{dashboard.overview.totalLearningTime}</div>
            <div className="text-sm text-gray-500">Learning Time</div>
          </div>
        </div>

        {/* Weekly goal progress */}
        <div className="mt-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Weekly Goal</span>
            <span className="text-sm text-gray-500">
              {dashboard.weeklyGoal.completed}/{dashboard.weeklyGoal.target} sessions
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full"
              style={{ width: `${dashboard.weeklyGoal.percentage}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Time range selector */}
      <div className="flex justify-end">
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="border rounded-lg px-4 py-2"
        >
          <option value="7days">Last 7 days</option>
          <option value="30days">Last 30 days</option>
          <option value="90days">Last 90 days</option>
          <option value="1year">Last year</option>
        </select>
      </div>

      {/* Progress chart */}
      {progressChart && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Learning Progress</h2>
          <LearningTrends data={progressChart} />
        </div>
      )}

      {/* Study streak and recent activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Study Streak</h2>
          <StudyStreak currentStreak={dashboard.overview.currentStreak} />
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
          <SessionTracking activities={dashboard.recentActivity} />
        </div>
      </div>

      {/* Knowledge map */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Knowledge Map</h2>
        <KnowledgeMap />
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
import type { MessageDisplay, ConversationDisplay } from '../../types';

export class ChatClient {
  async startConversation(params: {
    agentType: string;
    topic?: string;
    preferences?: any;
  }): Promise<ConversationDisplay> {
    return await window.electronAPI.chat.startConversation(params);
  }

  async sendMessage(params: {
    conversationId: string;
    message: string;
    attachments?: any[];
  }): Promise<MessageDisplay> {
    return await window.electronAPI.chat.sendMessage(params);
  }

  async *sendMessageStream(params: {
    conversationId: string;
    message: string;
    attachments?: any[];
  }): AsyncIterable<string> {
    const stream = await window.electronAPI.chat.sendMessageStream(params);

    for await (const chunk of stream) {
      yield chunk;
    }
  }

  async getTypingIndicator(conversationId: string): Promise<{
    isTyping: boolean;
    agentInfo?: any;
  }> {
    return await window.electronAPI.chat.getTypingIndicator(conversationId);
  }

  async getConversationHistory(conversationId: string, options?: {
    limit?: number;
    before?: string;
    filter?: any;
  }): Promise<{ messages: MessageDisplay[] }> {
    return await window.electronAPI.chat.getConversationHistory(conversationId, options);
  }

  async pauseConversation(conversationId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    return await window.electronAPI.chat.pauseConversation(conversationId);
  }

  async resumeConversation(conversationId: string): Promise<{
    success: boolean;
    context: any;
  }> {
    return await window.electronAPI.chat.resumeConversation(conversationId);
  }

  async endConversation(conversationId: string): Promise<{
    summary: string;
    keyTopics: string[];
    duration: string;
    messageCount: number;
    suggestedFollowUps: string[];
  }> {
    return await window.electronAPI.chat.endConversation(conversationId);
  }
}

export const chatClient = new ChatClient();
```

## API Usage Best Practices

### 1. Error Handling
Always wrap API calls in try-catch blocks and use the centralized error handling:

```typescript
try {
  const session = await window.electronAPI.learning.startLearningSession({
    topic: 'React Hooks',
    goals: ['Understand useState', 'Learn useEffect'],
    difficulty: 'intermediate'
  });
  // Handle success
} catch (error) {
  window.electronAPI.handleError(error, 'startLearningSession');
  // Show user-friendly error message
  showErrorMessage('Failed to start learning session. Please try again.');
}
```

### 2. Loading States
Always show loading indicators during API calls:

```typescript
const [loading, setLoading] = useState(false);
const [session, setSession] = useState(null);

const startSession = async () => {
  setLoading(true);
  try {
    const newSession = await window.electronAPI.learning.startLearningSession(params);
    setSession(newSession);
  } catch (error) {
    window.electronAPI.handleError(error, 'startSession');
  } finally {
    setLoading(false);
  }
};
```

### 3. Progressive Enhancement
Load basic information first, then enhance with details:

```typescript
// Load session list quickly
const sessions = await window.electronAPI.learning.getRecentSessions({ limit: 10 });
displaySessionList(sessions);

// Then load detailed progress for visible sessions
sessions.forEach(async (session) => {
  const progress = await window.electronAPI.learning.getSessionProgress(session.id);
  updateSessionProgress(session.id, progress);
});
```

### 4. Streaming Patterns
Use streaming APIs for long-running operations:

```typescript
const sendMessage = async (message: string) => {
  // Add user message immediately
  addMessage({ role: 'user', content: message, status: 'sent' });

  // Add placeholder for assistant response
  const assistantId = addMessage({ role: 'assistant', content: '', status: 'typing' });

  try {
    const stream = await window.electronAPI.chat.sendMessageStream({
      conversationId,
      message
    });

    let response = '';
    for await (const chunk of stream) {
      response += chunk;
      updateMessage(assistantId, { content: response, status: 'streaming' });
    }

    updateMessage(assistantId, { content: response, status: 'completed' });
  } catch (error) {
    updateMessage(assistantId, {
      content: 'Sorry, I encountered an error. Please try again.',
      status: 'error'
    });
    window.electronAPI.handleError(error, 'sendMessage');
  }
};
```

## Business Logic Layer (Main Process)

### Backend Service Architecture
```
src/main/services/
├── langchain/
│   ├── langchain-service.ts     # Core LangChain orchestration
│   ├── ModelFactory.ts          # AI model abstraction
│   └── index.ts                 # LangChain exports
├── sessions/
│   ├── session-service.ts       # Session business logic
│   └── index.ts                 # Session exports
├── agents/
│   ├── agent-manager.ts         # Agent lifecycle and management
│   ├── AgentOrchestrator.ts     # Agent execution logic
│   ├── tool-executor.ts         # Tool execution management
│   ├── specialized/             # Specialized agent implementations
│   │   ├── learning-agent.ts
│   │   ├── tutoring-agent.ts
│   │   ├── assessment-agent.ts
│   │   └── practice-agent.ts
│   ├── tools/                   # Agent tools
│   │   ├── learning-tools.ts
│   │   └── assessment-tools.ts
│   ├── orchestration/           # Agent orchestration patterns
│   │   ├── tool-calling-orchestrator.ts
│   │   ├── handoff-orchestrator.ts
│   │   └── hybrid-orchestrator.ts
│   ├── types.ts                 # Agent type definitions
│   └── index.ts                 # Agent exports
├── catalyst/
│   ├── catalyst-service.ts      # Core AI orchestration and concept parsing
│   ├── ai-extractor.ts          # AI-powered content extraction
│   ├── langchain-adapter.ts     # LangChain integration layer
│   ├── pipeline.ts              # Content processing pipeline
│   └── index.ts                 # Catalyst exports
├── database/
│   ├── knowledge-service.ts     # Concept relationships and knowledge graph
│   ├── qdrant-service.ts        # Vector database operations
│   ├── kysely-database.ts       # SQLite database operations
│   ├── kysely-schema.ts         # Database schema definitions
│   ├── migrations/              # Database migrations
│   │   ├── 20251029_create_achievements.ts
│   │   ├── 20251029_create_analytics.ts
│   │   ├── 20251029_create_categories.ts
│   │   ├── 20251029_create_concepts.ts
│   │   ├── 20251029_create_knowledge_graph_cache.ts
│   │   ├── 20251029_create_learning_sessions.ts
│   │   ├── 20251029_create_messages.ts
│   │   ├── 20251029_create_relationships.ts
│   │   ├── 20251029_create_session_concepts.ts
│   │   ├── 20251029_create_settings.ts
│   │   ├── 20251029_create_user_stats.ts
│   │   ├── 20251030_create_concept_progress.ts
│   │   ├── 20251102_create_checkpoints.ts
│   │   └── index.ts
│   └── index.ts                 # Database exports
├── checkpoints/
│   ├── SQLiteCheckpointSaver.ts # Checkpoint persistence
│   ├── checkpoint-index.ts      # Checkpoint management
│   └── index.ts                 # Checkpoint exports
├── config.ts                    # Configuration management
├── logger.ts                    # Application logging
├── registry.ts                  # Service registry
└── index.ts                     # Main services exports
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

### Comprehensive Display-Optimized IPC Handlers
```typescript
// src/main/handlers/display-handlers.ts
export function setupDisplayHandlers() {
  // Initialize services with proper dependency injection
  const dbService = new DatabaseService();
  const knowledgeService = new KnowledgeGraphService(dbService);
  const sessionService = new SessionService(dbService, knowledgeService, configService);
  const agentOrchestrator = new AgentOrchestrator(
    agentManager,
    toolExecutor,
    knowledgeService,
    langChainService
  );

  // ===== Chat & Conversation Handlers =====

  ipcMain.handle('chat:start-conversation', async (_, { agentType, topic, preferences }) => {
    try {
      console.log(`[DisplayHandlers] chat:start-conversation - agentType: ${agentType}`);

      const conversation = await sessionService.createConversation({
        agentType,
        topic,
        preferences
      });

      return {
        id: conversation.id,
        agent: conversation.agent,
        status: conversation.status,
        createdAt: conversation.createdAt,
        messages: conversation.messages,
        suggestedTopics: conversation.suggestedTopics
      };
    } catch (error) {
      console.error('[DisplayHandlers] chat:start-conversation error:', error);
      throw error; // Let the centralized error handler catch this
    }
  });

  ipcMain.handle('chat:send-message', async (_, { conversationId, message, attachments }) => {
    try {
      console.log(`[DisplayHandlers] chat:send-message - conversationId: ${conversationId}`);

      // Add user message
      const userMessage = await sessionService.addMessage(conversationId, {
        content: message,
        role: 'user',
        attachments
      });

      // Trigger agent response
      const agentResponse = await agentOrchestrator.executeAgent({
        agentId: 'learning-agent',
        input: message,
        sessionId: conversationId,
        context: {
          conversationId,
          attachments,
          userPreferences: {
            responseStyle: 'conversational',
            difficultyLevel: 'intermediate',
            language: 'en',
            enableFollowUpQuestions: true,
            enableExamples: true,
            enableAnalogies: true
          }
        }
      });

      // Add assistant message
      const assistantMessage = await sessionService.addMessage(conversationId, {
        content: agentResponse.response,
        role: 'assistant',
        agentInfo: {
          type: 'learning',
          avatar: '🎓',
          color: '#3B82F6'
        }
      });

      return {
        success: true,
        messageId: assistantMessage.id,
        response: agentResponse.response
      };
    } catch (error) {
      console.error('[DisplayHandlers] chat:send-message error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  ipcMain.handle('chat:get-typing-indicator', async (_, conversationId) => {
    try {
      const typing = await sessionService.getTypingIndicator(conversationId);
      return {
        isTyping: typing.isTyping,
        agentInfo: typing.agentInfo
      };
    } catch (error) {
      return { isTyping: false };
    }
  });

  // ===== Learning & Sessions Handlers =====

  ipcMain.handle('learning:start-session', async (_, { topic, goals, difficulty, agentType, learningStyle }) => {
    try {
      console.log(`[DisplayHandlers] learning:start-session - topic: ${topic}`);

      const session = await sessionService.createLearningSession({
        topic,
        goals,
        difficulty,
        agentType,
        learningStyle
      });

      return {
        id: session.id,
        topic: session.topic,
        goals: session.goals,
        difficulty: session.difficulty,
        status: session.status,
        progress: session.progress,
        estimatedDuration: session.estimatedDuration,
        agent: session.agent
      };
    } catch (error) {
      console.error('[DisplayHandlers] learning:start-session error:', error);
      throw error;
    }
  });

  ipcMain.handle('learning:get-progress', async (_, sessionId) => {
    try {
      const progress = await sessionService.getSessionProgress(sessionId);
      return {
        sessionId: progress.sessionId,
        percentage: progress.percentage,
        completedGoals: progress.completedGoals,
        currentGoal: progress.currentGoal,
        remainingGoals: progress.remainingGoals,
        timeSpent: progress.timeSpent,
        conceptsMastered: progress.conceptsMastered,
        strugglingConcepts: progress.strugglingConcepts,
        achievements: progress.achievements
      };
    } catch (error) {
      console.error('[DisplayHandlers] learning:get-progress error:', error);
      throw error;
    }
  });

  ipcMain.handle('learning:search-sessions', async (_, { query, filters }) => {
    try {
      const result = await sessionService.searchSessions(query, filters);
      return {
        sessions: result.sessions.map(session => transformToDisplaySession(session)),
        total: result.total,
        hasMore: result.hasMore
      };
    } catch (error) {
      console.error('[DisplayHandlers] learning:search-sessions error:', error);
      return {
        sessions: [],
        total: 0,
        hasMore: false,
        error: error.message
      };
    }
  });

  // ===== Knowledge & Discovery Handlers =====

  ipcMain.handle('knowledge:explore-concept', async (_, { conceptName, depth }) => {
    try {
      const concept = await knowledgeService.exploreConcept(conceptName, depth);
      return {
        concept: concept.concept,
        definition: concept.definition,
        keyPoints: concept.keyPoints,
        relatedConcepts: concept.relatedConcepts,
        examples: concept.examples,
        difficulty: concept.difficulty,
        estimatedLearningTime: concept.estimatedLearningTime
      };
    } catch (error) {
      console.error('[DisplayHandlers] knowledge:explore-concept error:', error);
      throw error;
    }
  });

  ipcMain.handle('knowledge:get-map', async (_, sessionId) => {
    try {
      const knowledgeMap = await knowledgeService.getKnowledgeMap(sessionId);
      return {
        nodes: knowledgeMap.nodes,
        edges: knowledgeMap.edges,
        layout: knowledgeMap.layout,
        clusters: knowledgeMap.clusters
      };
    } catch (error) {
      console.error('[DisplayHandlers] knowledge:get-map error:', error);
      throw error;
    }
  });

  // ===== Analytics & Progress Handlers =====

  ipcMain.handle('analytics:get-dashboard', async () => {
    try {
      const dashboard = await analyticsService.getDashboard();
      return {
        overview: dashboard.overview,
        recentActivity: dashboard.recentActivity,
        upcomingGoals: dashboard.upcomingGoals,
        weeklyGoal: dashboard.weeklyGoal
      };
    } catch (error) {
      console.error('[DisplayHandlers] analytics:get-dashboard error:', error);
      throw error;
    }
  });

  ipcMain.handle('analytics:get-progress-chart', async (_, { timeRange, topic }) => {
    try {
      const chartData = await analyticsService.getProgressChart(timeRange, topic);
      return {
        timeRange: chartData.timeRange,
        topic: chartData.topic,
        chartType: chartData.chartType,
        data: chartData.data,
        summary: chartData.summary
      };
    } catch (error) {
      console.error('[DisplayHandlers] analytics:get-progress-chart error:', error);
      throw error;
    }
  });

  // ===== Agent Management Handlers =====

  ipcMain.handle('agents:get-available', async () => {
    try {
      const agents = await agentOrchestrator.getAvailableAgents();
      return agents.map(agent => ({
        id: agent.id,
        type: agent.type,
        name: agent.name,
        description: agent.description,
        avatar: agent.avatar,
        color: agent.color,
        capabilities: agent.capabilities,
        isAvailable: agent.isAvailable,
        category: agent.category,
        stats: agent.stats
      }));
    } catch (error) {
      console.error('[DisplayHandlers] agents:get-available error:', error);
      return [];
    }
  });

  // ===== Content & Discovery Handlers =====

  ipcMain.handle('content:explore-projects', async () => {
    try {
      const projects = await contentService.exploreLocalProjects();
      return projects.map(project => ({
        id: project.id,
        name: project.name,
        path: project.path,
        type: project.type,
        technologies: project.technologies,
        estimatedLearningValue: project.estimatedLearningValue,
        contentSummary: project.contentSummary,
        lastModified: project.lastModified
      }));
    } catch (error) {
      console.error('[DisplayHandlers] content:explore-projects error:', error);
      return [];
    }
  });

  // ===== Settings & Configuration Handlers =====

  ipcMain.handle('settings:get-user-preferences', async () => {
    try {
      const preferences = await configService.getUserPreferences();
      return {
        profile: preferences.profile,
        learning: preferences.learning,
        interface: preferences.interface,
        privacy: preferences.privacy
      };
    } catch (error) {
      console.error('[DisplayHandlers] settings:get-user-preferences error:', error);
      throw error;
    }
  });

  ipcMain.handle('settings:configure-provider', async (_, { provider, config }) => {
    try {
      const result = await configService.configureProvider(provider, config);
      return {
        success: true,
        providerId: result.providerId,
        status: result.status
      };
    } catch (error) {
      console.error('[DisplayHandlers] settings:configure-provider error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // ===== Streaming Chat Implementation =====

  ipcMain.handle('chat:start-stream', async (event, { conversationId, message, attachments }) => {
    try {
      console.log(`[DisplayHandlers] chat:start-stream - conversationId: ${conversationId}`);

      const { port1, port2 } = new MessageChannelMain();

      // Start streaming in background
      agentOrchestrator.executeAgentStream({
        agentId: 'learning-agent',
        input: message,
        sessionId: conversationId,
        context: {
          conversationId,
          attachments,
          userPreferences: {
            responseStyle: 'conversational',
            difficultyLevel: 'intermediate',
            language: 'en',
            enableFollowUpQuestions: true,
            enableExamples: true,
            enableAnalogies: true
          }
        },
        onChunk: (chunk) => {
          port1.postMessage({ type: 'chunk', data: chunk });
        },
        onComplete: async (fullResponse) => {
          // Save complete message
          await sessionService.addMessage(conversationId, {
            content: fullResponse,
            role: 'assistant',
            agentInfo: {
              type: 'learning',
              avatar: '🎓',
              color: '#3B82F6'
            }
          });

          port1.postMessage({ type: 'end' });
          port1.close();
        },
        onError: (error) => {
          console.error('[DisplayHandlers] Stream error:', error);
          port1.postMessage({ type: 'error', error: error.message });
          port1.close();
        }
      });

      // Send port to renderer
      event.senderFrame.postMessage('chat:stream-ready', [], [port2]);

    } catch (error) {
      console.error('[DisplayHandlers] chat:start-stream setup error:', error);
      event.sender.send('chat:stream-error', { error: error.message });
    }
  });

  // Helper function to transform session data for display
  function transformToDisplaySession(session) {
    return {
      id: session.id,
      title: session.title,
      preview: generatePreview(session),
      messageCount: session.messageCount,
      lastActivity: formatRelativeTime(session.updatedAt),
      duration: formatDuration(session.duration),
      difficulty: session.metadata.difficulty,
      tags: session.metadata.tags,
      isActive: session.isActive,
      hasUnreadMessages: session.unreadCount > 0,
      agentType: session.agentType,
      color: getAgentColor(session.agentType)
    };
  }
}
```

### Comprehensive Preload API
```typescript
// src/main/preload/comprehensive-api.ts
const comprehensiveAPI = {
  // Chat & Conversation API
  chat: {
    startConversation: ({ agentType, topic, preferences }) =>
      ipcRenderer.invoke('chat:start-conversation', { agentType, topic, preferences }),

    sendMessage: ({ conversationId, message, attachments }) =>
      ipcRenderer.invoke('chat:send-message', { conversationId, message, attachments }),

    sendMessageStream: ({ conversationId, message, attachments }) => {
      return new Promise((resolve) => {
        const streamReadyHandler = (event: any) => {
          const port = event.ports[0];
          const stream = {
            async *[Symbol.asyncIterator]() {
              const messageHandler = (event: MessageEvent) => {
                const { type, data, error } = event.data;
                switch (type) {
                  case 'chunk': queue.push(data); break;
                  case 'end': done = true; port.close(); break;
                  case 'error': throw new Error(error);
                }
              };
              port.onmessage = messageHandler;
              port.start();
              const queue: string[] = []; let done = false;
              while (!done) {
                if (queue.length > 0) yield queue.shift()!;
                else await new Promise(r => setTimeout(r, 10));
              }
            }
          };
          resolve(stream);
          ipcRenderer.removeListener('chat:stream-ready', streamReadyHandler);
        };
        ipcRenderer.on('chat:stream-ready', streamReadyHandler);
        ipcRenderer.send('chat:start-stream', { conversationId, message, attachments });
      });
    },

    getTypingIndicator: (conversationId) =>
      ipcRenderer.invoke('chat:get-typing-indicator', conversationId),

    getConversationHistory: (conversationId, options) =>
      ipcRenderer.invoke('chat:get-history', { conversationId, ...options }),

    pauseConversation: (conversationId) =>
      ipcRenderer.invoke('chat:pause-conversation', conversationId),

    resumeConversation: (conversationId) =>
      ipcRenderer.invoke('chat:resume-conversation', conversationId),

    endConversation: (conversationId) =>
      ipcRenderer.invoke('chat:end-conversation', conversationId)
  },

  // Learning & Sessions API
  learning: {
    startLearningSession: ({ topic, goals, difficulty, agentType, learningStyle }) =>
      ipcRenderer.invoke('learning:start-session', { topic, goals, difficulty, agentType, learningStyle }),

    getSessionProgress: (sessionId) =>
      ipcRenderer.invoke('learning:get-progress', sessionId),

    getLearningPath: (sessionId) =>
      ipcRenderer.invoke('learning:get-path', sessionId),

    pauseSession: (sessionId) =>
      ipcRenderer.invoke('learning:pause-session', sessionId),

    resumeSession: (sessionId) =>
      ipcRenderer.invoke('learning:resume-session', sessionId),

    completeSession: (sessionId) =>
      ipcRenderer.invoke('learning:complete-session', sessionId),

    getRecentSessions: (options) =>
      ipcRenderer.invoke('learning:get-recent-sessions', options),

    searchSessions: (query, filters) =>
      ipcRenderer.invoke('learning:search-sessions', { query, filters })
  },

  // Knowledge & Discovery API
  knowledge: {
    exploreConcept: (conceptName, depth) =>
      ipcRenderer.invoke('knowledge:explore-concept', { conceptName, depth }),

    getRelatedConcepts: (conceptId) =>
      ipcRenderer.invoke('knowledge:get-related-concepts', conceptId),

    getKnowledgeMap: (sessionId) =>
      ipcRenderer.invoke('knowledge:get-map', sessionId),

    searchKnowledge: (query) =>
      ipcRenderer.invoke('knowledge:search', query),

    getExplanation: (conceptId, style) =>
      ipcRenderer.invoke('knowledge:get-explanation', { conceptId, style }),

    getPracticeExercises: (conceptId, difficulty) =>
      ipcRenderer.invoke('knowledge:get-exercises', { conceptId, difficulty })
  },

  // Analytics & Progress API
  analytics: {
    getDashboard: () =>
      ipcRenderer.invoke('analytics:get-dashboard'),

    getProgressChart: (timeRange, topic) =>
      ipcRenderer.invoke('analytics:get-progress-chart', { timeRange, topic }),

    getAchievements: () =>
      ipcRenderer.invoke('analytics:get-achievements'),

    unlockAchievement: (achievementId) =>
      ipcRenderer.invoke('analytics:unlock-achievement', achievementId),

    getUsageStats: (timeRange) =>
      ipcRenderer.invoke('analytics:get-usage-stats', timeRange),

    getTokenUsage: (timeRange) =>
      ipcRenderer.invoke('analytics:get-token-usage', timeRange)
  },

  // Agent Management API
  agents: {
    getAvailableAgents: () =>
      ipcRenderer.invoke('agents:get-available'),

    selectAgentForSession: (sessionId, agentType) =>
      ipcRenderer.invoke('agents:select-for-session', { sessionId, agentType }),

    setAgentPersonality: (agentId, personality) =>
      ipcRenderer.invoke('agents:set-personality', { agentId, personality }),

    setResponseStyle: (sessionId, style) =>
      ipcRenderer.invoke('agents:set-response-style', { sessionId, style }),

    getAgentCapabilities: (agentId) =>
      ipcRenderer.invoke('agents:get-capabilities', agentId),

    tryAgentFeature: (agentId, feature) =>
      ipcRenderer.invoke('agents:try-feature', { agentId, feature })
  },

  // Content & Discovery API
  content: {
    exploreLocalProjects: () =>
      ipcRenderer.invoke('content:explore-projects'),

    importLearningContent: (files) =>
      ipcRenderer.invoke('content:import-content', files),

    getRecommendedContent: (topic, level) =>
      ipcRenderer.invoke('content:get-recommendations', { topic, level }),

    searchLearningResources: (query) =>
      ipcRenderer.invoke('content:search-resources', query),

    analyzeDocument: (filePath) =>
      ipcRenderer.invoke('content:analyze-document', filePath),

    extractConcepts: (content) =>
      ipcRenderer.invoke('content:extract-concepts', content)
  },

  // Settings & Configuration API
  settings: {
    getUserPreferences: () =>
      ipcRenderer.invoke('settings:get-user-preferences'),

    updatePreferences: (preferences) =>
      ipcRenderer.invoke('settings:update-preferences', preferences),

    getAvailableProviders: () =>
      ipcRenderer.invoke('settings:get-providers'),

    configureProvider: (provider, config) =>
      ipcRenderer.invoke('settings:configure-provider', { provider, config }),

    getLearningSettings: () =>
      ipcRenderer.invoke('settings:get-learning-settings'),

    updateLearningSettings: (settings) =>
      ipcRenderer.invoke('settings:update-learning-settings', settings)
  },

  // Utility methods for better error handling and debugging
  handleError: (error: Error | string, context: string, severity: string = 'error') => {
    const errorMessage = error instanceof Error ? error.message : error;
    const stack = error instanceof Error ? error.stack : undefined;

    console.error(`[Frontend] ${context}:`, error);

    // Report error to backend for analytics and debugging
    ipcRenderer.invoke('system:report-error', {
      error: errorMessage,
      context,
      stack,
      severity,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    });
  },

  healthCheck: () =>
    ipcRenderer.invoke('system:health-check'),

  getVersion: () =>
    ipcRenderer.invoke('system:get-version'),

  trackEvent: (event: { name: string, properties?: object }) =>
    ipcRenderer.invoke('analytics:track-event', event)
};

// Expose the complete API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', comprehensiveAPI);
```

## Refined Frontend/Backend API Responsibilities with Documentation

### Frontend Responsibilities (Renderer Process)
**What the Frontend Handles:**
- **UI State Management**: Component state, transitions, animations
- **User Interactions**: Input handling, form validation, user feedback
- **Presentation Logic**: Layout, styling, responsive design
- **Data Display**: Formatting, sorting, filtering of UI-ready data
- **Real-time Updates**: Streaming responses, loading states, progress indicators
- **Error Handling**: User-friendly error messages, recovery options

### Backend Responsibilities (Main Process)
**What the Backend Handles:**
- **Business Logic**: AI agent orchestration, knowledge processing
- **Data Management**: Database operations, file system access, vector storage
- **Complex Computations**: Content analysis, concept extraction, learning analytics
- **Security & Validation**: Input sanitization, permission checks, API key management
- **Service Integration**: AI provider communication, external API calls
- **Performance Optimization**: Caching, batching, resource management

## Implementation Roadmap

### Current Implementation Status
**✅ COMPLETED** - The core UI/Main separation architecture is already implemented:

**✅ Phase 1: Foundation Setup**
- UI Data Models implemented in `src/renderer/types/`
- Business Services implemented in `src/main/services/`
- Zustand state management in `src/renderer/stores/`

**✅ Phase 2: API Layer Implementation**
- Display-optimized IPC handlers in `src/main/handlers/display-handlers.ts`
- UI service wrappers implemented
- Core UI components implemented

**✅ Phase 3: Core Features**
- Chat interface with streaming support
- Session management with search and filtering
- Agent selection and management
- Knowledge graph visualization
- Analytics and progress tracking

### Remaining Implementation Tasks

#### Phase 4: Advanced Features (2-3 days)
1. **Enhanced Knowledge Graph Integration**
   - Interactive concept exploration
   - Advanced learning progress tracking
   - Knowledge relationship visualization

2. **Advanced Agent Features**
   - Multi-agent conversations
   - Dynamic agent switching within sessions
   - Custom agent configurations
   - Agent handoff mechanisms

3. **Real-time Collaboration**
   - Live typing indicators
   - Real-time message updates
   - Presence awareness
   - Session sharing capabilities

#### Phase 5: Polish & Optimization (1-2 days)
1. **Performance Optimization**
   - Lazy loading for large datasets
   - Virtual scrolling for long lists
   - Memory optimization for media-rich content
   - Response caching strategies

2. **UI/UX Refinement**
   - Smooth animations and transitions
   - Enhanced loading states and skeleton screens
   - Improved error states and recovery options
   - Accessibility improvements

3. **Testing & Validation**
   - Expand unit tests for business logic
   - Add integration tests for API layer
   - Implement E2E tests for complete workflows
   - Performance testing and optimization

## Success Metrics

### Developer Experience
- [x] UI components require no business logic knowledge
- [x] New features can be built with UI-only changes
- [x] Business logic changes don't break UI components
- [x] Clear separation between data and presentation

### User Experience
- [x] Instant UI feedback for all interactions
- [x] Smooth real-time updates without jank
- [x] Intuitive agent selection and switching
- [x] Seamless session management and search

### Technical Excellence
- [x] Type-safe communication between processes
- [x] Comprehensive error handling and recovery
- [x] Performance metrics meet targets
- [x] Architecture supports future scalability

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
