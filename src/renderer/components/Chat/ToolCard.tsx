import React, { useMemo, useState } from 'react';
import type { ToolCallMessagePartProps } from '@assistant-ui/react';
import { Card, CardHeader, CardTitle, CardContent } from '@/renderer/components/UI/Card';
import { cn } from '@/renderer/utils/cn';

type Props = ToolCallMessagePartProps;

const statusColor: Record<string, string> = {
  running: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200',
  complete: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200',
  error: 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200',
  unknown: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200',
};

const statusLabel = (status?: Props['status']) => {
  if (!status) return 'running';
  if (status.type === 'running') return 'running';
  if (status.type === 'incomplete') return 'error';
  if (status.type === 'complete') return 'complete';
  return status.type;
};

const ToolCard: React.FC<Props> = (props) => {
  const [collapsed, setCollapsed] = useState(false);
  const label = useMemo(() => statusLabel(props.status), [props.status]);

  return (
    <Card className="mb-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      <CardHeader className="flex items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Tool</span>
          <CardTitle className="text-sm">{props.toolName ?? 'tool'}</CardTitle>
        </div>
        <span
          className={cn(
            'text-xs px-2 py-1 rounded-full font-medium',
            statusColor[label] ?? statusColor.unknown,
          )}
        >
          {label}
        </span>
      </CardHeader>

      <CardContent className="space-y-3">
        <section className="text-xs text-gray-600 dark:text-gray-300">
          <p className="font-semibold mb-1">Arguments</p>
          <pre className="whitespace-pre-wrap break-words bg-gray-50 dark:bg-gray-800 rounded p-2 border border-gray-200 dark:border-gray-700">
            {formatPayload(props.args)}
          </pre>
        </section>

        {props.result !== undefined && (
          <section className="text-xs text-gray-600 dark:text-gray-300">
            <div className="flex items-center justify-between mb-1">
              <p className="font-semibold">Result</p>
              <button
                type="button"
                className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline"
                onClick={() => setCollapsed((c) => !c)}
              >
                {collapsed ? 'Show' : 'Hide'}
              </button>
            </div>
            {!collapsed && (
              <pre className="whitespace-pre-wrap break-words bg-gray-50 dark:bg-gray-800 rounded p-2 border border-gray-200 dark:border-gray-700">
                {formatPayload(props.result)}
              </pre>
            )}
          </section>
        )}

        {label === 'error' && props.status && 'error' in props.status && (
          <section className="text-xs text-rose-600 dark:text-rose-300">
            <p className="font-semibold mb-1">Error</p>
            <p className="bg-rose-50 dark:bg-rose-900/40 rounded p-2 border border-rose-200 dark:border-rose-800">
              {String((props.status as any).error ?? 'Tool execution failed')}
            </p>
          </section>
        )}
      </CardContent>
    </Card>
  );
};

const formatPayload = (value: unknown) => {
  try {
    if (typeof value === 'string') return value;
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

export default ToolCard;
