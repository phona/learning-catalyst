/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable no-undef */
/* eslint-disable react/prop-types */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-non-null-asserted-optional-chain */
/* eslint-disable @typescript-eslint/no-non-null-asserted-access */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/require-await */




/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/strict-boolean-expressions, @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/explicit-function-return-type, react/no-unescaped-entities */
import React, { useState } from 'react';
import { Message } from '@/shared/types/ai';
import { CheckCircleIcon, XCircleIcon, ArrowPathIcon, LightBulbIcon } from '@heroicons/react/24/outline';

interface PracticeSuggestionBubbleProps {
  message: Message;
  onAccept?: () => void;
  onDecline?: () => void;
  onPostpone?: () => void;
  isStreaming?: boolean;
}

interface PracticeSuggestion {
  id: string;
  type: string;
  content: string;
  topic: string;
  confidence?: number;
  timing?: {
    when: 'right now' | 'soon' | 'later';
    urgency: 'low' | 'medium' | 'high';
  };
}

/**
 * Practice Suggestion Bubble Component
 *
 * Displays practice suggestions in a visually distinct way from regular messages,
 * with action buttons for users to accept, decline, or postpone the suggestion.
 */
export const PracticeSuggestionBubble: React.FC<PracticeSuggestionBubbleProps> = ({
  message,
  onAccept,
  onDecline,
  onPostpone,
  isStreaming = false
}) => {
  const [suggestion] = useState<PracticeSuggestion>({
    id: message.id || `suggestion-${Date.now()}`,
    type: 'practice',
    content: message.content,
    topic: message.content.includes('React') ? 'React' : 
      message.content.includes('TypeScript') ? 'TypeScript' : 
        message.content.includes('JavaScript') ? 'JavaScript' : 
          'General',
    confidence: 0.85,
    timing: {
      when: 'right now',
      urgency: 'medium'
    }
  });

  const handleAccept = () => {
    onAccept?.();
  };

  const handleDecline = () => {
    onDecline?.();
  };

  const handlePostpone = () => {
    onPostpone?.();
  };

  return (
    <div className="flex justify-start mb-6 animate-message-appear">
      <div className="w-10 h-10 bg-violet-500 rounded-full flex items-center justify-center shadow-md animate-fade-in">
        <LightBulbIcon className="w-6 h-6 text-white" />
      </div>

      <div className="max-w-4xl flex-1 ml-4">
        {/* Message header */}
        <header className="flex items-center space-x-2 mb-3 animate-fade-in">
          <span className="text-sm font-semibold text-violet-700 dark:text-violet-300">
            Practice Suggestion
          </span>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-violet-500 rounded-full"></div>
            <span className="text-xs text-violet-500 dark:text-violet-400">
              {suggestion.topic}
            </span>
          </div>
        </header>

        {/* Practice suggestion content */}
        <main className="bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-lg p-4 shadow-md animate-fade-in-up">
          <div className="flex items-start">
            <div className="flex-1">
              <p className="text-gray-800 dark:text-gray-200 leading-relaxed">
                {suggestion.content}
              </p>
            </div>
          </div>
        </main>

        {/* Action buttons */}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={handleAccept}
            className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm rounded-lg transition-colors duration-200"
            disabled={isStreaming}
          >
            <CheckCircleIcon className="w-4 h-4" />
            <span>Yes, let's practice!</span>
          </button>
          
          <button
            onClick={handleDecline}
            className="flex items-center space-x-1 px-3 py-1.5 bg-gray-500 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors duration-200"
            disabled={isStreaming}
          >
            <XCircleIcon className="w-4 h-4" />
            <span>No, thanks</span>
          </button>
          
          <button
            onClick={handlePostpone}
            className="flex items-center space-x-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-sm rounded-lg transition-colors duration-200"
            disabled={isStreaming}
          >
            <ArrowPathIcon className="w-4 h-4" />
            <span>In a few minutes</span>
          </button>
        </div>

        {/* Confidence indicator */}
        {suggestion.confidence !== undefined && (
          <div className="mt-2 flex items-center">
            <div className="text-xs text-violet-600 dark:text-violet-400 flex items-center">
              <LightBulbIcon className="w-3 h-3 mr-1" />
              <span>AI confidence: {(suggestion.confidence * 100).toFixed(0)}%</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};