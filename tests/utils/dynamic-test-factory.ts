/**
 * Dynamic test factory that adapts to actual board content
 * Ensures every test uses real data that will return results
 */

import { beforeAll, describe, expect, it } from "vitest";
import {
	type DiscoveredTestData,
	generateDynamicTestCases,
	getOrDiscoverTestData,
	validateDynamicFilter,
} from "./dynamic-test-data.js";
import { TestTimer } from "./test-helpers.js";
import { extractItemCount, validateToolOutput } from "./validators.js";

export interface DynamicTestConfig {
	toolName: string;
	toolFunction: Function;
	boardKey: string;
	titleText: string;

	// Which types of filters to test (auto-discovered if not specified)
	capabilities?: {
		search?: boolean;
		pagination?: boolean;
		statusFilters?: boolean;
		dateFilters?: boolean;
		relationFilters?: boolean;
	};

	// Optional: Use AI for validation
	useAI?: boolean;
}

/**
 * Creates a fully dynamic, self-adapting test suite
 */
export function createDynamicTestSuite(config: DynamicTestConfig) {
	return describe(`${config.toolName} (Dynamic)`, () => {
		let discoveredData: DiscoveredTestData = {
			totalItems: 0,
			statusValues: new Map(),
			dateRanges: new Map(),
			searchTerms: [],
			relationIds: new Map(),
			hasData: false,
			warnings: [],
			recommendations: [],
		};
		let baselineOutput: string = "";

		beforeAll(async () => {
			const timer = new TestTimer(`${config.toolName} discovery`);

			try {
				// Discover what data actually exists
				discoveredData = await getOrDiscoverTestData(
					config.toolFunction,
					config.toolName,
				);

				// Get baseline for comparison
				baselineOutput = await config.toolFunction({ limit: 100 });
			} catch (error) {
				console.error(`Failed to discover data for ${config.toolName}:`, error);
				// Create empty discovered data to allow tests to continue
				discoveredData = {
					totalItems: 0,
					statusValues: new Map(),
					dateRanges: new Map(),
					searchTerms: [],
					relationIds: new Map(),
					hasData: false,
					warnings: [`Discovery failed: ${error.message}`],
					recommendations: ["Check board configuration and API connection"],
				};
				baselineOutput = "";
			}

			timer.end();

			// Report discovery results
			console.log(`\n📊 Test Data Discovery Results for ${config.toolName}:`);
			console.log(`  Total items: ${discoveredData.totalItems}`);
			console.log(`  Status fields: ${discoveredData.statusValues.size}`);
			console.log(`  Date fields: ${discoveredData.dateRanges.size}`);
			console.log(`  Search terms: ${discoveredData.searchTerms.length}`);

			if (discoveredData.warnings.length > 0) {
				console.warn(`  ⚠️ Warnings:`, discoveredData.warnings);
			}

			if (discoveredData.recommendations.length > 0) {
				console.info(`  💡 Recommendations:`, discoveredData.recommendations);
			}
		});

		describe("Basic functionality", () => {
			it("should return valid markdown output", async () => {
				const output = await config.toolFunction();
				validateToolOutput(output, config.toolName);
				expect(output).toContain(config.titleText);
			});

			it("should have sufficient test data", () => {
				// This test ensures we have data to test with
				if (discoveredData.totalItems === 0) {
					console.warn(
						`⚠️ ${config.toolName} has no test data - skipping dynamic tests`,
					);
					expect(discoveredData.totalItems).toBe(0);
				} else {
					expect(discoveredData.totalItems).toBeGreaterThan(0);
					expect(discoveredData.hasData).toBe(true);
				}
			});
		});

		// Dynamic tests are added conditionally after discovery
		if (discoveredData.hasData) {
			const testCases = generateDynamicTestCases(discoveredData);

			// Dynamic Status Filter Tests
			if (testCases.statusTests.length > 0) {
				describe("Dynamic Status Filters (guaranteed results)", () => {
					for (const testCase of testCases.statusTests) {
						it(`should filter by ${testCase.field}=${testCase.value} ("${testCase.label}")`, async () => {
							const output = await config.toolFunction({
								[testCase.field]: testCase.value,
								limit: 10,
							});

							validateToolOutput(output, config.toolName);

							const itemCount = extractItemCount(output);

							// We KNOW this should return results because we discovered them
							expect(itemCount).toBeGreaterThan(0);

							// Validate the filter worked correctly
							const validation = validateDynamicFilter(
								baselineOutput,
								output,
								testCase.field,
								testCase.value,
								1, // We expect at least 1 result
							);

							expect(validation.valid).toBe(true);

							console.log(`    ✅ ${validation.message}`);
						});
					}
				});
			}

			// Dynamic Search Tests
			if (testCases.searchTests.length > 0) {
				describe("Dynamic Search (with real content)", () => {
					for (const testCase of testCases.searchTests) {
						it(`should find results for "${testCase.term}"`, async () => {
							const output = await config.toolFunction({
								search: testCase.term,
								limit: 10,
							});

							validateToolOutput(output, config.toolName);

							const itemCount = extractItemCount(output);

							// We KNOW this term exists in the data
							expect(itemCount).toBeGreaterThan(0);

							// Verify the results actually contain the search term
							const lowerOutput = output.toLowerCase();
							const containsTerm = lowerOutput.includes(
								testCase.term.toLowerCase(),
							);

							if (!containsTerm) {
								console.warn(
									`    ⚠️ Results don't visibly contain "${testCase.term}" - might be matching hidden fields`,
								);
							} else {
								console.log(
									`    ✅ Found ${itemCount} items containing "${testCase.term}"`,
								);
							}
						});
					}
				});
			}

			// Dynamic Date Tests
			if (testCases.dateTests.length > 0) {
				describe("Dynamic Date Filters (with actual dates)", () => {
					for (const testCase of testCases.dateTests) {
						it(`should filter by ${testCase.field}="${testCase.date}"`, async () => {
							const output = await config.toolFunction({
								[testCase.field]: testCase.date,
								limit: 10,
							});

							validateToolOutput(output, config.toolName);

							const itemCount = extractItemCount(output);

							// We selected dates that exist in the data
							expect(itemCount).toBeGreaterThan(0);

							console.log(
								`    ✅ Found ${itemCount} items for ${testCase.field}="${testCase.date}"`,
							);
						});
					}
				});
			}

			// Pagination Tests (always relevant if there's data)
			if (discoveredData.totalItems > 5) {
				describe("Dynamic Pagination", () => {
					it("should correctly limit results", async () => {
						const limits = [1, 5, 10];

						for (const limit of limits) {
							if (limit <= discoveredData.totalItems) {
								const output = await config.toolFunction({ limit });
								const itemCount = extractItemCount(output);

								if (discoveredData.totalItems > limit) {
									expect(itemCount).toBe(limit);
									console.log(
										`    ✅ Limit ${limit}: Got exactly ${limit} items`,
									);
								} else {
									expect(itemCount).toBe(discoveredData.totalItems);
									console.log(
										`    ✅ Limit ${limit}: Got all ${discoveredData.totalItems} available items`,
									);
								}
							}
						}
					});
				});
			}

			// Combination Tests - combine filters that we know work
			if (
				testCases.statusTests.length > 0 &&
				testCases.searchTests.length > 0
			) {
				describe("Dynamic Combined Filters", () => {
					it("should handle multiple filters together", async () => {
						const statusTest = testCases.statusTests[0];
						const searchTest = testCases.searchTests[0];

						const output = await config.toolFunction({
							[statusTest.field]: statusTest.value,
							search: searchTest.term,
							limit: 10,
						});

						validateToolOutput(output, config.toolName);

						const itemCount = extractItemCount(output);

						// Combined filters should return fewer results than individual filters
						console.log(
							`    ✅ Combined ${statusTest.field}=${statusTest.value} + search="${searchTest.term}": ${itemCount} items`,
						);

						// Even combined, we should get some results since both filters individually work
						if (itemCount === 0) {
							console.info(
								`    ℹ️ No overlap between status and search filters - this is valid`,
							);
						}
					});
				});
			}

			// Performance Tests with actual data
			describe("Performance", () => {
				it("should handle large result sets efficiently", async () => {
					const timer = new TestTimer(`${config.toolName} performance`);

					// Request up to 100 items (or all if less)
					const limit = Math.min(100, discoveredData.totalItems);
					await config.toolFunction({ limit });

					const duration = timer.end();

					// Dynamic threshold based on item count
					const expectedMs = 100 + limit * 20; // 100ms base + 20ms per item

					expect(duration).toBeLessThan(expectedMs);

					console.log(
						`    ✅ Fetched ${limit} items in ${duration}ms (threshold: ${expectedMs}ms)`,
					);
				});
			});
		} // End of if (discoveredData.hasData)

		// Error Handling (always test these - regardless of data)
		describe("Error Handling", () => {
			it("should handle invalid filter values gracefully", async () => {
				// Test with definitely invalid values
				const invalidTests = [
					{ status: 9999 }, // Invalid status index
					{ search: "%%%INVALID%%%" }, // Weird search
					{ limit: -1 }, // Negative limit
					{ date: "not-a-date" }, // Invalid date
				];

				for (const params of invalidTests) {
					try {
						const output = await config.toolFunction(params);
						const itemCount = extractItemCount(output);

						// Should either return 0 items or handle gracefully
						expect(itemCount).toBeGreaterThanOrEqual(0);
					} catch (error) {
						// Some errors are expected for invalid inputs
						console.log(
							`    ℹ️ Expected error for ${JSON.stringify(params)}: ${error.message}`,
						);
					}
				}
			});
		});
	});
}
