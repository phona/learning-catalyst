import React from 'react';
import { ContentDiscovery } from './ContentDiscovery';

export const DiscoveryPage: React.FC = (): React.ReactElement => {
  return (
    <div className="h-full flex">
      <div className="flex-1 overflow-auto">
        <div className="h-full p-6">
          <div className="max-w-6xl mx-auto">
            {/* Content Discovery Component */}
            <ContentDiscovery />
          </div>
        </div>
      </div>
    </div>
  );
};
