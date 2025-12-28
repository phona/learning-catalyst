/**
 * Display-ready message structure for chat history
 * Matches ChatHistoryMessage from shared API types
 */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  reasoning_content?: string;
  timestamp?: string;
  tool_calls?: Array<{
    id: string;
    type: string;
    function: {
      name: string;
      arguments: string;
    };
  }>;
  metadata?: {
    checkpoint_id?: string;
    message_index: number;
    run_id?: string;
    invalid_tool_calls?: unknown[];
    response_metadata?: Record<string, unknown>;
    // Tool-specific metadata (for ToolMessage)
    tool_call_id?: string;
    tool_name?: string;
    tool_status?: string;
    artifact?: unknown;
  };
}
