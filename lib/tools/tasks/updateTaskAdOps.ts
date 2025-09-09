import { mondayApi } from '../../monday/client.js';
import { TOOL_BOARD_IDS } from '../board-ids.js';

export async function updateTaskAdOps(params: {
  itemId: string;
  name?: string;
  status?: number; // Status: 0=Done, 3=Working on it, 4=New, 5=Waiting/On hold, 6=Ready to work, 8=Test pending, 9=Not doing, 10=In review, 11=Stuck
  priority?: number; // Priority: 0=Critical, 1=High, 2=Medium, 3=Low
  people?: string; // Person (person ID)
  date4?: string; // Due Date (YYYY-MM-DD format)
  text?: string; // Description
}) {
  const { itemId, name, status, priority, people, date4, text } = params;

  // Build column values for update
  const columnValues: Record<string, any> = {};
  
  if (status !== undefined) columnValues.status = { index: status };
  if (priority !== undefined) columnValues.priority = { index: priority };
  if (people) columnValues.people = { personsAndTeams: [{ id: parseInt(people), kind: 'person' }] };
  if (date4) columnValues.date4 = { date: date4 };
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
    mutation UpdateTaskAdOps($columnValues: JSON!) {
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
      return `# Error Updating AdOps Task\n\n${response.errors.map((e: any) => e.message).join('\n')}`;
    }

    // Get the result from whichever mutation returned data
    const item = response.data?.changeColumns || response.data?.changeName;
    if (!item) {
      return '# Error\n\nFailed to update AdOps task - no item returned';
    }

    // Format response
    let result = `# AdOps Task Updated Successfully\n\n`;
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
    console.error('Error updating AdOps task:', error);
    return `# Error\n\nFailed to update AdOps task: ${error}`;
  }
}