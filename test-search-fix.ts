#!/usr/bin/env npx tsx

import { getTasksTechIntelligence } from './lib/tools/tasks/getTasksTechIntelligence.js';

async function testSearchFix() {
  // Test 1: Boolean search (Claude bug scenario)
  console.log('Test 1: Boolean search parameter');
  try {
    const result = await getTasksTechIntelligence({ limit: 2, search: true as any });
    const parsed = JSON.parse(result);
    console.log('✅ Handled boolean search gracefully');
    console.log('Items returned:', parsed.data?.items?.length || 0);
  } catch (e: any) {
    console.error('❌ Failed with boolean search:', e.message);
  }

  // Test 2: searchQuery parameter
  console.log('\nTest 2: searchQuery parameter');
  try {
    const result = await getTasksTechIntelligence({ limit: 2, searchQuery: 'stephie' });
    const parsed = JSON.parse(result);
    console.log('✅ searchQuery works');
    console.log('Items returned:', parsed.data?.items?.length || 0);
    if (parsed.metadata?.filters?.search) {
      console.log('Search filter applied:', parsed.metadata.filters.search);
    }
  } catch (e: any) {
    console.error('❌ Failed with searchQuery:', e.message);
  }

  // Test 3: String search (backward compatibility)
  console.log('\nTest 3: String search parameter (backward compat)');
  try {
    const result = await getTasksTechIntelligence({ limit: 2, search: 'monday' });
    const parsed = JSON.parse(result);
    console.log('✅ String search still works');
    console.log('Items returned:', parsed.data?.items?.length || 0);
    if (parsed.metadata?.filters?.search) {
      console.log('Search filter applied:', parsed.metadata.filters.search);
    }
  } catch (e: any) {
    console.error('❌ Failed with string search:', e.message);
  }

  // Test 4: Both parameters (searchQuery should win)
  console.log('\nTest 4: Both parameters provided');
  try {
    const result = await getTasksTechIntelligence({ 
      limit: 2, 
      search: true as any,
      searchQuery: 'make.com'
    });
    const parsed = JSON.parse(result);
    console.log('✅ searchQuery takes precedence over boolean search');
    console.log('Items returned:', parsed.data?.items?.length || 0);
    if (parsed.metadata?.filters?.search) {
      console.log('Search filter applied:', parsed.metadata.filters.search);
    }
  } catch (e: any) {
    console.error('❌ Failed with both parameters:', e.message);
  }
}

testSearchFix().catch(console.error);