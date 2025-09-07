#!/usr/bin/env tsx
/**
 * Generate tools for all Monday.com boards (excluding those we already have)
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import fs from 'fs/promises';
import path from 'path';
import { mondayApi } from '../lib/monday/client.js';

// Boards we already have specific tools for
const EXISTING_BOARD_TOOLS = [
  '1545299249', // Publishers
  '1222800432', // Publisher total overview
  '1558569789', // Ad Units  
  '1802371471', // Key Values (old ID)
  '2056578615', // Key Values (new ID from list)
  '2051827669', // Segmenter
  '1983692701', // Produkter
  '1611223368', // Produktgrupper
  '1983719743', // Formater
  '1558597958', // Størrelser
  '1432155906', // Prisstruktur
  '1935559241', // Placements (old ID)
  '1558578956', // Placements (new ID from list)
  '1698570295', // Boards
];

// Boards to create tools for (from the list)
const BOARDS_TO_GENERATE = [
  { id: '1402911027', name: 'Accounts', category: 'crm' },
  { id: '1549621337', name: 'Bookings', category: 'operations' },
  { id: '1939583448', name: 'Bugs', category: 'development' },
  { id: '1222800670', name: 'Changelog', category: 'development' },
  { id: '1402911034', name: 'Contacts', category: 'crm' },
  { id: '1623368485', name: 'Deals', category: 'sales' },
  { id: '1938986335', name: 'Features', category: 'development' },
  { id: '1662744941', name: 'InternalAdOpsAdTech', category: 'operations' },
  { id: '1804511059', name: 'InternalAdSales', category: 'sales' },
  { id: '1631918525', name: 'KeyResults', category: 'okr' },
  { id: '1402911026', name: 'Leads', category: 'crm' },
  { id: '1677240056', name: 'MarketingBudgets', category: 'marketing' },
  { id: '1658073379', name: 'MarketingExpenses', category: 'marketing' },
  { id: '1631918659', name: 'OKR', category: 'okr' },
  { id: '1402911049', name: 'Opportunities', category: 'sales' },
  { id: '1741257731', name: 'OTTPublishers', category: 'publishers' },
  { id: '1663230263', name: 'Partners', category: 'business' },
  { id: '1612664689', name: 'People', category: 'hr' },
  { id: '1611329866', name: 'Platforms', category: 'tech' },
  { id: '1611396339', name: 'Processes', category: 'operations' },
  { id: '1804511159', name: 'PublisherFAQ', category: 'support' },
  { id: '1402911042', name: 'SalesActivities', category: 'sales' },
  { id: '1637264041', name: 'Strategies', category: 'business' },
  { id: '1717613454', name: 'TasksAdOps', category: 'tasks' },
  { id: '1635251745', name: 'TasksAdTech', category: 'tasks' },
  { id: '1693359113', name: 'TasksMarketing', category: 'tasks' },
  { id: '1631907569', name: 'TasksTechIntelligence', category: 'tasks' },
  { id: '1635510115', name: 'TasksVideo', category: 'tasks' },
  { id: '1762038452', name: 'TasksYieldGrowth', category: 'tasks' },
  { id: '1631927696', name: 'Teams', category: 'hr' },
  { id: '2123683129', name: 'Tests', category: 'development' },
  { id: '1647372207', name: 'Tickets', category: 'support' },
  { id: '2054670440', name: 'Vertikaler', category: 'business' },
];

// Essential column types to include
const ESSENTIAL_COLUMN_TYPES = ['name', 'status', 'dropdown', 'text', 'numbers', 'date', 'people', 'board_relation', 'checkbox', 'color'];

async function analyzeBoard(boardId: string) {
  const query = `
    query GetBoardDetails($boardId: ID!) {
      boards(ids: [$boardId]) {
        id
        name
        description
        items_count
        columns {
          id
          title
          type
          settings_str
        }
      }
    }
  `;

  const response = await mondayApi(query, { boardId });
  return response.data?.boards?.[0];
}

function selectEssentialColumns(columns: any[]) {
  const essential: string[] = [];
  const filterable: any[] = [];
  
  columns.forEach(col => {
    // Always include name column
    if (col.type === 'name') {
      essential.push(col.id);
    }
    // Include important columns based on title keywords
    else if (ESSENTIAL_COLUMN_TYPES.includes(col.type)) {
      const title = col.title.toLowerCase();
      if (title.includes('status') || title.includes('type') || title.includes('priority') ||
          title.includes('owner') || title.includes('date') || title.includes('name') ||
          title.includes('title') || title.includes('id') || title.includes('amount') ||
          title.includes('budget') || title.includes('team') || title.includes('stage')) {
        essential.push(col.id);
        
        // Add to filterable if it's a good filter type
        if (['status', 'dropdown', 'color', 'checkbox', 'people', 'date'].includes(col.type)) {
          filterable.push({ id: col.id, title: col.title, type: col.type });
        }
      }
    }
  });
  
  // Limit to 10 essential columns max
  return {
    essential: essential.slice(0, 10),
    filterable: filterable.slice(0, 5)
  };
}

async function generateBoardTools() {
  const toolFunctions: string[] = [];
  const toolDefinitions: any[] = [];
  
  for (const board of BOARDS_TO_GENERATE) {
    console.log(`Analyzing board: ${board.name} (${board.id})...`);
    
    try {
      const boardData = await analyzeBoard(board.id);
      if (!boardData) {
        console.log(`  ⚠️  Board not found`);
        continue;
      }
      
      const { essential, filterable } = selectEssentialColumns(boardData.columns);
      
      // Generate tool function
      const functionName = `get${board.name}Items`;
      const fileName = `get${board.name}Items.ts`;
      
      // Create tool function file
      const toolCode = `import { mondayApi } from '../../monday/client.js';

export async function ${functionName}(params: {
  limit?: number;
  search?: string;
${filterable.map(f => {
  if (f.type === 'status' || f.type === 'dropdown' || f.type === 'color') {
    return `  ${f.id.replace(/-/g, '_')}?: number; // ${f.title} (numeric index)`;
  } else if (f.type === 'checkbox') {
    return `  ${f.id.replace(/-/g, '_')}?: boolean; // ${f.title}`;
  } else if (f.type === 'date') {
    return `  ${f.id.replace(/-/g, '_')}?: string; // ${f.title} (YYYY-MM-DD)`;
  } else {
    return `  ${f.id.replace(/-/g, '_')}?: string; // ${f.title}`;
  }
}).join('\n')}
} = {}) {
  const { limit = 10, search, ${filterable.map(f => f.id.replace(/-/g, '_')).join(', ')} } = params;
  
  // Build filters
  const filters: any[] = [];
  if (search) {
    filters.push({
      column_id: 'name',
      compare_value: search,
      operator: 'contains_text'
    });
  }
  ${filterable.map(f => {
    const paramName = f.id.replace(/-/g, '_');
    if (f.type === 'status' || f.type === 'dropdown' || f.type === 'color') {
      return `if (${paramName} !== undefined) filters.push({ column_id: '${f.id}', compare_value: [${paramName}], operator: 'any_of' });`;
    } else if (f.type === 'checkbox') {
      return `if (${paramName} !== undefined) filters.push({ column_id: '${f.id}', compare_value: ${paramName}, operator: ${paramName} ? 'checked' : 'unchecked' });`;
    } else {
      return `if (${paramName}) filters.push({ column_id: '${f.id}', compare_value: ${paramName}, operator: 'contains_text' });`;
    }
  }).join('\n  ')}
  
  const queryParams = filters.length > 0 
    ? \`, query_params: { rules: [\${filters.map(f => \`{
        column_id: "\${f.column_id}",
        compare_value: \${Array.isArray(f.compare_value) ? \`[\${f.compare_value}]\` : typeof f.compare_value === 'string' ? \`"\${f.compare_value}"\` : f.compare_value},
        operator: \${f.operator}
      }\`).join(',')}]}\`
    : '';
  
  const query = \`
    query {
      boards(ids: [${board.id}]) {
        id
        name
        items_page(limit: \${limit}\${queryParams}) {
          items {
            id
            name
            created_at
            updated_at
            column_values(ids: [${essential.map(e => `"${e}"`).join(', ')}]) {
              id
              text
              value
              column {
                title
                type
              }
            }
          }
        }
      }
    }
  \`;
  
  try {
    const response = await mondayApi(query);
    const board = response.data?.boards?.[0];
    if (!board) throw new Error('Board not found');
    
    const items = board.items_page?.items || [];
    
    // Format response as markdown
    const lines: string[] = [];
    lines.push(\`# ${boardData.name}\`);
    lines.push(\`**Total Items:** \${items.length}\`);
    lines.push('');
    
    items.forEach((item: any) => {
      lines.push(\`## \${item.name}\`);
      lines.push(\`- **ID:** \${item.id}\`);
      
      item.column_values.forEach((col: any) => {
        if (col.text) {
          lines.push(\`- **\${col.column.title}:** \${col.text}\`);
        }
      });
      lines.push('');
    });
    
    return lines.join('\\n');
  } catch (error) {
    console.error('Error fetching ${board.name} items:', error);
    throw error;
  }
}
`;

      // Save tool function
      const toolPath = path.join(process.cwd(), 'lib', 'tools', board.category, fileName);
      await fs.mkdir(path.dirname(toolPath), { recursive: true });
      await fs.writeFile(toolPath, toolCode);
      
      toolFunctions.push(`export { ${functionName} } from './tools/${board.category}/${functionName}.js';`);
      
      // Create tool definition
      toolDefinitions.push({
        name: functionName,
        description: `Get items from ${boardData.name} board. ${boardData.items_count || 0} total items.`,
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', default: 10, description: 'Maximum items to return' },
            search: { type: 'string', description: 'Search in item names' },
            ...Object.fromEntries(filterable.map(f => {
              const propName = f.id.replace(/-/g, '_');
              if (f.type === 'status' || f.type === 'dropdown' || f.type === 'color') {
                return [propName, { type: 'number', description: `${f.title} (numeric index)` }];
              } else if (f.type === 'checkbox') {
                return [propName, { type: 'boolean', description: f.title }];
              } else if (f.type === 'date') {
                return [propName, { type: 'string', description: `${f.title} (YYYY-MM-DD)` }];
              } else {
                return [propName, { type: 'string', description: f.title }];
              }
            }))
          }
        }
      });
      
      console.log(`  ✅ Generated tool: ${functionName}`);
      
    } catch (error) {
      console.error(`  ❌ Error:`, error);
    }
  }
  
  // Output summary
  console.log('\n## Generated Tool Exports:\n');
  console.log(toolFunctions.join('\n'));
  
  console.log('\n## Tool Definitions:\n');
  console.log(JSON.stringify(toolDefinitions, null, 2));
  
  // Save tool definitions to file
  await fs.writeFile(
    path.join(process.cwd(), 'lib', 'mcp', 'boardToolDefinitions.json'),
    JSON.stringify(toolDefinitions, null, 2)
  );
  
  console.log('\n✅ Tool definitions saved to lib/mcp/boardToolDefinitions.json');
}

generateBoardTools().catch(console.error);