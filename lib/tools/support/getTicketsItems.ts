import { mondayApi } from '../../monday/client.js';

export async function getTicketsItems(params: {
  limit?: number;
  search?: string;
  status95?: number; // Status (numeric index)
  priority?: number; // Priority (numeric index)
  request_type?: number; // Request Type (numeric index)
  date?: string; // Creation Date (YYYY-MM-DD)
  date5?: string; // Last Customer Response Date (YYYY-MM-DD)
} = {}) {
  const { limit = 10, search, status95, priority, request_type, date, date5 } = params;
  
  // Build filters
  const filters: any[] = [];
  if (search) {
    filters.push({
      column_id: 'name',
      compare_value: search,
      operator: 'contains_text'
    });
  }
  if (status95 !== undefined) filters.push({ column_id: 'status95', compare_value: [status95], operator: 'any_of' });
  if (priority !== undefined) filters.push({ column_id: 'priority', compare_value: [priority], operator: 'any_of' });
  if (request_type !== undefined) filters.push({ column_id: 'request_type', compare_value: [request_type], operator: 'any_of' });
  if (date) filters.push({ column_id: 'date', compare_value: date, operator: 'contains_text' });
  if (date5) filters.push({ column_id: 'date5', compare_value: date5, operator: 'contains_text' });
  
  const queryParams = filters.length > 0 
    ? `, query_params: { rules: [${filters.map(f => `{
        column_id: "${f.column_id}",
        compare_value: ${Array.isArray(f.compare_value) ? `[${f.compare_value}]` : typeof f.compare_value === 'string' ? `"${f.compare_value}"` : f.compare_value},
        operator: ${f.operator}
      }`).join(',')}]}`
    : '';
  
  const query = `
    query {
      boards(ids: [1647372207]) {
        id
        name
        items_page(limit: ${limit}${queryParams}) {
          items {
            id
            name
            created_at
            updated_at
            column_values(ids: ["name", "status95", "text", "priority", "request_type", "date", "date5", "date__1", "date4__1", "connect_boards2"]) {
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
    
    const items = board.items_page?.items || [];
    
    // Format response as markdown
    const lines: string[] = [];
    lines.push(`# Tickets`);
    lines.push(`**Total Items:** ${items.length}`);
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
    console.error('Error fetching Tickets items:', error);
    throw error;
  }
}
