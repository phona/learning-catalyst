import React, { useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { cn } from '@/renderer/utils/cn';

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
  expandedIds?: string[];
  onExpandedChange?: (ids: string[]) => void;
}

type AccordionItemInternalProps = AccordionItemProps & {
  expanded: boolean;
  onToggle: () => void;
};

const AccordionItem: React.FC<AccordionItemInternalProps> = ({
  id,
  title,
  description,
  children,
  expanded,
  onToggle,
  className,
}) => {
  return (
    <div
      className={cn(
        'border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden',
        className,
      )}
    >
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
// Marker so parent Accordion can reliably identify item instances even when module copies differ
(AccordionItem as any).__ACC_ITEM = true;
AccordionItem.displayName = 'AccordionItem';

type AccordionComponent = React.FC<AccordionProps> & {
  Item: React.FC<AccordionItemProps>;
};

const Accordion: AccordionComponent = ({
  children,
  className,
  multiple = false,
  defaultExpandedIds = [],
  expandedIds: controlledExpandedIds,
  onExpandedChange,
}) => {
  const [uncontrolledExpandedIds, setUncontrolledExpandedIds] = useState<string[]>(
    defaultExpandedIds,
  );

  const expandedIds = controlledExpandedIds ?? uncontrolledExpandedIds;

  const handleToggle = (id: string) => {
    const computeNext = (prev: string[]) => {
      if (multiple) {
        return prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      }
      return prev.includes(id) ? [] : [id];
    };

    const next = computeNext(expandedIds);
    onExpandedChange?.(next);
    if (controlledExpandedIds === undefined) {
      setUncontrolledExpandedIds(next);
    }
  };

  const isAccordionItem = (element: React.ReactElement) => {
    const type: any = element.type;
    return type === AccordionItem || type?.displayName === 'AccordionItem' || type?.__ACC_ITEM;
  };

  return (
    <div className={cn('space-y-3', className)}>
      {React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) return child;
        if (!isAccordionItem(child)) return child;

        const childId = (child.props as AccordionItemProps).id;
        if (!childId) return child;

        return React.cloneElement(child, {
          expanded: expandedIds.includes(childId),
          onToggle: () => handleToggle(childId),
        });
      })}
    </div>
  );
};

Accordion.Item = AccordionItem as React.FC<AccordionItemProps>;

export { Accordion };
