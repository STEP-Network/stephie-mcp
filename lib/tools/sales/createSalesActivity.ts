import { mondayApi } from '../../monday/client.js';
import { TOOL_BOARD_IDS } from '../board-ids.js';

export async function createSalesActivity(params: {
  name: string;
  status?: number; // Status: 0=To do, 1=Done, 2=Meeting canceled, 6=No meeting yet
  dropdown?: number; // Activity Type: 0=Email, 1=Phone, 2=Call, 3=Meeting, 7=Note
  people?: string; // Lead Owner (person ID)
  date?: string; // Activity Date (YYYY-MM-DD format)
  text?: string; // Notes
  accountId?: string; // Link to account
  opportunityId?: string; // Link to opportunity
  leadId?: string; // Link to lead
  contactId?: string; // Link to contact
  groupId?: string; // Group to add the item to
}) {
  const { name, status, dropdown, people, date, text, accountId, opportunityId, leadId, contactId, groupId } = params;

  // Build column values
  const columnValues: Record<string, any> = {};
  
  if (status !== undefined) columnValues.status = { index: status };
  if (dropdown !== undefined) columnValues.dropdown = { ids: [dropdown] };
  if (people) columnValues.people = { personsAndTeams: [{ id: parseInt(people), kind: 'person' }] };
  if (date) columnValues.date = { date };
  if (text) columnValues.text = text;
  
  // Handle board relations
  if (accountId) columnValues.connect_boards__1 = { item_ids: [parseInt(accountId)] };
  if (opportunityId) columnValues.connect_boards4__1 = { item_ids: [parseInt(opportunityId)] };
  if (leadId) columnValues.connect_boards2__1 = { item_ids: [parseInt(leadId)] };
  if (contactId) columnValues.connect_boards7__1 = { item_ids: [parseInt(contactId)] };

  const mutation = `
    mutation CreateSalesActivity($boardId: ID!, $name: String!, $columnValues: JSON!, $groupId: String) {
      create_item(
        board_id: $boardId,
        item_name: $name,
        column_values: $columnValues,
        group_id: $groupId
      ) {
        id
        name
        column_values {
          id
          text
          value
        }
      }
    }
  `;

  const variables = {
    boardId: TOOL_BOARD_IDS.SALES_ACTIVITIES,
    name,
    columnValues: JSON.stringify(columnValues),
    groupId
  };

  try {
    const response = await mondayApi(mutation, variables);
    
    if (response.errors) {
      console.error('GraphQL errors:', response.errors);
      return `# Error Creating Sales Activity\n\n${response.errors.map((e: any) => e.message).join('\n')}`;
    }

    const item = response.data?.create_item;
    if (!item) {
      return '# Error\n\nFailed to create sales activity - no item returned';
    }

    // Format response
    let result = `# Sales Activity Created Successfully\n\n`;
    result += `**Name:** ${item.name}\n`;
    result += `**ID:** ${item.id}\n\n`;
    
    // Parse column values for display
    const columnData = item.column_values || [];
    if (columnData.length > 0) {
      result += `## Details\n\n`;
      for (const col of columnData) {
        if (col.text) {
          result += `- **${col.id}:** ${col.text}\n`;
        }
      }
    }

    return result;
  } catch (error) {
    console.error('Error creating sales activity:', error);
    return `# Error\n\nFailed to create sales activity: ${error}`;
  }
}