#!/usr/bin/env npx tsx
/**
 * Get status and dropdown column mappings for a specific board
 */

import { config } from 'dotenv';
import { mondayApi } from '../lib/monday/client.js';

config({ path: '.env.local' });

// Board to check - can be changed as needed
const BOARD_ID = process.argv[2] || '1625485665'; // Accounts board
const BOARD_NAME = process.argv[3] || 'Accounts';

async function getBoardMappings() {
  const query = `
    query {
      boards(ids: [${BOARD_ID}]) {
        name
        columns(types: [status, dropdown]) {
          id
          title
          type
          settings_str
        }
      }
    }
  `;

  try {
    const response = await mondayApi(query);
    const board = response.data?.boards?.[0];
    
    if (board) {
      console.log(`\n=== ${board.name || BOARD_NAME} Board (${BOARD_ID}) ===`);
      
      const mappings: any = {};
      
      for (const col of board.columns) {
        const settings = JSON.parse(col.settings_str);
        if (settings.labels) {
          console.log(`\n${col.id} (${col.title}):`);
          
          const indexMapping: Record<number, string> = {};
          for (const [idx, label] of Object.entries(settings.labels)) {
            const index = parseInt(idx);
            indexMapping[index] = label as string;
            console.log(`  ${index}: ${label}`);
          }
          
          mappings[col.id] = {
            title: col.title,
            type: col.type,
            mapping: indexMapping
          };
        }
      }
      
      // Output as tool definition format
      console.log('\n=== Tool Definition Format ===');
      for (const [colId, col] of Object.entries(mappings)) {
        const c = col as any;
        const mappingStr = Object.entries(c.mapping)
          .map(([idx, label]) => `${idx}=${label}`)
          .join(', ');
        console.log(`${colId}: { type: 'number', description: '${c.title}: ${mappingStr}' },`);
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

getBoardMappings().catch(console.error);