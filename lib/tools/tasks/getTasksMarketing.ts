import { mondayApi } from '../../monday/client.js';

export async function getTasksMarketing(params: {
  limit?: number;
  search?: string;
  person?: string; // Owner
  status_1__1?: number; // Type (numeric index)
  color_mkpwc7hm?: number; // Priority (numeric index)
  status_mkkw7ehb?: number; // Status (numeric index)
  publish_date_mkn21n6b?: string; // Publish Date (YYYY-MM-DD)
} = {}) {
  const { limit = 10, search, person, status_1__1, color_mkpwc7hm, status_mkkw7ehb, publish_date_mkn21n6b } = params;
  
  // Build filters
  const filters: any[] = [];
  if (search) {
    filters.push({
      column_id: 'name',
      compare_value: search,
      operator: 'contains_text'
    });
  }
  if (person) filters.push({ column_id: 'person', compare_value: person, operator: 'contains_text' });
  if (status_1__1 !== undefined) filters.push({ column_id: 'status_1__1', compare_value: [status_1__1], operator: 'any_of' });
  if (color_mkpwc7hm !== undefined) filters.push({ column_id: 'color_mkpwc7hm', compare_value: [color_mkpwc7hm], operator: 'any_of' });
  if (status_mkkw7ehb !== undefined) filters.push({ column_id: 'status_mkkw7ehb', compare_value: [status_mkkw7ehb], operator: 'any_of' });
  if (publish_date_mkn21n6b) filters.push({ column_id: 'publish_date_mkn21n6b', compare_value: publish_date_mkn21n6b, operator: 'contains_text' });
  
  const queryParams = filters.length > 0 
    ? `, query_params: { rules: [${filters.map(f => `{
        column_id: "${f.column_id}",
        compare_value: ${Array.isArray(f.compare_value) ? `[${f.compare_value}]` : typeof f.compare_value === 'string' ? `"${f.compare_value}"` : f.compare_value},
        operator: ${f.operator}
      }`).join(',')}]}`
    : '';
  
  const query = `
    query {
      boards(ids: [1693359113]) {
        id
        name
        items_page(limit: ${limit}${queryParams}) {
          items {
            id
            name
            created_at
            updated_at
            column_values(ids: ["name", "person", "status_1__1", "color_mkpwc7hm", "status_mkkw7ehb", "publish_date_mkn21n6b", "budget_mkn22001", "title_mkn256dt", "link_to_teams_Mjj8UZOX", "link_to_teams_Mjj8FZuw"]) {
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
    lines.push(`# Tasks - Marketing`);
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
    console.error('Error fetching TasksMarketing items:', error);
    throw error;
  }
}
