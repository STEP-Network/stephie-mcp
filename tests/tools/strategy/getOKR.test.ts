import { describe, it, expect, beforeAll } from 'vitest';
import { getOKR } from '../../../lib/tools/strategy/getOKR.js';
import {
  validateToolOutput,
  validateOKRStructure,
  extractItemCount,
  validatePagination
} from '../../utils/validators.js';
import { TestTimer } from '../../utils/test-helpers.js';

describe('getOKR', () => {
  let baselineOutput: string;
  
  beforeAll(async () => {
    const timer = new TestTimer('getOKR baseline');
    baselineOutput = await getOKR({ limit: 10 });
    timer.end();
  });
  
  describe('Basic functionality', () => {
    it('should return valid OKR structure', async () => {
      const output = await getOKR();
      validateOKRStructure(output);
    });
    
    it('should include objectives and key results', async () => {
      const output = await getOKR({ limit: 5 });
      
      expect(output).toContain('# OKR');
      expect(output).toContain('**Total Objectives:**');
      
      // If there are objectives, check for structure
      if (output.includes('## ')) {
        expect(output).toMatch(/##\s+.+/);
        expect(output).toContain('**ID:**');
      }
      
      // Check for summary section
      expect(output).toContain('## 📊 Summary');
    });
    
    it('should handle empty results gracefully', async () => {
      const output = await getOKR({ 
        search: 'XXXXNONEXISTENTXXXX' 
      });
      
      validateOKRStructure(output);
      expect(output).toContain('**Total Objectives:** 0');
    });
  });
  
  describe('Pagination', () => {
    it('should respect limit parameter', async () => {
      const fullOutput = await getOKR({ limit: 20 });
      const limitedOutput = await getOKR({ limit: 5 });
      
      validatePagination(fullOutput, limitedOutput, 5);
    });
  });
  
  describe('Search functionality', () => {
    it('should filter by search term', async () => {
      const searchTerms = ['growth', 'revenue', 'Q1'];
      
      for (const term of searchTerms) {
        const output = await getOKR({ 
          search: term,
          limit: 10 
        });
        
        validateOKRStructure(output);
      }
    });
  });
  
  describe('Status filters', () => {
    it('should filter by status', async () => {
      const statuses = [0, 1, 2];
      
      for (const status of statuses) {
        const output = await getOKR({ status, limit: 5 });
        validateOKRStructure(output);
      }
    });
    
    it('should filter by timeframe', async () => {
      const output = await getOKR({ timeframe: 'Q1', limit: 5 });
      validateOKRStructure(output);
    });
  });
  
  describe('Performance', () => {
    it('should complete within reasonable time', async () => {
      const timer = new TestTimer('OKR performance test');
      await getOKR({ limit: 50 });
      const duration = timer.end();
      
      expect(duration).toBeLessThan(10000);
    });
  });
});