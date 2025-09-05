import { mondayApi, BOARD_IDS } from '../monday/client.js';

export async function getAllFormats(args: {
  limit?: number;
}) {
  const { limit = 100 } = args;

  try {
    const query = `{
      boards(ids: ${BOARD_IDS.FORMATS}) {
        items_page(limit: ${limit}) {
          items {
            name
            column_values {
              column {
                title
              }
              text
              ... on BoardRelationValue {
                linked_items {
                  name
                }
                display_value
              }
            }
          }
        }
      }
    }`;

    console.error('[getAllFormats] Fetching formats...');

    const response = await mondayApi(query);
    
    if (!response.data?.boards || response.data.boards.length === 0) {
      return 'No formats board found';
    }

    const items = response.data.boards[0].items_page?.items || [];
    
    if (items.length === 0) {
      return 'No formats found';
    }
    
    // Process formats
    const formats = items.map((item: any) => {
      const columnValues: Record<string, any> = {};
      
      item.column_values?.forEach((col: any) => {
        const title = col.column.title;
        if (col.linked_items && col.linked_items.length > 0) {
          columnValues[title] = col.linked_items.map((i: any) => i.name).join(', ');
        } else if (col.display_value) {
          columnValues[title] = col.display_value;
        } else {
          columnValues[title] = col.text || '';
        }
      });
      
      return {
        name: item.name,
        deviceType: columnValues['Device Type'] || '',
        description: columnValues['Format Beskrivelse'] || '',
        bookingDescription: columnValues['Booking Beskrivelse'] || '',
        sizes: columnValues['Ad Unit Størrelser'] || '',
        products: columnValues['Annonce Produkter'] || '',
        productGroups: columnValues['Produktgrupper'] || '',
        aliases: columnValues['Kaldenavne - brug kun til intern forståelse, brug i stedet navnet under kolonnen "Annonce Formater"'] || '',
      };
    });

    // Group formats by device type
    const formatsByDevice = new Map<string, any[]>();
    for (const format of formats) {
      const deviceType = format.deviceType || 'Other';
      if (!formatsByDevice.has(deviceType)) {
        formatsByDevice.set(deviceType, []);
      }
      formatsByDevice.get(deviceType)?.push(format);
    }

    // Format as text output
    const textLines: string[] = [];
    textLines.push(`AD FORMATER (${formats.length} formater)`);
    textLines.push('');
    
    // Sort device types alphabetically
    const sortedDevices = Array.from(formatsByDevice.keys()).sort();
    
    for (const device of sortedDevices) {
      const deviceFormats = formatsByDevice.get(device) || [];
      textLines.push(`${device.toUpperCase()} (${deviceFormats.length})`);
      textLines.push('─'.repeat(40));
      
      for (const format of deviceFormats) {
        textLines.push(`- ${format.name}`);
        
        if (format.sizes) {
          textLines.push(`  Størrelser: ${format.sizes}`);
        }
        
        if (format.products) {
          textLines.push(`  Produkter: ${format.products}`);
        }
        
        if (format.productGroups) {
          textLines.push(`  Produktgrupper: ${format.productGroups}`);
        }
        
        if (format.aliases) {
          textLines.push(`  Aliases: ${format.aliases}`);
        }
        
        if (format.description) {
          textLines.push(`  ${format.description.substring(0, 100)}${format.description.length > 100 ? '...' : ''}`);
        }
      }
      textLines.push('');
    }

    return textLines.join('\n');
  } catch (error) {
    console.error('Error fetching formats:', error);
    throw new Error(`Failed to fetch formats: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}