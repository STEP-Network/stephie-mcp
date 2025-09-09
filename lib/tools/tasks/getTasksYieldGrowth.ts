import {
	type MondayColumnValueResponse,
	type MondayItemResponse,
	mondayApi,
} from "../../monday/client.js";
import { getDynamicColumns } from "../dynamic-columns.js";
import { createListResponse } from "../json-output.js";
export async function getTasksYieldGrowth(
	params: {
		limit?: number;
		search?: string;
		person?: string; // Owner
		status_mkkwc3ez?: number; // Status (numeric index)
		date__1?: string; // Due Date (YYYY-MM-DD)
		date4?: string; // Follow up Date (YYYY-MM-DD)
		date3__1?: string; // Started Date (YYYY-MM-DD)
	} = {},
) {
	const {
		limit = 10,
		search,
		person,
		status_mkkwc3ez,
		date__1,
		date4,
		date3__1,
	} = params;

	// Fetch dynamic columns from Columns board
	const BOARD_ID = "1762038452";
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
	if (person)
		filters.push({
			column_id: "person",
			compare_value: person,
			operator: "contains_text",
		});
	if (status_mkkwc3ez !== undefined)
		filters.push({
			column_id: "status_mkkwc3ez",
			compare_value: [status_mkkwc3ez],
			operator: "any_of",
		});
	if (date__1)
		filters.push({
			column_id: "date__1",
			compare_value: date__1,
			operator: "contains_text",
		});
	if (date4)
		filters.push({
			column_id: "date4",
			compare_value: date4,
			operator: "contains_text",
		});
	if (date3__1)
		filters.push({
			column_id: "date3__1",
			compare_value: date3__1,
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
      boards(ids: [1762038452]) {
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
						const parsedValue = column.value ? JSON.parse(column.value) : null;
						formatted[fieldName] = {
							index: parsedValue?.index,
							label: column.text || null
						};
					} else if (column.column?.type === 'board_relation') {
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
			boardId: "1762038452",
			boardName: "Tasks - Yield & Growth",
			limit,
			filters: {}
		};

		if (search) metadata.filters.search = search;
		if (person) metadata.filters.owner = person;
		if (status_mkkwc3ez !== undefined) metadata.filters.status = status_mkkwc3ez;
		if (date__1) metadata.filters.dueDate = date__1;
		if (date4) metadata.filters.followUpDate = date4;
		if (date3__1) metadata.filters.startedDate = date3__1;

		return JSON.stringify(
			createListResponse(
				"getTasksYieldGrowth",
				formattedItems,
				metadata,
				{
					summary: `Found ${formattedItems.length} task${formattedItems.length !== 1 ? 's' : ''}`
				}
			),
			null,
			2
		);
	} catch (error) {
		console.error("Error fetching TasksYieldGrowth items:", error);
		throw error;
	}
}
