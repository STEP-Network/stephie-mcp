import { type MondayItemResponse, mondayApi } from "../../monday/client.js";
import { createListResponse } from "../json-output.js";

const AUDIENCE_SEGMENTS_BOARD_ID = "2051827669";

// Column mappings
const COLUMNS = {
	GAM_ID: "text_mkswpv48",
	TYPE: "color_mkswxjkj",
	DATA_PROVIDER: "text_mkswsafe",
	SEGMENT_SIZE: "numeric_mkt2vz5f",
	DESCRIPTION: "long_text_mkrhw7h0",
	PAGE_VIEWS: "numeric_mkt2kw4v",
	RECENCY_DAYS: "numeric_mkt2bvf1",
	MEMBERSHIP_EXPIRATION: "numeric_mkt2k6nb",
};

// Type mappings from status column
const TYPE_LABELS: Record<number, string> = {
	0: "Omniseg",
	1: "1st Party",
	19: "Contextual",
	107: "3rd Party",
};

export interface AudienceSegmentResult {
	itemId: string;
	gamId: string;
	name: string;
	type: string;
	size: number | null;
	description: string | null;
}

export async function getAudienceSegments(args: {
	names?: string[];
	type?: "1st Party" | "3rd Party" | "Omniseg" | "ALL";
	limit?: number;
}) {
	const { names, type = "ALL", limit = 100 } = args;

	console.error("[getAudienceSegments] called with:", {
		names,
		type,
		limit,
	});

	try {
		// Build filters based on type and names
		const filters: string[] = [];
		
		// Handle type filters at query level when names are not provided
		if (type !== "ALL" && (!names || names.length === 0)) {
			if (type === "1st Party") {
				filters.push(`{
					column_id: "${COLUMNS.TYPE}",
					compare_value: [1],
					operator: any_of
				}`);
			} else if (type === "3rd Party") {
				filters.push(`{
					column_id: "${COLUMNS.TYPE}",
					compare_value: [107],
					operator: any_of
				}`);
			} else if (type === "Omniseg") {
				// For Omniseg, search for "Omniseg -" in name
				filters.push(`{
					column_id: "name",
					compare_value: "Omniseg -",
					operator: contains_text
				}`);
			}
		}
		
		// Handle name search - search in both name and description
		if (names && names.length > 0) {
			const nameFilters = names.flatMap(name => [
				`{
					column_id: "name",
					compare_value: "${name.replace(/"/g, '\\"')}",
					operator: contains_text
				}`,
				`{
					column_id: "${COLUMNS.DESCRIPTION}",
					compare_value: "${name.replace(/"/g, '\\"')}",
					operator: contains_text
				}`
			]);
			
			// Wrap all name/description filters in OR
			if (nameFilters.length > 0) {
				filters.push(...nameFilters);
			}
		}

		// Build query with specific columns only
		let query = `
			query {
				boards(ids: ${AUDIENCE_SEGMENTS_BOARD_ID}) {
					items_page(limit: 500`;

		// Add filters if any
		if (filters.length > 0) {
			query += `, query_params: {
				rules: [${filters.join(",")}]
				operator: ${names && names.length > 0 ? "or" : "and"}
			}`;
		}

		query += `) {
						items {
							id
							name
							column_values(ids: ["${COLUMNS.DESCRIPTION}", "${COLUMNS.TYPE}", "${COLUMNS.GAM_ID}", "${COLUMNS.SEGMENT_SIZE}"]) {
								id
								text
								value
							}
						}
					}
				}
			}
		`;

		const response = await mondayApi(query);

		if (!response.data?.boards || response.data.boards.length === 0) {
			return JSON.stringify(
				createListResponse(
					"getAudienceSegments",
					[],
					{ 
						limit, 
						names: names || undefined, 
						type: type !== "ALL" ? type : undefined,
						total: 0 
					},
					{ summary: "No audience segments found" }
				),
				null,
				2
			);
		}

		const items = response.data.boards[0].items_page.items || [];
		const segments: AudienceSegmentResult[] = [];

		// Process segments
		for (const item of items) {
			const columnMap = new Map(
				(item as MondayItemResponse).column_values.map(
					(col: Record<string, unknown>) => [col.id, col],
				),
			);

			const gamId = (columnMap.get(COLUMNS.GAM_ID) as any)?.text || "";
			const description =
				(columnMap.get(COLUMNS.DESCRIPTION) as any)?.text || null;

			// Parse type from status column
			let segmentType = "Unknown";
			const typeValue = (columnMap.get(COLUMNS.TYPE) as any)?.value;
			if (typeValue) {
				try {
					const parsed = JSON.parse(typeValue);
					segmentType = TYPE_LABELS[parsed.index] || "Unknown";
				} catch (_e) {
					// Keep as Unknown
				}
			}

			// Parse size
			const size =
				parseFloat((columnMap.get(COLUMNS.SEGMENT_SIZE) as any)?.text || "0") ||
				null;

			// Post-process filtering when names are provided
			let includeItem = true;
			
			// If names are provided and type is specified, do post-processing
			if (names && names.length > 0 && type !== "ALL") {
				if (type === "Omniseg") {
					// Only include items starting with "Omniseg -"
					includeItem = item.name.startsWith("Omniseg -");
				} else if (type === "1st Party") {
					// Only include items with type index 1
					includeItem = segmentType === "1st Party";
				} else if (type === "3rd Party") {
					// Only include items with type index 107
					includeItem = segmentType === "3rd Party";
				}
			}

			// Add segment if it passed the filters
			if (includeItem) {
				segments.push({
					itemId: item.id,
					gamId,
					name: item.name,
					type: segmentType,
					size,
					description,
				});
			}
		}

		// Sort by size (largest first), then by name
		segments.sort((a, b) => {
			if (a.size && b.size) {
				return b.size - a.size;
			}
			if (a.size && !b.size) return -1;
			if (!a.size && b.size) return 1;
			return a.name.localeCompare(b.name);
		});

		// Apply limit
		const limitedResults = segments.slice(0, limit);

		// Return using createListResponse
		return JSON.stringify(
			createListResponse(
				"getAudienceSegments",
				limitedResults,
				{
					boardId: AUDIENCE_SEGMENTS_BOARD_ID,
					boardName: "Audience Segments",
					limit,
					names: names || undefined,
					type: type !== "ALL" ? type : undefined,
					total: limitedResults.length,
					totalBeforeLimit: segments.length
				},
				{
					summary: `Found ${limitedResults.length} audience segment${limitedResults.length !== 1 ? 's' : ''}${segments.length > limitedResults.length ? ` (${segments.length} total, limited to ${limit})` : ''}`
				}
			),
			null,
			2
		);
	} catch (error) {
		console.error("Error fetching audience segments:", error);
		throw new Error(
			`Failed to fetch audience segments: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}
}
