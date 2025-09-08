import { mondayApi } from '../../monday/client.js';
import { getDynamicColumns } from '../dynamic-columns.js';

export async function getTasksAdTech(params: {
  limit?: number;
  search?: string;
  person?: string; // Owner
  status_mkkwpmh6?: number; // Status (numeric index)
  release_status__1?: number; // Release status (numeric index)
  priority__1?: number; // Priority (numeric index)
  date8__1?: string; // Follow up Date (YYYY-MM-DD)
} = {}) {
  const { limit = 10, search, person, status_mkkwpmh6, release_status__1, priority__1, date8__1 } = params;
  
  // Fetch dynamic columns from Columns board
  const BOARD_ID = '1635251745';
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
  if (person) filters.push({ column_id: 'person', compare_value: person, operator: 'contains_text' });
  if (status_mkkwpmh6 !== undefined) filters.push({ column_id: 'status_mkkwpmh6', compare_value: [status_mkkwpmh6], operator: 'any_of' });
  if (release_status__1 !== undefined) filters.push({ column_id: 'release_status__1', compare_value: [release_status__1], operator: 'any_of' });
  if (priority__1 !== undefined) filters.push({ column_id: 'priority__1', compare_value: [priority__1], operator: 'any_of' });
  if (date8__1) filters.push({ column_id: 'date8__1', compare_value: date8__1, operator: 'contains_text' });
  
  const queryParams = filters.length > 0 
    ? `, query_params: { rules: [${filters.map(f => `{
        column_id: "${f.column_id}",
        compare_value: ${Array.isArray(f.compare_value) ? `[${f.compare_value}]` : typeof f.compare_value === 'string' ? `"${f.compare_value}"` : f.compare_value},
        operator: ${f.operator}
      }`).join(',')}]}`
    : '';
  
  const query = `
    query {
      boards(ids: [1635251745]) {
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
    
    const items = board.items_page?.items || [];
    
    // Format response as markdown
    const lines: string[] = [];
    lines.push(`# Tasks - AdTech`);
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
    console.error('Error fetching TasksAdTech items:', error);
    throw error;
  }
}
