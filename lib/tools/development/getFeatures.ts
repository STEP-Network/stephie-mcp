import { mondayApi } from '../../monday/client.js';

export async function getFeatures(params: {
  limit?: number;
  search?: string;
  color_mkqn9n66?: number; // Priority (numeric index)
  color_mkqhya7m?: number; // Status (numeric index)
  multiple_person_mkqhq07m?: string; // Owner
  date_mkqhdjw7?: string; // Date Released (YYYY-MM-DD)
  date4?: string; // Date Added (YYYY-MM-DD)
} = {}) {
  const { limit = 10, search, color_mkqn9n66, color_mkqhya7m, multiple_person_mkqhq07m, date_mkqhdjw7, date4 } = params;
  
  // Build filters
  const filters: any[] = [];
  if (search) {
    filters.push({
      column_id: 'name',
      compare_value: search,
      operator: 'contains_text'
    });
  }
  if (color_mkqn9n66 !== undefined) filters.push({ column_id: 'color_mkqn9n66', compare_value: [color_mkqn9n66], operator: 'any_of' });
  if (color_mkqhya7m !== undefined) filters.push({ column_id: 'color_mkqhya7m', compare_value: [color_mkqhya7m], operator: 'any_of' });
  if (multiple_person_mkqhq07m) filters.push({ column_id: 'multiple_person_mkqhq07m', compare_value: multiple_person_mkqhq07m, operator: 'contains_text' });
  if (date_mkqhdjw7) filters.push({ column_id: 'date_mkqhdjw7', compare_value: date_mkqhdjw7, operator: 'contains_text' });
  if (date4) filters.push({ column_id: 'date4', compare_value: date4, operator: 'contains_text' });
  
  const queryParams = filters.length > 0 
    ? `, query_params: { rules: [${filters.map(f => `{
        column_id: "${f.column_id}",
        compare_value: ${Array.isArray(f.compare_value) ? `[${f.compare_value}]` : typeof f.compare_value === 'string' ? `"${f.compare_value}"` : f.compare_value},
        operator: ${f.operator}
      }`).join(',')}]}`
    : '';
  
  const query = `
    query {
      boards(ids: [1938986335]) {
        id
        name
        items_page(limit: ${limit}${queryParams}) {
          items {
            id
            name
            created_at
            updated_at
            column_values(ids: ["name", "color_mkqn9n66", "color_mkqhya7m", "multiple_person_mkqhq07m", "date_mkqhdjw7", "date4"]) {
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
    lines.push(`# Features`);
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
    console.error('Error fetching Features items:', error);
    throw error;
  }
}
