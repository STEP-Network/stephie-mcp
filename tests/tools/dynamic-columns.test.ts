import { describe, it, expect, beforeAll } from 'vitest';
import { getDynamicColumns } from '../../lib/tools/dynamic-columns.js';
import { mondayApi } from '../../lib/monday/client.js';

describe('Dynamic Columns System', () => {
  describe('getDynamicColumns', () => {
    it('should return columns for a valid board ID', async () => {
      // Test with Accounts board
      const columns = await getDynamicColumns('1402911027');
      
      expect(Array.isArray(columns)).toBe(true);
      expect(columns.length).toBeGreaterThan(0);
      
      // Should include common columns
      expect(columns).toContain('name');
      expect(columns).toContain('people');
      expect(columns).toContain('status');
    });
    
    it('should return columns for a board name', async () => {
      // Test with board name
      const columns = await getDynamicColumns('Accounts');
      
      expect(Array.isArray(columns)).toBe(true);
      expect(columns.length).toBeGreaterThan(0);
    });
    
    it('should return default columns for unknown board', async () => {
      const columns = await getDynamicColumns('99999999999');
      
      expect(Array.isArray(columns)).toBe(true);
      // Should return minimal defaults
      expect(columns).toContain('name');
      expect(columns).toContain('status');
      expect(columns.length).toBeLessThanOrEqual(20);
    });
    
    it('should handle board names case-insensitively', async () => {
      const columns1 = await getDynamicColumns('accounts');
      const columns2 = await getDynamicColumns('ACCOUNTS');
      const columns3 = await getDynamicColumns('Accounts');
      
      expect(columns1).toEqual(columns2);
      expect(columns2).toEqual(columns3);
    });
  });
  
  describe('Column Coverage', () => {
    it('should have columns configured for major boards', async () => {
      const boards = [
        { id: '1402911027', name: 'Accounts' },
        { id: '1402911034', name: 'Contacts' },  // Correct ID from meta board
        { id: '1402911049', name: 'Opportunities' },  // Correct ID from meta board
        { id: '1693359113', name: 'Tasks - Marketing' },
        { id: '1631918659', name: 'OKR' }  // Correct ID from meta board
      ];
      
      for (const board of boards) {
        const columns = await getDynamicColumns(board.id);
        
        expect(columns.length).toBeGreaterThan(5, 
          `Board ${board.name} should have more than 5 columns configured`);
        
        // Most boards have 'name' column but not all (e.g., OKR doesn't)
        // So we just check that columns are configured
        
        console.log(`✓ ${board.name}: ${columns.length} columns`);
      }
    });
  });
  
  describe('Columns Board Integration', () => {
    it('should fetch columns from Columns board', async () => {
      // Query the Columns board directly to verify data exists
      const query = `
        query {
          boards(ids: [2135717897]) {
            items_page(limit: 5) {
              items {
                name
                column_values(ids: ["text_mkvjc46e", "board_relation_mkvjb1w9"]) {
                  id
                  text
                  ... on BoardRelationValue {
                    linked_item_ids
                  }
                }
              }
            }
          }
        }
      `;
      
      const response = await mondayApi(query);
      const items = response.data?.boards?.[0]?.items_page?.items || [];
      
      expect(items.length).toBeGreaterThan(0, 'Columns board should have items');
      
      // Each item should have a column ID and board relation
      for (const item of items) {
        const columnId = item.column_values.find((c: any) => c.id === 'text_mkvjc46e');
        expect(columnId?.text).toBeTruthy();
      }
    });
  });
  
  describe('Tool Integration', () => {
    it('should be used by migrated tools', async () => {
      // Import a migrated tool and verify it uses dynamic columns
      const { getAccounts } = await import('../../lib/tools/crm/getAccounts.js');
      
      // The tool should work correctly with dynamic columns
      const result = await getAccounts({ limit: 2 });
      
      expect(result).toContain('# Accounts');
      expect(result).toContain('**Total Items:**');
      
      // Should have multiple column values if dynamic columns are working
      // With limit=2, not all columns may have values, but should have more than default (2)
      const columnMatches = result.match(/- \*\*/g) || [];
      expect(columnMatches.length).toBeGreaterThan(4, 
        'Should show more columns than the default when dynamic columns are working');
    });
  });
});