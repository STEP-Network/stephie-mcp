import {
	type MondayColumnValueResponse,
	type MondayItemResponse,
	mondayApi,
} from "../../monday/client.js";
import { getDynamicColumns } from "../dynamic-columns.js";
import { createListResponse, createSuccessResponse, createErrorResponse } from "../json-output.js";
export async function getOpportunities(
	params: {
		limit?: number;
		search?: string;
		deal_stage?: number; // Stage (numeric index)
		date1?: string; // *Current stage start date (YYYY-MM-DD)
		deal_creation_date?: string; // *Deal Creation Date (YYYY-MM-DD)
		deal_expected_close_date?: string; // *Expected Close Date (YYYY-MM-DD)
		deal_close_date?: string; // *Actual Close Date (YYYY-MM-DD)
		accountId?: string; // Filter by linked account (use getAccounts to find IDs)
		contactId?: string; // Filter by linked contact (use getContacts to find IDs)
		bookingId?: string; // Filter by linked booking (use getBookings to find IDs)
	} = {},
) {
	const {
		limit = 10,
		search,
		deal_stage,
		date1,
		deal_creation_date,
		deal_expected_close_date,
		deal_close_date,
		accountId,
		contactId,
		bookingId,
	} = params;

	// Fetch dynamic columns from Columns board
	const BOARD_ID = "1402911049";
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
	if (deal_stage !== undefined)
		filters.push({
			column_id: "deal_stage",
			compare_value: [deal_stage],
			operator: "any_of",
		});
	if (date1)
		filters.push({
			column_id: "date1",
			compare_value: date1,
			operator: "contains_text",
		});
	if (deal_creation_date)
		filters.push({
			column_id: "deal_creation_date",
			compare_value: deal_creation_date,
			operator: "contains_text",
		});
	if (deal_expected_close_date)
		filters.push({
			column_id: "deal_expected_close_date",
			compare_value: deal_expected_close_date,
			operator: "contains_text",
		});
	if (deal_close_date)
		filters.push({
			column_id: "deal_close_date",
			compare_value: deal_close_date,
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
      boards(ids: [1402911049]) {
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
		if (accountId) {
			items = items.filter((item: Record<string, unknown>) => {
				const relationCol = (item as MondayItemResponse).column_values.find(
					(c: Record<string, unknown>) => c.id === "connect_boards31",
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
					(c: Record<string, unknown>) => c.id === "deal_contact",
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

		if (bookingId) {
			items = items.filter((item: Record<string, unknown>) => {
				const relationCol = (item as MondayItemResponse).column_values.find(
					(c: Record<string, unknown>) => c.id === "connect_boards8__1",
				);
				if (relationCol?.value) {
					try {
						const linked = JSON.parse(relationCol.value);
						return linked?.linkedItemIds?.includes(bookingId);
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
			boardId: "1402911049",
			boardName: "Opportunities",
			limit,
			filters: {}
		};

		if (search) metadata.filters.search = search;
		if (deal_stage !== undefined) metadata.filters.stage = deal_stage;
		if (date1) metadata.filters.currentStageStartDate = date1;
		if (deal_creation_date) metadata.filters.creationDate = deal_creation_date;
		if (deal_expected_close_date) metadata.filters.expectedCloseDate = deal_expected_close_date;
		if (deal_close_date) metadata.filters.actualCloseDate = deal_close_date;
		if (accountId) metadata.filters.accountId = accountId;
		if (contactId) metadata.filters.contactId = contactId;
		if (bookingId) metadata.filters.bookingId = bookingId;

		return JSON.stringify(
			createListResponse(
				"getOpportunities",
				formattedItems,
				metadata,
				{
					summary: `Found ${formattedItems.length} opportunit${formattedItems.length !== 1 ? 'ies' : 'y'}`
				}
			),
			null,
			2
		);
	} catch (error) {
		console.error("Error fetching Opportunities items:", error);
		throw error;
	}
}
