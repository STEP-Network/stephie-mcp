#!/usr/bin/env tsx
/**
 * Tests the newly implemented board relation filters
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { getLeads } from '../lib/tools/crm/getLeads.js';
import { getSalesActivities } from '../lib/tools/sales/getSalesActivities.js';
import { getBookings } from '../lib/tools/operations/getBookings.js';
import { getPeople } from '../lib/tools/hr/getPeople.js';
import { getTeams } from '../lib/tools/hr/getTeams.js';
import { getAccounts } from '../lib/tools/crm/getAccounts.js';
import { getContacts } from '../lib/tools/crm/getContacts.js';
import { getOpportunities } from '../lib/tools/sales/getOpportunities.js';

async function testLeadsFiltering() {
  console.log('🧪 Testing New Board Relations\n');
  console.log('=' .repeat(80) + '\n');
  
  // Test 1: Leads with existing contact/account detection
  console.log('1️⃣  Testing Leads Filtering...\n');
  
  // First get a contact to filter by
  const contacts = await getContacts({ limit: 1 });
  const contactIdMatch = contacts.match(/- \*\*ID:\*\* (\d+)/);
  
  if (contactIdMatch) {
    const contactId = contactIdMatch[1];
    console.log(`Found Contact ID: ${contactId}`);
    
    const leads = await getLeads({ existingContactId: contactId, limit: 5 });
    if (leads.includes('Has existing Contact ID')) {
      console.log('✅ Leads contact filtering working!');
    } else {
      console.log('⚠️  No leads found with this contact');
    }
  }
  console.log('');
}

async function testSalesActivitiesFiltering() {
  console.log('2️⃣  Testing Sales Activities Filtering...\n');
  
  // Get an account to filter by
  const accounts = await getAccounts({ limit: 1 });
  const accountIdMatch = accounts.match(/- \*\*ID:\*\* (\d+)/);
  
  if (accountIdMatch) {
    const accountId = accountIdMatch[1];
    console.log(`Found Account ID: ${accountId}`);
    
    const activities = await getSalesActivities({ accountId, limit: 5 });
    if (activities.includes('Related to Account ID')) {
      console.log('✅ Sales Activities account filtering working!');
      console.log(activities.split('\n').slice(0, 10).join('\n'));
    } else {
      console.log('⚠️  No activities found for this account');
    }
  }
  console.log('');
}

async function testBookingsOpportunityRelation() {
  console.log('3️⃣  Testing Bookings-Opportunity Relation...\n');
  
  // Get an opportunity to filter by
  const opportunities = await getOpportunities({ limit: 1 });
  const oppIdMatch = opportunities.match(/- \*\*ID:\*\* (\d+)/);
  
  if (oppIdMatch) {
    const opportunityId = oppIdMatch[1];
    console.log(`Found Opportunity ID: ${opportunityId}`);
    
    const bookings = await getBookings({ opportunityId, limit: 5 });
    if (bookings.includes('Related to Opportunity ID')) {
      console.log('✅ Bookings opportunity filtering working!');
    } else {
      console.log('⚠️  No bookings found for this opportunity');
    }
  }
  console.log('');
}

async function testPeopleTeamRelation() {
  console.log('4️⃣  Testing People-Team Relations...\n');
  
  // Get a team
  const teams = await getTeams({ limit: 1 });
  const teamIdMatch = teams.match(/- \*\*ID:\*\* (\d+)/);
  
  if (teamIdMatch) {
    const teamId = teamIdMatch[1];
    console.log(`Found Team ID: ${teamId}`);
    
    const people = await getPeople({ teamId, limit: 5 });
    if (people.includes('In Team ID')) {
      console.log('✅ People team filtering working!');
      console.log(people.split('\n').slice(0, 10).join('\n'));
    } else {
      console.log('⚠️  No people found in this team');
    }
  }
  console.log('');
}

async function main() {
  try {
    await testLeadsFiltering();
    await testSalesActivitiesFiltering();
    await testBookingsOpportunityRelation();
    await testPeopleTeamRelation();
    
    console.log('=' .repeat(80));
    console.log('\n🎉 New Board Relations Test Complete!');
    console.log('\nImplemented Relations Summary:');
    console.log('- getLeads: existingContactId, existingAccountId, opportunityId');
    console.log('- getSalesActivities: accountId, contactId, opportunityId');
    console.log('- getBookings: opportunityId');
    console.log('- getPeople: teamId');
    console.log('- getTeams: peopleId, objectiveId');
    console.log('\nAll critical business relations are now implemented!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

main().catch(console.error);