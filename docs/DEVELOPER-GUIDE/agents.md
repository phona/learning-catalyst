# Agent System Guide

The Multi-Agent System provides **specialized AI agents** for different learning tasks. This guide
covers agent architecture, types, tools, and how to create custom agents.

## Overview

### What Are Agents?

Agents are **specialized AI assistants** that handle specific learning tasks:

- **Learning Agent** - Explains concepts conversationally
- **Assessment Agent** - Tests knowledge and identifies gaps
- **Tutoring Agent** - Provides personalized guidance
- **Practice Agent** - Creates exercises and challenges

### Why Use Agents?

Instead of one general AI, specialized agents:

- Provide **targeted expertise** for each task
- Maintain **context** relevant to their specialty
- Use **appropriate prompts** for their role
- Deliver **better outcomes** than general models

## Agent Architecture

### Agent Structure

```
Agent
├── Type (learning | assessment | tutoring | practice)
├── Configuration (model, temperature, tools)
├── State (current context, memory)
└── Tools (capabilities they can use)
```

### Factory Pattern

**All agents created using factories:**

```typescript
// src/main/agents/learning-agent.ts
export function createLearningAgent(dependencies: Dependencies): Agent {
  return {
    type: 'learning',
    status: 'active',

    async process(input: AgentInput): Promise<AgentOutput> {
      // Agent-specific logic
      const explanation = await generateExplanation(input);
      const relatedConcepts = await findRelatedConcepts(input.query);
      const suggestions = generateSuggestions(relatedConcepts);

      return {
        response: explanation,
        suggestions,
        relatedConcepts,
        nextSteps: generateNextSteps(relatedConcepts),
      };
    },
  };
}
```

## Agent Types

### 1. Learning Agent

**Purpose**: Explain concepts and facilitate understanding

**Specializes in**:

- Clear explanations
- Analogies and examples
- Progressive disclosure
- Visual aids and diagrams
- Linking to prior knowledge

**Example**:

````
User: "Explain closures in JavaScript"

Learning Agent Response:
"Great question! Closures are one of JavaScript's most powerful features.

Think of a closure like a backpack that a function carries with it. When
a function is created inside another function, it 'remembers' the
environment where it was born.

Here's a simple example:
```javascript
function createCounter() {
  let count = 0;  // This variable is 'closed over'

  return function() {
    count++;
    return count;
  };
}

const counter = createCounter();
counter(); // Returns 1
counter(); // Returns 2
counter(); // Returns 3
````

See how the inner function remembers the `count` variable? That's a closure!

Want me to show you more examples, or would you like to practice with a challenge?"

```

### 2. Assessment Agent

**Purpose**: Test knowledge and evaluate understanding

**Specializes in**:
- Asking relevant questions
- Identifying knowledge gaps
- Providing detailed feedback
- Suggesting remedial content
- Tracking mastery levels

**Example**:
```

Assessment Agent: "Time to check your understanding! I've prepared a few questions about closures.

Question 1: What will this code output?

```javascript
function outer() {
  let x = 10;
  function inner() {
    console.log(x);
  }
  inner();
}
outer();
```

A) undefined B) ReferenceError: x is not defined C) 10 D) Error

Your answer: C

Excellent! Closures allow the inner function to access variables from the outer scope, even after
outer() has finished executing.

Question 2: What if we modify the code slightly?

```javascript
function outer() {
  let x = 10;
  function inner() {
    console.log(x);
  }
  x = 20; // Change x before calling inner
  inner();
}
outer();
```

What will it output now?

A) 10 B) 20 C) undefined D) Error

Think about it... the closure captures the variable reference, not its value!"

```

### 3. Tutoring Agent

**Purpose**: Provide personalized guidance and support

**Specializes in**:
- Adapting to learning style
- Recognizing confusion
- Offering different explanations
- Motivating learners
- Emotional support

**Example**:
```

Tutoring Agent: "I notice you're working with closures - this can be tricky! Don't worry, it clicks
for everyone at different paces.

From your questions, I sense you might benefit from seeing it differently. Instead of thinking of it
as a 'backpack', think of it as:

A function keeps a snapshot of its birth place - not just the code, but also all the variables that
existed there. Even after leaving that place, it can still access those variables.

Want to try a hands-on approach? I'll give you some code with bugs, and you fix them using closures.
This often helps more than just reading explanations.

Or if you're feeling stuck, we can step back and review function basics first. What would help you
most right now?"

```

### 4. Practice Agent

**Purpose**: Create exercises and challenges

**Specializes in**:
- Generating practice problems
- Providing immediate feedback
- Scaling difficulty
- Creating varied exercises
- Gamifying practice

**Example**:
```

Practice Agent: "Ready for some closure challenges? I've created a progressive set of exercises for
you.

🏆 Challenge 1: Fix the Bug This code has a closure issue. Can you spot and fix it?

```javascript
// TODO: Fix this closure
function createMultiplier(factor) {
  function multiply(n) {
    return factor * n;
  }
}

const times3 = createMultiplier(3);
console.log(times3(5)); // Should print 15
```

[After solving] Great! You captured the `factor` in the closure. You've earned 10 XP!

🏆 Challenge 2: Create a Closure Write a function that creates a counter starting at a specific
number:

```javascript
function createCounter(start) {
  // Your code here
}

const counter = createCounter(5);
counter(); // 6
counter(); // 7
```

Points available: 20 XP

🏆 Challenge 3: Advanced Closure Create a private variable that can't be accessed from outside:

```javascript
function createSecretKeeper(secret) {
  // Your code here
}

const keeper = createSecretKeeper('My secret');
keeper.getSecret(); // 'My secret'
keeper.secret; // undefined (can't access directly)
```

Points available: 50 XP

Which challenge do you want to try?"

````

## Agent Tools

### What Are Tools?

**Tools extend agent capabilities** by calling services:

```typescript
// Tools call services, not direct APIs
export function knowledgeExtractionTool(services: Services) {
  return async (input: ExtractionInput): Promise<ExtractionResult> => {
    // Use knowledge service
    const concepts = await services.knowledgeService.extract(input.content);
    const relationships = await services.knowledgeService.findRelationships(concepts);

    return { concepts, relationships };
  };
}
````

### Available Tools

#### 1. Knowledge Extraction Tool

**Purpose**: Extract concepts from content

```typescript
const extractKnowledge = knowledgeExtractionTool(services);

const result = await extractKnowledge({
  content: 'React hooks allow you to use state and other features in functional components.',
});

// Returns:
// {
//   concepts: [
//     { name: "React Hooks", category: "programming" },
//     { name: "State Management", category: "programming" },
//     { name: "Functional Components", category: "programming" }
//   ]
// }
```

#### 2. Concept Search Tool

**Purpose**: Find relevant concepts

```typescript
const searchConcepts = conceptSearchTool(services);

const results = await searchConcepts({
  query: 'JavaScript closures',
  limit: 10,
});

// Returns concepts matching the query
```

#### 3. Progress Tracking Tool

**Purpose**: Track learning progress

```typescript
const trackProgress = progressTrackingTool(services);

await trackProgress({
  sessionId: 'session-123',
  conceptId: 'closure-456',
  status: 'mastered',
  confidence: 0.85,
});
```

#### 4. Exercise Generation Tool

**Purpose**: Create practice exercises

```typescript
const generateExercise = exerciseGenerationTool(services);

const exercise = await generateExercise({
  concept: 'closures',
  difficulty: 'intermediate',
  type: 'code_completion',
});

// Returns:
// {
//   id: "ex-789",
//   prompt: "Complete the closure function...",
//   solution: "...",
//   testCases: [...]
// }
```

## Creating Custom Agents

### Step 1: Define Agent Type

```typescript
// src/main/agents/agent-types.ts
export type AgentType = 'learning' | 'assessment' | 'tutoring' | 'practice' | 'custom';

export interface Agent {
  type: AgentType;
  name: string;
  status: 'active' | 'inactive' | 'error';
  process(input: AgentInput): Promise<AgentOutput>;
}
```

### Step 2: Create Agent Factory

```typescript
// src/main/agents/custom-agent.ts
export function createCustomAgent(dependencies: Dependencies): Agent {
  const { aiService, knowledgeService, loggerService } = dependencies;

  return {
    type: 'custom',
    name: 'Custom Agent',
    status: 'active',

    async process(input: AgentInput): Promise<AgentOutput> {
      loggerService.info('Custom agent processing', { input });

      // Get relevant knowledge
      const concepts = await knowledgeService.search(input.query);

      // Generate response using AI with custom prompt
      const response = await aiService.complete({
        messages: [
          {
            role: 'system',
            content: getCustomAgentSystemPrompt(),
          },
          {
            role: 'user',
            content: input.query,
          },
        ],
        temperature: 0.7,
        maxTokens: 2000,
      });

      return {
        response: response.content,
        agentUsed: 'custom',
        concepts,
        confidence: calculateConfidence(concepts, response),
      };
    },
  };
}

function getCustomAgentSystemPrompt(): string {
  return `You are a custom agent with specialized knowledge...
  Your role is to...

  Always:
  - Be friendly and encouraging
  - Provide practical examples
  - Ask follow-up questions

  Never:
  - Give away answers directly
  - Be condescending`;
}
```

### Step 3: Add Tools

```typescript
export function createCustomAgent(dependencies: Dependencies): Agent {
  const { aiService, knowledgeService } = dependencies;

  // Create tools
  const customTool = async (input: ToolInput): Promise<ToolOutput> => {
    // Tool implementation
    return result;
  };

  return {
    type: 'custom',
    async process(input: AgentInput): Promise<AgentOutput> {
      // Use tools
      const toolResult = await customTool(input);

      // Combine with AI response
      const response = await aiService.complete({
        messages: [
          {
            role: 'user',
            content: `${input.query}\n\nTool result: ${JSON.stringify(toolResult)}`,
          },
        ],
      });

      return {
        response: response.content,
        toolResults: [toolResult],
      };
    },
  };
}
```

### Step 4: Register Agent

```typescript
// src/main/index.ts
import { createCustomAgent } from './agents/custom-agent';

const customAgent = createCustomAgent({
  aiService,
  knowledgeService,
  loggerService,
});

// Register in agent registry
agentRegistry.register(customAgent);
```

## Agent Lifecycle

### Agent States

```
Created → Activated → Active → Deactivated → Archived
   ↓         ↓          ↓           ↓
- Defined   - Running  - Processing - Stopped
- Configured - Ready   - Stable     - Can resume
```

### State Management

```typescript
// src/main/agents/agent-registry.ts
export class AgentRegistry {
  private agents = new Map<string, Agent>();

  register(agent: Agent) {
    this.agents.set(agent.id, agent);
    this.logEvent({
      type: 'created',
      agentId: agent.id,
      timestamp: Date.now(),
    });
  }

  activate(agentId: string) {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.status = 'active';
      this.logEvent({
        type: 'activated',
        agentId,
        timestamp: Date.now(),
      });
    }
  }

  deactivate(agentId: string) {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.status = 'inactive';
      this.logEvent({
        type: 'deactivated',
        agentId,
        timestamp: Date.now(),
      });
    }
  }

  async process(agentId: string, input: AgentInput): Promise<AgentOutput> {
    const agent = this.agents.get(agentId);
    if (!agent || agent.status !== 'active') {
      throw new Error(`Agent ${agentId} not found or inactive`);
    }

    try {
      const output = await agent.process(input);
      return output;
    } catch (error) {
      agent.status = 'error';
      throw error;
    }
  }
}
```

### Event Tracking

```typescript
// Track agent lifecycle events
await db
  .insertInto('agent_lifecycle_events')
  .values({
    id: generateId(),
    agent_id: agentId,
    event: 'activated',
    from_state: 'inactive',
    to_state: 'active',
    timestamp: Date.now(),
    metadata: JSON.stringify({ triggeredBy: 'user' }),
    created_at: new Date().toISOString(),
  })
  .execute();
```

## Agent Communication

### Agent Orchestration

**Multiple agents can collaborate:**

```typescript
// Orchestrator coordinates agents
class AgentOrchestrator {
  async processRequest(request: UserRequest): Promise<AgentResponse> {
    // Determine primary agent
    const primaryAgent = this.selectAgent(request);

    // Process with primary agent
    const primaryResponse = await primaryAgent.process(request);

    // If needed, consult other agents
    if (needsConsultation(primaryResponse)) {
      const consultantAgent = this.selectConsultant(request, primaryResponse);
      const consultation = await consultantAgent.process({
        ...request,
        context: primaryResponse,
      });

      // Combine responses
      return this.combineResponses(primaryResponse, consultation);
    }

    return primaryResponse;
  }

  selectAgent(request: UserRequest): Agent {
    if (request.type === 'explanation') return learningAgent;
    if (request.type === 'test') return assessmentAgent;
    if (request.type === 'guidance') return tutoringAgent;
    if (request.type === 'practice') return practiceAgent;
    return learningAgent; // Default
  }
}
```

### Context Sharing

**Agents share relevant context:**

```typescript
// Pass context between agents
const context: SharedContext = {
  sessionId: request.sessionId,
  conversationHistory: getHistory(request.sessionId),
  learnedConcepts: getLearnedConcepts(request.sessionId),
  currentDifficulty: getCurrentDifficulty(request.sessionId),
  userPreferences: getUserPreferences(),
};

const learningResponse = await learningAgent.process({
  ...request,
  context,
});

const assessmentResponse = await assessmentAgent.process({
  type: 'follow_up',
  query: 'Test understanding of what was just explained',
  context: {
    ...context,
    previousResponse: learningResponse,
  },
});
```

## Agent Configuration

### Model Configuration

```typescript
interface AgentConfig {
  id: string;
  name: string;
  type: AgentType;
  modelConfig: {
    provider: string;
    model: string;
    temperature: number;
    maxTokens: number;
  };
  tools: string[];
  capabilities: string[];
  metadata: Record<string, any>;
}

// Example configuration
const learningAgentConfig: AgentConfig = {
  id: 'agent-learning',
  name: 'Learning Agent',
  type: 'learning',
  modelConfig: {
    provider: 'openai',
    model: 'gpt-4',
    temperature: 0.7,
    maxTokens: 2000,
  },
  tools: ['knowledge-extraction', 'concept-search'],
  capabilities: ['explain-concepts', 'provide-examples', 'generate-analogies', 'link-concepts'],
  metadata: {
    description: 'Specializes in clear explanations and learning support',
  },
};
```

### Persisting Configuration

```typescript
// Save agent configuration to database
await db
  .insertInto('agents')
  .values({
    id: config.id,
    name: config.name,
    type: config.type,
    status: 'active',
    description: config.metadata.description,
    model_config: JSON.stringify(config.modelConfig),
    tools: JSON.stringify(config.tools),
    capabilities: JSON.stringify(config.capabilities),
    metadata: JSON.stringify(config.metadata),
    created_at: Date.now(),
    updated_at: Date.now(),
  })
  .execute();
```

## Agent Best Practices

### 1. Keep Agents Specialized

```typescript
// ✅ Good - Specialized agent
const learningAgent = {
  type: 'learning',
  process: async (input) => {
    // Focused on explanation and learning
    return explainConcept(input.query);
  },
};

// ❌ Bad - Jack-of-all-trades agent
const genericAgent = {
  type: 'general',
  process: async (input) => {
    // Trying to do everything
    return handleAnyRequest(input);
  },
};
```

### 2. Provide Clear System Prompts

```typescript
// ✅ Good - Clear instructions
const systemPrompt = `You are a Learning Agent. Your role is to:
1. Explain concepts clearly and concisely
2. Use analogies and examples
3. Check for understanding
4. Provide next steps

Always be encouraging and patient.`;

const prompt = `${systemPrompt}\n\nUser: ${input.query}`;

// ❌ Bad - Vague instructions
const prompt = `Respond to: ${input.query}`;
```

### 3. Use Tools Appropriately

```typescript
// ✅ Good - Use tools for factual tasks
const concepts = await knowledgeService.search(query);
const explanation = await aiService.complete(
  `Explain these concepts: ${concepts.map((c) => c.name).join(', ')}`,
);

// ❌ Bad - Using AI for everything
const explanation = await aiService.complete(
  `Search for and explain: ${query}`,
  // AI doesn't have access to your knowledge base!
);
```

### 4. Track Agent Performance

```typescript
// Log agent usage
loggerService.info('Agent processing', {
  agentId: agent.id,
  agentType: agent.type,
  processingTime: Date.now() - startTime,
  success: true,
  tokensUsed: response.usage,
});
```

### 5. Handle Errors Gracefully

```typescript
async process(input: AgentInput): Promise<AgentOutput> {
  try {
    return await doProcessing(input);
  } catch (error) {
    loggerService.error('Agent processing failed', {
      agentId: this.id,
      error: error.message
    });

    // Provide fallback response
    return {
      response: "I apologize, but I encountered an issue. Let me try a different approach.",
      error: error.message,
      fallback: true
    };
  }
}
```

## Testing Agents

### Agent Unit Tests

```typescript
// src/main/agents/__tests__/learning-agent.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createLearningAgent } from '../learning-agent';
import { createMock } from 'vitest-mock-extended';

describe('LearningAgent', () => {
  let learningAgent: Agent;
  let mockAI: ReturnType<typeof createMock>;
  let mockKnowledge: ReturnType<typeof createMock>;

  beforeEach(() => {
    mockAI = createMock<AIService>();
    mockKnowledge = createMock<KnowledgeService>();

    learningAgent = createLearningAgent({
      aiService: mockAI,
      knowledgeService: mockKnowledge,
      loggerService: createMock<LoggerService>(),
    });
  });

  it('should explain concepts clearly', async () => {
    // Arrange
    const input = {
      query: 'What are closures?',
      sessionId: 'session-123',
    };

    mockKnowledge.search.mockResolvedValue([{ id: '1', name: 'Closure', category: 'javascript' }]);

    mockAI.complete.mockResolvedValue({
      content: 'A closure is...',
      usage: { prompt: 10, completion: 50 },
    });

    // Act
    const output = await learningAgent.process(input);

    // Assert
    expect(output.response).toContain('closure');
    expect(output.agentUsed).toBe('learning');
    expect(mockKnowledge.search).toHaveBeenCalledWith('What are closures?');
  });
});
```

## Integration with Services

### Using Services in Agents

```typescript
// Agents use services, not direct API calls
export function createLearningAgent({
  aiService,
  knowledgeService,
  progressService,
  loggerService,
}: Dependencies): Agent {
  return {
    type: 'learning',
    async process(input: AgentInput): Promise<AgentOutput> {
      // Use knowledge service to find concepts
      const concepts = await knowledgeService.search(input.query);

      // Use progress service to check mastery
      const progress = await progressService.getProgress(input.sessionId);

      // Generate explanation with context
      const explanation = await aiService.complete({
        messages: [
          {
            role: 'system',
            content: buildSystemPrompt(progress),
          },
          {
            role: 'user',
            content: input.query,
          },
        ],
      });

      // Record learning activity
      await progressService.recordActivity({
        sessionId: input.sessionId,
        type: 'learning',
        topic: input.query,
        concepts,
      });

      return {
        response: explanation.content,
        concepts,
        agentUsed: 'learning',
      };
    },
  };
}
```

## Future Enhancements

### Planned Features

1. **Agent Collaboration** - Multiple agents working together
2. **Custom Tools** - User-defined tools for agents
3. **Agent Learning** - Agents adapt to user preferences
4. **Performance Analytics** - Track agent effectiveness
5. **Agent Marketplace** - Share and discover agents

### Extensibility

The agent system is designed to be extensible:

- Add new agent types
- Create custom tools
- Implement new orchestration strategies
- Plugin architecture for agent providers

## Related Documentation

- [Architecture Overview](./architecture.md)
- [Services Guide](./services.md)
- [Electron API](./electron-api.md)

---

**Last Updated**: November 2025 **Version**: 1.0
