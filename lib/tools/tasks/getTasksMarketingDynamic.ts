import {
	type MondayColumnValueResponse,
	type MondayItemResponse,
	mondayApi,
} from "../../monday/client.js";
import { getDynamicColumns } from "../dynamic-columns.js";
import { createListResponse } from "../json-output.js";
/**
 * Dynamic version of getTasksMarketing that fetches columns from Columns board
 * This eliminates hardcoded column arrays and automatically adapts to column changes
 */
export async function getTasksMarketingDynamic(
	params: {
		limit?: number;
		search?: string;
		person?: string; // Owner
		status_1__1?: number; // Type (numeric index)
		color_mkpwc7hm?: number; // Priority (numeric index)
		status_mkkw7ehb?: number; // Status (numeric index)
		publish_date_mkn21n6b?: string; // Publish Date (YYYY-MM-DD)
		keyResultId?: string; // Filter by linked key result
		budgetId?: string; // Filter by linked budget
	} = {},
) {
	const {
		limit = 10,
		search,
		person,
		status_1__1,
		color_mkpwc7hm,
		status_mkkw7ehb,
		publish_date_mkn21n6b,
		keyResultId,
		budgetId,
	} = params;

	const BOARD_ID = "1693359113";
	const BOARD_NAME = "Tasks - Marketing";

	// Fetch dynamic columns from Columns board
	const dynamicColumns = await getDynamicColumns(BOARD_ID);

	console.error(
		`Using ${dynamicColumns.length} dynamic columns for ${BOARD_NAME}`,
	);

	// Build filters
	const filters: Array<Record<string, unknown>> = [];
	if (search) {
		filters.push({
			column_id: "name",
			compare_value: search,
			operator: "contains_text",
		});
	}
	if (person)
		filters.push({
			column_id: "person",
			compare_value: person,
			operator: "contains_text",
		});
	if (status_1__1 !== undefined)
		filters.push({
			column_id: "status_1__1",
			compare_value: [status_1__1],
			operator: "any_of",
		});
	if (color_mkpwc7hm !== undefined)
		filters.push({
			column_id: "color_mkpwc7hm",
			compare_value: [color_mkpwc7hm],
			operator: "any_of",
		});
	if (status_mkkw7ehb !== undefined)
		filters.push({
			column_id: "status_mkkw7ehb",
			compare_value: [status_mkkw7ehb],
			operator: "any_of",
		});
	if (publish_date_mkn21n6b)
		filters.push({
			column_id: "publish_date_mkn21n6b",
			compare_value: publish_date_mkn21n6b,
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

	// Build column IDs string for GraphQL query
	const columnIds = dynamicColumns.map((id) => `"${id}"`).join(", ");

	const query = `
    query {
      boards(ids: [${BOARD_ID}]) {
        id
        name
        items_page(limit: ${limit}${queryParams}) {
          items {
            id
            name
            created_at
            updated_at
            column_values(ids: [${columnIds}]) {
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

		// Apply board relation filters (if these columns exist in dynamic columns)
		if (keyResultId && dynamicColumns.includes("board_relation_mkpjg0ky")) {
			items = items.filter((item: Record<string, unknown>) => {
				const relationCol = (item as MondayItemResponse).column_values.find(
					(c: Record<string, unknown>) => c.id === "board_relation_mkpjg0ky",
				);
				if (relationCol?.value) {
					try {
						const linked = JSON.parse(relationCol.value);
						return linked?.linkedItemIds?.includes(keyResultId);
					} catch {
						return false;
					}
				}
				return false;
			});
		}

		if (budgetId && dynamicColumns.includes("budgets_mkn2xpkt")) {
			items = items.filter((item: Record<string, unknown>) => {
				const relationCol = (item as MondayItemResponse).column_values.find(
					(c: Record<string, unknown>) => c.id === "budgets_mkn2xpkt",
				);
				if (relationCol?.value) {
					try {
						const linked = JSON.parse(relationCol.value);
						return linked?.linkedItemIds?.includes(budgetId);
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
					if (column.column?.type === 'status' || column.column?.type === 'dropdown' || column.column?.type === 'color') {
						const parsedValue = column.value ? JSON.parse(column.value) : null;
						formatted[fieldName] = {
							index: parsedValue?.index,
							label: column.text || null,
							type: column.column?.type
						};
					} else if (column.column?.type === 'board_relation' || column.column?.type === 'link_to_board') {
						const parsedValue = column.value ? JSON.parse(column.value) : null;
						formatted[fieldName] = parsedValue?.linkedItemIds || [];
					} else if (column.column?.type === 'multiple-person') {
						const parsedValue = column.value ? JSON.parse(column.value) : null;
						formatted[fieldName] = parsedValue?.personsAndTeams || [];
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
			boardName: board.name || BOARD_NAME,
			limit,
			dynamicColumns: dynamicColumns.length,
			filters: {}
		};

		if (search) metadata.filters.search = search;
		if (person) metadata.filters.owner = person;
		if (status_1__1 !== undefined) metadata.filters.type = status_1__1;
		if (color_mkpwc7hm !== undefined) metadata.filters.priority = color_mkpwc7hm;
		if (status_mkkw7ehb !== undefined) metadata.filters.status = status_mkkw7ehb;
		if (publish_date_mkn21n6b) metadata.filters.publishDate = publish_date_mkn21n6b;
		if (keyResultId) metadata.filters.keyResultId = keyResultId;
		if (budgetId) metadata.filters.budgetId = budgetId;

		return JSON.stringify(
			createListResponse(
				"getTasksMarketingDynamic",
				formattedItems,
				metadata,
				{
					summary: `Found ${formattedItems.length} task${formattedItems.length !== 1 ? 's' : ''} (${dynamicColumns.length} dynamic columns)`
				}
			),
			null,
			2
		);
	} catch (error) {
		console.error("Error fetching TasksMarketing items:", error);
		throw error;
	}
}
