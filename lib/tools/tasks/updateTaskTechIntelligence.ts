import { mondayApi, type MondayItemResponse, type MondayColumnValueResponse } from "../../monday/client.js";
import { createSuccessResponse } from "../json-output.js";

interface UpdateParams {
	itemId: string;
	name?: string;
	board_relation_mkpjqgpv?: string;
	board_relation_mkqhkyb7?: string;
	status_19__1?: number;
	type_1__1?: number;
	priority_1__1?: number;
	date__1?: string;
	date4?: string;
	date4__1?: string;
	date3__1?: string;
	date7__1?: string;
}

export async function updateTaskTechIntelligence(params: UpdateParams) {
	const { itemId, ...updates } = params;

	if (!itemId) {
		throw new Error("itemId is required");
	}

	const BOARD_ID = "1631907569";
	const columnValues: Record<string, unknown> = {};

	if (updates.name !== undefined) {
		columnValues.name = updates.name;
	}

	if (updates.status_19__1 !== undefined) {
		columnValues.status_19__1 = { index: updates.status_19__1 };
	}

	if (updates.type_1__1 !== undefined) {
		columnValues.type_1__1 = { index: updates.type_1__1 };
	}

	if (updates.priority_1__1 !== undefined) {
		columnValues.priority_1__1 = { index: updates.priority_1__1 };
	}

	if (updates.date__1 !== undefined) {
		columnValues.date__1 = { date: updates.date__1 };
	}

	if (updates.date4 !== undefined) {
		columnValues.date4 = { date: updates.date4 };
	}

	if (updates.date4__1 !== undefined) {
		columnValues.date4__1 = { date: updates.date4__1 };
	}

	if (updates.date3__1 !== undefined) {
		columnValues.date3__1 = { date: updates.date3__1 };
	}

	if (updates.date7__1 !== undefined) {
		columnValues.date7__1 = { date: updates.date7__1 };
	}

	if (updates.board_relation_mkpjqgpv !== undefined) {
		columnValues.board_relation_mkpjqgpv = { item_ids: [updates.board_relation_mkpjqgpv] };
	}

	if (updates.board_relation_mkqhkyb7 !== undefined) {
		columnValues.board_relation_mkqhkyb7 = { item_ids: [updates.board_relation_mkqhkyb7] };
	}

	if (Object.keys(columnValues).length === 0) {
		throw new Error("No fields to update");
	}

	const mutation = `
    mutation {
      change_multiple_column_values(
        board_id: ${BOARD_ID},
        item_id: ${itemId},
        column_values: ${JSON.stringify(JSON.stringify(columnValues))}
      ) {
        id
        name
        updated_at
        column_values {
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
  `;

	try {
		const response = await mondayApi(mutation);
		const updatedItem = response.data?.change_multiple_column_values as MondayItemResponse;

		if (!updatedItem) {
			throw new Error("Failed to update item");
		}

		// Format the updated item for JSON response
		const formattedItem = {
			id: updatedItem.id,
			name: updatedItem.name,
			updatedAt: updatedItem.updated_at as string,
			updatedFields: {} as Record<string, unknown>
		};

		// Process column values to show what was updated
		(updatedItem.column_values || []).forEach(
			(col: MondayColumnValueResponse) => {
				const fieldName = col.column?.title?.toLowerCase().replace(/\s+/g, '_') || col.id;
				
				if (col.column?.type === 'status' || col.column?.type === 'dropdown') {
					const parsedValue = col.value ? JSON.parse(col.value) : null;
					formattedItem.updatedFields[fieldName] = {
						index: parsedValue?.index,
						label: col.text || null
					};
				} else if (col.column?.type === 'board_relation') {
					const parsedValue = col.value ? JSON.parse(col.value) : null;
					formattedItem.updatedFields[fieldName] = parsedValue?.linkedItemIds || [];
				} else if (col.text) {
					formattedItem.updatedFields[fieldName] = col.text;
				}
			},
		);

		const metadata = {
			boardId: BOARD_ID,
			boardName: "Tech Intelligence Tasks",
			action: "update",
			updatedColumns: Object.keys(columnValues),
			parameters: params
		};

		return JSON.stringify(
			createSuccessResponse(
				"updateTaskTechIntelligence",
				"updated",
				formattedItem,
				metadata
			),
			null,
			2
		);
	} catch (error) {
		console.error("Error updating TaskTechIntelligence item:", error);
		throw error;
	}
}
