#!/usr/bin/env npx tsx

import * as dotenv from "dotenv";
import { getItems } from "../../lib/tools/debug/getItems.js";

// Load environment variables
dotenv.config({ path: "../../.env.local" });

async function test() {
	console.log("Getting jv.dk item details...\n");

	try {
		const result = await getItems({
			boardId: "1558569789",
			search: "jv.dk",
			limit: 1,
			includeColumnMetadata: false,
		});

		// Result is already an object
		const data = result;

		console.log("RESULT:");
		console.log(JSON.stringify(data, null, 2));

		// Check Source column value
		if (data.items && data.items.length > 0) {
			const item = data.items[0];
			console.log("\nCOLUMN VALUES:");
			for (const [key, value] of Object.entries(item.column_values)) {
				if (key === "Source" || key === "Type" || key === "Parent") {
					console.log(`${key}: ${JSON.stringify(value)}`);
				}
			}
		}
	} catch (error) {
		console.error("Error:", error.message);
	}
}

test();
