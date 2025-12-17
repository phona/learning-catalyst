/**
 * Mock LangChain Services
 *
 * Comprehensive mock framework for LangChain services including
 * models, agents, tools, chains, and memory components.
 * Enables isolated testing of main thread services without
 * requiring actual AI API calls.
 */

import { vi } from 'vitest';

// Mock Chat Models
export const mockChatOpenAI = vi.fn().mockImplementation((config: unknown) => {
  const model = config?.modelName || 'gpt-3.5-turbo';
  const temperature = config?.temperature || 0.7;
  const maxTokens = config?.maxTokens || 1000;
  return {
    _modelType: 'openai-chat',
    model,
    temperature,
    maxTokens,
    stream: vi.fn().mockImplementation(async function* (messages: any[]) {
      const response = `Mock OpenAI response to: ${messages[messages.length - 1]?.content || 'empty message'}`;
      const chunks = response.split(' ').map((word) => word + ' ');
      for (const chunk of chunks) {
        yield {
          content: chunk,
          additional_kwargs: { mock: true },
          response_metadata: { model, usage: { total_tokens: 50 } },
        };
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    }),
    invoke: vi.fn().mockImplementation(async (messages: any[]) => {
      return {
        content: `Mock OpenAI response to: ${messages[messages.length - 1]?.content || 'empty message'}`,
        additional_kwargs: { mock: true },
        response_metadata: { model, usage: { total_tokens: 50 } },
      };
    }),
    batch: vi.fn().mockImplementation(async (batchMessages: any[][]) => {
      return batchMessages.map((messages) => ({
        content: `Mock OpenAI batch response to: ${messages[messages.length - 1]?.content || 'empty message'}`,
        additional_kwargs: { mock: true },
        response_metadata: { model, usage: { total_tokens: 50 } },
      }));
    }),
    bind: vi.fn().mockReturnThis(),
    getNumTokens: vi.fn().mockResolvedValue(50),
    getNumTokensFromMessages: vi.fn().mockResolvedValue(50),
  };
});

// Mock Anthropic Claude
export const mockChatAnthropic = vi.fn().mockImplementation((config: unknown) => {
  const model = config?.model || 'claude-3-sonnet-20241022';
  const temperature = config?.temperature || 0.7;
  const maxTokens = config?.maxTokens || 1000;
  return {
    _modelType: 'anthropic-chat',
    model,
    temperature,
    maxTokens,
    stream: vi.fn().mockImplementation(async function* (messages: any[]) {
      const response = `Mock Anthropic response to: ${messages[messages.length - 1]?.content || 'empty message'}`;
      const chunks = response.split(' ').map((word) => word + ' ');
      for (const chunk of chunks) {
        yield {
          content: chunk,
          additional_kwargs: { mock: true, provider: 'anthropic' },
          response_metadata: { model, usage: { total_tokens: 60 } },
        };
        await new Promise((resolve) => setTimeout(resolve, 15));
      }
    }),
    invoke: vi.fn().mockImplementation(async (messages: any[]) => {
      return {
        content: `Mock Anthropic response to: ${messages[messages.length - 1]?.content || 'empty message'}`,
        additional_kwargs: { mock: true, provider: 'anthropic' },
        response_metadata: { model, usage: { total_tokens: 60 } },
      };
    }),
  };
});

// Mock ChatGLM
export const mockChatGLM = vi.fn().mockImplementation((config: unknown) => {
  const model = config?.model || 'glm-4';
  const temperature = config?.temperature || 0.7;
  const maxTokens = config?.maxTokens || 1000;
  return {
    _modelType: 'chatglm-chat',
    model,
    temperature,
    maxTokens,
    stream: vi.fn().mockImplementation(async function* (messages: any[]) {
      const thinking = `Thinking: User wants "${messages[messages.length - 1]?.content || 'empty message'}". I should provide a helpful response considering the context...`;
      const response = `Mock ChatGLM response to: ${messages[messages.length - 1]?.content || 'empty message'}`;
      yield {
        content: thinking,
        additional_kwargs: { mock: true, provider: 'chatglm', thinking: true },
        response_metadata: { model, stage: 'thinking' },
      };
      await new Promise((resolve) => setTimeout(resolve, 100));
      const chunks = response.split(' ').map((word) => word + ' ');
      for (const chunk of chunks) {
        yield {
          content: chunk,
          additional_kwargs: { mock: true, provider: 'chatglm', thinking: false },
          response_metadata: { model, stage: 'response' },
        };
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
    }),
    invoke: vi.fn().mockImplementation(async (messages: any[]) => {
      const thinking = `Thinking: User wants "${messages[messages.length - 1]?.content || 'empty message'}". I should provide a helpful response...`;
      return {
        content: `${thinking}\n\nMock ChatGLM response to: ${messages[messages.length - 1]?.content || 'empty message'}`,
        additional_kwargs: { mock: true, provider: 'chatglm', thinking: true },
        response_metadata: { model, usage: { total_tokens: 80 } },
      };
    }),
  };
});

// Mock LangChain Agents
export const mockAgentExecutor = vi.fn().mockImplementation((config: unknown) => ({
  agent: config?.agent || { lc_kwargs: { name: 'MockAgent' } },
  tools: config?.tools || [mockTool],
  maxIterations: config?.maxIterations || 10,
  maxExecutionTime: config?.maxExecutionTime || 60000,

  invoke: vi.fn().mockImplementation(async (input: any) => {
    const { input: userInput } = input;

    // Simulate tool usage
    const toolResults = [];
    if (typeof userInput === 'string' && userInput.includes('database')) {
      toolResults.push({
        tool: 'database_query',
        input: 'SELECT * FROM concepts',
        output: '[{id: 1, name: "Concept 1"}, {id: 2, name: "Concept 2"}]',
      });
    }

    return {
      output: `Mock agent response to: ${userInput}`,
      intermediateSteps: toolResults.map((result) => [
        { tool: result.tool, toolInput: result.input },
        result.output,
      ]),
      // Mock structured agent response
      structuredOutput: {
        answer: `Mock agent response to: ${userInput}`,
        reasoning: 'I analyzed the request and provided a comprehensive response',
        toolUsage: toolResults.length > 0,
        confidence: 0.95,
      },
    };
  }),

  stream: vi.fn().mockImplementation(async function* (input: any) {
    const response = `Mock agent streaming response to: ${input.input || input}`;
    const chunks = response.split(' ').map((word) => word + ' ');

    for (const chunk of chunks) {
      yield {
        actions: [],
        observations: [],
        output: chunk,
      };
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }),

  // Mock agent state management
  saveAgentState: vi.fn().mockResolvedValue({
    state: { steps: 0, lastOutput: 'Mock state' },
    checkpoint: 'mock-checkpoint-id',
  }),

  loadAgentState: vi.fn().mockResolvedValue({
    steps: 0,
    lastOutput: 'Mock loaded state',
  }),
}));

// Mock Tools
export const mockTool = {
  name: 'mock_tool',
  description: 'A mock tool for testing',
  schema: {
    type: 'object',
    properties: {
      input: { type: 'string', description: 'Input for the mock tool' },
    },
    required: ['input'],
  },

  _run: vi.fn().mockImplementation(async (input: string) => {
    return `Mock tool processed: ${input}`;
  }),

  async call(input: string) {
    return this._run(input);
  },
};

export const mockDatabaseTool = {
  name: 'database_query',
  description: 'Execute database queries',
  schema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'SQL query to execute' },
    },
    required: ['query'],
  },

  _run: vi.fn().mockImplementation(async (query: string) => {
    // Mock different query types
    if (query.includes('SELECT')) {
      return [
        { id: 1, name: 'Test Concept 1', description: 'Test description 1' },
        { id: 2, name: 'Test Concept 2', description: 'Test description 2' },
      ];
    } else if (query.includes('INSERT') || query.includes('UPDATE')) {
      return { affectedRows: 1, insertId: Date.now() };
    } else {
      return { success: true, message: 'Query executed successfully' };
    }
  }),

  async call(query: string) {
    return this._run(query);
  },
};

// Mock Memory/Conversation History
export const mockBufferMemory = vi.fn().mockImplementation(() => {
  const chatHistory: any[] = [];
  return {
    chatHistory,
    saveContext: vi.fn().mockImplementation(async (input: any, output: any) => {
      chatHistory.push({ type: 'human', content: input }, { type: 'ai', content: output });
    }),
    loadMemoryVariables: vi.fn().mockImplementation(async () => ({
      history: chatHistory,
    })),
    clear: vi.fn().mockImplementation(async () => {
      chatHistory.splice(0, chatHistory.length);
    }),
    get buffer() {
      return chatHistory;
    },
  };
});

// Mock Prompt Templates
export const mockChatPromptTemplate = vi.fn().mockImplementation((config: unknown) => {
  const template = config?.template || 'Template: {input}';
  const inputVariables = config?.inputVariables || ['input'];
  return {
    template,
    inputVariables,
    format: vi.fn().mockImplementation((values: any) => {
      let formatted = template;
      inputVariables.forEach((variable: string) => {
        formatted = formatted.replace(`{${variable}}`, values[variable] || '');
      });
      return formatted;
    }),
    formatMessages: vi.fn().mockImplementation((values: any) => {
      const formatted = (this as any).format(values);
      return [{ type: 'system', content: formatted }];
    }),
    partial: vi.fn().mockReturnThis(),
    invoke: vi.fn().mockImplementation(async (values: any) => {
      return (this as any).format(values);
    }),
  };
});

// Mock Chains
export const mockLLMChain = vi.fn().mockImplementation((config: unknown) => {
  const llm = config?.llm || mockChatOpenAI({});
  const prompt = config?.prompt || mockChatPromptTemplate({ template: 'Default: {input}' });
  const memory = config?.memory || mockBufferMemory();
  const outputParser = config?.outputParser || {
    parse: async (text: string) => ({ result: text }),
    getFormatInstructions: () => 'Output format instructions',
  };
  return {
    llm,
    prompt,
    invoke: vi.fn().mockImplementation(async (input: any) => {
      const formattedPrompt = await (prompt as any).format(input);
      const response = await (llm as any).invoke([{ type: 'system', content: formattedPrompt }]);
      return response;
    }),
    stream: vi.fn().mockImplementation(async function* (input: any) {
      const formattedPrompt = await (prompt as any).format(input);
      const iterator = (llm as any).stream([{ type: 'system', content: formattedPrompt }]);
      for await (const chunk of iterator) {
        yield chunk;
      }
    }),
    memory,
    outputParser,
  };
});

// Mock Output Parsers
export const mockStructuredOutputParser = vi.fn().mockImplementation((schema: any) => {
  return {
    schema,
    parse: vi.fn().mockImplementation(async (text: string) => {
      return {
        result: text,
        confidence: 0.9,
        structured: true,
        schema,
      };
    }),
    getFormatInstructions: vi
      .fn()
      .mockReturnValue('Format your response as valid JSON matching the provided schema.'),
  };
});

// Mock Document and Text Splitters
export const mockDocument = vi.fn().mockImplementation((pageContent: string, metadata?: any) => ({
  pageContent,
  metadata: metadata || { source: 'mock-source' },

  // Mock document operations
  getPageContent: vi.fn().mockReturnValue(pageContent),
  getMetadata: vi.fn().mockReturnValue(metadata || {}),
  lookup: vi.fn().mockReturnValue(null),
}));

export const mockRecursiveCharacterTextSplitter = vi.fn().mockImplementation((config: unknown) => {
  const chunkSize = config?.chunkSize || 1000;
  const chunkOverlap = config?.chunkOverlap || 200;
  return {
    chunkSize,
    chunkOverlap,
    splitDocuments: vi.fn().mockImplementation(async (documents: any[]) => {
      const chunks: any[] = [];
      documents.forEach((doc) => {
        const content = doc.pageContent;
        const size = chunkSize;
        const overlap = chunkOverlap;
        for (let i = 0; i < content.length; i += size - overlap) {
          chunks.push(
            mockDocument(content.slice(i, i + size), {
              ...doc.metadata,
              chunkIndex: Math.floor(i / (size - overlap)),
            }),
          );
        }
      });
      return chunks;
    }),
    createDocuments: vi.fn().mockImplementation(async (texts: string[]) => {
      return texts.map((text) => mockDocument(text));
    }),
    splitText: vi.fn().mockImplementation((text: string) => {
      const chunks: string[] = [];
      const size = chunkSize;
      const overlap = chunkOverlap;
      for (let i = 0; i < text.length; i += size - overlap) {
        chunks.push(text.slice(i, i + size));
      }
      return chunks;
    }),
  };
});

// Mock Callback Handlers for monitoring
export const mockCallbackHandler = vi.fn().mockImplementation(() => {
  const starts: any[] = [];
  const ends: any[] = [];
  const errors: any[] = [];
  const chains: any[] = [];
  const llms: any[] = [];
  const tools: any[] = [];
  const agents: any[] = [];
  return {
    starts,
    ends,
    errors,
    chains,
    llms,
    tools,
    agents,
    onChainStart: vi.fn().mockImplementation(async (serialized, inputs) => {
      chains.push({ type: 'start', serialized, inputs, timestamp: Date.now() });
    }),
    onChainEnd: vi.fn().mockImplementation(async (outputs) => {
      chains.push({ type: 'end', outputs, timestamp: Date.now() });
    }),
    onChainError: vi.fn().mockImplementation(async (error) => {
      errors.push({ type: 'chain', error, timestamp: Date.now() });
    }),
    onLLMStart: vi.fn().mockImplementation(async (serialized, prompts) => {
      llms.push({ type: 'start', serialized, prompts, timestamp: Date.now() });
    }),
    onLLMEnd: vi.fn().mockImplementation(async (outputs) => {
      llms.push({ type: 'end', outputs, timestamp: Date.now() });
    }),
    onLLMError: vi.fn().mockImplementation(async (error) => {
      errors.push({ type: 'llm', error, timestamp: Date.now() });
    }),
    onToolStart: vi.fn().mockImplementation(async (serialized, input) => {
      tools.push({ type: 'start', serialized, input, timestamp: Date.now() });
    }),
    onToolEnd: vi.fn().mockImplementation(async (output) => {
      tools.push({ type: 'end', output, timestamp: Date.now() });
    }),
    onToolError: vi.fn().mockImplementation(async (error) => {
      errors.push({ type: 'tool', error, timestamp: Date.now() });
    }),
    onAgentAction: vi.fn().mockImplementation(async (action) => {
      agents.push({ type: 'action', action, timestamp: Date.now() });
    }),
    onAgentFinish: vi.fn().mockImplementation(async (finish) => {
      agents.push({ type: 'finish', finish, timestamp: Date.now() });
    }),
    reset: vi.fn().mockImplementation(() => {
      starts.splice(0, starts.length);
      ends.splice(0, ends.length);
      errors.splice(0, errors.length);
      chains.splice(0, chains.length);
      llms.splice(0, llms.length);
      tools.splice(0, tools.length);
      agents.splice(0, agents.length);
    }),
  };
});

// Export all mocks for easy importing
export const LangChainMocks = {
  // Models
  ChatOpenAI: mockChatOpenAI,
  ChatAnthropic: mockChatAnthropic,
  ChatGLM: mockChatGLM,

  // Agents
  AgentExecutor: mockAgentExecutor,

  // Tools
  MockTool: mockTool,
  MockDatabaseTool: mockDatabaseTool,

  // Memory
  BufferMemory: mockBufferMemory,

  // Prompts
  ChatPromptTemplate: mockChatPromptTemplate,

  // Chains
  LLMChain: mockLLMChain,

  // Parsers
  StructuredOutputParser: mockStructuredOutputParser,

  // Documents and Splitters
  Document: mockDocument,
  RecursiveCharacterTextSplitter: mockRecursiveCharacterTextSplitter,

  // Callbacks
  CallbackHandler: mockCallbackHandler,
};

// Export default mock collection
export default LangChainMocks;
