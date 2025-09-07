#!/usr/bin/env tsx

import { config } from 'dotenv';
config({ path: '.env.local' });

import { getOKR } from './lib/tools/okr/getOKR.js';

async function testOKRTeamFilter() {
  console.log('🧪 Testing OKR Tool with Team Filtering\n');
  console.log('='.repeat(80) + '\n');
  
  // Test 1: Get all objectives to see teams
  console.log('TEST 1: All Objectives (showing teams)');
  console.log('-'.repeat(40));
  const result1 = await getOKR({
    includeKeyResults: false,
    limit: 10
  });
  console.log(result1);
  
  console.log('\n' + '='.repeat(80) + '\n');
  
  // Test 2: Filter by specific team
  console.log('TEST 2: Filter by Team (Tech)');
  console.log('-'.repeat(40));
  const result2 = await getOKR({
    team: 'Tech',
    includeKeyResults: true,
    limit: 5
  });
  console.log(result2);
}

testOKRTeamFilter().catch(console.error);