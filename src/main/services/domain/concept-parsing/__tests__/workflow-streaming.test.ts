import { describe, it, expect, vi } from 'vitest';
import { ChatOpenAI } from '@langchain/openai';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { executeExtractionWorkflow } from '../extraction-workflow';

describe('Workflow Streaming Test', () => {
  it('should extract concepts via streaming without timeout', async () => {
    // Load test configuration
    const configPath = path.join(process.cwd(), '.testconfig.json');
    const testConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

    // Set environment variable for ChatOpenAI
    process.env.OPENAI_API_KEY = testConfig.provider.chatModel.apiKey;

    // Create ChatOpenAI model with ChatGLM
    const chatModel = new ChatOpenAI({
      modelName: testConfig.provider.chatModel.model,
      temperature: testConfig.provider.chatModel.temperature,
      maxTokens: testConfig.provider.chatModel.maxTokens,
      configuration: {
        baseURL: testConfig.provider.chatModel.baseUrl,
      },
      timeout: 30000, // 30s timeout for silence between chunks (not total time)
    });

    const logger = {
      info: (msg: string, data?: object) => console.log(`[INFO] ${msg}`, data || ''),
      debug: (msg: string, data?: object) => console.log(`[DEBUG] ${msg}`, data || ''),
      warn: (msg: string, data?: object) => console.warn(`[WARN] ${msg}`, data || ''),
      error: (msg: string, data?: object) => console.error(`[ERROR] ${msg}`, data || ''),
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
