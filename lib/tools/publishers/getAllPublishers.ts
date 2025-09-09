import {
	BOARD_IDS,
	type MondayItemResponse,
	mondayApi,
} from "../../monday/client.js";
import { createListResponse } from "../json-output.js";

export async function getAllPublishers() {
	// Always fetch all Live publishers - no parameters needed
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
            column_values {
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
			const verticalName = vertikalCol?.linked_items?.[0]?.name || "-";
			const groupName = publisherGroupCol?.linked_items?.[0]?.name || "-";

			const publisher = {
				id: item.id,
				name: item.name,
				gamId: gamIdCol?.text || "-",
				vertical: verticalName,
				group: groupName,
				approval: approval || "-",
			};

			return publisher;
		});

		// No filtering - always return all Live publishers
		const filteredPublishers = publishers;

		// Sort publishers by vertical, then by name
		const sortedPublishers = filteredPublishers.sort((a, b) => {
			// First sort by vertical
			const verticalCompare = a.vertical
				.toLowerCase()
				.localeCompare(b.vertical.toLowerCase());
			if (verticalCompare !== 0) return verticalCompare;
			// Then sort by name within same vertical
			return (a.name as string)
				.toLowerCase()
				.localeCompare((b.name as string).toLowerCase());
		});

		// Build metadata
		const metadata = {
			boardId: BOARD_IDS.PUBLISHERS,
			boardName: "Publishers",
			totalCount: sortedPublishers.length,
			filter: "Live publishers only (status8 index 1)"
		};

		return JSON.stringify(
			createListResponse(
				"getAllPublishers",
				sortedPublishers,
				metadata,
				{
					summary: `Found ${sortedPublishers.length} Live publisher${sortedPublishers.length !== 1 ? 's' : ''}/site${sortedPublishers.length !== 1 ? 's' : ''}`
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
