import { config } from "dotenv";

config({ path: "../../.env.local" });

import { mondayApi } from "../../lib/monday/client.js";

(async () => {
	const query = `
    query GetPublishers($boardId: ID!, $limit: Int!) {
      boards(ids: [$boardId]) {
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
	const items = response.data.boards[0].items_page.items;

	let highImpactCount = 0;
	const highImpactPublishers: string[] = [];

	for (const item of items) {
		const topscrollCol = item.column_values.find(
			(col: any) => col.id === "dropdown_mksdcgvj",
		);
		const midscrollCol = item.column_values.find(
			(col: any) => col.id === "dropdown_mksdjpqx",
		);

		let hasHighImpact = false;

		// Check topscroll High-impact.js
		if (topscrollCol?.value) {
			try {
				const parsed = JSON.parse(topscrollCol.value);
				// Check if it has Desktop (108) or Mobile (20) - NOT "Nej" (3) or "N/A" (6)
				if (
					parsed.ids &&
					(parsed.ids.includes(108) || parsed.ids.includes(20))
				) {
					hasHighImpact = true;
				}
			} catch (_e) {}
		}

		// Check midscroll High-impact.js
		if (midscrollCol?.value) {
			try {
				const parsed = JSON.parse(midscrollCol.value);
				// Check if it has Desktop (108) or Mobile (4) - NOT "Nej" (3) or "N/A" (6)
				if (
					parsed.ids &&
					(parsed.ids.includes(108) || parsed.ids.includes(4))
				) {
					hasHighImpact = true;
				}
			} catch (_e) {}
		}

		if (hasHighImpact) {
			highImpactCount++;
			highImpactPublishers.push(item.name);
		}
	}

	console.log(`Publishers with High-impact.js enabled: ${highImpactCount}`);
	console.log("\nFirst 10 publishers:");
	highImpactPublishers.slice(0, 10).forEach((p) => console.log(`- ${p}`));

	// Now check which ones our tool is incorrectly including
	console.log(
		"\n\nChecking specific publishers that might be incorrectly included:",
	);

	const checkPublishers = ["Estaldo.com", "Bornholm.nu", "PLbold.dk"];
	for (const pubName of checkPublishers) {
		const pub = items.find((item: any) => item.name === pubName);
		if (pub) {
			console.log(`\n${pubName}:`);
			const topscrollCol = pub.column_values.find(
				(col: any) => col.id === "dropdown_mksdcgvj",
			);
			const midscrollCol = pub.column_values.find(
				(col: any) => col.id === "dropdown_mksdjpqx",
			);

			console.log(
				"  Topscroll High-impact: " +
					topscrollCol?.text +
					" (value: " +
					topscrollCol?.value +
					")",
			);
			console.log(
				"  Midscroll High-impact: " +
					midscrollCol?.text +
					" (value: " +
					midscrollCol?.value +
					")",
			);
		}
	}
})();
