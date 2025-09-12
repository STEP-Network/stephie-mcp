import {
	type MondayColumnValueResponse,
	type MondayItemResponse,
	mondayApi,
} from "../../monday/client.js";
import { getDynamicColumns } from "../dynamic-columns.js";
import { createListResponse } from "../json-output.js";

interface OTTPublisher {
	id: string;
	name: string;
	status: string;
	testUrl: string | null;
	linkInTargetVideo: string | null;
	assignedTo: string | null;
	follower: string | null;
	createdAt: string;
	updatedAt: string;
}

export async function getOTTPublishers() {
	// Fetch dynamic columns from Columns board
	const BOARD_ID = "1741257731";
	const dynamicColumns = await getDynamicColumns(BOARD_ID);

	// Include static columns we know about
	const staticColumns = [
		"status", // Status column
		"person", // Assigned to
		"people_Mjj50eHb", // Follower
		"text_mkmp787t", // Test URL
		"oprettet_i_vs_mkmp1ahn", // Link in Target Video
		"color_mkp7f147" // Særskilt OTT template/player lavet
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
            created_at
            updated_at
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

		// Group publishers by status
		const publishersByStatus = new Map<string, OTTPublisher[]>();
		const statusCounts = new Map<string, number>();

		// Process items
		const publishers = items.map((item: Record<string, unknown>) => {
			const mondayItem = item as MondayItemResponse;
			const columnValues = mondayItem.column_values || [];

			// Helper to find column value by ID
			const getColumnValue = (id: string) => {
				return columnValues.find(
					(col: Record<string, unknown>) => col.id === id,
				) as MondayColumnValueResponse | undefined;
			};

			// Extract key fields
			const statusCol = getColumnValue("status");
			const testUrlCol = getColumnValue("text_mkmp787t");
			const linkInTargetVideoCol = getColumnValue("oprettet_i_vs_mkmp1ahn");
			const assignedToCol = getColumnValue("person");
			const followerCol = getColumnValue("people_Mjj50eHb");

			// Parse status
			let statusLabel = "Unknown";
			if (statusCol?.text) {
				statusLabel = statusCol.text;
			}

			// Parse people columns
			const assignedTo = assignedToCol?.text || null;
			const follower = followerCol?.text || null;

			const publisher: OTTPublisher = {
				id: String(mondayItem.id),
				name: String(mondayItem.name),
				status: statusLabel,
				testUrl: testUrlCol?.text || null,
				linkInTargetVideo: linkInTargetVideoCol?.text || null,
				assignedTo,
				follower,
				createdAt: String(mondayItem.created_at),
				updatedAt: String(mondayItem.updated_at),
			};

			// Add to status grouping
			if (!publishersByStatus.has(statusLabel)) {
				publishersByStatus.set(statusLabel, []);
			}
			publishersByStatus.get(statusLabel)?.push(publisher);

			// Count status
			statusCounts.set(statusLabel, (statusCounts.get(statusLabel) || 0) + 1);

			return publisher;
		});

		// Sort publishers within each status by name
		for (const [, statusPublishers] of publishersByStatus) {
			statusPublishers.sort((a, b) => 
				a.name.toLowerCase().localeCompare(b.name.toLowerCase())
			);
		}

		// Define status order (Live first, then others)
		const statusOrder = ["Live", "Waiting for test page", "Waiting for zip-file", 
			"Waiting for STEP to be sent", "Waiting for Publisher", "Stuck"];

		// Convert to hierarchical structure with proper ordering
		const statusGroups = Array.from(publishersByStatus.entries())
			.sort(([a], [b]) => {
				const aIndex = statusOrder.indexOf(a);
				const bIndex = statusOrder.indexOf(b);
				if (aIndex !== -1 && bIndex !== -1) {
					return aIndex - bIndex;
				}
				if (aIndex !== -1) return -1;
				if (bIndex !== -1) return 1;
				return a.localeCompare(b);
			})
			.map(([status, statusPublishers]) => ({
				status,
				publisherCount: statusPublishers.length,
				publishers: statusPublishers
			}));

		// Build metadata
		const totalPublishers = publishers.length;
		const liveCount = statusCounts.get("Live") || 0;
		const stuckCount = statusCounts.get("Stuck") || 0;
		const waitingCount = totalPublishers - liveCount - stuckCount;

		const metadata = {
			boardId: BOARD_ID,
			boardName: "OTT Publishers",
			totalPublishers,
			totalStatusGroups: statusGroups.length,
			statusBreakdown: {
				live: liveCount,
				waiting: waitingCount,
				stuck: stuckCount
			},
			dynamicColumnsCount: dynamicColumns.length,
			statusCounts: Object.fromEntries(statusCounts)
		};

		// Use createToolResponse instead of createListResponse to preserve our metadata
		return JSON.stringify(
			{
				tool: "getOTTPublishers",
				timestamp: new Date().toISOString(),
				status: "success",
				data: statusGroups,
				metadata,
				options: {
					summary: `Found ${totalPublishers} OTT publisher${totalPublishers !== 1 ? 's' : ''}: ${liveCount} Live, ${waitingCount} Waiting, ${stuckCount} Stuck`
				}
			},
			null,
			2
		);
	} catch (error) {
		console.error("Error fetching OTT Publishers:", error);
		throw error;
	}
}