import { mondayApi } from '../monday/client.js';

const AD_SIZES_BOARD_ID = '1558597958';

export async function getAllSizes(args: {
  device?: 'Desktop' | 'Mobile' | 'Tablet' | 'App';
  limit?: number;
}) {
  const { device, limit = 500 } = args;

  try {
    // Build query with optional device filter
    const queryParams = device
      ? `, query_params: { rules: [{ column_id: "dropdown_mkqszqya", compare_value: ["${device}"], operator: contains_text }] }`
      : '';

    const query = `{
      boards(ids: ${AD_SIZES_BOARD_ID}) {
        items_page(
          limit: ${limit}${queryParams}
        ) {
          items {
            name
            column_values {
              column {
                title
              }
              text
              ... on BoardRelationValue {
                display_value
              }
              ... on NumbersValue {
                number
                symbol
              }
            }
          }
        }
      }
    }`;

    console.error(`[getAllSizes] Fetching ad unit sizes${device ? ` for ${device}` : ''}...`);

    const response = await mondayApi(query);
    
    if (!response.data?.boards || response.data.boards.length === 0) {
      return 'No ad sizes board found';
    }

    const items = response.data.boards[0].items_page?.items || [];
    
    if (items.length === 0) {
      return device ? `No ${device} sizes found` : 'No sizes found';
    }
    
    // Process sizes
    const sizes = items.map((item: any) => {
      const columnValues: Record<string, any> = {};
      
      item.column_values?.forEach((col: any) => {
        const title = col.column.title;
        
        // Handle number columns with symbols
        if (col.number !== undefined) {
          columnValues[title] = col.symbol ? `${col.number}${col.symbol}` : col.number;
        } else if (col.display_value) {
          columnValues[title] = col.display_value;
        } else {
          columnValues[title] = col.text || '';
        }
      });
      
      return {
        name: item.name,
        nicknames: columnValues['Kaldenavne - brug kun til intern forståelse, brug i stedet navnet under kolonnen "Annonce Formater"'] || '',
        adUnitNames: columnValues['Ad Unit Navn(e) i GAM'] || '',
        description: columnValues['Beskrivelse'] || '',
        productGroup: columnValues['Produktgruppe'] || '',
        adProducts: columnValues['Annonce Produkter'] || '',
        adFormats: columnValues['Annonce Formater'] || '',
        creativeTechnology: columnValues['Creative Technology'] || '',
        deviceType: columnValues['Device Type'] || '',
        specsUrl: columnValues['Link / URL - specs'] || '',
        averageCTR: columnValues['Average CTR Benchmark'] || '',
        averageViewability: columnValues['Average Viewability Benchmark'] || '',
        averageEAPM: columnValues['Average eAPM (Adnami benchmark) - "effective Attention Per Mille"'] || '',
      };
    });

    // Group sizes by device type if not filtered
    const sizesByDevice = new Map<string, any[]>();
    for (const size of sizes) {
      const deviceType = size.deviceType || 'Other';
      if (!sizesByDevice.has(deviceType)) {
        sizesByDevice.set(deviceType, []);
      }
      sizesByDevice.get(deviceType)?.push(size);
    }

    // Format as markdown output
    const textLines: string[] = [];
    textLines.push(`# Ad Unit Sizes`);
    textLines.push('');
    textLines.push(`**Total:** ${sizes.length} sizes`);
    if (device) {
      textLines.push(`**Device Filter:** ${device}`);
    }
    textLines.push('');
    
    if (device) {
      // Single device output
      for (const size of sizes) {
        textLines.push(`▸ ${size.name}`);
        
        if (size.adUnitNames) {
          textLines.push(`  GAM: ${size.adUnitNames}`);
        }
        
        if (size.adFormats) {
          textLines.push(`  Formater: ${size.adFormats}`);
        }
        
        if (size.adProducts) {
          textLines.push(`  Produkter: ${size.adProducts}`);
        }
        
        if (size.creativeTechnology) {
          textLines.push(`  Teknologi: ${size.creativeTechnology}`);
        }
        
        // Add benchmarks if available
        const benchmarks = [];
        if (size.averageCTR) benchmarks.push(`CTR: ${size.averageCTR}`);
        if (size.averageViewability) benchmarks.push(`Viewability: ${size.averageViewability}`);
        if (size.averageEAPM) benchmarks.push(`eAPM: ${size.averageEAPM}`);
        
        if (benchmarks.length > 0) {
          textLines.push(`  Benchmarks: ${benchmarks.join(', ')}`);
        }
        
        if (size.description) {
          textLines.push(`  ${size.description.substring(0, 100)}${size.description.length > 100 ? '...' : ''}`);
        }
        
        textLines.push('');
      }
    } else {
      // Multi-device output grouped
      const sortedDevices = Array.from(sizesByDevice.keys()).sort();
      
      for (const deviceType of sortedDevices) {
        const deviceSizes = sizesByDevice.get(deviceType) || [];
        textLines.push(`${deviceType.toUpperCase()} (${deviceSizes.length})`);
        textLines.push('─'.repeat(40));
        
        for (const size of deviceSizes) {
          textLines.push(`- ${size.name}`);
          
          if (size.adFormats) {
            textLines.push(`  Formater: ${size.adFormats}`);
          }
          
          if (size.adProducts) {
            textLines.push(`  Produkter: ${size.adProducts}`);
          }
        }
        textLines.push('');
      }
    }

    return textLines.join('\n');
  } catch (error) {
    console.error('Error fetching ad sizes:', error);
    throw new Error(`Failed to fetch ad sizes: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}