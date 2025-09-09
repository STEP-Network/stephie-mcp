#!/usr/bin/env tsx

import { config } from "dotenv";
import { mondayApi } from "./lib/monday/client.js";

config({ path: ".env.local" });

const META_BOARD_ID = "1698570295";
const COLUMNS_BOARD_ID = "2135717897";

async function verifyMigration() {
	console.log("🔍 Verifying migration completeness...\n");

	// Step 1: Get all configured columns from meta board
	console.log("📋 Fetching configured columns from meta board...");
	const metaQuery = `
    query {
      boards(ids: [${META_BOARD_ID}]) {
        items_page(limit: 500) {
          items {
            id
            name
            column_values(ids: ["dropdown_mkvj2a8r", "board_id_mkn3k16t"]) {
              id
              text
            }
          }
        }
      }
    }
  `;

	const metaResponse = await mondayApi(metaQuery);
	const metaItems = metaResponse.data?.boards?.[0]?.items_page?.items || [];

	// Collect all expected columns
	const expectedColumns = new Map<string, Set<string>>(); // boardItemId -> Set of column names
	const boardNames = new Map<string, string>(); // boardItemId -> board name
	let totalExpected = 0;

	metaItems.forEach((item: Record<string, unknown>) => {
		const dropdownCol = (item.column_values as Array<Record<string, unknown>>).find(
			(c: Record<string, unknown>) => c.id === "dropdown_mkvj2a8r",
		);
		const boardIdCol = (item.column_values as Array<Record<string, unknown>>).find(
			(c: Record<string, unknown>) => c.id === "board_id_mkn3k16t",
		);

		if (dropdownCol?.text && boardIdCol?.text) {
			const columnNames = dropdownCol.text
				.split(",")
				.map((s: string) => s.trim())
				.filter((s: string) => s.length > 0);

			if (columnNames.length > 0) {
				expectedColumns.set(item.id, new Set(columnNames));
				boardNames.set(item.id, item.name);
				totalExpected += columnNames.length;
			}
		}
	});

	console.log(
		`  Found ${expectedColumns.size} boards with ${totalExpected} total column configurations\n`,
	);

	// Step 2: Get all created columns from Columns board
	console.log("📋 Fetching created columns from Columns board...");
	const columnsQuery = `
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

	const columnsResponse = await mondayApi(columnsQuery);
	const columnItems =
		columnsResponse.data?.boards?.[0]?.items_page?.items || [];

	// Organize created columns by board
	const createdColumns = new Map<string, Set<string>>(); // boardItemId -> Set of column names

	columnItems.forEach((item: Record<string, unknown>) => {
		const boardRelation = (item.column_values as Array<Record<string, unknown>>).find(
			(c: Record<string, unknown>) => c.id === "board_relation_mkvjb1w9",
		);
		const linkedItemIds = boardRelation?.linked_item_ids || [];

		linkedItemIds.forEach((boardItemId: string) => {
			if (!createdColumns.has(boardItemId)) {
				createdColumns.set(boardItemId, new Set());
			}
			createdColumns.get(boardItemId)?.add(item.name);
		});
	});

	console.log(
		`  Found ${columnItems.length} column items linked to ${createdColumns.size} boards\n`,
	);

	// Step 3: Compare expected vs created
	console.log("📊 Verification Results:\n");

	let allMatched = true;
	let totalMatched = 0;
	let totalMissing = 0;

	// Check each board
	for (const [boardItemId, expectedCols] of expectedColumns) {
		const boardName = boardNames.get(boardItemId) || "Unknown Board";
		const createdCols = createdColumns.get(boardItemId) || new Set();

		const missing: string[] = [];
		const matched: string[] = [];

		expectedCols.forEach((colName) => {
			if (createdCols.has(colName)) {
				matched.push(colName);
				totalMatched++;
			} else {
				missing.push(colName);
				totalMissing++;
				allMatched = false;
			}
		});

		if (missing.length > 0) {
			console.log(`❌ ${boardName} (${boardItemId}):`);
			console.log(`   Expected: ${expectedCols.size} columns`);
			console.log(`   Created: ${matched.length} columns`);
			console.log(`   Missing: ${missing.length} columns`);
			console.log(`   Missing columns: ${missing.join(", ")}\n`);
		} else {
			console.log(
				`✅ ${boardName}: All ${expectedCols.size} columns created and linked`,
			);
		}
	}

	// Step 4: Check for boards without any columns
	const boardsWithoutColumns: string[] = [];
	expectedColumns.forEach((_cols, boardItemId) => {
		if (!createdColumns.has(boardItemId)) {
			boardsWithoutColumns.push(
				`${boardNames.get(boardItemId)} (${boardItemId})`,
			);
		}
	});

	if (boardsWithoutColumns.length > 0) {
		console.log("\n⚠️  Boards with no columns created:");
		boardsWithoutColumns.forEach((board) => {
			console.log(`   - ${board}`);
		});
	}

	// Final summary
	console.log(`\n${"=".repeat(60)}`);
	console.log("📈 Final Summary:");
	console.log(`  Total expected columns: ${totalExpected}`);
	console.log(`  Total created columns: ${columnItems.length}`);
	console.log(`  Successfully matched: ${totalMatched}`);
	console.log(`  Missing columns: ${totalMissing}`);
	console.log(
		`  Success rate: ${((totalMatched / totalExpected) * 100).toFixed(1)}%`,
	);

	if (allMatched) {
		console.log(
			"\n✨ SUCCESS: All columns from dropdown_mkvj2a8r are created and linked!",
		);
	} else {
		console.log("\n⚠️  Some columns are missing. This could be due to:");
		console.log(
			"  1. Column names not matching exactly with actual board columns",
		);
		console.log("  2. Board columns being renamed after configuration");
		console.log("  3. Columns being removed from boards");
	}

	console.log("=".repeat(60));
}

verifyMigration().catch(console.error);
