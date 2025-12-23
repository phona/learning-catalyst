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
} from '@heroicons/react/24/outline';
import type { DirectoryScanResult, ProjectStructure, DirectoryFilterConfig } from '@/shared/types/filesystem';
import { useFileService } from '@/renderer/services/services-provider';

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

interface FileTreeProps {
  onFileSelect?: (filePath: string) => void;
  onDirectorySelect?: (dirPath: string) => void;
  onFileToggle?: (filePath: string) => void;
  onDirectoryToggle?: (dirPath: string) => void;
  selectedFiles?: Set<string>;
  selectedDirectories?: Set<string>;
  className?: string;
  initialPath?: string;
  maxDepth?: number;
  onMaxDepthChange?: (depth: number) => void;
}

export const FileTree: React.FC<FileTreeProps> = ({
  onFileSelect,
  onDirectorySelect,
  onFileToggle,
  onDirectoryToggle,
  selectedFiles = new Set(),
  selectedDirectories = new Set(),
  className = '',
  initialPath,
  maxDepth = 3,
  onMaxDepthChange,
}) => {
  const fileService = useFileService();
  const [projectStructure, setProjectStructure] = useState<ProjectStructure | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

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

  useEffect(() => {
    if (initialPath) {
      loadDirectory(initialPath);
    } else {
      loadDefaultDirectory();
    }
  }, [initialPath, loadDefaultDirectory]);

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

  const handleDepthChange = (newDepth: number) => {
    onMaxDepthChange?.(newDepth);
    if (currentPath) {
      loadDirectory(currentPath, newDepth);
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

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
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
                onFileToggle={onFileToggle || (() => {})}
                onDirectoryToggle={onDirectoryToggle || (() => {})}
              />
            ))}
          </div>
        )}
      </div>
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

export default FileTree;
