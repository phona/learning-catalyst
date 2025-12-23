import React, { useState, useEffect } from 'react';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { useConfigurationService } from '@/renderer/services/services-provider';

interface ProviderStatusProps {
  onConfigure?: () => void;
  className?: string;
}

interface ProviderStatusState {
  status: 'loading' | 'ready' | 'not-configured' | 'incomplete' | 'error';
  message: string;
  details?: string;
  providerInfo?: { name?: string; type?: string } | null;
}

export const ProviderStatus: React.FC<ProviderStatusProps> = ({
  onConfigure,
  className = '',
}) => {
  const configurationService = useConfigurationService();
  const [status, setStatus] = useState<ProviderStatusState>({
    status: 'loading',
    message: 'Checking provider status...',
  });

  useEffect(() => {
    const checkProviderStatus = async () => {
      try {
        if (!configurationService) {
          setStatus({
            status: 'error',
            message: 'Configuration Service Not Available',
            details: 'The configuration service is not initialized.',
          });
          return;
        }

        const providerStatus = await configurationService.getProviderStatus();
        setStatus(providerStatus);
      } catch (error) {
        console.error('Failed to get provider status:', error);
        setStatus({
          status: 'error',
          message: 'Provider Validation Failed',
          details: 'An error occurred while validating the AI provider. Please check your configuration.',
        });
      }
    };

    checkProviderStatus();
  }, [configurationService]);

  const getStatusIcon = () => {
    switch (status.status) {
      case 'ready':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'not-configured':
      case 'incomplete':
        return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />;
      case 'error':
        return <XCircleIcon className="w-5 h-5 text-red-500" />;
      default:
        return <InformationCircleIcon className="w-5 h-5 text-blue-500" />;
    }
  };

  const getStatusColor = () => {
    switch (status.status) {
      case 'ready':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200';
      case 'not-configured':
      case 'incomplete':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200';
      case 'error':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200';
      default:
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200';
    }
  };

  return (
    <div className={`rounded-lg border p-3 ${getStatusColor()} ${className}`}>
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 mt-0.5">{getStatusIcon()}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">{status.message}</h4>
            {(status.status === 'not-configured' || status.status === 'incomplete' || status.status === 'error') && onConfigure && (
              <button
                onClick={onConfigure}
                className="text-xs px-2 py-1 bg-white dark:bg-gray-800 border border-current rounded hover:opacity-80 transition-opacity"
              >
                Configure
              </button>
            )}
          </div>
          {status.details && (
            <p className="text-xs mt-1 opacity-90">{status.details}</p>
          )}
          {status.providerInfo?.name && status.status === 'ready' && (
            <div className="mt-2 flex items-center space-x-2">
              <span className="text-xs px-2 py-0.5 bg-white dark:bg-gray-800 rounded border">
                {status.providerInfo.name}
              </span>
              {status.providerInfo.type && (
                <span className="text-xs px-2 py-0.5 bg-white dark:bg-gray-800 rounded border">
                  {status.providerInfo.type}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProviderStatus;
