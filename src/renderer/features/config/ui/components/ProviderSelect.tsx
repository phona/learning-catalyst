import React from 'react';

export interface ProviderOption {
  id: string;
  label: string;
  disabled?: boolean;
}

interface ProviderSelectProps {
  providers: ReadonlyArray<ProviderOption>;
  value: string;
  onChange: (providerId: string) => void;
  placeholderLabel?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
}

export const ProviderSelect: React.FC<ProviderSelectProps> = ({
  providers,
  value,
  onChange,
  placeholderLabel = 'Select provider...'
  ,
  className,
  disabled,
  id,
}) => {
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
      <option value="">{placeholderLabel}</option>
      {providers.map((p) => (
        <option key={p.id} value={p.id} disabled={p.disabled}>
          {p.label}
        </option>
      ))}
    </select>
  );
};

export default ProviderSelect;
