import { mondayApi } from '../../monday/client.js';

export async function getLeads(params: {
  limit?: number;
  search?: string;
  lead_owner?: string; // Owner
  lead_status?: number; // Status (numeric index)
  status_1__1?: number; // Type (husk at angiv!) (numeric index)
  date0__1?: string; // Created Date (YYYY-MM-DD)
} = {}) {
  const { limit = 10, search, lead_owner, lead_status, status_1__1, date0__1 } = params;
  
  // Build filters
  const filters: any[] = [];
  if (search) {
    filters.push({
      column_id: 'name',
      compare_value: search,
      operator: 'contains_text'
    });
  }
  if (lead_owner) filters.push({ column_id: 'lead_owner', compare_value: lead_owner, operator: 'contains_text' });
  if (lead_status !== undefined) filters.push({ column_id: 'lead_status', compare_value: [lead_status], operator: 'any_of' });
  if (status_1__1 !== undefined) filters.push({ column_id: 'status_1__1', compare_value: [status_1__1], operator: 'any_of' });
  if (date0__1) filters.push({ column_id: 'date0__1', compare_value: date0__1, operator: 'contains_text' });
  
  const queryParams = filters.length > 0 
    ? `, query_params: { rules: [${filters.map(f => `{
        column_id: "${f.column_id}",
        compare_value: ${Array.isArray(f.compare_value) ? `[${f.compare_value}]` : typeof f.compare_value === 'string' ? `"${f.compare_value}"` : f.compare_value},
        operator: ${f.operator}
      }`).join(',')}]}`
    : '';
  
  const query = `
    query {
      boards(ids: [1402911026]) {
        id
        name
        items_page(limit: ${limit}${queryParams}) {
          items {
            id
            name
            created_at
            updated_at
            column_values(ids: ["name", "lead_owner", "lead_status", "status_1__1", "date0__1"]) {
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
    lines.push(`# Leads`);
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
    console.error('Error fetching Leads items:', error);
    throw error;
  }
}
