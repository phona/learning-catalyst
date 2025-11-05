/**
 * Filter Chips Component - Reusable filter selection
 */
import React from 'react';

interface FilterOption {
  value: string;
  label: string;
}

interface FilterChipsProps {
  options: FilterOption[];
  selected: string;
  onSelect: (value: string) => void;
  className?: string;
}

export const FilterChips: React.FC<FilterChipsProps> = ({
  options,
  selected,
  onSelect,
  className = ""
}) => {
  return (
    <div className={`flex space-x-2 ${className}`}>
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onSelect(option.value)}
          className={`px-3 py-1 rounded-full text-sm transition-colors ${
            selected === option.value
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};

export default FilterChips;