import {
	type MondayColumnValueResponse,
	type MondayItemResponse,
	mondayApi,
} from "../../monday/client.js";
import { createSuccessResponse } from "../json-output.js";

// Enum mappings
const statusMapping: Record<string, number> = {
	"In Review": 0,
	"Done": 1,
	"Rejected": 2,
	"Planned": 3,
	"In Progress": 4,
	"Missing Status": 5,
	"Waiting On Others": 6,
	"New": 7,
	"On Hold": 8
};

const typeMapping: Record<string, number> = {
	"Support": 1,
	"Maintenance": 3,
	"Development": 4,
	"Not Labelled": 5,
	"Bugfix": 6,
	"Documentation": 7,
	"Meeting": 12,
	"Test": 13
};

const priorityMapping: Record<string, number> = {
	"Medium": 0,
	"Minimal": 1,
	"Low": 2,
	"Critical": 3,
	"High": 4,
	"Not Prioritized": 5,
	"Unknown": 6
};

interface TaskParams {
	name: string;
	keyResultId?: string;
	stephieFeatureId?: string;
	status?: string;
	type: string;
	priority: string;
	dueDate?: string;
	followUpDate?: string;
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
	console.log('[createTasksTechIntelligence] Starting with params:', JSON.stringify(params, null, 2));
	
	const { tasks } = params;

	if (!tasks || tasks.length === 0) {
		console.log('[createTasksTechIntelligence] Error: No tasks provided');
		throw new Error("tasks array is required and must contain at least one task");
	}

	console.log('[createTasksTechIntelligence] Processing', tasks.length, 'tasks');

	const BOARD_ID = "1631907569";
	const createdItems: FormattedItem[] = [];

	// Process each task individually
	for (const task of tasks) {
		console.log('[createTasksTechIntelligence] Processing task:', JSON.stringify(task, null, 2));
		
		if (!task.name) {
			console.log('[createTasksTechIntelligence] Error: Missing name for task');
			throw new Error("name is required for each task");
		}

		if (!task.type) {
			console.log('[createTasksTechIntelligence] Error: Missing type for task:', task.name);
			throw new Error("type is required for each task");
		}

		if (!(task.type in typeMapping)) {
			console.log('[createTasksTechIntelligence] Error: Invalid type for task:', task.name, 'Got:', task.type);
			throw new Error(`Invalid type: ${task.type}. Valid types: ${Object.keys(typeMapping).join(', ')}`);
		}

		if (!task.priority) {
			console.log('[createTasksTechIntelligence] Error: Missing priority for task:', task.name);
			throw new Error("priority is required for each task");
		}

		if (!(task.priority in priorityMapping)) {
			console.log('[createTasksTechIntelligence] Error: Invalid priority for task:', task.name, 'Got:', task.priority);
			throw new Error(`Invalid priority: ${task.priority}. Valid priorities: ${Object.keys(priorityMapping).join(', ')}`);
		}

		console.log('[createTasksTechIntelligence] Task validation passed for:', task.name);

		const columnValues: Record<string, unknown> = {};

		if (task.status && task.status in statusMapping) {
			columnValues.status_19__1 = { index: statusMapping[task.status] };
		}

		if (task.type && task.type in typeMapping) {
			columnValues.type_1__1 = { index: typeMapping[task.type] };
		}

		if (task.priority && task.priority in priorityMapping) {
			columnValues.priority_1__1 = { index: priorityMapping[task.priority] };
		}

		if (task.dueDate !== undefined) {
			columnValues.date__1 = { date: task.dueDate };
		}

		if (task.followUpDate !== undefined) {
			columnValues.date4 = { date: task.followUpDate };
		}

		if (task.keyResultId !== undefined) {
			columnValues.board_relation_mkpjqgpv = { item_ids: [task.keyResultId] };
		}

		if (task.stephieFeatureId !== undefined) {
			columnValues.board_relation_mkqhkyb7 = { item_ids: [task.stephieFeatureId] };
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
			console.log('[createTasksTechIntelligence] Sending mutation to Monday API for task:', task.name);
			console.log('[createTasksTechIntelligence] Mutation:', mutation);
			
			const response = await mondayApi(mutation);
			console.log('[createTasksTechIntelligence] Received response from Monday API for task:', task.name);
			
			const createdItem = response.data?.create_item as MondayItemResponse;

			if (!createdItem) {
				console.log('[createTasksTechIntelligence] Error: No created item returned for task:', task.name);
				throw new Error(`Failed to create task: ${task.name}`);
			}

			console.log('[createTasksTechIntelligence] Successfully created item:', createdItem.id, 'for task:', task.name);

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
			console.error(`[createTasksTechIntelligence] Error creating task "${task.name}":`, error);
			throw new Error(`Failed to create task "${task.name}": ${error}`);
		}
	}

	console.log('[createTasksTechIntelligence] Successfully created all tasks, returning response');

	const metadata = {
		boardId: BOARD_ID,
		boardName: "Tech Intelligence Tasks",
		action: "create_batch",
		tasksCreated: createdItems.length,
		parameters: params
	};

	const result = JSON.stringify(
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
	
	console.log('[createTasksTechIntelligence] Final result length:', result.length);
	return result;
}