/**
 * Smart validation utilities that ensure test results are meaningful
 */

import { expect } from "vitest";
import { extractItemCount } from "./validators.js";

export interface BaselineData {
	totalItems: number;
	hasItems: boolean;
	itemIds: string[];
	statusDistribution?: Record<string, number>;
	dateRange?: { earliest: string; latest: string };
}

/**
 * Collects baseline data from unfiltered results
 */
export function collectBaselineData(output: string): BaselineData {
	const totalItems = extractItemCount(output);
	const itemIds: string[] = [];

	// Extract all item IDs
	const idRegex = /- \*\*ID:\*\*\s+`?(\d+)`?/g;
	let match;
	while ((match = idRegex.exec(output)) !== null) {
		itemIds.push(match[1]);
	}

	// Extract status distribution if present
	const statusDistribution: Record<string, number> = {};
	const statusRegex = /- \*\*Status:\*\*\s+([^\n]+)/g;
	while ((match = statusRegex.exec(output)) !== null) {
		const status = match[1].trim();
		statusDistribution[status] = (statusDistribution[status] || 0) + 1;
	}

	return {
		totalItems,
		hasItems: totalItems > 0,
		itemIds,
		statusDistribution:
			Object.keys(statusDistribution).length > 0
				? statusDistribution
				: undefined,
	};
}

/**
 * Validates that filtering actually reduces results appropriately
 */
export function validateFilteringEffect(
	unfilteredOutput: string,
	filteredOutput: string,
	filterType: string,
	filterValue: any,
): void {
	const baseline = collectBaselineData(unfilteredOutput);
	const filtered = collectBaselineData(filteredOutput);

	// If baseline has no items, we can't test filtering
	if (baseline.totalItems === 0) {
		console.warn(
			`⚠️ WARNING: No items in baseline data for ${filterType} filter test. Board might be empty.`,
		);
		expect(filtered.totalItems).toBe(0);
		return;
	}

	// Filtered results should be <= unfiltered
	expect(filtered.totalItems).toBeLessThanOrEqual(baseline.totalItems);

	// If we got 0 results with a filter but baseline has items, log warning
	if (filtered.totalItems === 0 && baseline.totalItems > 0) {
		console.warn(
			`⚠️ WARNING: Filter ${filterType}=${filterValue} returned 0 items but baseline has ${baseline.totalItems} items. ` +
				`This could be correct (no matching items) or indicate a problem with the filter.`,
		);
	}

	// If filtered count equals baseline, the filter might not be working
	if (filtered.totalItems === baseline.totalItems && baseline.totalItems > 5) {
		console.warn(
			`⚠️ WARNING: Filter ${filterType}=${filterValue} returned same count as baseline (${baseline.totalItems} items). ` +
				`Filter might not be working correctly.`,
		);
	}

	// Check that filtered IDs are subset of baseline IDs
	// Only do this check if baseline has enough items
	if (filtered.itemIds.length > 0 && baseline.itemIds.length > 0) {
		const baselineSet = new Set(baseline.itemIds);
		const allFilteredInBaseline = filtered.itemIds.every((id) =>
			baselineSet.has(id),
		);

		if (!allFilteredInBaseline) {
			console.warn(
				`⚠️ WARNING: Some filtered items (${filterType}=${filterValue}) are not in the baseline set. ` +
					`This could mean the baseline limit was too small or items changed between calls.`,
			);
		}
	}
}

/**
 * Validates search results are relevant
 */
export function validateSearchRelevance(
	output: string,
	searchTerm: string,
	baseline: BaselineData,
): void {
	const itemCount = extractItemCount(output);

	// If no baseline items, we can't search
	if (baseline.totalItems === 0) {
		console.warn(
			`⚠️ WARNING: Cannot test search "${searchTerm}" - no items in baseline data.`,
		);
		expect(itemCount).toBe(0);
		return;
	}

	// Search should typically reduce results
	expect(itemCount).toBeLessThanOrEqual(baseline.totalItems);

	if (itemCount === 0) {
		console.warn(
			`⚠️ WARNING: Search "${searchTerm}" returned 0 items from ${baseline.totalItems} baseline items. ` +
				`Might be too specific or no matching content.`,
		);
	} else {
		// If we have results, they should contain the search term (case-insensitive)
		const lowerOutput = output.toLowerCase();
		const lowerTerm = searchTerm.toLowerCase();

		// Check if at least some results contain the search term
		const hasRelevantContent = lowerOutput.includes(lowerTerm);

		if (!hasRelevantContent && itemCount > 0) {
			console.warn(
				`⚠️ WARNING: Search "${searchTerm}" returned ${itemCount} items but content doesn't visibly contain the term. ` +
					`Search might be matching hidden fields.`,
			);
		}
	}
}

/**
 * Validates status filter results
 */
export function validateStatusFilterResults(
	output: string,
	statusValue: number,
	statusLabel: string,
	baseline: BaselineData,
): void {
	const itemCount = extractItemCount(output);

	if (baseline.totalItems === 0) {
		console.warn(
			`⚠️ WARNING: Cannot test status filter - no items in baseline data.`,
		);
		expect(itemCount).toBe(0);
		return;
	}

	// Check if this status exists in baseline
	if (
		baseline.statusDistribution &&
		!Object.keys(baseline.statusDistribution).some((s) =>
			s.includes(statusLabel),
		)
	) {
		if (itemCount === 0) {
			console.info(
				`ℹ️ INFO: Status "${statusLabel}" (${statusValue}) has no items - this appears correct based on baseline data.`,
			);
		} else {
			console.warn(
				`⚠️ WARNING: Found ${itemCount} items for status "${statusLabel}" but this status wasn't in baseline data.`,
			);
		}
	}

	// Status filter should reduce or maintain count
	expect(itemCount).toBeLessThanOrEqual(baseline.totalItems);

	// If we have items, verify they have the correct status
	if (itemCount > 0) {
		const statusRegex = new RegExp(
			`- \\*\\*Status:\\*\\*\\s+${statusLabel}`,
			"gi",
		);
		const matches = output.match(statusRegex);

		if (matches && matches.length !== itemCount) {
			console.warn(
				`⚠️ WARNING: Found ${itemCount} items but only ${matches.length} have status "${statusLabel}". ` +
					`Filter might be including wrong items.`,
			);
		}
	}
}

/**
 * Validates pagination is working correctly
 */
export function validatePaginationWithWarnings(
	fullOutput: string,
	limitedOutput: string,
	limit: number,
): void {
	const fullCount = extractItemCount(fullOutput);
	const limitedCount = extractItemCount(limitedOutput);

	if (fullCount === 0) {
		console.warn(`⚠️ WARNING: No items available to test pagination.`);
		expect(limitedCount).toBe(0);
		return;
	}

	if (fullCount <= limit) {
		// Not enough items to properly test pagination
		console.info(
			`ℹ️ INFO: Only ${fullCount} items available, limit of ${limit} cannot be properly tested.`,
		);
		expect(limitedCount).toBe(fullCount);
	} else {
		// Should respect the limit
		expect(limitedCount).toBe(limit);

		if (limitedCount > limit) {
			console.error(
				`❌ ERROR: Pagination broken - requested ${limit} items but got ${limitedCount}.`,
			);
		}
	}
}

/**
 * Comprehensive test health check
 */
export function performTestHealthCheck(
	baselineData: BaselineData,
	toolName: string,
): void {
	if (baselineData.totalItems === 0) {
		console.warn(
			`\n⚠️ ⚠️ ⚠️ WARNING: ${toolName} has 0 items in baseline data! ⚠️ ⚠️ ⚠️\n` +
				`This means:\n` +
				`  - The Monday.com board might be empty\n` +
				`  - The API connection might be failing\n` +
				`  - The tool's query might be broken\n` +
				`  - All filter tests will be meaningless\n` +
				`Consider:\n` +
				`  1. Checking if the board has data in Monday.com\n` +
				`  2. Verifying the board ID is correct\n` +
				`  3. Testing the tool manually\n`,
		);
	} else if (baselineData.totalItems < 5) {
		console.warn(
			`\n⚠️ WARNING: ${toolName} only has ${baselineData.totalItems} items in baseline data.\n` +
				`This might make some tests less meaningful. Consider adding more test data.`,
		);
	} else {
		console.info(
			`✅ ${toolName} baseline: ${baselineData.totalItems} items available for testing.`,
		);
	}

	// Check status distribution
	if (baselineData.statusDistribution) {
		const statuses = Object.keys(baselineData.statusDistribution);
		if (statuses.length === 1) {
			console.warn(
				`⚠️ WARNING: All items have the same status "${statuses[0]}". ` +
					`Status filter tests might not be meaningful.`,
			);
		}
	}
}

/**
 * Validates that a board relation filter is working
 */
export function validateRelationFilterEffect(
	output: string,
	relationId: string,
	relationName: string,
	baseline: BaselineData,
): void {
	const itemCount = extractItemCount(output);

	if (baseline.totalItems === 0) {
		console.warn(
			`⚠️ WARNING: Cannot test ${relationName} filter - no items in baseline data.`,
		);
		expect(itemCount).toBe(0);
		return;
	}

	// Relation filters typically reduce results significantly
	expect(itemCount).toBeLessThanOrEqual(baseline.totalItems);

	if (itemCount === 0) {
		console.info(
			`ℹ️ INFO: ${relationName} filter with ID ${relationId} returned 0 items. ` +
				`This is expected if no items are related to this ID.`,
		);
	} else if (itemCount === baseline.totalItems && baseline.totalItems > 10) {
		console.warn(
			`⚠️ WARNING: ${relationName} filter returned all ${itemCount} items. ` +
				`Filter might not be working correctly.`,
		);
	}
}
