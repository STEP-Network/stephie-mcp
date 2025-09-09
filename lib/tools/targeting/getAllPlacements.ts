import {
	BOARD_IDS,
	type MondayItemResponse,
	mondayApi,
} from "../../monday/client.js";
import { createListResponse } from "../json-output.js";

export async function getAllPlacements(args: { includeIds?: boolean }) {
	const { includeIds = true } = args;

	try {
		// Query for placements from the Ad Units board
		const query = `{
      boards(ids: ${BOARD_IDS.AD_UNITS}) {
        items_page(limit: 500) {
          items {
            name
            column_values(ids: ["text_mkqpdy9d"]) {
              column {
                title
              }
              ... on TextValue {
                text
              }
            }
          }
        }
      }
    }`;

		console.error("[getAllPlacements] Fetching placements from Ad Units board");

		const response = await mondayApi(query);

		const items = response?.data?.boards?.[0]?.items_page?.items || [];

		// Process placements
		const placements = items
			.map((item: Record<string, unknown>) => ({
				name: item.name,
				placementId:
					(item as MondayItemResponse).column_values?.find(
						(cv: Record<string, unknown>) =>
							(cv.column as Record<string, unknown>)?.title === "Placement ID",
					)?.text || "",
			}))
			.filter(
				(p: { name: unknown; placementId: string }) => p.name && p.name !== "",
			); // Filter out empty entries

		console.error(`[getAllPlacements] Found ${placements.length} placements`);

		// Categorize placements
		// Note: "READ" in the placement names corresponds to "RE-AD" (Responsible Advertisement)
		const specialPlacements = ["RON", "Gambling", "Finance", "READ"];
		const verticals: Array<{ name: string; placementId: string; category: string }> = [];
		const special: Array<{ name: string; placementId: string; category: string }> = [];

		placements.forEach((p: { name: unknown; placementId: string }) => {
			const placementName = p.name as string;
			// Check if this is a special placement
			// Special handling for READ/RE-AD - check for "READ" but not as part of another word
			const isSpecial = specialPlacements.some((sp) => {
				if (sp === "READ") {
					// Match "- READ (" to ensure it's the standalone READ placement
					return placementName.includes("- READ (");
				}
				return placementName.toLowerCase().includes(sp.toLowerCase());
			});

			const placement = {
				name: placementName,
				placementId: includeIds ? p.placementId : null,
				category: isSpecial ? "special" : "vertical"
			};

			if (isSpecial) {
				special.push(placement);
			} else {
				verticals.push(placement);
			}
		});

		// Sort both arrays
		verticals.sort((a, b) => a.name.localeCompare(b.name));
		special.sort((a, b) => a.name.localeCompare(b.name));

		// Combine all placements
		const allPlacements = [...verticals, ...special];

		const metadata: Record<string, any> = {
			boardId: BOARD_IDS.AD_UNITS,
			boardName: "Ad Units",
			totalPlacements: placements.length,
			verticals: verticals.length,
			specialCategories: special.length,
			includeIds,
			notes: {
				important: "Everything in this list is a vertical (content category) EXCEPT:",
				specialCategories: [
					"RON (Run of Network)",
					"Gambling (Special approval category)",
					"Finance (Special approval category)",
					"RE-AD (Responsible Advertisement - not retargeting)"
				]
			}
		};

		return JSON.stringify(
			createListResponse(
				"getAllPlacements",
				allPlacements,
				metadata,
				{
					summary: `Found ${placements.length} GAM placement${placements.length !== 1 ? 's' : ''}: ${verticals.length} content vertical${verticals.length !== 1 ? 's' : ''} and ${special.length} special categor${special.length !== 1 ? 'ies' : 'y'}`
				}
			),
			null,
			2
		);
	} catch (error) {
		console.error("[getAllPlacements] Error:", error);
		throw new Error(
			`Failed to fetch placements: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}
}
