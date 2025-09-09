import { mondayApi } from '../../monday/client.js';
import { TOOL_BOARD_IDS } from '../board-ids.js';

export async function createTaskMarketing(params: {
  name: string;
  status?: number; // Status: 0=In Review, 1=Done, 2=Rejected, 3=Planned, 4=In Progress, 5=Missing Status, 6=Waiting On Others, 7=New, 8=On Hold
  priority?: number; // Priority: 0=Critical, 1=High, 2=Medium, 3=Low
  people?: string; // Assignee (person ID)
  date?: string; // Due Date (YYYY-MM-DD format)
  long_text?: string; // Notes
  groupId?: string; // Group to add the item to
}) {
  const { name, status, priority, people, date, long_text, groupId } = params;

  // Build column values
  const columnValues: Record<string, any> = {};
  
  if (status !== undefined) columnValues.status = { index: status };
  if (priority !== undefined) columnValues.priority = { index: priority };
  if (people) columnValues.people = { personsAndTeams: [{ id: parseInt(people), kind: 'person' }] };
  if (date) columnValues.date = { date };
  if (long_text) columnValues.long_text = { text: long_text };

  const mutation = `
    mutation CreateTaskMarketing($boardId: ID!, $name: String!, $columnValues: JSON!, $groupId: String) {
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
    boardId: TOOL_BOARD_IDS.TASKS_MARKETING,
    name,
    columnValues: JSON.stringify(columnValues),
    groupId
  };

  try {
    const response = await mondayApi(mutation, variables);
    
    if (response.errors) {
      console.error('GraphQL errors:', response.errors);
      return `# Error Creating Marketing Task\n\n${response.errors.map((e: any) => e.message).join('\n')}`;
    }

    const item = response.data?.create_item;
    if (!item) {
      return '# Error\n\nFailed to create Marketing task - no item returned';
    }

    // Format response
    let result = `# Marketing Task Created Successfully\n\n`;
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
    console.error('Error creating Marketing task:', error);
    return `# Error\n\nFailed to create Marketing task: ${error}`;
  }
}