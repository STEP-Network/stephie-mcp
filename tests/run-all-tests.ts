#!/usr/bin/env tsx
/**
 * Test runner for all MCP tools
 * Executes tests and generates a comprehensive report
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface TestResult {
  tool: string;
  category: string;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  errors: string[];
}

interface TestReport {
  timestamp: string;
  totalTools: number;
  totalTests: number;
  totalPassed: number;
  totalFailed: number;
  totalSkipped: number;
  totalDuration: number;
  results: TestResult[];
  summary: {
    byCategory: Record<string, {
      tools: number;
      tests: number;
      passed: number;
      failed: number;
    }>;
    failedTools: string[];
    slowestTools: Array<{ tool: string; duration: number }>;
  };
}

const TEST_CATEGORIES = {
  crm: ['getAccounts', 'getContacts', 'getLeads'],
  sales: ['getOpportunities', 'getSalesActivities', 'getBookings', 'getDeals'],
  tasks: ['getTasksTechIntelligence', 'getTasksAdOps', 'getTasksMarketing'],
  hr: ['getPeople', 'getTeams'],
  strategy: ['getOKR'],
  support: ['getTickets'],
  dev: ['getBugs', 'getFeatures'],
  finance: ['getMarketingBudgets', 'getMarketingExpenses']
};

async function runTestFile(filePath: string): Promise<TestResult | null> {
  const toolName = path.basename(filePath, '.test.ts');
  const category = path.basename(path.dirname(filePath));
  
  console.log(`  📝 Testing ${toolName}...`);
  
  try {
    const startTime = Date.now();
    const { stdout, stderr } = await execAsync(
      `npx vitest run ${filePath} --reporter=json`,
      { cwd: path.join(__dirname, '..') }
    );
    
    const duration = Date.now() - startTime;
    
    // Parse vitest JSON output
    let testData: any;
    try {
      testData = JSON.parse(stdout);
    } catch {
      // Fallback parsing if JSON is not clean
      const jsonMatch = stdout.match(/\{[\s\S]*\}/);
      testData = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    }
    
    const stats = testData.testResults?.[0] || {};
    
    return {
      tool: toolName,
      category,
      passed: stats.numPassingTests || 0,
      failed: stats.numFailingTests || 0,
      skipped: stats.numPendingTests || 0,
      duration,
      errors: stats.failureMessages || []
    };
  } catch (error) {
    console.error(`    ❌ Error testing ${toolName}:`, error);
    return {
      tool: toolName,
      category,
      passed: 0,
      failed: 1,
      skipped: 0,
      duration: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
}

async function collectTestData() {
  console.log('📊 Collecting test data from Monday.com...\n');
  
  try {
    const { stdout } = await execAsync(
      'npx tsx tests/utils/collect-test-data.ts',
      { cwd: path.join(__dirname, '..') }
    );
    console.log(stdout);
    console.log('✅ Test data collected successfully\n');
  } catch (error) {
    console.error('❌ Failed to collect test data:', error);
    console.log('⚠️  Continuing with existing test data...\n');
  }
}

async function runAllTests(): Promise<TestReport> {
  const results: TestResult[] = [];
  const startTime = Date.now();
  
  console.log('🧪 Running all tool tests...\n');
  
  // Run tests by category
  for (const [category, tools] of Object.entries(TEST_CATEGORIES)) {
    console.log(`\n📁 ${category.toUpperCase()} Tools:`);
    
    for (const tool of tools) {
      const testFile = path.join(
        __dirname,
        'tools',
        category === 'strategy' ? 'strategy' :
        category === 'operations' ? 'operations' :
        category,
        `${tool}.test.ts`
      );
      
      if (fs.existsSync(testFile)) {
        const result = await runTestFile(testFile);
        if (result) {
          results.push(result);
          
          // Show inline result
          const icon = result.failed > 0 ? '❌' : '✅';
          console.log(`    ${icon} ${result.passed}/${result.passed + result.failed} tests passed (${result.duration}ms)`);
        }
      } else {
        console.log(`    ⚠️  Test file not found: ${tool}`);
      }
    }
  }
  
  const totalDuration = Date.now() - startTime;
  
  // Calculate summary
  const summary = {
    byCategory: {} as Record<string, any>,
    failedTools: results.filter(r => r.failed > 0).map(r => r.tool),
    slowestTools: results
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 5)
      .map(r => ({ tool: r.tool, duration: r.duration }))
  };
  
  // Group by category
  for (const result of results) {
    if (!summary.byCategory[result.category]) {
      summary.byCategory[result.category] = {
        tools: 0,
        tests: 0,
        passed: 0,
        failed: 0
      };
    }
    
    const cat = summary.byCategory[result.category];
    cat.tools++;
    cat.tests += result.passed + result.failed + result.skipped;
    cat.passed += result.passed;
    cat.failed += result.failed;
  }
  
  return {
    timestamp: new Date().toISOString(),
    totalTools: results.length,
    totalTests: results.reduce((sum, r) => sum + r.passed + r.failed + r.skipped, 0),
    totalPassed: results.reduce((sum, r) => sum + r.passed, 0),
    totalFailed: results.reduce((sum, r) => sum + r.failed, 0),
    totalSkipped: results.reduce((sum, r) => sum + r.skipped, 0),
    totalDuration,
    results,
    summary
  };
}

function generateReport(report: TestReport) {
  console.log('\n' + '='.repeat(80));
  console.log('📊 TEST REPORT');
  console.log('='.repeat(80));
  
  console.log(`\n📅 Timestamp: ${report.timestamp}`);
  console.log(`⏱️  Total Duration: ${(report.totalDuration / 1000).toFixed(2)}s`);
  
  console.log('\n📈 Overall Statistics:');
  console.log(`  - Tools Tested: ${report.totalTools}`);
  console.log(`  - Total Tests: ${report.totalTests}`);
  console.log(`  - Passed: ${report.totalPassed} (${((report.totalPassed / report.totalTests) * 100).toFixed(1)}%)`);
  console.log(`  - Failed: ${report.totalFailed} (${((report.totalFailed / report.totalTests) * 100).toFixed(1)}%)`);
  console.log(`  - Skipped: ${report.totalSkipped}`);
  
  console.log('\n📁 By Category:');
  for (const [category, stats] of Object.entries(report.summary.byCategory)) {
    const passRate = ((stats.passed / stats.tests) * 100).toFixed(1);
    console.log(`  ${category}:`);
    console.log(`    - Tools: ${stats.tools}`);
    console.log(`    - Tests: ${stats.tests}`);
    console.log(`    - Pass Rate: ${passRate}%`);
  }
  
  if (report.summary.failedTools.length > 0) {
    console.log('\n❌ Failed Tools:');
    for (const tool of report.summary.failedTools) {
      const result = report.results.find(r => r.tool === tool);
      console.log(`  - ${tool}: ${result?.failed} failures`);
      if (result?.errors.length) {
        console.log(`    First error: ${result.errors[0].substring(0, 100)}...`);
      }
    }
  }
  
  console.log('\n🐌 Slowest Tools:');
  for (const { tool, duration } of report.summary.slowestTools) {
    console.log(`  - ${tool}: ${(duration / 1000).toFixed(2)}s`);
  }
  
  // Save detailed report to file
  const reportPath = path.join(__dirname, 'reports', `test-report-${Date.now()}.json`);
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`\n💾 Detailed report saved to: ${reportPath}`);
  
  // Exit code based on failures
  const exitCode = report.totalFailed > 0 ? 1 : 0;
  console.log(`\n${exitCode === 0 ? '✅' : '❌'} Test run ${exitCode === 0 ? 'successful' : 'failed'}`);
  
  return exitCode;
}

async function main() {
  console.log('🚀 MCP Tools Test Runner\n');
  
  // Check if we should collect fresh data
  const args = process.argv.slice(2);
  if (args.includes('--collect-data')) {
    await collectTestData();
  } else {
    console.log('💡 Tip: Use --collect-data flag to fetch fresh test data\n');
  }
  
  // Run all tests
  const report = await runAllTests();
  
  // Generate and display report
  const exitCode = generateReport(report);
  
  process.exit(exitCode);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}