#!/usr/bin/env tsx

import { config } from "dotenv";

config({ path: ".env.local" });

import { mondayApi } from "../lib/monday/client.js";

async function getItemIds() {
	const query = `
    query {
      boards(ids: [1698570295]) {
        items_page(limit: 100) {
          items {
            id
            name
            column_values(ids: ["board_id_mkn3k16t"]) {
              id
              text
            }
          }
        }
      }
    }
  `;

	const response = await mondayApi(query);
	const items = response.data?.boards?.[0]?.items_page?.items || [];

	console.log("const BOARD_ITEM_MAP: Record<string, string> = {");
	items.forEach((item: any) => {
		const boardIdCol = item.column_values.find(
			(col: any) => col.id === "board_id_mkn3k16t",
		);
		if (boardIdCol?.text) {
			console.log(`  '${boardIdCol.text}': '${item.id}', // ${item.name}`);
		}
	});
	console.log("};");
}

getItemIds().catch(console.error);
