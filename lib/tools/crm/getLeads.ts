import {
	type MondayColumnValueResponse,
	type MondayItemResponse,
	mondayApi,
} from "../../monday/client.js";
import { getDynamicColumns } from "../dynamic-columns.js";
import { createListResponse } from "../json-output.js";

export async function getLeads(
	params: {
		limit?: number;
		search?: string;
		lead_owner?: string; // Owner
		lead_status?: number; // Status (numeric index)
		status_1__1?: number; // Type (husk at angiv!) (numeric index)
		date0__1?: string; // Created Date (YYYY-MM-DD)
		existingContactId?: string; // Filter by existing contact (use getContacts to find IDs)
		existingAccountId?: string; // Filter by existing account (use getAccounts to find IDs)
		opportunityId?: string; // Filter by linked opportunity (use getOpportunities to find IDs)
	} = {},
) {
	const {
		limit = 10,
		search,
		lead_owner,
		lead_status,
		status_1__1,
		date0__1,
		existingContactId,
		existingAccountId,
		opportunityId,
	} = params;

	// Fetch dynamic columns from Columns board
	const BOARD_ID = "1402911026";
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
	if (lead_owner)
		filters.push({
			column_id: "lead_owner",
			compare_value: lead_owner,
			operator: "contains_text",
		});
	if (lead_status !== undefined)
		filters.push({
			column_id: "lead_status",
			compare_value: [lead_status],
			operator: "any_of",
		});
	if (status_1__1 !== undefined)
		filters.push({
			column_id: "status_1__1",
			compare_value: [status_1__1],
			operator: "any_of",
		});
	if (date0__1)
		filters.push({
			column_id: "date0__1",
			compare_value: date0__1,
			operator: "contains_text",
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
      boards(ids: [1402911026]) {
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
              ... on BoardRelationValue {
                linked_items { id name }
              }
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
		if (existingContactId) {
			items = items.filter((item: Record<string, unknown>) => {
				const relationCol = (item as MondayItemResponse).column_values.find(
					(c: Record<string, unknown>) => c.id === "link_to_contacts",
				);
				if (relationCol?.value) {
					try {
						const linked = JSON.parse(relationCol.value);
						return linked?.linkedItemIds?.includes(existingContactId);
					} catch {
						return false;
					}
				}
				return false;
			});
		}

		if (existingAccountId) {
			items = items.filter((item: Record<string, unknown>) => {
				const relationCol = (item as MondayItemResponse).column_values.find(
					(c: Record<string, unknown>) => c.id === "link_to_accounts7",
				);
				if (relationCol?.value) {
					try {
						const linked = JSON.parse(relationCol.value);
						return linked?.linkedItemIds?.includes(existingAccountId);
					} catch {
						return false;
					}
				}
				return false;
			});
		}

		if (opportunityId) {
			items = items.filter((item: Record<string, unknown>) => {
				const relationCol = (item as MondayItemResponse).column_values.find(
					(c: Record<string, unknown>) => c.id === "connect_boards70__1",
				);
				if (relationCol?.value) {
					try {
						const linked = JSON.parse(relationCol.value);
						return linked?.linkedItemIds?.includes(opportunityId);
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
					} else if (column.column?.type === 'board_relation') {
						// Use linked_items from GraphQL fragment if available, fallback to parsed value
						const columnWithLinkedItems = column as MondayColumnValueResponse & { linked_items?: Array<{ id: string; name: string }> };
						const linkedItems = columnWithLinkedItems.linked_items || [];
						if (linkedItems.length > 0) {
							formatted[fieldName] = linkedItems;
						} else {
							const parsedValue = column.value ? JSON.parse(column.value) : null;
							formatted[fieldName] = parsedValue?.linkedItemIds || [];
						}
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
			boardId: "1402911026",
			boardName: "Leads",
			limit,
			filters: {}
		};

		if (search) metadata.filters.search = search;
		if (lead_owner) metadata.filters.owner = lead_owner;
		if (lead_status !== undefined) metadata.filters.status = lead_status;
		if (status_1__1 !== undefined) metadata.filters.type = status_1__1;
		if (date0__1) metadata.filters.createdDate = date0__1;
		if (existingContactId) metadata.filters.contactId = existingContactId;
		if (existingAccountId) metadata.filters.accountId = existingAccountId;
		if (opportunityId) metadata.filters.opportunityId = opportunityId;

		return JSON.stringify(
			createListResponse(
				"getLeads",
				formattedItems,
				metadata,
				{
					summary: `Found ${formattedItems.length} lead${formattedItems.length !== 1 ? 's' : ''}`
				}
			),
			null,
			2
		);
	} catch (error) {
		console.error("Error fetching Leads items:", error);
		throw error;
	}
}
