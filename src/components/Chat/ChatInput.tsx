import React, { useState, useRef, useEffect } from 'react';
import {
  PaperAirplaneIcon,
  PaperClipIcon,
  StopIcon,
  SparklesIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';
import { useChatStore } from '@/hooks/useChatStore';
import { useConfigStore } from '@/stores/useConfigStore';
import { chatToasts, settingsToasts, utilityToasts } from '@/utils/toast';

export const ChatInput: React.FC = () => {
  const chatStore = useChatStore();
  const {
    inputText,
    setInputText,
    isStreaming,
    isLoading,
    sendMessage,
    stopStreaming,
    selectedProvider,
    selectedModel,
  } = chatStore();

  const { config, updateConfig } = useConfigStore();

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  
  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [inputText]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inputText.trim() || isStreaming || isLoading) {
      return;
    }

    const message = inputText.trim();
    setInputText('');

    try {
      // Visual feedback is sufficient - no toast needed for sending
      await sendMessage(message, {
        provider: selectedProvider,
        model: selectedModel,
        temperature: config?.ai?.temperature,
        max_tokens: config?.ai?.max_tokens,
        stream: config?.ai?.streaming,
        enable_thinking: config?.ai?.enable_thinking,
      });
      // Visual feedback shows message in chat - no success toast needed
    } catch (error) {
      console.error('Failed to send message:', error);
      // Restore input text on error
      setInputText(message);
      chatToasts.error(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    } else if (e.ctrlKey && e.key === 't') {
      e.preventDefault();
      // Toggle deep thinking mode
      toggleDeepThinking();
    } else if (e.key === 'Escape') {
      // Clear input on escape
      e.preventDefault();
      setInputText('');
      textareaRef.current?.focus();
    } else if (e.ctrlKey && e.key === 'k') {
      e.preventDefault();
      // Open command palette (placeholder)
      console.log('Command palette not implemented');
    } else if (e.ctrlKey && e.key === '/') {
      e.preventDefault();
      // Show keyboard shortcuts (placeholder)
      console.log('Keyboard shortcuts not implemented');
    }
  };

  const toggleDeepThinking = async () => {
    if (!config) return;

    const newThinkingState = !config.ai.enable_thinking;

    try {
      await updateConfig({
        ai: {
          ...config.ai,
          enable_thinking: newThinkingState
        }
      });
      // Button provides visual feedback - no toast needed
    } catch (error) {
      console.error('Failed to update thinking config:', error);
      settingsToasts.providerError('Settings', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const handleFileSelect = async () => {
    try {
      const result = await window.electronAPI.showOpenDialog({
        properties: ['openFile'],
        filters: [
          { name: 'Text Files', extensions: ['txt', 'md', 'js', 'ts', 'py', 'java', 'cpp', 'c'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      });

      if (!result.canceled && result.filePaths.length > 0) {
        const filePath = result.filePaths[0];
        const content = await window.electronAPI.readFile(filePath);
        const fileName = filePath.split(/[/\\]/).pop();

        setInputText(prev => prev + `\n\n📎 Attached file: ${fileName}\n\n${content}`);
        // Visual feedback is sufficient - no toast needed for file attachment
      }
    } catch (error) {
      console.error('Failed to read file:', error);
      utilityToasts.error(error instanceof Error ? error.message : 'Failed to read file');
    }
  };

  
  const currentProviderName = config?.ai?.providers[selectedProvider]?.name || selectedProvider;
  const currentModelName = selectedModel;

  return (
    <div
      className="relative border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
      role="region"
      aria-label="Chat input area"
    >

      {/* Main Input */}
      <div className="p-6">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto" noValidate>
          <fieldset className="flex items-end space-x-4" disabled={isStreaming || isLoading}>
            <legend className="sr-only">Message input form</legend>

            {/* Text input */}
            <div className="flex-1 relative group">
              <label htmlFor="chat-input" className="sr-only">
                Type your message
              </label>
              <div className="relative">
                <textarea
                  id="chat-input"
                  ref={textareaRef}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    isStreaming
                      ? 'AI is responding...'
                      : 'Type your message here...'
                  }
                  disabled={isStreaming || isLoading}
                  aria-label="Type your message here"
                  aria-describedby="input-help"
                  aria-multiline="true"
                  className="w-full px-5 py-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  rows={1}
                  style={{ minHeight: '56px', maxHeight: '200px' }}
                />
              </div>

              {/* Character count for long messages */}
              {inputText.length > 100 && (
                <div
                  className="absolute bottom-3 right-3 px-2 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-md text-xs font-medium"
                  aria-live="polite"
                  aria-label={`Character count: ${inputText.length}`}
                >
                  {inputText.length}
                </div>
              )}

              {/* Input state indicator */}
              {isStreaming && (
                <div className="absolute top-3 right-3 flex items-center space-x-2 px-3 py-1.5 bg-emerald-500 text-white rounded-full text-xs font-medium">
                  <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                  <span>AI is thinking...</span>
                </div>
              )}
            </div>

            {/* Send/Stop button */}
            <button
              type={isStreaming ? 'button' : 'submit'}
              onClick={isStreaming ? stopStreaming : undefined}
              className={`px-6 py-4 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2.5 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
                isStreaming
                  ? 'bg-red-500 hover:bg-red-600 text-white focus:ring-red-500'
                  : inputText.trim()
                  ? 'bg-primary-500 hover:bg-primary-600 text-white focus:ring-primary-500'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              }`}
              disabled={!inputText.trim() || (!isStreaming && isLoading)}
              aria-label={isStreaming ? 'Stop generating response' : 'Send message'}
            >
              {isStreaming ? (
                <>
                  <StopIcon className="w-5 h-5" />
                  <span>Stop</span>
                </>
              ) : (
                <>
                  <PaperAirplaneIcon className="w-5 h-5" />
                  <span>Send</span>
                </>
              )}
            </button>
          </fieldset>

          {/* Enhanced keyboard shortcuts */}
          <div
            id="input-help"
            className="mt-4 flex items-center justify-center gap-4 text-xs text-gray-500 dark:text-gray-400"
            role="note"
          >
            <div className="flex items-center space-x-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <kbd className="px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs font-mono shadow-sm">Enter</kbd>
              <span>send</span>
            </div>
            <div className="flex items-center space-x-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <kbd className="px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs font-mono shadow-sm">Shift+Enter</kbd>
              <span>new line</span>
            </div>
            <div className="flex items-center space-x-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <kbd className="px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs font-mono shadow-sm">Esc</kbd>
              <span>clear</span>
            </div>
          </div>
        </form>
      </div>

      {/* Advanced Options Toggle */}
      <div className="px-6 pb-4">
        <button
          type="button"
          onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
          className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors duration-200"
          aria-expanded={showAdvancedOptions}
          aria-controls="advanced-options"
        >
          <div className={`p-1 rounded-lg bg-gray-100 dark:bg-gray-800 ${showAdvancedOptions ? 'bg-primary-100 dark:bg-primary-900/30' : ''}`}>
            {showAdvancedOptions ? (
              <ChevronUpIcon className="w-4 h-4 text-primary-600 dark:text-primary-400" />
            ) : (
              <ChevronDownIcon className="w-4 h-4" />
            )}
          </div>
          <span className="font-medium">Advanced Options</span>
          <div className={`w-2 h-2 rounded-full ${showAdvancedOptions ? 'bg-primary-500' : 'bg-gray-400'}`}></div>
        </button>
      </div>

      {/* Enhanced Advanced Options Panel */}
      {showAdvancedOptions && (
        <div
          id="advanced-options"
          className="border-t border-gray-200 dark:border-gray-700 px-6 py-5 bg-gray-50 dark:bg-gray-900"
        >
          <div className="max-w-4xl mx-auto space-y-5">
            {/* Provider/Model Info */}
            <div className="flex items-center justify-between text-sm p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700" role="status" aria-live="polite">
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                  <span className="text-gray-600 dark:text-gray-400">Provider:</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100 bg-primary-100 dark:bg-primary-900/30 px-2 py-1 rounded" aria-label={`Current AI provider: ${currentProviderName}`}>
                    {currentProviderName}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                  <span className="text-gray-600 dark:text-gray-400">Model:</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-1 rounded" aria-label={`Current AI model: ${currentModelName}`}>
                    {currentModelName}
                  </span>
                </div>
              </div>

              {/* Enhanced Deep Thinking Toggle */}
              <button
                onClick={toggleDeepThinking}
                className={`flex items-center space-x-3 px-5 py-2.5 rounded-lg transition-colors duration-200 ${
                  config?.ai?.enable_thinking
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-primary-100 dark:hover:bg-primary-900/20 hover:text-primary-600 dark:hover:text-primary-400'
                }`}
                title={config?.ai?.enable_thinking ? 'Disable deep thinking mode (Ctrl+T)' : 'Enable deep thinking mode (Ctrl+T)'}
                aria-pressed={config?.ai?.enable_thinking}
                aria-describedby="deep-thinking-status"
              >
                <SparklesIcon className={`w-4 h-4 ${config?.ai?.enable_thinking ? 'text-white' : ''}`} />
                <span className="text-sm font-semibold">
                  Deep Thinking
                </span>
                <div
                  id="deep-thinking-status"
                  className={`w-2.5 h-2.5 rounded-full ${
                    config?.ai?.enable_thinking
                      ? 'bg-white'
                      : 'bg-gray-400'
                  }`}
                  aria-hidden="true"
                />
              </button>
            </div>

            {/* Enhanced File attachment */}
            <div className="flex items-center space-x-4">
              <button
                type="button"
                onClick={handleFileSelect}
                className="flex items-center space-x-3 px-5 py-3 text-sm bg-gray-100 dark:bg-gray-800 hover:bg-blue-100 dark:hover:bg-blue-900/20 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors duration-200"
                title="Attach file to message"
                aria-label="Attach file to message"
              >
                <PaperClipIcon className="w-4 h-4" />
                <span className="font-medium">Attach File</span>
              </button>
            </div>

            {/* Enhanced Additional keyboard shortcuts */}
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <span className="font-semibold text-amber-800 dark:text-amber-200 text-sm mb-2 block">Pro Tips:</span>
              <div className="flex items-center flex-wrap gap-3">
                <div className="flex items-center space-x-2 px-3 py-1.5 bg-white dark:bg-gray-800 rounded border border-amber-300 dark:border-amber-700">
                  <kbd className="px-2 py-1 bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700 rounded text-xs font-mono">Ctrl+T</kbd>
                  <span className="text-amber-700 dark:text-amber-300 text-xs">toggle thinking</span>
                </div>
                <div className="flex items-center space-x-2 px-3 py-1.5 bg-white dark:bg-gray-800 rounded border border-amber-300 dark:border-amber-700">
                  <kbd className="px-2 py-1 bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700 rounded text-xs font-mono">Ctrl+K</kbd>
                  <span className="text-amber-700 dark:text-amber-300 text-xs">command palette</span>
                </div>
                <div className="flex items-center space-x-2 px-3 py-1.5 bg-white dark:bg-gray-800 rounded border border-amber-300 dark:border-amber-700">
                  <kbd className="px-2 py-1 bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700 rounded text-xs font-mono">Ctrl+/</kbd>
                  <span className="text-amber-700 dark:text-amber-300 text-xs">keyboard help</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};