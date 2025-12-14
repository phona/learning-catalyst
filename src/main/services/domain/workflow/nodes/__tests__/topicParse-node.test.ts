import { describe, it, expect, vi, beforeEach } from 'vitest';
import { topicParseNode } from '../topicParse';
import { WorkflowStateAnnotation } from '../state';
import { AIMessage, HumanMessage } from '@langchain/core/messages';
import type { LangGraphRunnableConfig } from '@langchain/langgraph';

const createMockConfig = (): LangGraphRunnableConfig => ({
  writer: vi.fn(),
} as any);

describe('topicParse node', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('parses valid topic with concept matches', async () => {
    const mockKnowledgeService = {
      ingestConceptParsingResult: vi.fn(),
      searchKnowledge: vi.fn(),
      semanticSearch: vi.fn(),  // ← NEW method
      exploreConcept: vi.fn(),
      getRelatedConcepts: vi.fn(),
      getKnowledgeMap: vi.fn(),
      findRelatedByPrompt: vi.fn().mockResolvedValue({
        matches: [
          { type: 'concept', name: 'React' },
          { type: 'relationship', name: 'JavaScript' },
          { type: 'relationship', name: 'JSX' },
          { type: 'relationship', name: 'Components' },
        ],
      }),
    };

    const node = topicParseNode({ knowledgeService: mockKnowledgeService });

    const result = await node({
      messages: [],
      topic: 'React',
    }, createMockConfig());

    expect(mockKnowledgeService.findRelatedByPrompt).toHaveBeenCalledWith('React', {
      limit: 10,
      threshold: 0.6,
    });

    expect(result.topic).toBe('React');
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]).toBeInstanceOf(AIMessage);
    expect(result.messages[0].content).toContain('Topic: React');
    expect(result.messages[0].content).toContain('Related: JavaScript, JSX, Components');
  });

  it('handles topic with no relationships', async () => {
    const mockKnowledgeService = {
      ingestConceptParsingResult: vi.fn(),
      searchKnowledge: vi.fn(),
      semanticSearch: vi.fn(),  // ← NEW method
      exploreConcept: vi.fn(),
      getRelatedConcepts: vi.fn(),
      getKnowledgeMap: vi.fn(),
      findRelatedByPrompt: vi.fn().mockResolvedValue({
        matches: [
          { type: 'concept', name: 'React' },
        ],
      }),
    };

    const node = topicParseNode({ knowledgeService: mockKnowledgeService });

    const result = await node({
      messages: [],
      topic: 'React',
    }, createMockConfig());

    expect(result.topic).toBe('React');
    expect(result.messages[0].content).toBe('Topic: React');
  });

  it('handles empty topic gracefully', async () => {
    const mockKnowledgeService = {
      ingestConceptParsingResult: vi.fn(),
      searchKnowledge: vi.fn(),
      semanticSearch: vi.fn(),  // ← NEW method
      exploreConcept: vi.fn(),
      getRelatedConcepts: vi.fn(),
      getKnowledgeMap: vi.fn(),
      findRelatedByPrompt: vi.fn(),
    };

    const node = topicParseNode({ knowledgeService: mockKnowledgeService });

    const result = await node({
      messages: [],
      topic: '',
    }, createMockConfig());

    expect(mockKnowledgeService.findRelatedByPrompt).not.toHaveBeenCalled();
    expect(result.error).toBe('No topic provided. Please specify what you want to learn about.');
    expect(result.messages).toBeUndefined();
    expect(result.topic).toBeUndefined();
  });

  it('handles topic from last user message', async () => {
    const mockKnowledgeService = {
      ingestConceptParsingResult: vi.fn(),
      searchKnowledge: vi.fn(),
      semanticSearch: vi.fn(),  // ← NEW method
      exploreConcept: vi.fn(),
      getRelatedConcepts: vi.fn(),
      getKnowledgeMap: vi.fn(),
      findRelatedByPrompt: vi.fn().mockResolvedValue({
        matches: [
          { type: 'concept', name: 'TypeScript' },
        ],
      }),
    };

    const node = topicParseNode({ knowledgeService: mockKnowledgeService });

    const result = await node({
      messages: [
        new HumanMessage('I want to learn TypeScript'),
      ],
      topic: undefined,
    }, createMockConfig());

    expect(mockKnowledgeService.findRelatedByPrompt).toHaveBeenCalledWith('I want to learn TypeScript', {
      limit: 10,
      threshold: 0.6,
    });

    expect(result.topic).toBe('TypeScript');
  });

  it('handles no matching concepts found', async () => {
    const mockKnowledgeService = {
      ingestConceptParsingResult: vi.fn(),
      searchKnowledge: vi.fn(),
      semanticSearch: vi.fn(),  // ← NEW method
      exploreConcept: vi.fn(),
      getRelatedConcepts: vi.fn(),
      getKnowledgeMap: vi.fn(),
      findRelatedByPrompt: vi.fn().mockResolvedValue({
        matches: [],
      }),
    };

    const node = topicParseNode({ knowledgeService: mockKnowledgeService });

    const result = await node({
      messages: [],
      topic: 'UnknownTopic',
    }, createMockConfig());

    // Error field is set with topic not found message
    expect(result.error).toBe('Topic "UnknownTopic" not found in knowledge base.');
    // Topic is undefined - workflow will stop
    expect(result.topic).toBeUndefined();
    // Messages field is undefined when topic not found
    expect(result.messages).toBeUndefined();
  });

  it('handles errors gracefully', async () => {
    const mockKnowledgeService = {
      ingestConceptParsingResult: vi.fn(),
      searchKnowledge: vi.fn(),
      semanticSearch: vi.fn(),  // ← NEW method
      exploreConcept: vi.fn(),
      getRelatedConcepts: vi.fn(),
      getKnowledgeMap: vi.fn(),
      findRelatedByPrompt: vi.fn().mockRejectedValue(new Error('Database error')),
    };

    const node = topicParseNode({ knowledgeService: mockKnowledgeService });

    // Should reject the promise when database error occurs
    await expect(node({
      messages: [],
      topic: 'React',
    }, createMockConfig())).rejects.toThrow('Database error');
  });

  it('normalizes and trims topic text', async () => {
    const mockKnowledgeService = {
      ingestConceptParsingResult: vi.fn(),
      searchKnowledge: vi.fn(),
      semanticSearch: vi.fn(),  // ← NEW method
      exploreConcept: vi.fn(),
      getRelatedConcepts: vi.fn(),
      getKnowledgeMap: vi.fn(),
      findRelatedByPrompt: vi.fn().mockResolvedValue({
        matches: [
          { type: 'concept', name: 'React' },
        ],
      }),
    };

    const node = topicParseNode({ knowledgeService: mockKnowledgeService });

    const result = await node({
      messages: [],
      topic: '  React  ',
    }, createMockConfig());

    expect(mockKnowledgeService.findRelatedByPrompt).toHaveBeenCalledWith('React', {
      limit: 10,
      threshold: 0.6,
    });
  });
});
