#!/usr/bin/env npx tsx
/**
 * Get all status and dropdown column mappings for all tools
 */

import { config } from 'dotenv';
import { mondayApi } from '../lib/monday/client.js';

config({ path: '.env.local' });

// All boards with status/dropdown columns from toolDefinitions.ts
const BOARDS = [
  { boardId: '1625485665', name: 'Accounts', tool: 'getAccounts' },
  { boardId: '1631907569', name: 'Tasks - Tech & Intelligence', tool: 'getTasksTechIntelligence' },
  { boardId: '7656822652', name: 'OKR', tool: 'getOKR' },
  { boardId: '2052093089', name: 'Deals', tool: 'getDeals' },
  { boardId: '2052066178', name: 'Tickets', tool: 'getTickets' },
  { boardId: '1625485770', name: 'Contacts', tool: 'getContacts' },
  { boardId: '1625485883', name: 'Leads', tool: 'getLeads' },
  { boardId: '1625486052', name: 'Opportunities', tool: 'getOpportunities' },
  { boardId: '1625486178', name: 'Sales Activities', tool: 'getSalesActivities' },
  { boardId: '2052117335', name: 'Internal Ad Sales', tool: 'getInternalAdSales' },
  { boardId: '1634026455', name: 'Tasks - AdOps', tool: 'getTasksAdOps' },
  { boardId: '1638451479', name: 'Tasks - Marketing', tool: 'getTasksMarketing' },
  { boardId: '1638451674', name: 'Tasks - AdTech', tool: 'getTasksAdTech' },
  { boardId: '1678106653', name: 'Tasks - Video', tool: 'getTasksVideo' },
  { boardId: '1678107008', name: 'Tasks - Yield & Growth', tool: 'getTasksYieldGrowth' },
  { boardId: '1640244893', name: 'Bugs', tool: 'getBugs' },
  { boardId: '1640244965', name: 'Features', tool: 'getFeatures' },
  { boardId: '1640245006', name: 'Tests', tool: 'getTests' },
  { boardId: '1902950322', name: 'Partners', tool: 'getPartners' },
  { boardId: '2052222319', name: 'Strategies', tool: 'getStrategies' },
  { boardId: '2054670440', name: 'Vertikaler', tool: 'getVertikaler' },
  { boardId: '2052093178', name: 'Marketing Expenses', tool: 'getMarketingExpenses' },
  { boardId: '1677835456', name: 'Processes', tool: 'getProcesses' },
  { boardId: '2052093269', name: 'Internal AdOps & AdTech', tool: 'getInternalAdOpsAdTech' },
  { boardId: '2052093359', name: 'Publisher FAQ', tool: 'getPublisherFAQ' },
  { boardId: '2052093449', name: 'OTT Publishers', tool: 'getOTTPublishers' },
  { boardId: '2052093539', name: 'Platforms', tool: 'getPlatforms' },
  { boardId: '1902963421', name: 'Bookings', tool: 'getBookings' },
  { boardId: '1640245050', name: 'Changelog', tool: 'getChangelog' },
  { boardId: '1693313588', name: 'People', tool: 'getPeople' },
  { boardId: '1631927696', name: 'Teams', tool: 'getTeams' },
  { boardId: '2052180668', name: 'Marketing Budgets', tool: 'getMarketingBudgets' },
];

async function getAllMappings() {
  const results: any = {};
  
  // Process in batches to avoid rate limits
  const batchSize = 5;
  for (let i = 0; i < BOARDS.length; i += batchSize) {
    const batch = BOARDS.slice(i, i + batchSize);
    const boardIds = batch.map(b => b.boardId).join(',');
    
    console.log(`\nProcessing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(BOARDS.length/batchSize)}...`);
    
    const query = `
      query {
        boards(ids: [${boardIds}]) {
          id
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
      const boards = response.data?.boards || [];
      
      for (const board of boards) {
        const boardInfo = BOARDS.find(b => b.boardId === board.id);
        if (!boardInfo) continue;
        
        const mappings: any = {};
        
        for (const column of board.columns) {
          const settings = JSON.parse(column.settings_str);
          const labels = settings.labels || {};
          
          // Create index to label mapping
          const indexMapping: Record<number, string> = {};
          for (const [index, label] of Object.entries(labels)) {
            indexMapping[parseInt(index)] = label as string;
          }
          
          if (Object.keys(indexMapping).length > 0) {
            mappings[column.id] = {
              title: column.title,
              type: column.type,
              mapping: indexMapping
            };
            
            console.log(`  ${boardInfo.name} - ${column.id} (${column.title})`);
          }
        }
        
        if (Object.keys(mappings).length > 0) {
          results[boardInfo.tool] = {
            boardName: boardInfo.name,
            boardId: boardInfo.boardId,
            columns: mappings
          };
        }
      }
      
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`Error processing batch:`, error);
    }
  }
  
  return results;
}

async function generateToolDefinitionUpdates(mappings: any) {
  console.log('\n\n=== TOOL DEFINITION UPDATES ===\n');
  
  for (const [tool, data] of Object.entries(mappings)) {
    console.log(`\n// ${tool} - ${(data as any).boardName}`);
    
    for (const [columnId, column] of Object.entries((data as any).columns)) {
      const col = column as any;
      const mappingStr = Object.entries(col.mapping)
        .map(([idx, label]) => `${idx}=${label}`)
        .join(', ');
      
      console.log(`${columnId}: { type: 'number', description: '${col.title}: ${mappingStr}' },`);
    }
  }
}

// Run the script
getAllMappings()
  .then(mappings => {
    console.log('\n\n=== COMPLETE MAPPINGS JSON ===');
    console.log(JSON.stringify(mappings, null, 2));
    
    // Generate tool definition updates
    generateToolDefinitionUpdates(mappings);
  })
  .catch(console.error);