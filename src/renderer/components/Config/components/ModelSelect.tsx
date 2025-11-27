import React from 'react';

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
}

export const ModelSelect: React.FC<ModelSelectProps> = ({
  models,
  value,
  onChange,
  disabled,
  allowFreeInput,
  className,
  id,
}) => {
  const normalized = models.map((m) =>
    typeof m === 'string' ? { id: m, label: m } : { id: m.id, label: m.label ?? m.id },
  );

  if (allowFreeInput) {
    return (
      <>
        <input
          id={id}
          list="model-select-datalist"
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={
            className ??
            'flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50'
          }
          placeholder="Type to search or enter model ID"
        />
        <datalist id="model-select-datalist">
          {normalized.map((m) => (
            <option key={m.id} value={m.id} />
          ))}
        </datalist>
      </>
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
