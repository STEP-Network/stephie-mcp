import { type MondayItemResponse, mondayApi } from "../../monday/client.js";
import type { GraphQLError, MondayColumnValues } from "../../monday/types.js";

export async function updateTaskYieldGrowth(params: {
	itemId: string;
	name?: string;
	status?: number; // Status: 0=Done, 1=Working on it, 2=Stuck, 3=Waiting for review, 5=Not started
	priority?: number; // Priority: 0=Critical, 1=High, 2=Medium, 3=Low
	people?: string; // Assignee (person ID)
	date4?: string; // Due Date (YYYY-MM-DD format)
	text?: string; // Notes
}) {
	const { itemId, name, status, priority, people, date4, text } = params;

	// Build column values for update
	const columnValues: MondayColumnValues = {};

	if (status !== undefined) columnValues.status = { index: status };
	if (priority !== undefined) columnValues.priority = { index: priority };
	if (people)
		columnValues.people = {
			personsAndTeams: [{ id: parseInt(people, 10), kind: "person" }],
		};
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
		return "# No Updates\n\nNo fields provided to update.";
	}

	const mutation = `
    mutation UpdateTaskYieldGrowth($columnValues: JSON!) {
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
			return `# Error Updating Yield Growth Task\n\n${response.errors.map((e: GraphQLError) => e.message).join("\n")}`;
		}

		// Get the result from whichever mutation returned data
		const item = response.data?.changeColumns || response.data?.changeName;
		if (!item) {
			return "# Error\n\nFailed to update Yield Growth task - no item returned";
		}

		// Format response
		let result = `# Yield Growth Task Updated Successfully\n\n`;
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
		console.error("Error updating Yield Growth task:", error);
		return `# Error\n\nFailed to update Yield Growth task: ${error}`;
	}
}
