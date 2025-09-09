import {
	type MondayColumnValueResponse,
	type MondayItemResponse,
	mondayApi,
} from "../../monday/client.js";
import { getDynamicColumns } from "../dynamic-columns.js";
import { createListResponse, createSuccessResponse, createErrorResponse } from "../json-output.js";
export async function getBookings(
	params: {
		limit?: number;
		search?: string;
		status0__1?: number; // Status (numeric index)
		date?: string; // Midway date (YYYY-MM-DD)
		person?: string; // Owner
		status_3?: number; // Campaign status (numeric index)
		status2?: number; // Midway reporting (numeric index)
		opportunityId?: string; // Filter by linked opportunity (use getOpportunities to find IDs)
	} = {},
) {
	const {
		limit = 10,
		search,
		status0__1,
		date,
		person,
		status_3,
		status2,
		opportunityId,
	} = params;

	// Fetch dynamic columns from Columns board
	const BOARD_ID = "1549621337";
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
	if (status0__1 !== undefined)
		filters.push({
			column_id: "status0__1",
			compare_value: [status0__1],
			operator: "any_of",
		});
	if (date)
		filters.push({
			column_id: "date",
			compare_value: date,
			operator: "contains_text",
		});
	if (person)
		filters.push({
			column_id: "person",
			compare_value: person,
			operator: "contains_text",
		});
	if (status_3 !== undefined)
		filters.push({
			column_id: "status_3",
			compare_value: [status_3],
			operator: "any_of",
		});
	if (status2 !== undefined)
		filters.push({
			column_id: "status2",
			compare_value: [status2],
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
      boards(ids: [1549621337]) {
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
			boardId: "1549621337",
			boardName: "Bookings 3.0",
			limit,
			filters: {}
		};

		if (search) metadata.filters.search = search;
		if (status0__1 !== undefined) metadata.filters.status = status0__1;
		if (date) metadata.filters.midwayDate = date;
		if (person) metadata.filters.owner = person;
		if (status_3 !== undefined) metadata.filters.campaignStatus = status_3;
		if (status2 !== undefined) metadata.filters.midwayReporting = status2;
		if (opportunityId) metadata.filters.opportunityId = opportunityId;

		return JSON.stringify(
			createListResponse(
				"getBookings",
				formattedItems,
				metadata,
				{
					summary: `Found ${formattedItems.length} booking${formattedItems.length !== 1 ? 's' : ''}`
				}
			),
			null,
			2
		);
	} catch (error) {
		console.error("Error fetching Bookings items:", error);
		throw error;
	}
}
