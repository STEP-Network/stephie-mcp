#!/usr/bin/env tsx
/**
 * Collects test data from Monday.com boards
 * Fetches 500 items from each board with the actual columns used by each tool
 */

import { config } from "dotenv";

config({ path: ".env.local" });

import * as fs from "node:fs";
import * as path from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mondayApi } from "../../lib/monday/client.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load tool columns configuration
const toolColumnsPath = path.join(__dirname, "../fixtures/tool-columns.json");
const TOOL_COLUMNS = fs.existsSync(toolColumnsPath)
	? JSON.parse(fs.readFileSync(toolColumnsPath, "utf-8"))
	: {};

// All board IDs we test
const TEST_BOARDS = {
	leads: { id: "1402911026", name: "Leads", tool: "getLeads" },
	accounts: { id: "1402911027", name: "Accounts", tool: "getAccounts" },
	contacts: { id: "1402911034", name: "Contacts", tool: "getContacts" },
	salesActivities: {
		id: "1402911042",
		name: "Sales Activities",
		tool: "getSalesActivities",
	},
	opportunities: {
		id: "1402911049",
		name: "Opportunities",
		tool: "getOpportunities",
	},
	bookings: { id: "1549621337", name: "Bookings", tool: "getBookings" },
	deals: { id: "1623368485", name: "Deals", tool: "getDeals" },
	okr: { id: "1631918659", name: "OKR", tool: "getOKR" },
	teams: { id: "1631927696", name: "Teams", tool: "getTeams" },
	people: { id: "1612664689", name: "People", tool: "getPeople" },
	tickets: { id: "1647372207", name: "Tickets", tool: "getTickets" },
	bugs: { id: "1939583448", name: "Bugs", tool: "getBugs" },
	features: { id: "1938986335", name: "Features", tool: "getFeatures" },
	marketingBudgets: {
		id: "1677240056",
		name: "Marketing Budgets",
		tool: "getMarketingBudgets",
	},
	marketingExpenses: {
		id: "1658073379",
		name: "Marketing Expenses",
		tool: "getMarketingExpenses",
	},
	tasksTechIntelligence: {
		id: "1631907569",
		name: "Tasks Tech Intelligence",
		tool: "getTasksTechIntelligence",
	},
	tasksAdOps: { id: "1717613454", name: "Tasks AdOps", tool: "getTasksAdOps" },
	tasksMarketing: {
		id: "1693359113",
		name: "Tasks Marketing",
		tool: "getTasksMarketing",
	},
};

interface TestData {
	boardId: string;
	boardName: string;
	tool: string;
	itemCount: number;
	columns: Array<{
		id: string;
		title: string;
		type: string;
	}>;
	actualColumnIds: string[]; // The actual column IDs used by the tool
	items: any[];
	collectedAt: string;
}

async function collectBoardData(
	board: (typeof TEST_BOARDS)[keyof typeof TEST_BOARDS],
): Promise<TestData> {
	console.log(`📊 Collecting data from ${board.name} (${board.id})...`);

	// Get the actual columns used by this tool
	const toolConfig = TOOL_COLUMNS[board.tool];
	const actualColumns = toolConfig?.columns || [];

	// First get all columns metadata
	const columnsQuery = `
    query {
      boards(ids: [${board.id}]) {
        columns {
          id
          title
          type
          settings_str
        }
      }
    }
  `;

	const columnsResponse = await mondayApi(columnsQuery);
	const allColumns = columnsResponse.data?.boards?.[0]?.columns || [];

	// Use actual columns from the tool if available, otherwise use all columns
	const columnIds =
		actualColumns.length > 0
			? actualColumns.map((id) => `"${id}"`).join(", ")
			: allColumns.map((c: any) => `"${c.id}"`).join(", ");

	console.log(
		`  📋 Using ${actualColumns.length > 0 ? "tool-specific" : "all"} columns: ${actualColumns.length || allColumns.length} columns`,
	);

	// Fetch items with all columns - use pagination for 500 items
	const items: any[] = [];
	let cursor: string | null = null;
	const BATCH_SIZE = 100;

	while (items.length < 500) {
		const itemsQuery = `
      query {
        boards(ids: [${board.id}]) {
          items_page(limit: ${BATCH_SIZE}${cursor ? `, cursor: "${cursor}"` : ""}) {
            cursor
            items {
              id
              name
              created_at
              updated_at
              column_values${columnIds ? `(ids: [${columnIds}])` : ""} {
                id
                text
                value
                type
                column {
                  title
                }
              }
              subitems {
                id
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
      }
    `;

		try {
			const response = await mondayApi(itemsQuery);
			const page = response.data?.boards?.[0]?.items_page;

			if (page?.items) {
				items.push(...page.items);
				cursor = page.cursor;

				// Stop if no more items
				if (!cursor || page.items.length < BATCH_SIZE) {
					break;
				}
			} else {
				break;
			}
		} catch (error) {
			console.error(`Error fetching items: ${error}`);
			break;
		}
	}

	console.log(
		`  ✅ Collected ${items.length} items with ${actualColumns.length || allColumns.length} columns`,
	);

	// Only include columns that are actually used by the tool
	const relevantColumns =
		actualColumns.length > 0
			? allColumns.filter((c: any) => actualColumns.includes(c.id))
			: allColumns;

	return {
		boardId: board.id,
		boardName: board.name,
		tool: board.tool,
		itemCount: items.length,
		columns: relevantColumns.map((c: any) => ({
			id: c.id,
			title: c.title,
			type: c.type,
		})),
		actualColumnIds: actualColumns, // Store the actual column IDs used
		items: items.slice(0, 500), // Ensure max 500
		collectedAt: new Date().toISOString(),
	};
}

async function collectAllTestData() {
	console.log("🚀 Starting test data collection...\n");

	const testData: Record<string, TestData> = {};

	for (const [key, board] of Object.entries(TEST_BOARDS)) {
		try {
			testData[key] = await collectBoardData(board);
			// Small delay to avoid rate limiting
			await new Promise((resolve) => setTimeout(resolve, 500));
		} catch (error) {
			console.error(`❌ Failed to collect data for ${board.name}:`, error);
		}
	}

	// Save test data
	const outputPath = path.join(__dirname, "../fixtures/test-data.json");
	fs.mkdirSync(path.dirname(outputPath), { recursive: true });
	fs.writeFileSync(outputPath, JSON.stringify(testData, null, 2));

	console.log(`\n💾 Test data saved to ${outputPath}`);

	// Generate summary
	console.log("\n📋 Summary:");
	for (const [_key, data] of Object.entries(testData)) {
		console.log(
			`  - ${data.boardName}: ${data.itemCount} items, ${data.columns.length} columns`,
		);
	}

	return testData;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
	collectAllTestData().catch(console.error);
}

export { collectAllTestData, collectBoardData, TEST_BOARDS };
