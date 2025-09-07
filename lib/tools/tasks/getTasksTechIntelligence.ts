import { mondayApi } from '../../monday/client.js';

export async function getTasksTechIntelligence(params: {
  limit?: number;
  search?: string;
  person?: string; // Owner
  status_19__1?: number; // Status (numeric index)
  type_1__1?: number; // Type (numeric index)
  priority_1__1?: number; // Priority (numeric index)
  date__1?: string; // Due Date (YYYY-MM-DD)
} = {}) {
  const { limit = 10, search, person, status_19__1, type_1__1, priority_1__1, date__1 } = params;
  
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
  if (status_19__1 !== undefined) filters.push({ column_id: 'status_19__1', compare_value: [status_19__1], operator: 'any_of' });
  if (type_1__1 !== undefined) filters.push({ column_id: 'type_1__1', compare_value: [type_1__1], operator: 'any_of' });
  if (priority_1__1 !== undefined) filters.push({ column_id: 'priority_1__1', compare_value: [priority_1__1], operator: 'any_of' });
  if (date__1) filters.push({ column_id: 'date__1', compare_value: date__1, operator: 'contains_text' });
  
  const queryParams = filters.length > 0 
    ? `, query_params: { rules: [${filters.map(f => `{
        column_id: "${f.column_id}",
        compare_value: ${Array.isArray(f.compare_value) ? `[${f.compare_value}]` : typeof f.compare_value === 'string' ? `"${f.compare_value}"` : f.compare_value},
        operator: ${f.operator}
      }`).join(',')}]}`
    : '';
  
  const query = `
    query {
      boards(ids: [1631907569]) {
        id
        name
        items_page(limit: ${limit}${queryParams}) {
          items {
            id
            name
            created_at
            updated_at
            column_values(ids: ["name", "person", "status_19__1", "type_1__1", "priority_1__1", "date__1", "date4", "date3__1", "date7__1", "date4__1"]) {
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
    lines.push(`# Tasks - Tech & Intelligence`);
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
    console.error('Error fetching TasksTechIntelligence items:', error);
    throw error;
  }
}
