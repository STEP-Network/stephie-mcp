#!/usr/bin/env tsx
/**
 * Development helper to analyze a board's columns and identify essential ones
 * Usage: pnpm tsx scripts/dev-analyze-board.ts <boardId>
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { mondayApi } from '../lib/monday/client.js';

// Column types that are typically essential for filtering and display
const ESSENTIAL_COLUMN_TYPES = [
  'name',
  'status',
  'dropdown',
  'text',
  'numbers',
  'date',
  'people',
  'board_relation',
  'checkbox',
  'color'
];

// Keywords that suggest a column is important
const IMPORTANT_KEYWORDS = [
  'name', 'title', 'status', 'type', 'id', 'group', 'format',
  'size', 'price', 'cpm', 'vertical', 'publisher', 'product',
  'key', 'value', 'segment', 'location', 'active', 'live',
  'approved', 'priority', 'category', 'level', 'parent'
];

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

  try {
    const response = await mondayApi(query, { boardId });
    const board = response.data?.boards?.[0];
    
    if (!board) {
      console.error(`Board ${boardId} not found`);
      return;
    }

    console.log(`\n# Board Analysis: ${board.name}`);
    console.log(`ID: ${board.id}`);
    console.log(`Items: ${board.items_count}`);
    console.log(`Total Columns: ${board.columns.length}\n`);

    // Analyze columns
    const essentialColumns: any[] = [];
    const filterableColumns: any[] = [];
    const allColumns: any[] = [];

    board.columns.forEach((col: any) => {
      const columnInfo = {
        id: col.id,
        title: col.title,
        type: col.type,
        hasOptions: false,
        optionCount: 0
      };

      // Parse settings for status/dropdown columns
      if ((col.type === 'status' || col.type === 'dropdown' || col.type === 'color') && col.settings_str) {
        try {
          const settings = JSON.parse(col.settings_str);
          if (settings.labels) {
            columnInfo.hasOptions = true;
            columnInfo.optionCount = Object.keys(settings.labels).length;
          }
        } catch (e) {}
      }

      allColumns.push(columnInfo);

      // Determine if column is essential
      const isEssentialType = ESSENTIAL_COLUMN_TYPES.includes(col.type);
      const hasImportantKeyword = IMPORTANT_KEYWORDS.some(keyword => 
        col.title.toLowerCase().includes(keyword)
      );

      if (isEssentialType && (hasImportantKeyword || col.type === 'name')) {
        essentialColumns.push(columnInfo);
      }

      // Determine if column is good for filtering
      if (['status', 'dropdown', 'color', 'checkbox', 'date', 'people', 'board_relation'].includes(col.type)) {
        filterableColumns.push(columnInfo);
      }
    });

    // Output analysis
    console.log('## Essential Columns (for display):');
    console.log('```typescript');
    console.log('const essentialColumns = [');
    essentialColumns.forEach(col => {
      console.log(`  '${col.id}', // ${col.title} (${col.type})`);
    });
    console.log('];');
    console.log('```\n');

    console.log('## Filterable Columns:');
    console.log('```typescript');
    console.log('const filterableColumns = {');
    filterableColumns.forEach(col => {
      let filterInfo = `  '${col.id}': { title: '${col.title}', type: '${col.type}'`;
      if (col.hasOptions) {
        filterInfo += `, options: ${col.optionCount}`;
      }
      filterInfo += ' },';
      console.log(filterInfo);
    });
    console.log('};');
    console.log('```\n');

    // Generate tool skeleton
    console.log('## Generated Tool Skeleton:');
    console.log('```typescript');
    console.log(`{
  name: 'get${board.name.replace(/[^a-zA-Z0-9]/g, '')}',
  description: '${board.name} - ${board.description || 'No description'}. ${board.items_count} items.',
  inputSchema: {
    type: 'object',
    properties: {
      limit: { type: 'number', default: 10 },`);
    
    // Add filterable properties
    filterableColumns.slice(0, 5).forEach(col => {
      if (col.type === 'status' || col.type === 'dropdown' || col.type === 'color') {
        console.log(`      ${col.id.replace(/-/g, '_')}: { type: 'number', description: '${col.title} (index)' },`);
      } else if (col.type === 'checkbox') {
        console.log(`      ${col.id.replace(/-/g, '_')}: { type: 'boolean', description: '${col.title}' },`);
      } else if (col.type === 'date') {
        console.log(`      ${col.id.replace(/-/g, '_')}: { type: 'string', description: '${col.title} (YYYY-MM-DD)' },`);
      } else {
        console.log(`      ${col.id.replace(/-/g, '_')}: { type: 'string', description: '${col.title}' },`);
      }
    });

    console.log(`    }
  }
}`);
    console.log('```\n');

    // Output all columns as reference
    console.log('## All Columns Reference:');
    allColumns.forEach(col => {
      console.log(`- ${col.title} (${col.id}) - Type: ${col.type}${col.hasOptions ? ` [${col.optionCount} options]` : ''}`);
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

// Get board ID from command line
const boardId = process.argv[2];
if (!boardId) {
  console.error('Usage: pnpm tsx scripts/dev-analyze-board.ts <boardId>');
  console.error('Example: pnpm tsx scripts/dev-analyze-board.ts 1545299249');
  process.exit(1);
}

analyzeBoard(boardId);