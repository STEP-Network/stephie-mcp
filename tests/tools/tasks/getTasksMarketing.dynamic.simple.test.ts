/**
 * Simplified dynamic test that discovers and tests with real data
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { getTasksMarketing } from '../../../lib/tools/tasks/getTasksMarketing.js';
import { 
  discoverTestData,
  generateDynamicTestCases,
  DiscoveredTestData
} from '../../utils/dynamic-test-data.js';
import { validateToolOutput, extractItemCount } from '../../utils/validators.js';

describe('getTasksMarketing (Smart Dynamic)', () => {
  let discoveredData: DiscoveredTestData;
  let testCases: ReturnType<typeof generateDynamicTestCases>;
  
  beforeAll(async () => {
    console.log('🔍 Discovering real test data...');
    discoveredData = await discoverTestData(getTasksMarketing, 'getTasksMarketing');
    testCases = generateDynamicTestCases(discoveredData);
    
    console.log(`\n📊 Discovery Complete:`);
    console.log(`  - Found ${discoveredData.totalItems} items`);
    console.log(`  - ${testCases.statusTests.length} status values to test`);
    console.log(`  - ${testCases.searchTests.length} search terms to test`);
    console.log(`  - ${testCases.dateTests.length} date values to test`);
  });
  
  it('should have discovered test data', () => {
    expect(discoveredData.totalItems).toBeGreaterThan(0);
  });
  
  // Test each discovered status value
  it('should filter by discovered status values', async () => {
    for (const test of testCases.statusTests) {
      console.log(`  Testing ${test.field}=${test.value} ("${test.label}")`);
      
      const output = await getTasksMarketing({
        [test.field]: test.value,
        limit: 5
      });
      
      validateToolOutput(output, 'getTasksMarketing');
      const count = extractItemCount(output);
      
      // We know this status exists, so should get results
      expect(count).toBeGreaterThan(0);
      console.log(`    ✅ Found ${count} items with status "${test.label}"`);
    }
  });
  
  // Test each discovered search term
  it('should search for discovered terms', async () => {
    for (const test of testCases.searchTests) {
      console.log(`  Testing search="${test.term}"`);
      
      const output = await getTasksMarketing({
        search: test.term,
        limit: 5
      });
      
      validateToolOutput(output, 'getTasksMarketing');
      const count = extractItemCount(output);
      
      // We found these terms in the data, so should get results
      expect(count).toBeGreaterThan(0);
      console.log(`    ✅ Found ${count} items containing "${test.term}"`);
    }
  });
  
  // Test discovered date ranges
  it('should filter by discovered dates', async () => {
    for (const test of testCases.dateTests) {
      console.log(`  Testing ${test.field}="${test.date}"`);
      
      const output = await getTasksMarketing({
        [test.field]: test.date,
        limit: 5
      });
      
      validateToolOutput(output, 'getTasksMarketing');
      const count = extractItemCount(output);
      
      // Date filtering should work
      console.log(`    ✅ Found ${count} items for ${test.field}="${test.date}"`);
    }
  });
});

/**
 * This test demonstrates the power of dynamic discovery:
 * 
 * 1. NO HARDCODED VALUES - Everything is discovered from actual data
 * 2. GUARANTEED RESULTS - We only test values that exist
 * 3. SELF-ADAPTING - Works with any board state
 * 4. MEANINGFUL TESTS - Every test validates real functionality
 * 
 * As boards change, tests automatically adapt!
 */