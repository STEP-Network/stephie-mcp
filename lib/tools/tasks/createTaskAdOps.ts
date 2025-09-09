import { type MondayItemResponse, mondayApi } from "../../monday/client.js";
import type { GraphQLError, MondayColumnValues } from "../../monday/types.js";
import { TOOL_BOARD_IDS } from "../board-ids.js";

export async function createTaskAdOps(params: {
	name: string;
	status?: number; // Status: 0=Done, 3=Working on it, 4=New, 5=Waiting/On hold, 6=Ready to work, 8=Test pending, 9=Not doing, 10=In review, 11=Stuck
	priority?: number; // Priority: 0=Critical, 1=High, 2=Medium, 3=Low
	people?: string; // Person (person ID)
	date4?: string; // Due Date (YYYY-MM-DD format)
	text?: string; // Description
	groupId?: string; // Group to add the item to
}) {
	const { name, status, priority, people, date4, text, groupId } = params;

	// Build column values
	const columnValues: MondayColumnValues = {};

	if (status !== undefined) columnValues.status = { index: status };
	if (priority !== undefined) columnValues.priority = { index: priority };
	if (people)
		columnValues.people = {
			personsAndTeams: [{ id: parseInt(people, 10), kind: "person" }],
		};
	if (date4) columnValues.date4 = { date: date4 };
	if (text) columnValues.text = text;

	const mutation = `
    mutation CreateTaskAdOps($boardId: ID!, $name: String!, $columnValues: JSON!, $groupId: String) {
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
		boardId: TOOL_BOARD_IDS.TASKS_AD_OPS,
		name,
		columnValues: JSON.stringify(columnValues),
		groupId,
	};

	try {
		const response = await mondayApi(mutation, variables);

		if (response.errors) {
			console.error("GraphQL errors:", response.errors);
			return `# Error Creating AdOps Task\n\n${response.errors.map((e: GraphQLError) => e.message).join("\n")}`;
		}

		const item = response.data?.create_item;
		if (!item) {
			return "# Error\n\nFailed to create AdOps task - no item returned";
		}

		// Format response
		let result = `# AdOps Task Created Successfully\n\n`;
		result += `**Name:** ${(item as MondayItemResponse).name}\n`;
		result += `**ID:** ${(item as MondayItemResponse).id}\n\n`;

		// Parse column values for display
		const columnData = (item as MondayItemResponse).column_values || [];
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
		console.error("Error creating AdOps task:", error);
		return `# Error\n\nFailed to create AdOps task: ${error}`;
	}
}
