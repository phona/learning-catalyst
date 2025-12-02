import React, { useEffect, useMemo } from 'react';
import { ClockIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { useChatStore } from '@/renderer/hooks/useChatStore';

const formatMs = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 10_000) return `${(ms / 1000).toFixed(2)}s`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms / 1000)}s`;
};

type Glyph = '>' | '(@)' | 'oo' | '/!\\';

const glyphFor = (kind: string, phase?: string): Glyph => {
  if (phase === 'error' || kind === 'error') return '/!\\';
  if (kind === 'tool') {
    if (phase === 'end') return 'oo';
    if (phase === 'start') return '(@)';
    return '>';
  }
  if (kind === 'thought' || kind === 'status') {
    if (phase === 'start') return '(@)';
    return '>';
  }
  return '>';
};

const Pill: React.FC<{ label: string; onClick: () => void; inline?: boolean }> = ({
  label,
  onClick,
  inline = false,
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex items-center gap-2 px-3 py-2 rounded-full shadow-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-800 dark:text-gray-100 hover:shadow-lg transition ${
      inline ? 'ml-auto' : ''
    }`}
    aria-label="Expand processing details"
  >
    <ChevronUpIcon className="w-3.5 h-3.5 text-gray-500" />
    <span>{label}</span>
  </button>
);

type OverlayProps = {
  inline?: boolean;
  targetMessageId?: string;
};

const Row: React.FC<{
  glyph: Glyph;
  label: string;
  detail?: string;
  elapsedMs: number;
  durationMs?: number;
  isError?: boolean;
}> = ({ glyph, label, detail, elapsedMs, durationMs, isError }) => {
  const showDuration = durationMs != null && durationMs >= 100;
  return (
    <div className="flex items-start gap-3 text-xs font-mono text-gray-900 dark:text-gray-100">
      <span className={`w-8 text-right ${isError ? 'text-red-600 dark:text-red-400' : 'text-gray-500'}`}>
        {glyph}
      </span>
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`font-semibold ${isError ? 'text-red-700 dark:text-red-300' : ''}`}>
            {label}
          </span>
          {showDuration && <span className="text-[11px] text-gray-500">[{formatMs(durationMs!)}]</span>}
          <span className="text-[11px] text-gray-400">T+{formatMs(elapsedMs)}</span>
        </div>
        {detail && (
          <div
            className={`text-[11px] whitespace-pre-wrap leading-snug ${isError ? 'text-red-600 dark:text-red-300' : 'text-gray-600 dark:text-gray-300'}`}
          >
            {detail}
          </div>
        )}
      </div>
    </div>
  );
};

export const ChatProcessingOverlay: React.FC<OverlayProps> = ({ inline = false, targetMessageId }) => {
  const processingTrace = useChatStore((s) => s.processingTrace);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const setCollapsed = useChatStore((s) => (s as any).setProcessingTraceCollapsed);

  const hasTrace = processingTrace && Array.isArray((processingTrace as any).events);
  if (!hasTrace || !processingTrace) return null;
  if (targetMessageId && processingTrace.messageId !== targetMessageId) return null;

  const events = processingTrace.events ?? [];

  const totalLabel = useMemo(() => {
    const totalMs =
      (processingTrace.completedAt ?? Date.now()) - (processingTrace.startedAt ?? Date.now());
    const warnPart = processingTrace.warningCount ? ` | ${processingTrace.warningCount} warn` : '';
    const errorPart = processingTrace.errorCount ? ` | ${processingTrace.errorCount} err` : '';
    return `⚡ ${formatMs(totalMs)} | ${processingTrace.toolCount} tools${warnPart}${errorPart}`;
  }, [processingTrace]);

  useEffect(() => {
    if (processingTrace.collapsed) return;
    if (processingTrace.completedAt && !isStreaming && typeof setCollapsed === 'function') {
      const id = window.setTimeout(() => setCollapsed(true), 5000);
      return () => window.clearTimeout(id);
    }
  }, [processingTrace, isStreaming, setCollapsed]);

  const totalMs =
    (processingTrace.completedAt ?? Date.now()) - (processingTrace.startedAt ?? Date.now());

  const collapse = (value: boolean) => {
    if (typeof setCollapsed === 'function') {
      setCollapsed(value);
    }
  };

  if (processingTrace.collapsed) {
    return (
      <div className={`${inline ? 'mt-2 flex justify-end' : 'fixed bottom-4 right-4 z-30'}`}>
        <Pill label={totalLabel} onClick={() => collapse(false)} inline={inline} />
      </div>
    );
  }

  return (
    <div
      className={`${inline ? 'mt-2' : 'fixed bottom-4 right-4 z-30 w-96 max-w-full drop-shadow-lg'}`}
      data-testid="chat-processing-overlay"
    >
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <header className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Processing trace</p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">Thought + tool calls</p>
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

        <div className="max-h-72 overflow-auto p-4 space-y-3 font-mono">
          {events.map((evt) => {
            const elapsed = evt.at - processingTrace.startedAt;
            const glyph = glyphFor(evt.kind, evt.phase);
            return (
              <Row
                key={evt.id}
                glyph={glyph}
                label={evt.label}
                detail={evt.detail}
                elapsedMs={elapsed}
                durationMs={evt.durationMs}
                isError={evt.kind === 'error' || evt.phase === 'error'}
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
