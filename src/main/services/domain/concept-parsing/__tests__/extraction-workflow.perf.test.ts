/**
 * Performance Integration Tests for LangGraph Extraction Workflow
 *
 * These tests call the REAL ChatGLM API to measure actual performance.
 * Run with: npm run test:main:file -- src/main/services/domain/concept-parsing/__tests__/extraction-workflow.perf.test.ts
 *
 * Configuration: .testconfig.json
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { ChatOpenAI } from '@langchain/openai';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { executeExtractionWorkflow } from '../extraction-workflow';
import type { ILogger } from '../../../types';

// Performance thresholds (in milliseconds)
const PERF_THRESHOLDS = {
  singleSegmentMax: 30000, // 30s max for single segment (increased for real API calls)
  llmInvokeMax: 25000, // 25s max for LLM call
  validationMax: 100, // 100ms max for validation
  jsonParseMax: 50, // 50ms max for JSON parsing
  longContentMax: 90000, // 90s max for long content
};

// Test content samples
const TEST_CONTENT = {
  short: `# Variables
Variables in Python are containers for storing data values.
A variable is created the moment you first assign a value to it.`,

  medium: `# Python Data Types
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

Variables can store any of these types and change types dynamically.`,

  long: `# Comprehensive Python Tutorial

## Chapter 1: Variables and Data Types
Python variables are dynamically typed, meaning you don't need to declare types.
${Array(20).fill('Python supports multiple data types including integers, floats, strings, lists, tuples, and dictionaries.').join(' ')}

## Chapter 2: Control Flow
Python uses if/elif/else for conditional execution.
${Array(20).fill('Loops include for and while statements for iteration.').join(' ')}

## Chapter 3: Functions
Functions are defined using the def keyword.
${Array(20).fill('Functions can accept parameters and return values.').join(' ')}`,
};

// Load test configuration
interface TestConfig {
  provider: {
    name: string;
    chatModel: {
      model: string;
      temperature: number;
      maxTokens: number;
      apiKey: string;
      baseUrl: string;
    };
  };
  testSettings: {
    timeoutMs: number;
    retryAttempts: number;
  };
}

let testConfig: TestConfig;
let chatModel: ChatOpenAI;
let testLogger: ILogger;

// Performance results collector
interface PerfResult {
  testName: string;
  contentLength: number;
  llmInvokeMs: number;
  jsonParseMs: number;
  validationMs: number;
  totalMs: number;
  success: boolean;
  attempt: number;
  conceptCount: number;
}

const perfResults: PerfResult[] = [];

describe('LangGraph Extraction Workflow - Performance Tests', () => {
  beforeAll(() => {
    // Load test configuration
    const configPath = path.join(process.cwd(), '.testconfig.json');
    if (!fs.existsSync(configPath)) {
      throw new Error(`Test config not found at ${configPath}. Create .testconfig.json with API credentials.`);
    }
    testConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

    // Set environment variable for ChatOpenAI
    process.env.OPENAI_API_KEY = testConfig.provider.chatModel.apiKey;

    // Create real ChatOpenAI model with ChatGLM
    chatModel = new ChatOpenAI({
      modelName: testConfig.provider.chatModel.model,
      temperature: testConfig.provider.chatModel.temperature,
      maxTokens: testConfig.provider.chatModel.maxTokens,
      openAIApiKey: testConfig.provider.chatModel.apiKey,
      configuration: {
        baseURL: testConfig.provider.chatModel.baseUrl,
      },
      timeout: testConfig.testSettings.timeoutMs,
    });

    // Create test logger that captures timing
    testLogger = {
      info: (msg: string, data?: object) => console.log(`[INFO] ${msg}`, data || ''),
      debug: (msg: string, data?: object) => {}, // Silent debug
      warn: (msg: string, data?: object) => console.warn(`[WARN] ${msg}`, data || ''),
      error: (msg: string, data?: object) => console.error(`[ERROR] ${msg}`, data || ''),
    };

    console.log('\n=== Performance Test Configuration ===');
    console.log(`Provider: ${testConfig.provider.name}`);
    console.log(`Model: ${testConfig.provider.chatModel.model}`);
    console.log(`Timeout: ${testConfig.testSettings.timeoutMs}ms`);
    console.log('=====================================\n');
  });

  describe('Single Segment Extraction Timing', () => {
    it('should extract concepts from SHORT content within time limit', async () => {
      const startTime = Date.now();

      const result = await executeExtractionWorkflow(
        TEST_CONTENT.short,
        chatModel,
        testLogger,
        testConfig.testSettings.retryAttempts,
      );

      const totalTime = Date.now() - startTime;

      // Record results
      perfResults.push({
        testName: 'short_content',
        contentLength: TEST_CONTENT.short.length,
        llmInvokeMs: result.metrics.llmInvokeMs,
        jsonParseMs: result.metrics.jsonParseMs,
        validationMs: result.metrics.validationMs,
        totalMs: totalTime,
        success: result.success,
        attempt: result.attempt,
        conceptCount: result.result?.nodes.length || 0,
      });

      console.log('\n--- Short Content Results ---');
      console.log(`Content length: ${TEST_CONTENT.short.length} chars`);
      console.log(`LLM invoke: ${result.metrics.llmInvokeMs}ms`);
      console.log(`JSON parse: ${result.metrics.jsonParseMs}ms`);
      console.log(`Validation: ${result.metrics.validationMs}ms`);
      console.log(`Total time: ${totalTime}ms`);
      console.log(`Success: ${result.success}`);
      console.log(`Error: ${result.error || 'none'}`);
      console.log(`Concepts found: ${result.result?.nodes.length || 0}`);
      console.log(`Attempts: ${result.attempt}`);

      // Debug: Log the full result if failed
      if (!result.success) {
        console.log('FULL RESULT:', JSON.stringify(result, null, 2));
      }

      // Assertions
      expect(result.success).toBe(true);
      expect(totalTime).toBeLessThan(PERF_THRESHOLDS.singleSegmentMax);
      expect(result.metrics.llmInvokeMs).toBeLessThan(PERF_THRESHOLDS.llmInvokeMax);
      expect(result.metrics.validationMs).toBeLessThan(PERF_THRESHOLDS.validationMax);
    }, 120000);

    it('should extract concepts from MEDIUM content within time limit', async () => {
      const startTime = Date.now();

      const result = await executeExtractionWorkflow(
        TEST_CONTENT.medium,
        chatModel,
        testLogger,
        testConfig.testSettings.retryAttempts,
      );

      const totalTime = Date.now() - startTime;

      // Record results
      perfResults.push({
        testName: 'medium_content',
        contentLength: TEST_CONTENT.medium.length,
        llmInvokeMs: result.metrics.llmInvokeMs,
        jsonParseMs: result.metrics.jsonParseMs,
        validationMs: result.metrics.validationMs,
        totalMs: totalTime,
        success: result.success,
        attempt: result.attempt,
        conceptCount: result.result?.nodes.length || 0,
      });

      console.log('\n--- Medium Content Results ---');
      console.log(`Content length: ${TEST_CONTENT.medium.length} chars`);
      console.log(`LLM invoke: ${result.metrics.llmInvokeMs}ms`);
      console.log(`JSON parse: ${result.metrics.jsonParseMs}ms`);
      console.log(`Validation: ${result.metrics.validationMs}ms`);
      console.log(`Total time: ${totalTime}ms`);
      console.log(`Success: ${result.success}`);
      console.log(`Concepts found: ${result.result?.nodes.length || 0}`);

      expect(result.success).toBe(true);
      expect(totalTime).toBeLessThan(PERF_THRESHOLDS.singleSegmentMax);
    }, 120000);

    it('should extract concepts from LONG content within time limit', async () => {
      const startTime = Date.now();

      const result = await executeExtractionWorkflow(
        TEST_CONTENT.long,
        chatModel,
        testLogger,
        testConfig.testSettings.retryAttempts,
      );

      const totalTime = Date.now() - startTime;

      // Record results
      perfResults.push({
        testName: 'long_content',
        contentLength: TEST_CONTENT.long.length,
        llmInvokeMs: result.metrics.llmInvokeMs,
        jsonParseMs: result.metrics.jsonParseMs,
        validationMs: result.metrics.validationMs,
        totalMs: totalTime,
        success: result.success,
        attempt: result.attempt,
        conceptCount: result.result?.nodes.length || 0,
      });

      console.log('\n--- Long Content Results ---');
      console.log(`Content length: ${TEST_CONTENT.long.length} chars`);
      console.log(`LLM invoke: ${result.metrics.llmInvokeMs}ms`);
      console.log(`JSON parse: ${result.metrics.jsonParseMs}ms`);
      console.log(`Validation: ${result.metrics.validationMs}ms`);
      console.log(`Total time: ${totalTime}ms`);
      console.log(`Success: ${result.success}`);
      console.log(`Concepts found: ${result.result?.nodes.length || 0}`);

      expect(result.success).toBe(true);
      // Long content may take longer
      expect(totalTime).toBeLessThan(PERF_THRESHOLDS.longContentMax);
    }, 180000);
  });

  describe('Sequential Processing Performance', () => {
    it('should process 3 segments sequentially and measure total time', async () => {
      const segments = [TEST_CONTENT.short, TEST_CONTENT.medium, TEST_CONTENT.short];
      const segmentResults: Array<{ time: number; success: boolean }> = [];

      const totalStart = Date.now();

      for (let i = 0; i < segments.length; i++) {
        const segmentStart = Date.now();
        const result = await executeExtractionWorkflow(
          segments[i],
          chatModel,
          testLogger,
          testConfig.testSettings.retryAttempts,
        );
        segmentResults.push({
          time: Date.now() - segmentStart,
          success: result.success,
        });
      }

      const totalTime = Date.now() - totalStart;
      const avgTime = totalTime / segments.length;

      console.log('\n--- Sequential Processing Results ---');
      console.log(`Total segments: ${segments.length}`);
      console.log(`Total time: ${totalTime}ms`);
      console.log(`Average per segment: ${avgTime.toFixed(0)}ms`);
      segmentResults.forEach((r, i) => {
        console.log(`  Segment ${i + 1}: ${r.time}ms (${r.success ? 'success' : 'failed'})`);
      });

      // All should succeed
      expect(segmentResults.every((r) => r.success)).toBe(true);
      // Total time should be roughly sum of individual times
      expect(totalTime).toBeLessThan(PERF_THRESHOLDS.singleSegmentMax * segments.length);
    }, 300000);
  });

  describe('Performance Summary', () => {
    it('should output performance summary report', () => {
      console.log('\n');
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('                    PERFORMANCE SUMMARY REPORT                   ');
      console.log('═══════════════════════════════════════════════════════════════');

      if (perfResults.length === 0) {
        console.log('No performance data collected. Run other tests first.');
        return;
      }

      // Calculate averages
      const avgLLM = perfResults.reduce((sum, r) => sum + r.llmInvokeMs, 0) / perfResults.length;
      const avgTotal = perfResults.reduce((sum, r) => sum + r.totalMs, 0) / perfResults.length;
      const successRate = (perfResults.filter((r) => r.success).length / perfResults.length) * 100;

      console.log('\n📊 Overall Statistics:');
      console.log(`   Total tests: ${perfResults.length}`);
      console.log(`   Success rate: ${successRate.toFixed(1)}%`);
      console.log(`   Avg LLM time: ${avgLLM.toFixed(0)}ms`);
      console.log(`   Avg total time: ${avgTotal.toFixed(0)}ms`);

      console.log('\n📈 Breakdown by Content Size:');
      perfResults.forEach((r) => {
        const llmPercent = ((r.llmInvokeMs / r.totalMs) * 100).toFixed(1);
        console.log(`   ${r.testName}:`);
        console.log(`     Content: ${r.contentLength} chars`);
        console.log(`     LLM: ${r.llmInvokeMs}ms (${llmPercent}% of total)`);
        console.log(`     Parse: ${r.jsonParseMs}ms`);
        console.log(`     Validate: ${r.validationMs}ms`);
        console.log(`     Concepts: ${r.conceptCount}`);
      });

      console.log('\n🔍 Bottleneck Analysis:');
      const llmPct = (avgLLM / avgTotal) * 100;
      console.log(`   LLM API calls: ${llmPct.toFixed(1)}% of total time`);
      if (llmPct > 80) {
        console.log('   ⚠️  LLM is the primary bottleneck (>80% of time)');
        console.log('   💡 Consider: faster models, prompt optimization, or caching');
      }

      console.log('\n═══════════════════════════════════════════════════════════════\n');

      // This test always passes - it's just for reporting
      expect(true).toBe(true);
    });
  });
});
