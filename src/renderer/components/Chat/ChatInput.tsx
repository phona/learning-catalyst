/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import React, { useState, useRef, useEffect, memo } from 'react';
import {
  PaperAirplaneIcon,
  PaperClipIcon,
  StopIcon,
  SparklesIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';
import { useChat } from '@/renderer/hooks/useChat';
import { useConfigStore } from '@/renderer/stores/useConfigStore';
import { useFileService } from '@/renderer/services/services-provider';
import { chatToasts, settingsToasts, utilityToasts } from '@/renderer/utils/toast';

const ChatInputComponent: React.FC = () => {
  const [inputText, setInputText] = useState<string>('');
  const [showAdvancedOptions, setShowAdvancedOptions] = useState<boolean>(false);

  const {
    isLoading,
    isStreaming,
    sendMessage,
    sendMessageStream,
    stopStreaming,
    error,
    setError,
  } = useChat();

  const { config, updateConfig } = useConfigStore();
  const fileService = useFileService();

  // Use config values for provider/model since new service architecture doesn't expose these directly
  const chatModelConfig = config?.ai?.modelTypes?.chat;
  const selectedProvider = chatModelConfig?.defaultProvider ?? 'openai';
  const selectedModel = chatModelConfig?.defaultModel ?? 'gpt-3.5-turbo';
  const streamingEnabled = chatModelConfig?.capabilities?.streaming ?? true;
  console.log('[ChatInput] Chat model config', chatModelConfig);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [inputText]);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    if (!inputText.trim() || isStreaming || isLoading) {
      return;
    }

    const message = inputText.trim();
    setInputText('');
    setError(null);

    try {
      console.log('[ChatInput] submit', { streamingEnabled, len: message.length });
      if (streamingEnabled) {
        await sendMessageStream(message);
      } else {
        await sendMessage(message);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      // Restore input text on error
      setInputText(message);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);
      chatToasts.error(errorMessage);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent): void => {
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
    } else if (e.ctrlKey && e.key === '/') {
      e.preventDefault();
      // Show keyboard shortcuts (placeholder)
    }
  };

  const toggleDeepThinking = async (): Promise<void> => {
    if (!config) return;

    const chatModel = config.ai.modelTypes?.chat;
    if (!chatModel?.capabilities) {
      return;
    }

    const newThinkingState = !chatModel.capabilities.thinking;

    try {
      await updateConfig({
        ai: {
          ...config.ai,
          modelTypes: {
            ...(config.ai.modelTypes ?? {}),
            chat: chatModel
              ? {
                ...chatModel,
                capabilities: {
                  ...chatModel.capabilities,
                  thinking: newThinkingState,
                },
              }
              : undefined,
          },
        },
      });
      // Button provides visual feedback - no toast needed
    } catch (error) {
      console.error('Failed to update thinking config:', error);
      settingsToasts.providerError(
        'Settings',
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  };

  const handleFileSelect = async (): Promise<void> => {
    try {
      const result = await fileService.showOpenDialog({
        properties: ['openFile'],
        filters: [
          { name: 'Text Files', extensions: ['txt', 'md', 'js', 'ts', 'py', 'java', 'cpp', 'c'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      });

      if (!result.success || !result.data) {
        utilityToasts.error(result.error?.message ?? 'Failed to open file dialog');
        return;
      }

      if (!result.data.canceled && result.data.filePaths.length > 0) {
        const filePath = result.data.filePaths[0];
        if (!filePath) {
          utilityToasts.error('No file selected');
          return;
        }

        const fileResult = await fileService.readFile(filePath);
        if (!fileResult.success || !fileResult.data) {
          utilityToasts.error(fileResult.error?.message || 'Failed to read file');
          return;
        }

        const fileData = fileResult.data;
        setInputText(
          (prev) => prev + `\n\n📎 Attached file: ${fileData.fileName}\n\n${fileData.content}`,
        );
      }
    } catch (error) {
      console.error('Failed to select file:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to select file';
      utilityToasts.error(errorMsg);
    }
  };

  const currentProviderName = selectedProvider;
  const currentModelName = selectedModel;

  const isActionButtonDisabled = !isStreaming && (!inputText.trim() || isLoading);
  console.log('[ChatInput] state', { isLoading, isStreaming, inputLen: inputText.length, disabled: isActionButtonDisabled });

  return (
    <div
      className="relative border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
      role="region"
      aria-label="Chat input area"
    >
      {/* Main Input */}
      <div className="p-6">
        <form
          onSubmit={handleSubmit}
          className="max-w-4xl mx-auto"
          noValidate
          data-testid="chat-input-form"
        >
          <fieldset className="flex items-end space-x-4">
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
                  placeholder={isStreaming ? 'AI is responding...' : 'Type your message here...'}
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

              {/* Error display */}
              {error && (
                <div className="absolute top-3 right-3 px-3 py-1.5 bg-red-500 text-white rounded-full text-xs font-medium max-w-xs truncate">
                  <span title={error}>{error}</span>
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

            {/* Send / Stop button */}
            {isStreaming ? (
              <button
                type="button"
                onClick={() => {
                  console.log('[ChatInput] stop clicked');
                  void stopStreaming();
                }}
                className="px-6 py-4 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2.5 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 bg-red-600 hover:bg-red-700 text-white focus:ring-red-500"
                aria-label="Stop generating response"
              >
                <StopIcon className="w-5 h-5" />
                <span>Stop</span>
              </button>
            ) : (
              <button
                type="submit"
                className={`px-6 py-4 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2.5 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
                  !isActionButtonDisabled
                    ? 'bg-primary-500 hover:bg-primary-600 text-white focus:ring-primary-500'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                }`}
                disabled={isActionButtonDisabled}
                aria-label="Send message"
              >
                <PaperAirplaneIcon className="w-5 h-5" />
                <span>Send</span>
              </button>
            )}
          </fieldset>

          {/* Enhanced keyboard shortcuts */}
          <div
            id="input-help"
            className="mt-4 flex items-center justify-center gap-4 text-xs text-gray-500 dark:text-gray-400"
            role="note"
          >
            <div className="flex items-center space-x-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <kbd className="px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs font-mono shadow-sm">
                Enter
              </kbd>
              <span>send</span>
            </div>
            <div className="flex items-center space-x-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <kbd className="px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs font-mono shadow-sm">
                Shift+Enter
              </kbd>
              <span>new line</span>
            </div>
            <div className="flex items-center space-x-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <kbd className="px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs font-mono shadow-sm">
                Esc
              </kbd>
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
          <div
            className={`p-1 rounded-lg bg-gray-100 dark:bg-gray-800 ${showAdvancedOptions ? 'bg-primary-100 dark:bg-primary-900/30' : ''}`}
          >
            {showAdvancedOptions ? (
              <ChevronUpIcon className="w-4 h-4 text-primary-600 dark:text-primary-400" />
            ) : (
              <ChevronDownIcon className="w-4 h-4" />
            )}
          </div>
          <span className="font-medium">Advanced Options</span>
          <div
            className={`w-2 h-2 rounded-full ${showAdvancedOptions ? 'bg-primary-500' : 'bg-gray-400'}`}
          ></div>
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
            <div
              className="flex items-center justify-between text-sm p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
              role="status"
              aria-live="polite"
            >
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                  <span className="text-gray-600 dark:text-gray-400">Provider:</span>
                  <span
                    className="font-semibold text-gray-900 dark:text-gray-100 bg-primary-100 dark:bg-primary-900/30 px-2 py-1 rounded"
                    aria-label={`Current AI provider: ${currentProviderName}`}
                  >
                    {currentProviderName}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                  <span className="text-gray-600 dark:text-gray-400">Model:</span>
                  <span
                    className="font-semibold text-gray-900 dark:text-gray-100 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-1 rounded"
                    aria-label={`Current AI model: ${currentModelName}`}
                  >
                    {currentModelName}
                  </span>
                </div>
              </div>

              {/* Enhanced Deep Thinking Toggle */}
              <button
                onClick={toggleDeepThinking}
                className={`flex items-center space-x-3 px-5 py-2.5 rounded-lg transition-colors duration-200 ${
                  config?.ai?.modelTypes?.chat?.capabilities?.thinking
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-primary-100 dark:hover:bg-primary-900/20 hover:text-primary-600 dark:hover:text-primary-400'
                }`}
                title={
                  config?.ai?.modelTypes?.chat?.capabilities?.thinking
                    ? 'Disable deep thinking mode (Ctrl+T)'
                    : 'Enable deep thinking mode (Ctrl+T)'
                }
                aria-pressed={config?.ai?.modelTypes?.chat?.capabilities?.thinking}
                aria-describedby="deep-thinking-status"
              >
                <SparklesIcon
                  className={`w-4 h-4 ${config?.ai?.modelTypes?.chat?.capabilities?.thinking ? 'text-white' : ''}`}
                />
                <span className="text-sm font-semibold">Deep Thinking</span>
                <div
                  id="deep-thinking-status"
                  className={`w-2.5 h-2.5 rounded-full ${
                    config?.ai?.modelTypes?.chat?.capabilities?.thinking
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
              <span className="font-semibold text-amber-800 dark:text-amber-200 text-sm mb-2 block">
                Pro Tips:
              </span>
              <div className="flex items-center flex-wrap gap-3">
                <div className="flex items-center space-x-2 px-3 py-1.5 bg-white dark:bg-gray-800 rounded border border-amber-300 dark:border-amber-700">
                  <kbd className="px-2 py-1 bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700 rounded text-xs font-mono">
                    Ctrl+T
                  </kbd>
                  <span className="text-amber-700 dark:text-amber-300 text-xs">
                    toggle thinking
                  </span>
                </div>
                <div className="flex items-center space-x-2 px-3 py-1.5 bg-white dark:bg-gray-800 rounded border border-amber-300 dark:border-amber-700">
                  <kbd className="px-2 py-1 bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700 rounded text-xs font-mono">
                    Ctrl+K
                  </kbd>
                  <span className="text-amber-700 dark:text-amber-300 text-xs">
                    command palette
                  </span>
                </div>
                <div className="flex items-center space-x-2 px-3 py-1.5 bg-white dark:bg-gray-800 rounded border border-amber-300 dark:border-amber-700">
                  <kbd className="px-2 py-1 bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700 rounded text-xs font-mono">
                    Ctrl+/
                  </kbd>
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

export const ChatInput = memo(ChatInputComponent);

export default ChatInput;
