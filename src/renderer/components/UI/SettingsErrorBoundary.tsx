import React from 'react';
import { ErrorBoundaryEnhanced } from './ErrorBoundaryEnhanced';
import { ExclamationTriangleIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';

interface SettingsErrorBoundaryProps {
  children: React.ReactNode;
  onSaveError?: (error: Error) => void;
}

/**
 * Specialized error boundary for settings components
 * Handles configuration-related errors with appropriate recovery options
 */
export const SettingsErrorBoundary: React.FC<SettingsErrorBoundaryProps> = ({
  children,
  onSaveError
}) => {
  const handleError = (error: Error) => {
    // Log settings-specific errors
    console.error('Settings component error:', error);
    onSaveError?.(error);
  };

  const customFallback = (
    <div className="p-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg m-6">
      <div className="flex items-start space-x-3">
        <Cog6ToothIcon className="w-6 h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-lg font-medium text-yellow-800 dark:text-yellow-200">
            Settings Error
          </h3>
          <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
            The settings panel encountered an error while loading or saving your configuration.
          </p>
          <div className="mt-3 p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded">
            <p className="text-xs text-yellow-800 dark:text-yellow-200">
              <strong>Note:</strong> Your previous settings are still saved and active. Only the settings interface is affected.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <ErrorBoundaryEnhanced
      variant="inline"
      title="Settings Error"
      description="The settings panel encountered an error. Your previous settings are still active."
      fallback={customFallback}
      onError={handleError}
      showRetry={true}
    >
      {children}
    </ErrorBoundaryEnhanced>
  );
};