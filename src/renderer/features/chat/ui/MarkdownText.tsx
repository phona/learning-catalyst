import { memo, useState, type FC } from 'react';
import {
  type CodeHeaderProps,
  MarkdownTextPrimitive,
  unstable_memoizeMarkdownComponents as memoizeMarkdownComponents,
} from '@assistant-ui/react-markdown';
import { TextMessagePartProvider } from '@assistant-ui/react';
import remarkGfm from 'remark-gfm';
import { CheckIcon, CopyIcon } from 'lucide-react';

/**
 * Hook for clipboard copy with visual feedback
 */
const useCopyToClipboard = (copiedDuration = 3000) => {
  const [isCopied, setIsCopied] = useState(false);

  const copyToClipboard = (value: string) => {
    if (!value) return;
    navigator.clipboard.writeText(value).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), copiedDuration);
    });
  };

  return { isCopied, copyToClipboard };
};

/**
 * Code block header with language label and copy button
 */
const CodeHeader: FC<CodeHeaderProps> = ({ language, code }) => {
  const { isCopied, copyToClipboard } = useCopyToClipboard();

  const onCopy = () => {
    if (!code || isCopied) return;
    copyToClipboard(code);
  };

  return (
    <div className="flex items-center justify-between bg-zinc-800 px-4 py-2 text-xs text-zinc-400 rounded-t-md">
      <span className="font-mono">{language || 'code'}</span>
      <button
        onClick={onCopy}
        className="flex items-center gap-1 hover:text-zinc-200 transition-colors"
        title="Copy code"
      >
        {isCopied ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
      </button>
    </div>
  );
};

/**
 * Memoized markdown components for performance
 */
const defaultComponents = memoizeMarkdownComponents({
  h1: ({ className, ...props }) => (
    <h1 className="text-2xl font-bold mt-6 mb-4 text-zinc-900 dark:text-zinc-100" {...props} />
  ),
  h2: ({ className, ...props }) => (
    <h2 className="text-xl font-semibold mt-5 mb-3 text-zinc-900 dark:text-zinc-100" {...props} />
  ),
  h3: ({ className, ...props }) => (
    <h3 className="text-lg font-semibold mt-4 mb-2 text-zinc-900 dark:text-zinc-100" {...props} />
  ),
  h4: ({ className, ...props }) => (
    <h4 className="text-base font-semibold mt-3 mb-2 text-zinc-800 dark:text-zinc-200" {...props} />
  ),
  p: ({ className, ...props }) => (
    <p className="my-3 leading-7 text-zinc-800 dark:text-zinc-200" {...props} />
  ),
  ul: ({ className, ...props }) => (
    <ul className="my-3 ml-6 list-disc space-y-1 text-zinc-800 dark:text-zinc-200" {...props} />
  ),
  ol: ({ className, ...props }) => (
    <ol className="my-3 ml-6 list-decimal space-y-1 text-zinc-800 dark:text-zinc-200" {...props} />
  ),
  li: ({ className, ...props }) => (
    <li className="leading-7" {...props} />
  ),
  blockquote: ({ className, ...props }) => (
    <blockquote className="my-3 border-l-4 border-zinc-300 dark:border-zinc-600 pl-4 italic text-zinc-600 dark:text-zinc-300" {...props} />
  ),
  code: ({ className, ...props }) => (
    <code className="rounded bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 font-mono text-sm text-zinc-800 dark:text-zinc-200" {...props} />
  ),
  pre: ({ className, ...props }) => (
    <pre className="my-3 overflow-x-auto rounded-b-md bg-zinc-900 p-4 font-mono text-sm text-zinc-100" {...props} />
  ),
  a: ({ className, ...props }) => (
    <a className="text-blue-600 dark:text-blue-400 underline hover:text-blue-800 dark:hover:text-blue-300" {...props} />
  ),
  table: ({ className, ...props }) => (
    <div className="my-3 overflow-x-auto">
      <table className="min-w-full border-collapse border border-zinc-300 dark:border-zinc-600" {...props} />
    </div>
  ),
  th: ({ className, ...props }) => (
    <th className="border border-zinc-300 dark:border-zinc-600 bg-zinc-100 dark:bg-zinc-800 px-4 py-2 text-left font-semibold text-zinc-900 dark:text-zinc-100" {...props} />
  ),
  td: ({ className, ...props }) => (
    <td className="border border-zinc-300 dark:border-zinc-600 px-4 py-2 text-zinc-800 dark:text-zinc-200" {...props} />
  ),
  hr: ({ className, ...props }) => (
    <hr className="my-6 border-zinc-300 dark:border-zinc-600" {...props} />
  ),
  CodeHeader,
});

/**
 * MarkdownText component for rendering assistant messages with markdown
 */
type MarkdownTextProps = {
  text?: string;
  isRunning?: boolean;
};

const MarkdownTextImpl: FC<MarkdownTextProps> = ({ text, isRunning = false }) => {
  const content = (
    <MarkdownTextPrimitive
      remarkPlugins={[remarkGfm]}
      components={defaultComponents}
    />
  );

  if (text == null) {
    return content;
  }

  return (
    <TextMessagePartProvider text={text} isRunning={isRunning}>
      {content}
    </TextMessagePartProvider>
  );
};

export const MarkdownText = memo(MarkdownTextImpl);
