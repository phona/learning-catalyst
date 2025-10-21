/**
 * Use App Services Hook
 *
 * React hook for accessing app services.
 * Replaces the complex module integration hook with simple service access.
 */

import { useState, useEffect } from 'react';
import { appServices, initializeAppServices } from '@/services/appServices';

export interface AppServicesState {
  initialized: boolean;
  loading: boolean;
  error: string | null;
  systemHealth: any;
}

export function useAppServices() {
  const [state, setState] = useState<AppServicesState>({
    initialized: false,
    loading: true,
    error: null,
    systemHealth: null
  });
  const [isInitializing, setIsInitializing] = useState(false);

  useEffect(() => {
    const initializeServices = async () => {
      // Prevent multiple initializations
      if (isInitializing || state.initialized) {
        return;
      }

      setIsInitializing(true);
      try {
        setState(prev => ({ ...prev, loading: true, error: null }));

        await initializeAppServices();

        setState({
          initialized: true,
          loading: false,
          error: null,
          systemHealth: await appServices.getSystemHealth()
        });
      } catch (error) {
        setState({
          initialized: false,
          loading: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          systemHealth: null
        });
      } finally {
        setIsInitializing(false);
      }
    };

    initializeServices();
  }, []);

  const refreshSystemHealth = async () => {
    try {
      const health = await appServices.getSystemHealth();
      setState(prev => ({ ...prev, systemHealth: health }));
    } catch (error) {
      console.error('Failed to refresh system health:', error);
    }
  };

  return {
    ...state,
    refreshSystemHealth,
    database: appServices.isInitialized() ? appServices.getDatabase() : null,
    analytics: appServices.isInitialized() ? appServices.getAnalytics() : null,
    knowledgeGraph: appServices.isInitialized() ? appServices.getKnowledgeGraph() : null
  };
}