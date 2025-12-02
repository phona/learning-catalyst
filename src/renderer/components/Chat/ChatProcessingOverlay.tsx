import React, { useEffect, useMemo } from 'react';
import {
  ClockIcon,
  WrenchIcon,
  ExclamationTriangleIcon,
  LightBulbIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';
import { useChatStore } from '@/renderer/hooks/useChatStore';

const formatMs = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 10_000) return `${(ms / 1000).toFixed(2)}s`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms / 1000)}s`;
};

const Pill: React.FC<{ label: string; onClick: () => void }> = ({ label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex items-center gap-2 px-3 py-2 rounded-full shadow-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-800 dark:text-gray-100 hover:shadow-lg transition"
    aria-label="Expand processing details"
  >
    <ChevronUpIcon className="w-3.5 h-3.5 text-gray-500" />
    <span>{label}</span>
  </button>
);

const EventRow: React.FC<{
  label: string;
  detail?: string;
  timeLabel: string;
  kind: 'thought' | 'tool' | 'error' | 'status';
  duration?: number;
}> = ({ label, detail, timeLabel, kind, duration }) => {
  const Icon =
    kind === 'tool'
      ? WrenchIcon
      : kind === 'error'
        ? ExclamationTriangleIcon
        : kind === 'thought'
          ? LightBulbIcon
          : ClockIcon;

  const border =
    kind === 'error'
      ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
      : kind === 'tool'
        ? 'border-purple-200 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/20'
        : 'border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20';

  return (
    <div
      className={`rounded-lg border ${border} p-3 text-xs text-gray-800 dark:text-gray-100 space-y-1`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4" />
          <span className="font-semibold">{label}</span>
        </div>
        <div className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-2">
          <ClockIcon className="w-3.5 h-3.5" />
          <span>{timeLabel}</span>
          {duration != null && <span>({formatMs(duration)})</span>}
        </div>
      </div>
      {detail && (
        <p className="text-[11px] text-gray-600 dark:text-gray-300 leading-snug whitespace-pre-wrap">
          {detail}
        </p>
      )}
    </div>
  );
};

export const ChatProcessingOverlay: React.FC = () => {
  const processingTrace = useChatStore((s) => s.processingTrace);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const setCollapsed = useChatStore((s) => (s as any).setProcessingTraceCollapsed);

  const hasTrace = processingTrace && Array.isArray((processingTrace as any).events);
  const events = hasTrace ? processingTrace.events : [];

  const totalLabel = useMemo(() => {
    if (!hasTrace || !processingTrace) return '';
    const totalMs =
      (processingTrace.completedAt ?? Date.now()) - (processingTrace.startedAt ?? Date.now());
    const warnPart = processingTrace.warningCount ? ` | ${processingTrace.warningCount} warn` : '';
    return `⧗ ${formatMs(totalMs)} | ${processingTrace.toolCount} tools${warnPart}`;
  }, [hasTrace, processingTrace]);

  useEffect(() => {
    if (!hasTrace || !processingTrace || processingTrace.collapsed) return;
    if (processingTrace.completedAt && !isStreaming && typeof setCollapsed === 'function') {
      const id = window.setTimeout(() => setCollapsed(true), 5000);
      return () => window.clearTimeout(id);
    }
  }, [hasTrace, processingTrace, isStreaming, setCollapsed]);

  if (!hasTrace || !processingTrace) return null;

  const totalMs =
    (processingTrace.completedAt ?? Date.now()) - (processingTrace.startedAt ?? Date.now());

  const collapse = (value: boolean) => {
    if (typeof setCollapsed === 'function') {
      setCollapsed(value);
    }
  };

  if (processingTrace.collapsed) {
    return (
      <div className="fixed bottom-4 right-4 z-30">
        <Pill label={totalLabel} onClick={() => collapse(false)} />
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-30 w-96 max-w-full drop-shadow-lg">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <header className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Processing</p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Heavy ops only — thought + tool calls
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-300">
            <div className="flex items-center gap-1">
              <ClockIcon className="w-4 h-4" />
              <span>{formatMs(totalMs)}</span>
            </div>
            <button
              type="button"
              onClick={() => collapse(true)}
              className="px-2 py-1 rounded-md border border-gray-300 dark:border-gray-700 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-1"
              aria-label="Collapse processing panel"
            >
              <ChevronDownIcon className="w-4 h-4" />
              Collapse
            </button>
          </div>
        </header>

        <div className="max-h-64 overflow-auto p-4 space-y-3">
          {events.map((evt) => {
            const elapsed = evt.at - processingTrace.startedAt;
            const timeLabel = `T+${formatMs(elapsed)}`;
            return (
              <EventRow
                key={evt.id}
                label={evt.label}
                detail={evt.detail}
                timeLabel={timeLabel}
                kind={evt.kind}
                duration={evt.durationMs}
              />
            );
          })}
        </div>

        <footer className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 text-[11px] text-gray-600 dark:text-gray-400 flex items-center gap-2">
          <ClockIcon className="w-3.5 h-3.5" />
          <span>{totalLabel}</span>
        </footer>
      </div>
    </div>
  );
};

export default ChatProcessingOverlay;
