#!/usr/bin/env npx tsx

import * as dotenv from 'dotenv';
import { findPublisherAdUnits } from '../../lib/tools/findPublisherAdUnits.js';

// Load environment variables
dotenv.config({ path: '../../.env.local' });

async function test() {
  console.log('Testing findPublisherAdUnits with jv.dk...\n');
  
  try {
    const result = await findPublisherAdUnits({ 
      names: ['jv.dk']
    });
    
    // Parse the text result
    const lines = result.split('\n');
    console.log('RESULT:');
    console.log('=' .repeat(60));
    console.log(result);
    console.log('=' .repeat(60));
    
    // Check if we got parent, publisher, and children
    const hasParent = lines.some(line => line.includes('Level 1'));
    const hasPublisher = lines.some(line => line.includes('Level 2'));
    const hasChildren = lines.some(line => line.includes('Level 3'));
    
    console.log('\nVERIFICATION:');
    console.log(`✓ Parent group (Level 1) found: ${hasParent}`);
    console.log(`✓ Publisher (Level 2) found: ${hasPublisher}`);
    console.log(`✓ Child ad units (Level 3) found: ${hasChildren}`);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

test();