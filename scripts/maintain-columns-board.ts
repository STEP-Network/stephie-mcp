#!/usr/bin/env tsx
/**
 * Maintenance script for the Columns board
 * 
 * This script provides utilities to maintain the dynamic columns configuration:
 * - Check column health and consistency
 * - Add missing columns for a board
 * - Remove orphaned columns
 * - Sync columns with actual board structure
 * - Generate reports on column usage
 */

import { config } from 'dotenv';
import { mondayApi } from '../lib/monday/client.js';
import { readFileSync } from 'fs';
import path from 'path';

config({ path: '.env.local' });

const COLUMNS_BOARD_ID = '2135717897';
const META_BOARD_ID = '1698570295';

interface BoardConfig {
  itemId: string;
  boardId: string;
  boardName: string;
}

interface ColumnInfo {
  id: string;
  title: string;
  boardName: string;
  boardItemId: string;
}

async function getMetaBoardMappings(): Promise<Map<string, BoardConfig>> {
  console.log('📊 Loading board mappings from meta board...');
  
  const query = `
    query {
      boards(ids: [${META_BOARD_ID}]) {
        items_page(limit: 200) {
          items {
            id
            name
            column_values(ids: ["board_id_mkn3k16t"]) {
              text
            }
          }
        }
      }
    }
  `;
  
  const response = await mondayApi(query);
  const items = response.data?.boards?.[0]?.items_page?.items || [];
  
  const mappings = new Map<string, BoardConfig>();
  
  for (const item of items) {
    const boardIdCol = item.column_values.find((c: any) => c.id === 'board_id_mkn3k16t');
    const boardId = boardIdCol?.text;
    
    if (boardId) {
      mappings.set(boardId, {
        itemId: item.id,
        boardId: boardId,
        boardName: item.name
      });
      
      // Also map by name
      mappings.set(item.name.toLowerCase(), {
        itemId: item.id,
        boardId: boardId,
        boardName: item.name
      });
    }
  }
  
  console.log(`  Found ${mappings.size / 2} boards with IDs`);
  return mappings;
}

async function getExistingColumns(): Promise<ColumnInfo[]> {
  console.log('📋 Loading existing columns from Columns board...');
  
  const query = `
    query {
      boards(ids: [${COLUMNS_BOARD_ID}]) {
        items_page(limit: 500) {
          items {
            id
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
  
  const columns: ColumnInfo[] = [];
  const boardMappings = await getMetaBoardMappings();
  
  for (const item of items) {
    const columnId = item.column_values.find((c: any) => c.id === 'text_mkvjc46e')?.text;
    const boardRelation = item.column_values.find((c: any) => c.id === 'board_relation_mkvjb1w9');
    const boardItemId = boardRelation?.linked_item_ids?.[0];
    
    if (columnId && boardItemId) {
      // Find board name from meta board
      let boardName = 'Unknown';
      for (const [key, config] of boardMappings) {
        if (config.itemId === boardItemId) {
          boardName = config.boardName;
          break;
        }
      }
      
      columns.push({
        id: columnId,
        title: item.name,
        boardName,
        boardItemId
      });
    }
  }
  
  console.log(`  Found ${columns.length} configured columns`);
  return columns;
}

async function checkBoardColumns(boardId: string): Promise<string[]> {
  const query = `
    query {
      boards(ids: [${boardId}]) {
        columns {
          id
          title
          type
        }
      }
    }
  `;
  
  try {
    const response = await mondayApi(query);
    const columns = response.data?.boards?.[0]?.columns || [];
    return columns.map((c: any) => c.id);
  } catch (error) {
    console.error(`Failed to fetch columns for board ${boardId}:`, error);
    return [];
  }
}

async function addMissingColumns(boardName: string) {
  console.log(`\n🔧 Checking for missing columns in ${boardName}...`);
  
  const boardMappings = await getMetaBoardMappings();
  const boardConfig = boardMappings.get(boardName.toLowerCase());
  
  if (!boardConfig?.boardId) {
    console.error(`  ❌ Board "${boardName}" not found or has no board ID`);
    return;
  }
  
  const existingColumns = await getExistingColumns();
  const boardColumns = await checkBoardColumns(boardConfig.boardId);
  
  // Find columns already configured for this board
  const configuredColumnIds = new Set(
    existingColumns
      .filter(c => c.boardItemId === boardConfig.itemId)
      .map(c => c.id)
  );
  
  // Find missing columns
  const missingColumns = boardColumns.filter(id => !configuredColumnIds.has(id));
  
  if (missingColumns.length === 0) {
    console.log(`  ✅ All columns are already configured`);
    return;
  }
  
  console.log(`  📝 Found ${missingColumns.length} missing columns`);
  
  // Get column details
  const query = `
    query {
      boards(ids: [${boardConfig.boardId}]) {
        columns {
          id
          title
          type
        }
      }
    }
  `;
  
  const response = await mondayApi(query);
  const allColumns = response.data?.boards?.[0]?.columns || [];
  
  // Add missing columns
  for (const columnId of missingColumns) {
    const column = allColumns.find((c: any) => c.id === columnId);
    if (!column) continue;
    
    const mutation = `
      mutation {
        create_item(
          board_id: ${COLUMNS_BOARD_ID},
          item_name: "${column.title.replace(/"/g, '\\"')}",
          column_values: "{\\"text_mkvjc46e\\": \\"${columnId}\\", \\"board_relation_mkvjb1w9\\": {\\"item_ids\\": [\\"${boardConfig.itemId}\\"]}}"
        ) {
          id
        }
      }
    `;
    
    try {
      await mondayApi(mutation);
      console.log(`    ✅ Added column: ${column.title} (${columnId})`);
    } catch (error) {
      console.error(`    ❌ Failed to add column ${columnId}:`, error);
    }
  }
}

async function removeOrphanedColumns() {
  console.log('\n🧹 Checking for orphaned columns...');
  
  const existingColumns = await getExistingColumns();
  const boardMappings = await getMetaBoardMappings();
  
  const orphaned: ColumnInfo[] = [];
  
  for (const column of existingColumns) {
    // Check if board still exists
    let boardExists = false;
    for (const [key, config] of boardMappings) {
      if (config.itemId === column.boardItemId) {
        boardExists = true;
        
        // Check if column exists on the board
        if (config.boardId) {
          const boardColumns = await checkBoardColumns(config.boardId);
          if (!boardColumns.includes(column.id)) {
            orphaned.push(column);
          }
        }
        break;
      }
    }
    
    if (!boardExists) {
      orphaned.push(column);
    }
  }
  
  if (orphaned.length === 0) {
    console.log('  ✅ No orphaned columns found');
    return;
  }
  
  console.log(`  ⚠️ Found ${orphaned.length} orphaned columns:`);
  for (const column of orphaned) {
    console.log(`    - ${column.title} (${column.id}) from ${column.boardName}`);
  }
  
  // Prompt for confirmation
  console.log('\n  Would remove these orphaned columns (dry run - not implemented)');
}

async function generateReport() {
  console.log('\n📊 Generating Column Configuration Report');
  console.log('='.repeat(60));
  
  const existingColumns = await getExistingColumns();
  const boardMappings = await getMetaBoardMappings();
  
  // Group columns by board
  const columnsByBoard = new Map<string, ColumnInfo[]>();
  
  for (const column of existingColumns) {
    const boardName = column.boardName;
    if (!columnsByBoard.has(boardName)) {
      columnsByBoard.set(boardName, []);
    }
    columnsByBoard.get(boardName)!.push(column);
  }
  
  // Sort boards by name
  const sortedBoards = Array.from(columnsByBoard.keys()).sort();
  
  console.log(`\nTotal configured columns: ${existingColumns.length}`);
  console.log(`Total boards with columns: ${columnsByBoard.size}`);
  
  console.log('\n📋 Columns per board:');
  for (const boardName of sortedBoards) {
    const columns = columnsByBoard.get(boardName)!;
    console.log(`  ${boardName}: ${columns.length} columns`);
  }
  
  // Check coverage
  console.log('\n🔍 Coverage analysis:');
  let boardsWithoutColumns = 0;
  
  for (const [key, config] of boardMappings) {
    if (typeof key === 'string' && !key.includes(' ')) continue; // Skip board ID entries
    
    if (!columnsByBoard.has(config.boardName)) {
      boardsWithoutColumns++;
      console.log(`  ⚠️ ${config.boardName} has no columns configured`);
    }
  }
  
  if (boardsWithoutColumns === 0) {
    console.log('  ✅ All boards have columns configured');
  }
  
  console.log('\n' + '='.repeat(60));
}

async function syncAllBoards() {
  console.log('\n🔄 Syncing all boards with Columns board...');
  
  const boardMappings = await getMetaBoardMappings();
  const boards = new Set<string>();
  
  // Get unique board names
  for (const [key, config] of boardMappings) {
    if (config.boardName && !boards.has(config.boardName)) {
      boards.add(config.boardName);
    }
  }
  
  console.log(`  Found ${boards.size} boards to sync`);
  
  for (const boardName of boards) {
    await addMissingColumns(boardName);
  }
  
  console.log('\n✅ Sync complete');
}

async function main() {
  const command = process.argv[2];
  
  console.log('🛠️ Columns Board Maintenance Tool');
  console.log('='.repeat(60));
  
  switch (command) {
    case 'report':
      await generateReport();
      break;
      
    case 'sync':
      const boardName = process.argv[3];
      if (boardName) {
        await addMissingColumns(boardName);
      } else {
        console.log('Usage: pnpm columns:sync <board-name>');
        console.log('Example: pnpm columns:sync "Accounts"');
      }
      break;
      
    case 'sync-all':
      await syncAllBoards();
      break;
      
    case 'clean':
      await removeOrphanedColumns();
      break;
      
    case 'check':
      await generateReport();
      await removeOrphanedColumns();
      break;
      
    default:
      console.log('Available commands:');
      console.log('  pnpm columns:report         - Generate configuration report');
      console.log('  pnpm columns:sync <board>   - Add missing columns for a board');
      console.log('  pnpm columns:sync-all       - Sync all boards');
      console.log('  pnpm columns:clean          - Remove orphaned columns');
      console.log('  pnpm columns:check          - Full health check');
      console.log('\nExamples:');
      console.log('  pnpm columns:report');
      console.log('  pnpm columns:sync "Accounts"');
      console.log('  pnpm columns:sync-all');
  }
}

main().catch(console.error);