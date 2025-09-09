import { type MondayItemResponse, mondayApi } from "../../monday/client.js";
import type { GraphQLError, MondayColumnValues } from "../../monday/types.js";
import { TOOL_BOARD_IDS } from "../board-ids.js";

export async function createBug(params: {
	name: string;
	status?: number; // Status: 0=Open, 1=Fixed, 2=In Progress, 3=Pending Review, 4=Cancelled, 5=Investigating, 6=Won't Fix, 107=Retest
	priority?: number; // Priority: 0=Critical, 1=High, 2=Medium, 3=Low, 4=Best Effort
	dropdown?: number; // Type: 0=Bug, 1=Improvement, 2=Infrastructure, 3=Feature Request, 4=UI
	people?: string; // Developer (person ID)
	long_text?: string; // Bug Report
	text?: string; // Environment
	groupId?: string; // Group to add the item to
}) {
	const { name, status, priority, dropdown, people, long_text, text, groupId } =
		params;

	// Build column values
	const columnValues: MondayColumnValues = {};

	if (status !== undefined) columnValues.status = { index: status };
	if (priority !== undefined) columnValues.priority = { index: priority };
	if (dropdown !== undefined) columnValues.dropdown = { ids: [dropdown] };
	if (people)
		columnValues.people = {
			personsAndTeams: [{ id: parseInt(people, 10), kind: "person" }],
		};
	if (long_text) columnValues.long_text = { text: long_text };
	if (text) columnValues.text = text;

	const mutation = `
    mutation CreateBug($boardId: ID!, $name: String!, $columnValues: JSON!, $groupId: String) {
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
		boardId: TOOL_BOARD_IDS.BUGS,
		name,
		columnValues: JSON.stringify(columnValues),
		groupId,
	};

	try {
		const response = await mondayApi(mutation, variables);

		if (response.errors) {
			console.error("GraphQL errors:", response.errors);
			return `# Error Creating Bug\n\n${response.errors.map((e: GraphQLError) => e.message).join("\n")}`;
		}

		const item = response.data?.create_item;
		if (!item) {
			return "# Error\n\nFailed to create bug - no item returned";
		}

		// Format response
		let result = `# Bug Created Successfully\n\n`;
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
		console.error("Error creating bug:", error);
		return `# Error\n\nFailed to create bug: ${error}`;
	}
}
