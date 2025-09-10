import {
	type MondayColumnValueResponse,
	type MondayItemResponse,
	mondayApi,
} from "../../monday/client.js";
import { getDynamicColumns } from "../dynamic-columns.js";
import { createListResponse } from "../json-output.js";
export async function getTasksTechIntelligence(
	params: {
		limit?: number;
		keyResultId?: string; // Filter by linked key result (use OKR subitems tool to find IDs)
		stephieFeatureId?: string; // Filter by linked STEPhie feature (use getStephieFeatures tool to find IDs)
		search?: string;
		status?: string[]; // Status enum array
		statusOperator?: "any_of" | "not_any_of"; // Status operator
		type?: string[]; // Type enum array  
		typeOperator?: "any_of" | "not_any_of"; // Type operator
		priority?: string[]; // Priority enum array
		priorityOperator?: "any_of" | "not_any_of"; // Priority operator
		dueDate?: string; // Due Date (YYYY-MM-DD)
		dueDateOperator?: "any_of" | "not_any_of" | "greater_than" | "lower_than"; // Due Date operator
		followUpDate?: string; // Follow Up Date (YYYY-MM-DD)
		followUpDateOperator?: "any_of" | "not_any_of" | "greater_than" | "lower_than"; // Follow Up Date operator
		createdDate?: string; // Created Date (YYYY-MM-DD)
		createdDateOperator?: "any_of" | "not_any_of" | "greater_than" | "lower_than"; // Created Date operator
		startedDate?: string; // Started Date (YYYY-MM-DD)
		startedDateOperator?: "any_of" | "not_any_of" | "greater_than" | "lower_than"; // Started Date operator
		doneDate?: string; // Done Date (YYYY-MM-DD)
		doneDateOperator?: "any_of" | "not_any_of" | "greater_than" | "lower_than"; // Done Date operator
	} = {},
): Promise<string> {
	const {
		limit = 10,
		keyResultId,				// Key Result ID (OKR Subitem ID)
		stephieFeatureId,			// STEPhie Feature ID
		search,
		status,
		statusOperator = "any_of",
		type,
		typeOperator = "any_of",
		priority,
		priorityOperator = "any_of",
		dueDate,					// Due Date
		dueDateOperator = "any_of",  // Default operator
		followUpDate,				// Follow Up Date
		followUpDateOperator = "any_of",   // Default operator
		createdDate,				// Created Date
		createdDateOperator = "any_of", // Default operator
		startedDate,				// Started Date
		startedDateOperator = "any_of", // Default operator
		doneDate,					// Done Date
		doneDateOperator = "any_of", // Default operator
	} = params;

	// Fetch dynamic columns from Columns board
	const BOARD_ID = "1631907569";
	const dynamicColumns = await getDynamicColumns(BOARD_ID);

	// Enum mappings for status, type, and priority
	const statusMapping = {
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

	const typeMapping = {
		"Support": 1,
		"Maintenance": 3,
		"Development": 4,
		"Not Labelled": 5,
		"Bugfix": 6,
		"Documentation": 7,
		"Meeting": 12,
		"Test": 13
	};

	const priorityMapping = {
		"Medium": 0,
		"Minimal": 1,
		"Low": 2,
		"Critical": 3,
		"High": 4,
		"Not Prioritized": 5,
		"Unknown": 6
	};

	// Helper function to convert enum names to indices
	const mapEnumsToIndices = (enumArray: string[] | undefined, mapping: Record<string, number>): number[] => {
		if (!enumArray || enumArray.length === 0) return [];
		return enumArray.map(name => mapping[name]).filter(index => index !== undefined);
	};

	// Helper function to add date filters
	const addDateFilter = (
		columnId: string, 
		value: string | undefined, 
		operator: string
	) => {
		if (!value) return;
		
		// For greater_than and lower_than, value should be a single date string
		// For any_of and not_any_of, value should be wrapped in array
		const compareValue = (operator === "greater_than" || operator === "lower_than") 
			? value 
			: [value];
			
		filters.push({
			column_id: columnId,
			compare_value: compareValue,
			operator: operator,
		});
	};

	// Build filters
	const filters: Array<Record<string, unknown>> = [];
	if (search) {
		filters.push({
			column_id: "name",
			compare_value: search,
			operator: "contains_text",
		});
	}
	
	// Status filtering with enum support
	if (status && status.length > 0) {
		const statusIndices = mapEnumsToIndices(status, statusMapping);
		if (statusIndices.length > 0) {
			filters.push({
				column_id: "status_19__1",
				compare_value: statusIndices,
				operator: statusOperator,
			});
		}
	}
	
	// Type filtering with enum support  
	if (type && type.length > 0) {
		const typeIndices = mapEnumsToIndices(type, typeMapping);
		if (typeIndices.length > 0) {
			filters.push({
				column_id: "type_1__1",
				compare_value: typeIndices,
				operator: typeOperator,
			});
		}
	}
	
	// Priority filtering with enum support
	if (priority && priority.length > 0) {
		const priorityIndices = mapEnumsToIndices(priority, priorityMapping);
		if (priorityIndices.length > 0) {
			filters.push({
				column_id: "priority_1__1",
				compare_value: priorityIndices,
				operator: priorityOperator,
			});
		}
	}
	
	// Date filters with operators
	addDateFilter("date__1", dueDate, dueDateOperator);
	addDateFilter("date4", followUpDate, followUpDateOperator);
	addDateFilter("date4__1", createdDate, createdDateOperator);
	addDateFilter("date3__1", startedDate, startedDateOperator);
	addDateFilter("date7__1", doneDate, doneDateOperator);
	
	if (keyResultId)
		filters.push({
			column_id: "board_relation_mkpjqgpv",
			compare_value: [keyResultId],
			operator: "any_of",
		});
	if (stephieFeatureId)
		filters.push({
			column_id: "board_relation_mkqhkyb7",
			compare_value: [stephieFeatureId],
			operator: "any_of",
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
      boards(ids: [1631907569]) {
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
			const formatted: Record<string, unknown> = {
				id: item.id,
				name: item.name,
				createdAt: item.created_at,
				updatedAt: item.updated_at,
			};

			// Process column values
			(item as MondayItemResponse).column_values.forEach(
				(col: Record<string, unknown>) => {
					const column = col as MondayColumnValueResponse;
					let fieldName = column.column?.title?.toLowerCase().replace(/\s+/g, '_') || column.id;
					
					// Special handling for specific columns
					if (column.id === 'board_relation_mkpjqgpv') {
						fieldName = 'key_result';
					} else if (column.id === 'board_relation_mkqhkyb7') {
						fieldName = 'stephie_feature';
					}
					
					// Parse different column types
					if (column.column?.type === 'status' || column.column?.type === 'dropdown') {
						const parsedValue = column.value ? JSON.parse(column.value) : null;
						formatted[fieldName] = {
							index: parsedValue?.index,
							label: column.text || null
						};
					} else if (column.column?.type === 'board_relation') {
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
					} else {
						formatted[fieldName] = column.text || null;
					}
				},
			);

			return formatted;
		});

		// Build metadata
		const metadata: Record<string, unknown> = {
			boardId: "2186669074",
			boardName: "Tasks - Tech & Intelligence",
			limit,
			filters: {} as Record<string, unknown>
		};

		if (search) (metadata.filters as Record<string, unknown>).search = search;
		if (type) (metadata.filters as Record<string, unknown>).type = type;
		if (priority) (metadata.filters as Record<string, unknown>).priority = priority;
		if (status) (metadata.filters as Record<string, unknown>).status = status;
		if (keyResultId) (metadata.filters as Record<string, unknown>).keyResultId = keyResultId;
		if (stephieFeatureId) (metadata.filters as Record<string, unknown>).stephieFeatureId = stephieFeatureId;

		return JSON.stringify(
			createListResponse(
				"getTasksTechIntelligence",
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
		console.error("Error fetching TasksTechIntelligence items:", error);
		throw error;
	}
}
