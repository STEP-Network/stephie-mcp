import { mondayApi } from '../../monday/client.js';
import { getDynamicColumns } from '../dynamic-columns.js';

export async function getDeals(params: {
  limit?: number;
  search?: string;
  color_mkqby95j?: number; // Status (numeric index)
  agencyId?: string; // Filter by agency account (use getAccounts to find IDs)
  advertiserId?: string; // Filter by advertiser account (use getAccounts to find IDs)
  contactsId?: string; // Filter by linked contacts (use getContacts to find IDs)
} = {}) {
  const { limit = 10, search, color_mkqby95j, agencyId, advertiserId, contactsId } = params;
  
  // Fetch dynamic columns from Columns board
  const BOARD_ID = '1623368485';
  const dynamicColumns = await getDynamicColumns(BOARD_ID);
  
  
  // Build filters
  const filters: any[] = [];
  if (search) {
    filters.push({
      column_id: 'name',
      compare_value: search,
      operator: 'contains_text'
    });
  }
  if (color_mkqby95j !== undefined) filters.push({ column_id: 'color_mkqby95j', compare_value: [color_mkqby95j], operator: 'any_of' });
  
  const queryParams = filters.length > 0 
    ? `, query_params: { rules: [${filters.map(f => `{
        column_id: "${f.column_id}",
        compare_value: ${Array.isArray(f.compare_value) ? `[${f.compare_value}]` : typeof f.compare_value === 'string' ? `"${f.compare_value}"` : f.compare_value},
        operator: ${f.operator}
      }`).join(',')}]}`
    : '';
  
  const query = `
    query {
      boards(ids: [1623368485]) {
        id
        name
        items_page(limit: ${limit}${queryParams}) {
          items {
            id
            name
            created_at
            updated_at
            column_values(ids: [${dynamicColumns.map(id => `"${id}"`).join(", ")}]) {
              id
              text
              value
              column {
                title
                type
              }
            }
          }
        }
      }
    }
  `;
  
  try {
    const response = await mondayApi(query);
    const board = response.data?.boards?.[0];
    if (!board) throw new Error('Board not found');
    
    let items = board.items_page?.items || [];
    
    // Apply board relation filters
    if (agencyId) {
      items = items.filter((item: any) => {
        const relationCol = item.column_values.find((c: any) => c.id === 'connect_boards_mkmjpjjc');
        if (relationCol?.value) {
          try {
            const linked = JSON.parse(relationCol.value);
            return linked?.linkedItemIds?.includes(agencyId);
          } catch {
            return false;
          }
        }
        return false;
      });
    }
    
    if (advertiserId) {
      items = items.filter((item: any) => {
        const relationCol = item.column_values.find((c: any) => c.id === 'connect_boards_mkmjr3e3');
        if (relationCol?.value) {
          try {
            const linked = JSON.parse(relationCol.value);
            return linked?.linkedItemIds?.includes(advertiserId);
          } catch {
            return false;
          }
        }
        return false;
      });
    }
    
    if (contactsId) {
      items = items.filter((item: any) => {
        const relationCol = item.column_values.find((c: any) => c.id === 'connect_boards3__1');
        if (relationCol?.value) {
          try {
            const linked = JSON.parse(relationCol.value);
            return linked?.linkedItemIds?.includes(contactsId);
          } catch {
            return false;
          }
        }
        return false;
      });
    }
    
    // Format response as markdown
    const lines: string[] = [];
    lines.push(`# Deals`);
    lines.push(`**Total Items:** ${items.length}`);
    
    // Show active filters
    if (agencyId) lines.push(`**Filter:** Related to Agency ID ${agencyId}`);
    if (advertiserId) lines.push(`**Filter:** Related to Advertiser ID ${advertiserId}`);
    if (contactsId) lines.push(`**Filter:** Related to Contact ID ${contactsId}`);
    
    lines.push('');
    
    items.forEach((item: any) => {
      lines.push(`## ${item.name}`);
      lines.push(`- **ID:** ${item.id}`);
      
      item.column_values.forEach((col: any) => {
        if (col.text) {
          lines.push(`- **${col.column.title}:** ${col.text}`);
        }
      });
      lines.push('');
    });
    
    return lines.join('\n');
  } catch (error) {
    console.error('Error fetching Deals items:', error);
    throw error;
  }
}
