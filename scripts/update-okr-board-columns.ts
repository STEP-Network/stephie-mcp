#!/usr/bin/env tsx
/**
 * Updates the OKR board entry in the Boards meta board with enhanced column information
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { mondayApi } from '../lib/monday/client.js';

const BOARDS_META_BOARD_ID = '1698570295';
const COLUMN_NAMES_COLUMN_ID = 'dropdown_mkvj2a8r';
const OKR_BOARD_ID = '1631918659';
const OKR_ITEM_ID = '1698671251'; // From BOARD_ITEM_MAP

async function updateOKRBoardColumns() {
  console.log('🔄 Updating OKR board columns in meta board...\n');
  
  // Define the OKR columns we're tracking
  const okrColumns = [
    // Objective columns
    'Status (Objective)',
    'Owner (Objective)', 
    'Team',
    'Progress',
    'Deadline',
    'Description',
    // Key Result columns (subitems)
    'Status (Key Result)',
    'Owner (Key Result)',
    'Progress (Key Result)',
    'Due Date (Key Result)',
    'Description (Key Result)'
  ];
  
  const combinedNames = okrColumns.join(', ');
  
  const mutation = `
    mutation UpdateOKRColumns($boardId: ID!, $itemId: ID!, $columnId: String!, $value: String!) {
      change_simple_column_value(
        board_id: $boardId
        item_id: $itemId
        column_id: $columnId
        value: $value
        create_labels_if_missing: true
      ) {
        id
      }
    }
  `;

  try {
    await mondayApi(mutation, {
      boardId: BOARDS_META_BOARD_ID,
      itemId: OKR_ITEM_ID,
      columnId: COLUMN_NAMES_COLUMN_ID,
      value: combinedNames
    });
    
    console.log('✅ Updated OKR board columns in meta board:');
    console.log(`   ${okrColumns.join('\n   ')}`);
    console.log('\n📝 OKR Tool Features:');
    console.log('   - Full hierarchy support (Objectives + Key Results)');
    console.log('   - Team filtering at Objective level');
    console.log('   - Status filtering with clear labels');
    console.log('   - Optional Key Results inclusion');
    console.log('   - Summary statistics');
    
  } catch (error) {
    console.error('❌ Error updating OKR columns:', error);
  }
}

updateOKRBoardColumns().catch(console.error);