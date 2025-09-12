import {
	type MondayColumnValueResponse,
	type MondayItemResponse,
	mondayApi,
} from "../../monday/client.js";
import { getDynamicColumns } from "../dynamic-columns.js";
import { createListResponse } from "../json-output.js";
export async function getStrategies() {

	// Fetch dynamic columns from Columns board
	const BOARD_ID = "1637264041";
	const dynamicColumns = await getDynamicColumns(BOARD_ID);

	const query = `
    query {
      boards(ids: [1637264041]) {
        id
        name
        items_page(limit: 500) {
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
                id
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
					const fieldName = column.id;
					
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
		};

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
