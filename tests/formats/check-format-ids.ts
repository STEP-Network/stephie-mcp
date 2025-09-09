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

	// Find all format columns
	const formatCols = columns.filter((col: any) =>
		col.id.startsWith("dropdown_mksd"),
	);

	console.log("Format columns with their dropdown options:\n");

	const importantColumns = [
		"dropdown_mksd7frz", // topscroll
		"dropdown_mksdjeft", // topscroll-expand
		"dropdown_mksdbwbf", // double-midscroll
		"dropdown_mksd17vw", // midscroll
		"dropdown_mksdcgvj", // topscroll high-impact
		"dropdown_mksdjpqx", // midscroll high-impact
	];

	for (const col of formatCols) {
		if (!importantColumns.includes(col.id)) continue;

		if (col.settings_str) {
			try {
				const settings = JSON.parse(col.settings_str);
				if (settings.labels) {
					console.log(`${col.title} (ID: ${col.id})`);
					settings.labels.forEach((label: any) => {
						console.log(`  - ID ${label.id}: "${label.name}"`);
					});
					console.log("");
				}
			} catch (_e) {}
		}
	}
})();
