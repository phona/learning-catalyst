/**
 * Minimal placeholder hook for app services.
 * Tests often mock this; in runtime it can be wired to a proper provider.
 */
export interface AppServicesHook {
  services: Record<string, unknown>;
  ready: boolean;
  error: string | null;
  useService?: <T = unknown>(name: string) => T;
}

export const useAppServices = (): AppServicesHook => ({
  services: {},
  ready: true,
  error: null,
  useService: () => {
    throw new Error('useService is not implemented in the placeholder useAppServices hook');
  },
});

export const useService = <T = unknown>(_name: string): T => {
  throw new Error('useService is not implemented in the placeholder useAppServices hook');
};
