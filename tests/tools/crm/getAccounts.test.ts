import { describe, it, expect, beforeAll } from 'vitest';
import { getAccounts } from '../../../lib/tools/crm/getAccounts.js';
import {
  validateToolOutput,
  validateFilter,
  extractItemCount,
  validatePagination,
  validateSearch,
  validateStatusFilter,
  validateRelationFilter,
  compareOutputs
} from '../../utils/validators.js';
import {
  createTestContext,
  getSampleIds,
  getRelatedIds,
  TestTimer
} from '../../utils/test-helpers.js';

describe('getAccounts', () => {
  let context: any;
  let baselineOutput: string;
  
  beforeAll(async () => {
    // Note: In real tests, this would load from test-data.json
    // For now, we'll test with live data
    const timer = new TestTimer('getAccounts baseline');
    baselineOutput = await getAccounts({ limit: 10 });
    timer.end();
  });
  
  describe('Basic functionality', () => {
    it('should return valid markdown output', async () => {
      const output = await getAccounts();
      validateToolOutput(output, 'getAccounts');
    });
    
    it('should include required fields', async () => {
      const output = await getAccounts({ limit: 5 });
      
      expect(output).toContain('# Accounts');
      expect(output).toContain('**Total Items:**');
      
      // If there are items, check for IDs
      const itemCount = extractItemCount(output);
      if (itemCount > 0) {
        expect(output).toContain('**ID:**');
      }
    });
    
    it('should handle empty results gracefully', async () => {
      // Search for something unlikely to exist
      const output = await getAccounts({ 
        search: 'XXXXNONEXISTENTXXXX' 
      });
      
      validateToolOutput(output, 'getAccounts');
      expect(extractItemCount(output)).toBe(0);
    });
  });
  
  describe('Pagination', () => {
    it('should respect limit parameter', async () => {
      const fullOutput = await getAccounts({ limit: 20 });
      const limitedOutput = await getAccounts({ limit: 5 });
      
      validatePagination(fullOutput, limitedOutput, 5);
    });
    
    it('should handle limit edge cases', async () => {
      const outputs = await Promise.all([
        getAccounts({ limit: 1 }),
        getAccounts({ limit: 100 }),
        getAccounts({ limit: 200 })
      ]);
      
      outputs.forEach(output => {
        validateToolOutput(output, 'getAccounts');
      });
    });
  });
  
  describe('Search functionality', () => {
    it('should filter by search term', async () => {
      // First get some accounts to search for
      const baseOutput = await getAccounts({ limit: 3 });
      const nameMatch = baseOutput.match(/## (.+)/);
      
      if (nameMatch) {
        const searchTerm = nameMatch[1].split(' ')[0]; // Get first word
        const searchOutput = await getAccounts({ 
          search: searchTerm,
          limit: 10 
        });
        
        validateSearch(searchOutput, searchTerm);
      }
    });
    
    it('should handle special characters in search', async () => {
      const specialSearches = ['&', '%', '()'];
      
      for (const search of specialSearches) {
        const output = await getAccounts({ search, limit: 5 });
        validateToolOutput(output, 'getAccounts');
      }
    });
  });
  
  describe('Status filters', () => {
    it('should filter by status', async () => {
      // Test different status values
      const statuses = [0, 1, 2, 3];
      
      for (const status of statuses) {
        const output = await getAccounts({ status, limit: 5 });
        validateToolOutput(output, 'getAccounts');
        validateStatusFilter(output, status);
      }
    });
    
    it('should filter by status5 (Type)', async () => {
      const output = await getAccounts({ status5: 0, limit: 5 });
      validateToolOutput(output, 'getAccounts');
      validateStatusFilter(output, 0);
    });
  });
  
  describe('Board relation filters', () => {
    it('should filter by contactsId', async () => {
      // Get a contact ID to test with
      const { getContacts } = await import('../../../lib/tools/crm/getContacts.js');
      const contactsOutput = await getContacts({ limit: 1 });
      const contactIdMatch = contactsOutput.match(/- \*\*ID:\*\* (\d+)/);
      
      if (contactIdMatch) {
        const contactId = contactIdMatch[1];
        const output = await getAccounts({ 
          contactsId: contactId,
          limit: 10 
        });
        
        validateToolOutput(output, 'getAccounts');
        validateRelationFilter(output, contactId, 'Contact');
      }
    });
    
    it('should filter by opportunitiesId', async () => {
      // Get an opportunity ID to test with
      const { getOpportunities } = await import('../../../lib/tools/sales/getOpportunities.js');
      const oppOutput = await getOpportunities({ limit: 1 });
      const oppIdMatch = oppOutput.match(/- \*\*ID:\*\* (\d+)/);
      
      if (oppIdMatch) {
        const oppId = oppIdMatch[1];
        const output = await getAccounts({ 
          opportunitiesId: oppId,
          limit: 10 
        });
        
        validateToolOutput(output, 'getAccounts');
        validateRelationFilter(output, oppId, 'Opportunity');
      }
    });
    
    it('should filter by leadsId', async () => {
      // Get a lead ID to test with
      const { getLeads } = await import('../../../lib/tools/crm/getLeads.js');
      const leadsOutput = await getLeads({ limit: 1 });
      const leadIdMatch = leadsOutput.match(/- \*\*ID:\*\* (\d+)/);
      
      if (leadIdMatch) {
        const leadId = leadIdMatch[1];
        const output = await getAccounts({ 
          leadsId: leadId,
          limit: 10 
        });
        
        validateToolOutput(output, 'getAccounts');
        validateRelationFilter(output, leadId, 'Lead');
      }
    });
  });
  
  describe('Combined filters', () => {
    it('should handle multiple filters together', async () => {
      const output = await getAccounts({
        limit: 5,
        status: 0,
        search: 'a' // Common letter to likely get results
      });
      
      validateToolOutput(output, 'getAccounts');
      
      // Should be more restrictive than individual filters
      const statusOnly = await getAccounts({ status: 0, limit: 20 });
      const searchOnly = await getAccounts({ search: 'a', limit: 20 });
      
      const combinedCount = extractItemCount(output);
      const statusCount = extractItemCount(statusOnly);
      const searchCount = extractItemCount(searchOnly);
      
      expect(combinedCount).toBeLessThanOrEqual(Math.min(statusCount, searchCount));
    });
    
    it('should handle all parameters simultaneously', async () => {
      const output = await getAccounts({
        limit: 3,
        search: 'test',
        people: 'admin',
        status: 0,
        status5: 0
      });
      
      validateToolOutput(output, 'getAccounts');
    });
  });
  
  describe('Error handling', () => {
    it('should handle invalid status values gracefully', async () => {
      const output = await getAccounts({ status: 999 });
      validateToolOutput(output, 'getAccounts');
      // Should return empty or no results for invalid status
      expect(extractItemCount(output)).toBe(0);
    });
    
    it('should handle extremely large limits', async () => {
      // Monday.com caps at 500, so we need to handle this gracefully
      try {
        const output = await getAccounts({ limit: 10000 });
        validateToolOutput(output, 'getAccounts');
        // If it succeeds, check it's capped at 500
        expect(extractItemCount(output)).toBeLessThanOrEqual(500);
      } catch (error) {
        // Expected error for limits > 500
        expect(error).toBeDefined();
        expect(error.message).toContain('cannot be greater than 500');
      }
    });
  });
  
  describe('Performance', () => {
    it('should complete within reasonable time', async () => {
      const timer = new TestTimer('Performance test');
      await getAccounts({ limit: 50 });
      const duration = timer.end();
      
      expect(duration).toBeLessThan(10000); // 10 seconds
    });
    
    it('should handle parallel requests', async () => {
      const timer = new TestTimer('Parallel requests');
      
      const results = await Promise.all([
        getAccounts({ limit: 5 }),
        getAccounts({ status: 0, limit: 5 }),
        getAccounts({ search: 'test', limit: 5 })
      ]);
      
      timer.end();
      
      results.forEach(output => {
        validateToolOutput(output, 'getAccounts');
      });
    });
  });
});