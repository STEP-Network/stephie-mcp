import { type MondayItemResponse, mondayApi } from "../../monday/client.js";
import type { GraphQLError, MondayColumnValues } from "../../monday/types.js";

export async function updateAccount(params: {
	itemId: string;
	name?: string;
	status?: number; // Account Status: 0=On hold, 4=Client, 13=Past Client, 17=New Biz
	status5?: number; // Type: 0=Agency, 1=Agency Group, 2=Partner, 3=Publisher, 4=Publisher Lead, 107=Advertiser
	people?: string; // Owner (person ID)
	email?: string;
	phone?: string;
	text?: string; // Website
	contactsId?: string; // Link to contacts
	opportunitiesId?: string; // Link to opportunities
	leadsId?: string; // Link to leads
}) {
	const {
		itemId,
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
	} = params;

	// Build column values for update
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
    mutation UpdateAccount($columnValues: JSON!) {
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
			return `# Error Updating Account\n\n${response.errors.map((e: GraphQLError) => e.message).join("\n")}`;
		}

		// Get the result from whichever mutation returned data
		const item = response.data?.changeColumns || response.data?.changeName;
		if (!item) {
			return "# Error\n\nFailed to update account - no item returned";
		}

		// Format response
		let result = `# Account Updated Successfully\n\n`;
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
		console.error("Error updating account:", error);
		return `# Error\n\nFailed to update account: ${error}`;
	}
}
