import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ClockIcon } from '@heroicons/react/24/outline';

interface ToolCall {
  id: string;
  name: string;
  duration: number;
  phase: 'start' | 'end' | 'error';
  input?: string;
  output?: string;
}

interface PerformanceMetrics {
  responseTime: number;
  tokens?: number;
  speed?: number; // tokens per second
  memory?: number; // MB
}

interface TimelineEvent {
  id: string;
  offset: string;
  description: string;
}

interface DetailsPanelProps {
  messageId: string;
  isExpanded: boolean;
  level: 0 | 1 | 2;
  onToggle: (messageId: string, level: 1 | 2) => void;
  data: {
    reasoning?: string;
    tools?: ToolCall[];
    performance?: PerformanceMetrics;
    timeline?: TimelineEvent[];
  };
}

export const DetailsPanel: React.FC<DetailsPanelProps> = ({
  messageId,
  isExpanded,
  level,
  onToggle,
  data,
}) => {
  if (!isExpanded) {
    return (
      <button
        onClick={() => onToggle(messageId, 1)}
        className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition"
      >
        Details ▼
      </button>
    );
  }

  // Check if there's any data to display
  const hasData = Boolean(
    data.reasoning?.trim() ||
    (data.tools && data.tools.length > 0) ||
    data.performance ||
    (data.timeline && data.timeline.length > 0)
  );

  return (
    <div className="details-panel mt-2 border-t pt-2">
      {/* Level 1 Content - Always shown when expanded */}
      <section className="level-1 space-y-3">
        {!hasData ? (
          <div className="no-data">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <span className="text-base">💡</span>
              Details
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400 italic">
              No additional details available for this message.
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Details are populated during AI responses. Ask a new question to see reasoning, tools, and performance metrics.
            </p>
          </div>
        ) : (
          <>
            {data.reasoning && (
              <div className="reasoning">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <span className="text-base">💭</span>
                  AI Reasoning
                </h4>
                <div className="text-sm text-gray-600 dark:text-gray-400 bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded border border-yellow-200 dark:border-yellow-800">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {data.reasoning}
                  </ReactMarkdown>
                </div>
              </div>
            )}

            {data.tools && data.tools.length > 0 && (
              <div className="tools">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <span className="text-base">🔧</span>
                  Tools Used ({data.tools.length})
                </h4>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  {data.tools.map((tool) => (
                    <li key={tool.id} className="flex items-center justify-between">
                      <span>• {tool.name}</span>
                      <span className="text-xs text-gray-500">({tool.duration}s)</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {data.performance && (
              <div className="performance">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <span className="text-base">📊</span>
                  Performance
                </h4>
                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <div className="flex items-center gap-2">
                    <ClockIcon className="w-4 h-4" />
                    <span>{data.performance.responseTime}ms response time</span>
                  </div>
                  {data.performance.tokens && (
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 10V3L4 14h7v7l9-11h-7z"
                        />
                      </svg>
                      <span>{data.performance.tokens} tokens</span>
                    </div>
                  )}
                  {data.performance.speed && (
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 10V3L4 14h7v7l9-11h-7z"
                        />
                      </svg>
                      <span>{data.performance.speed} tokens/sec</span>
                    </div>
                  )}
                  {data.performance.memory && (
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                        />
                      </svg>
                      <span>{data.performance.memory}MB</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {/* Level 2 Content - Expandable */}
      {level >= 2 && (
        <section className="level-2 mt-4 space-y-4">
          {data.tools && data.tools.length > 0 && (
            <div className="tool-details">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <span className="text-base">🔧</span>
                Tool Details
              </h4>
              <div className="space-y-3">
                {data.tools.map((tool) => (
                  <div key={tool.id} className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{tool.name}</span>
                      <span className="text-xs text-gray-500">{tool.duration}s</span>
                    </div>
                    <details className="text-xs">
                      <summary className="cursor-pointer text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
                        Show Input/Output
                      </summary>
                      {tool.input && (
                        <div className="mt-2">
                          <div className="text-gray-500 dark:text-gray-400 mb-1">Input:</div>
                          <pre className="bg-gray-100 dark:bg-gray-900 p-2 rounded overflow-x-auto text-xs">
                            {JSON.stringify(JSON.parse(tool.input), null, 2)}
                          </pre>
                        </div>
                      )}
                      {tool.output && (
                        <div className="mt-2">
                          <div className="text-gray-500 dark:text-gray-400 mb-1">Output:</div>
                          <pre className="bg-gray-100 dark:bg-gray-900 p-2 rounded overflow-x-auto text-xs">
                            {JSON.stringify(JSON.parse(tool.output), null, 2)}
                          </pre>
                        </div>
                      )}
                    </details>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.timeline && data.timeline.length > 0 && (
            <div className="timeline">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <span className="text-base">🗓️</span>
                Timeline
              </h4>
              <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                {data.timeline.map((event) => (
                  <li key={event.id} className="flex items-start gap-2">
                    <span className="text-xs text-gray-500 min-w-[40px]">{event.offset}</span>
                    <span>• {event.description}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </section>
      )}

      {/* Toggle controls */}
      <div className="mt-3 flex items-center gap-2">
        {level === 1 && (
          <button
            onClick={() => onToggle(messageId, 2)}
            className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            ▼ Show Advanced Details
          </button>
        )}
        {level === 2 && (
          <button
            onClick={() => onToggle(messageId, 1)}
            className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            ▲ Hide Advanced Details
          </button>
        )}
        <button
          onClick={() => onToggle(messageId, 0)}
          className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition"
        >
          ▲ Hide Details
        </button>
      </div>
    </div>
  );
};

export default DetailsPanel;
