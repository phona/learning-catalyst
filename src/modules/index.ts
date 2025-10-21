/**
 * Learning Catalyst Modules
 *
 * Simple module architecture for learning intelligence features.
 * Follows "less is more" principle - minimal but complete.
 */

// Module types
export interface Module {
  readonly name: string;
  readonly version: string;
  readonly initialized: boolean;

  init(): Promise<void>;
  cleanup(): Promise<void>;
  getStatus(): ModuleStatus;
}

export interface ModuleStatus {
  initialized: boolean;
  healthy: boolean;
  error?: string;
  lastCheck: Date;
}

export type ModuleRegistry = Record<string, Module>;

// Core modules
import { KnowledgeGraphModule, ConceptManager } from './knowledge-graph';
import { LocalDatabaseModule } from './database';
import { SimpleAnalyticsModule } from './analytics';

export { KnowledgeGraphModule, ConceptManager, LocalDatabaseModule, SimpleAnalyticsModule };

// Module factory
export class ModuleFactory {
  private static modules: ModuleRegistry = {};

  static register(module: Module): void {
    this.modules[module.name] = module;
  }

  static get(name: string): Module | undefined {
    return this.modules[name];
  }

  static async initializeAll(): Promise<void> {
    const initPromises = Object.values(this.modules).map(module =>
      module.init().catch(error => {
        console.error(`Failed to initialize module ${module.name}:`, error);
      })
    );

    await Promise.allSettled(initPromises);
  }

  static async cleanupAll(): Promise<void> {
    const cleanupPromises = Object.values(this.modules).map(module =>
      module.cleanup().catch(error => {
        console.error(`Failed to cleanup module ${module.name}:`, error);
      })
    );

    await Promise.allSettled(cleanupPromises);
  }

  static getStatus(): Record<string, ModuleStatus> {
    return Object.fromEntries(
      Object.entries(this.modules).map(([name, module]) => [name, module.getStatus()])
    );
  }
}

// Auto-register core modules
ModuleFactory.register(new KnowledgeGraphModule());
ModuleFactory.register(new LocalDatabaseModule());
ModuleFactory.register(new SimpleAnalyticsModule());