import { type MondayItemResponse, mondayApi } from "../../monday/client.js";
import { createListResponse } from "../json-output.js";

const CUSTOM_TARGETING_BOARD_ID = "2056578615";

// Column IDs
const COLUMNS = {
	GAM_ID: "text_mkszrqah", // GAM ID
	KEY_RELATION: "board_relation_mksz4q6f", // Link to parent key
	KEY_NAME_LOOKUP: "lookup_mktfm91a", // Lookup for key name
	GROUP_ID: "group_mkszxeqs", // Group to filter by
};

export interface TargetingValue {
	mondayItemId: string;
	name: string;
	valueGamId: string;
}

export async function getTargetingValues(args: {
	keyName: string;
	names?: string[];
	cursor?: string;
	limit?: number;
}) {
	const { keyName, names, cursor, limit = 100 } = args;

	console.error(`[getTargetingValues] Fetching values for key: ${keyName}, names: ${names?.join(', ')}`);

	try {
		// Build filters - search by key name in board relation column
		const filters: Array<Record<string, unknown>> = [
			{
				column_id: COLUMNS.KEY_RELATION,
				compare_value: keyName,
				operator: "contains_text"
			}
		];

		// Add name search if provided - use any_of for array of names
		if (names && names.length > 0) {
			filters.push({
				column_id: "name",
				compare_value: names,
				operator: "any_of"
			});
		}

		// Build query with filters
		const queryParams = `
			query_params: {
				rules: [${filters.map(f => `
					{
						column_id: "${f.column_id}",
						compare_value: ${Array.isArray(f.compare_value) ? `[${f.compare_value.map(v => `"${v.replace(/"/g, '\\"')}"`).join(',')}]` : `"${f.compare_value.replace(/"/g, '\\"')}"`},
						operator: ${f.operator}
					}
				`).join(',')}]
				operator: and
			}
		`;

		// Support cursor for pagination
		const cursorParam = cursor ? `, cursor: "${cursor}"` : '';

		// Query for values in the specific group with filters
		const query = `
			query {
				boards(ids: [${CUSTOM_TARGETING_BOARD_ID}]) {
					id
					name
					groups(ids: ["${COLUMNS.GROUP_ID}"]) {
						id
						title
						items_page(
							limit: ${limit}
							${queryParams}
							${cursorParam}
						) {
							cursor
							items {
								id
								name
								column_values {
									id
									text
									value
									... on BoardRelationValue {
										linked_items {
											id
											name
										}
									}
									... on MirrorValue {
										display_value
									}
								}
							}
						}
					}
				}
			}
		`;

		const response = await mondayApi(query);

		if (!response.data?.boards || response.data.boards.length === 0 ||
			!response.data.boards[0].groups || response.data.boards[0].groups.length === 0) {
			return JSON.stringify(
				createListResponse(
					"getTargetingValues",
					[],
					{
						boardId: CUSTOM_TARGETING_BOARD_ID,
						boardName: "Custom Targeting",
						keyMondayId: "",
						keyName: keyName,
						keyGamId: "",
						totalValues: 0,
						searchKeyName: keyName,
						names: names || undefined
					},
					{
						summary: `No targeting values found for key "${keyName}"`
					}
				),
				null,
				2
			);
		}

		const board = response.data.boards[0];
		const group = board.groups[0];
		const items = group.items_page?.items || [];
		const nextCursor = group.items_page?.cursor;
		const targetingValues: TargetingValue[] = [];
		
		// Extract key info from first item (all items should have same key)
		let keyMondayId = "";
		let actualKeyName = "";
		let keyGamId = "";
		
		if (items.length > 0) {
			const firstItem = items[0] as MondayItemResponse;
			const firstColumnValues = firstItem.column_values || [];
			const firstColumnMap = new Map(
				firstColumnValues.map((col: Record<string, unknown>) => [col.id, col])
			);
			
			// Get parent key info from first item
			const keyRelation = firstColumnMap.get(COLUMNS.KEY_RELATION) as any;
			const linkedKey = keyRelation?.linked_items?.[0];
			keyMondayId = String(linkedKey?.id || "");
			actualKeyName = linkedKey?.name || "";
			
			// Get key GAM ID from the lookup column
			const keyNameLookup = firstColumnMap.get(COLUMNS.KEY_NAME_LOOKUP) as any;
			keyGamId = keyNameLookup?.display_value || keyNameLookup?.text || "";
		}

		// Process values (already filtered by GraphQL query)
		for (const item of items) {
			const mondayItem = item as MondayItemResponse;
			const columnValues = mondayItem.column_values || [];
			const columnMap = new Map(
				columnValues.map((col: Record<string, unknown>) => [col.id, col])
			);

			const valueGamId = (columnMap.get(COLUMNS.GAM_ID) as any)?.text || "";

			targetingValues.push({
				mondayItemId: String(mondayItem.id),
				name: String(mondayItem.name),
				valueGamId: valueGamId
			});
		}

		// Sort by name
		targetingValues.sort((a, b) => a.name.localeCompare(b.name));

		// Build metadata with key info at the top
		const metadata = {
			boardId: CUSTOM_TARGETING_BOARD_ID,
			boardName: "Custom Targeting",
			keyMondayId: keyMondayId,
			keyName: actualKeyName || keyName,
			keyGamId: keyGamId,
			totalValues: targetingValues.length,
			searchKeyName: keyName,
			names: names || undefined,
			cursor: cursor || undefined,
			nextCursor: nextCursor || undefined,
			hasMore: !!nextCursor
		};

		// Return formatted response
		return JSON.stringify(
			createListResponse(
				"getTargetingValues",
				targetingValues,
				metadata,
				{
					summary: `Found ${targetingValues.length} targeting ${targetingValues.length === 1 ? 'value' : 'values'} for key "${actualKeyName || keyName}"${names ? ` matching "${names}"` : ''}${nextCursor ? ' (more available)' : ''}`
				}
			),
			null,
			2
		);
	} catch (error) {
		console.error("Error fetching targeting values:", error);
		throw new Error(
			`Failed to fetch targeting values: ${error instanceof Error ? error.message : "Unknown error"}`
		);
	}
}

