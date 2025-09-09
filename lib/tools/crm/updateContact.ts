import { type MondayItemResponse, mondayApi } from "../../monday/client.js";
import type { GraphQLError, MondayColumnValues } from "../../monday/types.js";

export async function updateContact(params: {
	itemId: string;
	name?: string;
	status?: number; // Department: 0=CEO/C-Suite, 1=Sales Director, 2=Sales Manager, 3=Head of Programmatic/Media, 10=AdOps, 102=Marketing, 103=Finance, 104=Data/Engineering/Tech, 108=Head of Creative
	people?: string; // Owner (person ID)
	email?: string;
	phone?: string;
	text?: string; // Position
	accountId?: string; // Link to account
	opportunitiesId?: string; // Link to opportunities
	leadsId?: string; // Link to leads
}) {
	const {
		itemId,
		name,
		status,
		people,
		email,
		phone,
		text,
		accountId,
		opportunitiesId,
		leadsId,
	} = params;

	// Build column values for update
	const columnValues: MondayColumnValues = {};

	if (status !== undefined) columnValues.status = { index: status };
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
	if (opportunitiesId)
		columnValues.connect_boards1 = {
			item_ids: [parseInt(opportunitiesId, 10)],
		};
	if (leadsId)
		columnValues.connect_boards8 = { item_ids: [parseInt(leadsId, 10)] };

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
    mutation UpdateContact($columnValues: JSON!) {
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
			return `# Error Updating Contact\n\n${response.errors.map((e: GraphQLError) => e.message).join("\n")}`;
		}

		// Get the result from whichever mutation returned data
		const item = response.data?.changeColumns || response.data?.changeName;
		if (!item) {
			return "# Error\n\nFailed to update contact - no item returned";
		}

		// Format response
		let result = `# Contact Updated Successfully\n\n`;
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
		console.error("Error updating contact:", error);
		return `# Error\n\nFailed to update contact: ${error}`;
	}
}
