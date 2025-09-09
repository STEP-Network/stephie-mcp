import {
	type MondayColumnValueResponse,
	type MondayItemResponse,
	mondayApi,
} from "../../monday/client.js";
import { getDynamicColumns } from "../dynamic-columns.js";
import { createListResponse, formatMondayItem } from "../json-output.js";

export async function getAccounts(
	params: {
		limit?: number;
		search?: string;
		people?: string; // Owner
		status?: number; // Account Status (numeric index)
		status5?: number; // Type (numeric index)
		contactsId?: string; // Filter by linked contacts (use getContacts to find IDs)
		opportunitiesId?: string; // Filter by linked opportunities (use getOpportunities to find IDs)
		leadsId?: string; // Filter by linked leads (use getLeads to find IDs)
	} = {},
) {
	const {
		limit = 10,
		search,
		people,
		status,
		status5,
		contactsId,
		opportunitiesId,
		leadsId,
	} = params;

	// Fetch dynamic columns from Columns board
	const BOARD_ID = "1402911027";
	const dynamicColumns = await getDynamicColumns(BOARD_ID);

	// Build filters
	const filters: Array<Record<string, unknown>> = [];
	if (search) {
		filters.push({
			column_id: "name",
			compare_value: search,
			operator: "contains_text",
		});
	}
	if (people)
		filters.push({
			column_id: "people",
			compare_value: people,
			operator: "contains_text",
		});
	if (status !== undefined)
		filters.push({
			column_id: "status",
			compare_value: [status],
			operator: "any_of",
		});
	if (status5 !== undefined)
		filters.push({
			column_id: "status5",
			compare_value: [status5],
			operator: "any_of",
		});

	const queryParams =
		filters.length > 0
			? `, query_params: { rules: [${filters
					.map(
						(f) => `{
        column_id: "${f.column_id}",
        compare_value: ${Array.isArray(f.compare_value) ? `[${f.compare_value}]` : typeof f.compare_value === "string" ? `"${f.compare_value}"` : f.compare_value},
        operator: ${f.operator}
      }`,
					)
					.join(",")}]}`
			: "";

	const query = `
    query {
      boards(ids: [1402911027]) {
        id
        name
        items_page(limit: ${limit}${queryParams}) {
          items {
            id
            name
            created_at
            updated_at
            column_values(ids: [${dynamicColumns.map((id) => `"${id}"`).join(", ")}]) {
              id
              text
              value
              column {
                title
                type
              }
            }
          }
        }
      }
    }
  `;

	try {
		const response = await mondayApi(query);
		const board = response.data?.boards?.[0];
		if (!board) throw new Error("Board not found");

		let items = board.items_page?.items || [];

		// Apply board relation filters
		if (contactsId) {
			items = items.filter((item: Record<string, unknown>) => {
				const relationCol = (item as MondayItemResponse).column_values.find(
					(c: Record<string, unknown>) => c.id === "account_contact",
				);
				if (relationCol?.value) {
					try {
						const linked = JSON.parse(relationCol.value);
						return linked?.linkedItemIds?.includes(contactsId);
					} catch {
						return false;
					}
				}
				return false;
			});
		}

		if (opportunitiesId) {
			items = items.filter((item: Record<string, unknown>) => {
				const relationCol = (item as MondayItemResponse).column_values.find(
					(c: Record<string, unknown>) => c.id === "account_deal",
				);
				if (relationCol?.value) {
					try {
						const linked = JSON.parse(relationCol.value);
						return linked?.linkedItemIds?.includes(opportunitiesId);
					} catch {
						return false;
					}
				}
				return false;
			});
		}

		if (leadsId) {
			items = items.filter((item: Record<string, unknown>) => {
				const relationCol = (item as MondayItemResponse).column_values.find(
					(c: Record<string, unknown>) => c.id === "connect_boards9",
				);
				if (relationCol?.value) {
					try {
						const linked = JSON.parse(relationCol.value);
						return linked?.linkedItemIds?.includes(leadsId);
					} catch {
						return false;
					}
				}
				return false;
			});
		}

		// Format items for JSON response
		const formattedItems = items.map((item: Record<string, unknown>) => {
			const formatted: any = {
				id: item.id,
				name: item.name,
				createdAt: item.created_at,
				updatedAt: item.updated_at,
			};

			// Process column values
			(item as MondayItemResponse).column_values.forEach(
				(col: Record<string, unknown>) => {
					const column = col as MondayColumnValueResponse;
					const fieldName = column.column?.title?.toLowerCase().replace(/\s+/g, '_') || column.id;
					
					// Parse different column types
					if (column.column?.type === 'status' || column.column?.type === 'dropdown') {
						// Try to get index for status/dropdown
						const parsedValue = column.value ? JSON.parse(column.value) : null;
						formatted[fieldName] = {
							index: parsedValue?.index,
							label: column.text || null
						};
					} else if (column.column?.type === 'board-relation') {
						// Parse board relations
						const parsedValue = column.value ? JSON.parse(column.value) : null;
						formatted[fieldName] = parsedValue?.linkedItemIds || [];
					} else if (column.column?.type === 'multiple-person') {
						// Parse multiple person columns
						const parsedValue = column.value ? JSON.parse(column.value) : null;
						formatted[fieldName] = parsedValue?.personsAndTeams || [];
					} else {
						// Default to text value
						formatted[fieldName] = column.text || null;
					}
				},
			);

			return formatted;
		});

		// Build metadata
		const metadata: Record<string, any> = {
			boardId: "1402911027",
			boardName: "Accounts",
			limit,
			filters: {}
		};

		if (search) metadata.filters.search = search;
		if (people) metadata.filters.owner = people;
		if (status !== undefined) metadata.filters.status = status;
		if (status5 !== undefined) metadata.filters.type = status5;
		if (contactsId) metadata.filters.contactsId = contactsId;
		if (opportunitiesId) metadata.filters.opportunitiesId = opportunitiesId;
		if (leadsId) metadata.filters.leadsId = leadsId;

		return JSON.stringify(
			createListResponse(
				"getAccounts",
				formattedItems,
				metadata,
				{
					summary: `Found ${formattedItems.length} account${formattedItems.length !== 1 ? 's' : ''}`
				}
			),
			null,
			2
		);
	} catch (error) {
		console.error("Error fetching Accounts items:", error);
		throw error;
	}
}
