import { type MondayItemResponse, mondayApi } from "../../monday/client.js";
import type { GraphQLError, MondayColumnValues } from "../../monday/types.js";

export async function updateOpportunity(params: {
	itemId: string;
	name?: string;
	status?: number; // Opportunity Stage: 0=Lead, 1=Lead Nurturing, 2=Meeting, 3=Negotiation, 4=Legal, 5=Sent Commercial, 7=Closed Lost, 9=Closed Won, 101=Pilot
	people?: string; // Owner (person ID)
	status_14?: number; // Product Type: 0=Display, 2=Video, 3=Display + Video, 5=OOH/DOOH, 8=Display + Video + OOH/DOOH, 10=Display + OOH/DOOH, 11=Video + OOH/DOOH
	numbers?: number; // Deal Size (numeric value)
	leadId?: string; // Link to lead
	accountId?: string; // Link to account
	contactId?: string; // Link to contact
}) {
	const {
		itemId,
		name,
		status,
		people,
		status_14,
		numbers,
		leadId,
		accountId,
		contactId,
	} = params;

	// Build column values for update
	const columnValues: MondayColumnValues = {};

	if (status !== undefined) columnValues.status = { index: status };
	if (status_14 !== undefined) columnValues.status_14 = { index: status_14 };
	if (people)
		columnValues.people = {
			personsAndTeams: [{ id: parseInt(people, 10), kind: "person" }],
		};
	if (numbers !== undefined) columnValues.numbers = numbers;

	// Handle board relations
	if (leadId)
		columnValues.connect_boards3 = { item_ids: [parseInt(leadId, 10)] };
	if (accountId)
		columnValues.connect_boards = { item_ids: [parseInt(accountId, 10)] };
	if (contactId)
		columnValues.connect_boards9 = { item_ids: [parseInt(contactId, 10)] };

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
    mutation UpdateOpportunity($columnValues: JSON!) {
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
			return `# Error Updating Opportunity\n\n${response.errors.map((e: GraphQLError) => e.message).join("\n")}`;
		}

		// Get the result from whichever mutation returned data
		const item = response.data?.changeColumns || response.data?.changeName;
		if (!item) {
			return "# Error\n\nFailed to update opportunity - no item returned";
		}

		// Format response
		let result = `# Opportunity Updated Successfully\n\n`;
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
		console.error("Error updating opportunity:", error);
		return `# Error\n\nFailed to update opportunity: ${error}`;
	}
}
