/**
 * File System Types
 *
 * Types for file system operations and directory scanning
 */

export interface FileSystemItem {
  name: string;
  path: string;
  isDirectory: boolean;
  isFile: boolean;
  size: number;
  extension: string;
  modifiedTime: Date;
  createdTime: Date;
  accessedTime: Date;
  isMarkdown?: boolean;
}

export interface DirectoryScanOptions {
  recursive?: boolean;
  maxDepth?: number;
  includeFiles?: boolean;
  includeDirectories?: boolean;
  filterExtensions?: string[];
}

export interface DirectoryFilterConfig {
  showHiddenFiles?: boolean;
  excludePatterns?: string[];
}

export interface DirectoryScanResult extends FileSystemItem {
  children?: DirectoryScanResult[];
  depth: number;
}

export interface FileInfo {
  name: string;
  path: string;
  isDirectory: boolean;
  isFile: boolean;
  size: number;
  extension: string;
  modifiedTime: Date;
  createdTime: Date;
  accessedTime: Date;
}

export interface ProjectStructure {
  rootPath: string;
  items: DirectoryScanResult[];
  totalFiles: number;
  totalDirectories: number;
  markdownFiles: number;
  scanDepth: number;
}