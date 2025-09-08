#!/usr/bin/env npx tsx
/**
 * Get more status and dropdown column mappings
 */

import { config } from 'dotenv';
import { mondayApi } from '../lib/monday/client.js';

config({ path: '.env.local' });

// Boards that need mappings - from our tool definitions
const BOARDS_TO_CHECK = [
  { boardId: '2052066178', name: 'Tickets', tool: 'getTickets' },
  { boardId: '1640244893', name: 'Bugs', tool: 'getBugs' },
  { boardId: '1640244965', name: 'Features', tool: 'getFeatures' },
  { boardId: '1640245006', name: 'Tests', tool: 'getTests' },
  { boardId: '1625485883', name: 'Leads', tool: 'getLeads' },
  { boardId: '1625486052', name: 'Opportunities', tool: 'getOpportunities' },
  { boardId: '1625486178', name: 'Sales Activities', tool: 'getSalesActivities' },
  { boardId: '1634026455', name: 'Tasks - AdOps', tool: 'getTasksAdOps' },
  { boardId: '1638451479', name: 'Tasks - Marketing', tool: 'getTasksMarketing' },
  { boardId: '1638451674', name: 'Tasks - AdTech', tool: 'getTasksAdTech' },
  { boardId: '1678106653', name: 'Tasks - Video', tool: 'getTasksVideo' },
  { boardId: '1678107008', name: 'Tasks - Yield & Growth', tool: 'getTasksYieldGrowth' },
];

async function getMappings() {
  const results: any = {};
  
  for (const board of BOARDS_TO_CHECK) {
    console.log(`\nChecking ${board.name} (${board.boardId})...`);
    
    const query = `
      query {
        boards(ids: [${board.boardId}]) {
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
      const boardData = response.data?.boards?.[0];
      
      if (boardData) {
        const mappings: any = {};
        
        for (const col of boardData.columns) {
          const settings = JSON.parse(col.settings_str);
          if (settings.labels && Object.keys(settings.labels).length > 0) {
            const indexMapping: Record<number, string> = {};
            for (const [idx, label] of Object.entries(settings.labels)) {
              indexMapping[parseInt(idx)] = label as string;
            }
            
            mappings[col.id] = {
              title: col.title,
              type: col.type,
              mapping: indexMapping
            };
            
            console.log(`  Found: ${col.id} (${col.title})`);
          }
        }
        
        if (Object.keys(mappings).length > 0) {
          results[board.tool] = {
            boardName: board.name,
            boardId: board.boardId,
            columns: mappings
          };
        }
      } else {
        console.log(`  No access to board`);
      }
      
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      console.log(`  Error: ${error}`);
    }
  }
  
  // Output tool definition updates
  console.log('\n\n=== TOOL DEFINITION UPDATES ===\n');
  
  for (const [tool, data] of Object.entries(results)) {
    console.log(`\n// ${tool} - ${(data as any).boardName}`);
    
    for (const [columnId, column] of Object.entries((data as any).columns)) {
      const col = column as any;
      const mappingStr = Object.entries(col.mapping)
        .map(([idx, label]) => `${idx}=${label}`)
        .join(', ');
      
      console.log(`${columnId}: { type: 'number', description: '${col.title}: ${mappingStr}' },`);
    }
  }
  
  return results;
}

getMappings().catch(console.error);