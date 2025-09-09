/**
 * Dynamic test data discovery and generation
 * Automatically adapts to board structure and content
 */

import { extractItemCount } from "./validators.js";

export interface DiscoveredTestData {
	// Total items available
	totalItems: number;

	// Discovered values for each field
	statusValues: Map<string, { value: number; count: number; label: string }[]>;
	dateRanges: Map<
		string,
		{ earliest: string; latest: string; samples: string[] }
	>;
	searchTerms: string[]; // Common words found in titles/descriptions
	relationIds: Map<string, string[]>; // Actual IDs that exist

	// Metadata about the board
	hasData: boolean;
	warnings: string[];
	recommendations: string[];
}

/**
 * Analyzes tool output to discover actual data patterns
 */
export function analyzeToolOutput(output: string): {
	statuses: Map<string, number>;
	dates: string[];
	ids: string[];
	commonWords: string[];
} {
	const statuses = new Map<string, number>();
	const dates: string[] = [];
	const ids: string[] = [];
	const words = new Map<string, number>();

	// Extract status values
	const statusRegex = /- \*\*Status:\*\*\s+([^\n]+)/g;
	let match;
	while ((match = statusRegex.exec(output)) !== null) {
		const status = match[1].trim();
		statuses.set(status, (statuses.get(status) || 0) + 1);
	}

	// Extract dates (ISO format)
	const dateRegex = /\d{4}-\d{2}-\d{2}/g;
	const dateMatches = output.match(dateRegex) || [];
	dates.push(...new Set(dateMatches));

	// Extract IDs
	const idRegex = /- \*\*ID:\*\*\s+`?(\d+)`?/g;
	while ((match = idRegex.exec(output)) !== null) {
		ids.push(match[1]);
	}

	// Extract common words from titles (## headers)
	const titleRegex = /##\s+(.+)/g;
	while ((match = titleRegex.exec(output)) !== null) {
		const title = match[1].trim();
		// Split into words and count frequency
		const titleWords = title
			.toLowerCase()
			.split(/\s+/)
			.filter((w) => w.length > 3) // Skip short words
			.filter((w) => !["with", "from", "that", "this", "have"].includes(w)); // Skip common words

		titleWords.forEach((word) => {
			words.set(word, (words.get(word) || 0) + 1);
		});
	}

	// Get top common words
	const commonWords = Array.from(words.entries())
		.sort((a, b) => b[1] - a[1])
		.slice(0, 10)
		.map(([word]) => word);

	return { statuses, dates, ids, commonWords };
}

/**
 * Discovers test data by analyzing actual board content
 */
export async function discoverTestData(
	toolFunction: Function,
	toolName: string,
): Promise<DiscoveredTestData> {
	console.log(`🔍 Discovering test data for ${toolName}...`);

	const result: DiscoveredTestData = {
		totalItems: 0,
		statusValues: new Map(),
		dateRanges: new Map(),
		searchTerms: [],
		relationIds: new Map(),
		hasData: false,
		warnings: [],
		recommendations: [],
	};

	try {
		// Step 1: Fetch maximum data to understand the board
		console.log(`  Fetching up to 500 items for analysis...`);
		const fullOutput = await toolFunction({ limit: 500 });
		result.totalItems = extractItemCount(fullOutput);

		if (result.totalItems === 0) {
			result.warnings.push(`Board has no items - tests will be limited`);
			result.recommendations.push(
				`Add test data to the board for meaningful tests`,
			);
			return result;
		}

		result.hasData = true;
		console.log(`  Found ${result.totalItems} items to analyze`);

		// Step 2: Analyze the output
		const analysis = analyzeToolOutput(fullOutput);

		// Step 3: Discover status values (simplified - just use what we found)
		if (analysis.statuses.size > 0) {
			console.log(`  Discovered ${analysis.statuses.size} status values`);

			// Instead of testing every combination, just use the discovered statuses
			const statusLabels = Array.from(analysis.statuses.keys());
			const fieldValues: { value: number; count: number; label: string }[] = [];

			// Map common status labels to likely indices
			const statusMap: Record<string, number> = {
				New: 0,
				"In Progress": 1,
				"In Review": 2,
				Done: 3,
				Stuck: 4,
				"Not Prioritized": 0,
				Low: 1,
				Medium: 2,
				High: 3,
				Critical: 4,
			};

			statusLabels.forEach((label, index) => {
				const count = analysis.statuses.get(label) || 0;
				const value = statusMap[label] ?? index;

				fieldValues.push({
					value,
					count,
					label,
				});

				console.log(
					`    Discovered: "${label}" (${count} items, likely index ${value})`,
				);
			});

			// Add to common status fields
			if (fieldValues.length > 0) {
				result.statusValues.set("status", fieldValues);
			}
		}

		// Step 4: Discover date ranges (simplified - just store found dates)
		if (analysis.dates.length > 0) {
			console.log(`  Found ${analysis.dates.length} dates`);

			const sortedDates = analysis.dates.sort();

			// Assume common date fields exist
			const dateFields = ["due_date", "created_at", "date"];

			for (const field of dateFields) {
				result.dateRanges.set(field, {
					earliest: sortedDates[0],
					latest: sortedDates[sortedDates.length - 1],
					samples: sortedDates.slice(0, Math.min(3, sortedDates.length)),
				});
			}

			console.log(
				`    Date range: ${sortedDates[0]} to ${sortedDates[sortedDates.length - 1]}`,
			);
		}

		// Step 5: Discover search terms (simplified - just use common words found)
		if (analysis.commonWords.length > 0) {
			console.log(
				`  Found ${analysis.commonWords.length} potential search terms`,
			);

			// Use the top 3 common words as search terms
			result.searchTerms = analysis.commonWords.slice(0, 3);

			console.log(`    Search terms: ${result.searchTerms.join(", ")}`);
		}

		// Step 6: Discover relation IDs (sample from actual IDs found)
		if (analysis.ids.length > 0) {
			// These would be actual IDs from related boards
			// For now, we'll store some sample IDs
			result.relationIds.set("sample", analysis.ids.slice(0, 3));
		}

		// Step 7: Generate recommendations
		if (result.totalItems < 10) {
			result.recommendations.push(
				`Board has only ${result.totalItems} items - consider adding more test data`,
			);
		}

		if (result.statusValues.size === 0) {
			result.recommendations.push(
				`No status fields discovered - check if tool supports status filtering`,
			);
		}

		if (result.searchTerms.length === 0) {
			result.recommendations.push(
				`No searchable content found - check if tool supports search`,
			);
		}

		console.log(`✅ Discovery complete for ${toolName}`);
	} catch (error) {
		console.error(`❌ Error discovering test data for ${toolName}:`, error);
		result.warnings.push(`Failed to discover test data: ${error.message}`);
	}

	return result;
}

/**
 * Generates dynamic test cases based on discovered data
 */
export function generateDynamicTestCases(discoveredData: DiscoveredTestData): {
	statusTests: Array<{
		field: string;
		value: number;
		label: string;
		expectedCount: number;
	}>;
	dateTests: Array<{ field: string; date: string }>;
	searchTests: Array<{ term: string }>;
} {
	const statusTests: Array<{
		field: string;
		value: number;
		label: string;
		expectedCount: number;
	}> = [];
	const dateTests: Array<{ field: string; date: string }> = [];
	const searchTests: Array<{ term: string }> = [];

	// Generate status tests - pick values we know have data
	for (const [field, values] of discoveredData.statusValues) {
		// Pick up to 3 values that have the most items
		const topValues = values.sort((a, b) => b.count - a.count).slice(0, 3);

		for (const { value, label, count } of topValues) {
			statusTests.push({
				field,
				value,
				label,
				expectedCount: count,
			});
		}
	}

	// Generate date tests - use dates we know exist
	for (const [field, range] of discoveredData.dateRanges) {
		// Test with a date from the middle of the range
		if (range.samples.length > 0) {
			dateTests.push({
				field,
				date: range.samples[Math.floor(range.samples.length / 2)],
			});
		}
	}

	// Generate search tests - use terms we verified return results
	for (const term of discoveredData.searchTerms.slice(0, 3)) {
		searchTests.push({ term });
	}

	return { statusTests, dateTests, searchTests };
}

/**
 * Validates that a filter actually filtered correctly
 */
export function validateDynamicFilter(
	unfilteredOutput: string,
	filteredOutput: string,
	filterType: string,
	filterValue: any,
	expectedMinCount: number = 1,
): {
	valid: boolean;
	message: string;
} {
	const unfilteredCount = extractItemCount(unfilteredOutput);
	const filteredCount = extractItemCount(filteredOutput);

	// Check that we got at least the minimum expected results
	if (filteredCount < expectedMinCount) {
		return {
			valid: false,
			message: `Filter ${filterType}=${filterValue} returned ${filteredCount} items, expected at least ${expectedMinCount}`,
		};
	}

	// Check that filtering reduced the results (unless all items match)
	if (filteredCount > unfilteredCount) {
		return {
			valid: false,
			message: `Filter ${filterType}=${filterValue} returned MORE items (${filteredCount}) than unfiltered (${unfilteredCount})`,
		};
	}

	// For very specific filters, we expect significant reduction
	if (filterType === "id" && filteredCount > 1) {
		return {
			valid: false,
			message: `ID filter should return exactly 1 item, got ${filteredCount}`,
		};
	}

	return {
		valid: true,
		message: `Filter ${filterType}=${filterValue} correctly returned ${filteredCount} items`,
	};
}

/**
 * Cache discovered data to speed up test runs
 */
const discoveryCache = new Map<string, DiscoveredTestData>();

export async function getOrDiscoverTestData(
	toolFunction: Function,
	toolName: string,
	useCache: boolean = true,
): Promise<DiscoveredTestData> {
	if (useCache && discoveryCache.has(toolName)) {
		console.log(`📦 Using cached test data for ${toolName}`);
		return discoveryCache.get(toolName)!;
	}

	const data = await discoverTestData(toolFunction, toolName);
	discoveryCache.set(toolName, data);
	return data;
}
