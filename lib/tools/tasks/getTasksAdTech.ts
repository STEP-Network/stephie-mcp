import {
	type MondayColumnValueResponse,
	type MondayItemResponse,
	mondayApi,
} from "../../monday/client.js";
import { getDynamicColumns } from "../dynamic-columns.js";
import { createListResponse } from "../json-output.js";

export async function getTasksAdTech(
	params: {
		limit?: number;
		search?: string;
		person?: string; // Owner
		status_mkkwpmh6?: number; // Status (numeric index)
		release_status__1?: number; // Release status (numeric index)
		priority__1?: number; // Priority (numeric index)
		date8__1?: string; // Follow up Date (YYYY-MM-DD)
	} = {},
) {
	const {
		limit = 10,
		search,
		person,
		status_mkkwpmh6,
		release_status__1,
		priority__1,
		date8__1,
	} = params;

	// Fetch dynamic columns from Columns board
	const BOARD_ID = "1635251745";
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
	if (status_mkkwpmh6 !== undefined)
		filters.push({
			column_id: "status_mkkwpmh6",
			compare_value: [status_mkkwpmh6],
			operator: "any_of",
		});
	if (release_status__1 !== undefined)
		filters.push({
			column_id: "release_status__1",
			compare_value: [release_status__1],
			operator: "any_of",
		});
	if (priority__1 !== undefined)
		filters.push({
			column_id: "priority__1",
			compare_value: [priority__1],
			operator: "any_of",
		});
	if (date8__1)
		filters.push({
			column_id: "date8__1",
			compare_value: date8__1,
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
      boards(ids: [1635251745]) {
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
			boardId: "1549618799",
			boardName: "Tasks - AdTech",
			limit,
			filters: {}
		};

		if (search) metadata.filters.search = search;
		if (person) metadata.filters.owner = person;
		if (release_status__1) metadata.filters.type = release_status__1;
		if (priority__1) metadata.filters.priority = priority__1;
		if (status_mkkwpmh6 !== undefined) metadata.filters.status = status_mkkwpmh6;		return JSON.stringify(
			createListResponse(
				"getTasksAdTech",
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
		console.error("Error fetching TasksAdTech items:", error);
		throw error;
	}
}
