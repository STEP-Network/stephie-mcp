import {
	type MondayColumnValueResponse,
	type MondayItemResponse,
	mondayApi,
} from "../../monday/client.js";
import { getDynamicColumns } from "../dynamic-columns.js";
import { createListResponse } from "../json-output.js";

export async function getFeatures(
	params: {
		limit?: number;
		search?: string;
		color_mkqn9n66?: number; // Priority (numeric index)
		color_mkqhya7m?: number; // Status (numeric index)
		multiple_person_mkqhq07m?: string; // Owner
		date_mkqhdjw7?: string; // Date Released (YYYY-MM-DD)
		date4?: string; // Date Added (YYYY-MM-DD)
	} = {},
) {
	const {
		limit = 10,
		search,
		color_mkqn9n66,
		color_mkqhya7m,
		multiple_person_mkqhq07m,
		date_mkqhdjw7,
		date4,
	} = params;

	// Fetch dynamic columns from Columns board
	const BOARD_ID = "1938986335";
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
	if (color_mkqn9n66 !== undefined)
		filters.push({
			column_id: "color_mkqn9n66",
			compare_value: [color_mkqn9n66],
			operator: "any_of",
		});
	if (color_mkqhya7m !== undefined)
		filters.push({
			column_id: "color_mkqhya7m",
			compare_value: [color_mkqhya7m],
			operator: "any_of",
		});
	if (multiple_person_mkqhq07m)
		filters.push({
			column_id: "multiple_person_mkqhq07m",
			compare_value: multiple_person_mkqhq07m,
			operator: "contains_text",
		});
	if (date_mkqhdjw7)
		filters.push({
			column_id: "date_mkqhdjw7",
			compare_value: date_mkqhdjw7,
			operator: "contains_text",
		});
	if (date4)
		filters.push({
			column_id: "date4",
			compare_value: date4,
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
      boards(ids: [1938986335]) {
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

		const items = board.items_page?.items || [];

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
					if (column.column?.type === 'status' || column.column?.type === 'dropdown' || column.column?.type === 'color') {
						const parsedValue = column.value ? JSON.parse(column.value) : null;
						formatted[fieldName] = {
							index: parsedValue?.index,
							label: column.text || null,
							type: column.column?.type
						};
					} else if (column.column?.type === 'board_relation') {
						const parsedValue = column.value ? JSON.parse(column.value) : null;
						formatted[fieldName] = parsedValue?.linkedItemIds || [];
					} else if (column.column?.type === 'multiple-person' || column.column?.type === 'multiple_person') {
						const parsedValue = column.value ? JSON.parse(column.value) : null;
						formatted[fieldName] = parsedValue?.personsAndTeams || [];
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
			boardName: "Features",
			limit,
			dynamicColumns: dynamicColumns.length,
			filters: {}
		};

		if (search) metadata.filters.search = search;
		if (color_mkqn9n66 !== undefined) metadata.filters.priority = color_mkqn9n66;
		if (color_mkqhya7m !== undefined) metadata.filters.status = color_mkqhya7m;
		if (multiple_person_mkqhq07m) metadata.filters.owner = multiple_person_mkqhq07m;
		if (date_mkqhdjw7) metadata.filters.dateReleased = date_mkqhdjw7;
		if (date4) metadata.filters.dateAdded = date4;

		return JSON.stringify(
			createListResponse(
				"getFeatures",
				formattedItems,
				metadata,
				{
					summary: `Found ${formattedItems.length} feature${formattedItems.length !== 1 ? 's' : ''} (${dynamicColumns.length} dynamic columns)`
				}
			),
			null,
			2
		);
	} catch (error) {
		console.error("Error fetching Features items:", error);
		throw error;
	}
}
