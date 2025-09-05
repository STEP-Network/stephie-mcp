import { mondayApi } from '../monday/client.js';

const AD_PRICES_BOARD_ID = '1432155906';

export async function getAllAdPrices(args: {
  type?: 'display' | 'video' | 'all';
  limit?: number;
}) {
  const { type = 'all', limit = 500 } = args;

  try {
    // Determine which groups to query
    const groupIds = type === 'display' 
      ? ['topics'] 
      : type === 'video' 
      ? ['group_title'] 
      : ['topics', 'group_title'];

    const queries = groupIds.map(groupId => `{
      boards(ids: ${AD_PRICES_BOARD_ID}) {
        groups(ids: ["${groupId}"]) {
          title
          items_page(limit: ${limit}) {
            items {
              name
              column_values {
                column {
                  title
                }
                text
                ... on NumbersValue {
                  number
                  symbol
                }
              }
            }
          }
        }
      }
    }`);

    console.error(`[getAllAdPrices] Fetching ${type} ad prices...`);

    // Execute queries
    const responses = await Promise.all(
      queries.map(query => mondayApi(query))
    );

    const allPrices: any[] = [];
    
    for (const response of responses) {
      const groups = response.data?.boards?.[0]?.groups || [];
      
      for (const group of groups) {
        const groupType = group.title?.toLowerCase().includes('video') ? 'video' : 'display';
        const items = group.items_page?.items || [];
        
        for (const item of items) {
          const columnValues: Record<string, any> = {};
          
          item.column_values?.forEach((col: any) => {
            const title = col.column.title;
            
            // Handle number columns
            if (col.number !== undefined) {
              columnValues[title] = col.number;
            } else {
              columnValues[title] = col.text || null;
            }
          });
          
          const bruttoCPM = columnValues['Brutto CPM'];
          const minimumCPM = columnValues['Minimum CPM'];
          const bulk = columnValues['Bulk'];
          const cpc = columnValues['CPC'];
          const sspFloorprice = columnValues['SSP Floorprice'];
          const platform = columnValues['Platform'];
          const link = columnValues['Link'];
          
          allPrices.push({
            name: item.name,
            type: groupType,
            platform: platform || 'Not specified',
            bruttoCPM,
            minimumCPM,
            bulk,
            cpc,
            sspFloorprice,
            link: link && link !== '' && link !== '-' ? link : null,
          });
        }
      }
    }

    // Group by product name and type
    const pricesByTypeAndProduct = new Map<string, Map<string, any[]>>();
    
    for (const price of allPrices) {
      if (!pricesByTypeAndProduct.has(price.type)) {
        pricesByTypeAndProduct.set(price.type, new Map());
      }
      const typeMap = pricesByTypeAndProduct.get(price.type)!;
      
      if (!typeMap.has(price.name)) {
        typeMap.set(price.name, []);
      }
      typeMap.get(price.name)?.push(price);
    }

    // Calculate price ranges
    const getPriceRange = (prices: any[], field: string) => {
      const values = prices
        .map(p => p[field])
        .filter(v => v !== null && v !== undefined)
        .map(v => Number(v));
      
      if (values.length === 0) return null;
      
      const min = Math.min(...values);
      const max = Math.max(...values);
      return min === max ? min : { min, max };
    };

    // Format as markdown output
    const textLines: string[] = [];
    textLines.push(`# Ad Prices`);
    textLines.push('');
    textLines.push(`**Type:** ${type}`);
    textLines.push(`**Currency:** DKK`);
    textLines.push('');
    
    // Display prices
    if (type === 'display' || type === 'all') {
      const displayMap = pricesByTypeAndProduct.get('display');
      if (displayMap && displayMap.size > 0) {
        textLines.push(`DISPLAY PRISER (${displayMap.size} produkter)`);
        textLines.push('─'.repeat(40));
        
        for (const [productName, variants] of displayMap.entries()) {
          textLines.push(`▸ ${productName}`);
          
          if (variants.length === 1) {
            const p = variants[0];
            const prices = [];
            if (p.bruttoCPM !== null) prices.push(`Brutto: ${p.bruttoCPM} DKK`);
            if (p.minimumCPM !== null) prices.push(`Min: ${p.minimumCPM} DKK`);
            if (p.bulk !== null) prices.push(`Bulk: ${p.bulk} DKK`);
            if (p.cpc !== null) prices.push(`CPC: ${p.cpc} DKK`);
            if (p.sspFloorprice !== null) prices.push(`Floor: ${p.sspFloorprice} DKK`);
            
            if (prices.length > 0) {
              textLines.push(`  ${prices.join(', ')}`);
            }
          } else {
            // Multiple platforms
            for (const variant of variants) {
              textLines.push(`  ${variant.platform}:`);
              const prices = [];
              if (variant.bruttoCPM !== null) prices.push(`Brutto: ${variant.bruttoCPM} DKK`);
              if (variant.minimumCPM !== null) prices.push(`Min: ${variant.minimumCPM} DKK`);
              if (variant.bulk !== null) prices.push(`Bulk: ${variant.bulk} DKK`);
              if (variant.cpc !== null) prices.push(`CPC: ${variant.cpc} DKK`);
              if (variant.sspFloorprice !== null) prices.push(`Floor: ${variant.sspFloorprice} DKK`);
              
              if (prices.length > 0) {
                textLines.push(`    ${prices.join(', ')}`);
              }
            }
          }
          textLines.push('');
        }
      }
    }
    
    // Video prices
    if (type === 'video' || type === 'all') {
      const videoMap = pricesByTypeAndProduct.get('video');
      if (videoMap && videoMap.size > 0) {
        textLines.push(`VIDEO PRISER (${videoMap.size} produkter)`);
        textLines.push('─'.repeat(40));
        
        for (const [productName, variants] of videoMap.entries()) {
          textLines.push(`▸ ${productName}`);
          
          if (variants.length === 1) {
            const p = variants[0];
            const prices = [];
            if (p.bruttoCPM !== null) prices.push(`Brutto: ${p.bruttoCPM} DKK`);
            if (p.minimumCPM !== null) prices.push(`Min: ${p.minimumCPM} DKK`);
            if (p.bulk !== null) prices.push(`Bulk: ${p.bulk} DKK`);
            if (p.cpc !== null) prices.push(`CPC: ${p.cpc} DKK`);
            
            if (prices.length > 0) {
              textLines.push(`  ${prices.join(', ')}`);
            }
          } else {
            // Multiple platforms
            for (const variant of variants) {
              textLines.push(`  ${variant.platform}:`);
              const prices = [];
              if (variant.bruttoCPM !== null) prices.push(`Brutto: ${variant.bruttoCPM} DKK`);
              if (variant.minimumCPM !== null) prices.push(`Min: ${variant.minimumCPM} DKK`);
              if (variant.bulk !== null) prices.push(`Bulk: ${variant.bulk} DKK`);
              if (variant.cpc !== null) prices.push(`CPC: ${variant.cpc} DKK`);
              
              if (prices.length > 0) {
                textLines.push(`    ${prices.join(', ')}`);
              }
            }
          }
          textLines.push('');
        }
      }
    }
    
    // Summary
    textLines.push('OVERSIGT');
    textLines.push('─'.repeat(40));
    
    const displayCount = pricesByTypeAndProduct.get('display')?.size || 0;
    const videoCount = pricesByTypeAndProduct.get('video')?.size || 0;
    
    textLines.push(`Total produkter: ${displayCount + videoCount}`);
    if (displayCount > 0) textLines.push(`Display produkter: ${displayCount}`);
    if (videoCount > 0) textLines.push(`Video produkter: ${videoCount}`);
    textLines.push(`Valuta: DKK`);
    textLines.push(`Pristyper: Brutto CPM, Minimum CPM, Bulk, CPC, SSP Floorprice`);

    return textLines.join('\n');
  } catch (error) {
    console.error('Error fetching ad prices:', error);
    throw new Error(`Failed to fetch ad prices: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}