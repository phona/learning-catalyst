import React, { useState } from 'react';
import type { ParsingJob } from '@/shared/types/concept-parsing';
import { FileTree } from './FileTree';
import { ConceptParser } from './ConceptParser';
import { ProviderStatus } from './ProviderStatus';
import { ParsingResultsModal } from './ParsingResultsModal';

interface LocalProjectExplorerProps {
  onFileSelect?: (filePath: string) => void;
  onDirectorySelect?: (dirPath: string) => void;
  className?: string;
}

export const LocalProjectExplorer: React.FC<LocalProjectExplorerProps> = ({
  onFileSelect,
  onDirectorySelect,
  className = '',
}) => {
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [selectedDirectories, setSelectedDirectories] = useState<Set<string>>(new Set());
  const [maxDepth, setMaxDepth] = useState(3);
  const [activeParsingJob, setActiveParsingJob] = useState<ParsingJob | null>(null);
  const [showParsingResults, setShowParsingResults] = useState(false);

  const handleSelectionChange = (files: Set<string>, directories: Set<string>) => {
    setSelectedFiles(files);
    setSelectedDirectories(directories);
  };

  const handleParseComplete = (job: ParsingJob) => {
    setActiveParsingJob(job);
    setShowParsingResults(true);
  };

  const handleProviderConfigure = () => {
    window.location.hash = '/settings';
  };

  return (
    <div className={className}>
      {/* Provider Status */}
      <div className="mb-4">
        <ProviderStatus onConfigure={handleProviderConfigure} />
      </div>

      {/* File Tree with Selection */}
      <FileTree
        onFileSelect={onFileSelect}
        onDirectorySelect={onDirectorySelect}
        onFileToggle={(filePath) => {
          setSelectedFiles((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(filePath)) {
              newSet.delete(filePath);
            } else {
              newSet.add(filePath);
            }
            return newSet;
          });
        }}
        onDirectoryToggle={(dirPath) => {
          setSelectedDirectories((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(dirPath)) {
              newSet.delete(dirPath);
            } else {
              newSet.add(dirPath);
            }
            return newSet;
          });
        }}
        selectedFiles={selectedFiles}
        selectedDirectories={selectedDirectories}
        maxDepth={maxDepth}
        onMaxDepthChange={setMaxDepth}
      />

      {/* Concept Parser */}
      <ConceptParser
        selectedFiles={selectedFiles}
        onParseComplete={handleParseComplete}
      />

      {/* Parsing Results Modal */}
      {showParsingResults && activeParsingJob && (
        <ParsingResultsModal
          job={activeParsingJob}
          isOpen={showParsingResults}
          onClose={() => setShowParsingResults(false)}
          onExport={(format) => {
            console.log(`Exporting results as ${format}:`, activeParsingJob.result);
          }}
          onConceptSelect={(conceptId) => {
            console.log('Selected concept:', conceptId);
          }}
          onIngest={async (result, plan) => {
            console.log('Ingesting results:', result, plan);
          }}
        />
      )}
    </div>
  );
};

export default LocalProjectExplorer;
