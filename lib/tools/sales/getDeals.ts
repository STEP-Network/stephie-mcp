import {
	type MondayColumnValueResponse,
	type MondayItemResponse,
	mondayApi,
} from "../../monday/client.js";
import { getDynamicColumns } from "../dynamic-columns.js";
import { createListResponse, createSuccessResponse, createErrorResponse } from "../json-output.js";
export async function getDeals(
	params: {
		limit?: number;
		search?: string;
		color_mkqby95j?: number; // Status (numeric index)
		agencyId?: string; // Filter by agency account (use getAccounts to find IDs)
		advertiserId?: string; // Filter by advertiser account (use getAccounts to find IDs)
		contactsId?: string; // Filter by linked contacts (use getContacts to find IDs)
	} = {},
) {
	const {
		limit = 10,
		search,
		color_mkqby95j,
		agencyId,
		advertiserId,
		contactsId,
	} = params;

	// Fetch dynamic columns from Columns board
	const BOARD_ID = "1623368485";
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
	if (color_mkqby95j !== undefined)
		filters.push({
			column_id: "color_mkqby95j",
			compare_value: [color_mkqby95j],
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
      boards(ids: [1623368485]) {
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
		if (agencyId) {
			items = items.filter((item: Record<string, unknown>) => {
				const relationCol = (item as MondayItemResponse).column_values.find(
					(c: Record<string, unknown>) => c.id === "connect_boards_mkmjpjjc",
				);
				if (relationCol?.value) {
					try {
						const linked = JSON.parse(relationCol.value);
						return linked?.linkedItemIds?.includes(agencyId);
					} catch {
						return false;
					}
				}
				return false;
			});
		}

		if (advertiserId) {
			items = items.filter((item: Record<string, unknown>) => {
				const relationCol = (item as MondayItemResponse).column_values.find(
					(c: Record<string, unknown>) => c.id === "connect_boards_mkmjr3e3",
				);
				if (relationCol?.value) {
					try {
						const linked = JSON.parse(relationCol.value);
						return linked?.linkedItemIds?.includes(advertiserId);
					} catch {
						return false;
					}
				}
				return false;
			});
		}

		if (contactsId) {
			items = items.filter((item: Record<string, unknown>) => {
				const relationCol = (item as MondayItemResponse).column_values.find(
					(c: Record<string, unknown>) => c.id === "connect_boards3__1",
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
			boardId: "1623368485",
			boardName: "Deals",
			limit,
			filters: {}
		};

		if (search) metadata.filters.search = search;
		if (color_mkqby95j !== undefined) metadata.filters.status = color_mkqby95j;
		if (agencyId) metadata.filters.agencyId = agencyId;
		if (advertiserId) metadata.filters.advertiserId = advertiserId;
		if (contactsId) metadata.filters.contactsId = contactsId;

		return JSON.stringify(
			createListResponse(
				"getDeals",
				formattedItems,
				metadata,
				{
					summary: `Found ${formattedItems.length} deal${formattedItems.length !== 1 ? 's' : ''}`
				}
			),
			null,
			2
		);
	} catch (error) {
		console.error("Error fetching Deals items:", error);
		throw error;
	}
}
