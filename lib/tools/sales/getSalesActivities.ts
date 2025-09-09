import {
	type MondayColumnValueResponse,
	type MondayItemResponse,
	mondayApi,
} from "../../monday/client.js";
import { getDynamicColumns } from "../dynamic-columns.js";
import { createListResponse, createSuccessResponse, createErrorResponse } from "../json-output.js";
export async function getSalesActivities(
	params: {
		limit?: number;
		search?: string;
		activity_owner?: string; // *Owner
		activity_status?: number; // Status (numeric index)
		activity_type?: number; // *Activity Type (numeric index)
		activity_date?: string; // Date filter
		accountId?: string; // Filter by account (use getAccounts to find IDs)
		contactId?: string; // Filter by contact (use getContacts to find IDs)
		opportunityId?: string; // Filter by opportunity (use getOpportunities to find IDs)
	} = {},
) {
	const {
		limit = 10,
		search,
		activity_owner,
		activity_status,
		activity_type,
		activity_date,
		accountId,
		contactId,
		opportunityId,
	} = params;

	// Fetch dynamic columns from Columns board
	const BOARD_ID = "1402911042";
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
	if (activity_owner)
		filters.push({
			column_id: "activity_owner",
			compare_value: activity_owner,
			operator: "contains_text",
		});
	if (activity_status !== undefined)
		filters.push({
			column_id: "activity_status",
			compare_value: [activity_status],
			operator: "any_of",
		});
	if (activity_type !== undefined)
		filters.push({
			column_id: "activity_type",
			compare_value: [activity_type],
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
      boards(ids: [1402911042]) {
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
		if (accountId) {
			items = items.filter((item: Record<string, unknown>) => {
				const relationCol = (item as MondayItemResponse).column_values.find(
					(c: Record<string, unknown>) => c.id === "connect_boards9__1",
				);
				if (relationCol?.value) {
					try {
						const linked = JSON.parse(relationCol.value);
						return linked?.linkedItemIds?.includes(accountId);
					} catch {
						return false;
					}
				}
				return false;
			});
		}

		if (contactId) {
			items = items.filter((item: Record<string, unknown>) => {
				const relationCol = (item as MondayItemResponse).column_values.find(
					(c: Record<string, unknown>) => c.id === "link_to_contacts8__1",
				);
				if (relationCol?.value) {
					try {
						const linked = JSON.parse(relationCol.value);
						return linked?.linkedItemIds?.includes(contactId);
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
					(c: Record<string, unknown>) => c.id === "link_to_opportunities__1",
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
			boardId: "1549619087",
			boardName: "Sales Activities",
			limit,
			filters: {}
		};

		if (search) metadata.filters.search = search;
		if (activity_status !== undefined) metadata.filters.status = activity_status;
		if (activity_type !== undefined) metadata.filters.type = activity_type;
		if (activity_date) metadata.filters.date = activity_date;
		if (activity_owner) metadata.filters.owner = activity_owner;
		if (accountId) metadata.filters.accountId = accountId;
		if (contactId) metadata.filters.contactId = contactId;
		if (opportunityId) metadata.filters.opportunityId = opportunityId;

		return JSON.stringify(
			createListResponse(
				"getSalesActivities",
				formattedItems,
				metadata,
				{
					summary: `Found ${formattedItems.length} sales activit${formattedItems.length !== 1 ? 'ies' : 'y'}`
				}
			),
			null,
			2
		);
	} catch (error) {
		console.error("Error fetching SalesActivities items:", error);
		throw error;
	}
}
