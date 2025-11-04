import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { SyntaxHighlighterWrapper } from '@/components/UI/SyntaxHighlighterWrapper';
import {
  UserIcon,
  CpuChipIcon,
  SparklesIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  LightBulbIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import type { Message } from '@/types/ai';

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
  onToggleThinking?: (messageId: string) => void;
  streamingProgress?: number;
  agentStatus?: {
    agentId: string;
    agentName: string;
    status: 'idle' | 'thinking' | 'processing' | 'responding' | 'error';
    currentAction?: string;
    progress?: number;
  };
  performanceMetrics?: {
    responseTime: number;
    tokensPerSecond?: number;
    memoryUsage?: number;
  };
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isStreaming = false,
  onToggleThinking,
  streamingProgress = 0,
  agentStatus,
  performanceMetrics,
}) => {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const isTool = message.role === 'tool';

  const getAvatar = () => {
    if (isUser) {
      return (
        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center shadow-md animate-fade-in">
          <UserIcon className="w-6 h-6 text-white" />
        </div>
      );
    }

    if (isSystem) {
      return (
        <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center shadow-md animate-fade-in">
          <ExclamationTriangleIcon className="w-6 h-6 text-white" />
        </div>
      );
    }

    if (isTool) {
      return (
        <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center shadow-md animate-fade-in">
          <DocumentTextIcon className="w-6 h-6 text-white" />
        </div>
      );
    }

    // AI Assistant - simplified without excessive effects
    return (
      <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center shadow-md animate-fade-in">
        <CpuChipIcon className="w-6 h-6 text-white" />
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
      // Show success feedback by changing cursor briefly
      console.log('Text copied to clipboard');
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  };

  // Simple thinking logic
  const hasThinkingContent = message.thinking_content && message.thinking_content.trim().length > 0;
  const shouldShowButton = !isUser && !isSystem && !isTool && hasThinkingContent;
  const isThinkingVisible = (isStreaming || message.showThinking) && hasThinkingContent;

  const handleToggleThinking = () => {
    if (message.id && onToggleThinking) {
      onToggleThinking(message.id);
    }
  };

  // Agent status indicator
  const getAgentStatusIcon = () => {
    if (!agentStatus) return null;

    switch (agentStatus.status) {
      case 'thinking':
        return <ArrowPathIcon className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'processing':
        return <ClockIcon className="w-4 h-4 text-yellow-500 animate-pulse" />;
      case 'responding':
        return <SparklesIcon className="w-4 h-4 text-green-500 animate-pulse" />;
      case 'error':
        return <XCircleIcon className="w-4 h-4 text-red-500" />;
      case 'idle':
      default:
        return <CheckCircleIcon className="w-4 h-4 text-gray-400" />;
    }
  };

  const getAgentStatusColor = () => {
    if (!agentStatus) return '';

    switch (agentStatus.status) {
      case 'thinking':
        return 'text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-900/20 dark:border-blue-800';
      case 'processing':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200 dark:text-yellow-400 dark:bg-yellow-900/20 dark:border-yellow-800';
      case 'responding':
        return 'text-green-600 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-900/20 dark:border-green-800';
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-900/20 dark:border-red-800';
      case 'idle':
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200 dark:text-gray-400 dark:bg-gray-900/20 dark:border-gray-800';
    }
  };

  const formatResponseTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const formatTokensPerSecond = (tps: number) => {
    return `${tps.toFixed(1)} tokens/s`;
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
    <article
      className={`flex space-x-4 ${isUser ? 'justify-end' : 'justify-start'} mb-6 animate-message-appear`}
      aria-labelledby={`message-${message.id}`}
    >
      {!isUser && getAvatar()}

      <div className={`max-w-4xl ${isUser ? 'order-1' : ''} flex-1`}>
        {/* Message header with agent status */}
        <header className={`flex flex-col space-y-2 mb-3 ${isUser ? 'items-end' : 'items-start'} animate-fade-in`}>
          <div className={`flex items-center space-x-2 ${isUser ? 'justify-end' : ''}`}>
            <span className={`text-sm font-semibold ${
              isUser
                ? 'text-primary-700 dark:text-primary-300'
                : 'text-emerald-700 dark:text-emerald-300'
            }`}>
              {getRoleLabel()}
            </span>
            {message.provider && (
              <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
                {message.provider}
              </span>
            )}
            <time className="text-xs text-gray-500 dark:text-gray-400" dateTime={message.timestamp?.toISOString()}>
              {formatTimestamp(message.timestamp)}
            </time>
          </div>

          {/* Agent status indicator */}
          {agentStatus && !isUser && (
            <div className={`flex items-center space-x-2 text-xs px-3 py-2 rounded-full border ${getAgentStatusColor()}`}>
              {getAgentStatusIcon()}
              <span className="font-medium">
                {agentStatus.agentName}: {agentStatus.status}
              </span>
              {agentStatus.currentAction && (
                <span className="text-xs opacity-75">
                  - {agentStatus.currentAction}
                </span>
              )}
              {agentStatus.progress !== undefined && (
                <div className="flex items-center space-x-1">
                  <div className="w-8 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-current transition-all duration-300 ease-out"
                      style={{ width: `${agentStatus.progress}%` }}
                    />
                  </div>
                  <span className="text-xs">
                    {agentStatus.progress}%
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Streaming progress bar */}
          {isStreaming && streamingProgress > 0 && (
            <div className="w-full max-w-md">
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                <span>Generating response...</span>
                <span>{streamingProgress}%</span>
              </div>
              <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 to-blue-500 transition-all duration-300 ease-out"
                  style={{ width: `${streamingProgress}%` }}
                />
              </div>
            </div>
          )}
        </header>

        {/* Action buttons */}
        {!isUser && (
          <div className="flex items-center space-x-1 mb-3" role="group" aria-label="Message actions">
            {/* Thinking toggle button */}
            {shouldShowButton && (
              <button
                onClick={handleToggleThinking}
                className="p-1.5 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 rounded-lg transition-colors duration-200"
                title={message.showThinking ? "Hide thinking process" : "Show thinking process"}
                disabled={!message.id}
                aria-expanded={message.showThinking}
                aria-controls={`thinking-${message.id}`}
              >
                <div className="flex items-center space-x-1">
                  <LightBulbIcon className={`w-4 h-4 transition-colors duration-200 ${
                    message.showThinking
                      ? "text-yellow-500"
                      : "text-yellow-400 hover:text-yellow-500"
                  }`} />
                  <span className={`text-xs font-medium transition-colors duration-200 ${
                    message.showThinking ? "text-yellow-500" : "text-yellow-400 hover:text-yellow-500"
                  }`}>
                    {message.showThinking ? "Hide" : "Show"}
                  </span>
                </div>
              </button>
            )}
            {/* Copy button */}
            <button
              onClick={() => copyToClipboard(message.content)}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
              title="Copy message"
              aria-label="Copy message content to clipboard"
            >
              <svg className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        )}

        {/* Thinking content - simplified styling */}
        {isThinkingVisible && (
          <section
            id={`thinking-${message.id}`}
            className="thinking-process mb-4 border border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg animate-fade-in-up"
            aria-label="AI thinking process"
          >
            <div className="flex items-center space-x-3 mb-3">
              <div className="p-2 bg-yellow-500 rounded-full">
                <LightBulbIcon className="w-5 h-5 text-white" />
              </div>
              <h4 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">
                {isStreaming ? 'AI Thinking Process (Live)' : 'AI Thinking Process'}
              </h4>
              {isStreaming && (
                <span className="text-xs text-yellow-600 dark:text-yellow-400 px-2 py-1 rounded-full" aria-live="polite">
                  Thinking...
                </span>
              )}
            </div>
            <div className="prose prose-sm dark:prose-invert max-w-none prose-yellow">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.thinking_content || ""}
              </ReactMarkdown>
            </div>
          </section>
        )}

        {/* Message content - simplified styling */}
        <main
          id={`message-${message.id}`}
          className={`message-bubble relative ${
            isUser
              ? 'bg-primary-500 text-white shadow-md'
              : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 shadow-md'
          } rounded-lg p-4 animate-fade-in-up`}
          role="article"
        >
          <div className="relative">
            {isUser ? (
              <div className="whitespace-pre-wrap break-words leading-relaxed">
                {message.content}
                {isStreaming && (
                  <>
                    <span className="inline-block w-2 h-4 bg-white/70 rounded-full animate-pulse ml-1" aria-live="polite" aria-label="AI is typing"></span>
                    {streamingProgress > 0 && (
                      <span className="ml-2 text-xs text-white/70 text-xs">
                        {streamingProgress}%
                      </span>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="prose prose-sm dark:prose-invert max-w-none prose-gray-900 dark:prose-gray-100 leading-relaxed">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code({ node, inline, className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || '');
                      return !inline && match ? (
                        <div className="relative group">
                          <SyntaxHighlighterWrapper
                            language={match[1]}
                            PreTag="div"
                            className="rounded-lg border border-gray-200 dark:border-gray-700 shadow-md"
                            {...props}
                          >
                            {children}
                          </SyntaxHighlighterWrapper>
                          <button
                            onClick={() => copyToClipboard(String(children))}
                            className="absolute top-2 right-2 p-1.5 bg-gray-800 dark:bg-gray-600 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                            title="Copy code"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <code className={`${className} bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-md text-sm`} {...props}>
                          {children}
                        </code>
                      );
                    },
                  }}
                >
                  {message.content}
                </ReactMarkdown>
                {isStreaming && (
                  <>
                    <span className="inline-block w-2 h-4 bg-emerald-500/70 rounded-full animate-pulse ml-1" aria-live="polite" aria-label="AI is typing"></span>
                    {streamingProgress > 0 && (
                      <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                        {streamingProgress}%
                      </span>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </main>

        {/* Performance metrics and message metadata */}
        {(performanceMetrics || message.tokens_used) && (
          <div className="mt-3 space-y-2 animate-fade-in">
            {/* Performance metrics */}
            {performanceMetrics && (
              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-2 border border-blue-200 dark:border-blue-800">
                <span className="flex items-center space-x-1">
                  <ClockIcon className="w-3 h-3" />
                  <span>Response: {formatResponseTime(performanceMetrics.responseTime)}</span>
                </span>
                {performanceMetrics.tokensPerSecond && (
                  <span className="flex items-center space-x-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>{formatTokensPerSecond(performanceMetrics.tokensPerSecond)}</span>
                  </span>
                )}
                {performanceMetrics.memoryUsage && (
                  <span className="flex items-center space-x-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <span>{(performanceMetrics.memoryUsage / 1024 / 1024).toFixed(1)}MB</span>
                  </span>
                )}
              </div>
            )}

            {/* Token usage */}
            {message.tokens_used && (
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg px-3 py-2">
                <span className="flex items-center space-x-2">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>
                    {message.tokens_used.prompt_tokens} prompt / {message.tokens_used.completion_tokens} completion
                  </span>
                </span>
                <span className="font-medium">
                  {message.tokens_used.total_tokens} total
                </span>
              </div>
            )}
          </div>
        )}

        {/* Tool calls - simplified styling */}
        {message.tool_calls && message.tool_calls.length > 0 && (
          <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-700 animate-fade-in">
            <div className="flex items-center space-x-3 mb-3">
              <div className="p-2 bg-purple-500 rounded-full">
                <SparklesIcon className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-semibold text-purple-800 dark:text-purple-200">
                Tool Calls
              </span>
            </div>
            <div className="space-y-2">
              {message.tool_calls.map((toolCall, index) => (
                <div key={index} className="text-xs font-mono bg-purple-100 dark:bg-purple-800/50 text-purple-800 dark:text-purple-200 p-2 rounded border border-purple-300 dark:border-purple-600">
                  {toolCall.function.name}({toolCall.function.arguments})
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {isUser && getAvatar()}
    </article>
  );
};