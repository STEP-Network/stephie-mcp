#!/usr/bin/env tsx
/**
 * Adds column names to the Boards meta board using Monday.com mutations
 */

import { config } from "dotenv";

config({ path: ".env.local" });

import * as fs from "node:fs";
import * as path from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mondayApi } from "../lib/monday/client.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BOARDS_META_BOARD_ID = "1698570295";
const COLUMN_NAMES_COLUMN_ID = "dropdown_mkvj2a8r";

// Read board definitions
const boardToolDefinitions = JSON.parse(
	fs.readFileSync(
		path.join(__dirname, "../lib/mcp/boardToolDefinitions.json"),
		"utf-8",
	),
);

// Board to Monday.com item ID mapping (from actual board data)
const BOARD_ITEM_MAP: Record<string, string> = {
	"1402911027": "1698685240", // Accounts
	"1549621337": "1715386241", // Bookings
	"1939583448": "2130866483", // Bugs
	"1222800670": "1762246687", // Changelog
	"1402911034": "1698685226", // Contacts
	"1623368485": "1850973640", // Deals
	"1938986335": "2130866445", // Features
	"1662744941": "1762493801", // Internal AdOps/AdTech
	"1804511059": "1762493822", // Internal AdSales
	"1402911026": "1698685258", // Leads
	"1677240056": "1762487589", // Marketing Budgets
	"1658073379": "1762487653", // Marketing Expenses
	"1631918659": "1698671251", // OKR
	"1402911049": "1698685267", // Opportunities
	"1741257731": "1762484520", // OTT Publishers
	"1663230263": "1698674976", // Partners
	"1612664689": "1698674870", // People
	"1611329866": "1698675048", // Platforms
	"1611396339": "1698675089", // Processes
	"1804511159": "1762493851", // Publisher FAQ
	"1402911042": "1698685282", // Sales Activities
	"1637264041": "1698570395", // Strategies
	"1717613454": "1715371177", // Tasks - AdOps
	"1635251745": "1698672990", // Tasks - AdTech
	"1693359113": "1762489933", // Tasks - Marketing
	"1631907569": "1698671502", // Tasks - Tech & Intelligence
	"1635510115": "1715371120", // Tasks - Video
	"1762038452": "1762245120", // Tasks - Yield & Growth
	"1631927696": "1698674912", // Teams
	"2123683129": "2130866367", // Tests
	"1647372207": "1698684962", // Tickets
	"2054670440": "2130857930", // Vertikaler
};

// Map board IDs to tool names
const BOARD_ID_TO_TOOL: Record<string, string> = {
	"1402911027": "getAccounts",
	"1549621337": "getBookings",
	"1939583448": "getBugs",
	"1222800670": "getChangelog",
	"1402911034": "getContacts",
	"1623368485": "getDeals",
	"1938986335": "getFeatures",
	"1662744941": "getInternalAdOpsAdTech",
	"1804511059": "getInternalAdSales",
	"1402911026": "getLeads",
	"1677240056": "getMarketingBudgets",
	"1658073379": "getMarketingExpenses",
	"1631918659": "getOKR", // Enhanced with hierarchy support
	"1402911049": "getOpportunities",
	"1741257731": "getOTTPublishers",
	"1663230263": "getPartners",
	"1612664689": "getPeople",
	"1804511159": "getPublisherFAQ",
	"1402911042": "getSalesActivities",
	"1637264041": "getStrategies",
	"1717613454": "getTasksAdOps",
	"1635251745": "getTasksAdTech",
	"1693359113": "getTasksMarketing",
	"1631907569": "getTasksTechIntelligence",
	"1635510115": "getTasksVideo",
	"1762038452": "getTasksYieldGrowth",
	"1631927696": "getTeams",
	"2123683129": "getTests",
	"1647372207": "getTickets",
	"2054670440": "getVertikaler",
};

async function getColumnNamesFromBoard(
	boardId: string,
): Promise<Map<string, string>> {
	const query = `
    query GetBoardColumns($boardId: ID!) {
      boards(ids: [$boardId]) {
        columns {
          id
          title
        }
      }
    }
  `;

	try {
		const response = await mondayApi(query, { boardId });
		const columns = response.data?.boards?.[0]?.columns || [];

		const columnMap = new Map<string, string>();
		columns.forEach((col: any) => {
			columnMap.set(col.id, col.title);
		});

		return columnMap;
	} catch (error) {
		console.error(`Error fetching columns for board ${boardId}:`, error);
		return new Map();
	}
}

function findToolFile(toolName: string): string | null {
	const categories = [
		"crm",
		"operations",
		"development",
		"sales",
		"okr",
		"marketing",
		"hr",
		"support",
		"tasks",
		"business",
		"tech",
		"publishers",
	];

	for (const category of categories) {
		const filePath = path.join(
			__dirname,
			`../lib/tools/${category}/${toolName}.ts`,
		);
		if (fs.existsSync(filePath)) {
			return fs.readFileSync(filePath, "utf-8");
		}
	}
	return null;
}

function extractEssentialColumns(fileContent: string): string[] {
	const match = fileContent.match(/column_values\(ids:\s*\[(.*?)\]/s);
	if (!match) return [];

	const columnIds = match[1]
		.split(",")
		.map((id) => id.trim().replace(/['"]/g, ""))
		.filter((id) => id.length > 0);

	return columnIds;
}

async function addColumnNames(itemId: string, columnNames: string[]) {
	// Join all column names with comma or semicolon
	const combinedNames = columnNames.join(", ");

	const mutation = `
    mutation AddColumnNames($boardId: ID!, $itemId: ID!, $columnId: String!, $value: String!) {
      change_simple_column_value(
        board_id: $boardId
        item_id: $itemId
        column_id: $columnId
        value: $value
        create_labels_if_missing: true
      ) {
        id
      }
    }
  `;

	try {
		await mondayApi(mutation, {
			boardId: BOARDS_META_BOARD_ID,
			itemId,
			columnId: COLUMN_NAMES_COLUMN_ID,
			value: combinedNames,
		});
		return true;
	} catch (error) {
		console.error(`Error adding column names to item ${itemId}:`, error);
		return false;
	}
}

async function main() {
	console.log("🔄 Adding column names to Boards meta board...\n");

	// Process each board
	for (const [boardId, itemId] of Object.entries(BOARD_ITEM_MAP)) {
		const toolName = BOARD_ID_TO_TOOL[boardId];
		if (!toolName) {
			console.log(`⚠️  No tool found for board ${boardId}`);
			continue;
		}

		const boardName = toolName.replace(/^get|Items$/g, "");
		console.log(`\n📋 Processing ${boardName} (${boardId})...`);

		// Get column names from the actual board
		const columnMap = await getColumnNamesFromBoard(boardId);
		const columnNames = new Set<string>();

		// Get columns from tool definition
		const toolDef = boardToolDefinitions.find(
			(def: any) => def.name === toolName,
		);
		if (toolDef) {
			Object.keys(toolDef.inputSchema.properties).forEach((prop) => {
				if (prop === "limit" || prop === "search") return;
				const columnId = prop.replace(/_/g, "-");
				const columnName = columnMap.get(columnId);
				if (columnName) {
					columnNames.add(columnName);
				}
			});
		}

		// Get essential columns from generated file
		const toolFile = findToolFile(toolName);
		if (toolFile) {
			const essentialColumns = extractEssentialColumns(toolFile);
			essentialColumns.forEach((colId) => {
				const columnName = columnMap.get(colId);
				if (columnName) {
					columnNames.add(columnName);
				}
			});
		}

		// Add each column name
		const sortedNames = Array.from(columnNames).sort();
		if (sortedNames.length === 0) {
			console.log(`  ⚠️  No columns found`);
			continue;
		}

		console.log(
			`  Found ${sortedNames.length} columns: ${sortedNames.join(", ")}`,
		);

		// Add all column names at once
		const success = await addColumnNames(itemId, sortedNames);
		if (success) {
			console.log(`  ✅ Added all column names`);
		} else {
			console.log(`  ❌ Failed to add column names`);
		}
	}

	console.log("\n✅ Done!");
}

// First, I need to get the actual item IDs from the board
async function _getActualItemIds() {
	const query = `
    query {
      boards(ids: [${BOARDS_META_BOARD_ID}]) {
        items_page(limit: 500) {
          items {
            id
            name
            column_values {
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

	console.log("Board items in meta board:");
	items.forEach((item: any) => {
		const boardIdCol = item.column_values.find(
			(col: any) => col.id === "board_id_mkn3k16t",
		);
		console.log(`  '${boardIdCol?.text}': '${item.id}', // ${item.name}`);
	});
}

// Uncomment to get actual item IDs
// getActualItemIds().catch(console.error);

// Run main function
main().catch(console.error);
