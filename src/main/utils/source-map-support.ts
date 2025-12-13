/**
 * Enable source map support for better error stack traces
 * This translates compiled file paths back to original source files
 *
 * Without this, Electron main process errors show:
 *   file:///D:/Projects/learning_catalyst/dist-electron/main/index-1b11f55c.js:81896:25
 *
 * With this, errors show:
 *   src/main/services/domain/concept-parsing/concept-parsing-service.ts:557:5
 *
 * Note: Must use the register.js entry point for ES module compatibility
 */
import 'source-map-support/register';

export {};
