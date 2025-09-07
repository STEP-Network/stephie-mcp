/**
 * Test helper utilities
 */

import { vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Load test data from fixtures
 */
export function loadTestData(boardKey: string): any {
  const dataPath = path.join(__dirname, '../fixtures/test-data.json');
  
  if (!fs.existsSync(dataPath)) {
    throw new Error('Test data not found. Run: pnpm test:collect-data');
  }
  
  const allData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  return allData[boardKey];
}

/**
 * Get sample item IDs for relation testing
 */
export function getSampleIds(boardKey: string, count: number = 3): string[] {
  const data = loadTestData(boardKey);
  if (!data || !data.items) return [];
  
  return data.items
    .slice(0, count)
    .map((item: any) => item.id)
    .filter(Boolean);
}

/**
 * Get a sample item with a specific column value
 */
export function findItemWithColumn(
  boardKey: string,
  columnId: string
): { id: string; value: any } | null {
  const data = loadTestData(boardKey);
  if (!data || !data.items) return null;
  
  for (const item of data.items) {
    const column = item.column_values?.find((c: any) => c.id === columnId);
    if (column?.value && column.value !== '{}' && column.value !== 'null') {
      return { id: item.id, value: column.value };
    }
  }
  
  return null;
}

/**
 * Get related item IDs from a board relation column
 */
export function getRelatedIds(
  boardKey: string,
  relationColumnId: string
): string[] {
  const item = findItemWithColumn(boardKey, relationColumnId);
  if (!item) return [];
  
  try {
    const value = typeof item.value === 'string' ? JSON.parse(item.value) : item.value;
    return value?.linkedItemIds || [];
  } catch {
    return [];
  }
}

/**
 * Mock Monday API for testing
 */
export function mockMondayApi(responseData: any) {
  return vi.fn().mockResolvedValue({
    data: responseData
  });
}

/**
 * Create test context with common data
 */
export interface TestContext {
  boardKey: string;
  boardData: any;
  sampleIds: string[];
  toolName: string;
}

export function createTestContext(boardKey: string, toolName: string): TestContext {
  const boardData = loadTestData(boardKey);
  const sampleIds = getSampleIds(boardKey);
  
  return {
    boardKey,
    boardData,
    sampleIds,
    toolName
  };
}

/**
 * Test filter combinations
 */
export interface FilterTest {
  name: string;
  params: Record<string, any>;
  validate: (output: string) => void;
}

export function createFilterTests(
  baseTests: FilterTest[],
  additionalTests: FilterTest[] = []
): FilterTest[] {
  return [...baseTests, ...additionalTests];
}

/**
 * Run a test with timeout handling
 */
export async function runWithTimeout<T>(
  fn: () => Promise<T>,
  timeout: number = 10000
): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error('Test timeout')), timeout)
    )
  ]);
}

/**
 * Compare two outputs for consistency
 */
export function assertOutputConsistency(
  output1: string,
  output2: string,
  message?: string
): void {
  // Both should be valid markdown
  expect(output1).toBeTruthy();
  expect(output2).toBeTruthy();
  
  // Both should have same structure
  const hasHeader1 = output1.includes('#');
  const hasHeader2 = output2.includes('#');
  expect(hasHeader1).toBe(hasHeader2);
  
  if (message) {
    console.log(message);
  }
}

/**
 * Generate test cases for all filters of a tool
 */
export function generateFilterTestCases(
  params: Record<string, any>,
  testData: any
): Array<{ name: string; params: Record<string, any> }> {
  const testCases: Array<{ name: string; params: Record<string, any> }> = [];
  
  // Test each parameter individually
  for (const [key, value] of Object.entries(params)) {
    if (key === 'limit') continue; // Skip limit as it's tested separately
    
    testCases.push({
      name: `with ${key} filter`,
      params: { [key]: value, limit: 5 }
    });
  }
  
  // Test combinations of 2 parameters
  const paramKeys = Object.keys(params).filter(k => k !== 'limit');
  for (let i = 0; i < paramKeys.length - 1; i++) {
    for (let j = i + 1; j < paramKeys.length; j++) {
      testCases.push({
        name: `with ${paramKeys[i]} and ${paramKeys[j]} filters`,
        params: {
          [paramKeys[i]]: params[paramKeys[i]],
          [paramKeys[j]]: params[paramKeys[j]],
          limit: 5
        }
      });
    }
  }
  
  return testCases;
}

/**
 * Performance timer for tests
 */
export class TestTimer {
  private start: number;
  private name: string;
  
  constructor(name: string) {
    this.name = name;
    this.start = Date.now();
  }
  
  end(): number {
    const duration = Date.now() - this.start;
    console.log(`  ⏱️  ${this.name}: ${duration}ms`);
    return duration;
  }
}