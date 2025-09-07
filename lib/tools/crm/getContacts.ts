import { mondayApi } from '../../monday/client.js';

export async function getContacts(params: {
  limit?: number;
  search?: string;
  people?: string; // Owner
  status__1?: number; // Status (numeric index)
  accountId?: string; // Filter by linked account (use getAccounts to find IDs)
  opportunitiesId?: string; // Filter by linked opportunities (use getOpportunities to find IDs)
} = {}) {
  const { limit = 10, search, people, status__1, accountId, opportunitiesId } = params;
  
  // Build filters
  const filters: any[] = [];
  if (search) {
    filters.push({
      column_id: 'name',
      compare_value: search,
      operator: 'contains_text'
    });
  }
  if (people) filters.push({ column_id: 'people', compare_value: people, operator: 'contains_text' });
  if (status__1 !== undefined) filters.push({ column_id: 'status__1', compare_value: [status__1], operator: 'any_of' });
  
  const queryParams = filters.length > 0 
    ? `, query_params: { rules: [${filters.map(f => `{
        column_id: "${f.column_id}",
        compare_value: ${Array.isArray(f.compare_value) ? `[${f.compare_value}]` : typeof f.compare_value === 'string' ? `"${f.compare_value}"` : f.compare_value},
        operator: ${f.operator}
      }`).join(',')}]}`
    : '';
  
  const query = `
    query {
      boards(ids: [1402911034]) {
        id
        name
        items_page(limit: ${limit}${queryParams}) {
          items {
            id
            name
            created_at
            updated_at
            column_values(ids: ["name", "text6", "people", "status__1", "contact_account", "contact_deal"]) {
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
    if (accountId) {
      items = items.filter((item: any) => {
        const relationCol = item.column_values.find((c: any) => c.id === 'contact_account');
        if (relationCol?.value) {
          try {
            const linked = JSON.parse(relationCol.value);
            return linked?.linkedItemIds?.includes(accountId);
          } catch {
            return false;
          }
        }
        return false;
      });
    }
    
    if (opportunitiesId) {
      items = items.filter((item: any) => {
        const relationCol = item.column_values.find((c: any) => c.id === 'contact_deal');
        if (relationCol?.value) {
          try {
            const linked = JSON.parse(relationCol.value);
            return linked?.linkedItemIds?.includes(opportunitiesId);
          } catch {
            return false;
          }
        }
        return false;
      });
    }
    
    // Format response as markdown
    const lines: string[] = [];
    lines.push(`# Contacts`);
    lines.push(`**Total Items:** ${items.length}`);
    
    // Show active filters
    if (accountId) lines.push(`**Filter:** Related to Account ID ${accountId}`);
    if (opportunitiesId) lines.push(`**Filter:** Related to Opportunity ID ${opportunitiesId}`);
    
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
    console.error('Error fetching Contacts items:', error);
    throw error;
  }
}
