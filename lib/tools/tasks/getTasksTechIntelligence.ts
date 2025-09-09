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
		name?: string;
		status_19__1?: number; // Status (numeric index)
		type_1__1?: number; // Type (numeric index)
		priority_1__1?: number; // Priority (numeric index)
		date__1?: string; // Due Date (YYYY-MM-DD)
		date__1_operator?: "any_of" | "not_any_of" | "greater_than" | "lower_than"; // Due Date operator
		date4?: string; // Follow Up Date (YYYY-MM-DD)
		date4_operator?: "any_of" | "not_any_of" | "greater_than" | "lower_than"; // Follow Up Date operator
		date4__1?: string; // Created Date (YYYY-MM-DD)
		date4__1_operator?: "any_of" | "not_any_of" | "greater_than" | "lower_than"; // Created Date operator
		date3__1?: string; // Started Date (YYYY-MM-DD)
		date3__1_operator?: "any_of" | "not_any_of" | "greater_than" | "lower_than"; // Started Date operator
		date7__1?: string; // Done Date (YYYY-MM-DD)
		date7__1_operator?: "any_of" | "not_any_of" | "greater_than" | "lower_than"; // Done Date operator
		board_relation_mkpjqgpv?: string; // Filter by linked key result (use OKR subitems tool to find IDs)
		board_relation_mkqhkyb7?: string; // Filter by linked STEPhie features (use STEPhie Features tool to find IDs)
	} = {},
): Promise<string> {
	const {
		limit = 10,
		name,
		status_19__1,
		type_1__1,
		priority_1__1,
		date__1,					// Due Date
		date__1_operator = "any_of",  // Default operator
		date4,						// Follow Up Date
		date4_operator = "any_of",   // Default operator
		date4__1,					// Created Date
		date4__1_operator = "any_of", // Default operator
		date3__1,					// Started Date
		date3__1_operator = "any_of", // Default operator
		date7__1,					// Done Date
		date7__1_operator = "any_of", // Default operator
		board_relation_mkpjqgpv,	// Key Result ID (OKR Subitem ID)
		board_relation_mkqhkyb7,	// STEPhie Feature ID
	} = params;

	// Fetch dynamic columns from Columns board
	const BOARD_ID = "1631907569";
	const dynamicColumns = await getDynamicColumns(BOARD_ID);

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
	if (name) {
		filters.push({
			column_id: "name",
			compare_value: name,
			operator: "contains_text",
		});
	}
	if (status_19__1 !== undefined)
		filters.push({
			column_id: "status_19__1",
			compare_value: [status_19__1],
			operator: "any_of",
		});
	if (type_1__1 !== undefined)
		filters.push({
			column_id: "type_1__1",
			compare_value: [type_1__1],
			operator: "any_of",
		});
	if (priority_1__1 !== undefined)
		filters.push({
			column_id: "priority_1__1",
			compare_value: [priority_1__1],
			operator: "any_of",
		});
	
	// Date filters with operators
	addDateFilter("date__1", date__1, date__1_operator);
	addDateFilter("date4", date4, date4_operator);
	addDateFilter("date4__1", date4__1, date4__1_operator);
	addDateFilter("date3__1", date3__1, date3__1_operator);
	addDateFilter("date7__1", date7__1, date7__1_operator);
	
	if (board_relation_mkpjqgpv)
		filters.push({
			column_id: "board_relation_mkpjqgpv",
			compare_value: [board_relation_mkpjqgpv],
			operator: "any_of",
		});
	if (board_relation_mkqhkyb7)
		filters.push({
			column_id: "board_relation_mkqhkyb7",
			compare_value: [board_relation_mkqhkyb7],
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

		if (name) (metadata.filters as Record<string, unknown>).name = name;
		if (type_1__1) (metadata.filters as Record<string, unknown>).type = type_1__1;
		if (priority_1__1) (metadata.filters as Record<string, unknown>).priority = priority_1__1;
		if (status_19__1) (metadata.filters as Record<string, unknown>).status = status_19__1;
		if (board_relation_mkpjqgpv) (metadata.filters as Record<string, unknown>).keyResultId = board_relation_mkpjqgpv;
		if (board_relation_mkqhkyb7) (metadata.filters as Record<string, unknown>).stephieFeatureId = board_relation_mkqhkyb7;

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
