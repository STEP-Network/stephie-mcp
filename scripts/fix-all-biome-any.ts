#!/usr/bin/env tsx
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function fixFile(filePath: string) {
	let content = await readFile(filePath, "utf-8");
	let _modified = false;

	// Add GraphQL types import if needed
	if (
		(content.includes(": any") || content.includes("(e: any)")) &&
		!content.includes("GraphQLError") &&
		content.includes("mondayApi")
	) {
		const firstImportMatch = content.match(/^import .* from .*$/m);
		if (firstImportMatch) {
			const importLine = firstImportMatch[0];
			const newImport = `${importLine}\nimport type { GraphQLError } from '../../monday/types.js';`;
			content = content.replace(importLine, newImport);
			_modified = true;
		}
	}

	// Fix common any patterns in Monday.com API responses
	content = content.replace(
		/items?: any\[\]/g,
		"items?: Array<Record<string, unknown>>",
	);
	content = content.replace(
		/\(item: any\)/g,
		"(item: Record<string, unknown>)",
	);
	content = content.replace(/\(col: any\)/g, "(col: Record<string, unknown>)");
	content = content.replace(
		/\(group: any\)/g,
		"(group: Record<string, unknown>)",
	);
	content = content.replace(
		/\(board: any\)/g,
		"(board: Record<string, unknown>)",
	);
	content = content.replace(/\(e: any\)/g, "(e: GraphQLError)");
	content = content.replace(
		/\.map\(\((\w+): any\)/g,
		".map(($1: Record<string, unknown>)",
	);

	// Fix response types
	if (content.includes("response: any")) {
		content = content.replace(
			/response: any/g,
			"response: { data?: Record<string, unknown>; errors?: GraphQLError[] }",
		);
		_modified = true;
	}

	// Fix parseInt without radix
	if (content.includes("parseInt(")) {
		content = content.replace(/parseInt\(([^,)]+)\)/g, "parseInt($1, 10)");
		_modified = true;
	}

	if (content !== (await readFile(filePath, "utf-8"))) {
		await writeFile(filePath, content);
		console.log(`Fixed: ${path.basename(filePath)}`);
		return true;
	}

	return false;
}

async function findAllTsFiles(dir: string): Promise<string[]> {
	const results: string[] = [];

	try {
		const entries = await readdir(dir, { withFileTypes: true });

		for (const entry of entries) {
			const fullPath = path.join(dir, entry.name);

			if (entry.isDirectory()) {
				results.push(...(await findAllTsFiles(fullPath)));
			} else if (entry.isFile() && entry.name.endsWith(".ts")) {
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

	const allFiles = await findAllTsFiles(toolsDir);

	console.log(`Found ${allFiles.length} TypeScript files to check...`);

	let totalFixed = 0;

	for (const file of allFiles) {
		if (await fixFile(file)) {
			totalFixed++;
		}
	}

	console.log(`\nTotal files fixed: ${totalFixed}`);
}

main().catch(console.error);
