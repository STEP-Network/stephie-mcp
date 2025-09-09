import { type MondayItemResponse, mondayApi } from "../../monday/client.js";
import type { GraphQLError, MondayColumnValues } from "../../monday/types.js";
import { TOOL_BOARD_IDS } from "../board-ids.js";

export async function createAccount(params: {
	name: string;
	status?: number; // Account Status: 0=On hold, 4=Client, 13=Past Client, 17=New Biz
	status5?: number; // Type: 0=Agency, 1=Agency Group, 2=Partner, 3=Publisher, 4=Publisher Lead, 107=Advertiser
	people?: string; // Owner (person ID)
	email?: string;
	phone?: string;
	text?: string; // Website
	contactsId?: string; // Link to contacts
	opportunitiesId?: string; // Link to opportunities
	leadsId?: string; // Link to leads
	groupId?: string; // Group to add the item to
}) {
	const {
		name,
		status,
		status5,
		people,
		email,
		phone,
		text,
		contactsId,
		opportunitiesId,
		leadsId,
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
	if (email) columnValues.email = { email, text: email };
	if (phone) columnValues.phone = phone;
	if (text) columnValues.text = text;

	// Handle board relations
	if (contactsId)
		columnValues.connect_boards1 = { item_ids: [parseInt(contactsId, 10)] };
	if (opportunitiesId)
		columnValues.connect_boards5 = {
			item_ids: [parseInt(opportunitiesId, 10)],
		};
	if (leadsId)
		columnValues.board_relation = { item_ids: [parseInt(leadsId, 10)] };

	const mutation = `
    mutation CreateAccount($boardId: ID!, $name: String!, $columnValues: JSON!, $groupId: String) {
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
		boardId: TOOL_BOARD_IDS.ACCOUNTS,
		name,
		columnValues: JSON.stringify(columnValues),
		groupId,
	};

	try {
		const response = await mondayApi(mutation, variables);

		if (response.errors) {
			console.error("GraphQL errors:", response.errors);
			return `# Error Creating Account\n\n${response.errors.map((e: GraphQLError) => e.message).join("\n")}`;
		}

		const item = response.data?.create_item;
		if (!item) {
			return "# Error\n\nFailed to create account - no item returned";
		}

		// Format response
		let result = `# Account Created Successfully\n\n`;
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
		console.error("Error creating account:", error);
		return `# Error\n\nFailed to create account: ${error}`;
	}
}
