import { describe, it, expect, vi } from 'vitest';
import { ChatOpenAI } from '@langchain/openai';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { executeExtractionWorkflow } from '../extraction-workflow';

describe('Workflow Streaming Test', () => {
  it.skip('should extract concepts via streaming without timeout', async () => {
    // Mock test configuration to avoid external dependencies
    const mockConfig = {
      provider: {
        chatModel: {
          apiKey: 'test-key',
          model: 'gpt-3.5-turbo',
          temperature: 0.7,
          maxTokens: 1000,
          baseUrl: 'https://api.openai.com/v1',
        },
      },
    };

    // Set environment variable for ChatOpenAI
    process.env.OPENAI_API_KEY = mockConfig.provider.chatModel.apiKey;

    // Create ChatOpenAI model
    const chatModel = new ChatOpenAI({
      modelName: mockConfig.provider.chatModel.model,
      temperature: mockConfig.provider.chatModel.temperature,
      maxTokens: mockConfig.provider.chatModel.maxTokens,
      configuration: {
        baseURL: mockConfig.provider.chatModel.baseUrl,
      },
      timeout: 30000, // 30s timeout for silence between chunks (not total time)
    });

    const logger = {
      info: (msg: string, ...args: unknown[]) => console.log(`[INFO] ${msg}`, ...args),
      debug: (msg: string, ...args: unknown[]) => console.log(`[DEBUG] ${msg}`, ...args),
      warn: (msg: string, ...args: unknown[]) => console.warn(`[WARN] ${msg}`, ...args),
      error: (msg: string, error?: Error | unknown, ...args: unknown[]) => console.error(`[ERROR] ${msg}`, error, ...args),
      child: (context: Record<string, unknown>) => ({
        info: (msg: string, ...args: unknown[]) => console.log(`[INFO] ${msg}`, context, ...args),
        debug: (msg: string, ...args: unknown[]) => console.log(`[DEBUG] ${msg}`, context, ...args),
        warn: (msg: string, ...args: unknown[]) => console.warn(`[WARN] ${msg}`, context, ...args),
        error: (msg: string, error?: Error | unknown, ...args: unknown[]) => console.error(`[ERROR] ${msg}`, context, error, ...args),
        child: () => logger as any,
      }),
    };

    const testContent = `# Python Data Types
Python has several built-in data types:

## Numeric Types
- int: Integer numbers like 1, 2, 100
- float: Decimal numbers like 1.5, 2.7
- complex: Complex numbers like 1+2j

## Sequence Types
- str: Strings like "hello"
- list: Ordered, mutable sequences [1, 2, 3]
- tuple: Ordered, immutable sequences (1, 2, 3)

## Mapping Type
- dict: Key-value pairs {"name": "John"}

Variables can store any of these types and change types dynamically.`;

    console.log('\n========== STREAMING TEST STARTING ==========\n');
    console.log('Content:', testContent);
    console.log('\nCalling executeExtractionWorkflow with streaming...\n');

    let result;
    try {
      result = await executeExtractionWorkflow(
        testContent,
        chatModel,
        logger,
        2,
      );
    } catch (error) {
      console.error('💥 Exception caught:', error);
      result = {
        success: false,
        error: `Exception: ${error instanceof Error ? error.message : String(error)}`,
        attempt: 1,
        metrics: {
          chainCreationMs: 0,
          llmInvokeMs: 0,
          jsonParseMs: 0,
          validationMs: 0,
          totalMs: 0,
        },
      };
    }

    console.log('\n========== STREAMING TEST RESULT ==========\n');
    console.log('Success:', result.success);
    console.log('Error:', result.error || 'none');
    console.log('Attempt:', result.attempt);
    console.log('Metrics:', JSON.stringify(result.metrics, null, 2));
    console.log('Result preview:', result.result ? JSON.stringify(result.result).substring(0, 200) : 'no result');
    if (result.error && result.error.includes('Unrecognized key')) {
      console.log('ERROR DETAILS:', result.error);
    }
    console.log('\n===========================================\n');

    // Write result to file for debugging
    import('node:fs').then((fs) => {
      fs.writeFileSync('streaming-test-result.json', JSON.stringify(result, null, 2));
    });

    expect(result.success).toBe(true);
  }, 120000);
});
