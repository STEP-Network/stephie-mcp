import { type MondayItemResponse, mondayApi } from "../../monday/client.js";
import type { GraphQLError, MondayColumnValues } from "../../monday/types.js";

export async function updateLead(params: {
	itemId: string;
	name?: string;
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
}) {
	const {
		itemId,
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
	} = params;

	// Build column values for update
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
    mutation UpdateLead($columnValues: JSON!) {
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
			return `# Error Updating Lead\n\n${response.errors.map((e: GraphQLError) => e.message).join("\n")}`;
		}

		// Get the result from whichever mutation returned data
		const item = response.data?.changeColumns || response.data?.changeName;
		if (!item) {
			return "# Error\n\nFailed to update lead - no item returned";
		}

		// Format response
		let result = `# Lead Updated Successfully\n\n`;
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
		console.error("Error updating lead:", error);
		return `# Error\n\nFailed to update lead: ${error}`;
	}
}
