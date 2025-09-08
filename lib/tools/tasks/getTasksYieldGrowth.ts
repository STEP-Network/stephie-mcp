import { mondayApi } from '../../monday/client.js';
import { getDynamicColumns } from '../dynamic-columns.js';

export async function getTasksYieldGrowth(params: {
  limit?: number;
  search?: string;
  person?: string; // Owner
  status_mkkwc3ez?: number; // Status (numeric index)
  date__1?: string; // Due Date (YYYY-MM-DD)
  date4?: string; // Follow up Date (YYYY-MM-DD)
  date3__1?: string; // Started Date (YYYY-MM-DD)
} = {}) {
  const { limit = 10, search, person, status_mkkwc3ez, date__1, date4, date3__1 } = params;
  
  // Fetch dynamic columns from Columns board
  const BOARD_ID = '1762038452';
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
  if (status_mkkwc3ez !== undefined) filters.push({ column_id: 'status_mkkwc3ez', compare_value: [status_mkkwc3ez], operator: 'any_of' });
  if (date__1) filters.push({ column_id: 'date__1', compare_value: date__1, operator: 'contains_text' });
  if (date4) filters.push({ column_id: 'date4', compare_value: date4, operator: 'contains_text' });
  if (date3__1) filters.push({ column_id: 'date3__1', compare_value: date3__1, operator: 'contains_text' });
  
  const queryParams = filters.length > 0 
    ? `, query_params: { rules: [${filters.map(f => `{
        column_id: "${f.column_id}",
        compare_value: ${Array.isArray(f.compare_value) ? `[${f.compare_value}]` : typeof f.compare_value === 'string' ? `"${f.compare_value}"` : f.compare_value},
        operator: ${f.operator}
      }`).join(',')}]}`
    : '';
  
  const query = `
    query {
      boards(ids: [1762038452]) {
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
    lines.push(`# Tasks - Yield & Growth`);
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
    console.error('Error fetching TasksYieldGrowth items:', error);
    throw error;
  }
}
