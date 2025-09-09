import {
	type MondayColumnValueResponse,
	type MondayItemResponse,
	mondayApi,
} from "../../monday/client.js";
import { getDynamicColumns } from "../dynamic-columns.js";
import { createListResponse, createSuccessResponse, createErrorResponse } from "../json-output.js";
export async function getMarketingBudgets(
	params: {
		limit?: number;
		search?: string;
		date_mkn42vh4?: string; // Date (YYYY-MM-DD)
		type_mkn4rg75?: number; // Type (numeric index)
	} = {},
) {
	const { limit = 10, search, date_mkn42vh4, type_mkn4rg75 } = params;

	// Fetch dynamic columns from Columns board
	const BOARD_ID = "1677240056";
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
	if (date_mkn42vh4)
		filters.push({
			column_id: "date_mkn42vh4",
			compare_value: date_mkn42vh4,
			operator: "contains_text",
		});
	if (type_mkn4rg75 !== undefined)
		filters.push({
			column_id: "type_mkn4rg75",
			compare_value: [type_mkn4rg75],
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
      boards(ids: [1677240056]) {
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
			boardId: "1677240056",
			boardName: "Budgets",
			limit,
			filters: {}
		};

		if (search) metadata.filters.search = search;
		if (date_mkn42vh4) metadata.filters.date = date_mkn42vh4;
		if (type_mkn4rg75 !== undefined) metadata.filters.type = type_mkn4rg75;

		return JSON.stringify(
			createListResponse(
				"getMarketingBudgets",
				formattedItems,
				metadata,
				{
					summary: `Found ${formattedItems.length} budget${formattedItems.length !== 1 ? 's' : ''}`
				}
			),
			null,
			2
		);
	} catch (error) {
		console.error("Error fetching MarketingBudgets items:", error);
		throw error;
	}
}
