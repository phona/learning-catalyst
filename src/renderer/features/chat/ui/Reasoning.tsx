import { useAssistantState } from '@assistant-ui/react';
import type { ReasoningGroupComponent, ReasoningMessagePartComponent } from '@assistant-ui/react';
import { useEffect, useRef, useState, type SyntheticEvent } from 'react';
import { MarkdownText } from './MarkdownText';

export const Reasoning: ReasoningMessagePartComponent = ({ text, status }) => {
  if (!text) return null;
  return (
    <div className="text-xs leading-6 text-zinc-700 dark:text-zinc-300">
      <MarkdownText text={text} isRunning={status?.type === 'running'} />
    </div>
  );
};

export const ReasoningGroup: ReasoningGroupComponent = ({ children }) => {
  const hasText = useAssistantState((state) =>
    state.message.parts.some(
      (part) => part.type === 'text' && typeof part.text === 'string' && part.text.length > 0,
    ),
  );
  const [open, setOpen] = useState(true);
  const didAutoClose = useRef(false);

  useEffect(() => {
    if (!hasText) {
      setOpen(true);
      return;
    }
    if (!didAutoClose.current) {
      setOpen(false);
      didAutoClose.current = true;
    }
  }, [hasText]);

  const handleToggle = (event: SyntheticEvent<HTMLDetailsElement>) => {
    if (!hasText) return;
    setOpen((event.currentTarget as HTMLDetailsElement).open);
  };

  return (
    <details
      className="order-first mb-2 rounded-md border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-700 dark:bg-zinc-900/40"
      open={open}
      onToggle={handleToggle}
    >
      <summary className="cursor-pointer select-none text-xs font-medium text-zinc-600 dark:text-zinc-300">
        Reasoning
      </summary>
      <div className="mt-2">{children}</div>
    </details>
  );
};
