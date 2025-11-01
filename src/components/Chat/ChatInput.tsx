import React, { useState, useRef, useEffect } from 'react';
import {
  PaperAirplaneIcon,
  PaperClipIcon,
  StopIcon,
  SparklesIcon,
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
      chatToasts.sending();
      await sendMessage(message, {
        provider: selectedProvider,
        model: selectedModel,
        temperature: config?.ai?.temperature,
        max_tokens: config?.ai?.max_tokens,
        stream: config?.ai?.streaming,
        enable_thinking: config?.ai?.enable_thinking,
      });
      chatToasts.sent();
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
      settingsToasts.saved();
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
        utilityToasts.success(`File "${fileName}" attached successfully`);
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
      className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4"
      role="region"
      aria-label="Chat input area"
    >
      {/* Provider/Model Info */}
      <div className="max-w-4xl mx-auto mb-3" role="status" aria-live="polite">
        <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
          <span className="flex items-center space-x-1">
            <span>Provider:</span>
            <span className="font-medium text-gray-900 dark:text-gray-100" aria-label={`Current AI provider: ${currentProviderName}`}>
              {currentProviderName}
            </span>
          </span>
          <span className="flex items-center space-x-1">
            <span>Model:</span>
            <span className="font-medium text-gray-900 dark:text-gray-100" aria-label={`Current AI model: ${currentModelName}`}>
              {currentModelName}
            </span>
          </span>
          <button
            onClick={toggleDeepThinking}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-all duration-200 ${
              config?.ai?.enable_thinking
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
            title={config?.ai?.enable_thinking ? 'Disable deep thinking mode (Ctrl+T)' : 'Enable deep thinking mode (Ctrl+T)'}
            aria-pressed={config?.ai?.enable_thinking}
            aria-describedby="deep-thinking-status"
          >
            <SparklesIcon className={`w-4 h-4 ${config?.ai?.enable_thinking ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`} />
            <span className="text-sm font-medium">
              Deep Thinking
            </span>
            <div
              id="deep-thinking-status"
              className={`w-2 h-2 rounded-full transition-colors ${
                config?.ai?.enable_thinking
                  ? 'bg-blue-600 dark:bg-blue-400'
                  : 'bg-gray-400 dark:bg-gray-500'
              }`}
              aria-hidden="true"
            />
          </button>
        </div>
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto" noValidate>
        <fieldset className="flex items-end space-x-3" disabled={isStreaming || isLoading}>
          <legend className="sr-only">Message input form</legend>

          {/* File attachment button */}
          <button
            type="button"
            onClick={handleFileSelect}
            className="p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
            title="Attach file"
            aria-label="Attach file to message"
          >
            <PaperClipIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>

          {/* Text input */}
          <div className="flex-1 relative">
            <label htmlFor="chat-input" className="sr-only">
              Type your message
            </label>
            <textarea
              id="chat-input"
              ref={textareaRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isStreaming
                  ? 'AI is responding...'
                  : 'Type your message here... (Enter to send, Shift+Enter for new line)'
              }
              disabled={isStreaming || isLoading}
              aria-label="Type your message here"
              aria-describedby="input-help"
              aria-multiline="true"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              rows={1}
              style={{ minHeight: '48px', maxHeight: '200px' }}
            />

            {/* Character count for long messages */}
            {inputText.length > 100 && (
              <div
                className="absolute bottom-2 right-2 text-xs text-gray-400"
                aria-live="polite"
                aria-label={`Character count: ${inputText.length}`}
              >
                {inputText.length}
              </div>
            )}
          </div>

          {/* Send/Stop button */}
          <button
            type={isStreaming ? 'button' : 'submit'}
            onClick={isStreaming ? stopStreaming : undefined}
            className={`px-4 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
              isStreaming
                ? 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500'
                : 'bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed focus:ring-blue-500'
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

        {/* Input tips */}
        <div
          id="input-help"
          className="mt-3 text-xs text-gray-500 dark:text-gray-400 flex flex-wrap items-center gap-2"
          role="note"
        >
          <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">Enter</kbd>
          <span>to send</span>
          <span>•</span>
          <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">Shift+Enter</kbd>
          <span>for new line</span>
          <span>•</span>
          <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">Ctrl+T</kbd>
          <span>toggle thinking</span>
          <span>•</span>
          <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">Esc</kbd>
          <span>clear input</span>
        </div>
      </form>
    </div>
  );
};