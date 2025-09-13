import {
	type MondayColumnValueResponse,
	type MondayItemResponse,
	mondayApi,
} from "../../monday/client.js";
import { getDynamicColumns } from "../dynamic-columns.js";

interface Strategy {
	mondayItemId: string;
	name: string;
	status: string | null;
	aiSync: string | null;
	aiType: string | null;
	objectives: string[];
	objectiveNames: string[];
	effect: string | null;
	effort: string | null;
}

export async function getStrategies() {
	// Fetch dynamic columns from Columns board
	const BOARD_ID = "1637264041";
	const dynamicColumns = await getDynamicColumns(BOARD_ID);

	// Include static columns we know about
	const staticColumns = [
		"color_mkpkghqq", // Status (Active/Inactive/Archived)
		"color_mknyd5gk", // AI Sync
		"color_mknycf0d", // AI Type
		"connect_boards__1", // Objectives
		"lookup_mkpknbv0", // Status mirror
		"lookup_mkpkact5", // Effect mirror
		"lookup_mkpk9z7j", // Effort mirror
	];

	// Combine static and dynamic columns
	const allColumns = [...new Set([...staticColumns, ...dynamicColumns])];

	const query = `
    query {
      boards(ids: [${BOARD_ID}]) {
        id
        name
        items_page(limit: 500) {
          items {
            id
            name
            column_values(ids: [${allColumns.map((id) => `"${id}"`).join(", ")}]) {
              id
              text
              value
              ... on BoardRelationValue {
                linked_items { id name }
              }
              column {
                id
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

		// Process strategies
		const strategies: Strategy[] = [];
		const statusCounts = new Map<string, number>();

		for (const item of items) {
			const mondayItem = item as MondayItemResponse;
			const columnValues = mondayItem.column_values || [];

			// Helper to find column value by ID
			const getColumnValue = (id: string) => {
				return columnValues.find(
					(col: Record<string, unknown>) => col.id === id,
				) as MondayColumnValueResponse | undefined;
			};

			// Extract key fields
			const statusCol = getColumnValue("color_mkpkghqq");
			const aiSyncCol = getColumnValue("color_mknyd5gk");
			const aiTypeCol = getColumnValue("color_mknycf0d");
			const objectivesCol = getColumnValue("connect_boards__1");
			const effectCol = getColumnValue("lookup_mkpkact5");
			const effortCol = getColumnValue("lookup_mkpk9z7j");

			// Parse status
			const statusLabel = statusCol?.text || "Unknown";
			
			// Skip inactive and archived strategies unless specifically requested
			if (statusLabel === "Inaktiv" || statusLabel === "Arkiveret") {
				continue;
			}

			// Parse objectives
			let objectiveIds: string[] = [];
			let objectiveNames: string[] = [];
			if (objectivesCol?.value) {
				const parsedValue = JSON.parse(objectivesCol.value);
				objectiveIds = parsedValue?.linkedItemIds || [];
				if (objectivesCol.linked_items) {
					objectiveNames = objectivesCol.linked_items.map(item => item.name);
				}
			}

			const strategy: Strategy = {
				mondayItemId: String(mondayItem.id),
				name: String(mondayItem.name),
				status: statusLabel,
				aiSync: aiSyncCol?.text || null,
				aiType: aiTypeCol?.text || null,
				objectives: objectiveIds,
				objectiveNames: objectiveNames,
				effect: effectCol?.text || null,
				effort: effortCol?.text || null
			};

			strategies.push(strategy);

			// Count status
			statusCounts.set(statusLabel, (statusCounts.get(statusLabel) || 0) + 1);
		}

		// Sort strategies by name
		strategies.sort((a, b) => 
			a.name.toLowerCase().localeCompare(b.name.toLowerCase())
		);

		// Group strategies by AI Type for better organization
		const strategiesByType = new Map<string, Strategy[]>();
		for (const strategy of strategies) {
			const type = strategy.aiType || "Unclassified";
			if (!strategiesByType.has(type)) {
				strategiesByType.set(type, []);
			}
			strategiesByType.get(type)?.push(strategy);
		}

		// Convert to hierarchical structure
		const typeGroups = Array.from(strategiesByType.entries())
			.sort(([a], [b]) => {
				// Put unclassified last
				if (a === "Unclassified") return 1;
				if (b === "Unclassified") return -1;
				return a.localeCompare(b);
			})
			.map(([aiType, typeStrategies]) => ({
				aiType,
				strategyCount: typeStrategies.length,
				strategies: typeStrategies
			}));

		// Build metadata
		const totalStrategies = strategies.length;
		const activeCount = statusCounts.get("Aktiv") || 0;
		const syncedCount = strategies.filter(s => s.aiSync === "Synced with AI").length;
		const withObjectivesCount = strategies.filter(s => s.objectives.length > 0).length;

		const metadata = {
			boardId: BOARD_ID,
			boardName: "Strategies",
			totalStrategies,
			totalAITypes: strategiesByType.size,
			statusBreakdown: {
				active: activeCount
			},
			aiSyncBreakdown: {
				synced: syncedCount,
				notSynced: totalStrategies - syncedCount
			},
			withObjectives: withObjectivesCount,
			dynamicColumnsCount: dynamicColumns.length
		};

		// Return formatted response
		return JSON.stringify(
			{
				tool: "getStrategies",
				timestamp: new Date().toISOString(),
				status: "success",
				data: typeGroups,
				metadata,
				options: {
					summary: `Found ${totalStrategies} active ${totalStrategies === 1 ? 'strategy' : 'strategies'} across ${strategiesByType.size} AI type${strategiesByType.size !== 1 ? 's' : ''}, ${syncedCount} synced with AI`
				}
			},
			null,
			2
		);
	} catch (error) {
		console.error("Error fetching Strategies:", error);
		throw error;
	}
}