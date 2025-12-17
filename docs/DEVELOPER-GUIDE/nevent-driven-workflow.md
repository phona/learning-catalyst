# Event-Driven Workflow & Agent State System

## Overview

Learning Catalyst uses a sophisticated **event-driven architecture** to broadcast real-time agent states, workflow progress, and tool execution details to the renderer process. This system provides transparency into AI agent operations while maintaining a clean separation between the main process (where agents run) and the renderer process (where the UI displays information).

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│ Main Process (Node.js/Electron)                                │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐  ┌──────────────────────────────────┐ │
│  │ Chat Service        │  │ TimelineCallbackHandler          │ │
│  │ (chat-service.ts)   │  │ (LangChain callback)             │ │
│  │                     │  │                                  │ │
│  │ • Manages workflow  │  │ • Captures agent actions         │ │
│  │ • Orchestrates      │  │ • Emits timeline events          │ │
│  │   multi-agent flows │  │ • Tracks tool execution          │ │
│  └─────────────────────┘  └──────────────────────────────────┘ │
│            │                          │                       │
│            │ emitStatus()             │                       │
│            ↓                          │                       │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ IPC Handlers (chat-handlers.ts)                         │ │
│  │                                                          │ │
│  │ • Receives events from Chat Service                      │ │
│  │ • Bridges to MessageChannel                              │ │
│  │ • Serializes events for IPC                              │ │
│  └──────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                               │ MessageChannel
                               ↓ IPC
┌─────────────────────────────────────────────────────────────────┐
│ Renderer Process (Browser/React)                                │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐  ┌──────────────────────────────────┐ │
│  │ useTimeline Hook    │  │ TimelineStore (Zustand)          │ │
│  │ (useTimeline.ts)    │  │                                  │ │
│  │                     │  │ • eventsByConversation           │ │
│  │ • Listens to IPC    │  │ • activeStatesByConversation     │ │
│  │ • Processes events  │  │ • addEvent(), setState()         │ │
│  │ • Updates store     │  │                                  │ │
│  └─────────────────────┘  └──────────────────────────────────┘ │
│            │                          │                       │
│            │ Store update             │                       │
│            ↓                          │                       │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ UI Components                                             │ │
│  │                                                          │ │
│  │ • TimelineView - Agent processing visualization          │ │
│  │ • ToolCall - Tool execution tracking                     │ │
│  │ • ChatProcessingOverlay - Inline trace                   │ │
│  └──────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Core Components

#### 1. **TimelineCallbackHandler**
**Location:** `src/main/services/agent/timeline-callback-handler.ts`

LangChain callback handler that intercepts agent actions and tool executions:

```typescript
export class TimelineCallbackHandler extends BaseCallbackHandler {
  name = 'TimelineCallbackHandler';
  private currentToolName: string | null = null;

  constructor(
    private onStatus: (status: ChatStatus) => void,
    private agentName: string = 'Agent'
  ) {
    super();
  }

  // Called when agent performs an action (thought or tool)
  onAgentAction(action: any): void | Promise<void> {
    // Emit thought events
    const thought: string | undefined = action?.log;
    if (thought && thought.length > 0) {
      this.emitTimelineEvent({
        type: 'thought',
        text: thought,
        expandable: true,
      });
    }

    // Emit tool start events
    const toolName: string | undefined = action?.tool;
    if (toolName && toolName.length > 0) {
      this.currentToolName = toolName;
      this.emitTimelineEvent({
        type: 'tool',
        tool: toolName,
        phase: 'start',
        detail: action.tool_input
          ? JSON.stringify(action.tool_input, null, 2)
          : undefined,
        expandable: true,
      });
      this.emitStateChange(`Executing: ${toolName}`);
    }
  }

  // Called when tool completes successfully
  onToolEnd(output: any): void | Promise<void> {
    this.emitTimelineEvent({
      type: 'tool',
      tool: this.currentToolName || 'unknown',
      phase: 'end',
      detail: typeof output === 'string'
        ? output
        : JSON.stringify(output, null, 2),
      expandable: true,
    });
    this.emitStateChange('Complete');
    this.currentToolName = null;
  }

  // Called when tool fails
  onToolError(err: any): void | Promise<void> {
    this.emitTimelineEvent({
      type: 'tool',
      tool: this.currentToolName || 'unknown',
      phase: 'error',
      detail: err?.message ? String(err.message) : String(err),
      expandable: true,
    });
    this.emitStateChange('Error');
    this.currentToolName = null;
  }
}
```

#### 2. **IPC Handlers**
**Location:** `src/main/handlers/chat-handlers.ts`

Bridges events from main process to renderer via MessageChannel:

```typescript
ipcMainInstance.on('chat:start-stream', async (event, params: SendMessageStreamParams) => {
  const channel = new MessageChannelMain();
  event.sender.postMessage('chat:stream-ready', null, [channel.port1]);
  channel.port2.start();

  const emitStatus = (status: ChatStatus) => {
    if (activeStreams.has(params.conversationId)) {
      try {
        // Serialize and send event via MessageChannel
        channel.port2.postMessage({ type: 'chat:status', status });
      } catch {}
    }
  };

  try {
    const result = await services.chatService.streamAssistantResponse({
      conversationId: params.conversationId,
      content: params.message,
      onStatus: emitStatus,  // Pass callback to Chat Service
    });

    // Stream content chunks
    const { stream } = result;
    for await (const chunk of stream) {
      if (activeStreams.has(params.conversationId)) {
        channel.port2.postMessage({ type: 'chat:chunk', chunk });
      }
    }
  } finally {
    activeStreams.delete(params.conversationId);
    channel.port2.close();
  }
});
```

#### 3. **useTimeline Hook**
**Location:** `src/renderer/hooks/useTimeline.ts**

Listens for events from main process and updates store:

```typescript
export function useTimeline(conversationId: string | null) {
  const addEvent = useTimelineStore((state) => state.addEvent);
  const setState = useTimelineStore((state) => state.setState);

  useEffect(() => {
    if (!conversationId) return;

    // Listen to MessageChannel messages
    const handleMessage = (event: MessageEvent) => {
      const { data } = event;
      if (!data || typeof data !== 'object') return;

      // Handle timeline events
      if (data.type === 'chat:status' && data.status) {
        const status = data.status as ChatStatus;

        if (status.type === 'timeline_event') {
          // Add event to store for TimelineView
          addEvent(conversationId, status.event);
        } else if (status.type === 'timeline_state') {
          // Update active state for current indicator
          setState(conversationId, status.state);
        }
      }
    };

    // Listen to global window message event
    // MessageChannel messages arrive here
    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [conversationId, addEvent, setState]);
}
```

#### 4. **TimelineStore**
**Location:** `src/renderer/stores/chat/timelineStore.ts`

Zustand store managing timeline state:

```typescript
interface TimelineState {
  eventsByConversation: Record<string, TimelineEventPayload[]>;
  activeStatesByConversation: Record<string, string>;

  addEvent: (conversationId: string, event: TimelineEventPayload) => void;
  setState: (conversationId: string, state: string) => void;
  clearConversation: (conversationId: string) => void;
}

export const useTimelineStore = create<TimelineState>((set) => ({
  eventsByConversation: {},
  activeStatesByConversation: {},

  addEvent: (conversationId, event) =>
    set((state) => ({
      eventsByConversation: {
        ...state.eventsByConversation,
        [conversationId]: [
          ...(state.eventsByConversation[conversationId] || []),
          event,
        ],
      },
    })),

  setState: (conversationId, state) =>
    set((prev) => ({
      activeStatesByConversation: {
        ...prev.activeStatesByConversation,
        [conversationId]: state,
      },
    })),
}));
```

## Event Types

### 1. Timeline Events
**Purpose:** Track agent actions, thoughts, and tool executions

```typescript
interface TimelineEventPayload {
  id: string;                    // Unique event ID
  type: 'thought' | 'tool' | 'error' | 'state';
  agent: string;                 // Agent type (learning, tutoring, etc.)
  timestamp: number;             // Unix timestamp
  text?: string;                 // Event description
  tool?: string;                 // Tool name (for tool events)
  phase?: 'start' | 'end' | 'error';  // Tool execution phase
  detail?: string;               // Expandable details (JSON, logs, etc.)
  expandable?: boolean;          // Whether details can be shown
}
```

**Example Events:**

```typescript
// Thought Event
{
  id: 'event_1703123456789_abc123',
  type: 'thought',
  agent: 'learning',
  timestamp: 1703123456789,
  text: 'Let me search for TypeScript learning resources',
  expandable: true,
  detail: 'User asked about learning TypeScript. I should search the knowledge base for beginner-friendly resources and tutorials.'
}

// Tool Start Event
{
  id: 'event_1703123456890_def456',
  type: 'tool',
  agent: 'learning',
  timestamp: 1703123456890,
  tool: 'knowledge.search',
  phase: 'start',
  detail: '{"query": "TypeScript basics tutorial", "limit": 5, "filters": {"difficulty": "beginner"}}',
  expandable: true
}

// Tool End Event
{
  id: 'event_1703123457123_ghi789',
  type: 'tool',
  agent: 'learning',
  timestamp: 1703123457123,
  tool: 'knowledge.search',
  phase: 'end',
  detail: '{"results": [{"title": "TypeScript Handbook", "url": "..."}, ...], "total": 3}',
  expandable: true
}

// Error Event
{
  id: 'event_1703123457789_jkl012',
  type: 'error',
  agent: 'learning',
  timestamp: 1703123457789,
  text: 'Failed to fetch knowledge base',
  detail: 'Network error: Unable to connect to knowledge service',
  expandable: true
}
```

### 2. Timeline State Events
**Purpose:** Show current active operation

```typescript
{
  type: 'timeline_state',
  state: 'Executing: knowledge.search',
  agent: 'learning'
}
```

### 3. Chat Status Events
**Purpose:** Provide real-time feedback on chat operation

```typescript
// Retry Status
{
  type: 'retry',
  attempt: 2,
  max: 3,
  reason: 'Rate limit exceeded'
}

// Tool Status
{
  type: 'tool',
  phase: 'start' | 'end' | 'error',
  tool: 'knowledge.search',
  detail: 'Searching for TypeScript tutorials...',
  durationMs: 450,
  agent: 'learning',
  expandable: true
}

// Tip Status
{
  type: 'tip',
  text: '💡 You can attach files to your messages for context'
}

// Failure Status
{
  type: 'fail',
  category: 'auth' | 'quota' | 'timeout' | 'network' | 'tool_fail' | 'validation' | 'unknown',
  suggestion: 'Please check your API key configuration'
}

// Thought Status
{
  type: 'thought',
  text: 'I should search for TypeScript resources before answering',
  agent: 'learning',
  expandable: true
}

// Await User Input (Workflow Pause)
{
  type: 'await_user_input',
  prompt: 'What is your current experience with JavaScript?',
  sessionId: 'session_123',
  checkpointId: 'checkpoint_456',
  questionId: 'q_789'
}
```

## Event Flow

### Complete Workflow Example

**User Query:** "How do I learn TypeScript?"

```
Main Process                                    Renderer Process
─────────────                                    ────────────────

User sends message
│
├─ Chat Service receives
│
├─ TimelineCallbackHandler created
│  └─ agentName: 'learning'
│
├─ streamAssistantResponse() called
│  └─ Config: { callbacks: [timelineCallback] }
│
├─ Agent starts processing
│
├─ onAgentAction() called
│  └─ emitTimelineEvent({
│       type: 'thought',
│       text: 'Let me assess user knowledge...',
│       expandable: true
│     })
│
│  └─ Timeline event → MessageChannel → Window message
│                                                    │
│                                                    ├─ useTimeline() receives
│                                                    ├─ timelineStore.addEvent()
│                                                    └─ TimelineView re-renders
│                                                         └─ Shows: 💭 "Let me assess user knowledge..."
│
├─ Tool execution starts
│
├─ onAgentAction() called again
│  └─ emitTimelineEvent({
│       type: 'tool',
│       tool: 'knowledge.search',
│       phase: 'start',
│       detail: '{"query": "TypeScript tutorial"}',
│       expandable: true
│     })
│
│  └─ emitStateChange('Executing: knowledge.search')
│
│  └─ Timeline events → IPC → Renderer
│                                                    │
│                                                    ├─ addEvent() called
│                                                    ├─ setState() called
│                                                    └─ TimelineView updates
│                                                         ├─ Shows: 🔧 "knowledge.search [START]"
│                                                         └─ Shows: "Executing: knowledge.search"
│
├─ Tool completes
│
├─ onToolEnd() called
│  └─ emitTimelineEvent({
│       type: 'tool',
│       tool: 'knowledge.search',
│       phase: 'end',
│       detail: '{"results": [...]}',
│       expandable: true
│     })
│
│  └─ emitStateChange('Complete')
│
│  └─ Timeline events → IPC → Renderer
│                                                    │
│                                                    ├─ addEvent() called
│                                                    ├─ setState() called
│                                                    └─ TimelineView updates
│                                                         └─ Shows: ✓ "knowledge.search [END]"
│
├─ More thoughts...
│
├─ Response generated
│
└─ Stream complete
```

## UI Integration

### TimelineView Component
**Location:** `src/renderer/components/Timeline/TimelineView.tsx`

Displays all timeline events for a conversation:

```typescript
export function TimelineView({ conversationId }: TimelineViewProps) {
  // Subscribe to timeline updates
  useTimeline(conversationId);

  // Get events from store
  const events = useTimelineStore(
    (state) => state.eventsByConversation[conversationId] || []
  );
  const activeState = useTimelineStore(
    (state) => state.activeStatesByConversation[conversationId]
  );

  if (events.length === 0) {
    return null;  // Don't show if no events
  }

  return (
    <div className="timeline-container border border-gray-200 rounded-lg p-4 mb-4">
      <div className="timeline-header">
        <h3>Agent Processing</h3>
        {activeState && (
          <div className="active-state">
            <span className="pulse-dot">●</span>
            {activeState}
          </div>
        )}
      </div>

      <div className="timeline-events">
        {events.map((event) => {
          if (event.type === 'tool') {
            return <ToolCall key={event.id} event={event} />;
          }
          return null;
        })}
      </div>
    </div>
  );
}
```

### ToolCall Component
**Location:** `src/renderer/components/Timeline/ToolCall.tsx`

Renders tool execution:

```typescript
export function ToolCall({ event }: ToolCallProps) {
  const [expanded, setExpanded] = useState(false);

  const getPhaseIcon = () => {
    switch (event.phase) {
      case 'start':
        return '🔧';
      case 'end':
        return '✓';
      case 'error':
        return '✗';
      default:
        return '⏳';
    }
  };

  const getPhaseClass = () => {
    switch (event.phase) {
      case 'start':
        return 'border-l-yellow-400';
      case 'end':
        return 'border-l-green-400';
      case 'error':
        return 'border-l-red-400';
      default:
        return '';
    }
  };

  return (
    <div className={`timeline-event tool-call ${getPhaseClass()}`}>
      <div className="event-header">
        <span className="icon">{getPhaseIcon()}</span>
        <span className="agent-name">{event.agent}</span>
        <span className="tool-name">{event.tool}</span>
        <span className="phase-label">
          {event.phase?.toUpperCase() || 'PENDING'}
        </span>
      </div>

      {event.expandable && event.detail && (
        <button onClick={() => setExpanded(!expanded)}>
          {expanded ? '▼ Hide I/O' : '▶ Show I/O'}
        </button>
      )}

      {expanded && event.detail && (
        <pre className="tool-detail">{event.detail}</pre>
      )}
    </div>
  );
}
```

### ChatProcessingOverlay Component
**Location:** `src/renderer/components/Chat/ChatProcessingOverlay.tsx**

Shows inline processing trace during streaming:

```typescript
export const ChatProcessingOverlay: React.FC<OverlayProps> = ({
  inline = false,
  targetMessageId
}) => {
  const processingTrace = useChatStore((s) => s.processingTrace);

  if (!processingTrace) return null;

  const events = processingTrace.events ?? [];

  return (
    <div className={inline ? 'mt-1' : 'fixed bottom-4 right-4 z-30'}>
      <div className="bg-white dark:bg-gray-900 border rounded-lg p-3">
        <div className="space-y-2 font-mono text-xs">
          {events.map((evt) => {
            const glyph = glyphFor(evt.kind, evt.phase);
            return (
              <div key={evt.id} className="flex items-start gap-3">
                <span className="w-8 text-right">{glyph}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{evt.label}</span>
                    <span className="text-gray-500">
                      [{formatMs(evt.durationMs)}]
                    </span>
                  </div>
                  {evt.detail && (
                    <div className="text-gray-600 dark:text-gray-300">
                      {evt.detail}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <button onClick={() => collapse(true)}>
          Collapse
        </button>
      </div>
    </div>
  );
};
```

## Workflow Integration

### LangGraph Workflow Events

The system integrates with LangGraph's workflow graphs to provide checkpoint-based pause/resume:

```typescript
// chat-service.ts:720-790
const workflowEnabled = true;

if (workflowEnabled) {
  const awaiting = (conversation.metadata as any)?.awaitingUserInput;
  const hasCheckpoint = !!awaiting?.checkpointId;

  const runWorkflow = async (
    inputToUse: any,
    clearAwaitingOnSuccess: boolean,
    useCheckpoint: boolean
  ): Promise<boolean> => {
    const timelineCallback = new TimelineCallbackHandler(emitStatus, 'workflow');
    const config = {
      configurable: {
        thread_id: conversation.id,
        ...(useCheckpoint && hasCheckpoint
          ? { checkpoint_id: awaiting?.checkpointId }
          : {}),
      },
      callbacks: [timelineCallback],
      stream_mode: 'updates' as const,
    };

    const wfStream = await workflowGraph.stream(inputToUse, config);

    for await (const evt of wfStream) {
      // Handle workflow interruptions (await user input)
      if (isInterruptEvent(evt)) {
        const payload =
          (extractInterrupt(evt) as Record<string, unknown> | undefined) ?? {};
        const prompt =
          payload?.prompt ??
          payload?.message ??
          payload?.question ??
          'Please answer to continue.';

        // Emit pause event
        emitStatus({
          type: 'await_user_input',
          prompt: String(prompt),
          sessionId: conversation.id,
          checkpointId: checkpointId ?? conversation.id,
          questionId,
        });

        // Pause conversation
        conversation.status = 'paused';
        conversation.metadata = {
          ...(conversation.metadata ?? {}),
          awaitingUserInput: {
            prompt,
            questionId,
            checkpointId,
            requestedAt: new Date().toISOString(),
          },
          workflowMode: 'workflow_v1',
        } as any;
        await persistConversation(conversation);
        return true; // paused
      }

      // Stream node updates as content
      if (Array.isArray(evt)) {
        const nodeUpdate = evt[1];
        const msgs = nodeUpdate?.[nodeName]?.messages ?? [];
        const last = msgs.length ? msgs[msgs.length - 1] : undefined;
        const raw = last?.content ?? last?.text ?? '';
        if (typeof raw === 'string' && raw.trim()) {
          yield { type: 'content', content: raw };
        }
      }
    }

    return false; // not paused
  };

  // Run workflow and handle pause/resume
  const paused = await runWorkflow(resumeInput, true, true);
  if (paused) return; // User needs to respond
}
```

### Workflow States

```
┌─────────────┐
│   START     │
└──────┬──────┘
       │
       ↓
┌─────────────────┐
│  assess_user    │  ← Run assessment agent
│  (confidence?)  │
└──────┬──────────┘
       │
       ├─ low confidence ─────────────┐
       │                              │
       ↓                              ↓
┌─────────────────┐          ┌─────────────────┐
│  create_plan    │          │  fast_track     │
│  (learning path)│          │  (skip to quiz) │
└──────┬──────────┘          └──────┬──────────┘
       │                              │
       └──────────┬───────────────────┘
                  │
                  ↓
           ┌──────────────┐
           │ wait_answer  │  ← interrupt() - pause for user
           │ (quiz/practice)│
           └──────┬────────┘
                  │
                  ├─ User responds ─────┐
                  │                      │
                  ↓                      ↓
           ┌──────────────┐      ┌──────────────┐
           │ assess_resp  │      │  END         │
           │ (score?)     │      │              │
           └──────┬───────┘      └──────────────┘
                  │
                  └─ low score ─────────────┐
                                            │
                                            ↓
                                   ┌──────────────┐
                                   │  provide_help│  ← Run tutoring agent
                                   │   (retry?)   │
                                   └──────┬───────┘
                                          │
                                          └─ high score ─────┐
                                                                │
                                                                ↓
                                                         ┌──────────────┐
                                                         │  END         │
                                                         │              │
                                                         └──────────────┘
```

## Best Practices

### 1. Event Naming

Use clear, descriptive names for events:

```typescript
// ✅ Good
emitTimelineEvent({
  type: 'tool',
  tool: 'knowledge.search',
  phase: 'start',
  detail: '{"query": "TypeScript basics"}',
  expandable: true
});

// ❌ Bad
emitTimelineEvent({
  type: 'tool',
  tool: 'search',
  phase: 'start',
  detail: 'search',
  expandable: false
});
```

### 2. Detail Formatting

Use JSON.stringify with proper formatting for structured data:

```typescript
// ✅ Good
detail: JSON.stringify({
  query: 'TypeScript tutorial',
  filters: { difficulty: 'beginner' },
  limit: 5
}, null, 2)

// ❌ Bad
detail: 'query=TypeScript tutorial'
```

### 3. Expandability

Mark events as expandable when they contain useful details:

```typescript
// ✅ Good - User can see tool input/output
emitTimelineEvent({
  type: 'tool',
  tool: 'code.search',
  phase: 'start',
  detail: JSON.stringify(toolInput, null, 2),
  expandable: true  // User can expand to see details
});

// ❌ Bad - No way to see what happened
emitTimelineEvent({
  type: 'tool',
  tool: 'code.search',
  phase: 'start',
  expandable: false  // Hidden from user
});
```

### 4. State Updates

Emit state changes to show current activity:

```typescript
// ✅ Good
this.emitStateChange('Searching knowledge base...');
this.emitStateChange('Analyzing results...');
this.emitStateChange('Generating response...');

// ❌ Bad
// No state updates - user doesn't know what's happening
```

### 5. Error Handling

Always emit error events with helpful details:

```typescript
// ✅ Good
onToolError(err: any): void | Promise<void> {
  this.emitTimelineEvent({
    type: 'tool',
    tool: this.currentToolName || 'unknown',
    phase: 'error',
    detail: `Error: ${err.message}\nStack: ${err.stack}`,
    expandable: true,
  });
  this.emitStateChange('Error');
}

// ❌ Bad
onToolError(err: any): void | Promise<void> {
  // Silent failure - user has no idea what went wrong
}
```

### 6. Performance

Keep event data minimal - avoid logging large payloads:

```typescript
// ✅ Good - Log summary, not entire dataset
detail: JSON.stringify({
  query: 'TypeScript',
  resultsCount: 150,
  totalTokens: 1250,
  sample: results.slice(0, 3)  // Just first 3
}, null, 2)

// ❌ Bad - Logging entire dataset
detail: JSON.stringify(allResults)  // Could be MB of data
```

### 7. Event Limits

Consider limiting event history to prevent memory issues:

```typescript
// In timelineStore
addEvent: (conversationId, event) =>
  set((state) => {
    const events = state.eventsByConversation[conversationId] || [];
    // Keep only last 100 events
    const trimmed = events.slice(-100);
    return {
      eventsByConversation: {
        ...state.eventsByConversation,
        [conversationId]: [...trimmed, event],
      },
    };
  }),
```

### 8. Cleanup

Clean up resources when conversation ends:

```typescript
// chat-service.ts
const disposeTracker = (conversationId: string) => {
  const tracker = contextTrackers.get(conversationId);
  if (tracker) {
    tracker.dispose();
    contextTrackers.delete(conversationId);
  }
};
```

## Debugging

### Enable Debug Logging

```typescript
// In development, enable verbose logging
const handlerLogger = loggerService.child({
  service: 'chat-handlers',
  debug: true
});

// Timeline events
handlerLogger.debug('Timeline event', {
  type: status.type,
  agent: status.event?.agent,
  eventType: status.event?.type
});
```

### View Events in DevTools

Events are stored in `timelineStore`. Access via React DevTools:

```typescript
// In browser console
window.timelineStore = useTimelineStore.getState();
console.table(window.timelineStore.eventsByConversation);
```

### Common Issues

#### Events Not Appearing in UI

**Symptom:** Agent is running but TimelineView is empty

**Check:**
1. Is `useTimeline(conversationId)` being called?
2. Are events reaching the renderer? (Check window.addEventListener)
3. Is conversationId correct in both store and hook?
4. Are events being filtered? (Check if `addEvent` is being called)

```typescript
// Debug in useTimeline
const handleMessage = (event: MessageEvent) => {
  console.log('[DEBUG] Message received', event.data);  // Add this
  const { data } = event;
  if (data.type === 'chat:status' && data.status) {
    console.log('[DEBUG] Status event', data.status);  // And this
    // ...
  }
};
```

#### Events in Wrong Order

**Symptom:** Timeline shows events out of sequence

**Cause:** Asynchronous event processing

**Solution:** Events include `timestamp` - TimelineView sorts by timestamp:

```typescript
// TimelineView.tsx
{events
  .sort((a, b) => a.timestamp - b.timestamp)  // Ensure chronological order
  .map((event) => {
    // ...
  })}
```

#### Memory Leaks

**Symptom:** Memory usage grows over time

**Cause:** Events never cleaned up

**Solution:** Clear events when conversation ends:

```typescript
// Add to timelineStore
clearConversation: (conversationId) =>
  set((state) => {
    const { eventsByConversation, activeStatesByConversation } = state;
    delete eventsByConversation[conversationId];
    delete activeStatesByConversation[conversationId];
    return { eventsByConversation, activeStatesByConversation };
  }),

// Call when conversation ends
useEffect(() => {
  return () => {
    if (conversationId) {
      timelineStore.getState().clearConversation(conversationId);
    }
  };
}, [conversationId]);
```

## API Reference

### TimelineCallbackHandler

```typescript
class TimelineCallbackHandler extends BaseCallbackHandler {
  constructor(
    onStatus: (status: ChatStatus) => void,
    agentName?: string
  )

  // LangChain callback methods
  onAgentAction(action: any): void | Promise<void>
  onToolEnd(output: any): void | Promise<void>
  onToolError(err: any): void | Promise<void>
  onChainError(err: any): void | Promise<void>

  // Internal helpers
  private emitTimelineEvent(payload: Omit<TimelineEventPayload, 'id' | 'timestamp'>)
  private emitStateChange(state: string)
}
```

### ChatStatus Types

```typescript
type ChatStatus =
  | { type: 'retry'; attempt: number; max: number; reason: string }
  | {
      type: 'tool';
      phase: 'start' | 'end' | 'error';
      tool: string;
      detail?: string;
      durationMs?: number;
      agent?: string;
      id?: string;
      expandable?: boolean;
    }
  | { type: 'tip'; text: string }
  | {
      type: 'fail';
      category: 'rate_limit' | 'quota' | 'auth' | 'timeout' | 'network' | 'tool_fail' | 'validation' | 'unknown';
      suggestion?: string;
    }
  | {
      type: 'thought';
      text: string;
      agent?: string;
      id?: string;
      expandable?: boolean;
    }
  | { type: 'timeline_event'; event: TimelineEventPayload }
  | { type: 'timeline_state'; state: string; agent?: string }
  | {
      type: 'await_user_input';
      prompt: string;
      sessionId: string;
      checkpointId?: string;
      questionId?: string;
      timeoutAt?: number;
    };
```

### TimelineStore

```typescript
interface TimelineState {
  eventsByConversation: Record<string, TimelineEventPayload[]>;
  activeStatesByConversation: Record<string, string>;

  addEvent: (conversationId: string, event: TimelineEventPayload) => void;
  setState: (conversationId: string, state: string) => void;
  clearConversation: (conversationId: string) => void;
}
```

## Testing

### Unit Tests

```typescript
// timeline-callback-handler.test.ts
describe('TimelineCallbackHandler', () => {
  let mockOnStatus: jest.Mock;
  let handler: TimelineCallbackHandler;

  beforeEach(() => {
    mockOnStatus = jest.fn();
    handler = new TimelineCallbackHandler(mockOnStatus, 'TestAgent');
  });

  it('should emit thought event on agent action', async () => {
    const action = { log: 'User wants to learn TypeScript' };
    await handler.onAgentAction(action);

    expect(mockOnStatus).toHaveBeenCalledWith({
      type: 'timeline_event',
      event: {
        id: expect.any(String),
        timestamp: expect.any(Number),
        agent: 'TestAgent',
        type: 'thought',
        text: 'User wants to learn TypeScript',
        expandable: true,
      },
    });
  });

  it('should emit tool start and end events', async () => {
    // Start tool
    await handler.onAgentAction({
      tool: 'knowledge.search',
      tool_input: { query: 'TypeScript' },
    });

    // End tool
    await handler.onToolEnd({ results: ['result1', 'result2'] });

    // Should have 2 events
    expect(mockOnStatus).toHaveBeenCalledTimes(3); // 1 thought + 1 start + 1 end
  });
});
```

### Integration Tests

```typescript
// timeline.integration.test.tsx
describe('Timeline Integration', () => {
  it('should display events in TimelineView', async () => {
    const conversationId = 'test-123';

    // Simulate events
    const mockTimelineStore = {
      eventsByConversation: {
        [conversationId]: [
          {
            id: '1',
            type: 'thought',
            agent: 'learning',
            text: 'Thinking...',
            timestamp: Date.now(),
          },
        ],
      },
    };

    render(<TimelineView conversationId={conversationId} />);

    expect(screen.getByText('💭')).toBeInTheDocument();
    expect(screen.getByText('Thinking...')).toBeInTheDocument();
  });
});
```

## Migration Guide

### Adding New Event Types

1. **Define event interface:**

```typescript
// In chat-api.ts
export interface CustomEventPayload {
  id: string;
  type: 'custom';
  agent: string;
  timestamp: number;
  customField: string;
}

// Add to ChatStatus union
export type ChatStatus =
  | { type: 'timeline_event'; event: TimelineEventPayload | CustomEventPayload }
  // ...
```

2. **Emit in TimelineCallbackHandler:**

```typescript
onAgentAction(action: any): void | Promise<void> {
  // ...

  if (action.custom) {
    this.emitTimelineEvent({
      type: 'custom',
      customField: action.customField,
      // ...
    });
  }
}
```

3. **Handle in UI:**

```typescript
// TimelineView.tsx
{events.map((event) => {
  if (event.type === 'custom') {
    return <CustomEvent key={event.id} event={event} />;
  }
  // ...
})}
```

### Deprecating Event Types

To deprecate an event type:

1. Add deprecation warning:

```typescript
if (event.type === 'deprecated_type') {
  console.warn('deprecated_type is deprecated, use new_type instead');
}
```

2. Continue emitting for backward compatibility

3. Update UI to handle gracefully

4. Remove after migration period (e.g., 2 releases)

## Further Reading

- [LangChain Callbacks](https://js.langchain.com/docs/callbacks)
- [Electron IPC](https://electronjs.org/docs/latest/tutorial/ipc)
- [MessageChannel API](https://developer.mozilla.org/en-US/docs/Web/API/MessageChannel)
- [Zustand State Management](https://github.com/pmndrs/zustand)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)

## Related Documentation

- [Agent Architecture](./agent-architecture.md)
- [Workflow Orchestration](./workflow-orchestration.md)
- [Chat Service Design](./chat-service.md)
- [Testing Strategy](./testing.md)
