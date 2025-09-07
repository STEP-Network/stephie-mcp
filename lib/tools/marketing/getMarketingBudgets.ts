import { mondayApi } from '../../monday/client.js';

export async function getMarketingBudgets(params: {
  limit?: number;
  search?: string;
  date_mkn42vh4?: string; // Date (YYYY-MM-DD)
  type_mkn4rg75?: number; // Type (numeric index)
} = {}) {
  const { limit = 10, search, date_mkn42vh4, type_mkn4rg75 } = params;
  
  // Build filters
  const filters: any[] = [];
  if (search) {
    filters.push({
      column_id: 'name',
      compare_value: search,
      operator: 'contains_text'
    });
  }
  if (date_mkn42vh4) filters.push({ column_id: 'date_mkn42vh4', compare_value: date_mkn42vh4, operator: 'contains_text' });
  if (type_mkn4rg75 !== undefined) filters.push({ column_id: 'type_mkn4rg75', compare_value: [type_mkn4rg75], operator: 'any_of' });
  
  const queryParams = filters.length > 0 
    ? `, query_params: { rules: [${filters.map(f => `{
        column_id: "${f.column_id}",
        compare_value: ${Array.isArray(f.compare_value) ? `[${f.compare_value}]` : typeof f.compare_value === 'string' ? `"${f.compare_value}"` : f.compare_value},
        operator: ${f.operator}
      }`).join(',')}]}`
    : '';
  
  const query = `
    query {
      boards(ids: [1677240056]) {
        id
        name
        items_page(limit: ${limit}${queryParams}) {
          items {
            id
            name
            created_at
            updated_at
            column_values(ids: ["name", "date_mkn42vh4", "numbers_mkn4bxpz", "type_mkn4rg75"]) {
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
    lines.push(`# Budgets`);
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
    console.error('Error fetching MarketingBudgets items:', error);
    throw error;
  }
}
