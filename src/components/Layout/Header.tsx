import React, { useState, useRef, useEffect } from 'react';
import {
  Bars3Icon,
  Cog6ToothIcon,
  QuestionMarkCircleIcon,
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useAppStore } from '@/stores/useAppStore';
import { useChatStore } from '@/hooks/useChatStore';

export const Header: React.FC = () => {
  const {
    sidebar_open,
    theme,
    setSidebarOpen,
    setSettingsPanelOpen,
    setTheme,
  } = useAppStore();
  const chatStore = useChatStore();

  // State for inline editing
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitle, setEditingTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebar_open);
  };

  const toggleTheme = () => {
    const themes: Array<'light' | 'dark' | 'auto'> = ['light', 'dark', 'auto'];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  const getThemeIcon = () => {
    switch (theme) {
      case 'light':
        return <SunIcon className="w-5 h-5" />;
      case 'dark':
        return <MoonIcon className="w-5 h-5" />;
      case 'auto':
        return <ComputerDesktopIcon className="w-5 h-5" />;
      default:
        return <SunIcon className="w-5 h-5" />;
    }
  };

  const getThemeLabel = () => {
    switch (theme) {
      case 'light':
        return 'Light';
      case 'dark':
        return 'Dark';
      case 'auto':
        return 'Auto';
      default:
        return 'Light';
    }
  };

  // Get current session state and updateCurrentSessionTitle function on every render to ensure reactivity
  const { currentSession, updateCurrentSessionTitle } = chatStore();

  // Focus input when editing starts
  useEffect(() => {
    if (isEditingTitle && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingTitle]);

  // Handle start editing title
  const handleStartEditingTitle = () => {
    if (currentSession) {
      setEditingTitle(currentSession.metadata.title || currentSession.title);
      setIsEditingTitle(true);
    }
  };

  // Handle save title
  const handleSaveTitle = async () => {
    if (editingTitle.trim() && editingTitle.trim() !== (currentSession?.metadata.title || currentSession?.title)) {
      try {
        await updateCurrentSessionTitle(editingTitle.trim());
      } catch (error) {
        console.error('Failed to update session title:', error);
      }
    }
    setIsEditingTitle(false);
    setEditingTitle('');
  };

  // Handle cancel editing
  const handleCancelEditing = () => {
    setIsEditingTitle(false);
    setEditingTitle('');
  };

  // Handle key presses in input
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveTitle();
    } else if (e.key === 'Escape') {
      handleCancelEditing();
    }
  };

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
      <div className="flex items-center justify-between">
        {/* Left side - Menu toggle and session title */}
        <div className="flex items-center space-x-4">
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Toggle sidebar"
          >
            <Bars3Icon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>

          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Learning Catalyst
            </h1>
            {currentSession && (
              <div className="flex items-center gap-2 group">
                {isEditingTitle ? (
                  <div className="flex items-center gap-1">
                    <input
                      ref={inputRef}
                      type="text"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onBlur={handleSaveTitle}
                      className="text-sm bg-white dark:bg-gray-700 border border-blue-500 dark:border-blue-400 rounded px-2 py-1 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 max-w-xs"
                      placeholder="Session title"
                    />
                    <button
                      onClick={handleSaveTitle}
                      className="p-1 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 transition-colors"
                      title="Save title"
                    >
                      <CheckIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleCancelEditing}
                      className="p-1 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                      title="Cancel editing"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-xs cursor-pointer hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                       onClick={handleStartEditingTitle}
                       title="Click to edit title">
                      {currentSession.metadata.title || currentSession.title}
                    </p>
                    <button
                      onClick={handleStartEditingTitle}
                      className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity transition-colors"
                      title="Edit title"
                    >
                      <PencilIcon className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center space-x-2">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title={`Theme: ${getThemeLabel()}`}
          >
            {getThemeIcon()}
          </button>

          {/* Settings */}
          <button
            onClick={() => setSettingsPanelOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Settings"
          >
            <Cog6ToothIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>

          {/* Help */}
          <button
            onClick={() => {
              // TODO: Implement help dialog
              console.log('Help clicked');
            }}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Help"
          >
            <QuestionMarkCircleIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      </div>
    </header>
  );
};