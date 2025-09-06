import { config } from 'dotenv';
config({ path: '../../.env.local' });

import { mondayApi, BOARD_IDS } from '../../lib/monday/client.js';

(async () => {
  const query = `
    query GetPublishers($boardId: ID!) {
      boards(ids: [$boardId]) {
        items_page(limit: 5) {
          items {
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
  `;

  const response = await mondayApi(query, { boardId: '1222800432' });
  const items = response.data.boards[0].items_page.items;

  // Look for High-impact.js columns specifically
  for (const item of items) {
    console.log('\n=== ' + item.name + ' ===');
    const highImpactCols = item.column_values.filter(col => 
      col.id === 'dropdown_mksdcgvj' || // topscroll high-impact
      col.id === 'dropdown_mksdjpqx'    // midscroll high-impact
    );
    
    for (const col of highImpactCols) {
      console.log('Column:', col.id);
      console.log('Text:', col.text);
      console.log('Value:', col.value);
      if (col.value) {
        try {
          const parsed = JSON.parse(col.value);
          console.log('Parsed:', parsed);
          
          // Check if any IDs are selected
          if (parsed && parsed.ids && parsed.ids.length > 0) {
            console.log('SELECTED - IDs:', parsed.ids);
          } else {
            console.log('NOT SELECTED - No IDs');
          }
        } catch (e) {
          console.log('Parse error:', e);
        }
      }
    }
  }
})();