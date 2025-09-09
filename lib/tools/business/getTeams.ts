import { mondayApi } from '../../monday/client.js';
import { getDynamicColumns } from '../dynamic-columns.js';

export async function getTeams(params: {
  limit?: number;
  search?: string;
  status?: number; // Status (numeric index)
  peopleId?: string; // Filter by person (use getPeople to find IDs)
  objectiveId?: string; // Filter by objective (use getOKR to find IDs)
} = {}) {
  const { limit = 10, search, status, peopleId, objectiveId } = params;
  
  // Fetch dynamic columns from Columns board
  const BOARD_ID = '1631927696';
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
  if (status !== undefined) filters.push({ column_id: 'status', compare_value: [status], operator: 'any_of' });
  
  const queryParams = filters.length > 0 
    ? `, query_params: { rules: [${filters.map(f => `{
        column_id: "${f.column_id}",
        compare_value: ${Array.isArray(f.compare_value) ? `[${f.compare_value}]` : typeof f.compare_value === 'string' ? `"${f.compare_value}"` : f.compare_value},
        operator: ${f.operator}
      }`).join(',')}]}`
    : '';
  
  const query = `
    query {
      boards(ids: [1631927696]) {
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
    
    let items = board.items_page?.items || [];
    
    // Apply board relation filters
    if (peopleId) {
      items = items.filter((item: any) => {
        const relationCol = item.column_values.find((c: any) => c.id === 'connect_boards__1');
        if (relationCol?.value) {
          try {
            const linked = JSON.parse(relationCol.value);
            return linked?.linkedItemIds?.includes(peopleId);
          } catch {
            return false;
          }
        }
        return false;
      });
    }
    
    if (objectiveId) {
      items = items.filter((item: any) => {
        const relationCol = item.column_values.find((c: any) => c.id === 'link_to_okrs__1');
        if (relationCol?.value) {
          try {
            const linked = JSON.parse(relationCol.value);
            return linked?.linkedItemIds?.includes(objectiveId);
          } catch {
            return false;
          }
        }
        return false;
      });
    }
    
    // Format response as markdown
    const lines: string[] = [];
    lines.push(`# Teams`);
    lines.push(`**Total Items:** ${items.length}`);
    
    // Show active filters
    if (peopleId) lines.push(`**Filter:** Has Person ID ${peopleId}`);
    if (objectiveId) lines.push(`**Filter:** Has Objective ID ${objectiveId}`);
    
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
    console.error('Error fetching Teams items:', error);
    throw error;
  }
}
