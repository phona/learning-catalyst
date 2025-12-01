import React, { useEffect, useState, useRef } from 'react';

export interface ModelOption {
  id: string;
  label?: string;
}

interface ModelSelectProps {
  models: ReadonlyArray<ModelOption | string>;
  value: string;
  onChange: (modelId: string) => void;
  disabled?: boolean;
  allowFreeInput?: boolean;
  className?: string;
  id?: string;
  /**
   * If true, only commit to parent on blur or Enter, not on every keystroke.
   */
  commitOnBlur?: boolean;
}

export const ModelSelect: React.FC<ModelSelectProps> = ({
  models,
  value,
  onChange,
  disabled,
  allowFreeInput,
  className,
  id,
  commitOnBlur = false,
}) => {
  const normalized = models.map((m) =>
    typeof m === 'string' ? { id: m, label: m } : { id: m.id, label: m.label ?? m.id },
  );

  const [inputValue, setInputValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const lastChangeTs = useRef<number>(0);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    const recentChange = Date.now() - lastChangeTs.current < 400;
    const active = document.activeElement;
    const lostFocus =
      active !== el &&
      (active === document.body || active === null || active === document.documentElement);
    if (recentChange && lostFocus) {
      // If a render briefly stole focus, put it back and keep caret position.
      handleAccidentalBlur();
    }
  }, [inputValue]);

  const handleAccidentalBlur = () => {
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (!el) return;
      el.focus();
      const len = el.value.length;
      try {
        el.setSelectionRange(len, len);
      } catch {
        /* caret positioning may fail on some inputs; safe to ignore */
      }
    });
  };

  const filtered = normalized.filter((m) =>
    m.label.toLowerCase().includes(inputValue.toLowerCase()),
  );

  const commitValue = (val: string) => {
    setInputValue(val);
    onChange(val);
    lastChangeTs.current = Date.now();
    setIsOpen(false);
  };

  if (allowFreeInput) {
    return (
      <div className="relative w-full">
        <input
          id={id}
          list="model-select-datalist"
          type="text"
          value={inputValue}
          ref={inputRef}
          onChange={(e) => {
            setInputValue(e.target.value);
            if (!commitOnBlur) {
              onChange(e.target.value);
              lastChangeTs.current = Date.now();
            }
            setIsOpen(true);
          }}
          onBlur={(e) => {
            const nextTarget = e.relatedTarget as HTMLElement | null;
            const accidental =
              !nextTarget ||
              nextTarget === document.body ||
              nextTarget === document.documentElement;
            if (commitOnBlur) {
              onChange(inputValue);
            }
            if (accidental) {
              handleAccidentalBlur();
            }
            setTimeout(() => setIsOpen(false), 0);
          }}
          onKeyDown={(e) => {
            if (commitOnBlur && e.key === 'Enter') {
              onChange(inputValue);
            }
            if (!filtered.length) return;
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setIsOpen(true);
              setHighlightIndex((prev) => (prev + 1) % filtered.length);
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setIsOpen(true);
              setHighlightIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
            } else if (e.key === 'Enter' && isOpen) {
              e.preventDefault();
              const target = filtered[highlightIndex];
              if (target) {
                commitValue(target.id);
              }
            } else if (e.key === 'Escape') {
              setIsOpen(false);
            }
          }}
          onFocus={() => setIsOpen(true)}
          autoComplete="off"
          disabled={disabled}
          className={
            className ??
            'flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50'
          }
          placeholder="Type to search or enter model ID"
        />
        {isOpen && filtered.length > 0 && (
          <ul
            role="listbox"
            className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg"
          >
            {filtered.map((m, idx) => (
              <li
                key={m.id}
                role="option"
                aria-selected={idx === highlightIndex}
                className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${
                  idx === highlightIndex ? 'bg-gray-100 dark:bg-gray-700' : ''
                }`}
                onMouseDown={(e) => e.preventDefault()} // keep focus on input
                onMouseEnter={() => setHighlightIndex(idx)}
                onClick={() => commitValue(m.id)}
              >
                {m.label}
              </li>
            ))}
          </ul>
        )}
        <datalist id="model-select-datalist">
          {normalized.map((m) => (
            <option key={m.id} value={m.id} />
          ))}
        </datalist>
      </div>
    );
  }

  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={
        className ??
        'flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50'
      }
    >
      <option value="">Select model...</option>
      {normalized.map((m) => (
        <option key={m.id} value={m.id}>
          {m.label ?? m.id}
        </option>
      ))}
    </select>
  );
};

export default ModelSelect;
