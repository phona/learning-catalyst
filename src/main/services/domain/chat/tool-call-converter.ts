import type { ToolCall } from '@langchain/core/messages/tool';

export type ConvertedToolCall = {
  id: string;
  type: string;
  function: {
    name: string;
    arguments: string;
  };
};

/**
 * Convert LangChain ToolCall to the expected format.
 *
 * Tool call payloads are not always strongly typed (serialized checkpoints),
 * so we treat input as unknown and normalize safely.
 */
export function convertToolCall(toolCall: unknown): ConvertedToolCall {
  const tc = toolCall as Partial<ToolCall> & {
    id?: unknown;
    type?: unknown;
    name?: unknown;
    args?: unknown;
  };

  return {
    id: typeof tc.id === 'string' ? tc.id : '',
    type: typeof tc.type === 'string' ? tc.type : 'tool_call',
    function: {
      name: typeof tc.name === 'string' ? tc.name : '',
      arguments: typeof tc.args === 'string' ? tc.args : JSON.stringify(tc.args),
    },
  };
}

