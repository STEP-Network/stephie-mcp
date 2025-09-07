import { mondayApi } from '../../monday/client.js';

export async function getKeyResultsItems(params: {
  limit?: number;
  search?: string;
  person?: string; // Owner
  type_Mjj4v4b6?: number; // Type (numeric index)
  status_1__1?: number; // Status (numeric index)
} = {}) {
  const { limit = 10, search, person, type_Mjj4v4b6, status_1__1 } = params;
  
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
  if (type_Mjj4v4b6 !== undefined) filters.push({ column_id: 'type_Mjj4v4b6', compare_value: [type_Mjj4v4b6], operator: 'any_of' });
  if (status_1__1 !== undefined) filters.push({ column_id: 'status_1__1', compare_value: [status_1__1], operator: 'any_of' });
  
  const queryParams = filters.length > 0 
    ? `, query_params: { rules: [${filters.map(f => `{
        column_id: "${f.column_id}",
        compare_value: ${Array.isArray(f.compare_value) ? `[${f.compare_value}]` : typeof f.compare_value === 'string' ? `"${f.compare_value}"` : f.compare_value},
        operator: ${f.operator}
      }`).join(',')}]}`
    : '';
  
  const query = `
    query {
      boards(ids: [1631918525]) {
        id
        name
        items_page(limit: ${limit}${queryParams}) {
          items {
            id
            name
            created_at
            updated_at
            column_values(ids: ["name", "person", "type_Mjj4v4b6", "status_1__1", "connect_boards__1", "connect_boards3__1", "link_to_budgets_mkn4jy9e"]) {
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
    lines.push(`# Key Results`);
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
    console.error('Error fetching KeyResults items:', error);
    throw error;
  }
}
