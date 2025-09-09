import { mondayApi } from '../../monday/client.js';
import { TOOL_BOARD_IDS } from '../board-ids.js';

export async function createOKR(params: {
  name: string;
  status?: number; // Status: 0=On Track, 1=At Risk, 2=Off Track, 3=Completed, 5=Not Started
  people?: string; // Owner (person ID)
  numbers?: number; // Progress (0-100)
  date?: string; // Target Date (YYYY-MM-DD format)
  long_text?: string; // Key Results
  teamId?: string; // Link to team
  groupId?: string; // Group to add the item to
}) {
  const { name, status, people, numbers, date, long_text, teamId, groupId } = params;

  // Build column values
  const columnValues: Record<string, any> = {};
  
  if (status !== undefined) columnValues.status = { index: status };
  if (people) columnValues.people = { personsAndTeams: [{ id: parseInt(people), kind: 'person' }] };
  if (numbers !== undefined) columnValues.numbers = numbers;
  if (date) columnValues.date = { date };
  if (long_text) columnValues.long_text = { text: long_text };
  
  // Handle board relations
  if (teamId) columnValues.connect_boards__1 = { item_ids: [parseInt(teamId)] };

  const mutation = `
    mutation CreateOKR($boardId: ID!, $name: String!, $columnValues: JSON!, $groupId: String) {
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
    boardId: TOOL_BOARD_IDS.OKR,
    name,
    columnValues: JSON.stringify(columnValues),
    groupId
  };

  try {
    const response = await mondayApi(mutation, variables);
    
    if (response.errors) {
      console.error('GraphQL errors:', response.errors);
      return `# Error Creating OKR\n\n${response.errors.map((e: any) => e.message).join('\n')}`;
    }

    const item = response.data?.create_item;
    if (!item) {
      return '# Error\n\nFailed to create OKR - no item returned';
    }

    // Format response
    let result = `# OKR Created Successfully\n\n`;
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
    console.error('Error creating OKR:', error);
    return `# Error\n\nFailed to create OKR: ${error}`;
  }
}