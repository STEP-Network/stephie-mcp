import {
	BOARD_IDS,
	type MondayItemResponse,
	mondayApi,
} from "../../monday/client.js";
import { createListResponse } from "../json-output.js";

export async function getAllPublishers() {
	// Always fetch all Live publishers - filtering done at query level
	const limit = 500;

	// Query with proper filtering for Live publishers (status8 index 1)
	const query = `
    query GetPublishers($boardId: ID!, $limit: Int!) {
      boards(ids: [$boardId]) {
        id
        name
        items_page(
          limit: $limit,
          query_params: {
            rules: [{
              column_id: "status8",
              compare_value: [1],
              operator: any_of
            }]
          }
        ) {
          items {
            id
            name
            column_values(ids: ["text_mktdhmar", "board_relation_mksx8dny", "board_relation_mkp69z9s", "status32"]) {
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
  `;

	const variables = {
		boardId: BOARD_IDS.PUBLISHERS,
		limit,
	};

	try {
		const response = await mondayApi(query, variables);

		// Debug logging
		console.error("Monday.com response:", JSON.stringify(response, null, 2));

		// Check if we got boards
		if (!response.data?.boards || response.data.boards.length === 0) {
			console.error("No boards found in response");
			throw new Error("No boards found in Monday.com response");
		}

		const board = response.data.boards[0];
		console.error("Board found:", board.name, "ID:", board.id);

		const items = board?.items_page?.items || [];

		// Parse publisher data using actual column IDs
		const publishers = items.map((item: Record<string, unknown>) => {
			const columnValues = (item as MondayItemResponse).column_values || [];

			// Helper to find column value by ID
			const getColumnValue = (id: string) => {
				return columnValues.find(
					(col: Record<string, unknown>) => col.id === id,
				);
			};

			// Get publisher column values
			const gamIdCol = getColumnValue("text_mktdhmar"); // GAM Ad Unit ID
			const vertikalCol = getColumnValue("board_relation_mksx8dny"); // Vertikal
			const publisherGroupCol = getColumnValue("board_relation_mkp69z9s"); // Publisher Group
			const approvalStatusCol = getColumnValue("status32"); // Approval Status (Gambling/Finance)

			// Get approval status
			let approval = "";
			if (approvalStatusCol?.text) {
				if (approvalStatusCol.text.toLowerCase().includes("gambling")) {
					approval = "Gambling";
				} else if (approvalStatusCol.text.toLowerCase().includes("finance")) {
					approval = "Finance";
				}
			}

			// Extract linked item names for board relations
			const verticalName = vertikalCol?.linked_items?.[0]?.name || "Other";
			const groupName = publisherGroupCol?.linked_items?.[0]?.name || "-";

			return {
				name: item.name,
				gamId: gamIdCol?.text || "-",
				vertical: verticalName,
				group: groupName,
				approval: approval || "-",
			};
		});

		// Group publishers by vertical
		const publishersByVertical = new Map<string, Array<{
			name: unknown;
			gamId: string;
			group: string;
			approval: string;
		}>>();

		for (const publisher of publishers) {
			const vertical = publisher.vertical;
			if (!publishersByVertical.has(vertical)) {
				publishersByVertical.set(vertical, []);
			}
			
			// Add publisher without the vertical field since it's now the group key
			publishersByVertical.get(vertical)?.push({
				name: publisher.name,
				gamId: publisher.gamId,
				group: publisher.group,
				approval: publisher.approval
			});
		}

		// Sort publishers within each vertical by name
		for (const [, verticalPublishers] of publishersByVertical) {
			verticalPublishers.sort((a, b) => 
				(a.name as string).toLowerCase().localeCompare((b.name as string).toLowerCase())
			);
		}

		// Convert to hierarchical structure
		const verticalGroups = Array.from(publishersByVertical.entries())
			.sort(([a], [b]) => a.toLowerCase().localeCompare(b.toLowerCase()))
			.map(([vertical, verticalPublishers]) => ({
				vertical,
				publisherCount: verticalPublishers.length,
				publishers: verticalPublishers
			}));

		// Build metadata
		const totalPublishers = publishers.length;
		const totalVerticals = publishersByVertical.size;
		
		// Count unique publisher groups from the board_relation_mkp69z9s column
		const uniquePublisherGroups = new Set(publishers.map(p => p.group).filter(group => group !== "-"));
		const totalPublisherGroups = uniquePublisherGroups.size;

		const metadata = {
			boardName: "Publishers",
			totalPublishers: totalPublishers,
			totalPublisherGroups: totalPublisherGroups,
			totalVerticals: totalVerticals
		};

		return JSON.stringify(
			createListResponse(
				"getAllPublishers",
				verticalGroups,
				metadata,
				{
					summary: `Found ${totalPublishers} Live publisher${totalPublishers !== 1 ? 's' : ''}/site${totalPublishers !== 1 ? 's' : ''} across ${totalVerticals} vertical${totalVerticals !== 1 ? 's' : ''}`
				}
			),
			null,
			2
		);
	} catch (error) {
		console.error("Error fetching publishers:", error);
		throw new Error(
			`Failed to fetch publishers: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}
}
