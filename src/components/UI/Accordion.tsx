import React, { useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { cn } from '@/utils/cn';

export interface AccordionItemProps {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  className?: string;
}

export interface AccordionProps {
  children: React.ReactNode;
  className?: string;
  multiple?: boolean;
  defaultExpandedIds?: string[];
}

const AccordionItem: React.FC<AccordionItemProps & {
  expanded: boolean;
  onToggle: () => void;
}> = ({ id, title, description, children, expanded, onToggle, className }) => {
  return (
    <div className={cn('border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden', className)}>
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors flex items-center justify-between text-left"
        aria-expanded={expanded}
        aria-controls={`accordion-content-${id}`}
      >
        <div className="flex items-center space-x-3">
          <div className="transition-transform duration-200">
            {expanded ? (
              <ChevronDownIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            ) : (
              <ChevronRightIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            )}
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-gray-100">{title}</h3>
            {description && (
              <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
            )}
          </div>
        </div>
      </button>

      {expanded && (
        <div
          id={`accordion-content-${id}`}
          className="px-4 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 animate-slide-down"
        >
          {children}
        </div>
      )}
    </div>
  );
};

export const Accordion: React.FC<AccordionProps> = ({
  children,
  className,
  multiple = false,
  defaultExpandedIds = []
}) => {
  const [expandedIds, setExpandedIds] = useState<string[]>(defaultExpandedIds);

  const handleToggle = (id: string) => {
    setExpandedIds(prev => {
      if (multiple) {
        return prev.includes(id)
          ? prev.filter(expandedId => expandedId !== id)
          : [...prev, id];
      } else {
        return prev.includes(id) ? [] : [id];
      }
    });
  };

  return (
    <div className={cn('space-y-3', className)}>
      {React.Children.map(children, child => {
        if (React.isValidElement(child) && child.type === AccordionItem) {
          return React.cloneElement(child, {
            expanded: expandedIds.includes(child.props.id),
            onToggle: () => handleToggle(child.props.id)
          });
        }
        return child;
      })}
    </div>
  );
};

Accordion.Item = AccordionItem;