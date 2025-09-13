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
	objectives: Array<{ id: string; name: string }>;
	statuses: string | null;
}

export async function getStrategies() {
	// Fetch dynamic columns from Columns board
	const BOARD_ID = "1637264041";
	const dynamicColumns = await getDynamicColumns(BOARD_ID);

	// Include static columns we know about
	const staticColumns = [
		"color_mkpkghqq", // Status (Active/Inactive/Archived)
		"connect_boards__1", // Objectives
		"lookup_mkpknbv0", // Status mirror
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
              ... on MirrorValue {
                display_value
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
			const objectivesCol = getColumnValue("connect_boards__1");
			const statusesCol = getColumnValue("lookup_mkpknbv0") as MondayColumnValueResponse & { display_value?: string };

			// Parse status
			const statusLabel = statusCol?.text || "Unknown";
			
			// Skip inactive and archived strategies unless specifically requested
			if (statusLabel === "Inaktiv" || statusLabel === "Arkiveret") {
				continue;
			}

			// Parse objectives with proper board relation data
			let objectives: Array<{ id: string; name: string }> = [];
			if (objectivesCol) {
				const col = objectivesCol as MondayColumnValueResponse & { 
					linked_items?: Array<{ id: string; name: string }> 
				};
				if (col.linked_items) {
					objectives = col.linked_items;
				}
			}

			// Get statuses from mirror column
			const statuses = statusesCol?.display_value || statusesCol?.text || null;

			const strategy: Strategy = {
				mondayItemId: String(mondayItem.id),
				name: String(mondayItem.name),
				status: statusLabel,
				objectives,
				statuses
			};

			strategies.push(strategy);

			// Count status
			statusCounts.set(statusLabel, (statusCounts.get(statusLabel) || 0) + 1);
		}

		// Sort strategies by name
		strategies.sort((a, b) => 
			a.name.toLowerCase().localeCompare(b.name.toLowerCase())
		);

		// Group strategies by status for better organization
		const strategiesByStatus = new Map<string, Strategy[]>();
		for (const strategy of strategies) {
			const statusKey = strategy.status || "Unknown";
			if (!strategiesByStatus.has(statusKey)) {
				strategiesByStatus.set(statusKey, []);
			}
			strategiesByStatus.get(statusKey)?.push(strategy);
		}

		// Convert to hierarchical structure
		const statusGroups = Array.from(strategiesByStatus.entries())
			.sort(([a], [b]) => {
				// Put unknown last
				if (a === "Unknown") return 1;
				if (b === "Unknown") return -1;
				return a.localeCompare(b);
			})
			.map(([status, statusStrategies]) => ({
				status,
				strategyCount: statusStrategies.length,
				strategies: statusStrategies
			}));

		// Build metadata
		const totalStrategies = strategies.length;
		const activeCount = statusCounts.get("Aktiv") || 0;
		const withObjectivesCount = strategies.filter(s => s.objectives.length > 0).length;

		const metadata = {
			boardId: BOARD_ID,
			boardName: "Strategies",
			totalStrategies,
			totalStatusGroups: strategiesByStatus.size,
			statusBreakdown: {
				active: activeCount
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
				data: statusGroups,
				metadata,
				options: {
					summary: `Found ${totalStrategies} active ${totalStrategies === 1 ? 'strategy' : 'strategies'} across ${strategiesByStatus.size} status group${strategiesByStatus.size !== 1 ? 's' : ''}, ${withObjectivesCount} with objectives`
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