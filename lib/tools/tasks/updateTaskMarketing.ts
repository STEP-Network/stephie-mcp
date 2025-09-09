import { type MondayItemResponse, mondayApi } from "../../monday/client.js";
import type { GraphQLError, MondayColumnValues } from "../../monday/types.js";

export async function updateTaskMarketing(params: {
	itemId: string;
	name?: string;
	status?: number; // Status: 0=In Review, 1=Done, 2=Rejected, 3=Planned, 4=In Progress, 5=Missing Status, 6=Waiting On Others, 7=New, 8=On Hold
	priority?: number; // Priority: 0=Critical, 1=High, 2=Medium, 3=Low
	people?: string; // Assignee (person ID)
	date?: string; // Due Date (YYYY-MM-DD format)
	long_text?: string; // Notes
}) {
	const { itemId, name, status, priority, people, date, long_text } = params;

	// Build column values for update
	const columnValues: MondayColumnValues = {};

	if (status !== undefined) columnValues.status = { index: status };
	if (priority !== undefined) columnValues.priority = { index: priority };
	if (people)
		columnValues.people = {
			personsAndTeams: [{ id: parseInt(people, 10), kind: "person" }],
		};
	if (date) columnValues.date = { date };
	if (long_text) columnValues.long_text = { text: long_text };

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
		return "# No Updates\n\nNo fields provided to update.";
	}

	const mutation = `
    mutation UpdateTaskMarketing($columnValues: JSON!) {
      ${mutations.join("\n")}
    }
  `;

	const variables = {
		columnValues: JSON.stringify(columnValues),
	};

	try {
		const response = await mondayApi(mutation, variables);

		if (response.errors) {
			console.error("GraphQL errors:", response.errors);
			return `# Error Updating Marketing Task\n\n${response.errors.map((e: GraphQLError) => e.message).join("\n")}`;
		}

		// Get the result from whichever mutation returned data
		const item = response.data?.changeColumns || response.data?.changeName;
		if (!item) {
			return "# Error\n\nFailed to update Marketing task - no item returned";
		}

		// Format response
		let result = `# Marketing Task Updated Successfully\n\n`;
		result += `**ID:** ${(item as MondayItemResponse).id}\n`;
		if ((item as MondayItemResponse).name)
			result += `**Name:** ${(item as MondayItemResponse).name}\n\n`;

		// Parse column values for display if available
		const columnData = (item as MondayItemResponse).column_values || [];
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
		console.error("Error updating Marketing task:", error);
		return `# Error\n\nFailed to update Marketing task: ${error}`;
	}
}
