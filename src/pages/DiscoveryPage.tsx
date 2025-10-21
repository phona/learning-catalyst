import React from 'react';
import { ContentDiscovery } from '../components/Discovery/ContentDiscovery';
import { useAppStore } from '../stores/useAppStore';

export const DiscoveryPage: React.FC = () => {
  const { theme } = useAppStore();
  const userId = 'current-user'; // This would come from auth/user context

  const handleConceptSelect = (conceptId: string) => {
    // Navigate to concept details or add to current learning session
    console.log('Selected concept:', conceptId);
  };

  const handlePathSelect = (pathId: string) => {
    // Navigate to learning path details
    console.log('Selected path:', pathId);
  };

  return (
    <div className="h-full flex">
      <div className="flex-1 overflow-auto">
        <div className="h-full p-6">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Discover Content
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Explore concepts, find learning paths, and discover personalized recommendations based on your progress.
              </p>
            </div>

            {/* Content Discovery Component */}
            <ContentDiscovery
              userId={userId}
              onConceptSelect={handleConceptSelect}
              onPathSelect={handlePathSelect}
            />
          </div>
        </div>
      </div>
    </div>
  );
};