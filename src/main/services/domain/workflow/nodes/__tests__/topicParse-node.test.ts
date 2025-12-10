import { describe, it, expect, vi, beforeEach } from 'vitest';
import { topicParseNode } from '../topicParse';
import { WorkflowStateAnnotation } from '../state';
import { AIMessage, HumanMessage } from '@langchain/core/messages';

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
    } as any);

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
    } as any);

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
    } as any);

    expect(mockKnowledgeService.findRelatedByPrompt).not.toHaveBeenCalled();
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].content).toBe('No topic provided. Please specify what you want to learn about.');
    expect(result.topic).toBe('');
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
    } as any);

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
    } as any);

    expect(result.messages[0].content).toBe('No matching concepts found. Try importing learning materials or rephrasing your question.');
    expect(result.topic).toBe('UnknownTopic');
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

    const result = await node({
      messages: [],
      topic: 'React',
    } as any);

    expect(result.messages[0].content).toContain('Failed to parse topic: Database error');
    expect(result.topic).toBe('React');
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
    } as any);

    expect(mockKnowledgeService.findRelatedByPrompt).toHaveBeenCalledWith('React', {
      limit: 10,
      threshold: 0.6,
    });
  });
});
