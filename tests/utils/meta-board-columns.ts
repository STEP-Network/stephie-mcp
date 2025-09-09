/**
 * Meta Board Column Discovery
 * Discovers which columns are configured for each tool in the meta board
 * This ensures tests only use columns that are actually available
 */

import { mondayApi } from "../../lib/monday/client.js";

export interface BoardColumnConfig {
	boardId: string;
	boardName: string;
	columns: string[]; // Column IDs that are enabled
	columnDetails: Map<string, { title: string; type: string }>;
}

/**
 * Fetches the meta board configuration to see which columns are enabled
 */
export async function getMetaBoardConfig(
	boardKey: string,
): Promise<BoardColumnConfig | null> {
	const BOARDS_BOARD_ID = "1698570295";

	const query = `
    query {
      boards(ids: [${BOARDS_BOARD_ID}]) {
        items_page(limit: 200) {
          items {
            name
            column_values {
              id
              text
              value
              column {
                id
                title
              }
            }
          }
        }
      }
    }
  `;

	try {
		console.log(`📋 Fetching meta board configuration for ${boardKey}...`);
		const response = await mondayApi(query);
		const items = response.data?.boards?.[0]?.items_page?.items || [];

		// Find the board entry matching our key
		const boardItem = items.find((item: any) => {
			const name = item.name.toLowerCase();
			const key = boardKey
				.toLowerCase()
				.replace(/([A-Z])/g, " $1")
				.trim();
			return name.includes(key) || key.includes(name);
		});

		if (!boardItem) {
			console.warn(`⚠️ Board ${boardKey} not found in meta board`);
			return null;
		}

		// Extract board ID and columns configuration
		const columnValues = boardItem.column_values || [];
		let boardId = "";
		let columnsConfig: string[] = [];

		columnValues.forEach((col: any) => {
			if (col.column.title === "Board ID" || col.column.title === "Monday ID") {
				boardId = col.text || "";
			}
			// This is the critical field - dropdown_mkvj2a8r
			if (col.column.id === "dropdown_mkvj2a8r" && col.value) {
				try {
					const parsed = JSON.parse(col.value);
					// Extract column IDs from the dropdown value
					if (parsed.ids || parsed.labels) {
						columnsConfig = parsed.ids || parsed.labels || [];
					}
				} catch {
					// Try to parse as comma-separated if not JSON
					columnsConfig = col.text
						? col.text.split(",").map((s: string) => s.trim())
						: [];
				}
			}
		});

		console.log(`  Found board: ${boardItem.name} (ID: ${boardId})`);
		console.log(
			`  Configured columns: ${columnsConfig.length > 0 ? columnsConfig.join(", ") : "None found"}`,
		);

		// If no columns configured, warn but continue
		if (columnsConfig.length === 0) {
			console.warn(`  ⚠️ No columns configured in meta board for ${boardKey}`);
		}

		return {
			boardId,
			boardName: boardItem.name,
			columns: columnsConfig,
			columnDetails: new Map(), // Would need another query to get column details
		};
	} catch (error) {
		console.error(`Failed to fetch meta board config:`, error);
		return null;
	}
}

/**
 * Gets actual column configuration for a board
 */
export async function getBoardColumnDetails(
	boardId: string,
): Promise<Map<string, { title: string; type: string }>> {
	const query = `
    query {
      boards(ids: [${boardId}]) {
        columns {
          id
          title
          type
        }
      }
    }
  `;

	try {
		const response = await mondayApi(query);
		const columns = response.data?.boards?.[0]?.columns || [];

		const columnMap = new Map<string, { title: string; type: string }>();
		columns.forEach((col: any) => {
			columnMap.set(col.id, {
				title: col.title,
				type: col.type,
			});
		});

		return columnMap;
	} catch (error) {
		console.error(
			`Failed to fetch column details for board ${boardId}:`,
			error,
		);
		return new Map();
	}
}

/**
 * Discovers which columns are actually being used by a tool
 * by analyzing its source code
 */
export function extractUsedColumns(toolSource: string): string[] {
	const columns: string[] = [];

	// Look for column_values(ids: [...])
	const columnPattern = /column_values\(ids:\s*\[(.*?)\]/s;
	const match = toolSource.match(columnPattern);

	if (match) {
		// Extract column IDs from the array
		const columnString = match[1];
		const columnMatches = columnString.match(/"([^"]+)"/g) || [];

		columnMatches.forEach((col) => {
			columns.push(col.replace(/"/g, ""));
		});
	}

	return columns;
}

/**
 * Compares configured columns vs actually used columns
 */
export interface ColumnValidation {
	configured: string[]; // From meta board
	used: string[]; // From tool source
	missing: string[]; // Used but not configured
	unused: string[]; // Configured but not used
	valid: boolean; // Whether tool uses only configured columns
}

export function validateToolColumns(
	metaConfig: BoardColumnConfig | null,
	usedColumns: string[],
): ColumnValidation {
	const configured = metaConfig?.columns || [];

	// Find discrepancies
	const missing = usedColumns.filter((col) => !configured.includes(col));
	const unused = configured.filter((col) => !usedColumns.includes(col));

	return {
		configured,
		used: usedColumns,
		missing,
		unused,
		valid: missing.length === 0, // Tool should only use configured columns
	};
}

/**
 * Gets column configuration for testing
 */
export async function getTestableColumns(
	boardKey: string,
	toolPath: string,
): Promise<{
	boardId: string;
	validColumns: string[];
	warnings: string[];
}> {
	// Get meta board configuration
	const metaConfig = await getMetaBoardConfig(boardKey);

	// Read tool source to see what columns it's actually using
	const fs = await import("node:fs");
	const toolSource = fs.readFileSync(toolPath, "utf-8");
	const usedColumns = extractUsedColumns(toolSource);

	// Validate
	const validation = validateToolColumns(metaConfig, usedColumns);

	const warnings: string[] = [];

	if (!validation.valid) {
		if (validation.missing.length > 0) {
			warnings.push(
				`Tool uses columns not in meta config: ${validation.missing.join(", ")}`,
			);
		}
		if (validation.unused.length > 0) {
			warnings.push(
				`Meta config has unused columns: ${validation.unused.join(", ")}`,
			);
		}
	}

	// For testing, use the intersection of configured and used
	const validColumns = usedColumns.filter(
		(col) =>
			!metaConfig ||
			metaConfig.columns.length === 0 ||
			metaConfig.columns.includes(col),
	);

	return {
		boardId: metaConfig?.boardId || "",
		validColumns,
		warnings,
	};
}
