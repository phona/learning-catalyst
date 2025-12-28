/**
 * Unit Tests: Workflow Message Normalization
 *
 * PURPOSE:
 * Verify that message normalization utilities correctly transform LangChain messages
 * and workflow output into formats compatible with the AI SDK and IPC communication.
 *
 * TEST STRATEGY:
 * 1. Test convertToPlainMessage with LangChain messages (lc_kwargs format)
 * 2. Test convertToPlainMessage with plain message objects
 * 3. Test convertMessagesToPlain for batch conversion
 * 4. Test normalizeWorkflowOutput for node output transformation
 * 5. Test createStructuredMessage for tool messages
 * 6. Test createAssistantMessage for text responses
 * 7. Test validation functions (validateNormalizedMessage, etc.)
 * 8. Test toOpenAIMessage and toOpenAIMessages for final transformation
 * 9. Test edge cases (empty arrays, null/undefined, malformed messages)
 *
 * DEPENDENCIES:
 * - @langchain/core/messages for BaseMessage types
 */

import { describe, it, expect } from 'vitest';
import {
  convertToPlainMessage,
  convertMessagesToPlain,
  normalizeWorkflowOutput,
  createStructuredMessage,
  createAssistantMessage,
  validateNormalizedMessage,
  validateNormalizedMessages,
  addMessageMetadata,
  stripMessageMetadata,
  toOpenAIMessage,
  toOpenAIMessages,
  createIPCMessage,
} from '../utils/normalization';
import { NodeName } from '../types';
import { HumanMessage, AIMessage, ToolMessage } from '@langchain/core/messages';

// Helper to create LangChain messages with lc_kwargs serialization
const createLangChainMessage = (role: string, content: string) => ({
  lc_serializable: true,
  lc_kwargs: {
    role,
    content,
  },
  role,
  content,
});

// Helper to create plain message object
const createPlainMessage = (role: string, content: string) => ({
  role,
  content,
});

describe('Workflow Message Normalization', () => {
  describe('convertToPlainMessage', () => {
    describe('with LangChain serialized messages', () => {
      it('should convert LangChain message to normalized format', () => {
        const langchainMsg = createLangChainMessage('user', 'Hello world');
        const result = convertToPlainMessage(langchainMsg);

        expect(result.role).toBe('user');
        expect(result.content).toBe('Hello world');
      });

      it('should handle assistant messages', () => {
        const langchainMsg = createLangChainMessage('assistant', 'I can help');
        const result = convertToPlainMessage(langchainMsg);

        expect(result.role).toBe('assistant');
        expect(result.content).toBe('I can help');
      });

      it('should handle tool messages with object content', () => {
        const langchainMsg = createLangChainMessage('tool', JSON.stringify({ data: 'value' }));
        const result = convertToPlainMessage(langchainMsg);

        expect(result.role).toBe('tool');
        expect(result.content).toBe('{"data":"value"}');
      });

      it('should attach metadata when nodeName is provided', () => {
        const langchainMsg = createLangChainMessage('assistant', 'Response');
        const result = convertToPlainMessage(langchainMsg, NodeName.PRACTICE);

        expect(result.agentType).toBe('practice');
        expect(result.workflowNode).toBe('Practice');
      });

      it('should map node names to correct agent types', () => {
        const testCases: Array<[NodeName, string]> = [
          [NodeName.ASSESS, 'assessment'],
          [NodeName.FAST_TRACK_QUIZ, 'assessment'],
          [NodeName.GRADE_QUIZ, 'assessment'],
          [NodeName.EVALUATE, 'assessment'],
          [NodeName.TEACH, 'learning'],
          [NodeName.PRACTICE, 'practice'],
          [NodeName.COMPLETE, 'tutoring'],
        ];

        for (const [nodeName, expectedAgentType] of testCases) {
          const langchainMsg = createLangChainMessage('assistant', 'Test');
          const result = convertToPlainMessage(langchainMsg, nodeName);
          expect(result.agentType).toBe(expectedAgentType);
        }
      });

      it('should default to learning agent type for unknown nodes', () => {
        const langchainMsg = createLangChainMessage('assistant', 'Test');
        const result = convertToPlainMessage(langchainMsg, 'UnknownNode' as NodeName);

        expect(result.agentType).toBe('learning');
        expect(result.workflowNode).toBe('UnknownNode');
      });
    });

    describe('with plain message objects', () => {
      it('should convert plain message to normalized format', () => {
        const plainMsg = createPlainMessage('user', 'Hello');
        const result = convertToPlainMessage(plainMsg);

        expect(result.role).toBe('user');
        expect(result.content).toBe('Hello');
      });

      it('should handle string content', () => {
        const plainMsg = createPlainMessage('assistant', 'Plain text response');
        const result = convertToPlainMessage(plainMsg);

        expect(result.content).toBe('Plain text response');
      });

      it('should handle object content by stringifying', () => {
        const plainMsg = {
          role: 'tool' as const,
          content: JSON.stringify({ key: 'value', nested: { data: 123 } }),
        };
        const result = convertToPlainMessage(plainMsg);

        expect(result.role).toBe('tool');
        expect(result.content).toBe(plainMsg.content);
      });

      it('should attach metadata when nodeName is provided', () => {
        const plainMsg = createPlainMessage('assistant', 'Response');
        const result = convertToPlainMessage(plainMsg, NodeName.TEACH);

        expect(result.agentType).toBe('learning');
        expect(result.workflowNode).toBe('Teach');
      });
    });

    describe('with BaseMessage instances', () => {
      it('should convert HumanMessage', () => {
        const msg = new HumanMessage('User input');
        const result = convertToPlainMessage(msg);

        expect(result.role).toBe('user');
        expect(result.content).toBe('User input');
      });

      it('should convert AIMessage', () => {
        const msg = new AIMessage('Assistant response');
        const result = convertToPlainMessage(msg);

        expect(result.role).toBe('assistant');
        expect(result.content).toBe('Assistant response');
      });

      it('should convert ToolMessage', () => {
        const msg = new ToolMessage('Tool output' as any);
        const result = convertToPlainMessage(msg);

        expect(result.role).toBe('tool');
        expect(result.content).toBe('Tool output');
      });
    });

    describe('edge cases', () => {
      it('should handle empty content', () => {
        const msg = createLangChainMessage('user', '');
        const result = convertToPlainMessage(msg);

        expect(result.role).toBe('user');
        expect(result.content).toBe('');
      });

      it('should handle undefined nodeName', () => {
        const msg = createLangChainMessage('assistant', 'Response');
        const result = convertToPlainMessage(msg);

        expect(result.agentType).toBeUndefined();
        expect(result.workflowNode).toBeUndefined();
      });

      it('should handle messages without lc_kwargs', () => {
        const msg = { role: 'user', content: 'Test' } as any;
        const result = convertToPlainMessage(msg);

        expect(result.role).toBe('user');
        expect(result.content).toBe('Test');
      });
    });
  });

  describe('convertMessagesToPlain', () => {
    it('should batch convert multiple messages', () => {
      const messages = [
        createLangChainMessage('user', 'Message 1'),
        createLangChainMessage('assistant', 'Message 2'),
        createLangChainMessage('tool', 'Message 3'),
      ];

      const results = convertMessagesToPlain(messages, NodeName.PRACTICE);

      expect(results).toHaveLength(3);
      expect(results[0].role).toBe('user');
      expect(results[1].role).toBe('assistant');
      expect(results[2].role).toBe('tool');
      expect(results[0].workflowNode).toBe('Practice');
      expect(results[1].workflowNode).toBe('Practice');
      expect(results[2].workflowNode).toBe('Practice');
    });

    it('should handle empty array', () => {
      const results = convertMessagesToPlain([]);

      expect(results).toEqual([]);
    });

    it('should handle single message', () => {
      const messages = [createLangChainMessage('user', 'Single')];
      const results = convertMessagesToPlain(messages, NodeName.ASSESS);

      expect(results).toHaveLength(1);
      expect(results[0].workflowNode).toBe('Assess');
    });

    it('should preserve message order', () => {
      const messages = [
        createLangChainMessage('user', 'First'),
        createLangChainMessage('user', 'Second'),
        createLangChainMessage('user', 'Third'),
      ];

      const results = convertMessagesToPlain(messages);

      expect(results[0].content).toBe('First');
      expect(results[1].content).toBe('Second');
      expect(results[2].content).toBe('Third');
    });
  });

  describe('normalizeWorkflowOutput', () => {
    it('should extract and normalize messages from node output', () => {
      const nodeOutput = {
        messages: [
          createLangChainMessage('assistant', 'Response 1'),
          createLangChainMessage('tool', 'Response 2'),
        ],
        confidence: 0.8,
      };

      const results = normalizeWorkflowOutput(NodeName.TEACH, nodeOutput);

      expect(results).toHaveLength(2);
      expect(results[0].role).toBe('assistant');
      expect(results[1].role).toBe('tool');
      expect(results[0].workflowNode).toBe('Teach');
      expect(results[1].workflowNode).toBe('Teach');
    });

    it('should handle output with no messages', () => {
      const nodeOutput = {
        confidence: 0.8,
        mastery: 0.9,
      };

      const results = normalizeWorkflowOutput(NodeName.ASSESS, nodeOutput);

      expect(results).toEqual([]);
    });

    it('should handle undefined messages array', () => {
      const nodeOutput = {} as any;

      const results = normalizeWorkflowOutput(NodeName.PRACTICE, nodeOutput);

      expect(results).toEqual([]);
    });

    it('should attach correct metadata for different nodes', () => {
      const nodeOutput = {
        messages: [createLangChainMessage('assistant', 'Test')],
      };

      const results = normalizeWorkflowOutput(NodeName.EVALUATE, nodeOutput);

      expect(results[0].agentType).toBe('assessment');
      expect(results[0].workflowNode).toBe('Evaluate');
    });
  });

  describe('createStructuredMessage', () => {
    it('should create tool message with structured data', () => {
      const data = { exercises: ['ex1', 'ex2'], summary: 'Test summary' };
      const result = createStructuredMessage(NodeName.PRACTICE, data, 'practice_exercises');

      expect(result.role).toBe('tool');
      expect(result.agentType).toBe('practice');
      expect(result.workflowNode).toBe('Practice');
      expect(result.metadata?.messageType).toBe('practice_exercises');
      expect(JSON.parse(result.content)).toEqual({
        type: 'practice_exercises',
        nodeName: 'Practice',
        data,
        timestamp: expect.any(Number),
      });
    });

    it('should use default message type when not provided', () => {
      const data = { key: 'value' };
      const result = createStructuredMessage(NodeName.TEACH, data);

      expect(result.metadata?.messageType).toBe('workflow_output');
      const parsed = JSON.parse(result.content);
      expect(parsed.type).toBe('workflow_output');
    });

    it('should include timestamp in content', () => {
      const data = { test: true };
      const result = createStructuredMessage(NodeName.ASSESS, data);

      const parsed = JSON.parse(result.content);
      expect(parsed.timestamp).toBeDefined();
      expect(typeof parsed.timestamp).toBe('number');
    });

    it('should map node names to correct agent types', () => {
      const data = {};
      const result1 = createStructuredMessage(NodeName.COMPLETE, data);
      const result2 = createStructuredMessage(NodeName.TEACH, data);

      expect(result1.agentType).toBe('tutoring');
      expect(result2.agentType).toBe('learning');
    });
  });

  describe('createAssistantMessage', () => {
    it('should create assistant message with text content', () => {
      const result = createAssistantMessage(NodeName.TEACH, 'Let me explain this concept');

      expect(result.role).toBe('assistant');
      expect(result.content).toBe('Let me explain this concept');
      expect(result.agentType).toBe('learning');
      expect(result.workflowNode).toBe('Teach');
      expect(result.metadata?.messageType).toBe('assistant_response');
      expect(result.metadata?.timestamp).toBeDefined();
    });

    it('should handle empty content', () => {
      const result = createAssistantMessage(NodeName.PRACTICE, '');

      expect(result.role).toBe('assistant');
      expect(result.content).toBe('');
    });

    it('should handle long content', () => {
      const longContent = 'x'.repeat(10000);
      const result = createAssistantMessage(NodeName.ASSESS, longContent);

      expect(result.content).toBe(longContent);
    });

    it('should map node names correctly', () => {
      const result1 = createAssistantMessage(NodeName.EVALUATE, 'Test');
      const result2 = createAssistantMessage(NodeName.PRACTICE, 'Test');

      expect(result1.agentType).toBe('assessment');
      expect(result2.agentType).toBe('practice');
    });
  });

  describe('validateNormalizedMessage', () => {
    it('should return true for valid normalized message', () => {
      const msg = {
        role: 'assistant' as const,
        content: 'Test content',
      };

      expect(validateNormalizedMessage(msg)).toBe(true);
    });

    it('should return true for message with metadata', () => {
      const msg = {
        role: 'user' as const,
        content: 'Test',
        agentType: 'practice',
        workflowNode: 'Practice',
        metadata: { key: 'value' },
      };

      expect(validateNormalizedMessage(msg)).toBe(true);
    });

    it('should return false for null', () => {
      expect(validateNormalizedMessage(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(validateNormalizedMessage(undefined)).toBe(false);
    });

    it('should return false for non-object', () => {
      expect(validateNormalizedMessage('string')).toBe(false);
      expect(validateNormalizedMessage(123)).toBe(false);
      expect(validateNormalizedMessage([])).toBe(false);
    });

    it('should return false for object without role', () => {
      expect(validateNormalizedMessage({ content: 'Test' })).toBe(false);
    });

    it('should return false for object without content', () => {
      expect(validateNormalizedMessage({ role: 'user' })).toBe(false);
    });

    it('should return false for invalid role type', () => {
      expect(validateNormalizedMessage({ role: 123 as any, content: 'Test' })).toBe(false);
    });

    it('should return false for invalid content type', () => {
      expect(validateNormalizedMessage({ role: 'user', content: 123 as any })).toBe(false);
    });
  });

  describe('validateNormalizedMessages', () => {
    it('should return true for array of valid messages', () => {
      const messages = [
        { role: 'user' as const, content: 'Test 1' },
        { role: 'assistant' as const, content: 'Test 2' },
      ];

      expect(validateNormalizedMessages(messages)).toBe(true);
    });

    it('should return true for empty array', () => {
      expect(validateNormalizedMessages([])).toBe(true);
    });

    it('should return false for array with invalid message', () => {
      const messages = [
        { role: 'user' as const, content: 'Valid' },
        { content: 'Missing role' },
      ];

      expect(validateNormalizedMessages(messages)).toBe(false);
    });

    it('should return false for non-array', () => {
      expect(validateNormalizedMessages('not an array' as any)).toBe(false);
    });
  });

  describe('addMessageMetadata', () => {
    it('should add metadata to message', () => {
      const message = {
        role: 'assistant' as const,
        content: 'Test',
      };

      const result = addMessageMetadata(message, { source: 'workflow', node: 'Practice' });

      expect(result.metadata?.source).toBe('workflow');
      expect(result.metadata?.node).toBe('Practice');
      expect(result.role).toBe('assistant');
      expect(result.content).toBe('Test');
    });

    it('should merge with existing metadata', () => {
      const message = {
        role: 'assistant' as const,
        content: 'Test',
        metadata: { existing: 'value' },
      };

      const result = addMessageMetadata(message, { new: 'data' });

      expect(result.metadata?.existing).toBe('value');
      expect(result.metadata?.new).toBe('data');
    });
  });

  describe('stripMessageMetadata', () => {
    it('should remove all metadata', () => {
      const message = {
        role: 'assistant' as const,
        content: 'Test',
        agentType: 'practice',
        workflowNode: 'Practice',
        metadata: { key: 'value' },
      };

      const result = stripMessageMetadata(message);

      expect(result).toEqual({
        role: 'assistant',
        content: 'Test',
      });
    });

    it('should return only role and content', () => {
      const message = {
        role: 'user' as const,
        content: 'Hello',
      };

      const result = stripMessageMetadata(message);

      expect(result).toEqual(message);
    });
  });

  describe('toOpenAIMessage', () => {
    it('should convert user message', () => {
      const normalizedMsg = {
        role: 'user' as const,
        content: 'User input',
      };

      const result = toOpenAIMessage(normalizedMsg);

      expect(result).toEqual({
        role: 'user',
        content: 'User input',
      });
    });

    it('should convert assistant message', () => {
      const normalizedMsg = {
        role: 'assistant' as const,
        content: 'Assistant response',
      };

      const result = toOpenAIMessage(normalizedMsg);

      expect(result).toEqual({
        role: 'assistant',
        content: 'Assistant response',
      });
    });

    it('should parse tool message content as JSON', () => {
      const normalizedMsg = {
        role: 'tool' as const,
        content: '{"data": "value", "nested": {"key": 123}}',
      };

      const result = toOpenAIMessage(normalizedMsg);

      expect(result).toEqual({
        role: 'tool',
        content: {
          data: 'value',
          nested: { key: 123 },
        },
      });
    });

    it('should handle tool message with invalid JSON', () => {
      const normalizedMsg = {
        role: 'tool' as const,
        content: 'not valid json',
      };

      const result = toOpenAIMessage(normalizedMsg);

      expect(result).toEqual({
        role: 'tool',
        content: 'not valid json',
      });
    });

    it('should preserve metadata but not include in output', () => {
      const normalizedMsg = {
        role: 'assistant' as const,
        content: 'Response',
        agentType: 'practice',
        workflowNode: 'Practice',
        metadata: { source: 'workflow' },
      };

      const result = toOpenAIMessage(normalizedMsg);

      expect(result).toEqual({
        role: 'assistant',
        content: 'Response',
      });
    });
  });

  describe('toOpenAIMessages', () => {
    it('should batch convert messages', () => {
      const normalizedMessages = [
        { role: 'user' as const, content: 'Hello' },
        { role: 'assistant' as const, content: 'Hi there' },
        { role: 'tool' as const, content: '{"result": "success"}' },
      ];

      const results = toOpenAIMessages(normalizedMessages);

      expect(results).toHaveLength(3);
      expect(results[0]).toEqual({ role: 'user', content: 'Hello' });
      expect(results[1]).toEqual({ role: 'assistant', content: 'Hi there' });
      expect(results[2]).toEqual({ role: 'tool', content: { result: 'success' } });
    });

    it('should handle empty array', () => {
      const results = toOpenAIMessages([]);

      expect(results).toEqual([]);
    });
  });

  describe('createIPCMessage', () => {
    it('should create IPC message from workflow output', () => {
      const nodeOutput = {
        messages: [createLangChainMessage('assistant', 'Response')],
        confidence: 0.8,
      };

      const result = createIPCMessage('thread-123', NodeName.PRACTICE, nodeOutput);

      expect(result.conversationId).toBe('thread-123');
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].role).toBe('assistant');
      expect(result.metadata?.nodeName).toBe('Practice');
      expect(result.metadata?.timestamp).toBeDefined();
    });

    it('should include node metadata', () => {
      const nodeOutput = {
        messages: [createLangChainMessage('tool', '{"data": "value"}')],
      };

      const result = createIPCMessage('thread-456', NodeName.ASSESS, nodeOutput);

      expect(result.metadata?.nodeName).toBe('Assess');
    });

    it('should handle multiple messages', () => {
      const nodeOutput = {
        messages: [
          createLangChainMessage('assistant', 'Response 1'),
          createLangChainMessage('tool', '{"result": "success"}'),
          createLangChainMessage('assistant', 'Response 2'),
        ],
      };

      const result = createIPCMessage('thread-789', NodeName.TEACH, nodeOutput);

      expect(result.messages).toHaveLength(3);
      expect(result.messages[0].role).toBe('assistant');
      expect(result.messages[1].role).toBe('tool');
      expect(result.messages[2].role).toBe('assistant');
    });
  });
});
