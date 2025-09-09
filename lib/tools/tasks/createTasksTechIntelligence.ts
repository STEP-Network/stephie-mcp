import {
	type MondayColumnValueResponse,
	type MondayItemResponse,
	mondayApi,
} from "../../monday/client.js";
import { createSuccessResponse } from "../json-output.js";

interface TaskParams {
	name: string;
	board_relation_mkpjqgpv?: string;
	board_relation_mkqhkyb7?: string;
	status_19__1?: number;
	type_1__1: number;
	priority_1__1: number;
	date__1?: string;
	date4?: string;
}

interface CreateTasksParams {
	tasks: TaskParams[];
}

interface FormattedItem {
	id: string;
	name: string;
	createdAt: string;
	fields: Record<string, unknown>;
}

export async function createTasksTechIntelligence(params: CreateTasksParams) {
	const { tasks } = params;

	if (!tasks || tasks.length === 0) {
		throw new Error("tasks array is required and must contain at least one task");
	}

	const BOARD_ID = "1631907569";
	const createdItems: FormattedItem[] = [];

	// Process each task individually
	for (const task of tasks) {
		if (!task.name) {
			throw new Error("name is required for each task");
		}

		if (task.type_1__1 === undefined) {
			throw new Error("type_1__1 is required for each task");
		}

		if (task.priority_1__1 === undefined) {
			throw new Error("priority_1__1 is required for each task");
		}

		const columnValues: Record<string, unknown> = {};

		if (task.status_19__1 !== undefined) {
			columnValues.status_19__1 = { index: task.status_19__1 };
		}

		if (task.type_1__1 !== undefined) {
			columnValues.type_1__1 = { index: task.type_1__1 };
		}

		if (task.priority_1__1 !== undefined) {
			columnValues.priority_1__1 = { index: task.priority_1__1 };
		}

		if (task.date__1 !== undefined) {
			columnValues.date__1 = { date: task.date__1 };
		}

		if (task.date4 !== undefined) {
			columnValues.date4 = { date: task.date4 };
		}

		if (task.board_relation_mkpjqgpv !== undefined) {
			columnValues.board_relation_mkpjqgpv = { item_ids: [task.board_relation_mkpjqgpv] };
		}

		if (task.board_relation_mkqhkyb7 !== undefined) {
			columnValues.board_relation_mkqhkyb7 = { item_ids: [task.board_relation_mkqhkyb7] };
		}

		const columnValuesParam =
			Object.keys(columnValues).length > 0
				? `, column_values: ${JSON.stringify(JSON.stringify(columnValues))}`
				: "";

		const mutation = `
			mutation {
				create_item(
					board_id: ${BOARD_ID},
					item_name: "${task.name.replace(/"/g, '\\"')}"${columnValuesParam}
				) {
					id
					name
					created_at
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
			const createdItem = response.data?.create_item as MondayItemResponse;

			if (!createdItem) {
				throw new Error(`Failed to create task: ${task.name}`);
			}

			// Format the created item for JSON response
			const formattedItem: FormattedItem = {
				id: createdItem.id,
				name: createdItem.name,
				createdAt: createdItem.created_at as string,
				fields: {}
			};

			// Process column values
			createdItem.column_values.forEach(
				(col: MondayColumnValueResponse) => {
					const fieldName = col.column?.title?.toLowerCase().replace(/\s+/g, '_') || col.id;
					
					if (col.column?.type === 'status' || col.column?.type === 'dropdown') {
						const parsedValue = col.value ? JSON.parse(col.value) : null;
						formattedItem.fields[fieldName] = {
							index: parsedValue?.index,
							label: col.text || null
						};
					} else if (col.column?.type === 'board_relation') {
						const parsedValue = col.value ? JSON.parse(col.value) : null;
						formattedItem.fields[fieldName] = parsedValue?.linkedItemIds || [];
					} else if (col.text) {
						formattedItem.fields[fieldName] = col.text;
					}
				},
			);

			createdItems.push(formattedItem);
		} catch (error) {
			console.error(`Error creating task "${task.name}":`, error);
			throw new Error(`Failed to create task "${task.name}": ${error}`);
		}
	}

	const metadata = {
		boardId: BOARD_ID,
		boardName: "Tech Intelligence Tasks",
		action: "create_batch",
		tasksCreated: createdItems.length,
		parameters: params
	};

	return JSON.stringify(
		createSuccessResponse(
			"createTasksTechIntelligence",
			"created",
			{
				tasks: createdItems,
				count: createdItems.length,
				message: `Successfully created ${createdItems.length} Tech Intelligence task${createdItems.length !== 1 ? 's' : ''}`
			},
			metadata
		),
		null,
		2
	);
}