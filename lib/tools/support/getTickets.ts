import {
	type MondayColumnValueResponse,
	type MondayItemResponse,
	mondayApi,
} from "../../monday/client.js";
import { getDynamicColumns } from "../dynamic-columns.js";
import { createListResponse } from "../json-output.js";

export async function getTickets(
	params: {
		limit?: number;
		search?: string;
		status95?: number; // Status (numeric index)
		priority?: number; // Priority (numeric index)
		request_type?: number; // Request Type (numeric index)
		date?: string; // Creation Date (YYYY-MM-DD)
		date5?: string; // Last Customer Response Date (YYYY-MM-DD)
		date7?: string; // Created Date (YYYY-MM-DD)
		date4?: string; // Resolved Date (YYYY-MM-DD)
		multiple_person?: string; // Assigned person
		contactId?: string; // Filter by linked contact (use getContacts to find IDs)
		assignedId?: string; // Filter by assigned person (use getPeople to find IDs)
		publisherId?: string; // Filter by publisher (use getAllPublishers to find IDs)
	} = {},
) {
	const {
		limit = 10,
		search,
		status95,
		priority,
		request_type,
		date,
		date5,
		date7,
		date4,
		multiple_person,
		contactId,
		assignedId,
		publisherId,
	} = params;

	// Fetch dynamic columns from Columns board
	const BOARD_ID = "1647372207";
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
	if (status95 !== undefined)
		filters.push({
			column_id: "status95",
			compare_value: [status95],
			operator: "any_of",
		});
	if (priority !== undefined)
		filters.push({
			column_id: "priority",
			compare_value: [priority],
			operator: "any_of",
		});
	if (request_type !== undefined)
		filters.push({
			column_id: "request_type",
			compare_value: [request_type],
			operator: "any_of",
		});
	if (date)
		filters.push({
			column_id: "date",
			compare_value: date,
			operator: "contains_text",
		});
	if (date5)
		filters.push({
			column_id: "date5",
			compare_value: date5,
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
      boards(ids: [1647372207]) {
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
		if (contactId) {
			items = items.filter((item: Record<string, unknown>) => {
				const relationCol = (item as MondayItemResponse).column_values.find(
					(c: Record<string, unknown>) => c.id === "connect_boards8__1",
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

		if (assignedId) {
			items = items.filter((item: Record<string, unknown>) => {
				const relationCol = (item as MondayItemResponse).column_values.find(
					(c: Record<string, unknown>) => c.id === "connect_boards__1",
				);
				if (relationCol?.value) {
					try {
						const linked = JSON.parse(relationCol.value);
						return linked?.linkedItemIds?.includes(assignedId);
					} catch {
						return false;
					}
				}
				return false;
			});
		}

		if (publisherId) {
			items = items.filter((item: Record<string, unknown>) => {
				const relationCol = (item as MondayItemResponse).column_values.find(
					(c: Record<string, unknown>) => c.id === "connect_boards08__1",
				);
				if (relationCol?.value) {
					try {
						const linked = JSON.parse(relationCol.value);
						return linked?.linkedItemIds?.includes(publisherId);
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
				id: (item as MondayItemResponse).id,
				name: (item as MondayItemResponse).name,
				createdAt: (item as MondayItemResponse).created_at,
				updatedAt: (item as MondayItemResponse).updated_at,
			};

			// Process column values
			(item as MondayItemResponse).column_values.forEach(
				(col: Record<string, unknown>) => {
					const column = col as MondayColumnValueResponse;
					const fieldName = column.column?.title?.toLowerCase().replace(/\s+/g, '_') || column.id;
					
					// Parse different column types
					if (column.column?.type === 'status' || column.column?.type === 'dropdown') {
						const parsedValue = column.value ? JSON.parse(column.value) : null;
						formatted[fieldName] = {
							index: parsedValue?.index,
							label: column.text || null
						};
					} else if (column.column?.type === 'board-relation' || column.column?.type === 'board_relation') {
						const parsedValue = column.value ? JSON.parse(column.value) : null;
						formatted[fieldName] = parsedValue?.linkedItemIds || [];
					} else if (column.column?.type === 'multiple-person' || column.column?.type === 'person') {
						const parsedValue = column.value ? JSON.parse(column.value) : null;
						if (column.column?.type === 'person') {
							formatted[fieldName] = parsedValue?.id || column.text || null;
						} else {
							formatted[fieldName] = parsedValue?.personsAndTeams || [];
						}
					} else if (column.column?.type === 'date') {
						const parsedValue = column.value ? JSON.parse(column.value) : null;
						formatted[fieldName] = parsedValue?.date || column.text || null;
					} else {
						formatted[fieldName] = column.text || null;
					}
				},
			);

			return formatted;
		});

		// Build metadata
		const metadata: Record<string, any> = {
			boardId: BOARD_ID,
			boardName: "Tickets",
			limit,
			dynamicColumns: dynamicColumns.length,
			filters: {}
		};

		if (search) metadata.filters.search = search;
		if (status95 !== undefined) metadata.filters.status = status95;
		if (multiple_person !== undefined) metadata.filters.assignee = multiple_person;
		if (date7) metadata.filters.createdDate = date7;
		if (date4) metadata.filters.resolvedDate = date4;
		if (contactId) metadata.filters.contactId = contactId;
		if (assignedId) metadata.filters.assignedId = assignedId;
		if (publisherId) metadata.filters.publisherId = publisherId;

		return JSON.stringify(
			createListResponse(
				"getTickets",
				formattedItems,
				metadata,
				{
					summary: `Found ${formattedItems.length} ticket${formattedItems.length !== 1 ? 's' : ''} (${dynamicColumns.length} dynamic columns)`
				}
			),
			null,
			2
		);
	} catch (error) {
		console.error("Error fetching Tickets items:", error);
		throw error;
	}
}
