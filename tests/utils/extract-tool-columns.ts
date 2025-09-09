#!/usr/bin/env tsx
/**
 * Extracts the actual column IDs used by each tool from their source code
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface ToolColumns {
	tool: string;
	boardId: string;
	columns: string[];
	filePath: string;
}

// Map of tool names to their file paths and board IDs
const TOOL_MAPPINGS: Record<string, { path: string; boardId: string }> = {
	// CRM
	getLeads: { path: "crm/getLeads.ts", boardId: "1402911026" },
	getAccounts: { path: "crm/getAccounts.ts", boardId: "1402911027" },
	getContacts: { path: "crm/getContacts.ts", boardId: "1402911034" },

	// Sales
	getSalesActivities: {
		path: "sales/getSalesActivities.ts",
		boardId: "1402911042",
	},
	getOpportunities: {
		path: "sales/getOpportunities.ts",
		boardId: "1402911049",
	},
	getDeals: { path: "sales/getDeals.ts", boardId: "1623368485" },

	// Operations
	getBookings: { path: "operations/getBookings.ts", boardId: "1549621337" },

	// Strategy
	getOKR: { path: "okr/getOKR.ts", boardId: "1631918659" },

	// HR
	getTeams: { path: "hr/getTeams.ts", boardId: "1631927696" },
	getPeople: { path: "hr/getPeople.ts", boardId: "1612664689" },

	// Support
	getTickets: { path: "support/getTickets.ts", boardId: "1647372207" },

	// Dev
	getBugs: { path: "development/getBugs.ts", boardId: "1939583448" },
	getFeatures: { path: "development/getFeatures.ts", boardId: "1938986335" },

	// Finance
	getMarketingBudgets: {
		path: "marketing/getMarketingBudgets.ts",
		boardId: "1677240056",
	},
	getMarketingExpenses: {
		path: "marketing/getMarketingExpenses.ts",
		boardId: "1658073379",
	},

	// Tasks
	getTasksTechIntelligence: {
		path: "tasks/getTasksTechIntelligence.ts",
		boardId: "1631907569",
	},
	getTasksAdOps: { path: "tasks/getTasksAdOps.ts", boardId: "1717613454" },
	getTasksMarketing: {
		path: "tasks/getTasksMarketing.ts",
		boardId: "1693359113",
	},
};

function extractColumnIds(filePath: string): string[] {
	try {
		const content = fs.readFileSync(filePath, "utf-8");

		// Look for column_values(ids: [...])
		const regex = /column_values\(ids:\s*\[(.*?)\]/s;
		const match = content.match(regex);

		if (match) {
			const columnString = match[1];
			// Extract all quoted strings
			const columns = columnString.match(/"([^"]+)"/g);
			if (columns) {
				return columns.map((col) => col.replace(/"/g, ""));
			}
		}

		return [];
	} catch (error) {
		console.error(`Error reading ${filePath}:`, error);
		return [];
	}
}

export function extractAllToolColumns(): Record<string, ToolColumns> {
	const results: Record<string, ToolColumns> = {};
	const toolsDir = path.join(__dirname, "../../lib/tools");

	for (const [toolName, config] of Object.entries(TOOL_MAPPINGS)) {
		const filePath = path.join(toolsDir, config.path);
		const columns = extractColumnIds(filePath);

		results[toolName] = {
			tool: toolName,
			boardId: config.boardId,
			columns,
			filePath: config.path,
		};

		console.log(`📋 ${toolName}: Found ${columns.length} columns`);
	}

	return results;
}

// Save the extracted columns to a JSON file
export function saveToolColumns() {
	const columns = extractAllToolColumns();
	const outputPath = path.join(__dirname, "../fixtures/tool-columns.json");

	fs.mkdirSync(path.dirname(outputPath), { recursive: true });
	fs.writeFileSync(outputPath, JSON.stringify(columns, null, 2));

	console.log(`\n💾 Tool columns saved to ${outputPath}`);

	// Display summary
	console.log("\n📊 Summary:");
	for (const [tool, data] of Object.entries(columns)) {
		if (data.columns.length === 0) {
			console.log(`  ⚠️  ${tool}: No columns found`);
		} else {
			console.log(`  ✅ ${tool}: ${data.columns.join(", ")}`);
		}
	}
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
	saveToolColumns();
}

export default { extractAllToolColumns, saveToolColumns };
