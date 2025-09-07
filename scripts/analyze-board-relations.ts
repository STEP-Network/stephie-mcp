#!/usr/bin/env tsx
/**
 * Analyzes all boards for board relation columns and identifies missing relationships
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

// Board IDs we have tools for
const BOARD_TOOL_MAP: Record<string, string> = {
  '1402911027': 'getAccounts',
  '1549621337': 'getBookings',
  '1939583448': 'getBugs',
  '1222800670': 'getChangelog',
  '1402911034': 'getContacts',
  '1623368485': 'getDeals',
  '1938986335': 'getFeatures',
  '1662744941': 'getInternalAdOpsAdTech',
  '1804511059': 'getInternalAdSales',
  '1402911026': 'getLeads',
  '1677240056': 'getMarketingBudgets',
  '1658073379': 'getMarketingExpenses',
  '1631918659': 'getOKR',
  '1402911049': 'getOpportunities',
  '1741257731': 'getOTTPublishers',
  '1663230263': 'getPartners',
  '1612664689': 'getPeople',
  '1611329866': 'getPlatforms',
  '1611396339': 'getProcesses',
  '1804511159': 'getPublisherFAQ',
  '1402911042': 'getSalesActivities',
  '1637264041': 'getStrategies',
  '1717613454': 'getTasksAdOps',
  '1635251745': 'getTasksAdTech',
  '1693359113': 'getTasksMarketing',
  '1631907569': 'getTasksTechIntelligence',
  '1635510115': 'getTasksVideo',
  '1762038452': 'getTasksYieldGrowth',
  '1631927696': 'getTeams',
  '2123683129': 'getTests',
  '1647372207': 'getTickets',
  '2054670440': 'getVertikaler',
};

interface BoardRelation {
  boardId: string;
  boardName: string;
  toolName: string;
  relations: {
    columnId: string;
    columnTitle: string;
    columnType: string;
    targetBoardIds?: string[];
  }[];
}

async function getBoardColumns(boardId: string): Promise<any[]> {
  const query = `
    query GetBoardColumns($boardId: ID!) {
      boards(ids: [$boardId]) {
        name
        columns {
          id
          title
          type
          settings_str
        }
      }
    }
  `;

  try {
    const response = await mondayApi(query, { boardId });
    return response.data?.boards?.[0] || null;
  } catch (error) {
    console.error(`Error fetching columns for board ${boardId}:`, error);
    return null;
  }
}

async function analyzeAllBoards() {
  console.log('🔍 Analyzing Board Relations Across All Tools\n');
  console.log('='.repeat(80) + '\n');
  
  const boardRelations: BoardRelation[] = [];
  const allRelationColumns: Record<string, Set<string>> = {};
  
  // Analyze each board
  for (const [boardId, toolName] of Object.entries(BOARD_TOOL_MAP)) {
    const board = await getBoardColumns(boardId);
    if (!board) continue;
    
    const relations: BoardRelation['relations'] = [];
    
    // Find all relation-type columns
    board.columns.forEach((col: any) => {
      if (col.type === 'board_relation' || 
          col.type === 'link_to_item' || 
          col.type === 'dependency') {
        
        relations.push({
          columnId: col.id,
          columnTitle: col.title,
          columnType: col.type,
          targetBoardIds: extractBoardIds(col.settings_str)
        });
        
        // Track unique relation columns
        if (!allRelationColumns[boardId]) {
          allRelationColumns[boardId] = new Set();
        }
        allRelationColumns[boardId].add(col.title);
      }
    });
    
    if (relations.length > 0) {
      boardRelations.push({
        boardId,
        boardName: board.name,
        toolName,
        relations
      });
    }
  }
  
  // Display findings
  console.log('📊 BOARD RELATIONS SUMMARY\n');
  
  for (const board of boardRelations) {
    console.log(`## ${board.boardName} (${board.toolName})`);
    console.log(`   Board ID: ${board.boardId}`);
    
    if (board.relations.length === 0) {
      console.log('   No board relations found');
    } else {
      console.log('   Relations:');
      board.relations.forEach(rel => {
        console.log(`   - ${rel.columnTitle} (${rel.columnId})`);
        console.log(`     Type: ${rel.columnType}`);
        if (rel.targetBoardIds && rel.targetBoardIds.length > 0) {
          console.log(`     Target Boards: ${rel.targetBoardIds.join(', ')}`);
        }
      });
    }
    console.log('');
  }
  
  // Generate implementation recommendations
  console.log('='.repeat(80) + '\n');
  console.log('🛠️  IMPLEMENTATION RECOMMENDATIONS\n');
  
  const recommendations: string[] = [];
  
  // Check each board for missing relation implementations
  for (const board of boardRelations) {
    if (board.relations.length > 0) {
      // Read the current tool implementation to check what's already there
      const toolFile = await findToolFile(board.toolName);
      
      board.relations.forEach(rel => {
        const paramName = convertToParamName(rel.columnTitle);
        
        // Check if this relation is likely already implemented
        if (toolFile && !toolFile.includes(paramName)) {
          recommendations.push(
            `${board.toolName}: Add ${paramName} parameter for "${rel.columnTitle}" (${rel.columnId})`
          );
        }
      });
    }
  }
  
  if (recommendations.length === 0) {
    console.log('✅ All major board relations appear to be implemented or documented.');
  } else {
    console.log('Add these relation parameters to tools:\n');
    recommendations.forEach(rec => console.log(`- ${rec}`));
  }
  
  // Save detailed analysis to file
  const analysisData = {
    timestamp: new Date().toISOString(),
    boards: boardRelations,
    recommendations
  };
  
  fs.writeFileSync(
    path.join(__dirname, '../data/board-relations-analysis.json'),
    JSON.stringify(analysisData, null, 2)
  );
  
  console.log('\n💾 Full analysis saved to data/board-relations-analysis.json');
  
  return boardRelations;
}

function extractBoardIds(settingsStr: string): string[] {
  try {
    const settings = JSON.parse(settingsStr);
    if (settings.boardIds) {
      return settings.boardIds;
    }
  } catch {}
  return [];
}

function convertToParamName(columnTitle: string): string {
  // Convert column title to parameter name (e.g., "Account" -> "accountId")
  return columnTitle
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '') + 'Id';
}

async function findToolFile(toolName: string): Promise<string | null> {
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

// Also update the meta board with all relation columns
async function updateMetaBoardWithRelations(boardRelations: BoardRelation[]) {
  console.log('\n📝 Updating Meta Board Column Tracking...\n');
  
  const COLUMN_NAMES_COLUMN_ID = 'dropdown_mkvj2a8r';
  
  for (const board of boardRelations) {
    if (board.relations.length === 0) continue;
    
    // Get current column values from meta board
    const query = `
      query {
        boards(ids: [${BOARDS_META_BOARD_ID}]) {
          items_page(limit: 500) {
            items {
              id
              column_values(ids: ["board_id_mkn3k16t", "${COLUMN_NAMES_COLUMN_ID}"]) {
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
    
    // Find the item for this board
    const boardItem = items.find((item: any) => {
      const boardIdCol = item.column_values.find((c: any) => c.id === 'board_id_mkn3k16t');
      return boardIdCol?.text === board.boardId;
    });
    
    if (boardItem) {
      // Get existing column names
      const existingCol = boardItem.column_values.find((c: any) => c.id === COLUMN_NAMES_COLUMN_ID);
      const existingNames = existingCol?.text ? existingCol.text.split(', ') : [];
      
      // Add new relation columns
      const newColumns = board.relations.map(rel => rel.columnTitle);
      const allColumns = [...new Set([...existingNames, ...newColumns])].sort();
      
      // Update if there are new columns
      if (allColumns.length > existingNames.length) {
        const mutation = `
          mutation UpdateColumns($boardId: ID!, $itemId: ID!, $columnId: String!, $value: String!) {
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
            itemId: boardItem.id,
            columnId: COLUMN_NAMES_COLUMN_ID,
            value: allColumns.join(', ')
          });
          
          console.log(`✅ Updated ${board.boardName}: Added ${newColumns.join(', ')}`);
        } catch (error) {
          console.error(`❌ Failed to update ${board.boardName}:`, error);
        }
      } else {
        console.log(`⏭️  ${board.boardName}: No new columns to add`);
      }
    }
  }
}

async function main() {
  const boardRelations = await analyzeAllBoards();
  await updateMetaBoardWithRelations(boardRelations);
  console.log('\n✅ Analysis complete!');
}

main().catch(console.error);