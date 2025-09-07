import { mondayApi } from '../../monday/client.js';

export async function getSalesActivities(params: {
  limit?: number;
  search?: string;
  activity_owner?: string; // *Owner
  activity_status?: number; // Status (numeric index)
  activity_type?: number; // *Activity Type (numeric index)
} = {}) {
  const { limit = 10, search, activity_owner, activity_status, activity_type } = params;
  
  // Build filters
  const filters: any[] = [];
  if (search) {
    filters.push({
      column_id: 'name',
      compare_value: search,
      operator: 'contains_text'
    });
  }
  if (activity_owner) filters.push({ column_id: 'activity_owner', compare_value: activity_owner, operator: 'contains_text' });
  if (activity_status !== undefined) filters.push({ column_id: 'activity_status', compare_value: [activity_status], operator: 'any_of' });
  if (activity_type !== undefined) filters.push({ column_id: 'activity_type', compare_value: [activity_type], operator: 'any_of' });
  
  const queryParams = filters.length > 0 
    ? `, query_params: { rules: [${filters.map(f => `{
        column_id: "${f.column_id}",
        compare_value: ${Array.isArray(f.compare_value) ? `[${f.compare_value}]` : typeof f.compare_value === 'string' ? `"${f.compare_value}"` : f.compare_value},
        operator: ${f.operator}
      }`).join(',')}]}`
    : '';
  
  const query = `
    query {
      boards(ids: [1402911042]) {
        id
        name
        items_page(limit: ${limit}${queryParams}) {
          items {
            id
            name
            created_at
            updated_at
            column_values(ids: ["name", "activity_owner", "activity_status", "activity_type"]) {
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
    lines.push(`# Sales Activities`);
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
    console.error('Error fetching SalesActivities items:', error);
    throw error;
  }
}
