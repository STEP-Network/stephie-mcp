#!/usr/bin/env tsx
/**
 * Verifies the Columns board setup
 */

import { config } from 'dotenv';
import { mondayApi } from '../lib/monday/client.js';

config({ path: '.env.local' });

const COLUMNS_BOARD_ID = '2135717897';

async function verifyColumnsBoard() {
  const query = `
    query {
      boards(ids: [${COLUMNS_BOARD_ID}]) {
        name
        items_page(limit: 500) {
          items {
            name
            column_values(ids: ["text_mkvjc46e", "board_relation_mkvjb1w9"]) {
              id
              text
              value
            }
          }
        }
      }
    }
  `;
  
  try {
    console.log('📊 Verifying Columns board...\n');
    
    const response = await mondayApi(query);
    const board = response.data?.boards?.[0];
    const items = board?.items_page?.items || [];
    
    console.log(`Board: ${board.name}`);
    console.log(`Total column items: ${items.length}\n`);
    
    // Group by board
    const byBoard = new Map<string, Array<{ name: string; columnId: string }>>();
    
    items.forEach((item: any) => {
      const columnId = item.column_values.find((c: any) => c.id === 'text_mkvjc46e')?.text || 'unknown';
      const boardRelation = item.column_values.find((c: any) => c.id === 'board_relation_mkvjb1w9');
      
      let boardName = 'Unknown Board';
      if (boardRelation?.value) {
        try {
          const parsed = JSON.parse(boardRelation.value);
          // We'd need another query to get board names from IDs, for now just use the ID
          boardName = `Board ${parsed.item_ids?.[0] || 'unknown'}`;
        } catch {
          boardName = boardRelation.text || 'Unknown Board';
        }
      }
      
      if (!byBoard.has(boardName)) {
        byBoard.set(boardName, []);
      }
      
      byBoard.get(boardName)!.push({
        name: item.name,
        columnId
      });
    });
    
    // Display grouped results
    console.log('Columns by board:\n');
    for (const [boardName, columns] of byBoard) {
      console.log(`📋 ${boardName}: ${columns.length} columns`);
      
      // Show first 5 columns as examples
      columns.slice(0, 5).forEach(col => {
        console.log(`   - ${col.name} (${col.columnId})`);
      });
      
      if (columns.length > 5) {
        console.log(`   ... and ${columns.length - 5} more`);
      }
      console.log('');
    }
    
    // Statistics
    const columnIds = new Set(items.map((item: any) => 
      item.column_values.find((c: any) => c.id === 'text_mkvjc46e')?.text
    ).filter(Boolean));
    
    console.log('📈 Statistics:');
    console.log(`  Total unique column IDs: ${columnIds.size}`);
    console.log(`  Total column items: ${items.length}`);
    console.log(`  Boards with columns: ${byBoard.size}`);
    
    if (columnIds.size !== items.length) {
      console.log(`\n⚠️  Warning: Found ${items.length - columnIds.size} duplicate column IDs`);
    }
    
  } catch (error) {
    console.error('❌ Failed to verify Columns board:', error);
  }
}

verifyColumnsBoard();