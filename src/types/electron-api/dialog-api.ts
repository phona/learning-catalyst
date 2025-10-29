/**
 * Dialog Operations API
 *
 * Provides native dialog operations through Electron IPC
 */

export interface DialogAPI {
  /**
   * Show open file dialog
   * @param options - Dialog options
   * @returns Dialog result with selected file paths
   */
  showOpenDialog: (options: any) => Promise<any>;

  /**
   * Show save file dialog
   * @param options - Dialog options
   * @returns Dialog result with selected file path
   */
  showSaveDialog: (options: any) => Promise<any>;
}