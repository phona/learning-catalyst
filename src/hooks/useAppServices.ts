/**
 * Use App Services Hook
 *
 * React hook for accessing app services.
 * Replaces the complex module integration hook with simple service access.
 */

import { useState, useEffect } from 'react';
import { appServices, initializeAppServices } from '@/services/appServices';

// Global flag to track if services have already been initialized to prevent double execution in React Strict Mode
let hasInitializedServices = false;

export interface AppServicesState {
  ready: boolean;
  error: string | null;
}

export function useAppServices() {
  const [state, setState] = useState<AppServicesState>({
    ready: false,
    error: null
  });

  useEffect(() => {
    let mounted = true;

    // Prevent double initialization in React Strict Mode
    if (hasInitializedServices) {
      console.log('🔧 Services already initialized by hook, skipping...');
      return;
    }

    console.log('🚀 Starting service initialization from hook...');

    const initializeServices = async () => {
      try {
        // Only update state if component is still mounted
        if (mounted) {
          setState(prev => ({ ...prev, error: null }));
        }

        // Mark as initialized immediately to prevent race conditions
        hasInitializedServices = true;

        // Block here until all services are initialized
        await initializeAppServices();

        // Only update state if component is still mounted
        if (mounted) {
          setState({
            ready: true,
            error: null
          });
          console.log('✅ All services initialized successfully');
        }
      } catch (error) {
        if (mounted) {
          setState({
            ready: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          console.error('❌ Service initialization failed:', error);
        }
      }
    };

    initializeServices();

    return () => {
      mounted = false;
    };
  }, []); // Empty dependency array ensures this runs only once

  // Don't return services until fully ready
  if (!state.ready || state.error) {
    return {
      ...state,
      database: null,
      analytics: null,
      knowledgeGraph: null
    };
  }

  // All services are ready
  return {
    ...state,
    database: appServices.getDatabase(),
    analytics: appServices.getAnalytics(),
    knowledgeGraph: appServices.getKnowledgeGraph()
  };
}