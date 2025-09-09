#!/usr/bin/env tsx
/**
 * Development helper to list all boards with their IDs and key info
 * Usage: pnpm tsx scripts/dev-list-boards.ts
 */

import { config } from "dotenv";

config({ path: ".env.local" });

import { mondayApi } from "../lib/monday/client.js";

async function listAllBoards() {
	const query = `
    query {
      boards(ids: [1698570295]) {
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
              }
            }
          }
        }
      }
    }
  `;

	try {
		const response = await mondayApi(query);
		const boards = response.data?.boards?.[0]?.items_page?.items || [];

		console.log("# Monday.com Boards\n");
		console.log("| Board Name | Board ID | Type | Status | Priority |");
		console.log("|------------|----------|------|--------|----------|");

		const boardData = boards
			.map((item: any) => {
				const columns: Record<string, string> = {};
				item.column_values.forEach((col: any) => {
					columns[col.column.title] = col.text || "";
				});

				return {
					id: columns["Board ID"] || "",
					name: item.name,
					type: columns.Type || "",
					status: columns.Status || "",
					priority: columns.Prioritet || columns.Priority || "",
				};
			})
			.sort((a: any, b: any) => {
				// Sort by priority (if exists), then by name
				if (a.priority && b.priority) {
					return a.priority.localeCompare(b.priority);
				}
				return a.name.localeCompare(b.name);
			});

		boardData.forEach((board: any) => {
			console.log(
				`| ${board.name} | ${board.id} | ${board.type} | ${board.status} | ${board.priority} |`,
			);
		});

		console.log(`\nTotal boards: ${boardData.length}`);

		// Also output as JSON for easy processing
		console.log("\n## JSON Output for scripting:\n");
		console.log(
			JSON.stringify(
				boardData.filter((b: any) => b.id),
				null,
				2,
			),
		);
	} catch (error) {
		console.error("Error:", error);
	}
}

listAllBoards();
