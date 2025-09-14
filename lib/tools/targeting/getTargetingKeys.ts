import { type MondayItemResponse, mondayApi } from "../../monday/client.js";
import { createListResponse } from "../json-output.js";

const CUSTOM_TARGETING_BOARD_ID = "2056578615";

// Column IDs
const COLUMNS = {
	GAM_ID: "text_mkszrqah", // GAM ID
	CODE: "text_mksypb8d", // Key code
	TYPE: "color_mksy2gg4", // Key Type
	KEY_RELATION: "board_relation_mksz4q6f", // Empty for keys
	PUBLISHER_RELATION: "board_relation_mkt2ygj6", // Publisher associations
	GROUP_ID: "group_mksw7hns", // Group to filter by
};

export interface TargetingKey {
	mondayItemId: string;
	name: string;
	keyGamId: string;
	keyCode: string;
	keyType: string;
	publishers: string; // "RON" if 100+, distinct names if <100, empty if none
}

export async function getTargetingKeys() {
	console.error("[getTargetingKeys] Fetching all targeting keys");

	try {
		// Query for keys in the specific group with filters
		const query = `
			query {
				boards(ids: [${CUSTOM_TARGETING_BOARD_ID}]) {
					id
					name
					groups(ids: ["${COLUMNS.GROUP_ID}"]) {
						id
						title
						items_page(
							limit: 250
							query_params: {
								rules: [
									{
										column_id: "${COLUMNS.KEY_RELATION}",
										compare_value: [],
										operator: is_empty
									},
									{
										column_id: "${COLUMNS.PUBLISHER_RELATION}",
										compare_value: [],
										operator: is_not_empty
									},
									{
										column_id: "${COLUMNS.GAM_ID}",
										compare_value: [],
										operator: is_not_empty
									}
								]
								operator: and
							}
						) {
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
					"getTargetingKeys",
					[],
					{
						boardId: CUSTOM_TARGETING_BOARD_ID,
						boardName: "Custom Targeting",
						totalKeys: 0,
						totalPublishers: 0,
						publishers: []
					},
					{ summary: "No targeting keys found" }
				),
				null,
				2
			);
		}

		const items = response.data.boards[0].groups[0].items_page?.items || [];
		const targetingKeys: TargetingKey[] = [];

		// Process keys (already filtered by GraphQL query)
		for (const item of items) {
			const mondayItem = item as MondayItemResponse & { group?: { id: string } };
			
			const columnValues = mondayItem.column_values || [];
			const columnMap = new Map(
				columnValues.map((col: Record<string, unknown>) => [col.id, col])
			);

			const gamId = (columnMap.get(COLUMNS.GAM_ID) as any)?.text || "";
			const keyCode = (columnMap.get(COLUMNS.CODE) as any)?.text || "";
			const typeValue = (columnMap.get(COLUMNS.TYPE) as any)?.text || "";
			
			// Get publisher relation
			const publisherRelation = columnMap.get(COLUMNS.PUBLISHER_RELATION) as any;
			const linkedPublishers = publisherRelation?.linked_items || [];
			
			// Determine publisher display
			let publisherDisplay = "";
			if (linkedPublishers.length >= 100) {
				publisherDisplay = "RON";
			} else if (linkedPublishers.length > 0) {
				// Get distinct publisher group names
				const publisherNames = linkedPublishers.map((p: any) => {
					// Extract publisher group from name if it follows pattern "Group - Publisher"
					const parts = p.name.split(' - ');
					return parts.length > 1 ? parts[0].trim() : p.name;
				});
				const uniqueNames = [...new Set(publisherNames)];
				publisherDisplay = uniqueNames.slice(0, 5).join(", ");
				if (uniqueNames.length > 5) {
					publisherDisplay += ` (+${uniqueNames.length - 5} more)`;
				}
			}

			targetingKeys.push({
				mondayItemId: String(mondayItem.id),
				name: String(mondayItem.name),
				keyGamId: gamId,
				keyCode,
				keyType: typeValue,
				publishers: publisherDisplay
			});
		}

		// Sort by name
		targetingKeys.sort((a, b) => a.name.localeCompare(b.name));

		// Group by publisher/publisher group for better organization
		const keysByPublisher = new Map<string, TargetingKey[]>();
		
		for (const key of targetingKeys) {
			const publisher = key.publishers || "No Publisher Assignment";
			if (!keysByPublisher.has(publisher)) {
				keysByPublisher.set(publisher, []);
			}
			keysByPublisher.get(publisher)?.push(key);
		}

		// Sort groups: RON first, then alphabetically, "No Publisher Assignment" last
		const sortedPublishers = Array.from(keysByPublisher.entries())
			.sort(([a], [b]) => {
				if (a === "RON") return -1;
				if (b === "RON") return 1;
				if (a === "No Publisher Assignment") return 1;
				if (b === "No Publisher Assignment") return -1;
				return a.localeCompare(b);
			});

		// Convert to hierarchical structure
		const publishers = sortedPublishers.map(([publisher, keys]) => ({
			publisher,
			keyCount: keys.length,
			keys: keys.sort((a, b) => a.name.localeCompare(b.name))
		}));

		// Build metadata
		const metadata = {
			boardId: CUSTOM_TARGETING_BOARD_ID,
			boardName: "Custom Targeting",
			totalKeys: targetingKeys.length,
			totalPublishers: keysByPublisher.size,
			publishers: sortedPublishers.map(([publisher]) => publisher)
		};

		// Return formatted response
		return JSON.stringify(
			createListResponse(
				"getTargetingKeys",
				publishers,
				metadata,
				{
					summary: `Found ${targetingKeys.length} targeting ${targetingKeys.length === 1 ? 'key' : 'keys'} across ${keysByPublisher.size} publisher ${keysByPublisher.size === 1 ? 'group' : 'groups'}`
				}
			),
			null,
			2
		);
	} catch (error) {
		console.error("Error fetching targeting keys:", error);
		throw new Error(
			`Failed to fetch targeting keys: ${error instanceof Error ? error.message : "Unknown error"}`
		);
	}
}