#!/usr/bin/env tsx
/**
 * Generates a report of column names used in each board for manual entry
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

// Read the generated board tool definitions
const boardToolDefinitions = JSON.parse(
	fs.readFileSync(
		path.join(__dirname, "../lib/mcp/boardToolDefinitions.json"),
		"utf-8",
	),
);

// Map board names to their IDs
const BOARD_ID_MAP: Record<string, string> = {
	getAccounts: "1402911027",
	getBookings: "1549621337",
	getBugs: "1939583448",
	getChangelog: "1222800670",
	getContacts: "1402911034",
	getDeals: "1623368485",
	getFeatures: "1938986335",
	getInternalAdOpsAdTech: "1662744941",
	getInternalAdSales: "1804511059",
	getKeyResultsItems: "1631918525",
	getLeads: "1402911026",
	getMarketingBudgets: "1677240056",
	getMarketingExpenses: "1658073379",
	getOKR: "1631918659",
	getOpportunities: "1402911049",
	getOTTPublishers: "1741257731",
	getPartners: "1663230263",
	getPeople: "1612664689",
	getPublisherFAQ: "1804511159",
	getSalesActivities: "1402911042",
	getStrategies: "1637264041",
	getTasksAdOps: "1717613454",
	getTasksAdTech: "1635251745",
	getTasksMarketing: "1693359113",
	getTasksTechIntelligence: "1631907569",
	getTasksVideo: "1635510115",
	getTasksYieldGrowth: "1762038452",
	getTeams: "1631927696",
	getTests: "2123683129",
	getTickets: "1647372207",
	getVertikaler: "2054670440",
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

async function generateReport() {
	console.log("# Column Names Report for Monday.com Boards\n");
	console.log("## Unique Column Names for Dropdown Configuration\n");

	const allColumnNames = new Set<string>();
	const boardReports: Array<{
		boardName: string;
		boardId: string;
		columnNames: string[];
	}> = [];

	// Analyze each board
	for (const [toolName, boardId] of Object.entries(BOARD_ID_MAP)) {
		const boardName = toolName.replace(/^get|Items$/g, "");
		const toolDef = boardToolDefinitions.find(
			(def: any) => def.name === toolName,
		);

		const columnNames = new Set<string>();

		// Get column names from the actual board
		const columnMap = await getColumnNamesFromBoard(boardId);

		// Get column IDs from tool definition
		if (toolDef) {
			Object.keys(toolDef.inputSchema.properties).forEach((prop) => {
				if (prop === "limit" || prop === "search") return;
				const columnId = prop.replace(/_/g, "-");
				const columnName = columnMap.get(columnId);
				if (columnName) {
					columnNames.add(columnName);
					allColumnNames.add(columnName);
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
					allColumnNames.add(columnName);
				}
			});
		}

		boardReports.push({
			boardName,
			boardId,
			columnNames: Array.from(columnNames).sort(),
		});
	}

	// Output unique column names
	const sortedColumnNames = Array.from(allColumnNames).sort();
	console.log(`Total unique column names: ${sortedColumnNames.length}\n`);
	console.log("### All Unique Column Names:\n");
	sortedColumnNames.forEach((name, idx) => {
		console.log(`${idx + 1}. ${name}`);
	});

	console.log("\n## Board-Specific Column Names\n");

	// Output per-board report
	boardReports.forEach((report) => {
		console.log(`### ${report.boardName} (${report.boardId})`);
		if (report.columnNames.length > 0) {
			console.log(`Columns: ${report.columnNames.join(", ")}`);
		} else {
			console.log("No columns tracked");
		}
		console.log("");
	});

	// Create CSV for easy import
	console.log("\n## CSV Format for Import\n");
	console.log("```csv");
	console.log("Board ID,Board Name,Column Names");
	boardReports.forEach((report) => {
		console.log(
			`${report.boardId},${report.boardName},"${report.columnNames.join("; ")}"`,
		);
	});
	console.log("```");
}

generateReport().catch(console.error);
