/**
 * Events API
 *
 * Provides event handling operations through Electron IPC
 */

export interface EventsAPI {
  /**
   * Register callback for menu actions
   * @param callback - Callback function for menu actions
   */
  onMenuAction: (callback: (action: string, data?: any) => void) => void;

  /**
   * Remove all listeners for a specific channel
   * @param channel - Channel name
   */
  removeAllListeners: (channel: string) => void;
}