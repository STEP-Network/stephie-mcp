import { type MondayItemResponse, mondayApi } from "../../monday/client.js";
import type { GraphQLError, MondayColumnValues } from "../../monday/types.js";

export async function updateSalesActivity(params: {
	itemId: string;
	name?: string;
	status?: number; // Status: 0=To do, 1=Done, 2=Meeting canceled, 6=No meeting yet
	dropdown?: number; // Activity Type: 0=Email, 1=Phone, 2=Call, 3=Meeting, 7=Note
	people?: string; // Lead Owner (person ID)
	date?: string; // Activity Date (YYYY-MM-DD format)
	text?: string; // Notes
	accountId?: string; // Link to account
	opportunityId?: string; // Link to opportunity
	leadId?: string; // Link to lead
	contactId?: string; // Link to contact
}) {
	const {
		itemId,
		name,
		status,
		dropdown,
		people,
		date,
		text,
		accountId,
		opportunityId,
		leadId,
		contactId,
	} = params;

	// Build column values for update
	const columnValues: MondayColumnValues = {};

	if (status !== undefined) columnValues.status = { index: status };
	if (dropdown !== undefined) columnValues.dropdown = { ids: [dropdown] };
	if (people)
		columnValues.people = {
			personsAndTeams: [{ id: parseInt(people, 10), kind: "person" }],
		};
	if (date) columnValues.date = { date };
	if (text) columnValues.text = text;

	// Handle board relations
	if (accountId)
		columnValues.connect_boards__1 = { item_ids: [parseInt(accountId, 10)] };
	if (opportunityId)
		columnValues.connect_boards4__1 = {
			item_ids: [parseInt(opportunityId, 10)],
		};
	if (leadId)
		columnValues.connect_boards2__1 = { item_ids: [parseInt(leadId, 10)] };
	if (contactId)
		columnValues.connect_boards7__1 = { item_ids: [parseInt(contactId, 10)] };

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
    mutation UpdateSalesActivity($columnValues: JSON!) {
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
			return `# Error Updating Sales Activity\n\n${response.errors.map((e: GraphQLError) => e.message).join("\n")}`;
		}

		// Get the result from whichever mutation returned data
		const item = response.data?.changeColumns || response.data?.changeName;
		if (!item) {
			return "# Error\n\nFailed to update sales activity - no item returned";
		}

		// Format response
		let result = `# Sales Activity Updated Successfully\n\n`;
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
		console.error("Error updating sales activity:", error);
		return `# Error\n\nFailed to update sales activity: ${error}`;
	}
}
