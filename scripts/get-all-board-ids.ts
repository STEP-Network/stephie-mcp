#!/usr/bin/env npx tsx
/**
 * Get all board IDs from the meta board
 */

import { config } from 'dotenv';
import { mondayApi } from '../lib/monday/client.js';

config({ path: '.env.local' });

async function getAllBoardIds() {
  const query = `
    query {
      boards(ids: [1698570295]) {
        items_page(limit: 100) {
          items {
            name
            column_values(ids: ["board_id_mkn3k16t"]) {
              id
              text
            }
          }
        }
      }
    }
  `;

  try {
    const response = await mondayApi(query);
    const items = response.data?.boards?.[0]?.items_page?.items || [];
    
    const boardInfo: any[] = [];
    
    for (const item of items) {
      const boardId = item.column_values[0]?.text;
      if (boardId) {
        boardInfo.push({
          name: item.name,
          boardId: boardId
        });
      }
    }
    
    // Sort by name
    boardInfo.sort((a, b) => a.name.localeCompare(b.name));
    
    console.log('\n=== ALL BOARDS ===\n');
    for (const board of boardInfo) {
      console.log(`${board.name}: ${board.boardId}`);
    }
    
    return boardInfo;
  } catch (error) {
    console.error('Error:', error);
  }
}

getAllBoardIds().catch(console.error);