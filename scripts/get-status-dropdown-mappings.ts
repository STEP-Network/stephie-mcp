#!/usr/bin/env npx tsx
/**
 * Get all status and dropdown column mappings for tool documentation
 */

import { config } from "dotenv";
import { mondayApi } from "../lib/monday/client.js";

config({ path: ".env.local" });

// Board IDs with their tools
const BOARDS_WITH_STATUS_DROPDOWNS = [
	{
		boardId: "1625485665",
		name: "Accounts",
		tool: "getAccounts",
		columns: ["status", "status5"],
	},
	{
		boardId: "1432155906",
		name: "Ad Prices",
		tool: "getAllAdPrices",
		columns: ["status0__1"],
	},
	{
		boardId: "1631907569",
		name: "Tasks - Tech & Intelligence",
		tool: "getTasksTechIntelligence",
		columns: ["status_19__1", "type_1__1", "priority_1__1"],
	},
	{ boardId: "7656822652", name: "OKR", tool: "getOKR", columns: ["status"] },
	{
		boardId: "2052093089",
		name: "Deals",
		tool: "getDeals",
		columns: ["status"],
	},
	{
		boardId: "2052066178",
		name: "Tickets",
		tool: "getTickets",
		columns: ["status", "priority"],
	},
	{
		boardId: "1625485770",
		name: "Contacts",
		tool: "getContacts",
		columns: ["status"],
	},
	{
		boardId: "1625485883",
		name: "Leads",
		tool: "getLeads",
		columns: ["status", "source"],
	},
	{
		boardId: "1625486052",
		name: "Opportunities",
		tool: "getOpportunities",
		columns: ["status", "stage"],
	},
	{
		boardId: "1625486178",
		name: "Sales Activities",
		tool: "getSalesActivities",
		columns: ["type", "status"],
	},
	{
		boardId: "2052117335",
		name: "Internal Ad Sales",
		tool: "getInternalAdSales",
		columns: ["status"],
	},
	{
		boardId: "1634026455",
		name: "Tasks - AdOps",
		tool: "getTasksAdOps",
		columns: ["status", "priority"],
	},
	{
		boardId: "1638451479",
		name: "Tasks - Marketing",
		tool: "getTasksMarketing",
		columns: ["status", "priority"],
	},
	{
		boardId: "1638451674",
		name: "Tasks - AdTech",
		tool: "getTasksAdTech",
		columns: ["status", "priority"],
	},
	{
		boardId: "1678106653",
		name: "Tasks - Video",
		tool: "getTasksVideo",
		columns: ["status"],
	},
	{
		boardId: "1678107008",
		name: "Tasks - Yield & Growth",
		tool: "getTasksYieldGrowth",
		columns: ["status", "priority"],
	},
	{
		boardId: "1640244893",
		name: "Bugs",
		tool: "getBugs",
		columns: ["status", "priority", "severity"],
	},
	{
		boardId: "1640244965",
		name: "Features",
		tool: "getFeatures",
		columns: ["status", "priority"],
	},
	{
		boardId: "1640245006",
		name: "Tests",
		tool: "getTests",
		columns: ["status", "result"],
	},
	{
		boardId: "1902950322",
		name: "Partners",
		tool: "getPartners",
		columns: ["type", "status"],
	},
	{
		boardId: "2052222319",
		name: "Strategies",
		tool: "getStrategies",
		columns: ["status"],
	},
	{
		boardId: "2054670440",
		name: "Vertikaler",
		tool: "getVertikaler",
		columns: ["status"],
	},
	{
		boardId: "2052093178",
		name: "Marketing Expenses",
		tool: "getMarketingExpenses",
		columns: ["category", "status"],
	},
	{
		boardId: "2052093269",
		name: "Internal AdOps & AdTech",
		tool: "getInternalAdOpsAdTech",
		columns: ["category", "status"],
	},
	{
		boardId: "2052093359",
		name: "Publisher FAQ",
		tool: "getPublisherFAQ",
		columns: ["category", "status"],
	},
	{
		boardId: "2052093449",
		name: "OTT Publishers",
		tool: "getOTTPublishers",
		columns: ["platform", "status"],
	},
];

async function getColumnMappings() {
	const allMappings: Record<string, any> = {};

	for (const board of BOARDS_WITH_STATUS_DROPDOWNS) {
		console.log(`\n📋 Processing ${board.name} (${board.boardId})...`);

		const query = `
      query {
        boards(ids: [${board.boardId}]) {
          columns {
            id
            title
            type
            settings_str
          }
        }
      }
    `;

		try {
			const response = await mondayApi(query);
			const columns = response.data?.boards?.[0]?.columns || [];

			const boardMappings: Record<string, any> = {};

			for (const columnId of board.columns) {
				const column = columns.find((c: any) => c.id === columnId);
				if (
					column &&
					(column.type === "status" || column.type === "dropdown")
				) {
					const settings = JSON.parse(column.settings_str);
					const labels = settings.labels || {};

					// Create index to label mapping
					const indexMapping: Record<number, string> = {};
					for (const [index, label] of Object.entries(labels)) {
						indexMapping[parseInt(index, 10)] = label as string;
					}

					boardMappings[columnId] = {
						title: column.title,
						type: column.type,
						mapping: indexMapping,
					};

					console.log(`  ✅ ${columnId} (${column.title}):`);
					for (const [index, label] of Object.entries(indexMapping)) {
						console.log(`     ${index}: ${label}`);
					}
				}
			}

			if (Object.keys(boardMappings).length > 0) {
				allMappings[board.tool] = {
					boardName: board.name,
					boardId: board.boardId,
					columns: boardMappings,
				};
			}
		} catch (error) {
			console.error(`  ❌ Error processing ${board.name}:`, error);
		}
	}

	// Output as JSON for easy use
	console.log("\n\n📊 ALL MAPPINGS (JSON):");
	console.log(JSON.stringify(allMappings, null, 2));

	return allMappings;
}

// Run the script
getColumnMappings().catch(console.error);
