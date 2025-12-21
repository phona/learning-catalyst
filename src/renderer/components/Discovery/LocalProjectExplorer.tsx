import React, { useState, useEffect, useCallback } from 'react';
import {
  FolderIcon,
  DocumentIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  DocumentTextIcon,
  FolderOpenIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  HomeIcon,
  PlayIcon,
  StopIcon,
  XMarkIcon,
  SparklesIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import type {
  DirectoryScanResult,
  ProjectStructure,
  DirectoryFilterConfig,
} from '@/shared/types/filesystem';
import type { ParsingJob, ParsingOptions } from '@/shared/types/concept-parsing';
import { ConceptParsingResults } from './ConceptParsingResults';
import { useFileService, useService, useChatService } from '@/renderer/services/services-provider';
import type { ConceptIngestionPlan } from '@/shared/types/electron-api/knowledge-api';
import { showSuccess, showError } from '@/renderer/utils/toast';

interface LocalProjectExplorerProps {
  onFileSelect?: (filePath: string) => void;
  onDirectorySelect?: (dirPath: string) => void;
  className?: string;
}

interface TreeNodeProps {
  item: DirectoryScanResult;
  level: number;
  onFileSelect?: (filePath: string) => void;
  onDirectorySelect?: (dirPath: string) => void;
  selectedFiles: Set<string>;
  selectedDirectories: Set<string>;
  onFileToggle: (filePath: string) => void;
  onDirectoryToggle: (dirPath: string) => void;
}

const TreeNode: React.FC<TreeNodeProps> = ({
  item,
  level,
  onFileSelect,
  onDirectorySelect,
  selectedFiles,
  selectedDirectories,
  onFileToggle,
  onDirectoryToggle,
}) => {
  const [isExpanded, setIsExpanded] = useState(level < 2); // Auto-expand first 2 levels
  const hasChildren = item.children && item.children.length > 0;

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleToggle = () => {
    if (item.isDirectory) {
      setIsExpanded(!isExpanded);
    } else {
      onFileToggle(item.path);
    }
  };

  const handleDoubleClick = () => {
    if (item.isDirectory) {
      onDirectorySelect?.(item.path);
    } else {
      onFileSelect?.(item.path);
    }
  };

  const isSelected = item.isDirectory
    ? selectedDirectories.has(item.path)
    : selectedFiles.has(item.path);

  const getIcon = () => {
    if (item.isDirectory) {
      return isExpanded ? (
        <FolderOpenIcon className="w-4 h-4 text-blue-500" />
      ) : (
        <FolderIcon className="w-4 h-4 text-blue-500" />
      );
    }

    if (item.isMarkdown) {
      return <DocumentTextIcon className="w-4 h-4 text-green-500" />;
    }

    return <DocumentIcon className="w-4 h-4 text-gray-400" />;
  };

  return (
    <div className="select-none">
      <div
        className={`flex items-center py-1 px-2 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
          isSelected ? 'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-blue-500' : ''
        }`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleToggle}
        onDoubleClick={handleDoubleClick}
      >
        {item.isDirectory && hasChildren && (
          <div className="mr-1">
            {isExpanded ? (
              <ChevronDownIcon className="w-3 h-3 text-gray-500" />
            ) : (
              <ChevronRightIcon className="w-3 h-3 text-gray-500" />
            )}
          </div>
        )}

        <div className="mr-2">{getIcon()}</div>

        <span
          className={`text-sm truncate ${
            item.isDirectory
              ? 'font-medium text-gray-900 dark:text-gray-100'
              : 'text-gray-700 dark:text-gray-300'
          }`}
        >
          {item.name}
        </span>

        {!item.isDirectory && (
          <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
            {formatFileSize(item.size)}
          </span>
        )}

        {item.isMarkdown && (
          <span className="ml-2 text-xs px-1.5 py-0.5 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 rounded">
            MD
          </span>
        )}
      </div>

      {isExpanded && hasChildren && (
        <div>
          {item.children?.map((child) => (
            <TreeNode
              key={child.path}
              item={child}
              level={level + 1}
              onFileSelect={onFileSelect}
              onDirectorySelect={onDirectorySelect}
              selectedFiles={selectedFiles}
              selectedDirectories={selectedDirectories}
              onFileToggle={onFileToggle}
              onDirectoryToggle={onDirectoryToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const LocalProjectExplorer: React.FC<LocalProjectExplorerProps> = ({
  onFileSelect,
  onDirectorySelect,
  className = '',
}) => {
  const conceptParsingService = useService('conceptParsing');
  const chatService = useChatService();
  const fileService = useFileService();
  const [projectStructure, setProjectStructure] = useState<ProjectStructure | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState('');
  const [maxDepth, setMaxDepth] = useState(3);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [selectedDirectories, setSelectedDirectories] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [lastJobId, setLastJobId] = useState<string | null>(null);
  const [lastFiles, setLastFiles] = useState<string[]>([]);

  // Concept parsing state
  const [activeParsingJob, setActiveParsingJob] = useState<ParsingJob | null>(null);
  const [showParsingResults, setShowParsingResults] = useState(false);

  const loadDirectory = useCallback(
    async (dirPath: string, depthOverride?: number) => {
      const depthToUse = depthOverride ?? maxDepth;
      setIsLoading(true);
      setError(null);

      try {
        // Create filter configuration
        const filterConfig: DirectoryFilterConfig = {
          showHiddenFiles: false,
          excludePatterns: ['node_modules', '.git', '.vscode', '.idea', 'dist', 'build'],
        };

        const directoryResult = await fileService.readDirectory(
          dirPath,
          true,
          depthToUse,
          filterConfig,
        );
        if (!directoryResult.success || !directoryResult.data) {
          throw new Error(directoryResult.error?.message || 'Failed to load directory');
        }
        const items = directoryResult.data;

        // Build tree structure
        const tree = buildTreeStructure(items, dirPath, 0);

        // Calculate statistics
        const allItems = flattenTree(tree);
        const totalFiles = allItems.filter((item) => item.isFile).length;
        const totalDirectories = allItems.filter((item) => item.isDirectory).length;
        const markdownFiles = allItems.filter((item) => item.isMarkdown).length;

        setProjectStructure({
          rootPath: dirPath,
          items: tree,
          totalFiles,
          totalDirectories,
          markdownFiles,
          scanDepth: depthToUse,
        });

        setCurrentPath(dirPath);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load directory');
      } finally {
        setIsLoading(false);
      }
    },
    [fileService, maxDepth],
  );

  const loadDefaultDirectory = useCallback(async () => {
    try {
      const workspacePathResult = await fileService.getWorkspacePath();
      const workspacePath = workspacePathResult.success ? workspacePathResult.data : null;
      if (workspacePath) {
        await loadDirectory(workspacePath);
        return;
      }

      const homePath = process.env.HOME || process.env.USERPROFILE || '.';
      await loadDirectory(homePath);
    } catch {
      const homePath = process.env.HOME || process.env.USERPROFILE || '.';
      await loadDirectory(homePath);
    }
  }, [fileService, loadDirectory]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    loadDefaultDirectory();
  }, []);

  useEffect(() => {
    if (!conceptParsingService) return;
    setLastJobId(conceptParsingService.getLastJobId());
    setLastFiles(conceptParsingService.getLastFiles());
  }, [conceptParsingService]);

  const handleFileToggle = (filePath: string) => {
    setSelectedFiles((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(filePath)) {
        newSet.delete(filePath);
      } else {
        newSet.add(filePath);
      }
      return newSet;
    });
  };

  const handleDirectoryToggle = (dirPath: string) => {
    setSelectedDirectories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(dirPath)) {
        newSet.delete(dirPath);
      } else {
        newSet.add(dirPath);
      }
      return newSet;
    });
  };

  const handleDepthChange = (newDepth: number) => {
    setMaxDepth(newDepth);
    if (currentPath) {
      loadDirectory(currentPath, newDepth);
    }
  };

  const handleNavigateUp = () => {
    if (currentPath) {
      const parentPath = currentPath.substring(
        0,
        currentPath.lastIndexOf(/[\/\\]/.exec(currentPath)?.[0] || ''),
      );
      if (parentPath && parentPath !== currentPath) {
        loadDirectory(parentPath);
      }
    }
  };

  const handleRefresh = () => {
    if (currentPath) {
      loadDirectory(currentPath);
    }
  };

  // Concept parsing functions
  const getSelectedMarkdownFiles = () => {
    return Array.from(selectedFiles).filter(
      (filePath) =>
        filePath.toLowerCase().endsWith('.md') || filePath.toLowerCase().endsWith('.markdown'),
    );
  };

  const monitorJob = (jobId: string, usedFiles: string[]) => {
    if (!conceptParsingService) return;

    const checkProgress = setInterval(() => {
      const updatedJob = conceptParsingService.getJobStatus(jobId);
      if (updatedJob) {
        setActiveParsingJob(updatedJob);

        if (updatedJob.status === 'completed') {
          clearInterval(checkProgress);
          setShowParsingResults(true);
          setLastJobId(jobId);
          setLastFiles(usedFiles);
        } else if (updatedJob.status === 'failed') {
          clearInterval(checkProgress);
          showError(`Concept parsing failed: ${updatedJob.errorMessage || 'Unknown error'}`);
        }
      }
    }, 1000);
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

      // Validation 3: Check if provider is properly configured
      // Note: Basic validation since getProviderInfo() only returns name and type
      // In a full implementation, we would access config store or enhance getProviderInfo()
      if (!providerInfo.name || providerInfo.name === 'unknown') {
        showErrorDialog(
          'AI Provider Incomplete',
          `The ${providerInfo.name || 'selected'} provider is not properly configured. Please add a valid API key in Settings > AI Providers.`,
          'configure',
        );
        return;
      }

      // Validation 4: Optional quick connectivity test
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
    )
      return;

    try {
      const filesToUse = getSelectedMarkdownFiles();
      // Reset job status for retry
      const retryJob = await conceptParsingService.parseFiles(filesToUse, {
        confidenceThreshold: 0.6,
        maxConceptsPerFile: 50,
        includeRelationships: true,
      });

      setActiveParsingJob(retryJob);

      // Monitor retry job progress
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
    if (!lastFiles.length) {
      showError('No previous file selection found.');
      return;
    }
    setSelectedFiles(new Set(lastFiles));
    showSuccess('Re-applied previous file selection');
  };

  const clearFailedJob = () => {
    if (activeParsingJob?.status === 'failed') {
      setActiveParsingJob(null);
    }
  };

  const handleExportResults = (format: 'json' | 'csv') => {
    if (activeParsingJob?.result) {
      // TODO: Implement export functionality
      console.log(`Exporting results as ${format}:`, activeParsingJob.result);
    }
  };

  const handleIngestResults = async () => {
    if (!conceptParsingService || !activeParsingJob?.result) return;
    const plan: ConceptIngestionPlan = { defaultExistingAction: 'overwrite' };
    await conceptParsingService.ingestParsedResult(activeParsingJob.result as any, plan);
  };

  const handleConceptSelect = (conceptId: string) => {
    // TODO: Handle concept selection
    console.log('Selected concept:', conceptId);
  };

  // Enhanced error handling functions
  const showErrorDialog = (
    title: string,
    message: string,
    actionType: 'configure' | 'retry' | 'service',
  ) => {
    // For now, use alert - can be enhanced to a modal later
    const actionText =
      actionType === 'configure'
        ? '\n\nWould you like to open Settings to configure your AI provider?'
        : actionType === 'retry'
          ? '\n\nPlease check your configuration and try again.'
          : '\n\nPlease restart the application and try again.';

    if (confirm(`${title}\n\n${message}${actionText}`) && actionType === 'configure') {
      // Navigate to settings
      window.location.hash = '/settings';
    }
  };

  const testProviderConnectivity = async (providerInfo: { name?: string; provider?: string } | null): Promise<boolean> => {
    try {
      // Simple config validation - no network call for now
      // Can be enhanced to include actual connectivity testing later
      return !!providerInfo?.name;
    } catch (error) {
      console.error('Provider connectivity test failed:', error);
      return false;
    }
  };

  const filteredItems =
    projectStructure?.items.filter((item) => {
      if (!searchQuery) return true;

      const itemMatches = (item: DirectoryScanResult): boolean => {
        if (item.name.toLowerCase().includes(searchQuery.toLowerCase())) {
          return true;
        }
        if (item.children) {
          return item.children.some((child) => itemMatches(child));
        }
        return false;
      };

      return itemMatches(item);
    }) || [];

  const selectedMarkdownFiles = getSelectedMarkdownFiles();

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}
    >
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
            <FolderIcon className="w-5 h-5 mr-2 text-blue-500" />
            Explorer
          </h2>
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors disabled:opacity-50"
          >
            <ArrowPathIcon className={`w-4 h-4 text-gray-500 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Current Path */}
        <div className="flex items-center space-x-2 mb-3">
          <button
            onClick={handleNavigateUp}
            disabled={!currentPath || isLoading}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-50"
          >
            <HomeIcon className="w-4 h-4 text-gray-500" />
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400 truncate">
            {currentPath || 'No directory selected'}
          </span>
        </div>

        {/* Controls */}
        <div className="flex items-center space-x-4">
          {/* Search */}
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Depth Control */}
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600 dark:text-gray-400">Depth:</label>
            <select
              value={maxDepth}
              onChange={(e) => handleDepthChange(Number(e.target.value))}
              className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={4}>4</option>
              <option value={5}>5</option>
            </select>
          </div>
        </div>

        {/* Parsing Controls */}
        {selectedMarkdownFiles.length > 0 && (
          <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
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
                          <button
                            onClick={() => setShowParsingResults(true)}
                            className="p-1 hover:bg-green-100 dark:hover:bg-green-900/20 rounded text-green-600 dark:text-green-400"
                            title="View results"
                          >
                            <SparklesIcon className="w-3 h-3" />
                          </button>
                          <button
                            onClick={retryParsing}
                            className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded text-blue-600 dark:text-blue-400"
                            title="Retry parsing with different settings"
                          >
                            <ArrowPathIcon className="w-3 h-3" />
                          </button>
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

                {/* Success Message with Retry Options */}
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
                        <div className="mt-2 flex items-center space-x-2">
                          <button
                            onClick={() => setShowParsingResults(true)}
                            className="flex items-center space-x-1 px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors"
                          >
                            <SparklesIcon className="w-3 h-3" />
                            <span>View Results</span>
                          </button>
                          <button
                            onClick={retryParsing}
                            className="flex items-center space-x-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
                          >
                            <ArrowPathIcon className="w-3 h-3" />
                            <span>Retry</span>
                          </button>
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
        )}
      </div>

      {/* Statistics */}
      {projectStructure && (
        <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-4">
              <span className="text-gray-600 dark:text-gray-400">
                {projectStructure.totalFiles} files, {projectStructure.totalDirectories} folders
              </span>
              <span className="text-green-600 dark:text-green-400">
                {projectStructure.markdownFiles} markdown files
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-gray-600 dark:text-gray-400">
                Selected: {selectedFiles.size} files, {selectedDirectories.size} folders
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto" style={{ maxHeight: '500px' }}>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="p-4 text-center">
            <div className="text-red-500 mb-2">Error: {error}</div>
            <button onClick={handleRefresh} className="text-blue-500 hover:text-blue-700 text-sm">
              Try again
            </button>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            {searchQuery ? 'No files found matching your search' : 'No files to display'}
          </div>
        ) : (
          <div className="p-2">
            {filteredItems.map((item) => (
              <TreeNode
                key={item.path}
                item={item}
                level={0}
                onFileSelect={onFileSelect}
                onDirectorySelect={onDirectorySelect}
                selectedFiles={selectedFiles}
                selectedDirectories={selectedDirectories}
                onFileToggle={handleFileToggle}
                onDirectoryToggle={handleDirectoryToggle}
              />
            ))}
          </div>
        )}
      </div>

      {/* Concept Parsing Results Modal */}
      {showParsingResults && activeParsingJob && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-6xl max-h-[90vh] w-full overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Concept Parsing Results
              </h2>
              <button
                onClick={() => setShowParsingResults(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
              >
                <XMarkIcon className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="overflow-auto" style={{ maxHeight: 'calc(90vh - 80px)' }}>
              <ConceptParsingResults
                job={activeParsingJob}
                onClose={() => setShowParsingResults(false)}
                onExport={handleExportResults}
                onConceptSelect={handleConceptSelect}
                onIngest={async (result, plan) => {
                  if (conceptParsingService) {
                    return await conceptParsingService.ingestParsedResult(result, plan);
                  }
                  throw new Error('Concept parsing service is not available');
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const buildTreeStructure = (
  items: DirectoryScanResult[],
  rootPath: string,
  currentDepth: number,
): DirectoryScanResult[] => {
  const itemMap = new Map();
  const rootItems: DirectoryScanResult[] = [];

  // Create map of all items
  items.forEach((item) => {
    const relativePath = item.path.replace(rootPath, '').replace(/^[\/\\]/, '');
    const pathParts = relativePath.split(/[\/\\]/);

    const treeItem: DirectoryScanResult = {
      ...item,
      depth: currentDepth + pathParts.length - 1,
      children: [],
    };

    itemMap.set(item.path, treeItem);
  });

  // Build tree hierarchy
  items.forEach((item) => {
    const treeItem = itemMap.get(item.path);
    const parentPath = item.path.substring(
      0,
      item.path.lastIndexOf(/[\/\\]/.exec(item.path)?.[0] || ''),
    );

    if (parentPath === rootPath || !itemMap.has(parentPath)) {
      rootItems.push(treeItem);
    } else {
      const parent = itemMap.get(parentPath);
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(treeItem);
      }
    }
  });

  return rootItems.sort((a, b) => {
    // Directories first, then files
    if (a.isDirectory !== b.isDirectory) {
      return a.isDirectory ? -1 : 1;
    }
    // Then alphabetically
    return a.name.localeCompare(b.name);
  });
};

const flattenTree = (items: DirectoryScanResult[]): DirectoryScanResult[] => {
  let result: DirectoryScanResult[] = [];

  items.forEach((item) => {
    result.push(item);
    if (item.children) {
      result = result.concat(flattenTree(item.children));
    }
  });

  return result;
};

export default LocalProjectExplorer;
