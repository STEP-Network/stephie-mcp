#!/usr/bin/env tsx
/**
 * Quick test runner for individual tools
 * Usage: pnpm test:quick getAccounts
 */

import { config } from "dotenv";

config({ path: ".env.local" });

import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runQuickTest(toolName: string) {
	console.log(`🧪 Quick testing ${toolName}...\n`);

	// Map tool name to test file
	const toolMap: Record<string, string> = {
		// CRM
		getAccounts: "crm/getAccounts",
		getContacts: "crm/getContacts",
		getLeads: "crm/getLeads",

		// Sales
		getOpportunities: "sales/getOpportunities",
		getSalesActivities: "sales/getSalesActivities",
		getBookings: "operations/getBookings",
		getDeals: "operations/getDeals",

		// Tasks
		getTasksTechIntelligence: "tasks/getTasksTechIntelligence",
		getTasksAdOps: "tasks/getTasksAdOps",
		getTasksMarketing: "tasks/getTasksMarketing",

		// HR
		getPeople: "hr/getPeople",
		getTeams: "hr/getTeams",

		// Strategy
		getOKR: "strategy/getOKR",

		// Support
		getTickets: "support/getTickets",

		// Dev
		getBugs: "dev/getBugs",
		getFeatures: "dev/getFeatures",

		// Finance
		getMarketingBudgets: "finance/getMarketingBudgets",
		getMarketingExpenses: "finance/getMarketingExpenses",
	};

	const testPath = toolMap[toolName];
	if (!testPath) {
		console.error(`❌ Unknown tool: ${toolName}`);
		console.log("\nAvailable tools:");
		Object.keys(toolMap).forEach((tool) => console.log(`  - ${tool}`));
		process.exit(1);
	}

	// Import and run the test
	try {
		// Run basic validation without importing test file
		const toolModule = await import(`../lib/tools/${testPath}.js`);
		const toolFunction = toolModule[toolName];

		if (!toolFunction) {
			throw new Error(`Tool function ${toolName} not found in module`);
		}

		console.log("\n📝 Running basic validation...");

		// Test 1: No parameters
		console.log("  - Testing with no parameters...");
		const result1 = await toolFunction({});
		if (!result1 || !result1.includes("#")) {
			throw new Error("Tool should return markdown with headers");
		}
		console.log("    ✅ Passed");

		// Test 2: With limit
		console.log("  - Testing with limit parameter...");
		const result2 = await toolFunction({ limit: 5 });
		if (!result2.includes("**Total")) {
			throw new Error("Tool should include total count");
		}
		console.log("    ✅ Passed");

		// Test 3: With search
		console.log("  - Testing with search parameter...");
		const result3 = await toolFunction({ search: "test", limit: 5 });
		if (!result3) {
			throw new Error("Tool should handle search parameter");
		}
		console.log("    ✅ Passed");

		console.log(`\n✅ All basic tests passed for ${toolName}`);
	} catch (error) {
		console.error(`\n❌ Test failed for ${toolName}:`, error);
		process.exit(1);
	}
}

// Main
const toolName = process.argv[2];
if (!toolName) {
	console.error("❌ Please specify a tool name");
	console.log("Usage: pnpm test:quick <toolName>");
	console.log("Example: pnpm test:quick getAccounts");
	process.exit(1);
}

runQuickTest(toolName).catch(console.error);
