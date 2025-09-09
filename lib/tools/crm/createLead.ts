import { type MondayItemResponse, mondayApi } from "../../monday/client.js";
import type { GraphQLError, MondayColumnValues } from "../../monday/types.js";
import { TOOL_BOARD_IDS } from "../board-ids.js";

export async function createLead(params: {
	name: string;
	status?: number; // Lead Status: 0=Nurturing, 5=Closed Lost, 15=Lead, 20=Reached-out, 21=Connected, 22=Evaluated, 24=Qualified
	status1?: number; // Lead Rating: 0=Hot, 1=Warm, 2=Cold
	status_12?: number; // Tier: 0=1, 1=2, 2=3, 3=4
	people?: string; // Owner (person ID)
	email?: string;
	phone?: string;
	text?: string; // Company
	accountId?: string; // Link to account
	contactId?: string; // Link to contact
	opportunitiesId?: string; // Link to opportunities
	groupId?: string; // Group to add the item to
}) {
	const {
		name,
		status,
		status1,
		status_12,
		people,
		email,
		phone,
		text,
		accountId,
		contactId,
		opportunitiesId,
		groupId,
	} = params;

	// Build column values
	const columnValues: MondayColumnValues = {};

	if (status !== undefined) columnValues.status = { index: status };
	if (status1 !== undefined) columnValues.status1 = { index: status1 };
	if (status_12 !== undefined) columnValues.status_12 = { index: status_12 };
	if (people)
		columnValues.people = {
			personsAndTeams: [{ id: parseInt(people, 10), kind: "person" }],
		};
	if (email) columnValues.email = { email, text: email };
	if (phone) columnValues.phone = phone;
	if (text) columnValues.text = text;

	// Handle board relations
	if (accountId)
		columnValues.connect_boards = { item_ids: [parseInt(accountId, 10)] };
	if (contactId)
		columnValues.connect_boards4 = { item_ids: [parseInt(contactId, 10)] };
	if (opportunitiesId)
		columnValues.connect_boards7 = {
			item_ids: [parseInt(opportunitiesId, 10)],
		};

	const mutation = `
    mutation CreateLead($boardId: ID!, $name: String!, $columnValues: JSON!, $groupId: String) {
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
		boardId: TOOL_BOARD_IDS.LEADS,
		name,
		columnValues: JSON.stringify(columnValues),
		groupId,
	};

	try {
		const response = await mondayApi(mutation, variables);

		if (response.errors) {
			console.error("GraphQL errors:", response.errors);
			return `# Error Creating Lead\n\n${response.errors.map((e: GraphQLError) => e.message).join("\n")}`;
		}

		const item = response.data?.create_item;
		if (!item) {
			return "# Error\n\nFailed to create lead - no item returned";
		}

		// Format response
		let result = `# Lead Created Successfully\n\n`;
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
		console.error("Error creating lead:", error);
		return `# Error\n\nFailed to create lead: ${error}`;
	}
}
