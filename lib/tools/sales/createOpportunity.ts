import { mondayApi } from '../../monday/client.js';
import { TOOL_BOARD_IDS } from '../board-ids.js';

export async function createOpportunity(params: {
  name: string;
  status?: number; // Opportunity Stage: 0=Lead, 1=Lead Nurturing, 2=Meeting, 3=Negotiation, 4=Legal, 5=Sent Commercial, 7=Closed Lost, 9=Closed Won, 101=Pilot
  people?: string; // Owner (person ID)
  status_14?: number; // Product Type: 0=Display, 2=Video, 3=Display + Video, 5=OOH/DOOH, 8=Display + Video + OOH/DOOH, 10=Display + OOH/DOOH, 11=Video + OOH/DOOH
  numbers?: number; // Deal Size (numeric value)
  leadId?: string; // Link to lead
  accountId?: string; // Link to account
  contactId?: string; // Link to contact
  groupId?: string; // Group to add the item to
}) {
  const { name, status, people, status_14, numbers, leadId, accountId, contactId, groupId } = params;

  // Build column values
  const columnValues: Record<string, any> = {};
  
  if (status !== undefined) columnValues.status = { index: status };
  if (status_14 !== undefined) columnValues.status_14 = { index: status_14 };
  if (people) columnValues.people = { personsAndTeams: [{ id: parseInt(people), kind: 'person' }] };
  if (numbers !== undefined) columnValues.numbers = numbers;
  
  // Handle board relations
  if (leadId) columnValues.connect_boards3 = { item_ids: [parseInt(leadId)] };
  if (accountId) columnValues.connect_boards = { item_ids: [parseInt(accountId)] };
  if (contactId) columnValues.connect_boards9 = { item_ids: [parseInt(contactId)] };

  const mutation = `
    mutation CreateOpportunity($boardId: ID!, $name: String!, $columnValues: JSON!, $groupId: String) {
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
    boardId: TOOL_BOARD_IDS.OPPORTUNITIES,
    name,
    columnValues: JSON.stringify(columnValues),
    groupId
  };

  try {
    const response = await mondayApi(mutation, variables);
    
    if (response.errors) {
      console.error('GraphQL errors:', response.errors);
      return `# Error Creating Opportunity\n\n${response.errors.map((e: any) => e.message).join('\n')}`;
    }

    const item = response.data?.create_item;
    if (!item) {
      return '# Error\n\nFailed to create opportunity - no item returned';
    }

    // Format response
    let result = `# Opportunity Created Successfully\n\n`;
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
    console.error('Error creating opportunity:', error);
    return `# Error\n\nFailed to create opportunity: ${error}`;
  }
}