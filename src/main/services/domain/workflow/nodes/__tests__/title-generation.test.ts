import { describe, it, expect, vi } from 'vitest';
import { titleGenerateNode } from '../titleGenerate';
import { RunnableLambda } from '@langchain/core/runnables';
import { AIMessage } from '@langchain/core/messages';

describe('Title Generation Worknode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate title from user message', async () => {
    // Use RunnableLambda with correct constructor signature
    const mockLlm = new RunnableLambda({
      func: async (_input) => {
        // Parser expects JSON matching Zod schema
        return new AIMessage(JSON.stringify({ title: 'Test Title' }));
      },
    });

    const mockDeps = {
      providerFactory: {
        getModel: vi.fn().mockResolvedValue(mockLlm),
      },
    } as any;

    const node = titleGenerateNode(mockDeps);

    const state = {
      messages: [
        {
          role: 'user' as const,
          content: 'Test message',
        },
      ],
      sessionMetadata: {
        title: 'New Chat',
      },
    } as any;

    const result = await node(state);

    expect(result.sessionMetadata.title).toBe('Test Title');
    expect(mockDeps.providerFactory.getModel).toHaveBeenCalled();
  });

  it('should handle empty content', async () => {
    const mockDeps = {
      providerFactory: {
        getModel: vi.fn().mockResolvedValue({}),
      },
    } as any;

    const node = titleGenerateNode(mockDeps);

    const state = {
      messages: [
        {
          role: 'user' as const,
          content: '',
        },
      ],
      sessionMetadata: {
        title: 'New Chat',
      },
    } as any;

    const result = await node(state);

    expect(result.sessionMetadata.title).toBe('New Chat');
  });

  it('should preserve existing title', async () => {
    const mockDeps = {
      providerFactory: {
        getModel: vi.fn().mockResolvedValue({}),
      },
    } as any;

    const node = titleGenerateNode(mockDeps);

    const state = {
      messages: [
        {
          role: 'user' as const,
          content: 'Test message',
        },
      ],
      sessionMetadata: {
        title: 'Existing Title',
      },
    } as any;

    const result = await node(state);

    expect(result.sessionMetadata.title).toBe('Existing Title');
  });

  it('should handle errors gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Use RunnableLambda that throws an error
    const mockLlm = new RunnableLambda({
      func: async (_input) => {
        throw new Error('Test error');
      },
    });

    const mockDeps = {
      providerFactory: {
        getModel: vi.fn().mockResolvedValue(mockLlm),
      },
    } as any;

    const node = titleGenerateNode(mockDeps);

    const state = {
      messages: [
        {
          role: 'user' as const,
          content: 'Test message',
        },
      ],
      sessionMetadata: {
        title: 'New Chat',
      },
    } as any;

    const result = await node(state);

    expect(result.sessionMetadata.title).toBe('New Chat');
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
