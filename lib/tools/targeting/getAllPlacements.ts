import {
	BOARD_IDS,
	type MondayItemResponse,
	mondayApi,
} from "../../monday/client.js";

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
						(cv: any) => cv.column?.title === "Placement ID",
					)?.text || "",
			}))
			.filter((p: any) => p.name && p.name !== ""); // Filter out empty entries

		console.error(`[getAllPlacements] Found ${placements.length} placements`);

		// Convert to markdown format
		const lines: string[] = [];

		lines.push("# GAM Placements / Verticals");
		lines.push("");
		lines.push(`**Total Placements:** ${placements.length}`);
		lines.push("");
		lines.push(
			"> **Important:** Everything in this list is a vertical (content category) EXCEPT:",
		);
		lines.push("> - **RON** (Run of Network)");
		lines.push("> - **Gambling** (Special approval category)");
		lines.push("> - **Finance** (Special approval category)");
		lines.push("> - **RE-AD** (Responsible Advertisement - not retargeting)");
		lines.push("");

		if (placements.length > 0) {
			// Categorize placements
			const specialPlacements = ["RON", "Gambling", "Finance", "RE-AD"];
			const verticals: Array<Record<string, unknown>> = [];
			const special: Array<Record<string, unknown>> = [];

			placements.forEach((p: any) => {
				if (
					specialPlacements.some((sp) =>
						p.name.toLowerCase().includes(sp.toLowerCase()),
					)
				) {
					special.push(p);
				} else {
					verticals.push(p);
				}
			});

			// Show verticals only
			if (verticals.length > 0) {
				lines.push("## Content Verticals");
				lines.push("*Use these for targeting specific content categories*");
				lines.push("");
				lines.push("| Vertical | Placement ID |");
				lines.push("|----------|--------------|");

				verticals.sort((a, b) =>
					(a.name as string).localeCompare(b.name as string),
				);
				verticals.forEach((placement) => {
					const placementId =
						includeIds && placement.placementId
							? `\`${placement.placementId}\``
							: "N/A";
					lines.push(`| **${placement.name}** | ${placementId} |`);
				});
				lines.push("");
			}

			if (includeIds) {
				// Extract just the IDs for easy copying
				const verticalIds = verticals
					.filter((p) => p.placementId)
					.map((p) => p.placementId);

				if (verticalIds.length > 0) {
					lines.push("### Vertical Placement IDs for GAM");
					lines.push("```json");
					lines.push(JSON.stringify(verticalIds, null, 2));
					lines.push("```");
				}
			}
		} else {
			lines.push("*No placements found.*");
		}

		return lines.join("\n");
	} catch (error) {
		console.error("[getAllPlacements] Error:", error);
		throw new Error(
			`Failed to fetch placements: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}
}
