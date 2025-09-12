import {
	type MondayColumnValueResponse,
	type MondayItemResponse,
	mondayApi,
} from "../../monday/client.js";
import { getDynamicColumns } from "../dynamic-columns.js";
import { createListResponse } from "../json-output.js";

export async function getPeople() {

	// Fetch dynamic columns from Columns board
	const BOARD_ID = "1612664689";
	const dynamicColumns = await getDynamicColumns(BOARD_ID);

	const query = `
    query {
      boards(ids: [1612664689]) {
        id
        name
        items_page(limit: 100) {
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

		let items = board.items_page?.items || [];

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
					if (column.column?.type === 'status' || column.column?.type === 'dropdown') {
						const parsedValue = column.value ? JSON.parse(column.value) : null;
						formatted[fieldName] = {
							index: parsedValue?.index,
							label: column.text || null
						};
					} else if (column.column?.type === 'board_relation' || column.column?.type === 'link-to-item') {
						// Use linked_items from GraphQL fragment if available, fallback to parsed value
						const columnWithLinkedItems = column as MondayColumnValueResponse & { linked_items?: Array<{ id: string; name: string }> };
						const linkedItems = columnWithLinkedItems.linked_items || [];
						if (linkedItems.length > 0) {
							formatted[fieldName] = linkedItems;
						} else {
							const parsedValue = column.value ? JSON.parse(column.value) : null;
							formatted[fieldName] = parsedValue?.linkedItemIds || [];
						}
					} else if (column.column?.type === 'multiple-person') {
						const parsedValue = column.value ? JSON.parse(column.value) : null;
						formatted[fieldName] = parsedValue?.personsAndTeams || [];
					} else if (column.column?.type === 'date') {
						const parsedValue = column.value ? JSON.parse(column.value) : null;
						formatted[fieldName] = parsedValue?.date || column.text || null;
					} else if (column.column?.type === 'email') {
						const parsedValue = column.value ? JSON.parse(column.value) : null;
						formatted[fieldName] = parsedValue?.email || column.text || null;
					} else if (column.column?.type === 'phone') {
						const parsedValue = column.value ? JSON.parse(column.value) : null;
						formatted[fieldName] = parsedValue?.phone || column.text || null;
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
			boardName: "People",
		};

		return JSON.stringify(
			createListResponse(
				"getPeople",
				formattedItems,
				metadata,
				{
					summary: `Found ${formattedItems.length} ${formattedItems.length === 1 ? 'person' : 'people'})`
				}
			),
			null,
			2
		);
	} catch (error) {
		console.error("Error fetching People items:", error);
		throw error;
	}
}
