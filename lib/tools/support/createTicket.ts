import { mondayApi } from '../../monday/client.js';
import { TOOL_BOARD_IDS } from '../board-ids.js';

export async function createTicket(params: {
  name: string;
  status?: number; // Status: 0=New, 1=In Progress, 2=Waiting for Customer, 3=Resolved, 4=Closed
  priority?: number; // Priority: 0=Urgent, 1=High, 2=Medium, 3=Low
  people?: string; // Assignee (person ID)
  email?: string; // Customer Email
  text?: string; // Subject
  long_text?: string; // Description
  date?: string; // Due Date (YYYY-MM-DD format)
  groupId?: string; // Group to add the item to
}) {
  const { name, status, priority, people, email, text, long_text, date, groupId } = params;

  // Build column values
  const columnValues: Record<string, any> = {};
  
  if (status !== undefined) columnValues.status = { index: status };
  if (priority !== undefined) columnValues.priority = { index: priority };
  if (people) columnValues.people = { personsAndTeams: [{ id: parseInt(people), kind: 'person' }] };
  if (email) columnValues.email = { email, text: email };
  if (text) columnValues.text = text;
  if (long_text) columnValues.long_text = { text: long_text };
  if (date) columnValues.date = { date };

  const mutation = `
    mutation CreateTicket($boardId: ID!, $name: String!, $columnValues: JSON!, $groupId: String) {
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
    boardId: TOOL_BOARD_IDS.TICKETS,
    name,
    columnValues: JSON.stringify(columnValues),
    groupId
  };

  try {
    const response = await mondayApi(mutation, variables);
    
    if (response.errors) {
      console.error('GraphQL errors:', response.errors);
      return `# Error Creating Ticket\n\n${response.errors.map((e: any) => e.message).join('\n')}`;
    }

    const item = response.data?.create_item;
    if (!item) {
      return '# Error\n\nFailed to create ticket - no item returned';
    }

    // Format response
    let result = `# Ticket Created Successfully\n\n`;
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
    console.error('Error creating ticket:', error);
    return `# Error\n\nFailed to create ticket: ${error}`;
  }
}