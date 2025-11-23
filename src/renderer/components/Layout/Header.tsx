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
  EyeIcon,
} from '@heroicons/react/24/outline';
import { useAppStore } from '@/renderer/stores/useAppStore';
import { useChatStore } from '@/renderer/hooks/useChatStore';

export const Header: React.FC = () => {
  const {
    sidebar_open,
    theme,
    focus_mode,
    setSidebarOpen,
    setSettingsPanelOpen,
    setTheme,
    toggleFocusMode,
  } = useAppStore();
  const { currentSession, updateCurrentSessionTitle } = useChatStore();

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

  // Focus input when editing starts
  useEffect(() => {
    if (isEditingTitle && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingTitle]);

  // Handle global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // F11 to toggle focus mode
      if (event.key === 'F11') {
        event.preventDefault();
        toggleFocusMode();
      }
      // Escape to exit focus mode
      if (event.key === 'Escape' && focus_mode) {
        toggleFocusMode();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [focus_mode, toggleFocusMode]);

  // Handle start editing title
  const handleStartEditingTitle = () => {
    if (currentSession) {
      setEditingTitle(currentSession.metadata.title || currentSession.title);
      setIsEditingTitle(true);
    }
  };

  // Handle save title
  const handleSaveTitle = async () => {
    if (
      editingTitle.trim() &&
      editingTitle.trim() !== (currentSession?.metadata.title || currentSession?.title)
    ) {
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
    <header className="relative bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 border-b border-gray-200/60 dark:border-gray-700/60 px-4 py-3 backdrop-blur-sm shadow-sm animate-fade-in">
      <div className="flex items-center justify-between">
        {/* Left side - Menu toggle and title */}
        <div className="flex items-center space-x-4">
          <button
            onClick={toggleSidebar}
            className="group relative p-2.5 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 hover:from-primary-50 hover:to-primary-100 dark:hover:from-primary-900/20 dark:hover:to-primary-800/20 transition-all duration-300 transform hover:scale-105 hover:shadow-md"
            title="Toggle sidebar"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary-500 to-accent-purple-500 rounded-xl opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
            <Bars3Icon className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-primary-600 dark:group-hover:text-primary-400 relative z-10 transition-colors duration-200" />
          </button>

          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-gradient-to-br from-primary-500 to-accent-emerald-500 rounded-full animate-pulse-soft shadow-lg shadow-primary-500/30"></div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent truncate animate-fade-in">
                Learning Catalyst
              </h1>
            </div>
            {currentSession && !isEditingTitle && (
              <div className="group flex items-center space-x-2 mt-1">
                <div className="w-1.5 h-1.5 bg-gradient-to-br from-emerald-500 to-accent-emerald-500 rounded-full opacity-60 group-hover:opacity-100 transition-opacity duration-200"></div>
                <p
                  className="text-xs text-gray-500 dark:text-gray-400 truncate cursor-pointer hover:text-primary-600 dark:hover:text-primary-400 transition-all duration-200 max-w-48 group-hover:max-w-56 hover:font-medium animate-fade-in-up"
                  onClick={handleStartEditingTitle}
                  title="Click to edit title"
                >
                  {currentSession.metadata.title || currentSession.title}
                </p>
                <PencilIcon className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-all duration-200 transform group-hover:scale-110" />
              </div>
            )}
            {isEditingTitle && (
              <div className="flex items-center gap-2 mt-1 animate-fade-in-up">
                <div className="relative flex-1">
                  <input
                    ref={inputRef}
                    type="text"
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={handleSaveTitle}
                    className="w-full text-xs bg-gradient-to-br from-white to-gray-50 dark:from-gray-700 dark:to-gray-800 border border-primary-300 dark:border-primary-600 rounded-lg px-3 py-2 pr-10 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-primary-500 dark:focus:border-primary-400 shadow-sm transition-all duration-200 max-w-40"
                    placeholder="Session title"
                  />
                  <div className="absolute inset-0 bg-gradient-to-br from-primary-500 to-accent-purple-500 rounded-lg opacity-5 pointer-events-none"></div>
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={handleSaveTitle}
                    className="group relative p-1.5 bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-lg transition-all duration-200 transform hover:scale-105 hover:shadow-lg hover:shadow-emerald-500/25"
                    title="Save title"
                  >
                    <CheckIcon className="w-3.5 h-3.5 relative z-10" />
                    <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 rounded-lg transition-opacity duration-200"></div>
                  </button>
                  <button
                    onClick={handleCancelEditing}
                    className="group relative p-1.5 bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg transition-all duration-200 transform hover:scale-105 hover:shadow-lg hover:shadow-red-500/25"
                    title="Cancel editing"
                  >
                    <XMarkIcon className="w-3.5 h-3.5 relative z-10" />
                    <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 rounded-lg transition-opacity duration-200"></div>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center space-x-2">
          {/* Focus mode toggle */}
          <button
            onClick={toggleFocusMode}
            className={`group relative p-2.5 rounded-xl transition-all duration-300 transform hover:scale-105 ${
              focus_mode
                ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/25 animate-pulse-soft'
                : 'bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 hover:from-primary-50 hover:to-primary-100 dark:hover:from-primary-900/20 dark:hover:to-primary-800/20 text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:shadow-md'
            }`}
            title={`${focus_mode ? 'Exit' : 'Enter'} focus mode (F11)`}
          >
            {!focus_mode && (
              <div className="absolute inset-0 bg-gradient-to-br from-primary-500 to-accent-purple-500 rounded-xl opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
            )}
            <EyeIcon
              className={`w-5 h-5 relative z-10 transition-all duration-200 ${focus_mode ? 'text-white' : ''}`}
            />
            {focus_mode && (
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
            )}
          </button>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="group relative p-2.5 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 hover:from-amber-50 hover:to-amber-100 dark:hover:from-amber-900/20 dark:hover:to-amber-800/20 transition-all duration-300 transform hover:scale-105 hover:shadow-md"
            title={`Theme: ${getThemeLabel()}`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
            <div className="relative z-10 transition-all duration-200 group-hover:rotate-12 group-hover:scale-110">
              {getThemeIcon()}
            </div>
          </button>

          {/* Settings */}
          <button
            onClick={() => setSettingsPanelOpen(true)}
            className="group relative p-2.5 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 hover:from-purple-50 hover:to-purple-100 dark:hover:from-purple-900/20 dark:hover:to-purple-800/20 transition-all duration-300 transform hover:scale-105 hover:shadow-md"
            title="Settings"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
            <Cog6ToothIcon className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 relative z-10 transition-all duration-200 group-hover:rotate-90" />
          </button>

          {/* Help */}
          <button
            className="group relative p-2.5 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 hover:from-blue-50 hover:to-blue-100 dark:hover:from-blue-900/20 dark:hover:to-blue-800/20 transition-all duration-300 transform hover:scale-105 hover:shadow-md"
            title="Help & Support"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
            <QuestionMarkCircleIcon className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 relative z-10 transition-all duration-200 group-hover:scale-110" />
          </button>
        </div>
      </div>

      {/* Animated gradient line at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-500 via-accent-purple-500 to-accent-emerald-500 opacity-20 animate-gradient-shift bg-[length:200%_200%]"></div>
    </header>
  );
};
