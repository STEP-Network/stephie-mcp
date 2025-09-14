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
		// Build filters - prioritize name search for better performance
		const filters: string[] = [];
		
		if (names && names.length > 0) {
			// Filter by names first (better performance)
			names.forEach(name => {
				filters.push(`{
					column_id: "name",
					compare_value: "${name.replace(/"/g, '\\"')}",
					operator: contains_text
				}`);
			});
		} else {
			// No names provided, just filter by key
			filters.push(`{
				column_id: "${COLUMNS.KEY_RELATION}",
				compare_value: "${keyName.replace(/"/g, '\\"')}",
				operator: contains_text
			}`);
		}

		// Build query with filters
		const queryParams = `
			query_params: {
				rules: [${filters.join(',')}]
				${filters.length > 1 ? ', operator: or' : ''}
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
		const nextCursor = (group.items_page as any)?.cursor;
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

		// Process values - post-filter to check both name and key relationship
		for (const item of items) {
			const mondayItem = item as MondayItemResponse;
			const columnValues = mondayItem.column_values || [];
			const columnMap = new Map(
				columnValues.map((col: Record<string, unknown>) => [col.id, col])
			);
			
			// When names are provided, we need to post-process to check key relationship
			if (names && names.length > 0) {
				// Check if item belongs to the specified key
				const itemKeyRelation = columnMap.get(COLUMNS.KEY_RELATION) as any;
				const linkedKey = itemKeyRelation?.linked_items?.[0];
				const itemKeyName = linkedKey?.name || "";
				
				// Skip if item doesn't belong to the specified key
				if (!itemKeyName.toLowerCase().includes(keyName.toLowerCase()) && 
					!keyName.toLowerCase().includes(itemKeyName.toLowerCase())) {
					continue;
				}
				
				// Also check if item name matches any of the search names
				const itemName = String(mondayItem.name).toLowerCase();
				const matchesAnyName = names.some(name => 
					itemName.includes(name.toLowerCase())
				);
				if (!matchesAnyName) {
					continue; // Skip items that don't match any name
				}
			}

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
					summary: `Found ${targetingValues.length} targeting ${targetingValues.length === 1 ? 'value' : 'values'} for key "${actualKeyName || keyName}"${names && names.length > 0 ? ` matching ${names.length === 1 ? `"${names[0]}"` : `${names.length} search terms`}` : ''}${nextCursor ? ' (more available)' : ''}`
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

