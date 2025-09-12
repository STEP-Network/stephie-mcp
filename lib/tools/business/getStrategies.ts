import {
	type MondayColumnValueResponse,
	type MondayItemResponse,
	mondayApi,
} from "../../monday/client.js";
import { getDynamicColumns } from "../dynamic-columns.js";
import { createListResponse } from "../json-output.js";
export async function getStrategies(
	params: {
		limit?: number;
		search?: string;
		color_mkpkghqq?: number; // Status (numeric index)
		color_mknycf0d?: number; // AI Type (numeric index)
	} = {},
) {
	const { limit = 100, search, color_mkpkghqq, color_mknycf0d } = params;

	// Fetch dynamic columns from Columns board
	const BOARD_ID = "1637264041";
	const dynamicColumns = await getDynamicColumns(BOARD_ID);

	// Build filters
	const filters: Array<Record<string, unknown>> = [];
	
	// When used as a resource, filter out Done (1) and Rejected (2) statuses
	// This ensures we only get active/open strategies
	if (color_mkpkghqq === undefined) {
		// Default behavior: exclude Done and Rejected
		filters.push({
			column_id: "color_mkpkghqq",
			compare_value: [1, 2], // Done and Rejected indices
			operator: "not_any_of",
		});
	} else {
		// Explicit status filter provided
		filters.push({
			column_id: "color_mkpkghqq",
			compare_value: [color_mkpkghqq],
			operator: "any_of",
		});
	}
	
	if (search) {
		filters.push({
			column_id: "name",
			compare_value: search,
			operator: "contains_text",
		});
	}
	if (color_mknycf0d !== undefined)
		filters.push({
			column_id: "color_mknycf0d",
			compare_value: [color_mknycf0d],
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
      boards(ids: [1637264041]) {
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
			boardName: "Strategies",
			limit,
			dynamicColumns: dynamicColumns.length,
			filters: {}
		};

		if (search) metadata.filters.search = search;
		if (color_mkpkghqq !== undefined) metadata.filters.status = color_mkpkghqq;
		if (color_mknycf0d !== undefined) metadata.filters.aiType = color_mknycf0d;

		return JSON.stringify(
			createListResponse(
				"getStrategies",
				formattedItems,
				metadata,
				{
					summary: `Found ${formattedItems.length} ${formattedItems.length === 1 ? 'strategy' : 'strategies'} (${dynamicColumns.length} dynamic columns)`
				}
			),
			null,
			2
		);
	} catch (error) {
		console.error("Error fetching Strategies items:", error);
		throw error;
	}
}
