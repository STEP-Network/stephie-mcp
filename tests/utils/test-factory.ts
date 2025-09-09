/**
 * Test factory for creating consistent test suites for all tools
 */

import { beforeAll, describe, expect, it } from "vitest";
import {
	type BaselineData,
	collectBaselineData,
	performTestHealthCheck,
	validateFilteringEffect,
	validatePaginationWithWarnings,
	validateRelationFilterEffect,
	validateSearchRelevance,
	validateStatusFilterResults,
} from "./smart-validators.js";
import { TestTimer } from "./test-helpers.js";
import { extractItemCount, validateToolOutput } from "./validators.js";

export interface ToolTestConfig {
	toolName: string;
	toolFunction: Function;
	boardKey: string;
	titleText: string; // e.g., "# Accounts"

	// Parameters the tool supports
	parameters: {
		search?: boolean;
		limit?: boolean;
		statusFields?: string[]; // e.g., ['status', 'status5']
		dateFields?: string[]; // e.g., ['date', 'created_at']
		relationFields?: Array<{
			param: string;
			relatedTool: string;
			relationName: string;
		}>;
		customFields?: Array<{
			param: string;
			type: "string" | "number" | "boolean";
			testValue: any;
		}>;
	};

	// Sample test data
	testData?: {
		validSearchTerms?: string[];
		validStatusValues?: number[];
		statusLabels?: string[]; // Labels corresponding to status values
		validDateValues?: string[];
	};
}

export function createToolTestSuite(config: ToolTestConfig) {
	return describe(config.toolName, () => {
		let baselineOutput: string;
		let baselineData: BaselineData;

		beforeAll(async () => {
			const timer = new TestTimer(`${config.toolName} baseline`);
			// Get more items for better baseline data
			baselineOutput = await config.toolFunction({ limit: 50 });
			timer.end();

			// Collect baseline metrics
			baselineData = collectBaselineData(baselineOutput);

			// Perform health check
			performTestHealthCheck(baselineData, config.toolName);
		});

		describe("Basic functionality", () => {
			it("should return valid markdown output", async () => {
				const output = await config.toolFunction();
				validateToolOutput(output, config.toolName);
			});

			it("should include required fields", async () => {
				const output = await config.toolFunction({ limit: 5 });

				expect(output).toContain(config.titleText);
				expect(output).toContain("**Total Items:**");

				const itemCount = extractItemCount(output);
				if (itemCount > 0) {
					expect(output).toContain("**ID:**");
				}
			});

			it("should handle empty results gracefully", async () => {
				const output = await config.toolFunction({
					search: "XXXXNONEXISTENTXXXX",
				});

				validateToolOutput(output, config.toolName);
				expect(extractItemCount(output)).toBe(0);
			});
		});

		if (config.parameters.limit) {
			describe("Pagination", () => {
				it("should respect limit parameter", async () => {
					const fullOutput = await config.toolFunction({ limit: 20 });
					const limitedOutput = await config.toolFunction({ limit: 5 });

					// Use smart pagination validation with warnings
					validatePaginationWithWarnings(fullOutput, limitedOutput, 5);
				});

				it("should handle limit edge cases", async () => {
					const outputs = await Promise.all([
						config.toolFunction({ limit: 1 }),
						config.toolFunction({ limit: 100 }),
						config.toolFunction({ limit: 200 }),
					]);

					outputs.forEach((output) => {
						validateToolOutput(output, config.toolName);
					});
				});
			});
		}

		if (config.parameters.search) {
			describe("Search functionality", () => {
				it("should filter by search term", async () => {
					const searchTerms = config.testData?.validSearchTerms || [
						"test",
						"demo",
					];

					for (const term of searchTerms) {
						const output = await config.toolFunction({
							search: term,
							limit: 10,
						});

						validateToolOutput(output, config.toolName);

						// Use smart validation
						validateSearchRelevance(output, term, baselineData);
						validateFilteringEffect(baselineOutput, output, "search", term);
					}
				});

				it("should handle special characters in search", async () => {
					const specialSearches = ["&", "%", "()"];

					for (const search of specialSearches) {
						const output = await config.toolFunction({ search, limit: 5 });
						validateToolOutput(output, config.toolName);
					}
				});
			});
		}

		if (
			config.parameters.statusFields &&
			config.parameters.statusFields.length > 0
		) {
			describe("Status filters", () => {
				for (const statusField of config.parameters.statusFields) {
					it(`should filter by ${statusField}`, async () => {
						const statusValues = config.testData?.validStatusValues || [
							0, 1, 2,
						];
						const statusLabels = config.testData?.statusLabels || [
							"New",
							"In Progress",
							"Done",
						];

						for (let i = 0; i < statusValues.length; i++) {
							const value = statusValues[i];
							const label = statusLabels[i] || `Status ${value}`;

							const output = await config.toolFunction({
								[statusField]: value,
								limit: 10,
							});

							validateToolOutput(output, config.toolName);

							// Smart validation with warnings
							validateStatusFilterResults(output, value, label, baselineData);
							validateFilteringEffect(
								baselineOutput,
								output,
								statusField,
								value,
							);
						}
					});
				}
			});
		}

		if (
			config.parameters.dateFields &&
			config.parameters.dateFields.length > 0
		) {
			describe("Date filters", () => {
				for (const dateField of config.parameters.dateFields) {
					it(`should filter by ${dateField}`, async () => {
						const dates = config.testData?.validDateValues || [
							"2024-01-01",
							"2024-06-15",
							new Date().toISOString().split("T")[0],
						];

						for (const date of dates) {
							const output = await config.toolFunction({
								[dateField]: date,
								limit: 5,
							});

							validateToolOutput(output, config.toolName);
						}
					});
				}
			});
		}

		if (
			config.parameters.relationFields &&
			config.parameters.relationFields.length > 0
		) {
			describe("Board relation filters", () => {
				for (const relation of config.parameters.relationFields) {
					it(`should filter by ${relation.param}`, async () => {
						// This would normally get a real ID from the related tool
						// For testing, we'll use a placeholder
						const testId = "1234567890";

						const output = await config.toolFunction({
							[relation.param]: testId,
							limit: 10,
						});

						validateToolOutput(output, config.toolName);

						// Smart validation for relation filters
						validateRelationFilterEffect(
							output,
							testId,
							relation.relationName,
							baselineData,
						);
						validateFilteringEffect(
							baselineOutput,
							output,
							relation.param,
							testId,
						);
					});
				}
			});
		}

		describe("Combined filters", () => {
			it("should handle multiple filters together", async () => {
				const params: any = { limit: 5 };

				// Add various filter types if supported
				if (config.parameters.search) {
					params.search = "a";
				}
				if (config.parameters.statusFields?.[0]) {
					params[config.parameters.statusFields[0]] = 0;
				}

				const output = await config.toolFunction(params);
				validateToolOutput(output, config.toolName);
			});
		});

		describe("Error handling", () => {
			it("should handle invalid values gracefully", async () => {
				const invalidTests = [];

				// Test invalid status values
				if (config.parameters.statusFields?.[0]) {
					invalidTests.push(
						config.toolFunction({ [config.parameters.statusFields[0]]: 999 }),
					);
				}

				// Test invalid date formats
				if (config.parameters.dateFields?.[0]) {
					invalidTests.push(
						config.toolFunction({
							[config.parameters.dateFields[0]]: "invalid-date",
						}),
					);
				}

				// Test invalid relation IDs
				if (config.parameters.relationFields?.[0]) {
					invalidTests.push(
						config.toolFunction({
							[config.parameters.relationFields[0].param]: "invalid-id",
						}),
					);
				}

				const results = await Promise.all(invalidTests);

				results.forEach((output) => {
					validateToolOutput(output, config.toolName);
					// Should return empty or handle gracefully
					expect(extractItemCount(output)).toBeGreaterThanOrEqual(0);
				});
			});

			it("should handle extremely large limits", async () => {
				// Monday.com caps at 500, so we need to handle this gracefully
				try {
					const output = await config.toolFunction({ limit: 10000 });
					validateToolOutput(output, config.toolName);
					// If it succeeds, check it's capped at 500
					expect(extractItemCount(output)).toBeLessThanOrEqual(500);
				} catch (error: any) {
					// Expected error for limits > 500
					expect(error).toBeDefined();
					expect(error.message).toContain("cannot be greater than 500");
				}
			});
		});

		describe("Performance", () => {
			it("should complete within reasonable time", async () => {
				const timer = new TestTimer(`${config.toolName} performance`);
				await config.toolFunction({ limit: 50 });
				const duration = timer.end();

				expect(duration).toBeLessThan(10000); // 10 seconds
			});

			it("should handle parallel requests", async () => {
				const timer = new TestTimer(`${config.toolName} parallel`);

				const requests = [config.toolFunction({ limit: 5 })];

				if (config.parameters.search) {
					requests.push(config.toolFunction({ search: "test", limit: 5 }));
				}

				if (config.parameters.statusFields?.[0]) {
					requests.push(
						config.toolFunction({
							[config.parameters.statusFields[0]]: 0,
							limit: 5,
						}),
					);
				}

				const results = await Promise.all(requests);
				timer.end();

				results.forEach((output) => {
					validateToolOutput(output, config.toolName);
				});
			});
		});
	});
}
