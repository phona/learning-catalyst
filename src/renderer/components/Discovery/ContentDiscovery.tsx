


import React from 'react';
import { LocalProjectExplorer } from './LocalProjectExplorer';

interface ContentDiscoveryProps {
  className?: string;
}

export const ContentDiscovery: React.FC<ContentDiscoveryProps> = ({
  className = ''
}) => {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      <LocalProjectExplorer />
    </div>
  );
};