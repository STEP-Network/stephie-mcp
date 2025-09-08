import { mondayApi } from '../../monday/client.js';
import { getDynamicColumns } from '../dynamic-columns.js';

/**
 * Dynamic version of getTasksMarketing that fetches columns from Columns board
 * This eliminates hardcoded column arrays and automatically adapts to column changes
 */
export async function getTasksMarketingDynamic(params: {
  limit?: number;
  search?: string;
  person?: string; // Owner
  status_1__1?: number; // Type (numeric index)
  color_mkpwc7hm?: number; // Priority (numeric index)
  status_mkkw7ehb?: number; // Status (numeric index)
  publish_date_mkn21n6b?: string; // Publish Date (YYYY-MM-DD)
  keyResultId?: string; // Filter by linked key result
  budgetId?: string; // Filter by linked budget
} = {}) {
  const { limit = 10, search, person, status_1__1, color_mkpwc7hm, status_mkkw7ehb, publish_date_mkn21n6b, keyResultId, budgetId } = params;
  
  const BOARD_ID = '1693359113';
  const BOARD_NAME = 'Tasks - Marketing';
  
  // Fetch dynamic columns from Columns board
  const dynamicColumns = await getDynamicColumns(BOARD_ID);
  
  console.error(`Using ${dynamicColumns.length} dynamic columns for ${BOARD_NAME}`);
  
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
  
  // Build column IDs string for GraphQL query
  const columnIds = dynamicColumns.map(id => `"${id}"`).join(', ');
  
  const query = `
    query {
      boards(ids: [${BOARD_ID}]) {
        id
        name
        items_page(limit: ${limit}${queryParams}) {
          items {
            id
            name
            created_at
            updated_at
            column_values(ids: [${columnIds}]) {
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
    
    let items = board.items_page?.items || [];
    
    // Apply board relation filters (if these columns exist in dynamic columns)
    if (keyResultId && dynamicColumns.includes('board_relation_mkpjg0ky')) {
      items = items.filter((item: any) => {
        const relationCol = item.column_values.find((c: any) => c.id === 'board_relation_mkpjg0ky');
        if (relationCol?.value) {
          try {
            const linked = JSON.parse(relationCol.value);
            return linked?.linkedItemIds?.includes(keyResultId);
          } catch {
            return false;
          }
        }
        return false;
      });
    }
    
    if (budgetId && dynamicColumns.includes('budgets_mkn2xpkt')) {
      items = items.filter((item: any) => {
        const relationCol = item.column_values.find((c: any) => c.id === 'budgets_mkn2xpkt');
        if (relationCol?.value) {
          try {
            const linked = JSON.parse(relationCol.value);
            return linked?.linkedItemIds?.includes(budgetId);
          } catch {
            return false;
          }
        }
        return false;
      });
    }
    
    // Format response as markdown
    const lines: string[] = [];
    lines.push(`# ${board.name}`);
    lines.push(`**Total Items:** ${items.length}`);
    lines.push(`**Dynamic Columns:** ${dynamicColumns.length} columns loaded from Columns board`);
    
    // Show active filters
    if (keyResultId) lines.push(`**Filter:** Related to Key Result ID ${keyResultId}`);
    if (budgetId) lines.push(`**Filter:** Related to Budget ID ${budgetId}`);
    
    lines.push('');
    
    items.forEach((item: any) => {
      lines.push(`## ${item.name}`);
      lines.push(`- **ID:** ${item.id}`);
      
      // Group columns by type for better readability
      const textColumns: any[] = [];
      const statusColumns: any[] = [];
      const dateColumns: any[] = [];
      const relationColumns: any[] = [];
      const otherColumns: any[] = [];
      
      item.column_values.forEach((col: any) => {
        if (col.text) {
          switch (col.column.type) {
            case 'text':
            case 'name':
              textColumns.push(col);
              break;
            case 'status':
            case 'color':
              statusColumns.push(col);
              break;
            case 'date':
              dateColumns.push(col);
              break;
            case 'board_relation':
            case 'link_to_board':
              relationColumns.push(col);
              break;
            default:
              otherColumns.push(col);
          }
        }
      });
      
      // Display grouped columns
      [...textColumns, ...statusColumns, ...dateColumns, ...relationColumns, ...otherColumns].forEach(col => {
        lines.push(`- **${col.column.title}:** ${col.text}`);
      });
      
      lines.push('');
    });
    
    return lines.join('\n');
  } catch (error) {
    console.error('Error fetching TasksMarketing items:', error);
    throw error;
  }
}