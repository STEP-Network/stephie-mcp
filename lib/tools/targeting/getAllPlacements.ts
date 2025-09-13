import {
	BOARD_IDS,
	type MondayItemResponse,
	mondayApi,
} from "../../monday/client.js";

interface Placement {
	mondayItemId: string;
	name: string;
	placementId: string;
	type: string;
	position?: string;
	device?: string;
}

export async function getAllPlacements() {
	try {
		// Query for placements from the Ad Units board
		const query = `{
			boards(ids: ${BOARD_IDS.AD_UNITS}) {
				id
				name
				items_page(limit: 500) {
					items {
						id
						name
						column_values {
							id
							text
							value
							column {
								id
								title
								type
							}
						}
					}
				}
			}
		}`;

		console.error("[getAllPlacements] Fetching placements from Ad Units board");

		const response = await mondayApi(query);
		const board = response?.data?.boards?.[0];
		if (!board) throw new Error("Board not found");

		const items = board.items_page?.items || [];

		// Process placements
		const placements: Placement[] = [];
		const typeCounts = new Map<string, number>();
		const positionCounts = new Map<string, number>();
		const deviceCounts = new Map<string, number>();

		for (const item of items as MondayItemResponse[]) {
			const columnValues = item.column_values || [];

			// Helper to find column value by ID
			const getColumnValue = (id: string) => {
				return columnValues.find((col) => col.id === id);
			};

			// Extract placement ID
			const placementIdCol = getColumnValue("text_mkqpdy9d");
			const placementId = placementIdCol?.text || "";

			// Skip items without placement ID
			if (!placementId || !item.name) continue;

			// Determine placement type and characteristics
			const name = String(item.name);
			let type = "Vertical";
			let position: string | undefined;
			let device: string | undefined;

			// Special placements
			if (name.includes("RON")) {
				type = "Run of Network";
			} else if (name.includes("Gambling")) {
				type = "Special Approval";
				position = "Gambling";
			} else if (name.includes("Finance")) {
				type = "Special Approval";
				position = "Finance";
			} else if (name.includes("- READ (")) {
				type = "Responsible Ad";
				position = "RE-AD";
			}

			// Extract device info from name
			if (name.toLowerCase().includes("mobile")) {
				device = "Mobile";
			} else if (name.toLowerCase().includes("desktop")) {
				device = "Desktop";
			} else if (name.toLowerCase().includes("tablet")) {
				device = "Tablet";
			}

			// Extract position from name pattern (e.g., "Top", "Bottom", "Sidebar")
			if (name.includes("Top")) position = position || "Top";
			if (name.includes("Bottom")) position = position || "Bottom";
			if (name.includes("Sidebar")) position = position || "Sidebar";
			if (name.includes("Header")) position = position || "Header";
			if (name.includes("Footer")) position = position || "Footer";

			const placement: Placement = {
				mondayItemId: String(item.id),
				name,
				placementId,
				type,
				...(position && { position }),
				...(device && { device })
			};

			placements.push(placement);

			// Count types
			typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
			if (position) {
				positionCounts.set(position, (positionCounts.get(position) || 0) + 1);
			}
			if (device) {
				deviceCounts.set(device, (deviceCounts.get(device) || 0) + 1);
			}
		}

		// Sort placements by name
		placements.sort((a, b) => a.name.localeCompare(b.name));

		// Group placements by type
		const placementsByType = new Map<string, Placement[]>();
		for (const placement of placements) {
			const type = placement.type;
			if (!placementsByType.has(type)) {
				placementsByType.set(type, []);
			}
			placementsByType.get(type)?.push(placement);
		}

		// Define type order
		const typeOrder = ["Run of Network", "Vertical", "Special Approval", "Responsible Ad"];

		// Convert to hierarchical structure
		const typeGroups = Array.from(placementsByType.entries())
			.sort(([a], [b]) => {
				const aIndex = typeOrder.indexOf(a);
				const bIndex = typeOrder.indexOf(b);
				if (aIndex !== -1 && bIndex !== -1) {
					return aIndex - bIndex;
				}
				if (aIndex !== -1) return -1;
				if (bIndex !== -1) return 1;
				return a.localeCompare(b);
			})
			.map(([type, typePlacements]) => {
				// Count unique positions and devices in this type
				const positions = new Set(typePlacements.filter(p => p.position).map(p => p.position));
				const devices = new Set(typePlacements.filter(p => p.device).map(p => p.device));

				return {
					type,
					placementCount: typePlacements.length,
					positions: Array.from(positions),
					devices: Array.from(devices),
					placements: typePlacements
				};
			});

		// Build metadata
		const totalPlacements = placements.length;
		const verticalCount = typeCounts.get("Vertical") || 0;
		const specialCount = typeCounts.get("Special Approval") || 0;
		const ronCount = typeCounts.get("Run of Network") || 0;
		const readCount = typeCounts.get("Responsible Ad") || 0;

		const metadata = {
			boardId: BOARD_IDS.AD_UNITS,
			boardName: board.name,
			totalPlacements,
			totalTypes: placementsByType.size,
			typeBreakdown: {
				verticals: verticalCount,
				specialApproval: specialCount,
				runOfNetwork: ronCount,
				responsibleAd: readCount
			},
			positionCounts: Object.fromEntries(positionCounts),
			deviceCounts: Object.fromEntries(deviceCounts),
			notes: {
				important: "Placement types explained:",
				types: {
					"Run of Network": "RON - Ads can appear anywhere on the network",
					"Vertical": "Content category specific placements",
					"Special Approval": "Requires special approval (Gambling, Finance)",
					"Responsible Ad": "RE-AD - Responsible Advertisement placements"
				}
			}
		};

		const summary = `Found ${totalPlacements} GAM placement${totalPlacements !== 1 ? 's' : ''} across ${placementsByType.size} type${placementsByType.size !== 1 ? 's' : ''} (${verticalCount} vertical${verticalCount !== 1 ? 's' : ''}, ${specialCount} special approval)`;

		return JSON.stringify(
			{
				tool: "getAllPlacements",
				timestamp: new Date().toISOString(),
				status: "success",
				metadata,
				data: typeGroups,
				options: { summary }
			},
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