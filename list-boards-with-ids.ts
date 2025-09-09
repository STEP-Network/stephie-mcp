#!/usr/bin/env tsx

import { config } from "dotenv";
import { mondayApi } from "./lib/monday/client.js";

config({ path: ".env.local" });

async function listBoardsWithIds() {
	const META_BOARD_ID = "1698570295";

	const query = `
    query {
      boards(ids: [${META_BOARD_ID}]) {
        items_page(limit: 200) {
          items {
            name
            column_values(ids: ["board_id_mkn3k16t"]) {
              text
            }
          }
        }
      }
    }
  `;

	const response = await mondayApi(query);
	const items = response.data?.boards?.[0]?.items_page?.items || [];

	console.log("Boards WITH board IDs in meta board:");
	console.log("=".repeat(50));

	const withIds = items.filter((item: any) => {
		const boardId = item.column_values[0]?.text;
		return boardId && boardId.trim() !== "";
	});

	withIds.forEach((item: any) => {
		const boardId = item.column_values[0]?.text;
		console.log(`${item.name}: ${boardId}`);
	});

	console.log(`\nTotal: ${withIds.length} boards have IDs`);
	console.log(`Missing: ${items.length - withIds.length} boards without IDs`);
}

listBoardsWithIds().catch(console.error);
