import path from 'node:path';
import { mkdir } from 'fs/promises';
import { AsyncLocalStorage } from 'async_hooks';
import { createWinstonLoggerService } from '../services/core/logger/winston-logger';
import { createLoggerService } from '@/main/services/core/logger/logger-service';
import { createDatabaseAtPath, runMigrationsAtPath } from '../services/core/database/kysely-database';
import { createConfigStorage } from '../services/core/config/storage';
import { createConfigService } from '@/main/services/core/config/config-service';
import { createProviderFactory } from '@/main/services/agent/provider-factory';
import { createQdrantProcessService } from '../services/core/database/qdrant-process-service';
import { createVectorStore } from '../services/core/database/vector-store';
import { createVectorDatabase } from '../services/domain/knowledge/vector/vector-database';
import { createKnowledgeService } from '@/main/services/domain/knowledge/knowledge-service';
import { createConceptParsingService } from '@/main/services/domain/concept-parsing/concept-parsing-service';
import { createAnalyticsService } from '@/main/services/domain/analytics/analytics-service';
import { SQLiteCheckpointSaver } from '../services/core/checkpoints';
import { createLearningService } from '@/main/services/domain/learning/learning-service';
import { createPracticeService } from '@/main/services/domain/practice/practice-service';
import { createChatService } from '../services/domain/chat';

export const initializeAppServices = async (params: {
  workspacePath: string;
  learningCatalystPath: string;
}) => {
  const readyStart = Date.now();
  console.log('[Main] Starting service initialization', { timestamp: readyStart });

  const logDirectory = path.join(params.learningCatalystPath, 'logs');
  const als = new AsyncLocalStorage<Record<string, unknown>>();
  const winstonLogger = createWinstonLoggerService({ logDirectory, als });
  const loggerService = createLoggerService({ logger: winstonLogger });

  loggerService.info('Learning Catalyst starting', {
    environment: winstonLogger.getEnvironment(),
    workspacePath: params.learningCatalystPath,
    logDirectory,
    nodeVersion: process.version,
    electronVersion: process.versions.electron,
  });

  const dbPath = path.join(params.learningCatalystPath, 'learning_catalyst.db');
  const db = await createDatabaseAtPath(dbPath);
  await runMigrationsAtPath(dbPath);

  const configStorage = createConfigStorage(params.learningCatalystPath);
  const configService = createConfigService({ storage: configStorage, logger: loggerService });

  const qdrantDataPath = path.join(params.learningCatalystPath, 'qdrant');
  await mkdir(qdrantDataPath, { recursive: true });
  const qdrantProcessService = createQdrantProcessService(params.workspacePath, loggerService, {
    host: '127.0.0.1',
    port: 6333,
    dataPath: qdrantDataPath,
  });

  const vectorStore = createVectorStore(qdrantProcessService, { host: '127.0.0.1', port: 6333 });
  const providerFactory = createProviderFactory(configService);
  const vectorDatabase = createVectorDatabase(vectorStore, providerFactory);

  await qdrantProcessService.start();
  await vectorDatabase.start();

  const knowledgeService = createKnowledgeService({
    db,
    vectorDatabase,
    providerFactory,
    loggerService,
  });

  const conceptParsingService = createConceptParsingService({
    providerFactory,
    vectorDatabase,
    loggerService,
  });

  const analyticsService = createAnalyticsService({ db, loggerService });
  const checkpointSaver = new SQLiteCheckpointSaver(db);

  const learningService = createLearningService({
    db,
    loggerService,
    checkpointSaver,
  });

  const practiceService = createPracticeService({
    loggerService,
    knowledgeService,
    db,
  });

  const chatService = createChatService({
    loggerService,
    providerFactory,
    checkpointSaver,
  });

  configService.onConfigChanged(() => {
    providerFactory.reset();

    void conceptParsingService.rebuild().catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      loggerService.warn('Concept parsing rebuild failed after config change', { message });
    });

    void practiceService.rebuild().catch((error) => {
      const message = error instanceof Error ? error.message : String(error);
      loggerService.warn('Practice service rebuild failed after config change', { message });
    });
  });

  return {
    readyStart,
    loggerService,
    configService,
    db,
    providerFactory,
    knowledgeService,
    conceptParsingService,
    analyticsService,
    checkpointSaver,
    learningService,
    practiceService,
    chatService,
  };
};
