import { describe, it, expect, vi, beforeEach } from 'vitest';
import { evaluateNode } from '../evaluate';
import { WorkflowStateAnnotation } from '../state';
import { HumanMessage, AIMessage } from '@langchain/core/messages';

describe('evaluate node', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('evaluates user answer and calculates mastery', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: 'Score: 85%',
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue({
        model: mockModel,
        settings: { providerName: 'mock', model: 'mock', temperature: 0.7, maxTokens: 1024 },
      }),
    };

    const node = evaluateNode({ providerFactory: mockProviderFactory });

    const result = await node({
      messages: [],
      topic: 'React',
      practicePrompt: 'What is JSX?',
      userAnswer: 'JSX is a syntax extension for JavaScript',
      mastery: 0.5,
      attemptCount: 0,
    } as any);

    expect(mockProviderFactory.getModel).toHaveBeenCalledWith('chat');

    expect(mockModel.invoke).toHaveBeenCalledWith([
      expect.objectContaining({
        content: expect.stringContaining('Grade the user\'s answer'),
      }),
    ]);

    expect(result.mastery).toBe(0.85);
    expect(result.attemptCount).toBe(1);
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]).toBeInstanceOf(AIMessage);
    expect(result.messages[0].content).toBe('Score: 85%');
  });

  it('increments attempt count correctly', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: 'Score: 70%',
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue({
        model: mockModel,
        settings: { providerName: 'mock', model: 'mock', temperature: 0.7, maxTokens: 1024 },
      }),
    };

    const node = evaluateNode({ providerFactory: mockProviderFactory });

    const result = await node({
      messages: [],
      topic: 'JavaScript',
      practicePrompt: 'What is a closure?',
      userAnswer: 'A closure is...',
      mastery: 0.3,
      attemptCount: 2,
    } as any);

    expect(result.attemptCount).toBe(3);
    expect(result.mastery).toBe(0.7);
  });

  it('handles perfect score', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: 'Score: 100%',
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue({
        model: mockModel,
        settings: { providerName: 'mock', model: 'mock', temperature: 0.7, maxTokens: 1024 },
      }),
    };

    const node = evaluateNode({ providerFactory: mockProviderFactory });

    const result = await node({
      messages: [],
      topic: 'TypeScript',
      practicePrompt: 'Define an interface',
      userAnswer: 'interface Person { name: string }',
      mastery: 0.0,
      attemptCount: 0,
    } as any);

    expect(result.mastery).toBe(1.0);
    expect(result.attemptCount).toBe(1);
  });

  it('handles zero score', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: 'Score: 0%',
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue({
        model: mockModel,
        settings: { providerName: 'mock', model: 'mock', temperature: 0.7, maxTokens: 1024 },
      }),
    };

    const node = evaluateNode({ providerFactory: mockProviderFactory });

    const result = await node({
      messages: [],
      topic: 'React',
      practicePrompt: 'What is state?',
      userAnswer: 'I don\'t know',
      mastery: 0.0,
      attemptCount: 0,
    } as any);

    expect(result.mastery).toBe(0.0);
    expect(result.attemptCount).toBe(1);
  });

  it('falls back to existing mastery when parsing fails', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: 'No score in this response',
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue({
        model: mockModel,
        settings: { providerName: 'mock', model: 'mock', temperature: 0.7, maxTokens: 1024 },
      }),
    };

    const node = evaluateNode({ providerFactory: mockProviderFactory });

    const result = await node({
      messages: [],
      topic: 'JavaScript',
      practicePrompt: 'Question?',
      userAnswer: 'Answer',
      mastery: 0.75,
      attemptCount: 1,
    } as any);

    expect(result.mastery).toBe(0.75); // Falls back to existing mastery
    expect(result.attemptCount).toBe(2);
  });

  it('uses default mastery when both parsing and existing mastery fail', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: 'Invalid response',
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue({
        model: mockModel,
        settings: { providerName: 'mock', model: 'mock', temperature: 0.7, maxTokens: 1024 },
      }),
    };

    const node = evaluateNode({ providerFactory: mockProviderFactory });

    const result = await node({
      messages: [],
      topic: 'React',
      practicePrompt: 'Question?',
      userAnswer: 'Answer',
      mastery: undefined,
      attemptCount: 0,
    } as any);

    expect(result.mastery).toBe(0.5); // Default mastery
    expect(result.attemptCount).toBe(1);
  });

  it('handles missing practice prompt and answer', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: 'Score: 80%',
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue({
        model: mockModel,
        settings: { providerName: 'mock', model: 'mock', temperature: 0.7, maxTokens: 1024 },
      }),
    };

    const node = evaluateNode({ providerFactory: mockProviderFactory });

    const result = await node({
      messages: [],
      topic: 'JavaScript',
      practicePrompt: undefined,
      userAnswer: undefined,
      mastery: 0.0,
      attemptCount: 0,
    } as any);

    expect(mockModel.invoke).toHaveBeenCalledWith([
      expect.objectContaining({
        content: expect.stringContaining('Grade the user\'s answer'),
      }),
    ]);

    expect(result.mastery).toBe(0.8);
    expect(result.attemptCount).toBe(1);
  });

  it('passes topic and content to model correctly', async () => {
    const mockModel = {
      invoke: vi.fn().mockResolvedValue({
        content: 'Score: 90%',
      }),
    };

    const mockProviderFactory = {
      getModel: vi.fn().mockResolvedValue({
        model: mockModel,
        settings: { providerName: 'mock', model: 'mock', temperature: 0.7, maxTokens: 1024 },
      }),
    };

    const node = evaluateNode({ providerFactory: mockProviderFactory });

    await node({
      messages: [],
      topic: 'TypeScript',
      practicePrompt: 'What is a type?',
      userAnswer: 'A type is...',
      mastery: 0.0,
      attemptCount: 0,
    } as any);

    const callArgs = mockModel.invoke.mock.calls[0][0][0];
    expect(callArgs.content).toContain('TypeScript');
    expect(callArgs.content).toContain('What is a type?');
    expect(callArgs.content).toContain('A type is...');
  });
});
