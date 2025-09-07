import { mondayApi } from '../../monday/client.js';

export async function getAccounts(params: {
  limit?: number;
  search?: string;
  people?: string; // Owner
  status?: number; // Account Status (numeric index)
  status5?: number; // Type (numeric index)
  contactsId?: string; // Filter by linked contacts (use getContacts to find IDs)
  opportunitiesId?: string; // Filter by linked opportunities (use getOpportunities to find IDs)
  leadsId?: string; // Filter by linked leads (use getLeads to find IDs)
} = {}) {
  const { limit = 10, search, people, status, status5, contactsId, opportunitiesId, leadsId } = params;
  
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
  if (status !== undefined) filters.push({ column_id: 'status', compare_value: [status], operator: 'any_of' });
  if (status5 !== undefined) filters.push({ column_id: 'status5', compare_value: [status5], operator: 'any_of' });
  
  const queryParams = filters.length > 0 
    ? `, query_params: { rules: [${filters.map(f => `{
        column_id: "${f.column_id}",
        compare_value: ${Array.isArray(f.compare_value) ? `[${f.compare_value}]` : typeof f.compare_value === 'string' ? `"${f.compare_value}"` : f.compare_value},
        operator: ${f.operator}
      }`).join(',')}]}`
    : '';
  
  const query = `
    query {
      boards(ids: [1402911027]) {
        id
        name
        items_page(limit: ${limit}${queryParams}) {
          items {
            id
            name
            created_at
            updated_at
            column_values(ids: ["name", "people", "status", "status5", "text5", "account_contact", "account_deal", "connect_boards9"]) {
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
    if (contactsId) {
      items = items.filter((item: any) => {
        const relationCol = item.column_values.find((c: any) => c.id === 'account_contact');
        if (relationCol?.value) {
          try {
            const linked = JSON.parse(relationCol.value);
            return linked?.linkedItemIds?.includes(contactsId);
          } catch {
            return false;
          }
        }
        return false;
      });
    }
    
    if (opportunitiesId) {
      items = items.filter((item: any) => {
        const relationCol = item.column_values.find((c: any) => c.id === 'account_deal');
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
    
    if (leadsId) {
      items = items.filter((item: any) => {
        const relationCol = item.column_values.find((c: any) => c.id === 'connect_boards9');
        if (relationCol?.value) {
          try {
            const linked = JSON.parse(relationCol.value);
            return linked?.linkedItemIds?.includes(leadsId);
          } catch {
            return false;
          }
        }
        return false;
      });
    }
    
    // Format response as markdown
    const lines: string[] = [];
    lines.push(`# Accounts`);
    lines.push(`**Total Items:** ${items.length}`);
    
    // Show active filters
    if (contactsId) lines.push(`**Filter:** Related to Contact ID ${contactsId}`);
    if (opportunitiesId) lines.push(`**Filter:** Related to Opportunity ID ${opportunitiesId}`);
    if (leadsId) lines.push(`**Filter:** Related to Lead ID ${leadsId}`);
    
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
    console.error('Error fetching Accounts items:', error);
    throw error;
  }
}
