import { mondayApi } from '../../monday/client.js';
import { TOOL_BOARD_IDS } from '../board-ids.js';

export async function updateOKR(params: {
  itemId: string;
  name?: string;
  status?: number; // Status: 0=On Track, 1=At Risk, 2=Off Track, 3=Completed, 5=Not Started
  people?: string; // Owner (person ID)
  numbers?: number; // Progress (0-100)
  date?: string; // Target Date (YYYY-MM-DD format)
  long_text?: string; // Key Results
  teamId?: string; // Link to team
}) {
  const { itemId, name, status, people, numbers, date, long_text, teamId } = params;

  // Build column values for update
  const columnValues: Record<string, any> = {};
  
  if (status !== undefined) columnValues.status = { index: status };
  if (people) columnValues.people = { personsAndTeams: [{ id: parseInt(people), kind: 'person' }] };
  if (numbers !== undefined) columnValues.numbers = numbers;
  if (date) columnValues.date = { date };
  if (long_text) columnValues.long_text = { text: long_text };
  
  // Handle board relations
  if (teamId) columnValues.connect_boards__1 = { item_ids: [parseInt(teamId)] };

  // Build mutation based on what needs updating
  const mutations: string[] = [];
  
  if (name) {
    mutations.push(`
      changeName: change_simple_column_value(
        item_id: ${itemId},
        column_id: "name",
        value: "${name.replace(/"/g, '\\"')}"
      ) {
        id
      }
    `);
  }

  if (Object.keys(columnValues).length > 0) {
    mutations.push(`
      changeColumns: change_multiple_column_values(
        item_id: ${itemId},
        column_values: $columnValues
      ) {
        id
        name
        column_values {
          id
          text
          value
        }
      }
    `);
  }

  if (mutations.length === 0) {
    return '# No Updates\n\nNo fields provided to update.';
  }

  const mutation = `
    mutation UpdateOKR($columnValues: JSON!) {
      ${mutations.join('\n')}
    }
  `;

  const variables = {
    columnValues: JSON.stringify(columnValues)
  };

  try {
    const response = await mondayApi(mutation, variables);
    
    if (response.errors) {
      console.error('GraphQL errors:', response.errors);
      return `# Error Updating OKR\n\n${response.errors.map((e: any) => e.message).join('\n')}`;
    }

    // Get the result from whichever mutation returned data
    const item = response.data?.changeColumns || response.data?.changeName;
    if (!item) {
      return '# Error\n\nFailed to update OKR - no item returned';
    }

    // Format response
    let result = `# OKR Updated Successfully\n\n`;
    result += `**ID:** ${item.id}\n`;
    if (item.name) result += `**Name:** ${item.name}\n\n`;
    
    // Parse column values for display if available
    const columnData = item.column_values || [];
    if (columnData.length > 0) {
      result += `## Updated Values\n\n`;
      for (const col of columnData) {
        if (col.text) {
          result += `- **${col.id}:** ${col.text}\n`;
        }
      }
    }

    return result;
  } catch (error) {
    console.error('Error updating OKR:', error);
    return `# Error\n\nFailed to update OKR: ${error}`;
  }
}