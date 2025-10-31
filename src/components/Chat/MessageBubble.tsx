import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import {
  UserIcon,
  CpuChipIcon,
  SparklesIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  LightBulbIcon,
} from '@heroicons/react/24/outline';
import type { Message } from '@/types/ai';

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
  onToggleThinking?: (messageId: string) => void;
  canToggleThinking?: boolean;
  providerSupportsThinking?: boolean;
  thinkingAutoHidden?: boolean; // Indicates if thinking was auto-hidden
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isStreaming = false,
  onToggleThinking,
  canToggleThinking = false,
  providerSupportsThinking = false,
  thinkingAutoHidden = false,
}) => {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const isTool = message.role === 'tool';

  const getAvatar = () => {
    if (isUser) {
      return (
        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
          <UserIcon className="w-5 h-5 text-white" />
        </div>
      );
    }

    if (isSystem) {
      return (
        <div className="w-8 h-8 bg-yellow-600 rounded-full flex items-center justify-center">
          <ExclamationTriangleIcon className="w-5 h-5 text-white" />
        </div>
      );
    }

    if (isTool) {
      return (
        <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
          <DocumentTextIcon className="w-5 h-5 text-white" />
        </div>
      );
    }

    // AI Assistant
    return (
      <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
        <CpuChipIcon className="w-5 h-5 text-white" />
      </div>
    );
  };

  const getRoleLabel = () => {
    if (isUser) return 'You';
    if (isSystem) return 'System';
    if (isTool) return 'Tool';
    return 'AI Assistant';
  };

  const formatTimestamp = (timestamp?: Date) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // TODO: Show toast notification
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  };

  // Helper functions for thinking button logic
  const shouldShowThinkingButton = () => {
    // Show button for assistant messages when:
    // 1. Provider supports thinking (for streaming messages)
    // 2. Message has existing thinking content (for completed messages)
    // 3. Explicit canToggleThinking is true (legacy support)
    return (
      !isUser &&
      !isSystem &&
      !isTool &&
      (
        canToggleThinking ||
        providerSupportsThinking ||
        (message.thinking_content && message.thinking_content.trim().length > 0)
      )
    );
  };

  const getThinkingButtonTitle = () => {
    if (isStreaming && providerSupportsThinking) {
      if (thinkingAutoHidden && !message.showThinking) {
        return "Thinking process auto-hidden (click to show)";
      }
      return message.showThinking ? "Hide thinking process" : "Show thinking process";
    }
    if (message.thinking_content && message.thinking_content.trim().length > 0) {
      if (thinkingAutoHidden && !message.showThinking) {
        return "Thinking process auto-hidden (click to show)";
      }
      return message.showThinking ? "Hide thinking process" : "Show thinking process";
    }
    return "Thinking process not available";
  };

  const getThinkingButtonIconClass = () => {
    const hasThinkingContent = message.thinking_content && message.thinking_content.trim().length > 0;
    const isActive = message.showThinking || (isStreaming && providerSupportsThinking);
    const isAutoHidden = thinkingAutoHidden && !message.showThinking && hasThinkingContent;

    if (!hasThinkingContent && !isStreaming) {
      return "text-gray-300 dark:text-gray-600 cursor-not-allowed";
    }

    if (isAutoHidden) {
      return "text-gray-400 group-hover:text-blue-500 transition-colors";
    }

    return isActive
      ? "text-yellow-500"
      : "text-gray-400 group-hover:text-yellow-500";
  };

  const getThinkingButtonTextClass = () => {
    const hasThinkingContent = message.thinking_content && message.thinking_content.trim().length > 0;
    const isActive = message.showThinking || (isStreaming && providerSupportsThinking);
    const isAutoHidden = thinkingAutoHidden && !message.showThinking && hasThinkingContent;

    if (!hasThinkingContent && !isStreaming) {
      return "text-gray-300 dark:text-gray-600 cursor-not-allowed";
    }

    if (isAutoHidden) {
      return "text-gray-400 group-hover:text-blue-500 transition-colors text-xs";
    }

    return isActive
      ? "text-yellow-500"
      : "text-gray-400 group-hover:text-yellow-500";
  };

  const shouldShowThinkingContent = () => {
    // Show thinking content when:
    // 1. Individual message showThinking is true AND there's thinking content to show
    // 2. For streaming: message.showThinking is true and there's thinking content
    if (isStreaming && providerSupportsThinking && message.showThinking) {
      return message.thinking_content && message.thinking_content.trim().length > 0;
    }

    // For completed messages: message.showThinking is true and message has thinking content
    return message.showThinking && message.thinking_content && message.thinking_content.trim().length > 0;
  };

  const getThinkingContent = () => {
    // For streaming messages, use the thinking content from the message
    if (isStreaming && providerSupportsThinking) {
      return message.thinking_content || "";
    }

    // For completed messages, use the stored thinking content
    return message.thinking_content || "";
  };

  if (isSystem) {
    return (
      <div className="flex justify-center my-4">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 max-w-md">
          <div className="flex items-start space-x-2">
            <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                {message.content}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex space-x-3 ${isUser ? 'justify-end' : 'justify-start'} mb-6`}>
      {!isUser && getAvatar()}

      <div className={`max-w-4xl ${isUser ? 'order-1' : ''}`}>
        {/* Message header */}
        <div className={`flex items-center space-x-2 mb-2 ${isUser ? 'justify-end' : ''}`}>
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {getRoleLabel()}
          </span>
          {message.provider && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              via {message.provider}
            </span>
          )}
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {formatTimestamp(message.timestamp)}
          </span>
          {!isUser && (
            <>
              {/* Thinking toggle button */}
              {shouldShowThinkingButton() && (
                <button
                  onClick={() => message.id && onToggleThinking?.(message.id)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors group"
                  title={getThinkingButtonTitle()}
                  disabled={!message.id}
                >
                  <div className="flex items-center space-x-1">
                    <LightBulbIcon className={`w-4 h-4 transition-colors ${getThinkingButtonIconClass()}`} />
                    <span className={`text-xs transition-colors ${getThinkingButtonTextClass()}`}>
                      {message.showThinking ? "Hide" : "Show"}
                    </span>
                  </div>
                </button>
              )}
              {/* Copy button */}
              <button
                onClick={() => copyToClipboard(message.content)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                title="Copy message"
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </>
          )}
        </div>

        {/* Thinking content */}
        {shouldShowThinkingContent() && (
          <div className="thinking-process mb-4 border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 rounded-r-lg p-4">
            <div className="flex items-center space-x-2 mb-3">
              <LightBulbIcon className={`w-5 h-5 text-yellow-600 dark:text-yellow-400 ${isStreaming ? 'animate-pulse' : ''}`} />
              <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                {isStreaming ? 'AI Thinking Process (Live)' : 'AI Thinking Process'}
              </span>
            </div>
            <div className="prose prose-sm dark:prose-invert max-w-none prose-yellow">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {getThinkingContent()}
              </ReactMarkdown>
            </div>
          </div>
        )}

        {/* Message content */}
        <div className={`message-bubble ${isUser ? 'message-user' : 'message-assistant'}`}>
          {isUser ? (
            <div className="whitespace-pre-wrap break-words">
              {message.content}
              {isStreaming && <span className="animate-pulse">▊</span>}
            </div>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ node, inline, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    return !inline && match ? (
                      React.createElement(SyntaxHighlighter as any, {
                        style: oneDark,
                        language: match[1],
                        PreTag: "div",
                        className: "rounded-lg",
                        ...props,
                      }, String(children).replace(/\n$/, ''))
                    ) : (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
              {isStreaming && <span className="animate-pulse">▊</span>}
            </div>
          )}
        </div>

        {/* Message metadata */}
        {message.tokens_used && (
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Tokens used: {JSON.stringify(message.tokens_used)}
          </div>
        )}

        {/* Tool calls */}
        {message.tool_calls && message.tool_calls.length > 0 && (
          <div className="mt-3 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <SparklesIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Tool Calls
              </span>
            </div>
            {message.tool_calls.map((toolCall, index) => (
              <div key={index} className="text-xs text-gray-600 dark:text-gray-400 font-mono">
                {toolCall.function.name}({toolCall.function.arguments})
              </div>
            ))}
          </div>
        )}
      </div>

      {isUser && getAvatar()}
    </div>
  );
};