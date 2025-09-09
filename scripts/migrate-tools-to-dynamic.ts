#!/usr/bin/env tsx
/**
 * Automatically migrates all tools to use dynamic columns
 * This script:
 * 1. Identifies tools with hardcoded column arrays
 * 2. Adds getDynamicColumns import and usage
 * 3. Replaces hardcoded arrays with dynamic columns
 */

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { glob } from "glob";

// Tools to skip (already dynamic or special cases)
const SKIP_TOOLS = [
	"dynamic-columns.ts",
	"getTasksMarketingDynamic.ts",
	"listBoards.ts",
	"getBoardColumns.ts",
	"getItems.ts",
	"availabilityForecast.ts",
	"getGeoLocations.ts",
	"getContextualTargeting.ts",
];

// Board ID mapping (from tool files)
const BOARD_ID_MAP: Record<string, string> = {
	getAccounts: "1402911032",
	getContacts: "1402911018",
	getLeads: "1402911026",
	getOpportunities: "1402911049",
	getDeals: "1623368485",
	getSalesActivities: "1402911042",
	getBookings: "1549621337",
	getTasksMarketing: "1693359113",
	getTasksTechIntelligence: "1631907569",
	getTasksAdTech: "1635251745",
	getTasksAdOps: "1717613454",
	getTasksVideo: "1635510115",
	getTasksYieldGrowth: "1762038452",
	getTickets: "1647372207",
	getTeams: "1682223343",
	getPeople: "1682221570",
	getOKR: "1631918659",
	getStrategies: "1637264041",
	getPartners: "1682223391",
	getChangelog: "1762246687",
	getOTTPublishers: "1762484520",
	getMarketingBudgets: "1762487589",
	getMarketingExpenses: "1762487653",
	getInternalAdOpsAdTech: "1762493801",
	getInternalAdSales: "1762493822",
	getPublisherFAQ: "1762493851",
	getVertikaler: "2130857930",
	getTests: "2130866367",
	getFeatures: "2130866445",
	getBugs: "2130866483",
	getAllPublishers: "1545299249",
	getAllProducts: "1983692701",
	getAllFormats: "1983719743",
	getAllSizes: "1558597958",
	getAllAdPrices: "1432155906",
	getAllPlacements: "1935559241",
	getAudienceSegments: "2051827669",
	getKeyValues: "1802371471",
	getPublisherFormats: "1222800432",
	findPublisherAdUnits: "1558569789",
	getPublishersByFormats: "1222800432",
};

async function migrateFile(filePath: string): Promise<boolean> {
	const fileName = path.basename(filePath);
	const toolName = fileName.replace(".ts", "");

	// Skip if in skip list
	if (SKIP_TOOLS.includes(fileName)) {
		return false;
	}

	let content = readFileSync(filePath, "utf-8");
	const originalContent = content;

	// Check if already migrated
	if (content.includes("getDynamicColumns")) {
		console.log(`  ⏭️  ${fileName} - already migrated`);
		return false;
	}

	// Find hardcoded column arrays
	const columnArrayRegex = /column_values\(ids:\s*\[([\s\S]*?)\]\)/g;
	const matches = content.match(columnArrayRegex);

	if (!matches || matches.length === 0) {
		console.log(`  ⏭️  ${fileName} - no column arrays found`);
		return false;
	}

	// Get board ID for this tool
	const boardId = BOARD_ID_MAP[toolName];
	if (!boardId) {
		// Try to extract from file
		const boardIdMatch = content.match(/boards\(ids:\s*\[(\d+)\]\)/);
		if (!boardIdMatch) {
			console.log(`  ⚠️  ${fileName} - could not determine board ID`);
			return false;
		}
	}

	console.log(`  🔄 Migrating ${fileName}...`);

	// Add import for getDynamicColumns if not present
	if (!content.includes("import { getDynamicColumns }")) {
		// Find the right place to add import (after other imports)
		const importRegex = /import\s+.*?from\s+['"].*?['"];?\n/g;
		const imports = content.match(importRegex);
		if (imports) {
			const lastImport = imports[imports.length - 1];
			const lastImportIndex = content.lastIndexOf(lastImport);

			// Determine relative path based on file location
			const depth =
				filePath.split("/").filter((p) => p === "tools").length +
				filePath
					.split("/")
					.filter((p) => p !== "tools" && p !== "lib" && p.includes("/"))
					.length;
			const relativePath = `${"../".repeat(depth)}dynamic-columns.js`;

			content =
				content.slice(0, lastImportIndex + lastImport.length) +
				`import { getDynamicColumns } from '${relativePath}';\n` +
				content.slice(lastImportIndex + lastImport.length);
		}
	}

	// Extract the function and add dynamic columns logic
	const functionMatch = content.match(/export\s+async\s+function\s+(\w+)/);
	if (functionMatch) {
		const _functionName = functionMatch[1];

		// Find the board ID in the file
		const boardIdInFile =
			content.match(/boards\(ids:\s*\[(\d+)\]/)?.[1] || boardId;

		if (boardIdInFile) {
			// Add dynamic columns fetch at the start of the function
			const functionBodyStart =
				content.indexOf("{", content.indexOf(functionMatch[0])) + 1;
			const paramsEndIndex = content.indexOf("\n", functionBodyStart);

			// Add board constants and dynamic columns fetch
			const dynamicColumnsCode = `
  const BOARD_ID = '${boardIdInFile}';
  
  // Fetch dynamic columns from Columns board
  const dynamicColumns = await getDynamicColumns(BOARD_ID);
  const columnIds = dynamicColumns.map(id => \`"\${id}"\`).join(', ');
  `;

			// Insert after parameter destructuring
			content =
				content.slice(0, paramsEndIndex) +
				dynamicColumnsCode +
				content.slice(paramsEndIndex);

			// Replace hardcoded column arrays with dynamic columnIds
			content = content.replace(
				/column_values\(ids:\s*\[[\s\S]*?\]\)/g,
				"column_values(ids: [${columnIds}])",
			);

			// Fix template literal syntax
			content = content.replace(
				/column_values\(ids: \[\$\{columnIds\}\]\)/g,
				"column_values(ids: [${columnIds}])",
			);
		}
	}

	// Only write if changes were made
	if (content !== originalContent) {
		writeFileSync(filePath, content);
		console.log(`  ✅ ${fileName} - migrated successfully`);
		return true;
	}

	return false;
}

async function main() {
	console.log("🚀 Starting tool migration to dynamic columns\n");

	// Find all tool files
	const toolFiles = await glob("lib/tools/**/*.ts", {
		cwd: process.cwd(),
		absolute: false,
	});

	console.log(`Found ${toolFiles.length} tool files\n`);

	let migratedCount = 0;
	let skippedCount = 0;
	let errorCount = 0;

	for (const file of toolFiles) {
		try {
			const migrated = await migrateFile(file);
			if (migrated) {
				migratedCount++;
			} else {
				skippedCount++;
			}
		} catch (error) {
			console.error(`  ❌ Error migrating ${file}:`, error);
			errorCount++;
		}
	}

	console.log(`\n${"=".repeat(60)}`);
	console.log("📊 Migration Summary:");
	console.log(`  ✅ Migrated: ${migratedCount} files`);
	console.log(`  ⏭️  Skipped: ${skippedCount} files`);
	console.log(`  ❌ Errors: ${errorCount} files`);
	console.log("=".repeat(60));

	if (migratedCount > 0) {
		console.log("\n✨ Migration complete! Tools now use dynamic columns.");
		console.log("   Next: Run tests to verify everything works correctly.");
	}
}

main().catch(console.error);
