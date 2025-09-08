#!/usr/bin/env tsx
/**
 * Cleans up duplicate columns in the Columns board
 * Keeps one instance per column ID, preferring those with board relations
 */

import { config } from 'dotenv';
import { mondayApi } from '../lib/monday/client.js';

config({ path: '.env.local' });

const COLUMNS_BOARD_ID = '2135717897';

async function cleanupDuplicates() {
  console.log('🧹 Cleaning up duplicate columns...\n');
  
  // Fetch all items
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
              value
            }
          }
        }
      }
    }
  `;
  
  const response = await mondayApi(query);
  const items = response.data?.boards?.[0]?.items_page?.items || [];
  
  console.log(`Found ${items.length} total items\n`);
  
  // Group by column ID
  const byColumnId = new Map<string, Array<any>>();
  
  items.forEach((item: any) => {
    const columnId = item.column_values.find((c: any) => c.id === 'text_mkvjc46e')?.text;
    
    if (columnId) {
      if (!byColumnId.has(columnId)) {
        byColumnId.set(columnId, []);
      }
      byColumnId.get(columnId)!.push(item);
    }
  });
  
  // Find duplicates
  const duplicates: string[] = [];
  let keptCount = 0;
  
  for (const [columnId, items] of byColumnId) {
    if (items.length > 1) {
      console.log(`📋 Column ID "${columnId}" has ${items.length} duplicates`);
      
      // Sort by whether they have board relations (prefer those with relations)
      items.sort((a, b) => {
        const aHasRelation = a.column_values.find((c: any) => c.id === 'board_relation_mkvjb1w9')?.value ? 1 : 0;
        const bHasRelation = b.column_values.find((c: any) => c.id === 'board_relation_mkvjb1w9')?.value ? 1 : 0;
        return bHasRelation - aHasRelation;
      });
      
      // Keep the first one (with relation if exists)
      const keep = items[0];
      console.log(`  ✅ Keeping: "${keep.name}" (ID: ${keep.id})`);
      keptCount++;
      
      // Mark the rest for deletion
      for (let i = 1; i < items.length; i++) {
        console.log(`  ❌ Will delete: "${items[i].name}" (ID: ${items[i].id})`);
        duplicates.push(items[i].id);
      }
    } else {
      keptCount++;
    }
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`  Items to keep: ${keptCount}`);
  console.log(`  Items to delete: ${duplicates.length}`);
  
  if (duplicates.length > 0) {
    console.log('\n🗑️  Deleting duplicates...');
    
    // Delete in batches to avoid rate limiting
    const batchSize = 10;
    for (let i = 0; i < duplicates.length; i += batchSize) {
      const batch = duplicates.slice(i, i + batchSize);
      
      for (const itemId of batch) {
        const mutation = `
          mutation {
            delete_item(item_id: ${itemId}) {
              id
            }
          }
        `;
        
        try {
          await mondayApi(mutation);
          console.log(`  Deleted item ${itemId}`);
        } catch (error) {
          console.error(`  Failed to delete ${itemId}:`, error.message);
        }
      }
      
      // Small delay between batches
      if (i + batchSize < duplicates.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    console.log('\n✨ Cleanup complete!');
  } else {
    console.log('\n✅ No duplicates found!');
  }
}

cleanupDuplicates().catch(console.error);