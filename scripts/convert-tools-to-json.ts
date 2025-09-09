#!/usr/bin/env npx tsx

/**
 * Script to convert all tools from markdown to JSON output
 * This script will batch convert simple tools automatically
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const TOOLS_DIR = '/Users/naref/Documents/Code/stephie-mcp/lib/tools';

// Tools that are already converted or don't need conversion
const SKIP_FILES = [
  'json-output.ts',
  'board-ids.ts', 
  'dynamic-columns.ts',
  'test',
  'getAccounts.ts' // Already converted
];

// Tools that need manual conversion due to complexity
const COMPLEX_TOOLS = [
  'availabilityForecast.ts',
  'getAllFormats.ts',
  'getAllProducts.ts',
  'getAllAdPrices.ts',
  'getAllSizes.ts',
  'findPublisherAdUnits.ts'
];

function shouldSkip(filePath: string): boolean {
  return SKIP_FILES.some(skip => filePath.includes(skip));
}

function isComplexTool(filePath: string): boolean {
  return COMPLEX_TOOLS.some(complex => filePath.includes(complex));
}

function convertSimpleGetTool(filePath: string): void {
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Check if already converted
  if (content.includes('json-output')) {
    console.log(`  Already converted: ${filePath}`);
    return;
  }
  
  // Check if it's a simple get tool with markdown output
  if (!content.includes('lines.push') && !content.includes('lines.join')) {
    console.log(`  No markdown patterns: ${filePath}`);
    return;
  }
  
  console.log(`  Converting: ${filePath}`);
  
  // Add import for json-output
  let newContent = content.replace(
    /import \{([^}]+)\} from "\.\.\/\.\.\/monday\/client\.js";/,
    `import {$1} from "../../monday/client.js";
import { createListResponse, createErrorResponse, formatMondayItem } from "../json-output.js";`
  );
  
  // If no monday client import, add after first import
  if (!newContent.includes('json-output')) {
    newContent = newContent.replace(
      /(import .+ from .+;\n)/,
      `$1import { createListResponse, createErrorResponse, formatMondayItem } from "../json-output.js";\n`
    );
  }
  
  // Replace markdown formatting with JSON
  newContent = newContent.replace(
    /\/\/ Format response as markdown[\s\S]*?return lines\.join\("\\n"\);/,
    `// Format items for JSON response
		const formattedItems = items.map((item: any) => formatMondayItem(item));

		// Build metadata
		const metadata: Record<string, any> = {
			boardId: board.id,
			boardName: board.name,
			limit,
			filters: params
		};

		return JSON.stringify(
			createListResponse(
				"${path.basename(filePath, '.ts')}",
				formattedItems,
				metadata
			),
			null,
			2
		);`
  );
  
  // For create/update tools
  if (filePath.includes('create') || filePath.includes('update')) {
    newContent = newContent.replace(
      /return `[^`]+`;/g,
      (match) => {
        if (match.includes('Successfully')) {
          return `return JSON.stringify(
			createSuccessResponse(
				"${path.basename(filePath, '.ts')}",
				"${filePath.includes('create') ? 'created' : 'updated'}",
				{ id: newItem.id, name: newItem.name },
				{ boardId, boardName }
			),
			null,
			2
		);`;
        }
        return match;
      }
    );
    
    // Add success response import if needed
    if (newContent.includes('createSuccessResponse') && !newContent.includes('createSuccessResponse,')) {
      newContent = newContent.replace(
        'createListResponse,',
        'createListResponse, createSuccessResponse,'
      );
    }
  }
  
  fs.writeFileSync(filePath, newContent);
  console.log(`  ✅ Converted: ${filePath}`);
}

function findToolFiles(dir: string): string[] {
  const files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findToolFiles(fullPath));
    } else if (entry.name.endsWith('.ts') && !shouldSkip(fullPath)) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Main execution
console.log('Starting tool conversion to JSON output...\n');

const toolFiles = findToolFiles(TOOLS_DIR);
console.log(`Found ${toolFiles.length} tool files\n`);

let converted = 0;
let skipped = 0;
let complex = 0;

for (const file of toolFiles) {
  if (isComplexTool(file)) {
    console.log(`⚠️  Complex tool (needs manual conversion): ${file}`);
    complex++;
  } else {
    try {
      convertSimpleGetTool(file);
      converted++;
    } catch (error) {
      console.error(`❌ Error converting ${file}:`, error);
      skipped++;
    }
  }
}

console.log(`
Summary:
- Converted: ${converted}
- Complex (manual): ${complex}
- Skipped/Error: ${skipped}
- Total: ${toolFiles.length}
`);

console.log('Complex tools that need manual conversion:');
COMPLEX_TOOLS.forEach(tool => console.log(`  - ${tool}`));