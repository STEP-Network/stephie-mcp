import { mondayApi } from '../../monday/client.js';
import { TOOL_BOARD_IDS } from '../board-ids.js';

export async function updateBug(params: {
  itemId: string;
  name?: string;
  status?: number; // Status: 0=Open, 1=Fixed, 2=In Progress, 3=Pending Review, 4=Cancelled, 5=Investigating, 6=Won't Fix, 107=Retest
  priority?: number; // Priority: 0=Critical, 1=High, 2=Medium, 3=Low, 4=Best Effort
  dropdown?: number; // Type: 0=Bug, 1=Improvement, 2=Infrastructure, 3=Feature Request, 4=UI
  people?: string; // Developer (person ID)
  long_text?: string; // Bug Report
  text?: string; // Environment
}) {
  const { itemId, name, status, priority, dropdown, people, long_text, text } = params;

  // Build column values for update
  const columnValues: Record<string, any> = {};
  
  if (status !== undefined) columnValues.status = { index: status };
  if (priority !== undefined) columnValues.priority = { index: priority };
  if (dropdown !== undefined) columnValues.dropdown = { ids: [dropdown] };
  if (people) columnValues.people = { personsAndTeams: [{ id: parseInt(people), kind: 'person' }] };
  if (long_text) columnValues.long_text = { text: long_text };
  if (text) columnValues.text = text;

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
    mutation UpdateBug($columnValues: JSON!) {
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
      return `# Error Updating Bug\n\n${response.errors.map((e: any) => e.message).join('\n')}`;
    }

    // Get the result from whichever mutation returned data
    const item = response.data?.changeColumns || response.data?.changeName;
    if (!item) {
      return '# Error\n\nFailed to update bug - no item returned';
    }

    // Format response
    let result = `# Bug Updated Successfully\n\n`;
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
    console.error('Error updating bug:', error);
    return `# Error\n\nFailed to update bug: ${error}`;
  }
}