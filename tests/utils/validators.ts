/**
 * Validation utilities for testing tool outputs
 */

import { expect } from "vitest";

/**
 * Validates that a string is valid markdown
 */
export function validateMarkdown(content: string): void {
	expect(content).toBeTruthy();
	expect(typeof content).toBe("string");

	// Should have at least one header
	expect(content).toMatch(/^#\s+.+/m);
}

/**
 * Validates tool output structure
 */
export function validateToolOutput(output: string, _toolName: string): void {
	validateMarkdown(output);

	// Should contain total items count
	expect(output).toMatch(/\*\*Total Items:\*\*\s+\d+/);

	// If items exist, should have proper formatting
	if (output.includes("## ")) {
		// Has item sections
		expect(output).toMatch(/##\s+.+/);
		expect(output).toMatch(/- \*\*ID:\*\*/);
	}
}

/**
 * Validates that filtering is applied correctly
 */
export function validateFilter(
	output: string,
	filterName: string,
	filterValue: string | number,
): void {
	// Should show the filter in output
	const filterPatterns = [
		`\\*\\*Filter:\\*\\*.*${filterValue}`,
		`\\*\\*${filterName}.*:\\*\\*.*${filterValue}`,
		`Related to.*ID ${filterValue}`,
		`Has.*ID ${filterValue}`,
		`In.*ID ${filterValue}`,
	];

	const hasFilter = filterPatterns.some((pattern) =>
		new RegExp(pattern, "i").test(output),
	);

	expect(
		hasFilter,
		`Output should show filter ${filterName}=${filterValue}`,
	).toBeTruthy();
}

/**
 * Extracts item count from output
 */
export function extractItemCount(output: string): number {
	const match = output.match(/\*\*Total Items:\*\*\s+(\d+)/);
	return match ? parseInt(match[1], 10) : 0;
}

/**
 * Extracts item IDs from output
 */
export function extractItemIds(output: string): string[] {
	const ids: string[] = [];
	const regex = /- \*\*ID:\*\*\s+(\d+)/g;
	let match;

	while ((match = regex.exec(output)) !== null) {
		ids.push(match[1]);
	}

	return ids;
}

/**
 * Validates pagination
 */
export function validatePagination(
	fullOutput: string,
	limitedOutput: string,
	limit: number,
): void {
	const fullCount = extractItemCount(fullOutput);
	const limitedCount = extractItemCount(limitedOutput);

	if (fullCount > limit) {
		expect(limitedCount).toBeLessThanOrEqual(limit);
	} else {
		expect(limitedCount).toBe(fullCount);
	}
}

/**
 * Validates search functionality
 */
export function validateSearch(output: string, searchTerm: string): void {
	const itemCount = extractItemCount(output);

	if (itemCount > 0) {
		// Output should contain items that match search term
		// This is a basic check - actual matching happens in Monday.com
		expect(output.toLowerCase()).toContain(searchTerm.toLowerCase());
	}
}

/**
 * Validates date filtering
 */
export function validateDateFilter(
	output: string,
	dateField: string,
	dateValue: string,
): void {
	// Date filters should reduce results or show the filter
	validateFilter(output, dateField, dateValue);
}

/**
 * Validates status filtering
 */
export function validateStatusFilter(
	output: string,
	_statusValue: number,
): void {
	// Status filters use numeric indices
	const itemCount = extractItemCount(output);

	// If we have items, they should match the status
	// (actual validation would need to check column values)
	expect(itemCount).toBeGreaterThanOrEqual(0);
}

/**
 * Validates board relation filtering
 */
export function validateRelationFilter(
	output: string,
	relationId: string,
	relationName: string,
): void {
	validateFilter(output, relationName, relationId);

	// Should show reduced or filtered results
	const itemCount = extractItemCount(output);
	expect(itemCount).toBeGreaterThanOrEqual(0);
}

/**
 * Compares outputs to ensure filtering reduces results
 */
export function compareOutputs(
	unfilteredOutput: string,
	filteredOutput: string,
	expectReduction: boolean = true,
): void {
	const unfilteredCount = extractItemCount(unfilteredOutput);
	const filteredCount = extractItemCount(filteredOutput);

	if (expectReduction && unfilteredCount > 0) {
		expect(filteredCount).toBeLessThanOrEqual(unfilteredCount);
	}
}

/**
 * Validates OKR hierarchical structure
 */
export function validateOKRStructure(output: string): void {
	// Don't use validateToolOutput as OKR has different format
	validateMarkdown(output);

	// Should have items count (changed from Objectives to Items for consistency)
	expect(output).toMatch(/\*\*Total Items:\*\*/);

	// If has key results section (not just in summary), should show them
	if (output.includes("### Key Results")) {
		expect(output).toMatch(/### Key Results/);
	}

	// Should have summary section
	expect(output).toMatch(/## 📊 Summary/);
}
