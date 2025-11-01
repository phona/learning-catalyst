import React, { useState, useRef, useEffect } from 'react';
import {
  PaperAirplaneIcon,
  PaperClipIcon,
  MicrophoneIcon,
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

  const [isRecording, setIsRecording] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  
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

  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      // TODO: Stop recording and process audio
    } else {
      setIsRecording(true);
      // TODO: Start recording
    }
  };

  const currentProviderName = config?.ai?.providers[selectedProvider]?.name || selectedProvider;
  const currentModelName = selectedModel;

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      {/* Provider/Model Info */}
      <div className="max-w-4xl mx-auto mb-3">
        <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
          <span className="flex items-center space-x-1">
            <span>Provider:</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {currentProviderName}
            </span>
          </span>
          <span className="flex items-center space-x-1">
            <span>Model:</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
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
          >
            <SparklesIcon className={`w-4 h-4 ${config?.ai?.enable_thinking ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`} />
            <span className="text-sm font-medium">
              Deep Thinking
            </span>
            <div className={`w-2 h-2 rounded-full transition-colors ${
              config?.ai?.enable_thinking
                ? 'bg-blue-600 dark:bg-blue-400'
                : 'bg-gray-400 dark:bg-gray-500'
            }`} />
          </button>
        </div>
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
        <div className="flex items-end space-x-3">
          {/* File attachment button */}
          <button
            type="button"
            onClick={handleFileSelect}
            className="p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Attach file"
          >
            <PaperClipIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>

          {/* Text input */}
          <div className="flex-1 relative">
            <textarea
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
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              rows={1}
              style={{ minHeight: '48px', maxHeight: '200px' }}
            />

            {/* Character count for long messages */}
            {inputText.length > 100 && (
              <div className="absolute bottom-2 right-2 text-xs text-gray-400">
                {inputText.length}
              </div>
            )}
          </div>

          {/* Voice input button */}
          <button
            type="button"
            onClick={toggleRecording}
            className={`p-3 rounded-lg transition-colors ${
              isRecording
                ? 'bg-red-100 hover:bg-red-200 text-red-600'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400'
            }`}
            title={isRecording ? 'Stop recording' : 'Start voice input'}
          >
            {isRecording ? (
              <StopIcon className="w-5 h-5" />
            ) : (
              <MicrophoneIcon className="w-5 h-5" />
            )}
          </button>

          {/* Send/Stop button */}
          <button
            type={isStreaming ? 'button' : 'submit'}
            onClick={isStreaming ? stopStreaming : undefined}
            className={`px-4 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
              isStreaming
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
            disabled={!inputText.trim() || (!isStreaming && isLoading)}
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
        </div>

        {/* Input tips */}
        <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 flex items-center space-x-4">
          <span>Press Enter to send, Shift+Enter for new line</span>
          <span>•</span>
          <span>Ctrl+K for command palette</span>
          <span>•</span>
          <span>Ctrl+/ for keyboard shortcuts</span>
          <>
            <span>•</span>
            <span>Ctrl+T to toggle deep thinking mode</span>
          </>
        </div>
      </form>
    </div>
  );
};