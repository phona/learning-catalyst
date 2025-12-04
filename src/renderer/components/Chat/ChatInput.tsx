/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import React, { useState, useRef, useEffect, memo } from 'react';
import {
  PaperAirplaneIcon,
  PaperClipIcon,
  StopIcon,
} from '@heroicons/react/24/outline';
import { useChatStore } from '@/renderer/hooks/useChatStore';
import { useConfigStore } from '@/renderer/stores/useConfigStore';
import { useFileService } from '@/renderer/services/services-provider';
import { chatToasts, utilityToasts } from '@/renderer/utils/toast';

const ChatInputComponent: React.FC = () => {
  const [inputText, setInputText] = useState<string>('');

  const {
    isLoading,
    isStreaming,
    sendMessage,
    sendMessageStream,
    stopStreaming,
    error,
    setError,
    currentSessionId,
    awaitingUserInput,
  } = useChatStore((s) => ({
    isLoading: s.isLoading,
    isStreaming: s.isStreaming,
    sendMessage: s.sendMessage,
    sendMessageStream: s.sendMessageStream,
    stopStreaming: s.stopStreaming,
    error: s.error,
    setError: s.setError,
    currentSessionId: s.currentSessionId ?? s.currentSession?.id ?? null,
    awaitingUserInput: (s as any).awaitingUserInput ?? null,
  }));

  const { config } = useConfigStore();
  const fileService = useFileService();

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
      console.log('[ChatInput] submit', { len: message.length });
      await sendMessageStream(message);
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);
      chatToasts.error(errorMessage);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    } else if (e.key === 'Escape') {
      // Clear input on escape
      e.preventDefault();
      setInputText('');
      textareaRef.current?.focus();
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

  const isActionButtonDisabled = (!inputText.trim() && !awaitingUserInput) || isLoading;

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
                  placeholder={
                    isStreaming
                      ? 'AI is responding...'
                      : 'Type your message here...'
                  }
                  disabled={false}
                  aria-label="Type your message here"
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
            </div>

            {/* Send / Stop button */}
            {isStreaming && !(awaitingUserInput && !awaitingUserInput.hidden) ? (
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
        </form>
      </div>

      {/* Simple File attachment button */}
      <div className="px-6 pb-6">
        <button
          type="button"
          onClick={handleFileSelect}
          className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors duration-200"
          title="Attach file to message"
          aria-label="Attach file to message"
        >
          <PaperClipIcon className="w-4 h-4" />
          <span>Attach file</span>
        </button>
      </div>
    </div>
  );
};

export const ChatInput = memo(ChatInputComponent);

export default ChatInput;
