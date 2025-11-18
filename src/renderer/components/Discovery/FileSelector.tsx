import React, { useState } from 'react';
import {
  DocumentIcon,
  FolderIcon,
  CheckIcon,
  XMarkIcon,
  FolderOpenIcon,
  SparklesIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import type { FileSystemItem, DirectoryFilterConfig } from '@/shared/types/filesystem';

interface FileSelectorProps {
  selectedFiles: string[];
  selectedDirectories: string[];
  availableFiles: FileSystemItem[];
  onFileSelect: (filePath: string, selected: boolean) => void;
  onDirectorySelect: (dirPath: string, selected: boolean) => void;
  onClearSelection: () => void;
  className?: string;
}

interface SelectionItemProps {
  item: FileSystemItem;
  isSelected: boolean;
  isPartial: boolean;
  onSelect: (selected: boolean) => void;
}

const SelectionItem: React.FC<SelectionItemProps> = ({
  item,
  isSelected,
  isPartial,
  onSelect
}) => {
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getIcon = () => {
    if (item.isDirectory) {
      return <FolderIcon className="w-5 h-5 text-blue-500" />;
    }

    if (item.isMarkdown) {
      return <DocumentTextIcon className="w-5 h-5 text-green-500" />;
    }

    return <DocumentIcon className="w-5 h-5 text-gray-400" />;
  };

  const getStatusIcon = () => {
    if (isPartial) {
      return (
        <div className="w-5 h-5 rounded border-2 border-blue-500 bg-blue-100 flex items-center justify-center">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
        </div>
      );
    }

    if (isSelected) {
      return (
        <div className="w-5 h-5 rounded bg-blue-500 flex items-center justify-center">
          <CheckIcon className="w-3 h-3 text-white" />
        </div>
      );
    }

    return (
      <div className="w-5 h-5 rounded border-2 border-gray-300 dark:border-gray-600"></div>
    );
  };

  return (
    <div
      className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
        isSelected
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
      }`}
      onClick={() => onSelect(!isSelected)}
    >
      <div className="mr-3">
        {getStatusIcon()}
      </div>

      <div className="mr-3">
        {getIcon()}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {item.name}
          </h4>
          <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
            {!item.isDirectory && (
              <span>{formatFileSize(item.size)}</span>
            )}
            {item.isMarkdown && (
              <span className="px-1.5 py-0.5 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 rounded">
                MD
              </span>
            )}
          </div>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
          {item.path}
        </p>
      </div>
    </div>
  );
};

export const FileSelector: React.FC<FileSelectorProps> = ({
  selectedFiles,
  selectedDirectories,
  availableFiles,
  onFileSelect,
  onDirectorySelect,
  onClearSelection,
  className = ''
}) => {
  const [filter, setFilter] = useState<'all' | 'markdown' | 'directories'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'size' | 'modified'>('name');
  const [searchQuery, setSearchQuery] = useState('');

  
  // Filter available items based on current filter
  const filteredItems = availableFiles.filter(item => {

    // Search filter
    if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Type filter
    switch (filter) {
    case 'markdown':
      return item.isMarkdown;
    case 'directories':
      return item.isDirectory;
    default:
      return true;
    }
  }).sort((a, b) => {
    // Sort logic
    switch (sortBy) {
    case 'name':
      return a.name.localeCompare(b.name);
    case 'size':
      return b.size - a.size;
    case 'modified':
      return b.modifiedTime.getTime() - a.modifiedTime.getTime();
    default:
      return 0;
    }
  });

  // Group selected items by type
  const selectedDirectoriesList = availableFiles.filter(item =>
    selectedDirectories.includes(item.path) && item.isDirectory
  );

  const selectedFilesList = availableFiles.filter(item =>
    selectedFiles.includes(item.path) && item.isFile
  );

  const selectedMarkdownFiles = selectedFilesList.filter(item => item.isMarkdown);

  // Calculate statistics
  const totalSelectedSize = selectedFilesList.reduce((sum, file) => sum + file.size, 0);
  const totalMarkdownFiles = availableFiles.filter(item => item.isMarkdown).length;

  // Utility function
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleFileToggle = (filePath: string) => {
    const isSelected = selectedFiles.includes(filePath);
    onFileSelect(filePath, !isSelected);
  };

  const handleDirectoryToggle = (dirPath: string) => {
    const isSelected = selectedDirectories.includes(dirPath);
    onDirectorySelect(dirPath, !isSelected);
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center">
            <SparklesIcon className="w-5 h-5 mr-2 text-purple-500" />
            Select Files to Parse
          </h2>
          {(selectedFiles.length > 0 || selectedDirectories.length > 0) && (
            <button
              onClick={onClearSelection}
              className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 flex items-center"
            >
              <XMarkIcon className="w-4 h-4 mr-1" />
              Clear All
            </button>
          )}
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2">
            <div className="text-blue-600 dark:text-blue-400 font-medium">
              {selectedFiles.length}
            </div>
            <div className="text-blue-600 dark:text-blue-400 text-xs">Files Selected</div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2">
            <div className="text-green-600 dark:text-green-400 font-medium">
              {selectedMarkdownFiles.length}
            </div>
            <div className="text-green-600 dark:text-green-400 text-xs">Markdown Files</div>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-2">
            <div className="text-purple-600 dark:text-purple-400 font-medium">
              {selectedDirectories.length}
            </div>
            <div className="text-purple-600 dark:text-purple-400 text-xs">Directories</div>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-2">
            <div className="text-orange-600 dark:text-orange-400 font-medium">
              {formatFileSize(totalSelectedSize)}
            </div>
            <div className="text-orange-600 dark:text-orange-400 text-xs">Total Size</div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Filter */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          >
            <option value="all">All Files</option>
            <option value="markdown">Markdown Only</option>
            <option value="directories">Directories Only</option>
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          >
            <option value="name">Sort by Name</option>
            <option value="size">Sort by Size</option>
            <option value="modified">Sort by Modified</option>
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto" style={{ maxHeight: '400px' }}>
        {filteredItems.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <DocumentIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No files available</p>
            <p className="text-sm mt-1">Try browsing a different directory</p>
          </div>
        ) : (
          <div className="p-4 space-y-2">
            {filteredItems.map((item) => (
              <SelectionItem
                key={item.path}
                item={item}
                isSelected={
                  item.isDirectory
                    ? selectedDirectories.includes(item.path)
                    : selectedFiles.includes(item.path)
                }
                isPartial={false} // TODO: Implement partial selection for directories
                onSelect={(selected) => {
                  if (item.isDirectory) {
                    handleDirectoryToggle(item.path);
                  } else {
                    handleFileToggle(item.path);
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer Summary */}
      {(selectedFiles.length > 0 || selectedDirectories.length > 0) && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Ready to parse {selectedFiles.length} files from {selectedDirectories.length} directories
            {selectedMarkdownFiles.length > 0 && (
              <span className="text-green-600 dark:text-green-400 ml-1">
                ({selectedMarkdownFiles.length} markdown files)
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};