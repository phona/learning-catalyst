import { useCallback, useState } from 'react';
import type { AppConfig } from '@/shared/types/config';
import type { ConfigurationService } from '@/renderer/services/configuration/configuration-service';
import { ModelType } from '@/shared/types/ai';

export type SaveWorkflowStepId =
  | 'saveUi'
  | 'showLoader'
  | 'invokeConfig'
  | 'persistConfig'
  | 'rebuildObjects'
  | 'blockUntilSuccess'
  | 'removeBlock'
  | 'jumpToIndex';

export type SaveWorkflowStepStatus = 'idle' | 'pending' | 'success' | 'error';

export interface ConfiguredProvider {
  id: string;
  name: string;
  apiKey: string;
  baseUrl: string;
  models: string[];
}

export interface ModelAssignment {
  providerId: string;
  model: string;
  settings?: {
    temperature?: number;
    maxTokens?: number;
  };
}

export interface SetupWorkflowPayload {
  configuredProviders: Array<{
    id: string;
    name: string;
    apiKey: string;
    baseUrl: string;
    models: string[];
  }>;
  chatAssignment: ModelAssignment;
  embeddingAssignment?: ModelAssignment | null;
  rerankAssignment?: ModelAssignment | null;
  buildAppConfig: () => AppConfig;
}

const WORKFLOW_STEP_IDS: SaveWorkflowStepId[] = [
  'saveUi',
  'showLoader',
  'invokeConfig',
  'persistConfig',
  'rebuildObjects',
  'blockUntilSuccess',
  'removeBlock',
  'jumpToIndex',
];

export const createInitialWorkflowStatus = (): Record<SaveWorkflowStepId, SaveWorkflowStepStatus> =>
  WORKFLOW_STEP_IDS.reduce(
    (acc, step) => {
      acc[step] = 'idle';
      return acc;
    },
    {} as Record<SaveWorkflowStepId, SaveWorkflowStepStatus>,
  );

export const useSetupWorkflow = (configService: ConfigurationService) => {
  const [workflowStatus, setWorkflowStatus] = useState<
    Record<SaveWorkflowStepId, SaveWorkflowStepStatus>
  >(() => createInitialWorkflowStatus());
  const [isSaving, setIsSaving] = useState(false);
  const [workflowError, setWorkflowError] = useState<string | null>(null);

  const updateWorkflowStep = useCallback(
    (step: SaveWorkflowStepId, status: SaveWorkflowStepStatus) => {
      setWorkflowStatus((prev) => ({ ...prev, [step]: status }));
    },
    [],
  );

  const resetWorkflow = useCallback(() => {
    setWorkflowStatus(createInitialWorkflowStatus());
    setWorkflowError(null);
  }, []);

  const executeWorkflow = useCallback(
    async (payload: SetupWorkflowPayload) => {
      if (!payload.chatAssignment) {
        throw new Error('Chat assignment is required to complete the setup workflow.');
      }

      setIsSaving(true);
      resetWorkflow();
      let currentStep: SaveWorkflowStepId | null = null;

      try {
        const markStep = (step: SaveWorkflowStepId) => {
          currentStep = step;
          updateWorkflowStep(step, 'pending');
        };

        markStep('saveUi');
        updateWorkflowStep('saveUi', 'success');

        markStep('showLoader');
        updateWorkflowStep('showLoader', 'success');

        markStep('invokeConfig');
        for (const provider of payload.configuredProviders) {
          await configService.configureProvider({
            provider: provider.id,
            config: {
              apiKey: provider.apiKey,
              baseUrl: provider.baseUrl || undefined,
            },
          });
        }

        // Model assignments are applied as part of the final persisted config below

        updateWorkflowStep('invokeConfig', 'success');

        markStep('persistConfig');
        const appConfig = payload.buildAppConfig();
        await configService.saveConfig(appConfig);
        updateWorkflowStep('persistConfig', 'success');

        markStep('rebuildObjects');
        updateWorkflowStep('rebuildObjects', 'success');

        markStep('blockUntilSuccess');
        updateWorkflowStep('blockUntilSuccess', 'success');

        markStep('removeBlock');
        updateWorkflowStep('removeBlock', 'success');

        markStep('jumpToIndex');
        updateWorkflowStep('jumpToIndex', 'success');

        return true;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to save configuration.';
        setWorkflowError(message);
        if (currentStep) {
          updateWorkflowStep(currentStep, 'error');
        }
        throw new Error(message);
      } finally {
        setIsSaving(false);
      }
    },
    [configService, resetWorkflow, updateWorkflowStep],
  );

  return {
    isSaving,
    workflowStatus,
    workflowError,
    executeWorkflow,
    resetWorkflow,
  };
};
