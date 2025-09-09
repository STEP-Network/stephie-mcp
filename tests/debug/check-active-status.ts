import { config } from "dotenv";

config({ path: "../../.env.local" });

import { mondayApi } from "../../lib/monday/client.js";

(async () => {
	const query = `
    query GetPublishers($boardId: ID!, $limit: Int!) {
      boards(ids: [$boardId]) {
        columns {
          id
          title
          type
        }
        items_page(limit: $limit) {
          items {
            name
            column_values {
              id
              text
              value
            }
          }
        }
      }
    }
  `;

	const response = await mondayApi(query, {
		boardId: "1222800432",
		limit: 500,
	});
	const columns = response.data.boards[0].columns;
	const items = response.data.boards[0].items_page.items;

	// Find status columns that might indicate active/inactive
	const statusColumns = columns.filter(
		(col: any) =>
			col.type === "color" ||
			(col.type === "status" && col.title.toLowerCase().includes("status")),
	);

	console.log("Status columns found:");
	statusColumns.forEach((col: any) => {
		console.log(`- ${col.title} (ID: ${col.id}, Type: ${col.type})`);
	});

	// Check if there's an active/inactive filter
	let activeCount = 0;
	let inactiveCount = 0;
	let highImpactActiveCount = 0;
	let highImpactInactiveCount = 0;

	for (const item of items) {
		// Check for "Status" column (likely color_mkrqy0vi)
		const statusCol = item.column_values.find(
			(col: any) => col.id === "color_mkrqy0vi",
		);
		const isActive =
			statusCol?.text === "Aktiv" || statusCol?.text === "Active";

		if (isActive) activeCount++;
		else inactiveCount++;

		// Check if has High-impact.js
		const topscrollCol = item.column_values.find(
			(col: any) => col.id === "dropdown_mksdcgvj",
		);
		const midscrollCol = item.column_values.find(
			(col: any) => col.id === "dropdown_mksdjpqx",
		);

		let hasHighImpact = false;

		if (topscrollCol?.value) {
			try {
				const parsed = JSON.parse(topscrollCol.value);
				if (
					parsed.ids &&
					(parsed.ids.includes(108) || parsed.ids.includes(20))
				) {
					hasHighImpact = true;
				}
			} catch (_e) {}
		}

		if (midscrollCol?.value) {
			try {
				const parsed = JSON.parse(midscrollCol.value);
				if (
					parsed.ids &&
					(parsed.ids.includes(108) || parsed.ids.includes(4))
				) {
					hasHighImpact = true;
				}
			} catch (_e) {}
		}

		if (hasHighImpact) {
			if (isActive) highImpactActiveCount++;
			else highImpactInactiveCount++;
		}
	}

	console.log(`\nTotal publishers: ${items.length}`);
	console.log(`Active publishers: ${activeCount}`);
	console.log(`Inactive publishers: ${inactiveCount}`);
	console.log("\nPublishers with High-impact.js:");
	console.log(`- Active with High-impact.js: ${highImpactActiveCount}`);
	console.log(`- Inactive with High-impact.js: ${highImpactInactiveCount}`);
	console.log(
		"- Total with High-impact.js: " +
			(highImpactActiveCount + highImpactInactiveCount),
	);
})();
