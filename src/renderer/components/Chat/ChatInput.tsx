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

  const handleSkip = async () => {
    if (!awaitingUserInput) return;
    try {
      console.log('[ChatInput] Skip clicked', { checkpointId: awaitingUserInput.checkpointId });
      // TODO: Call resume-workflow API when implemented
      // await electronAPI.chat.resumeWorkflow({
      //   checkpointId: awaitingUserInput.checkpointId,
      //   questionId: awaitingUserInput.questionId,
      //   action: 'skip'
      // });
    } catch (error) {
      console.error('Failed to skip:', error);
    }
  };

  return (
    <div
      className="relative border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
      role="region"
      aria-label="Chat input area"
    >
      {/* Context Preview - Show when awaiting input */}
      {awaitingUserInput?.prompt && (
        <div className="px-6 py-3 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800">
          <div className="max-w-4xl mx-auto flex items-start gap-3">
            <div className="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-200 mb-1">
                Responding to:
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                {awaitingUserInput.prompt}
              </p>
            </div>
          </div>
        </div>
      )}

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
              <div className={`relative ${
                awaitingUserInput?.prompt
                  ? 'border-amber-300 dark:border-amber-700 bg-amber-50/30 dark:bg-amber-900/10'
                  : 'border-gray-200 dark:border-gray-700'
              } border rounded-lg transition-colors duration-200`}>
                <textarea
                  id="chat-input"
                  ref={textareaRef}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    awaitingUserInput?.prompt
                      ? 'Type your response here...'
                      : isStreaming
                        ? 'AI is responding...'
                        : 'Type your message here...'
                  }
                  disabled={false}
                  aria-label={
                    awaitingUserInput?.prompt
                      ? 'Type your response here'
                      : 'Type your message here'
                  }
                  aria-multiline="true"
                  className="w-full px-5 py-4 bg-transparent dark:bg-transparent resize-none focus:outline-none focus:ring-0 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 placeholder:text-gray-400 dark:placeholder:text-gray-500"
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

            {/* Action Buttons */}
            <div className="flex items-center space-x-2">
              {/* Skip button - only show when awaiting input */}
              {awaitingUserInput?.prompt && !isStreaming && (
                <button
                  type="button"
                  onClick={handleSkip}
                  className="px-4 py-4 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2.5 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 bg-amber-100 hover:bg-amber-200 text-amber-800 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 dark:text-amber-300 focus:ring-amber-500"
                  aria-label="Skip this question"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Skip</span>
                </button>
              )}

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
            </div>
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
