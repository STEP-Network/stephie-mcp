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
	dataProvider: string;
	size: number | null;
	description: string | null;
	recencyDays: number | null;
	membershipDays: number | null;
}

export async function getAudienceSegments(args: {
	search?: string | string[];
	type?: "1st Party" | "3rd Party" | "Contextual" | "Omniseg" | "ALL";
	minSize?: number;
	limit?: number;
}) {
	const { search, type = "ALL", minSize, limit = 20 } = args;

	console.error("[getAudienceSegments] called with:", {
		search,
		type,
		minSize,
		limit,
	});

	try {
		// Normalize search to array
		const searchTerms = search
			? Array.isArray(search)
				? search
				: [search]
			: [];

		// Build query
		let query = `
      query {
        boards(ids: ${AUDIENCE_SEGMENTS_BOARD_ID}) {
          items_page(limit: 500`;

		// Add search filter if provided
		if (searchTerms.length > 0) {
			const searchRules = searchTerms
				.map(
					(term) => `
        {
          column_id: "name",
          compare_value: "${term.replace(/"/g, '\\"')}",
          operator: contains_text
        }
      `,
				)
				.join(",");

			query += `, query_params: {
        rules: [${searchRules}]
        operator: or
      }`;
		}

		query += `) {
            items {
              id
              name
              column_values {
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
					{ limit, search: search || undefined, total: 0 },
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
			const dataProvider =
				(columnMap.get(COLUMNS.DATA_PROVIDER) as any)?.text || "";
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

			// Parse numeric values
			const size =
				parseFloat((columnMap.get(COLUMNS.SEGMENT_SIZE) as any)?.text || "0") ||
				null;
			const recencyDays =
				parseFloat((columnMap.get(COLUMNS.RECENCY_DAYS) as any)?.text || "0") ||
				null;
			const membershipDays =
				parseFloat(
					(columnMap.get(COLUMNS.MEMBERSHIP_EXPIRATION) as any)?.text || "0",
				) || null;

			// Apply type filter
			if (type === "ALL" || type === segmentType) {
				// Apply size filter
				if (!minSize || (size && size >= minSize)) {
					segments.push({
						itemId: item.id,
						gamId,
						name: item.name,
						type: segmentType,
						dataProvider,
						size,
						description,
						recencyDays,
						membershipDays,
					});
				}
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
					limit,
					search: search || undefined,
					total: limitedResults.length
				},
				{
					summary: `Found ${limitedResults.length} audience segment${limitedResults.length !== 1 ? 's' : ''}`
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
