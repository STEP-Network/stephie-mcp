#!/usr/bin/env tsx
/**
 * Updates the Boards meta board (1698570295) with column names used in each board
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { mondayApi } from '../lib/monday/client.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BOARDS_META_BOARD_ID = '1698570295';
const COLUMN_NAMES_COLUMN_ID = 'dropdown_mkvj2a8r';

// Read the generated board tool definitions to get board IDs and column IDs
const boardToolDefinitions = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../lib/mcp/boardToolDefinitions.json'), 'utf-8')
);

// Map board names to their IDs from our generation script
const BOARD_ID_MAP: Record<string, string> = {
  'getAccounts': '1402911027',
  'getBookings': '1549621337',
  'getBugs': '1939583448',
  'getChangelog': '1222800670',
  'getContacts': '1402911034',
  'getDeals': '1623368485',
  'getFeatures': '1938986335',
  'getInternalAdOpsAdTech': '1662744941',
  'getInternalAdSales': '1804511059',
  'getLeads': '1402911026',
  'getMarketingBudgets': '1677240056',
  'getMarketingExpenses': '1658073379',
  'getOKR': '1631918659',
  'getOpportunities': '1402911049',
  'getOTTPublishers': '1741257731',
  'getPartners': '1663230263',
  'getPeople': '1612664689',
  'getPlatforms': '1611329866',
  'getProcesses': '1611396339',
  'getPublisherFAQ': '1804511159',
  'getSalesActivities': '1402911042',
  'getStrategies': '1637264041',
  'getTasksAdOps': '1717613454',
  'getTasksAdTech': '1635251745',
  'getTasksMarketing': '1693359113',
  'getTasksTechIntelligence': '1631907569',
  'getTasksVideo': '1635510115',
  'getTasksYieldGrowth': '1762038452',
  'getTeams': '1631927696',
  'getTests': '2123683129',
  'getTickets': '1647372207',
  'getVertikaler': '2054670440',
};

interface BoardColumnInfo {
  boardId: string;
  boardName: string;
  columnIds: string[];
  columnNames: Set<string>;
}

async function getColumnNamesFromBoard(boardId: string): Promise<Map<string, string>> {
  const query = `
    query GetBoardColumns($boardId: ID!) {
      boards(ids: [$boardId]) {
        columns {
          id
          title
        }
      }
    }
  `;

  try {
    const response = await mondayApi(query, { boardId });
    const columns = response.data?.boards?.[0]?.columns || [];
    
    const columnMap = new Map<string, string>();
    columns.forEach((col: any) => {
      columnMap.set(col.id, col.title);
    });
    
    return columnMap;
  } catch (error) {
    console.error(`Error fetching columns for board ${boardId}:`, error);
    return new Map();
  }
}

async function getMetaBoardItems(): Promise<Map<string, string>> {
  const query = `
    query {
      boards(ids: [${BOARDS_META_BOARD_ID}]) {
        items_page(limit: 500) {
          items {
            id
            name
            column_values {
              id
              text
            }
          }
        }
      }
    }
  `;

  const response = await mondayApi(query);
  const items = response.data?.boards?.[0]?.items_page?.items || [];
  
  const boardItemMap = new Map<string, string>();
  items.forEach((item: any) => {
    const boardIdCol = item.column_values.find((col: any) => col.id === 'board_id_mkn3k16t');
    if (boardIdCol?.text) {
      boardItemMap.set(boardIdCol.text, item.id);
    }
  });
  
  return boardItemMap;
}

async function getAllUniqueColumnNames(): Promise<string[]> {
  const allColumnNames = new Set<string>();
  
  // Add common column names we know exist
  const commonNames = [
    'Name', 'Status', 'Type', 'Priority', 'Owner', 'Due Date', 'Created Date',
    'Updated Date', 'Start Date', 'End Date', 'Description', 'Budget', 'Amount',
    'Stage', 'Team', 'Assignee', 'Reporter', 'Category', 'Tags', 'Notes',
    'Email', 'Phone', 'Company', 'Website', 'Address', 'Country', 'Region',
    'Follow up Date', 'Done Date', 'Sprint', 'Attachments', 'Comments'
  ];
  
  commonNames.forEach(name => allColumnNames.add(name));
  
  // Fetch actual column names from all boards
  for (const [toolName, boardId] of Object.entries(BOARD_ID_MAP)) {
    console.log(`Fetching columns for ${toolName} (${boardId})...`);
    const columnMap = await getColumnNamesFromBoard(boardId);
    columnMap.forEach(name => allColumnNames.add(name));
  }
  
  return Array.from(allColumnNames).sort();
}

async function updateDropdownSettings(allColumnNames: string[]) {
  // Note: Monday.com doesn't allow updating dropdown settings via GraphQL
  // We'll need to update items with the correct indices instead
  console.log(`📝 Found ${allColumnNames.length} unique column names to track`);
  console.log('Column names will be tracked when updating board items');
  
  // Log the unique column names for reference
  console.log('\nUnique column names found:');
  const sample = allColumnNames.slice(0, 20);
  sample.forEach((name, idx) => {
    console.log(`  ${idx}: ${name}`);
  });
  if (allColumnNames.length > 20) {
    console.log(`  ... and ${allColumnNames.length - 20} more`);
  }
  
  return allColumnNames;
}

async function updateBoardItems(allColumnNames: string[]) {
  const boardItemMap = await getMetaBoardItems();
  const boardColumnInfo: BoardColumnInfo[] = [];
  
  // Analyze each board to get its column info
  for (const [toolName, boardId] of Object.entries(BOARD_ID_MAP)) {
    const toolDef = boardToolDefinitions.find((def: any) => def.name === toolName);
    if (!toolDef) continue;
    
    // Extract column IDs from the tool definition
    const columnIds: string[] = [];
    const columnNames = new Set<string>();
    
    // Get column names from the actual board
    const columnMap = await getColumnNamesFromBoard(boardId);
    
    // Look at the tool's properties to find column IDs
    Object.keys(toolDef.inputSchema.properties).forEach(prop => {
      // Skip non-column properties
      if (prop === 'limit' || prop === 'search') return;
      
      // The property name is often the column ID (with underscores for hyphens)
      const columnId = prop.replace(/_/g, '-');
      columnIds.push(columnId);
      
      // Get the actual column name
      const columnName = columnMap.get(columnId);
      if (columnName) {
        columnNames.add(columnName);
      }
    });
    
    // Also check for essential columns from generated files
    const toolFile = findToolFile(toolName);
    if (toolFile) {
      const essentialColumns = extractEssentialColumns(toolFile);
      essentialColumns.forEach(colId => {
        const columnName = columnMap.get(colId);
        if (columnName) {
          columnNames.add(columnName);
        }
      });
    }
    
    boardColumnInfo.push({
      boardId,
      boardName: toolName.replace(/^get|Items$/g, ''),
      columnIds,
      columnNames
    });
  }
  
  // Update each board item with its column names
  for (const info of boardColumnInfo) {
    const itemId = boardItemMap.get(info.boardId);
    if (!itemId) {
      console.log(`⚠️  No item found for board ${info.boardName} (${info.boardId})`);
      continue;
    }
    
    // Get indices for each column name
    const indices = Array.from(info.columnNames).map(name => 
      allColumnNames.indexOf(name)
    ).filter(idx => idx >= 0);
    
    if (indices.length === 0) {
      console.log(`⚠️  No column names found for ${info.boardName}`);
      continue;
    }
    
    // Update the item with column name indices
    const mutation = `
      mutation UpdateItem($itemId: ID!, $value: JSON!) {
        change_multiple_column_values(
          item_id: $itemId,
          board_id: ${BOARDS_META_BOARD_ID},
          column_values: $value
        ) {
          id
        }
      }
    `;
    
    // Format column value for dropdown column (needs labels, not ids)
    const columnValue = JSON.stringify({
      [COLUMN_NAMES_COLUMN_ID]: {
        labels: Array.from(info.columnNames)
      }
    });
    
    try {
      await mondayApi(mutation, {
        itemId,
        value: columnValue
      });
      console.log(`✅ Updated ${info.boardName}: ${Array.from(info.columnNames).slice(0, 5).join(', ')}${info.columnNames.size > 5 ? '...' : ''}`);
    } catch (error) {
      console.error(`Error updating ${info.boardName}:`, error);
    }
  }
}

function findToolFile(toolName: string): string | null {
  const categories = ['crm', 'operations', 'development', 'sales', 'okr', 'marketing', 
                      'hr', 'support', 'tasks', 'business', 'tech', 'publishers'];
  
  for (const category of categories) {
    const filePath = path.join(__dirname, `../lib/tools/${category}/${toolName}.ts`);
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf-8');
    }
  }
  return null;
}

function extractEssentialColumns(fileContent: string): string[] {
  const match = fileContent.match(/column_values\(ids:\s*\[(.*?)\]/s);
  if (!match) return [];
  
  const columnIds = match[1]
    .split(',')
    .map(id => id.trim().replace(/['"]/g, ''))
    .filter(id => id.length > 0);
  
  return columnIds;
}

async function main() {
  console.log('🔄 Updating Boards meta board with column names...\n');
  
  // Step 1: Get all unique column names
  console.log('Step 1: Collecting all unique column names...');
  const allColumnNames = await getAllUniqueColumnNames();
  console.log(`Found ${allColumnNames.length} unique column names\n`);
  
  // Step 2: Display column names (can't update dropdown via API)
  console.log('Step 2: Processing column names...');
  const columnNamesList = await updateDropdownSettings(allColumnNames);
  console.log('');
  
  // Step 3: Update board items with their column names
  console.log('Step 3: Updating board items with column names...');
  await updateBoardItems(columnNamesList);
  
  console.log('\n✅ Done!');
}

main().catch(console.error);