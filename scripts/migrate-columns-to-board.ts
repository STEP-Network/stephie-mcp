#!/usr/bin/env tsx
/**
 * Migrates column configurations from dropdown_mkvj2a8r to the new Columns board
 *
 * Process:
 * 1. Fetch all boards from meta board (1698570295)
 * 2. Get dropdown_mkvj2a8r values (column names)
 * 3. Get board_id_mkn3k16t (board ID)
 * 4. Fetch actual columns from each board
 * 5. Match names to get column IDs
 * 6. Create items in Columns board (2135717897)
 */

import { config } from "dotenv";
import { mondayApi } from "../lib/monday/client.js";

config({ path: ".env.local" });

const META_BOARD_ID = "1698570295";
const COLUMNS_BOARD_ID = "2135717897";

interface BoardConfig {
	itemId: string;
	itemName: string;
	boardId: string;
	dropdownColumns: string[];
}

interface ColumnDetail {
	id: string;
	title: string;
	type: string;
}

async function fetchMetaBoardConfigs(): Promise<BoardConfig[]> {
	console.log("📋 Fetching all boards from meta board...");

	const query = `
    query {
      boards(ids: [${META_BOARD_ID}]) {
        items_page(limit: 500) {
          items {
            id
            name
            column_values(ids: ["dropdown_mkvj2a8r", "board_id_mkn3k16t"]) {
              id
              text
              value
            }
          }
        }
      }
    }
  `;

	const response = await mondayApi(query);
	const items = response.data?.boards?.[0]?.items_page?.items || [];

	const configs: BoardConfig[] = [];

	for (const item of items) {
		const dropdownCol = item.column_values.find(
			(c: any) => c.id === "dropdown_mkvj2a8r",
		);
		const boardIdCol = item.column_values.find(
			(c: any) => c.id === "board_id_mkn3k16t",
		);

		if (!dropdownCol?.text || !boardIdCol?.text) {
			console.log(`  ⚠️ Skipping ${item.name} - missing dropdown or board ID`);
			continue;
		}

		// Parse dropdown values (comma-separated column names)
		const columnNames = dropdownCol.text
			.split(",")
			.map((s: string) => s.trim())
			.filter((s: string) => s.length > 0);

		if (columnNames.length === 0) {
			console.log(`  ⚠️ Skipping ${item.name} - no columns configured`);
			continue;
		}

		configs.push({
			itemId: item.id,
			itemName: item.name,
			boardId: boardIdCol.text.trim(),
			dropdownColumns: columnNames,
		});

		console.log(`  ✓ ${item.name}: ${columnNames.length} columns configured`);
	}

	return configs;
}

async function fetchBoardColumns(boardId: string): Promise<ColumnDetail[]> {
	const query = `
    query {
      boards(ids: [${boardId}]) {
        columns {
          id
          title
          type
        }
      }
    }
  `;

	try {
		const response = await mondayApi(query);
		return response.data?.boards?.[0]?.columns || [];
	} catch (error) {
		console.error(
			`    ❌ Failed to fetch columns for board ${boardId}:`,
			error.message,
		);
		return [];
	}
}

async function _checkColumnExists(columnId: string): Promise<boolean> {
	const query = `
    query {
      boards(ids: [${COLUMNS_BOARD_ID}]) {
        items_page(limit: 500) {
          items {
            name
            column_values(ids: ["text_mkvjc46e"]) {
              text
            }
          }
        }
      }
    }
  `;

	try {
		const response = await mondayApi(query);
		const items = response.data?.boards?.[0]?.items_page?.items || [];

		// Check if any item has this column ID
		return items.some((item: any) => {
			const colIdValue = item.column_values?.[0]?.text;
			return colIdValue === columnId;
		});
	} catch (error) {
		console.error(`Error checking existing columns:`, error.message);
		return false;
	}
}

// Cache for existing columns to avoid repeated API calls
// Key format: "boardItemId:columnId"
let existingColumnsCache: Set<string> | null = null;

async function loadExistingColumns(): Promise<Set<string>> {
	if (existingColumnsCache) {
		return existingColumnsCache;
	}

	console.log("📂 Loading existing columns from Columns board...");
	const query = `
    query {
      boards(ids: [${COLUMNS_BOARD_ID}]) {
        items_page(limit: 500) {
          items {
            name
            column_values {
              id
              text
              ... on BoardRelationValue {
                linked_item_ids
              }
            }
          }
        }
      }
    }
  `;

	try {
		const response = await mondayApi(query);
		const items = response.data?.boards?.[0]?.items_page?.items || [];

		existingColumnsCache = new Set<string>();
		items.forEach((item: any) => {
			// Find the Column ID field (text_mkvjc46e)
			const colIdField = item.column_values.find(
				(c: any) => c.id === "text_mkvjc46e",
			);
			const colId = colIdField?.text;

			// Find the Boards relation field (board_relation_mkvjb1w9)
			const boardRelation = item.column_values.find(
				(c: any) => c.id === "board_relation_mkvjb1w9",
			);
			const linkedItemIds = boardRelation?.linked_item_ids || [];

			if (colId && linkedItemIds.length > 0) {
				// Only add board:column combinations for duplicate detection
				// This allows the same column ID on different boards
				linkedItemIds.forEach((boardItemId: string) => {
					const key = `${boardItemId}:${colId}`;
					existingColumnsCache.add(key);
				});
			}
		});

		const boardRelationCount = existingColumnsCache.size;

		console.log(`  Found ${items.length} existing column items`);
		console.log(`  Board:column combinations tracked: ${boardRelationCount}\n`);
		return existingColumnsCache;
	} catch (error) {
		console.error(`Error loading existing columns:`, error.message);
		return new Set<string>();
	}
}

async function createColumnItem(
	columnName: string,
	columnId: string,
	boardItemId: string,
	boardName: string,
	_existingColumns: Set<string>,
): Promise<boolean> {
	const mutation = `
    mutation {
      create_item(
        board_id: ${COLUMNS_BOARD_ID}
        item_name: "${columnName}"
        column_values: "{\\"text_mkvjc46e\\":\\"${columnId}\\",\\"board_relation_mkvjb1w9\\":{\\"item_ids\\":[\\"${boardItemId}\\"]}}"
      ) {
        id
        name
      }
    }
  `;

	try {
		const response = await mondayApi(mutation);
		const createdItem = response.data?.create_item;
		if (createdItem) {
			console.log(
				`    ✅ Created: "${columnName}" (${columnId}) linked to ${boardName}`,
			);
			return true;
		}
		return false;
	} catch (error) {
		console.error(`    ❌ Failed to create "${columnName}":`, error.message);
		return false;
	}
}

async function migrateColumns() {
	console.log("🚀 Starting column migration to Columns board\n");

	// Load existing columns first
	const existingColumns = await loadExistingColumns();

	// Step 1: Get all board configurations
	const boardConfigs = await fetchMetaBoardConfigs();
	console.log(
		`\n📊 Found ${boardConfigs.length} boards with column configurations\n`,
	);

	let totalCreated = 0;
	let totalSkipped = 0;
	let totalFailed = 0;

	// Step 2: Process each board
	for (const config of boardConfigs) {
		console.log(`\n🔄 Processing: ${config.itemName}`);
		console.log(`  Board ID: ${config.boardId}`);
		console.log(`  Configured columns: ${config.dropdownColumns.join(", ")}`);

		// Step 3: Fetch actual columns from the board
		const boardColumns = await fetchBoardColumns(config.boardId);

		if (boardColumns.length === 0) {
			console.log(`  ⚠️ Could not fetch columns for this board - skipping`);
			continue;
		}

		console.log(`  📋 Board has ${boardColumns.length} actual columns`);

		// Step 4: Match dropdown names with actual column IDs
		const matches: Array<{ name: string; id: string }> = [];

		for (const dropdownName of config.dropdownColumns) {
			// Special case: "Name" should match "name"
			const searchName = dropdownName === "Name" ? "name" : dropdownName;

			// Try exact match first
			let column = boardColumns.find(
				(col) => col.title.toLowerCase() === searchName.toLowerCase(),
			);

			// Try partial match if exact match fails
			if (!column) {
				column = boardColumns.find(
					(col) =>
						col.title.toLowerCase().includes(searchName.toLowerCase()) ||
						searchName.toLowerCase().includes(col.title.toLowerCase()),
				);
			}

			if (column) {
				matches.push({ name: dropdownName, id: column.id });
				console.log(`  ✓ Matched: "${dropdownName}" → ${column.id}`);
			} else {
				console.log(`  ⚠️ No match found for: "${dropdownName}"`);

				// Show similar columns to help with debugging
				const similar = boardColumns.filter((col) =>
					col.title
						.toLowerCase()
						.includes(searchName.substring(0, 3).toLowerCase()),
				);
				if (similar.length > 0) {
					console.log(
						`     Possible matches: ${similar.map((c) => `"${c.title}" (${c.id})`).join(", ")}`,
					);
				}
			}
		}

		// Step 5: Create items in Columns board
		if (matches.length > 0) {
			console.log(`\n  Creating ${matches.length} column items...`);

			for (const match of matches) {
				// Check if this board:column combination already exists
				const boardColumnKey = `${config.itemId}:${match.id}`;

				// Only skip if this specific board:column combination exists
				// This allows the same column (like "name", "status") to exist on multiple boards
				const alreadyExists = existingColumns.has(boardColumnKey);

				if (alreadyExists) {
					console.log(
						`    ⏭️  Skipped: "${match.name}" (${match.id}) - already exists for this board`,
					);
					totalSkipped++;
				} else {
					const created = await createColumnItem(
						match.name,
						match.id,
						config.itemId,
						config.itemName,
						existingColumns,
					);

					if (created) {
						totalCreated++;
						// Add to cache
						existingColumns.add(boardColumnKey);
					} else {
						totalFailed++;
					}

					// Add small delay to avoid rate limiting
					await new Promise((resolve) => setTimeout(resolve, 200));
				}
			}
		}
	}

	// Summary
	console.log(`\n${"=".repeat(60)}`);
	console.log("📊 Migration Summary:");
	console.log(`  ✅ Successfully created: ${totalCreated} column items`);
	console.log(`  ⏭️  Skipped (already exist): ${totalSkipped} column items`);
	if (totalFailed > 0) {
		console.log(`  ❌ Failed: ${totalFailed} column items`);
	}
	console.log("=".repeat(60));

	if (totalCreated > 0) {
		console.log(
			"\n✨ Migration complete! Column items have been created in the Columns board.",
		);
		console.log(
			"   Each item is linked to its parent board and contains the column ID.",
		);
	}
}

// Run the migration
migrateColumns().catch((error) => {
	console.error("❌ Migration failed:", error);
	process.exit(1);
});
