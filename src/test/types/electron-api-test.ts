/**
 * Test file to verify ElectronAPI types compilation
 */

import type { ElectronAPI, FileAPI, ConfigAPI } from '../../types/electron-api'

// Test that we can use the modular interfaces
function testFileAPI(api: FileAPI) {
  return api.readFile('/test/path')
}

function testConfigAPI(api: ConfigAPI) {
  return api.getConfig()
}

function testFullAPI(api: ElectronAPI) {
  // Test that all methods are available
  return Promise.all([
    api.readFile('/test'),
    api.getConfig(),
    api.getAppVersion()
  ])
}

// Test window interface (this should work in the actual app)
declare const window: Window & typeof globalThis

// This would work in the actual renderer process
// const api = window.electronAPI

export { testFileAPI, testConfigAPI, testFullAPI }