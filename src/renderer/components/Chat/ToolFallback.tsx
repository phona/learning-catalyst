import type { ToolCallMessagePartComponent } from '@assistant-ui/react';
import { CheckIcon, ChevronDownIcon, ChevronUpIcon, XCircleIcon } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/renderer/components/UI/Button';
import { cn } from '@/renderer/utils/cn';

/**
 * Helper function to format payloads for display in the UI.
 * Handles string values directly and safely stringifies objects.
 */
const formatPayload = (value: unknown): string => {
  if (typeof value === 'string') return value;
  return JSON.stringify(value, null, 2);
};

/**
 * Status type from the assistant-ui library
 * Extracted from the actual component props to match the library's types
 */
type ToolStatus = {
  type: 'running' | 'complete' | 'incomplete' | 'requires-action';
  reason?: 'error' | 'cancelled' | 'length' | 'content-filter' | 'interrupt' | 'other';
  error?: unknown;
};

/**
 * Result type from the assistant-ui library
 */
type ToolResult = unknown & {
  ok?: boolean;
  error?: { message?: string };
};

/**
 * Determines the status label based on result or status props.
 * Supports both new format (result.ok) and legacy format (status.type).
 */
const statusLabel = (status?: ToolStatus, result?: ToolResult): string => {
  // Check result first (new format with ok flag)
  if (result && typeof result === 'object' && 'ok' in result) {
    return result.ok ? 'complete' : 'error';
  }
  // Fallback to status (old format)
  if (!status) return 'running';
  if (status.type === 'running') return 'running';
  if (status.type === 'incomplete') return 'error';
  if (status.type === 'complete') return 'complete';
  return status.type;
};

export const ToolFallback: ToolCallMessagePartComponent = ({
  toolName,
  argsText,
  result,
  status,
}) => {
  // Track whether the entire component is collapsed
  const [isCollapsed, setIsCollapsed] = useState(true);
  // Track whether the result section is collapsed (when result is large)
  const [isResultCollapsed, setIsResultCollapsed] = useState(false);

  // Determine if the tool call was cancelled by user
  const isCancelled = status?.type === 'incomplete' && status.reason === 'cancelled';

  // Extract cancellation reason if available
  const cancelledReason =
    isCancelled && status.error
      ? typeof status.error === 'string'
        ? status.error
        : JSON.stringify(status.error)
      : null;

  // Determine the status label for display
  const label = statusLabel(status, result);

  // Determine if the result indicates an error (new format with ok flag)
  const isErrorResult = result && typeof result === 'object' && 'ok' in result && !result.ok;

  return (
    <div
      className={cn(
        'aui-tool-fallback-root mb-4 flex w-full flex-col gap-3 rounded-lg border py-3',
        (isCancelled || isErrorResult) && 'border-muted-foreground/30 bg-muted/30',
      )}
    >
      {/* Header with icon, title, and collapse toggle */}
      <div className="aui-tool-fallback-header flex items-center gap-2 px-4">
        {isCancelled || isErrorResult ? (
          <XCircleIcon className="aui-tool-fallback-icon size-4 text-muted-foreground" />
        ) : (
          <CheckIcon className="aui-tool-fallback-icon size-4" />
        )}
        <p
          className={cn(
            'aui-tool-fallback-title grow',
            (isCancelled || isErrorResult) && 'text-muted-foreground line-through',
          )}
        >
          {isCancelled ? 'Cancelled tool: ' : isErrorResult ? 'Failed tool: ' : 'Used tool: '}
          <b>{toolName}</b>
        </p>
        <Button onClick={() => setIsCollapsed(!isCollapsed)}>
          {isCollapsed ? <ChevronUpIcon /> : <ChevronDownIcon />}
        </Button>
      </div>

      {/* Collapsible content section */}
      {!isCollapsed && (
        <div className="aui-tool-fallback-content flex flex-col gap-2 border-t pt-2">
          {/* Cancellation reason display */}
          {cancelledReason && (
            <div className="aui-tool-fallback-cancelled-root px-4">
              <p className="aui-tool-fallback-cancelled-header font-semibold text-muted-foreground">
                Cancelled reason:
              </p>
              <p className="aui-tool-fallback-cancelled-reason text-muted-foreground">
                {cancelledReason}
              </p>
            </div>
          )}

          {/* Tool arguments display */}
          <div className={cn('aui-tool-fallback-args-root px-4', (isCancelled || isErrorResult) && 'opacity-60')}>
            <p className="aui-tool-fallback-args-header font-semibold text-sm mb-1">Arguments:</p>
            <pre className="aui-tool-fallback-args-value whitespace-pre-wrap">{argsText}</pre>
          </div>

          {/* Result display - only show if not cancelled and result exists */}
          {!isCancelled && result !== undefined && (
            <>
              {/* Result section with collapsible display */}
              <div className="aui-tool-fallback-result-root border-t border-dashed px-4 pt-2">
                <div className="flex items-center justify-between mb-1">
                  <p className="aui-tool-fallback-result-header font-semibold text-sm">Result:</p>
                  <button
                    type="button"
                    className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline"
                    onClick={() => setIsResultCollapsed((c) => !c)}
                  >
                    {isResultCollapsed ? 'Show' : 'Hide'}
                  </button>
                </div>
                {!isResultCollapsed && (
                  <pre className="aui-tool-fallback-result-content whitespace-pre-wrap">
                    {formatPayload(result)}
                  </pre>
                )}
              </div>
            </>
          )}

          {/* Error sections - show when not cancelled, regardless of result */}
          {!isCancelled && (
            <>
              {/* Error section for new format (result.ok) */}
              {isErrorResult && result && typeof result === 'object' && 'ok' in result && !result.ok && (
                <div className="aui-tool-fallback-error-root border-t border-dashed px-4 pt-2">
                  <p className="aui-tool-fallback-error-header font-semibold text-rose-600 dark:text-rose-300 text-sm mb-1">
                    Error:
                  </p>
                  <p className="aui-tool-fallback-error-message bg-rose-50 dark:bg-rose-900/40 rounded p-2 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-300 text-sm">
                    {result.error?.message ?? 'Tool execution failed'}
                  </p>
                </div>
              )}

              {/* Error section for legacy format (status.error) */}
              {label === 'error' && status && 'error' in status && (
                <div className="aui-tool-fallback-error-root border-t border-dashed px-4 pt-2">
                  <p className="aui-tool-fallback-error-header font-semibold text-rose-600 dark:text-rose-300 text-sm mb-1">
                    Error:
                  </p>
                  <p className="aui-tool-fallback-error-message bg-rose-50 dark:bg-rose-900/40 rounded p-2 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-300 text-sm">
                    {String((status as any).error ?? 'Tool execution failed')}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
