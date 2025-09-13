import {
	type MondayColumnValueResponse,
	type MondayItemResponse,
	mondayApi,
} from "../../monday/client.js";
import { getDynamicColumns } from "../dynamic-columns.js";

interface Publisher {
	id: string;
	name: string;
	gamId?: string;
}

interface Vertical {
	mondayItemId: string;
	name: string;
	description: string | null;
	status: string;
	publisherIds: string[];
	publishers: Publisher[];
	adUnitCount: number;
}

export async function getVertikaler() {
	// Fetch dynamic columns from Columns board
	const BOARD_ID = "2054670440";
	const dynamicColumns = await getDynamicColumns(BOARD_ID);

	// Include static columns we know about
	const staticColumns = [
		"long_text_mksxysx", // Beskrivelse (Description)
		"color_mksxpbk5", // Status (Active/Inactive/Archived)
		"board_relation_mksxr042", // Publishers relation
		"lookup_mktdz674", // Ad Unit IDs count (mirror/lookup field)
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
                linked_items { 
                  id 
                  name 
                }
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

		// Process verticals
		const verticals: Vertical[] = [];
		const statusCounts = new Map<string, number>();
		let totalPublishers = 0;
		let totalAdUnits = 0;

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
			const descriptionCol = getColumnValue("long_text_mksxysx");
			const statusCol = getColumnValue("color_mksxpbk5");
			const publishersCol = getColumnValue("board_relation_mksxr042");
			const adUnitCountCol = getColumnValue("lookup_mktdz674");

			// Parse status
			const statusLabel = statusCol?.text || "Unknown";
			
			// Parse publishers from board relation
			let publisherIds: string[] = [];
			let publishers: Publisher[] = [];
			
			// Use linked_items if available (from GraphQL response)
			if (publishersCol?.linked_items && publishersCol.linked_items.length > 0) {
				publishers = publishersCol.linked_items.map((linkedItem: any) => ({
					id: String(linkedItem.id),
					name: String(linkedItem.name)
				}));
				publisherIds = publishers.map(p => p.id);
			} 
			// Fallback to parsing value if linked_items not available
			else if (publishersCol?.value) {
				try {
					const parsedValue = JSON.parse(publishersCol.value);
					publisherIds = parsedValue?.linkedItemIds || [];
					// Note: Without linked_items, we only have IDs, not names
				} catch (e) {
					console.error("Failed to parse publishers value:", e);
				}
			}

			// Parse ad unit count from mirror/lookup field
			let adUnitCount = 0;
			if (adUnitCountCol?.display_value) {
				adUnitCount = parseInt(adUnitCountCol.display_value, 10) || 0;
			} else if (adUnitCountCol?.text) {
				adUnitCount = parseInt(adUnitCountCol.text, 10) || 0;
			}

			const vertical: Vertical = {
				mondayItemId: String(mondayItem.id),
				name: String(mondayItem.name),
				description: descriptionCol?.text || null,
				status: statusLabel,
				publisherIds,
				publishers,
				adUnitCount
			};

			verticals.push(vertical);

			// Count status
			statusCounts.set(statusLabel, (statusCounts.get(statusLabel) || 0) + 1);
			
			// Count totals
			totalPublishers += publishers.length;
			totalAdUnits += adUnitCount;
		}

		// Sort verticals by name
		verticals.sort((a, b) => 
			a.name.toLowerCase().localeCompare(b.name.toLowerCase())
		);

		// Group verticals by status for better organization
		const verticalsByStatus = new Map<string, Vertical[]>();
		for (const vertical of verticals) {
			const status = vertical.status;
			if (!verticalsByStatus.has(status)) {
				verticalsByStatus.set(status, []);
			}
			verticalsByStatus.get(status)?.push(vertical);
		}

		// Convert to hierarchical structure with proper ordering
		const statusOrder = ["Aktiv", "Inaktiv", "Arkiveret"];
		const statusGroups = Array.from(verticalsByStatus.entries())
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
			.map(([status, statusVerticals]) => ({
				status,
				verticalCount: statusVerticals.length,
				totalPublishers: statusVerticals.reduce((sum, v) => sum + v.publishers.length, 0),
				totalAdUnits: statusVerticals.reduce((sum, v) => sum + v.adUnitCount, 0),
				verticals: statusVerticals
			}));

		// Build metadata
		const totalVerticals = verticals.length;

		const metadata = {
			boardId: BOARD_ID,
			boardName: "Vertikaler",
			totalVerticals,
			totalPublishers,
			totalAdUnits,
		};

		// Return formatted response
		return JSON.stringify(
			{
				tool: "getVertikaler",
				timestamp: new Date().toISOString(),
				status: "success",
				metadata,
				data: statusGroups,
				options: {
					summary: `Found ${totalVerticals} vertical${totalVerticals !== 1 ? 's' : ''} publisher${totalPublishers !== 1 ? 's' : ''}, ${totalAdUnits} ad unit${totalAdUnits !== 1 ? 's' : ''})`
				}
			},
			null,
			2
		);
	} catch (error) {
		console.error("Error fetching Vertikaler:", error);
		throw error;
	}
}