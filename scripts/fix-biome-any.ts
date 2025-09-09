#!/usr/bin/env tsx
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function fixFile(filePath: string) {
	let content = await readFile(filePath, "utf-8");
	let modified = false;

	// Add import if it contains Record<string, any> but doesn't have the type import
	if (
		content.includes("Record<string, any>") &&
		!content.includes("MondayColumnValues")
	) {
		// Find the first import line and add our import after it
		const firstImportMatch = content.match(/^import .* from .*$/m);
		if (firstImportMatch) {
			const importLine = firstImportMatch[0];
			const newImport = `${importLine}\nimport type { MondayColumnValues, GraphQLError } from '../../monday/types.js';`;
			content = content.replace(importLine, newImport);
			modified = true;
		}
	}

	// Replace Record<string, any> with MondayColumnValues
	if (content.includes("Record<string, any>")) {
		content = content.replace(/Record<string, any>/g, "MondayColumnValues");
		modified = true;
	}

	// Fix parseInt without radix
	if (content.includes("parseInt(")) {
		content = content.replace(/parseInt\(([^,)]+)\)/g, "parseInt($1, 10)");
		modified = true;
	}

	// Fix error callback types
	if (content.includes(".map((e: any)")) {
		content = content.replace(/\.map\(\(e: any\)/g, ".map((e: GraphQLError)");
		modified = true;
	}

	if (modified) {
		await writeFile(filePath, content);
		console.log(`Fixed: ${path.basename(filePath)}`);
		return true;
	}

	return false;
}

async function findFiles(dir: string, pattern: RegExp): Promise<string[]> {
	const results: string[] = [];

	try {
		const entries = await readdir(dir, { withFileTypes: true });

		for (const entry of entries) {
			const fullPath = path.join(dir, entry.name);

			if (entry.isDirectory()) {
				results.push(...(await findFiles(fullPath, pattern)));
			} else if (entry.isFile() && pattern.test(entry.name)) {
				results.push(fullPath);
			}
		}
	} catch (_error) {
		// Directory doesn't exist or can't be read
	}

	return results;
}

async function main() {
	const toolsDir = path.join(__dirname, "..", "lib", "tools");

	// Find all create/update tools
	const createPattern = /^create.*\.ts$/;
	const updatePattern = /^update.*\.ts$/;

	const createFiles = await findFiles(toolsDir, createPattern);
	const updateFiles = await findFiles(toolsDir, updatePattern);
	const allFiles = [...createFiles, ...updateFiles];

	console.log(`Found ${allFiles.length} files to check...`);

	let totalFixed = 0;

	for (const file of allFiles) {
		if (await fixFile(file)) {
			totalFixed++;
		}
	}

	console.log(`\nTotal files fixed: ${totalFixed}`);
}

main().catch(console.error);
