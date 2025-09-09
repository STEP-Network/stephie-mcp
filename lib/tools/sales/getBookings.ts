import { mondayApi } from '../../monday/client.js';
import { getDynamicColumns } from '../dynamic-columns.js';

export async function getBookings(params: {
  limit?: number;
  search?: string;
  status0__1?: number; // Status (numeric index)
  date?: string; // Midway date (YYYY-MM-DD)
  person?: string; // Owner
  status_3?: number; // Campaign status (numeric index)
  status2?: number; // Midway reporting (numeric index)
  opportunityId?: string; // Filter by linked opportunity (use getOpportunities to find IDs)
} = {}) {
  const { limit = 10, search, status0__1, date, person, status_3, status2, opportunityId } = params;
  
  // Fetch dynamic columns from Columns board
  const BOARD_ID = '1549621337';
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
  if (status0__1 !== undefined) filters.push({ column_id: 'status0__1', compare_value: [status0__1], operator: 'any_of' });
  if (date) filters.push({ column_id: 'date', compare_value: date, operator: 'contains_text' });
  if (person) filters.push({ column_id: 'person', compare_value: person, operator: 'contains_text' });
  if (status_3 !== undefined) filters.push({ column_id: 'status_3', compare_value: [status_3], operator: 'any_of' });
  if (status2 !== undefined) filters.push({ column_id: 'status2', compare_value: [status2], operator: 'any_of' });
  
  const queryParams = filters.length > 0 
    ? `, query_params: { rules: [${filters.map(f => `{
        column_id: "${f.column_id}",
        compare_value: ${Array.isArray(f.compare_value) ? `[${f.compare_value}]` : typeof f.compare_value === 'string' ? `"${f.compare_value}"` : f.compare_value},
        operator: ${f.operator}
      }`).join(',')}]}`
    : '';
  
  const query = `
    query {
      boards(ids: [1549621337]) {
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
    if (opportunityId) {
      items = items.filter((item: any) => {
        const relationCol = item.column_values.find((c: any) => c.id === 'link_to_opportunities__1');
        if (relationCol?.value) {
          try {
            const linked = JSON.parse(relationCol.value);
            return linked?.linkedItemIds?.includes(opportunityId);
          } catch {
            return false;
          }
        }
        return false;
      });
    }
    
    // Format response as markdown
    const lines: string[] = [];
    lines.push(`# Bookings 3.0`);
    lines.push(`**Total Items:** ${items.length}`);
    
    // Show active filters
    if (opportunityId) lines.push(`**Filter:** Related to Opportunity ID ${opportunityId}`);
    
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
    console.error('Error fetching Bookings items:', error);
    throw error;
  }
}
