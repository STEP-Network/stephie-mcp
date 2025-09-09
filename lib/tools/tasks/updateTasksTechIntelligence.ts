import { mondayApi } from "../../monday/client.js";

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

interface TaskUpdateParams {
    itemId: string;
    name?: string;
    keyResultId?: string;
    stephieFeatureId?: string;
    status?: string;
    type?: string;
    priority?: string;
    dueDate?: string;
    followUpDate?: string;
    createdDate?: string;
    startedDate?: string;
    doneDate?: string;
    delete?: boolean;
}

interface BatchUpdateParams {
    tasks: TaskUpdateParams[];
}

interface FormattedResult {
    id: string;
    action: 'updated' | 'deleted';
    name?: string;
    fields?: Record<string, unknown>;
}

export async function updateTasksTechIntelligence(params: BatchUpdateParams) {
    const { tasks } = params;

    if (!tasks || tasks.length === 0) {
        throw new Error("tasks array is required and must contain at least one task");
    }

    const BOARD_ID = "1631907569";
    const results: FormattedResult[] = [];

    // Process each task individually
    for (const task of tasks) {
        if (!task.itemId) {
            throw new Error("itemId is required for each task");
        }

        // Handle delete case
        if (task.delete === true) {
            const archiveMutation = `
                mutation {
                    archive_item(item_id: ${task.itemId}) {
                        id
                    }
                }
            `;

            try {
                const response = await mondayApi(archiveMutation);
                const archivedItem = response.data?.archive_item as { id: string };

                if (!archivedItem) {
                    throw new Error(`Failed to delete task with ID: ${task.itemId}`);
                }

                results.push({
                    id: archivedItem.id,
                    action: 'deleted'
                });
            } catch (error) {
                console.error(`Error deleting task ${task.itemId}:`, error);
                throw new Error(`Failed to delete task ${task.itemId}: ${error}`);
            }
            continue;
        }

        // Handle regular update case
        const { itemId, delete: _, ...updates } = task;

        // Build column values for this task
        const columnValues: Record<string, unknown> = {};

        if (updates.name !== undefined) {
            columnValues.name = updates.name;
        }

        if (updates.status && updates.status in statusMapping) {
            columnValues.status_19__1 = { index: statusMapping[updates.status] };
        }

        if (updates.type && updates.type in typeMapping) {
            columnValues.type_1__1 = { index: typeMapping[updates.type] };
        }

        if (updates.priority && updates.priority in priorityMapping) {
            columnValues.priority_1__1 = { index: priorityMapping[updates.priority] };
        }

        if (updates.dueDate !== undefined) {
            columnValues.date__1 = { date: updates.dueDate };
        }

        if (updates.followUpDate !== undefined) {
            columnValues.date4 = { date: updates.followUpDate };
        }

        if (updates.createdDate !== undefined) {
            columnValues.date4__1 = { date: updates.createdDate };
        }

        if (updates.startedDate !== undefined) {
            columnValues.date3__1 = { date: updates.startedDate };
        }

        if (updates.doneDate !== undefined) {
            columnValues.date7__1 = { date: updates.doneDate };
        }

        if (updates.keyResultId !== undefined) {
            columnValues.board_relation_mkpjqgpv = { item_ids: [updates.keyResultId] };
        }

        if (updates.stephieFeatureId !== undefined) {
            columnValues.board_relation_mkqhkyb7 = { item_ids: [updates.stephieFeatureId] };
        }

        // Only update if there are actual changes
        if (Object.keys(columnValues).length === 0) {
            continue;
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
                    column_values {
                        id
                        value
                        text
                    }
                }
            }
        `;

        try {
            const response = await mondayApi(mutation);
            const updatedItem = response.data?.change_multiple_column_values as {
                id: string;
                name: string;
                column_values: Array<{ id: string; value: string; text: string }>;
            };

            if (!updatedItem) {
                throw new Error(`Failed to update task with ID: ${itemId}`);
            }

            // Format the response consistently
            const formattedResult: FormattedResult = {
                id: updatedItem.id,
                action: 'updated',
                name: updatedItem.name,
                fields: {}
            };

            // Process column values to include in response
            for (const columnValue of updatedItem.column_values) {
                if (columnValue.value && columnValue.value !== '{}') {
                    try {
                        const parsedValue = JSON.parse(columnValue.value);
                        if (formattedResult.fields) {
                            formattedResult.fields[columnValue.id] = parsedValue;
                        }
                    } catch {
                        if (formattedResult.fields) {
                            formattedResult.fields[columnValue.id] = columnValue.text || columnValue.value;
                        }
                    }
                }
            }

            results.push(formattedResult);
        } catch (error) {
            console.error(`Error updating task ${itemId}:`, error);
            throw new Error(`Failed to update task ${itemId}: ${error}`);
        }
    }

    return JSON.stringify({
        updated: results.filter(r => r.action === 'updated'),
        deleted: results.filter(r => r.action === 'deleted'),
        total_processed: results.length
    }, null, 2);
}
