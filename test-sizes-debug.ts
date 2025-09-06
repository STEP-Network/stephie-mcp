import { config } from 'dotenv';
config({ path: '.env.local' });
import { getAllSizes } from './lib/tools/getAllSizes.js';

async function test() {
  try {
    console.error('Starting getAllSizes test...');
    const result = await getAllSizes({});
    console.error('Result type:', typeof result);
    console.error('Result length:', result.length);
    
    // Output the result
    console.log(result);
  } catch (error: any) {
    console.error('Error in getAllSizes:', error.message);
    console.error('Stack:', error.stack);
  }
}

test();