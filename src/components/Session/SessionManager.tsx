import React from 'react';

export const SessionManager: React.FC = () => {
  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="text-center">
        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Session Manager
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage your learning sessions and conversation history
        </p>
      </div>
    </div>
  );
};