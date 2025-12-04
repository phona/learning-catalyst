import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { SyntaxHighlighterWrapper } from '@/renderer/components/UI/SyntaxHighlighterWrapper';
import {
  UserIcon,
  CpuChipIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import type { MessageDisplay } from '@/renderer/types/message';
import {
  formatTimestamp,
  formatDateTimeForHtml,
} from '@/renderer/utils/timeUtils';
import { copyToClipboard } from '@/renderer/utils/clipboardUtils';

interface MessageBubbleProps {
  message: MessageDisplay;
  isStreaming?: boolean;
  onToggleDetails?: (messageId: string, level: 1 | 2) => void;
  streamingProgress?: number;
  // Removed: processingTrace, agentStatus, performanceMetrics, onToggleThinking
}

const MessageBubbleComponent: React.FC<MessageBubbleProps> = ({
  message,
  isStreaming = false,
  onToggleDetails,
  streamingProgress = 0,
}) => {
  const __hasContent = typeof message.content === 'string';
  console.log('[MessageBubble] content check', {
    id: message.id,
    role: message.role,
    status: message.status,
    awaitingInput: message.awaitingInput,
    hasContent: __hasContent,
    contentLength: message.content?.length ?? 0,
    contentPreview: message.content?.slice(0, 30),
  });

  const isUser = message.role === 'user';

  const getAvatar = () => {
    if (isUser) {
      return (
        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center shadow-md">
          <UserIcon className="w-6 h-6 text-white" />
        </div>
      );
    }

    // AI Assistant
    return (
      <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center shadow-md">
        <CpuChipIcon className="w-6 h-6 text-white" />
      </div>
    );
  };

  const getRoleLabel = () => {
    if (isUser) return 'You';
    return 'AI Assistant';
  };

  return (
    <article
      className={`flex space-x-4 ${isUser ? 'justify-end' : 'justify-start'} mb-6`}
      aria-labelledby={`message-${message.id}`}
      data-testid={`message-bubble-${message.id}`}
    >
      {!isUser && getAvatar()}

      <div className={`max-w-4xl ${isUser ? 'order-1' : ''} flex-1`}>
        {/* Message header - hidden for awaiting_input */}
        {message.status !== 'awaiting_input' && (
          <header
            className={`flex flex-col space-y-2 mb-3 ${isUser ? 'items-end' : 'items-start'}`}
          >
          <div className={`flex items-center space-x-2 ${isUser ? 'justify-end' : ''}`}>
            <span
              className={`text-sm font-semibold ${
                isUser
                  ? 'text-primary-700 dark:text-primary-300'
                  : 'text-emerald-700 dark:text-emerald-300'
              }`}
            >
              {getRoleLabel()}
            </span>
            {message.provider && (
              <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
                {message.provider}
              </span>
            )}
            <time
              className="text-xs text-gray-500 dark:text-gray-400"
              dateTime={formatDateTimeForHtml(message.timestamp)}
            >
              {formatTimestamp(message.timestamp)}
            </time>
          </div>

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
        )}

        {/* Message content */}
        <main
          id={`message-${message.id}`}
          className={`message-bubble relative ${
            isUser
              ? 'bg-primary-500 text-white shadow-md'
              : message.status === 'awaiting_input'
              ? 'bg-transparent shadow-none border-0 p-0'
              : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 shadow-md'
          } rounded-lg p-4`}
          role="article"
        >
          {/* Awaiting input special UI - takes full width */}
          {message.status === 'awaiting_input' && message.awaitingInput && (
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-2">
                    Waiting for your answer
                  </p>
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    className="text-sm text-amber-700 dark:text-amber-300 prose prose-sm max-w-none"
                  >
                    {message.awaitingInput.prompt}
                  </ReactMarkdown>
                  <div className="flex items-center gap-2 mt-4">
                    <button
                      onClick={() => console.log('Skip clicked')}
                      className="text-xs px-3 py-1.5 bg-white dark:bg-gray-800 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700 rounded-md hover:bg-amber-100 dark:hover:bg-amber-900/30 transition"
                    >
                      Skip
                    </button>
                    <button
                      onClick={() => console.log('Resume later clicked')}
                      className="text-xs px-3 py-1.5 bg-white dark:bg-gray-800 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700 rounded-md hover:bg-amber-100 dark:hover:bg-amber-900/30 transition"
                    >
                      Resume Later
                    </button>
                    <button
                      onClick={() => onToggleDetails?.(message.id, 1)}
                      className="text-xs px-3 py-1.5 bg-amber-500 text-white rounded-md hover:bg-amber-600 transition"
                    >
                      Details
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Normal message content - skip if awaiting_input */}
          {message.status !== 'awaiting_input' && (
            <div className="relative">
              {isUser ? (
                <div className="whitespace-pre-wrap break-words leading-relaxed">
                  {message.content}
                  {isStreaming && (
                    <>
                      <span
                        className="inline-block w-2 h-4 bg-white/70 rounded-full animate-pulse ml-1"
                        aria-live="polite"
                        aria-label="AI is typing"
                      ></span>
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
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                />
                              </svg>
                            </button>
                          </div>
                        ) : (
                          <code
                            className={`${className} bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-md text-sm`}
                            {...props}
                          >
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
                      <span
                        className="inline-block w-2 h-4 bg-emerald-500/70 rounded-full animate-pulse ml-1"
                        aria-live="polite"
                        aria-label="AI is typing"
                      ></span>
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
          )}
        </main>

        {/* Action buttons - hidden for awaiting_input */}
        {!isUser && message.status !== 'awaiting_input' && (
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={() => onToggleDetails?.(message.id, 1)}
              className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              Details ▼
            </button>
            <button
              onClick={() => copyToClipboard(message.content)}
              className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              Copy
            </button>
            <button
              className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              Regenerate
            </button>
          </div>
        )}
      </div>

      {isUser && getAvatar()}
    </article>
  );
};

export const MessageBubble = React.memo(MessageBubbleComponent);

export default MessageBubble;
