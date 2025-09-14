import { type MondayItemResponse, mondayApi } from "../../monday/client.js";
import { createListResponse } from "../json-output.js";

const CUSTOM_TARGETING_BOARD_ID = "2056578615";

// Column IDs
const COLUMNS = {
	GAM_ID: "text_mkszrqah", // GAM ID
	KEY_RELATION: "board_relation_mksz4q6f", // Link to parent key
	KEY_NAME_LOOKUP: "lookup_mktfm91a", // Lookup for key name
};

export interface TargetingValue {
	mondayItemId: string;
	name: string;
	valueGamId: string;
	keyMondayId: string;
	keyName: string;
}

export async function getTargetingValues(args: {
	keyName: string;
	names?: string;
	cursor?: string;
	limit?: number;
}) {
	const { keyName, names, cursor, limit = 100 } = args;

	console.error(`[getTargetingValues] Fetching values for key: ${keyName}, names: ${names}`);

	try {
		// Build filters - search by key name in board relation column
		const filters: Array<Record<string, unknown>> = [
			{
				column_id: COLUMNS.KEY_RELATION,
				compare_value: keyName,
				operator: "contains_text"
			}
		];

		// Add name search if provided
		if (names) {
			const nameTerms = names.split(',').map(n => n.trim());
			for (const term of nameTerms) {
				filters.push({
					column_id: "name",
					compare_value: term,
					operator: "contains_text"
				});
			}
		}

		// Build query with filters
		const queryParams = `
			query_params: {
				rules: [${filters.map(f => `
					{
						column_id: "${f.column_id}",
						compare_value: ${Array.isArray(f.compare_value) ? `[${f.compare_value}]` : typeof f.compare_value === "string" ? `"${f.compare_value}"` : f.compare_value},
						operator: ${f.operator}
					}
				`).join(',')}]
				${filters.length > 1 ? ', operator: and' : ''}
			}
		`;

		// Support cursor for pagination
		const cursorParam = cursor ? `, cursor: "${cursor}"` : '';

		const query = `
			query {
				boards(ids: [${CUSTOM_TARGETING_BOARD_ID}]) {
					id
					name
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
		`;

		const response = await mondayApi(query);

		if (!response.data?.boards || response.data.boards.length === 0) {
			return JSON.stringify(
				{
					tool: "getTargetingValues",
					timestamp: new Date().toISOString(),
					status: "success",
					data: [],
					metadata: {
						boardId: CUSTOM_TARGETING_BOARD_ID,
						boardName: "Custom Targeting",
						totalValues: 0,
						keyName,
						names: names || undefined
					},
					options: {
						summary: `No targeting values found for key "${keyName}"`
					}
				},
				null,
				2
			);
		}

		const board = response.data.boards[0];
		const items = board.items_page?.items || [];
		const nextCursor = board.items_page?.cursor;
		const targetingValues: TargetingValue[] = [];

		// Process values
		for (const item of items) {
			const mondayItem = item as MondayItemResponse;
			const columnValues = mondayItem.column_values || [];
			const columnMap = new Map(
				columnValues.map((col: Record<string, unknown>) => [col.id, col])
			);

			const valueGamId = (columnMap.get(COLUMNS.GAM_ID) as any)?.text || "";
			
			// Get parent key info
			const keyRelation = columnMap.get(COLUMNS.KEY_RELATION) as any;
			const linkedKey = keyRelation?.linked_items?.[0];
			const keyId = linkedKey?.id || "";
			const keyNameFromRelation = linkedKey?.name || "";
			
			// Get key name from lookup (might have more details)
			const keyNameLookup = columnMap.get(COLUMNS.KEY_NAME_LOOKUP) as any;
			const keyName = keyNameLookup?.display_value || keyNameLookup?.text || keyNameFromRelation;

			targetingValues.push({
				mondayItemId: String(mondayItem.id),
				name: String(mondayItem.name),
				valueGamId: valueGamId,
				keyMondayId: String(keyId),
				keyName: keyName
			});
		}

		// Sort by name
		targetingValues.sort((a, b) => a.name.localeCompare(b.name));

		// Build metadata
		const metadata = {
			boardId: CUSTOM_TARGETING_BOARD_ID,
			boardName: "Custom Targeting",
			totalValues: targetingValues.length,
			keyName,
			names: names || undefined,
			cursor: cursor || undefined,
			nextCursor: nextCursor || undefined,
			hasMore: !!nextCursor
		};

		// Return formatted response
		return JSON.stringify(
			{
				tool: "getTargetingValues",
				timestamp: new Date().toISOString(),
				status: "success",
				data: targetingValues,
				metadata,
				options: {
					summary: `Found ${targetingValues.length} targeting ${targetingValues.length === 1 ? 'value' : 'values'} for key "${keyName}"${names ? ` matching "${names}"` : ''}${nextCursor ? ' (more available)' : ''}`
				}
			},
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

