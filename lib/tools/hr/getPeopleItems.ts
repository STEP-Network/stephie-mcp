import { mondayApi } from '../../monday/client.js';

export async function getPeopleItems(params: {
  limit?: number;
  search?: string;
  date__1?: string; // Start Date (YYYY-MM-DD)
  status?: number; // Status (numeric index)
  date6__1?: string; // End Date (YYYY-MM-DD)
} = {}) {
  const { limit = 10, search, date__1, status, date6__1 } = params;
  
  // Build filters
  const filters: any[] = [];
  if (search) {
    filters.push({
      column_id: 'name',
      compare_value: search,
      operator: 'contains_text'
    });
  }
  if (date__1) filters.push({ column_id: 'date__1', compare_value: date__1, operator: 'contains_text' });
  if (status !== undefined) filters.push({ column_id: 'status', compare_value: [status], operator: 'any_of' });
  if (date6__1) filters.push({ column_id: 'date6__1', compare_value: date6__1, operator: 'contains_text' });
  
  const queryParams = filters.length > 0 
    ? `, query_params: { rules: [${filters.map(f => `{
        column_id: "${f.column_id}",
        compare_value: ${Array.isArray(f.compare_value) ? `[${f.compare_value}]` : typeof f.compare_value === 'string' ? `"${f.compare_value}"` : f.compare_value},
        operator: ${f.operator}
      }`).join(',')}]}`
    : '';
  
  const query = `
    query {
      boards(ids: [1612664689]) {
        id
        name
        items_page(limit: ${limit}${queryParams}) {
          items {
            id
            name
            created_at
            updated_at
            column_values(ids: ["name", "text__1", "date__1", "text6__1", "status", "link_to_teams__1", "date6__1"]) {
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
    lines.push(`# People`);
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
    console.error('Error fetching People items:', error);
    throw error;
  }
}
