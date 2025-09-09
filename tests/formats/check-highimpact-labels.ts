import { config } from "dotenv";

config({ path: "../../.env.local" });

import { mondayApi } from "../../lib/monday/client.js";

(async () => {
	const query = `
    query GetColumns($boardId: ID!) {
      boards(ids: [$boardId]) {
        columns {
          id
          title
          settings_str
        }
      }
    }
  `;

	const response = await mondayApi(query, { boardId: "1222800432" });
	const columns = response.data.boards[0].columns;

	// Find High-impact.js columns
	const highImpactCols = columns.filter(
		(col) => col.id === "dropdown_mksdcgvj" || col.id === "dropdown_mksdjpqx",
	);

	for (const col of highImpactCols) {
		console.log(`\n=== ${col.title} ===`);
		console.log("ID:", col.id);
		if (col.settings_str) {
			try {
				const settings = JSON.parse(col.settings_str);
				if (settings.labels) {
					console.log("\nDropdown options:");
					settings.labels.forEach((label: any, _index: number) => {
						console.log(`  ID ${label.id}: "${label.name}"`);
					});
				}
			} catch (_e) {
				console.log("Could not parse settings");
			}
		}
	}
})();
