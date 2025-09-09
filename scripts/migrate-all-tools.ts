#!/usr/bin/env tsx
/**
 * Migrates all tools to use dynamic columns
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

// Tools to skip
const SKIP_FILES = [
	"dynamic-columns.ts",
	"getTasksMarketingDynamic.ts",
	"availabilityForecast.ts",
	"getGeoLocations.ts",
	"getContextualTargeting.ts",
	"listBoards.ts",
	"getBoardColumns.ts",
	"getItems.ts",
];

function migrateToolFile(filePath: string): boolean {
	const fileName = path.basename(filePath);

	if (SKIP_FILES.includes(fileName)) {
		return false;
	}

	let content = readFileSync(filePath, "utf-8");
	const originalContent = content;

	// Skip if already migrated
	if (content.includes("getDynamicColumns")) {
		console.log(`  ⏭️  ${fileName} - already migrated`);
		return false;
	}

	// Check if it has column_values with hardcoded array
	if (!content.includes("column_values(ids: [")) {
		console.log(`  ⏭️  ${fileName} - no column arrays`);
		return false;
	}

	// Extract board ID
	const boardIdMatch = content.match(/boards\(ids:\s*\[(\d+)\]/);
	if (!boardIdMatch) {
		console.log(`  ⚠️  ${fileName} - no board ID found`);
		return false;
	}

	const boardId = boardIdMatch[1];
	console.log(`  🔄 Migrating ${fileName} (Board: ${boardId})`);

	// Calculate relative import path
	const dirDepth =
		filePath.split("/").length - filePath.split("/").indexOf("tools") - 1;
	const importPath = `${"../".repeat(dirDepth)}dynamic-columns.js`;

	// Add import after the last import statement
	const lastImportMatch = content.match(/^import.*?;?\n/gm);
	if (lastImportMatch) {
		const lastImport = lastImportMatch[lastImportMatch.length - 1];
		const insertPos = content.indexOf(lastImport) + lastImport.length;
		content =
			content.slice(0, insertPos) +
			`import { getDynamicColumns } from '${importPath}';\n` +
			content.slice(insertPos);
	}

	// Find the function and add dynamic columns logic
	const functionMatch = content.match(
		/export\s+async\s+function\s+(\w+)\s*\([^)]*\)[^{]*{/,
	);
	if (functionMatch) {
		// Find where to insert (after parameter destructuring)
		const funcStart =
			content.indexOf(functionMatch[0]) + functionMatch[0].length;
		const nextLine = content.indexOf("\n", funcStart);

		// Look for the const destructuring line
		const destructuringMatch = content
			.slice(funcStart)
			.match(/^\s*const\s*{[^}]+}\s*=\s*params;?\n/m);
		let insertPos;

		if (destructuringMatch) {
			insertPos =
				funcStart + destructuringMatch.index! + destructuringMatch[0].length;
		} else {
			insertPos = nextLine + 1;
		}

		// Add dynamic columns code
		const dynamicCode = `  
  // Fetch dynamic columns from Columns board
  const BOARD_ID = '${boardId}';
  const dynamicColumns = await getDynamicColumns(BOARD_ID);
  
`;

		content =
			content.slice(0, insertPos) + dynamicCode + content.slice(insertPos);

		// Replace hardcoded column arrays in GraphQL query
		// Find the column_values line with hardcoded array
		const columnPattern = /column_values\(ids:\s*\[[^\]]+\]\)/;
		const columnMatch = content.match(columnPattern);

		if (columnMatch) {
			// Build the dynamic replacement
			const dynamicReplacement =
				'column_values(ids: [${dynamicColumns.map(id => `"${id}"`).join(", ")}])';
			content = content.replace(columnPattern, dynamicReplacement);

			// Make sure template literal is properly escaped in the query
			const queryStart = content.indexOf("const query = `");
			const queryEnd = content.indexOf("`;", queryStart);

			if (queryStart !== -1 && queryEnd !== -1) {
				let queryContent = content.slice(queryStart, queryEnd + 2);
				// Fix the template literal syntax
				queryContent = queryContent.replace(
					'column_values(ids: [${dynamicColumns.map(id => `"${id}"`).join(", ")}])',
					'column_values(ids: [${dynamicColumns.map(id => `"${id}"`).join(", ")}])',
				);
				content =
					content.slice(0, queryStart) +
					queryContent +
					content.slice(queryEnd + 2);
			}
		}
	}

	if (content !== originalContent) {
		writeFileSync(filePath, content);
		console.log(`  ✅ ${fileName} migrated`);
		return true;
	}

	return false;
}

function findToolFiles(dir: string, files: string[] = []): string[] {
	const items = readdirSync(dir);

	for (const item of items) {
		const fullPath = path.join(dir, item);
		const stat = statSync(fullPath);

		if (stat.isDirectory()) {
			findToolFiles(fullPath, files);
		} else if (item.endsWith(".ts")) {
			files.push(fullPath);
		}
	}

	return files;
}

async function main() {
	console.log("🚀 Migrating all tools to dynamic columns\n");

	const toolFiles = findToolFiles("lib/tools");
	console.log(`Found ${toolFiles.length} tool files\n`);

	let migrated = 0;
	let skipped = 0;
	let errors = 0;

	for (const file of toolFiles) {
		try {
			if (migrateToolFile(file)) {
				migrated++;
			} else {
				skipped++;
			}
		} catch (error) {
			console.error(`  ❌ Error in ${file}:`, error);
			errors++;
		}
	}

	console.log(`\n${"=".repeat(60)}`);
	console.log(`✅ Migrated: ${migrated} files`);
	console.log(`⏭️  Skipped: ${skipped} files`);
	console.log(`❌ Errors: ${errors} files`);
	console.log("=".repeat(60));
}

main().catch(console.error);
