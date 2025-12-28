import React, { useState, useEffect, useCallback } from 'react';
import {
  SparklesIcon,
  PlayIcon,
  StopIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  XMarkIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import type { ParsingJob, ParsingOptions } from '@/shared/types/concept-parsing';
import { useService, useChatService } from '@/renderer/services/services-context';
import type { ConceptIngestionPlan } from '@/shared/types/electron-api/knowledge-api';
import { showSuccess, showError } from '@/renderer/shared/lib';

interface ConceptParserProps {
  selectedFiles: Set<string>;
  onParseComplete?: (job: ParsingJob) => void;
  className?: string;
}

export const ConceptParser: React.FC<ConceptParserProps> = ({
  selectedFiles,
  onParseComplete,
  className = '',
}) => {
  const conceptParsingService = useService('conceptParsing');
  const chatService = useChatService();
  const [activeParsingJob, setActiveParsingJob] = useState<ParsingJob | null>(null);
  const [lastJobId, setLastJobId] = useState<string | null>(null);
  const [lastFiles, setLastFiles] = useState<string[]>([]);

  useEffect(() => {
    if (!conceptParsingService) return;
    setLastJobId(conceptParsingService.getLastJobId());
    setLastFiles(conceptParsingService.getLastFiles());
  }, [conceptParsingService]);

  const getSelectedMarkdownFiles = useCallback(() => {
    return Array.from(selectedFiles).filter(
      (filePath) =>
        filePath.toLowerCase().endsWith('.md') || filePath.toLowerCase().endsWith('.markdown'),
    );
  }, [selectedFiles]);

  const monitorJob = useCallback(
    (jobId: string, usedFiles: string[]) => {
      if (!conceptParsingService) return;

      const checkProgress = setInterval(() => {
        const updatedJob = conceptParsingService.getJobStatus(jobId);
        if (updatedJob) {
          setActiveParsingJob(updatedJob);

          if (updatedJob.status === 'completed') {
            clearInterval(checkProgress);
            onParseComplete?.(updatedJob);
          } else if (updatedJob.status === 'failed') {
            clearInterval(checkProgress);
            showError(`Concept parsing failed: ${updatedJob.errorMessage || 'Unknown error'}`);
          }
        }
      }, 1000);
    },
    [conceptParsingService, onParseComplete],
  );

  const showErrorDialog = (
    title: string,
    message: string,
    actionType: 'configure' | 'retry' | 'service',
  ) => {
    const actionText =
      actionType === 'configure'
        ? '\n\nWould you like to open Settings to configure your AI provider?'
        : actionType === 'retry'
          ? '\n\nPlease check your configuration and try again.'
          : '\n\nPlease restart the application and try again.';

    if (confirm(`${title}\n\n${message}${actionText}`) && actionType === 'configure') {
      window.location.hash = '/settings';
    }
  };

  const testProviderConnectivity = async (providerInfo: { name?: string; provider?: string } | null): Promise<boolean> => {
    try {
      return !!providerInfo?.name;
    } catch (error) {
      console.error('Provider connectivity test failed:', error);
      return false;
    }
  };

  const startConceptParsing = async () => {
    const markdownFiles = getSelectedMarkdownFiles();

    // Validation 1: Check if files are selected
    if (markdownFiles.length === 0) {
      alert('Please select at least one markdown file to parse concepts.');
      return;
    }

    // Validation 2: Check AI provider availability and configuration
    try {
      if (!chatService) {
        showErrorDialog(
          'AI Service Not Available',
          'The AI service is not initialized. Please restart the application and try again.',
          'service',
        );
        return;
      }

      const providerInfo = chatService?.getProviderInfo ? chatService.getProviderInfo() : null;
      if (!providerInfo) {
        showErrorDialog(
          'No AI Provider Configured',
          'Please configure an AI provider in Settings > AI Providers before using concept parsing.',
          'configure',
        );
        return;
      }

      if (!providerInfo.name || providerInfo.name === 'unknown') {
        showErrorDialog(
          'AI Provider Incomplete',
          `The ${providerInfo.name || 'selected'} provider is not not properly configured. Please add a valid API key in Settings > AI Providers.`,
          'configure',
        );
        return;
      }

      const isProviderReady = await testProviderConnectivity(providerInfo);
      if (!isProviderReady) {
        showErrorDialog(
          'AI Provider Unreachable',
          `Unable to connect to ${providerInfo.name}. Please check your internet connection, API key, and provider settings.`,
          'retry',
        );
        return;
      }
    } catch (error) {
      console.error('AI provider validation failed:', error);
      showErrorDialog(
        'AI Provider Validation Failed',
        'An error occurred while validating the AI provider. Please check your configuration and try again.',
        'configure',
      );
      return;
    }

    // All validations passed - start parsing
    if (!conceptParsingService) {
      showError('Concept parsing service is not available');
      return;
    }

    try {
      const job = await conceptParsingService.parseFiles(markdownFiles, {
        confidenceThreshold: 0.6,
        maxConceptsPerFile: 50,
        includeRelationships: true,
      });

      setActiveParsingJob(job);
      monitorJob(job.id, markdownFiles);
      showSuccess('Parsing started');
    } catch (error) {
      console.error('Failed to start concept parsing:', error);
      showErrorDialog(
        'Parsing Failed',
        'Failed to start concept parsing. Please check your file selection and try again.',
        'retry',
      );
    }
  };

  const cancelParsing = () => {
    if (activeParsingJob && conceptParsingService) {
      conceptParsingService.cancelJob(activeParsingJob.id);
      setActiveParsingJob(null);
    }
  };

  const retryParsing = async () => {
    if (
      !activeParsingJob ||
      (activeParsingJob.status !== 'failed' && activeParsingJob.status !== 'completed') ||
      !conceptParsingService
    ) {
      return;
    }

    try {
      const filesToUse = getSelectedMarkdownFiles();
      const retryJob = await conceptParsingService.parseFiles(filesToUse, {
        confidenceThreshold: 0.6,
        maxConceptsPerFile: 50,
        includeRelationships: true,
      });

      setActiveParsingJob(retryJob);
      monitorJob(retryJob.id, filesToUse);
      showSuccess('Retry started');
    } catch (error) {
      console.error('Failed to retry concept parsing:', error);
      showError('Failed to retry concept parsing. Please try again.');
    }
  };

  const resumeLastParsing = async () => {
    if (!conceptParsingService) return;
    const useFiles = getSelectedMarkdownFiles();
    const files = useFiles.length ? useFiles : lastFiles;
    if (!lastJobId || files.length === 0) {
      showError('No previous parsing job to resume.');
      return;
    }
    try {
      const job = await conceptParsingService.parseFiles(files, {
        confidenceThreshold: 0.6,
        maxConceptsPerFile: 50,
        includeRelationships: true,
        jobId: lastJobId,
        resume: true,
      });
      setActiveParsingJob(job);
      monitorJob(job.id, files);
      showSuccess('Resumed previous parse');
    } catch (error) {
      console.error('Failed to resume concept parsing:', error);
      showError('Resume failed. Try starting a new parse.');
    }
  };

  const clearParsingCache = async () => {
    if (!conceptParsingService) return;
    try {
      const removed = await conceptParsingService.clearSavedJobs();
      setLastJobId(null);
      setLastFiles([]);
      showSuccess(`Cleared ${removed} cached parsing jobs.`);
    } catch (error) {
      console.error('Failed to clear parsing cache', error);
      showError('Failed to clear parsing cache.');
    }
  };

  const applyLastFilesSelection = () => {
    // This would need to be handled by parent component
    showError('Please implement applyLastFilesSelection in parent component');
  };

  const clearFailedJob = () => {
    if (activeParsingJob?.status === 'failed') {
      setActiveParsingJob(null);
    }
  };

  const selectedMarkdownFiles = getSelectedMarkdownFiles();

  if (selectedMarkdownFiles.length === 0) {
    return null;
  }

  return (
    <div className={`mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <SparklesIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
            {selectedMarkdownFiles.length} markdown file
            {selectedMarkdownFiles.length > 1 ? 's' : ''} selected
          </span>

          {/* Info Tooltip */}
          <div className="group relative">
            <InformationCircleIcon className="w-4 h-4 text-blue-500 cursor-help" />
            <div className="absolute left-0 bottom-full mb-2 w-64 p-2 bg-gray-800 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
              <div className="font-semibold mb-1">Tips for successful parsing:</div>
              <ul className="space-y-1">
                <li>• Ensure files contain markdown headers (# ## ###)</li>
                <li>• Include code blocks or technical terms</li>
                <li>• AI extraction requires configured provider</li>
                <li>• Make sure files aren't empty</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {(!activeParsingJob || activeParsingJob.status === 'completed') && (
          <div className="flex items-center space-x-2">
            <button
              onClick={startConceptParsing}
              className="flex items-center space-x-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors"
            >
              <PlayIcon className="w-3 h-3" />
              <span>Parse Concepts</span>
            </button>
            <button
              onClick={resumeLastParsing}
              disabled={!lastJobId}
              className={`flex items-center space-x-1 px-3 py-1 text-sm rounded-md transition-colors ${
                lastJobId
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
            >
              <ArrowPathIcon className="w-3 h-3" />
              <span>Resume Last</span>
            </button>
            <button
              onClick={applyLastFilesSelection}
              disabled={!lastFiles.length}
              className={`flex items-center space-x-1 px-3 py-1 text-sm rounded-md transition-colors ${
                lastFiles.length
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
            >
              <DocumentTextIcon className="w-3 h-3" />
              <span>Use Last Files</span>
            </button>
            <button
              onClick={clearParsingCache}
              className="flex items-center space-x-1 px-3 py-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm rounded-md transition-colors"
            >
              <XMarkIcon className="w-3 h-3" />
              <span>Clear Cache</span>
            </button>
          </div>
        )}
      </div>

      {lastJobId && (
        <div className="text-xs text-gray-600 dark:text-gray-400 ml-6">
          Last job: <span className="font-mono">{lastJobId.slice(0, 12)}…</span>{' '}
          {lastFiles.length ? `(${lastFiles.length} files)` : ''}
        </div>
      )}

      {/* Active Parsing Job */}
      {activeParsingJob && (
        <div className="mt-3 p-2 bg-white dark:bg-gray-800 rounded border border-blue-200 dark:border-blue-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  activeParsingJob.status === 'completed'
                    ? 'bg-green-500'
                    : activeParsingJob.status === 'failed'
                      ? 'bg-red-500'
                      : activeParsingJob.status === 'processing'
                        ? 'bg-blue-500 animate-pulse'
                        : 'bg-gray-400'
                }`}
              />
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {activeParsingJob.status === 'processing'
                  ? 'Parsing...'
                  : activeParsingJob.status === 'completed'
                    ? 'Completed'
                    : activeParsingJob.status === 'failed'
                      ? 'Failed'
                      : 'Starting...'}
              </span>
              {activeParsingJob.status === 'processing' && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {Math.round(activeParsingJob.progress * 100)}%
                </span>
              )}
            </div>
            <div className="flex items-center space-x-1">
              {activeParsingJob.status === 'processing' && (
                <button
                  onClick={cancelParsing}
                  className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded text-red-600 dark:text-red-400"
                  title="Cancel parsing"
                >
                  <StopIcon className="w-3 h-3" />
                </button>
              )}
              {activeParsingJob.status === 'completed' && (
                <>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-green-600 dark:text-green-400">
                      {activeParsingJob.result?.concepts?.length || 0} concepts extracted
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          {activeParsingJob.status === 'processing' && (
            <div className="mt-2">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                <div
                  className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${activeParsingJob.progress * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Success Message */}
          {activeParsingJob.status === 'completed' && (
            <div className="mt-2">
              <div className="flex items-start space-x-2 p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
                <SparklesIcon className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-xs font-medium text-green-800 dark:text-green-200 mb-1">
                    Parsing Completed Successfully
                  </div>
                  <div className="text-xs text-green-700 dark:text-green-400">
                    {activeParsingJob.result?.concepts?.length || 0} concepts extracted from{' '}
                    {selectedMarkdownFiles.length} files
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {activeParsingJob.status === 'failed' && activeParsingJob.errorMessage && (
            <div className="mt-2">
              <div className="flex items-start space-x-2 p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
                <ExclamationTriangleIcon className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-xs font-medium text-red-800 dark:text-red-200 mb-1">
                    Parsing Failed
                  </div>
                  <div className="text-xs text-red-600 dark:text-red-400">
                    {activeParsingJob.errorMessage}
                  </div>
                  <div className="mt-2 flex items-center space-x-2">
                    <button
                      onClick={retryParsing}
                      className="flex items-center space-x-1 px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors"
                    >
                      <ArrowPathIcon className="w-3 h-3" />
                      <span>Retry</span>
                    </button>
                    <button
                      onClick={clearFailedJob}
                      className="flex items-center space-x-1 px-2 py-1 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 text-xs rounded transition-colors"
                    >
                      <XMarkIcon className="w-3 h-3" />
                      <span>Clear</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ConceptParser;
