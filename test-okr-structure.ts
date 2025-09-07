#!/usr/bin/env tsx

import { config } from 'dotenv';
config({ path: '.env.local' });

import { mondayApi } from './lib/monday/client.js';

async function analyzeOKRBoard() {
  console.log('🔍 Analyzing OKR Board Structure (1631918659)\n');
  
  // Get board columns and structure
  const columnsQuery = `
    query {
      boards(ids: [1631918659]) {
        id
        name
        description
        columns {
          id
          title
          type
          settings_str
        }
      }
    }
  `;
  
  const columnsResponse = await mondayApi(columnsQuery);
  const board = columnsResponse.data?.boards?.[0];
  
  console.log(`📋 Board: ${board.name}`);
  console.log(`Description: ${board.description || 'N/A'}\n`);
  
  console.log('📊 Columns:');
  board.columns.forEach((col: any) => {
    console.log(`  - ${col.title} (${col.id}) - Type: ${col.type}`);
  });
  
  console.log('\n' + '='.repeat(80) + '\n');
  
  // Get items with subitems to understand structure
  const itemsQuery = `
    query {
      boards(ids: [1631918659]) {
        items_page(limit: 3) {
          items {
            id
            name
            column_values {
              id
              text
              value
            }
            subitems {
              id
              name
              column_values {
                id
                text
                value
              }
            }
          }
        }
      }
    }
  `;
  
  const itemsResponse = await mondayApi(itemsQuery);
  const items = itemsResponse.data?.boards?.[0]?.items_page?.items || [];
  
  console.log('📌 Sample Objectives with Key Results:\n');
  
  items.forEach((item: any, idx: number) => {
    console.log(`${idx + 1}. OBJECTIVE: ${item.name} (ID: ${item.id})`);
    
    // Show objective columns
    const statusCol = item.column_values.find((c: any) => c.id === 'color_mkpksp3f');
    const ownerCol = item.column_values.find((c: any) => c.id === 'people__1');
    const progressCol = item.column_values.find((c: any) => c.id === 'numbers3__1');
    
    console.log(`   Status: ${statusCol?.text || 'N/A'}`);
    console.log(`   Owner: ${ownerCol?.text || 'N/A'}`);
    console.log(`   Progress: ${progressCol?.text || 'N/A'}`);
    
    // Show key results (subitems)
    if (item.subitems && item.subitems.length > 0) {
      console.log(`   Key Results (${item.subitems.length}):`);
      item.subitems.forEach((subitem: any, sidx: number) => {
        console.log(`     ${sidx + 1}. ${subitem.name} (ID: ${subitem.id})`);
        
        const krStatusCol = subitem.column_values.find((c: any) => c.id === 'status0__1');
        const krOwnerCol = subitem.column_values.find((c: any) => c.id === 'person');
        const krProgressCol = subitem.column_values.find((c: any) => c.id === 'numbers__1');
        
        console.log(`        Status: ${krStatusCol?.text || 'N/A'}`);
        console.log(`        Owner: ${krOwnerCol?.text || 'N/A'}`);
        console.log(`        Progress: ${krProgressCol?.text || 'N/A'}`);
      });
    } else {
      console.log('   No Key Results');
    }
    console.log('');
  });
  
  console.log('\n' + '='.repeat(80) + '\n');
  
  // Analyze column differences
  console.log('📊 Column Analysis:\n');
  console.log('Objective-specific columns (main items):');
  console.log('  - color_mkpksp3f (Status)');
  console.log('  - people__1 (Owner)');
  console.log('  - numbers3__1 (Progress)');
  console.log('  - date__1 (Due Date)');
  console.log('  - text__1 (Description)\n');
  
  console.log('Key Result-specific columns (subitems):');
  console.log('  - status0__1 (Status)');
  console.log('  - person (Owner)');
  console.log('  - numbers__1 (Progress)');
  console.log('  - date8__1 (Due Date)');
  console.log('  - text_1__1 (Description)');
}

analyzeOKRBoard().catch(console.error);