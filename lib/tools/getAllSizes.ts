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
              id
              text
              ... on BoardRelationValue {
                display_value
                linked_items {
                  name
                }
              }
              ... on NumbersValue {
                number
                symbol
              }
              ... on LinkValue {
                url
                text
              }
              ... on LongTextValue {
                text
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
        const id = col.id;
        
        // Map column IDs to values
        switch(id) {
          case 'long_text_mkqsa10e':
            columnValues.description = col.text || '';
            break;
          case 'link_mkqscdn8':
            columnValues.specsUrl = col.url || col.text || '';
            break;
          case 'numeric_mkqs8wx4':
            columnValues.averageCTR = col.number !== undefined 
              ? (col.symbol ? `${col.number}${col.symbol}` : `${col.number}`)
              : '';
            break;
          case 'numeric_mkqspyt0':
            columnValues.averageViewability = col.number !== undefined
              ? (col.symbol ? `${col.number}${col.symbol}` : `${col.number}`)
              : '';
            break;
          case 'numeric_mkqsqecq':
            columnValues.averageEAPM = col.number !== undefined
              ? (col.symbol ? `${col.number}${col.symbol}` : `${col.number}`)
              : '';
            break;
          case 'text_mksgcrz8':
            columnValues.gamNames = col.text || '';
            break;
          case 'dropdown_mkqszqya':
            columnValues.deviceType = col.text || '';
            break;
          case 'board_relation_mkrhhdrx':
            // Extract names from linked items for formats
            columnValues.adFormats = col.linked_items?.length > 0
              ? col.linked_items.map((item: any) => item.name).join(', ')
              : col.display_value || col.text || '';
            break;
          case 'board_relation_mkrhckxh':
            // Extract names from linked items for products
            columnValues.adProducts = col.linked_items?.length > 0
              ? col.linked_items.map((item: any) => item.name).join(', ')
              : col.display_value || col.text || '';
            break;
        }
      });
      
      return {
        name: item.name,
        gamNames: columnValues.gamNames || '',
        description: columnValues.description || '',
        adProducts: columnValues.adProducts || '',
        adFormats: columnValues.adFormats || '',
        deviceType: columnValues.deviceType || '',
        specsUrl: columnValues.specsUrl || '',
        averageCTR: columnValues.averageCTR || '',
        averageViewability: columnValues.averageViewability || '',
        averageEAPM: columnValues.averageEAPM || '',
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

    // Format as markdown table
    const textLines: string[] = [];
    textLines.push(`# Ad Unit Sizes`);
    textLines.push('');
    textLines.push(`**Total:** ${sizes.length} sizes`);
    if (device) {
      textLines.push(`**Device Filter:** ${device}`);
    }
    textLines.push('');
    
    // Main table with essential info
    textLines.push('## Size Overview');
    textLines.push('');
    textLines.push('*Device abbreviations: D=Desktop, M=Mobile, T=Tablet, A=App*');
    textLines.push('');
    textLines.push('| Size | GAM Names | Devices | Products | Formats | CTR | View% | eAPM |');
    textLines.push('|------|-----------|---------|----------|---------|-----|-------|------|');
    
    // Sort sizes by name for consistent output
    const sortedSizes = [...sizes].sort((a, b) => {
      // Sort video sizes (with 'v' suffix) separately
      const aIsVideo = a.name.endsWith('v');
      const bIsVideo = b.name.endsWith('v');
      if (aIsVideo !== bIsVideo) return aIsVideo ? 1 : -1;
      
      // Sort by width first, then height
      const aParts = a.name.replace('v', '').split('x').map(Number);
      const bParts = b.name.replace('v', '').split('x').map(Number);
      if (aParts[0] !== bParts[0]) return bParts[0] - aParts[0]; // Larger widths first
      return bParts[1] - aParts[1]; // Larger heights first
    });
    
    for (const size of sortedSizes) {
      // Clean up device type display
      const devices = size.deviceType || 'Other';
      const cleanDevices = devices
        .split(',')
        .map((d: string) => d.trim())
        .map((d: string) => {
          // Abbreviate device names
          switch(d.toLowerCase()) {
            case 'desktop': return 'D';
            case 'mobile': return 'M';
            case 'tablet': return 'T';
            case 'app': return 'A';
            default: return d.charAt(0);
          }
        })
        .join(',');
      
      // Format GAM names (limit length)
      const gamNames = size.gamNames || '-';
      const shortGamNames = gamNames.length > 20 ? gamNames.substring(0, 17) + '...' : gamNames;
      
      // Format products column (limit length)
      const products = size.adProducts || '-';
      const shortProducts = products.length > 25 ? products.substring(0, 22) + '...' : products;
      
      // Format the formats column (limit length) 
      const formats = size.adFormats || '-';
      const shortFormats = formats.length > 25 ? formats.substring(0, 22) + '...' : formats;
      
      // Format benchmarks
      const ctr = size.averageCTR || '-';
      const viewability = size.averageViewability || '-';
      const eapm = size.averageEAPM || '-';
      
      // Add row with bold size
      textLines.push(`| **${size.name}** | ${shortGamNames} | ${cleanDevices} | ${shortProducts} | ${shortFormats} | ${ctr} | ${viewability} | ${eapm} |`);
    }
    
    textLines.push('');
    
    // Add detailed info for sizes with descriptions or specs
    const sizesWithDetails = sortedSizes.filter(s => s.description || s.specsUrl);
    if (sizesWithDetails.length > 0) {
      textLines.push('## Size Details');
      textLines.push('');
      
      for (const size of sizesWithDetails) {
        textLines.push(`### ${size.name}`);
        
        if (size.gamNames) {
          textLines.push(`**GAM Names:** ${size.gamNames}`);
        }
        
        if (size.description) {
          textLines.push(`**Description:** ${size.description}`);
        }
        
        if (size.adProducts) {
          textLines.push(`**Products:** ${size.adProducts}`);
        }
        
        if (size.specsUrl) {
          textLines.push(`**Specs:** [View Specifications](${size.specsUrl})`);
        }
        
        textLines.push('');
      }
    }
    
    // Add summary by device type
    textLines.push('## Device Distribution');
    textLines.push('');
    
    const deviceCounts = new Map<string, number>();
    for (const size of sizes) {
      const devices = (size.deviceType || 'Other').split(',').map((d: string) => d.trim());
      for (const device of devices) {
        deviceCounts.set(device, (deviceCounts.get(device) || 0) + 1);
      }
    }
    
    const sortedDeviceCounts = Array.from(deviceCounts.entries())
      .sort((a, b) => b[1] - a[1]); // Sort by count descending
    
    textLines.push('| Device | Count | Legend |');
    textLines.push('|--------|-------|--------|');
    for (const [device, count] of sortedDeviceCounts) {
      let legend = '';
      switch(device.toLowerCase()) {
        case 'desktop': legend = 'D = Desktop'; break;
        case 'mobile': legend = 'M = Mobile'; break;
        case 'tablet': legend = 'T = Tablet'; break;
        case 'app': legend = 'A = App'; break;
        default: legend = device; break;
      }
      textLines.push(`| ${device} | ${count} | ${legend} |`);
    }
    
    textLines.push('');
    
    // Add note about video sizes
    const videoSizes = sizes.filter(s => s.name.endsWith('v'));
    if (videoSizes.length > 0) {
      textLines.push('### Video Sizes');
      textLines.push(`*${videoSizes.length} video sizes marked with 'v' suffix*`);
      textLines.push('');
    }
    
    // Add GAM names mapping for easy reference
    textLines.push('### GAM Size Mapping');
    textLines.push('');
    textLines.push('```json');
    const gamMapping = sortedSizes
      .filter(s => s.gamNames)
      .reduce((acc, s) => {
        acc[s.name] = s.gamNames;
        return acc;
      }, {} as Record<string, string>);
    textLines.push(JSON.stringify(gamMapping, null, 2));
    textLines.push('```');

    return textLines.join('\n');
  } catch (error) {
    console.error('Error fetching ad sizes:', error);
    throw new Error(`Failed to fetch ad sizes: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}