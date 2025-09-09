import { mondayApi } from '../../monday/client.js';
import { TOOL_BOARD_IDS } from '../board-ids.js';

export async function createContact(params: {
  name: string;
  status?: number; // Department: 0=CEO/C-Suite, 1=Sales Director, 2=Sales Manager, 3=Head of Programmatic/Media, 10=AdOps, 102=Marketing, 103=Finance, 104=Data/Engineering/Tech, 108=Head of Creative
  people?: string; // Owner (person ID)
  email?: string;
  phone?: string;
  text?: string; // Position
  accountId?: string; // Link to account
  opportunitiesId?: string; // Link to opportunities
  leadsId?: string; // Link to leads
  groupId?: string; // Group to add the item to
}) {
  const { name, status, people, email, phone, text, accountId, opportunitiesId, leadsId, groupId } = params;

  // Build column values
  const columnValues: Record<string, any> = {};
  
  if (status !== undefined) columnValues.status = { index: status };
  if (people) columnValues.people = { personsAndTeams: [{ id: parseInt(people), kind: 'person' }] };
  if (email) columnValues.email = { email, text: email };
  if (phone) columnValues.phone = phone;
  if (text) columnValues.text = text;
  
  // Handle board relations
  if (accountId) columnValues.connect_boards = { item_ids: [parseInt(accountId)] };
  if (opportunitiesId) columnValues.connect_boards1 = { item_ids: [parseInt(opportunitiesId)] };
  if (leadsId) columnValues.connect_boards8 = { item_ids: [parseInt(leadsId)] };

  const mutation = `
    mutation CreateContact($boardId: ID!, $name: String!, $columnValues: JSON!, $groupId: String) {
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
    boardId: TOOL_BOARD_IDS.CONTACTS,
    name,
    columnValues: JSON.stringify(columnValues),
    groupId
  };

  try {
    const response = await mondayApi(mutation, variables);
    
    if (response.errors) {
      console.error('GraphQL errors:', response.errors);
      return `# Error Creating Contact\n\n${response.errors.map((e: any) => e.message).join('\n')}`;
    }

    const item = response.data?.create_item;
    if (!item) {
      return '# Error\n\nFailed to create contact - no item returned';
    }

    // Format response
    let result = `# Contact Created Successfully\n\n`;
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
    console.error('Error creating contact:', error);
    return `# Error\n\nFailed to create contact: ${error}`;
  }
}