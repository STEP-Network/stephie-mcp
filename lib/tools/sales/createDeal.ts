import { type MondayItemResponse, mondayApi } from "../../monday/client.js";
import type { GraphQLError, MondayColumnValues } from "../../monday/types.js";
import { TOOL_BOARD_IDS } from "../board-ids.js";

export async function createDeal(params: {
	name: string;
	status?: number; // Deal Stage: 0=Lead, 1=Meeting, 2=Proposal, 3=Negotiation, 9=Won, 5=Lost
	status5?: number; // Deal Type: 0=New Business, 1=Expansion, 2=Renewal
	people?: string; // Owner (person ID)
	numbers?: number; // Deal Value
	date?: string; // Close Date (YYYY-MM-DD format)
	accountId?: string; // Link to account
	contactId?: string; // Link to contact
	opportunityId?: string; // Link to opportunity
	groupId?: string; // Group to add the item to
}) {
	const {
		name,
		status,
		status5,
		people,
		numbers,
		date,
		accountId,
		contactId,
		opportunityId,
		groupId,
	} = params;

	// Build column values
	const columnValues: MondayColumnValues = {};

	if (status !== undefined) columnValues.status = { index: status };
	if (status5 !== undefined) columnValues.status5 = { index: status5 };
	if (people)
		columnValues.people = {
			personsAndTeams: [{ id: parseInt(people, 10), kind: "person" }],
		};
	if (numbers !== undefined) columnValues.numbers = numbers;
	if (date) columnValues.date = { date };

	// Handle board relations
	if (accountId)
		columnValues.connect_boards = { item_ids: [parseInt(accountId, 10)] };
	if (contactId)
		columnValues.connect_boards__1 = { item_ids: [parseInt(contactId, 10)] };
	if (opportunityId)
		columnValues.connect_boards4 = { item_ids: [parseInt(opportunityId, 10)] };

	const mutation = `
    mutation CreateDeal($boardId: ID!, $name: String!, $columnValues: JSON!, $groupId: String) {
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
		boardId: TOOL_BOARD_IDS.DEALS,
		name,
		columnValues: JSON.stringify(columnValues),
		groupId,
	};

	try {
		const response = await mondayApi(mutation, variables);

		if (response.errors) {
			console.error("GraphQL errors:", response.errors);
			return `# Error Creating Deal\n\n${response.errors.map((e: GraphQLError) => e.message).join("\n")}`;
		}

		const item = response.data?.create_item;
		if (!item) {
			return "# Error\n\nFailed to create deal - no item returned";
		}

		// Format response
		let result = `# Deal Created Successfully\n\n`;
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
		console.error("Error creating deal:", error);
		return `# Error\n\nFailed to create deal: ${error}`;
	}
}
