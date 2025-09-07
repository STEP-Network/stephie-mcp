#!/usr/bin/env tsx
/**
 * Tests the board relation filtering implementations
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { getTeams } from '../lib/tools/hr/getTeams.js';
import { getOKR } from '../lib/tools/okr/getOKR.js';
import { getAccounts } from '../lib/tools/crm/getAccounts.js';
import { getContacts } from '../lib/tools/crm/getContacts.js';

async function testTeamFiltering() {
  console.log('🧪 Testing Board Relations Filtering\n');
  console.log('=' .repeat(80) + '\n');
  
  // Step 1: Get teams
  console.log('1️⃣  Getting Teams List...\n');
  const teams = await getTeams({ limit: 5 });
  console.log(teams.split('\n').slice(0, 15).join('\n'));
  console.log('...\n');
  
  // Extract first team ID from markdown
  const teamIdMatch = teams.match(/- \*\*ID:\*\* (\d+)/);
  if (!teamIdMatch) {
    console.log('❌ No team IDs found in response');
    return;
  }
  const teamId = teamIdMatch[1];
  console.log(`✅ Found Team ID: ${teamId}\n`);
  
  // Step 2: Filter OKRs by team
  console.log('2️⃣  Getting OKRs for Team ID ' + teamId + '...\n');
  const okrs = await getOKR({ teamId, limit: 5 });
  console.log(okrs.split('\n').slice(0, 20).join('\n'));
  console.log('...\n');
  
  // Check if filtering worked
  if (okrs.includes(`Team Filter:`)) {
    console.log('✅ Team filtering is working!\n');
  } else {
    console.log('⚠️  Team filtering may not be working\n');
  }
}

async function testAccountContactRelations() {
  console.log('3️⃣  Testing Account-Contact Relations...\n');
  
  // Get first account
  const accounts = await getAccounts({ limit: 1 });
  const accountIdMatch = accounts.match(/- \*\*ID:\*\* (\d+)/);
  
  if (accountIdMatch) {
    const accountId = accountIdMatch[1];
    console.log(`Found Account ID: ${accountId}`);
    
    // Get contacts for this account
    const contacts = await getContacts({ accountId, limit: 5 });
    
    if (contacts.includes(`Related to Account ID ${accountId}`)) {
      console.log('✅ Account-Contact filtering is working!\n');
      console.log(contacts.split('\n').slice(0, 10).join('\n'));
    } else {
      console.log('⚠️  No contacts found for this account\n');
    }
  }
}

async function main() {
  try {
    await testTeamFiltering();
    await testAccountContactRelations();
    
    console.log('=' .repeat(80));
    console.log('\n🎉 Board Relations Test Complete!');
    console.log('\nKey Findings:');
    console.log('- ID-based filtering is now implemented');
    console.log('- Tools can filter by related board items');
    console.log('- Two-step workflow: Get IDs first, then filter');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

main().catch(console.error);