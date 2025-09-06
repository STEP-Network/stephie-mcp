import { config } from 'dotenv';
import { getPublishersByFormats } from '../../lib/tools/getPublishersByFormats.js';

// Load environment variables
config({ path: '../../.env.local' });

(async () => {
  try {
    console.log('Testing High-impact.js filtering with Live status (should return ~92 publishers)...\n');
    
    const result = await getPublishersByFormats({ 
      topscrollHighimpact: 'All',
      midscrollHighimpact: 'All'
      // includeInactive defaults to false, so only Live publishers
    });
    
    // Count the results
    const lines = result.split('\n');
    const totalLine = lines.find(line => line.includes('**Results:**'));
    if (totalLine) {
      console.log(totalLine);
    }
    
    // Show filters applied
    const filterLines = lines.filter(line => line.startsWith('- '));
    console.log('\nFilters applied:');
    filterLines.forEach(line => console.log(line));
    
    // Test with includeInactive = true
    console.log('\n\nTesting with includeInactive=true (should return 106 publishers)...\n');
    
    const resultAll = await getPublishersByFormats({ 
      topscrollHighimpact: 'All',
      midscrollHighimpact: 'All',
      includeInactive: true
    });
    
    const linesAll = resultAll.split('\n');
    const totalLineAll = linesAll.find(line => line.includes('**Results:**'));
    if (totalLineAll) {
      console.log(totalLineAll);
    }
  } catch (error) {
    console.error('Error:', error);
  }
})();