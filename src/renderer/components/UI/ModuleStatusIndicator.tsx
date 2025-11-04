/**
 * Module Status Indicator
 *
 * Displays the health and status of the modular architecture system.
 * Provides visual feedback for module system health.
 */

import React from 'react';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

interface ModuleStatusIndicatorProps {
  systemHealth: any;
  onRefresh?: () => void;
  compact?: boolean;
}

export const ModuleStatusIndicator: React.FC<ModuleStatusIndicatorProps> = ({
  systemHealth,
  onRefresh,
  compact = false
}) => {
  if (!systemHealth) {
    return (
      <div className="flex items-center space-x-2 text-gray-500">
        <InformationCircleIcon className="w-4 h-4" />
        <span className="text-sm">Module system initializing...</span>
      </div>
    );
  }

  const { overall, modules } = systemHealth;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
      case 'degraded':
        return <ExclamationTriangleIcon className="w-4 h-4 text-yellow-500" />;
      case 'failed':
        return <XCircleIcon className="w-4 h-4 text-red-500" />;
      default:
        return <InformationCircleIcon className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900';
      case 'degraded':
        return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900';
      case 'failed':
        return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900';
      default:
        return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900';
    }
  };

  const failedModules = Object.entries(modules).filter(([_, health]: [string, any]) =>
    health.status === 'failed'
  );

  const degradedModules = Object.entries(modules).filter(([_, health]: [string, any]) =>
    health.status === 'degraded'
  );

  if (compact) {
    return (
      <div className="flex items-center space-x-2">
        {getStatusIcon(overall)}
        <span className={`text-sm font-medium px-2 py-1 rounded ${getStatusColor(overall)}`}>
          {overall === 'healthy' ? 'All Systems Operational' :
           overall === 'degraded' ? 'System Degraded' : 'System Error'}
        </span>
        {(failedModules.length > 0 || degradedModules.length > 0) && (
          <button
            onClick={onRefresh}
            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            title="Refresh module status"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Module System Status
        </h3>
        <button
          onClick={onRefresh}
          className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          title="Refresh module status"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Overall Status */}
      <div className="flex items-center space-x-3 mb-4">
        {getStatusIcon(overall)}
        <span className={`text-lg font-medium px-3 py-1 rounded ${getStatusColor(overall)}`}>
          System {overall === 'healthy' ? 'Operational' :
                   overall === 'degraded' ? 'Degraded' : 'Error'}
        </span>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          Last checked: {new Date(systemHealth.lastCheck).toLocaleTimeString()}
        </span>
      </div>

      {/* Module Details */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Module Details
        </h4>
        {Object.entries(modules).map(([moduleName, health]: [string, any]) => (
          <div key={moduleName} className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-700 rounded">
            <div className="flex items-center space-x-2">
              {getStatusIcon(health.status)}
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {moduleName.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`text-xs px-2 py-1 rounded ${getStatusColor(health.status)}`}>
                {health.status}
              </span>
              {health.message && (
                <span className="text-xs text-gray-500 dark:text-gray-400 max-w-xs truncate">
                  {health.message}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Issues Summary */}
      {systemHealth.issues && systemHealth.issues.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Recent Issues
          </h4>
          <div className="space-y-1">
            {systemHealth.issues.slice(0, 3).map((issue: any, index: number) => (
              <div key={index} className="flex items-center space-x-2 text-xs">
                <span className={`w-2 h-2 rounded-full ${
                  issue.severity === 'critical' ? 'bg-red-500' :
                  issue.severity === 'error' ? 'bg-red-400' :
                  issue.severity === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                }`} />
                <span className="text-gray-600 dark:text-gray-400">
                  {issue.module && `${issue.module}: `}{issue.message}
                </span>
              </div>
            ))}
            {systemHealth.issues.length > 3 && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                ... and {systemHealth.issues.length - 3} more
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};