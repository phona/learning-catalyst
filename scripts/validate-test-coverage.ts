#!/usr/bin/env node

/**
 * Test Coverage Validation Script
 *
 * Validates that test coverage targets are met for Phase 6 implementation.
 * This script runs coverage reports and ensures quality gates are passed.
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import path from 'path';

interface CoverageReport {
  lines: { covered: number; total: number; percentage: number };
  functions: { covered: number; total: number; percentage: number };
  branches: { covered: number; total: number; percentage: number };
  statements: { covered: number; total: number; percentage: number };
}

interface CoverageThresholds {
  businessLogic: number;    // 95%
  integrationLayers: number; // 80%
  criticalWorkflows: number; // 100%
  overall: number;          // 90%
}

const COVERAGE_THRESHOLDS: CoverageThresholds = {
  businessLogic: 95,
  integrationLayers: 80,
  criticalWorkflows: 100,
  overall: 90
};

const BUSINESS_LOGIC_PATHS = [
  'electron/main/services/**/*.{js,ts}',
  'src/modules/**/*.{js,ts}',
  'src/services/**/*.{js,ts}'
];

const INTEGRATION_LAYER_PATHS = [
  'electron/main/handlers/**/*.{js,ts}',
  'electron/preload/**/*.{js,ts}',
  'src/renderer/services/**/*.{js,ts}'
];

const CRITICAL_WORKFLOW_PATHS = [
  'test/integration/end-to-end-workflows.test.ts',
  'test/integration/multi-agent-orchestration.test.ts',
  'test/performance/concurrent-sessions.test.ts'
];

function runCommand(command: string, cwd: string = process.cwd()): string {
  try {
    return execSync(command, { cwd, encoding: 'utf8' });
  } catch (error: any) {
    console.error(`Failed to run command: ${command}`);
    console.error(error.stderr || error.message);
    process.exit(1);
  }
}

function parseCoverageReport(coverageDir: string): CoverageReport {
  const coverageFile = path.join(coverageDir, 'coverage-summary.json');

  if (!existsSync(coverageFile)) {
    throw new Error(`Coverage report not found at ${coverageFile}`);
  }

  const coverageData = JSON.parse(readFileSync(coverageFile, 'utf8'));
  const total = coverageData.total;

  return {
    lines: {
      covered: total.lines.covered,
      total: total.lines.total,
      percentage: total.lines.pct
    },
    functions: {
      covered: total.functions.covered,
      total: total.functions.total,
      percentage: total.functions.pct
    },
    branches: {
      covered: total.branches.covered,
      total: total.branches.total,
      percentage: total.branches.pct
    },
    statements: {
      covered: total.statements.covered,
      total: total.statements.total,
      percentage: total.statements.pct
    }
  };
}

function generateCoverageReport(coverageType: string, paths: string[]): string {
  console.log(`🔍 Running coverage for ${coverageType}...`);

  const pathsArg = paths.join(' ');
  const coverageDir = `coverage/${coverageType.toLowerCase().replace(/\s+/g, '-')}`;

  const command = `npx vitest run --coverage --coverage.reporter=json --coverage.reporter=text --coverage.reportsDirectory=${coverageDir} --coverage.include=${pathsArg}`;

  try {
    runCommand(command);
    return coverageDir;
  } catch (error) {
    console.error(`Failed to generate coverage for ${coverageType}`);
    throw error;
  }
}

function validateThresholds(
  coverage: CoverageReport,
  thresholds: { lines: number; functions: number; branches: number; statements: number },
  category: string
): boolean {
  console.log(`\n📊 ${category} Coverage Results:`);
  console.log(`  Lines: ${coverage.lines.percentage.toFixed(2)}% (threshold: ${thresholds.lines}%)`);
  console.log(`  Functions: ${coverage.functions.percentage.toFixed(2)}% (threshold: ${thresholds.functions}%)`);
  console.log(`  Branches: ${coverage.branches.percentage.toFixed(2)}% (threshold: ${thresholds.branches}%)`);
  console.log(`  Statements: ${coverage.statements.percentage.toFixed(2)}% (threshold: ${thresholds.statements}%)`);

  const passed =
    coverage.lines.percentage >= thresholds.lines &&
    coverage.functions.percentage >= thresholds.functions &&
    coverage.branches.percentage >= thresholds.branches &&
    coverage.statements.percentage >= thresholds.statements;

  if (passed) {
    console.log(`✅ ${category} coverage thresholds met`);
  } else {
    console.log(`❌ ${category} coverage thresholds NOT met`);
  }

  return passed;
}

function validateCriticalWorkflows(): boolean {
  console.log('\n🎯 Validating Critical Workflow Tests...');

  const criticalTests = [
    'test/integration/end-to-end-workflows.test.ts',
    'test/integration/multi-agent-orchestration.test.ts',
    'test/integration/cross-process-communication.test.ts',
    'test/integration/error-recovery.test.ts',
    'test/performance/concurrent-sessions.test.ts',
    'test/performance/memory-management.test.ts',
    'test/performance/resource-leak-detection.test.ts'
  ];

  let allTestsPass = true;

  for (const testFile of criticalTests) {
    if (!existsSync(testFile)) {
      console.log(`❌ Critical test file missing: ${testFile}`);
      allTestsPass = false;
      continue;
    }

    try {
      console.log(`  Running ${path.basename(testFile)}...`);
      runCommand(`npx vitest run ${testFile}`, path.dirname(testFile));
      console.log(`  ✅ ${path.basename(testFile)} passed`);
    } catch (error) {
      console.log(`  ❌ ${path.basename(testFile)} failed`);
      allTestsPass = false;
    }
  }

  return allTestsPass;
}

function generateSummaryReport(results: {
  businessLogic: { passed: boolean; coverage: CoverageReport };
  integrationLayers: { passed: boolean; coverage: CoverageReport };
  criticalWorkflows: { passed: boolean };
  overall: { passed: boolean; coverage: CoverageReport };
}): void {
  console.log('\n📋 PHASE 6 TEST COVERAGE SUMMARY REPORT');
  console.log('='.repeat(50));

  console.log('\n🎯 Business Logic Coverage:');
  console.log(`  Status: ${results.businessLogic.passed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`  Overall Coverage: ${results.businessLogic.coverage.statements.percentage.toFixed(2)}%`);
  console.log(`  Target: ${COVERAGE_THRESHOLDS.businessLogic}%`);

  console.log('\n🔗 Integration Layers Coverage:');
  console.log(`  Status: ${results.integrationLayers.passed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`  Overall Coverage: ${results.integrationLayers.coverage.statements.percentage.toFixed(2)}%`);
  console.log(`  Target: ${COVERAGE_THRESHOLDS.integrationLayers}%`);

  console.log('\n⚡ Critical Workflows:');
  console.log(`  Status: ${results.criticalWorkflows.passed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`  All critical integration and performance tests must pass`);

  console.log('\n📊 Overall Coverage:');
  console.log(`  Status: ${results.overall.passed ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`  Overall Coverage: ${results.overall.coverage.statements.percentage.toFixed(2)}%`);
  console.log(`  Target: ${COVERAGE_THRESHOLDS.overall}%`);

  const allPassed = results.businessLogic.passed &&
                   results.integrationLayers.passed &&
                   results.criticalWorkflows.passed &&
                   results.overall.passed;

  console.log('\n🎯 FINAL RESULT:');
  console.log(`  Status: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);

  if (allPassed) {
    console.log('\n🎉 Phase 6 Test Coverage Requirements Successfully Met!');
    console.log('   • Business Logic: ✅ ≥95% coverage');
    console.log('   • Integration Layers: ✅ ≥80% coverage');
    console.log('   • Critical Workflows: ✅ 100% tests passing');
    console.log('   • Overall Coverage: ✅ ≥90% coverage');
  } else {
    console.log('\n⚠️  Phase 6 Test Coverage Requirements NOT Met');
    console.log('   Please review the failed categories and improve coverage');
  }

  console.log('\n' + '='.repeat(50));
}

function main() {
  console.log('🚀 Starting Phase 6 Test Coverage Validation');
  console.log('Target Coverage: Business Logic ≥95%, Integration ≥80%, Overall ≥90%');
  console.log('');

  try {
    // Validate critical workflow tests first
    const criticalWorkflowsPassed = validateCriticalWorkflows();

    if (!criticalWorkflowsPassed) {
      console.log('\n❌ Critical workflow tests failed. Aborting coverage validation.');
      process.exit(1);
    }

    // Generate coverage reports for different categories
    console.log('\n📊 Generating coverage reports...');

    const businessLogicDir = generateCoverageReport('Business-Logic', BUSINESS_LOGIC_PATHS);
    const integrationLayersDir = generateCoverageReport('Integration-Layers', INTEGRATION_LAYER_PATHS);

    // Parse coverage reports
    const businessLogicCoverage = parseCoverageReport(businessLogicDir);
    const integrationLayersCoverage = parseCoverageReport(integrationLayersDir);

    // Run overall coverage
    const overallDir = generateCoverageReport('Overall', [
      ...BUSINESS_LOGIC_PATHS,
      ...INTEGRATION_LAYER_PATHS
    ]);
    const overallCoverage = parseCoverageReport(overallDir);

    // Validate thresholds
    const businessLogicPassed = validateThresholds(
      businessLogicCoverage,
      {
        lines: COVERAGE_THRESHOLDS.businessLogic,
        functions: COVERAGE_THRESHOLDS.businessLogic,
        branches: COVERAGE_THRESHOLDS.businessLogic,
        statements: COVERAGE_THRESHOLDS.businessLogic
      },
      'Business Logic'
    );

    const integrationLayersPassed = validateThresholds(
      integrationLayersCoverage,
      {
        lines: COVERAGE_THRESHOLDS.integrationLayers,
        functions: COVERAGE_THRESHOLDS.integrationLayers,
        branches: COVERAGE_THRESHOLDS.integrationLayers,
        statements: COVERAGE_THRESHOLDS.integrationLayers
      },
      'Integration Layers'
    );

    const overallPassed = validateThresholds(
      overallCoverage,
      {
        lines: COVERAGE_THRESHOLDS.overall,
        functions: COVERAGE_THRESHOLDS.overall,
        branches: COVERAGE_THRESHOLDS.overall,
        statements: COVERAGE_THRESHOLDS.overall
      },
      'Overall'
    );

    // Generate summary report
    generateSummaryReport({
      businessLogic: { passed: businessLogicPassed, coverage: businessLogicCoverage },
      integrationLayers: { passed: integrationLayersPassed, coverage: integrationLayersCoverage },
      criticalWorkflows: { passed: criticalWorkflowsPassed },
      overall: { passed: overallPassed, coverage: overallCoverage }
    });

    // Exit with appropriate code
    const allTestsPassed = businessLogicPassed && integrationLayersPassed &&
                          criticalWorkflowsPassed && overallPassed;

    process.exit(allTestsPassed ? 0 : 1);

  } catch (error) {
    console.error('❌ Coverage validation failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}