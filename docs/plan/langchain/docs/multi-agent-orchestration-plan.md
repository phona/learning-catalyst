# Multi-Agent Orchestration Plan - Learning Catalyst

## LangChain Multi-Agent Patterns Analysis

Based on LangChain JS documentation, we have two powerful patterns:

### 1. **Tool Calling Pattern** (Centralized Control)
- One primary agent with access to all tools
- Agent decides which tools to use for each request
- Context engineering controls agent behavior
- **Perfect for**: Learning Catalyst's intelligent agent selection

### 2. **Handoffs Pattern** (Decentralized Switching)
- Multiple specialized agents with ability to hand off conversations
- Each agent has specialized tools and expertise
- Agents can switch based on conversation context
- **Perfect for**: Complex learning workflows requiring different expertise

## Enhanced Architecture: Intelligent Multi-Agent System

### Main Thread: Sophisticated Agent Orchestration

```typescript
// electron/main/services/CatalystServiceMain.ts
export class CatalystServiceMain {
  private orchestrator: MultiAgentOrchestrator;
  private agentRegistry: AgentRegistry;

  constructor() {
    this.agentRegistry = new AgentRegistry();
    this.orchestrator = new MultiAgentOrchestrator(this.agentRegistry);
  }

  async ask(request: CatalystRequest): Promise<CatalystResponse> {
    // intelligent request routing and orchestration
    return await this.orchestrator.process(request);
  }
}

// electron/main/services/MultiAgentOrchestrator.ts
export class MultiAgentOrchestrator {
  constructor(private agentRegistry: AgentRegistry) {}

  async process(request: CatalystRequest): Promise<CatalystResponse> {
    // Analyze request complexity and choose orchestration pattern
    const strategy = this.selectOrchestrationStrategy(request);

    switch (strategy.type) {
      case 'tool_calling':
        return await this.toolCallingPattern(request, strategy);
      case 'handoff':
        return await this.handoffPattern(request, strategy);
      case 'hybrid':
        return await this.hybridPattern(request, strategy);
      default:
        return await this.simpleAgentPattern(request, strategy);
    }
  }

  private selectOrchestrationStrategy(request: CatalystRequest): OrchestrationStrategy {
    // Intelligent strategy selection based on request analysis
    const complexity = this.analyzeRequestComplexity(request);
    const context = this.analyzeContext(request);

    if (complexity.high && context.multiStep) {
      return { type: 'handoff', primaryAgent: 'learning', agents: ['learning', 'assessment', 'tutoring'] };
    } else if (complexity.medium && context.requiresTools) {
      return { type: 'tool_calling', primaryAgent: 'learning', tools: ['parseConcepts', 'searchSessions'] };
    } else {
      return { type: 'simple', primaryAgent: 'learning' };
    }
  }

  private async toolCallingPattern(request: CatalystRequest, strategy: any): Promise<CatalystResponse> {
    // Create primary agent with access to specialized tools
    const primaryAgent = await this.agentRegistry.getAgent(strategy.primaryAgent, {
      tools: strategy.tools,
      context: request.context
    });

    // Agent intelligently selects and uses tools
    const response = await primaryAgent.invoke({
      messages: [{ role: 'user', content: request.content }],
      context: request.context
    });

    return { response: response.content, metadata: response.metadata };
  }

  private async handoffPattern(request: CatalystRequest, strategy: any): Promise<CatalystResponse> {
    // Create handoff-capable agents
    const agents = strategy.agents.map(type =>
      this.agentRegistry.getHandoffAgent(type, { context: request.context })
    );

    // Create handoff manager
    const handoffManager = new HandoffManager(agents);

    // Process with intelligent agent switching
    const result = await handoffManager.processConversation({
      initialMessage: request.content,
      context: request.context
    });

    return {
      response: result.finalResponse,
      metadata: {
        agentsUsed: result.agentsUsed,
        handoffs: result.handoffs,
        timeline: result.timeline
      }
    };
  }
}
```

## Pattern 1: Tool Calling Implementation

### Centralized Control with Smart Tool Selection

```typescript
// electron/main/services/agents/ToolCallingAgent.ts
export class ToolCallingAgent {
  private agent: any; // LangChain agent
  private tools: Map<string, any>;

  constructor(
    private agentType: AgentType,
    private toolExecutor: ToolExecutorService,
    private sessionService: SessionServiceMain
  ) {
    this.tools = new Map();
    this.initializeTools();
  }

  async initializeAgent(): Promise<void> {
    // Create agent with access to all relevant tools
    this.agent = createAgent({
      model: 'openai:gpt-4',
      tools: Array.from(this.tools.values()),
      systemPrompt: this.createIntelligentSystemPrompt(),
      // Tool calling agent decides which tools to use
      toolChoice: 'auto'
    });
  }

  private createIntelligentSystemPrompt(): string {
    return `You are an intelligent Learning Catalyst agent with access to specialized tools.

AVAILABLE TOOLS:
- parseConcepts: Analyze content and extract educational concepts
- searchSessions: Find relevant past learning sessions
- createExercise: Generate practice exercises
- getLearningConfig: Access current learning configuration
- generateLearningPath: Create structured learning sequences

Your responsibilities:
1. Analyze each request to determine which tools would be most helpful
2. Use tools automatically when they add value to the response
3. Combine multiple tools when necessary for comprehensive answers
4. Provide educational responses that leverage tool insights
5. Always explain how you used tools to enhance your answer

Example workflow:
- User asks about a concept → Use parseConcepts + searchSessions
- User wants practice → Use createExercise + generateLearningPath
- User has questions → Use searchSessions to find relevant context

Be proactive in using tools to provide richer, more helpful educational responses.`;
  }

  private initializeTools(): void {
    // Dynamic tool loading based on agent type
    this.loadTool('parseConcepts', () => createParseConceptsTool(this.toolExecutor, this.sessionService));
    this.loadTool('searchSessions', () => createSearchSessionsTool(this.sessionService));
    this.loadTool('createExercise', () => createExerciseTool(this.toolExecutor));
    this.loadTool('generateLearningPath', () => createLearningPathTool(this.toolExecutor));
    this.loadTool('getLearningConfig', () => createConfigTool(this.configService));
  }

  private loadTool(name: string, toolFactory: () => any): void {
    try {
      const tool = toolFactory();
      this.tools.set(name, tool);
    } catch (error) {
      console.warn(`Failed to load tool ${name}:`, error);
    }
  }

  async processRequest(content: string, context?: any): Promise<any> {
    // Agent automatically decides which tools to use
    const result = await this.agent.invoke({
      messages: [
        {
          role: 'user',
          content: this.enhancePromptWithContext(content, context)
        }
      ]
    });

    return {
      response: result.content,
      toolsUsed: this.extractToolsUsed(result),
      metadata: result.metadata
    };
  }

  private enhancePromptWithContext(content: string, context?: any): string {
    let enhancedPrompt = content;

    if (context?.sessionId) {
      enhancedPrompt += `\n\nContext: Current learning session ID is ${context.sessionId}`;
    }

    if (context?.recentTopics) {
      enhancedPrompt += `\n\nRecent topics covered: ${context.recentTopics.join(', ')}`;
    }

    enhancedPrompt += `\n\nRemember to use available tools when they would enhance your response.`;

    return enhancedPrompt;
  }

  private extractToolsUsed(result: any): string[] {
    // Extract which tools were used from the agent response
    const toolCalls = result.tool_calls || [];
    return toolCalls.map(call => call.function.name);
  }
}
```

## Pattern 2: Handoffs Implementation

### Specialized Agents with Conversation Handoffs

```typescript
// electron/main/services/agents/HandoffManager.ts
export class HandoffManager {
  private agents: Map<AgentType, HandoffAgent>;
  private conversationState: ConversationState;

  constructor(agents: HandoffAgent[]) {
    this.agents = new Map();
    agents.forEach(agent => this.agents.set(agent.type, agent));
    this.conversationState = new ConversationState();
  }

  async processConversation(request: {
    initialMessage: string;
    context?: any;
  }): Promise<HandoffResult> {
    let currentAgentType: AgentType = 'learning';
    let currentMessage = request.initialMessage;
    const timeline: HandoffEvent[] = [];
    const agentsUsed: AgentType[] = [];

    do {
      const currentAgent = this.agents.get(currentAgentType);
      if (!currentAgent) {
        throw new Error(`Agent ${currentAgentType} not found`);
      }

      // Process message with current agent
      const result = await currentAgent.processMessage(currentMessage, {
        conversationState: this.conversationState,
        context: request.context,
        availableAgents: Array.from(this.agents.keys())
      });

      // Record agent usage
      if (!agentsUsed.includes(currentAgentType)) {
        agentsUsed.push(currentAgentType);
      }

      // Update conversation state
      this.conversationState.addMessage({
        agent: currentAgentType,
        content: result.response,
        metadata: result.metadata
      });

      // Check if agent wants to handoff
      if (result.handoff) {
        const handoffEvent: HandoffEvent = {
          from: currentAgentType,
          to: result.handoff.targetAgent,
          reason: result.handoff.reason,
          timestamp: new Date(),
          context: result.handoff.context
        };

        timeline.push(handoffEvent);
        currentAgentType = result.handoff.targetAgent;
        currentMessage = result.handoff.context || "Continue helping with this request.";
      } else {
        // No handoff needed, conversation complete
        break;
      }

      // Prevent infinite loops
      if (timeline.length > 10) {
        console.warn('Handoff loop detected, terminating conversation');
        break;
      }

    } while (true);

    return {
      finalResponse: this.conversationState.getLastResponse(),
      agentsUsed,
      handoffs: timeline,
      timeline,
      conversationSummary: this.conversationState.summarize()
    };
  }
}

// electron/main/services/agents/HandoffAgent.ts
export class HandoffAgent {
  constructor(
    public type: AgentType,
    private agent: any,
    private specialization: AgentSpecialization
  ) {}

  async processMessage(
    message: string,
    context: {
      conversationState: ConversationState;
      context?: any;
      availableAgents: AgentType[];
    }
  ): Promise<AgentResponse> {
    // Create system prompt with handoff awareness
    const systemPrompt = this.createHandoffSystemPrompt(context);

    // Process with handoff capabilities
    const result = await this.agent.invoke({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ]
    });

    // Analyze if handoff is needed
    const handoff = this.analyzeHandoffNeed(result, context);

    return {
      response: result.content,
      metadata: result.metadata,
      handoff
    };
  }

  private createHandoffSystemPrompt(context: any): string {
    const availableAgents = context.availableAgents.map(agent =>
      `${agent}: ${this.getAgentDescription(agent)}`
    ).join('\n');

    return `${this.specialization.systemPrompt}

HANDOFF CAPABILITIES:
You can hand off the conversation to other specialized agents when it would better serve the user's needs.

AVAILABLE AGENTS:
${availableAgents}

HANDOFF TRIGGERS:
- When user asks for assessment/evaluation → handoff to assessment
- When user needs practice exercises → handoff to practice
- When user wants research/information → handoff to research
- When user needs collaboration help → handoff to collaboration
- When conversation is outside your expertise → suggest appropriate handoff

HANDOFF FORMAT:
If you want to handoff, include in your response:
HANDOFF_TO: [agent_name]
REASON: [why this agent would be better]
CONTEXT: [brief context for the next agent]

Example:
"I think you'd be better served by our assessment specialist.

HANDOFF_TO: assessment
REASON: You're asking for evaluation of your understanding
CONTEXT: User wants to test their knowledge of machine learning concepts"

If no handoff is needed, just provide your response normally.`;
  }

  private analyzeHandoffNeed(result: any, context: any): HandoffDecision | null {
    const response = result.content;

    // Look for handoff markers in response
    const handoffMatch = response.match(/HANDOFF_TO:\s*(\w+)/i);
    const reasonMatch = response.match(/REASON:\s*(.+)/i);
    const contextMatch = response.match(/CONTEXT:\s*(.+)/i);

    if (handoffMatch) {
      return {
        targetAgent: handoffMatch[1].toLowerCase() as AgentType,
        reason: reasonMatch?.[1] || 'Better suited for this request',
        context: contextMatch?.[1] || ''
      };
    }

    return null;
  }

  private getAgentDescription(agentType: AgentType): string {
    const descriptions = {
      learning: 'Concept understanding, explanations, and knowledge building',
      assessment: 'Quizzes, evaluations, and progress tracking',
      tutoring: 'Personalized guidance and step-by-step support',
      practice: 'Exercises, coding challenges, and hands-on activities',
      research: 'Information gathering and analysis',
      collaboration: 'Group work facilitation and peer interaction'
    };
    return descriptions[agentType] || 'Specialized learning assistant';
  }
}
```

## Pattern 3: Hybrid Implementation

### Combining Tool Calling with Handoffs

```typescript
// electron/main/services/agents/HybridAgent.ts
export class HybridAgent {
  private primaryAgent: ToolCallingAgent;
  private handoffManager: HandoffManager;

  async processComplexRequest(request: ComplexRequest): Promise<HybridResponse> {
    // Step 1: Use tool calling agent for initial analysis
    const analysis = await this.primaryAgent.processRequest(
      `Analyze this request and determine the best approach: ${request.content}`,
      {
        sessionId: request.context?.sessionId,
        tools: ['analyzeComplexity', 'determineStrategy']
      }
    );

    const strategy = this.parseAgentStrategy(analysis.response);

    // Step 2: Execute based on strategy
    switch (strategy.approach) {
      case 'tools_only':
        return await this.executeWithTools(request, strategy);
      case 'handoff_sequence':
        return await this.executeWithHandoffs(request, strategy);
      case 'hybrid_parallel':
        return await this.executeHybridParallel(request, strategy);
      default:
        return await this.executeSimple(request);
    }
  }

  private async executeWithHandoffs(request: ComplexRequest, strategy: any): Promise<HybridResponse> {
    // Start with handoff manager for complex multi-step process
    const handoffResult = await this.handoffManager.processConversation({
      initialMessage: request.content,
      context: request.context
    });

    // Use tool calling agent to enhance/validate results
    const enhancement = await this.primaryAgent.processRequest(
      `Enhance and validate this learning sequence: ${JSON.stringify(handoffResult)}`,
      { tools: ['validateLearningPath', 'suggestImprovements'] }
    );

    return {
      primaryResponse: handoffResult.finalResponse,
      agentsUsed: handoffResult.agentsUsed,
      handoffs: handoffResult.handoffs,
      toolsUsed: this.primaryAgent.extractToolsUsed(enhancement),
      enhancements: enhancement.response,
      metadata: {
        strategy: 'handoff_sequence',
        timeline: handoffResult.timeline,
        validation: enhancement.metadata
      }
    };
  }
}
```

## Enhanced Catalyst API

### Simple Interface, Complex Backend

```typescript
// src/services/CatalystService.ts (Renderer - Simple Interface)
export class CatalystService {
  async askQuestion(question: string, options?: {
    complexity?: 'simple' | 'detailed' | 'comprehensive';
    context?: any;
    tools?: string[];
  }): Promise<CatalystResponse> {
    const request: CatalystRequest = {
      type: 'question',
      content: question,
      options: {
        strategy: this.determineOptimalStrategy(options),
        context: options?.context
      }
    };

    const result = await window.electronAPI.catalyst.process(request);

    return {
      response: result.response,
      metadata: {
        agentsUsed: result.metadata.agentsUsed,
        toolsUsed: result.metadata.toolsUsed,
        processingTime: result.metadata.processingTime,
        strategy: result.metadata.strategy
      }
    };
  }

  async analyzeContent(content: string, options?: {
    depth?: 'basic' | 'detailed' | 'comprehensive';
    extractRelationships?: boolean;
    generateExercises?: boolean;
  }): Promise<AnalysisResponse> {
    const request: CatalystRequest = {
      type: 'analysis',
      content,
      options: {
        strategy: {
          type: 'tool_calling',
          primaryAgent: 'learning',
          tools: ['parseConcepts', 'analyzeStructure', ...(options?.generateExercises ? ['createExercise'] : [])]
        }
      }
    };

    const result = await window.electronAPI.catalyst.process(request);
    return result.response;
  }

  async generateLearningPath(topic: string, options?: {
    currentLevel?: 'beginner' | 'intermediate' | 'advanced';
    goals?: string[];
    includeAssessments?: boolean;
  }): Promise<LearningPathResponse> {
    const request: CatalystRequest = {
      type: 'learning_path',
      content: topic,
      options: {
        strategy: {
          type: 'handoff',
          primaryAgent: 'learning',
          agents: ['learning', 'practice', 'assessment'],
          sequence: ['concept_introduction', 'practice_exercises', 'knowledge_assessment']
        }
      }
    };

    const result = await window.electronAPI.catalyst.process(request);
    return result.response;
  }

  private determineOptimalStrategy(options?: any): OrchestrationStrategy {
    if (options?.complexity === 'comprehensive' || options?.tools?.length > 2) {
      return {
        type: 'handoff',
        primaryAgent: 'learning',
        agents: ['learning', 'assessment', 'practice']
      };
    } else if (options?.tools?.length > 0) {
      return {
        type: 'tool_calling',
        primaryAgent: 'learning',
        tools: options.tools
      };
    } else {
      return {
        type: 'simple',
        primaryAgent: 'learning'
      };
    }
  }
}
```

## Benefits of Multi-Agent Orchestration

### 🎯 **Intelligent Routing**
- Automatic agent selection based on request analysis
- Dynamic tool selection for optimal responses
- Context-aware strategy switching

### 🧠 **Enhanced Capabilities**
- **Tool Calling**: Single agent with intelligent tool usage
- **Handoffs**: Multiple specialized agents collaborating
- **Hybrid**: Combining both approaches for complex scenarios

### 📈 **Scalability**
- Easy to add new agent types and capabilities
- Flexible orchestration patterns
- Context-aware decision making

### 🔧 **Maintainability**
- Clear separation between orchestration logic and agent implementation
- Modular agent design
- Centralized strategy management

This multi-agent approach gives Learning Catalyst **sophisticated AI capabilities** while maintaining a **simple, intuitive interface** for users and developers.