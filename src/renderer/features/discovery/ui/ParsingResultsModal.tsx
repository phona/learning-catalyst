import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import type { ParsingJob } from '@/shared/types/concept-parsing';
import { ConceptParsingResults } from './ConceptParsingResults';
import type { ConceptIngestionPlan } from '@/shared/types/electron-api/knowledge-api';

interface ParsingResultsModalProps {
  job: ParsingJob;
  isOpen: boolean;
  onClose: () => void;
  onExport?: (format: 'json' | 'csv') => void;
  onConceptSelect?: (conceptId: string) => void;
  onIngest?: (result: any, plan?: ConceptIngestionPlan) => Promise<any>;
}

export const ParsingResultsModal: React.FC<ParsingResultsModalProps> = ({
  job,
  isOpen,
  onClose,
  onExport,
  onConceptSelect,
  onIngest,
}) => {
  if (!isOpen) {
    return null;
  }

  const handleExportResults = (format: 'json' | 'csv') => {
    if (onExport) {
      onExport(format);
    } else {
      console.log(`Exporting results as ${format}:`, job.result);
    }
  };

  const handleIngest = async (result: any, plan?: ConceptIngestionPlan) => {
    if (onIngest) {
      return await onIngest(result, plan);
    }
    throw new Error('Ingest handler not provided');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-6xl max-h-[90vh] w-full overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Concept Parsing Results
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
          >
            <XMarkIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="overflow-auto" style={{ maxHeight: 'calc(90vh - 80px)' }}>
          <ConceptParsingResults
            job={job}
            onClose={onClose}
            onExport={handleExportResults}
            onConceptSelect={onConceptSelect || ((conceptId: string) => console.log('Selected concept:', conceptId))}
            onIngest={handleIngest}
          />
        </div>
      </div>
    </div>
  );
};

export default ParsingResultsModal;
