import React from 'react';

export const KnowledgeMap: React.FC = () => {
  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="text-center">
        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Knowledge Map
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Explore connections between concepts and track your knowledge graph
        </p>
      </div>
    </div>
  );
};