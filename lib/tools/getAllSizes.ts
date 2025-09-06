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
    textLines.push('| Size | Devices | Products | Formats |');
    textLines.push('|------|---------|----------|---------|');
    
    // Sort sizes by Product first, then Format, then size
    const sortedSizes = [...sizes].sort((a, b) => {
      // First sort by product
      const productCompare = (a.adProducts || 'zzz').localeCompare(b.adProducts || 'zzz');
      if (productCompare !== 0) return productCompare;
      
      // Then sort by format
      const formatCompare = (a.adFormats || 'zzz').localeCompare(b.adFormats || 'zzz');
      if (formatCompare !== 0) return formatCompare;
      
      // Finally sort by size dimensions
      const aIsVideo = a.name.endsWith('v');
      const bIsVideo = b.name.endsWith('v');
      if (aIsVideo !== bIsVideo) return aIsVideo ? 1 : -1;
      
      const aParts = a.name.replace('v', '').split('x').map(Number);
      const bParts = b.name.replace('v', '').split('x').map(Number);
      if (aParts[0] !== bParts[0]) return bParts[0] - aParts[0];
      return bParts[1] - aParts[1];
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
      
      // Format products and formats columns (no truncation)
      const products = size.adProducts || '-';
      const formats = size.adFormats || '-';
      
      // Add row with bold size
      textLines.push(`| **${size.name}** | ${cleanDevices} | ${products} | ${formats} |`);
    }
    
    textLines.push('');
    
    // Add detailed info for sizes with benchmarks, descriptions or specs
    const sizesWithDetails = sortedSizes.filter(s => 
      s.description || s.specsUrl || s.gamNames || 
      s.averageCTR || s.averageViewability || s.averageEAPM
    );
    
    if (sizesWithDetails.length > 0) {
      textLines.push('## Size Details & Benchmarks');
      textLines.push('');
      
      for (const size of sizesWithDetails) {
        textLines.push(`### ${size.name}`);
        
        if (size.gamNames) {
          textLines.push(`**GAM Ad Unit Names:** ${size.gamNames}`);
        }
        
        if (size.adProducts) {
          textLines.push(`**Products:** ${size.adProducts}`);
        }
        
        // Add benchmarks if available
        const benchmarks = [];
        if (size.averageCTR && size.averageCTR !== 'null%') {
          benchmarks.push(`CTR: ${size.averageCTR}`);
        }
        if (size.averageViewability && size.averageViewability !== 'null%') {
          benchmarks.push(`Viewability: ${size.averageViewability}`);
        }
        if (size.averageEAPM && size.averageEAPM !== 'null') {
          benchmarks.push(`eAPM: ${size.averageEAPM}`);
        }
        
        if (benchmarks.length > 0) {
          textLines.push(`**Benchmarks:** ${benchmarks.join(' | ')}`);
        }
        
        if (size.description) {
          textLines.push(`**Description:** ${size.description}`);
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