import { type MondayItemResponse, mondayApi } from "../../monday/client.js";
import type { GraphQLError, MondayColumnValues } from "../../monday/types.js";

export async function updateDeal(params: {
	itemId: string;
	name?: string;
	status?: number; // Deal Stage: 0=Lead, 1=Meeting, 2=Proposal, 3=Negotiation, 9=Won, 5=Lost
	status5?: number; // Deal Type: 0=New Business, 1=Expansion, 2=Renewal
	people?: string; // Owner (person ID)
	numbers?: number; // Deal Value
	date?: string; // Close Date (YYYY-MM-DD format)
	accountId?: string; // Link to account
	contactId?: string; // Link to contact
	opportunityId?: string; // Link to opportunity
}) {
	const {
		itemId,
		name,
		status,
		status5,
		people,
		numbers,
		date,
		accountId,
		contactId,
		opportunityId,
	} = params;

	// Build column values for update
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
    mutation UpdateDeal($columnValues: JSON!) {
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
			return `# Error Updating Deal\n\n${response.errors.map((e: GraphQLError) => e.message).join("\n")}`;
		}

		// Get the result from whichever mutation returned data
		const item = response.data?.changeColumns || response.data?.changeName;
		if (!item) {
			return "# Error\n\nFailed to update deal - no item returned";
		}

		// Format response
		let result = `# Deal Updated Successfully\n\n`;
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
		console.error("Error updating deal:", error);
		return `# Error\n\nFailed to update deal: ${error}`;
	}
}
