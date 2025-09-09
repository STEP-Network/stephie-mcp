import {
	type MondayColumnValueResponse,
	type MondayItemResponse,
	mondayApi,
} from "../../monday/client.js";
import { getDynamicColumns } from "../dynamic-columns.js";
import { createListResponse } from "../json-output.js";

export async function getTasksAdOps(
	params: {
		limit?: number;
		search?: string;
		person?: string; // Owner
		status_mkkwc3ez?: number; // Status (numeric index)
		label_mkkwem4d?: number; // Type (numeric index)
		color_mknxxz44?: number; // Priority (numeric index)
		date__1?: string; // Due Date (YYYY-MM-DD)
		keyResultId?: string; // Filter by linked key result (use OKR subitems to find IDs)
		publisherId?: string; // Filter by publisher (use getAllPublishers to find IDs)
	} = {},
) {
	const {
		limit = 10,
		search,
		person,
		status_mkkwc3ez,
		label_mkkwem4d,
		color_mknxxz44,
		date__1,
		keyResultId,
		publisherId,
	} = params;

	// Fetch dynamic columns from Columns board
	const BOARD_ID = "1717613454";
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
	if (label_mkkwem4d !== undefined)
		filters.push({
			column_id: "label_mkkwem4d",
			compare_value: [label_mkkwem4d],
			operator: "any_of",
		});
	if (color_mknxxz44 !== undefined)
		filters.push({
			column_id: "color_mknxxz44",
			compare_value: [color_mknxxz44],
			operator: "any_of",
		});
	if (date__1)
		filters.push({
			column_id: "date__1",
			compare_value: date__1,
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
      boards(ids: [1717613454]) {
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
		if (keyResultId) {
			items = items.filter((item: Record<string, unknown>) => {
				const relationCol = (item as MondayItemResponse).column_values.find(
					(c: Record<string, unknown>) => c.id === "board_relation_mkpjy03a",
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

		if (publisherId) {
			items = items.filter((item: Record<string, unknown>) => {
				const relationCol = (item as MondayItemResponse).column_values.find(
					(c: Record<string, unknown>) => c.id === "connect_boards_mkkxdfax",
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
					} else if (column.column?.type === 'board-relation') {
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
			boardId: "1549618667",
			boardName: "Tasks - AdOps",
			limit,
			filters: {}
		};

		if (search) metadata.filters.search = search;
		if (person) metadata.filters.owner = person;
		if (label_mkkwem4d !== undefined) metadata.filters.type = label_mkkwem4d;
		if (color_mknxxz44 !== undefined) metadata.filters.priority = color_mknxxz44;
		if (status_mkkwc3ez !== undefined) metadata.filters.status = status_mkkwc3ez;
		if (date__1) metadata.filters.timeline = date__1;
		if (keyResultId) metadata.filters.keyResultId = keyResultId;
		if (publisherId) metadata.filters.publisherId = publisherId;

		return JSON.stringify(
			createListResponse(
				"getTasksAdOps",
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
		console.error("Error fetching TasksAdOps items:", error);
		throw error;
	}
}
