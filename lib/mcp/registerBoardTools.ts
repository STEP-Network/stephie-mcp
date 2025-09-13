import * as fs from "node:fs";
import * as path from "node:path";
import { z } from "zod";

// Load board tool definitions
const boardToolDefinitions = JSON.parse(
	fs.readFileSync(path.join(__dirname, "boardToolDefinitions.json"), "utf-8"),
);

import { getOKR } from "../tools/business/getOKR.js";
import { getAccounts } from "../tools/crm/getAccounts.js";
import { getContacts } from "../tools/crm/getContacts.js";
import { getLeads } from "../tools/crm/getLeads.js";
import { getMarketingBudgets } from "../tools/marketing/getMarketingBudgets.js";
import { getMarketingExpenses } from "../tools/marketing/getMarketingExpenses.js";
import { getBookings } from "../tools/sales/getBookings.js";
import { getDeals } from "../tools/sales/getDeals.js";
import { getOpportunities } from "../tools/sales/getOpportunities.js";
import { getSalesActivities } from "../tools/sales/getSalesActivities.js";
import { getInternalAdOpsAdTech } from "../tools/support/getInternalAdOpsAdTech.js";
import { getInternalAdSales } from "../tools/support/getInternalAdSales.js";
import { getPublisherFAQ } from "../tools/support/getPublisherFAQ.js";
import { getTickets } from "../tools/support/getTickets.js";
import { getTasksAdOps } from "../tools/tasks/getTasksAdOps.js";
import { getTasksAdTech } from "../tools/tasks/getTasksAdTech.js";
import { getTasksMarketing } from "../tools/tasks/getTasksMarketing.js";
import { getTasksTechIntelligence } from "../tools/tasks/getTasksTechIntelligence.js";
import { getTasksVideo } from "../tools/tasks/getTasksVideo.js";
import { getTasksYieldGrowth } from "../tools/tasks/getTasksYieldGrowth.js";

// Map tool names to their implementations
const BOARD_TOOL_IMPLEMENTATIONS: Record<string, Function> = {
	getAccounts,
	getBookings,
	getContacts,
	getDeals,
	getInternalAdOpsAdTech,
	getInternalAdSales,
	getLeads,
	getMarketingBudgets,
	getMarketingExpenses,
	getOKR,
	getOpportunities,
	getPublisherFAQ,
	getSalesActivities,
	getTasksAdOps,
	getTasksAdTech,
	getTasksMarketing,
	getTasksTechIntelligence,
	getTasksVideo,
	getTasksYieldGrowth,
	getTickets,
};

/**
 * Register all board-specific tools with the MCP server
 */
export function registerBoardTools(server: any) {
	boardToolDefinitions.forEach((toolDef: any) => {
		const implementation = BOARD_TOOL_IMPLEMENTATIONS[toolDef.name];

		if (!implementation) {
			console.error(
				`Warning: No implementation found for tool ${toolDef.name}`,
			);
			return;
		}

		// Build Zod schema from the tool definition
		const schemaProperties: Record<string, any> = {};

		Object.entries(toolDef.inputSchema.properties).forEach(
			([key, prop]: [string, any]) => {
				if (prop.type === "number") {
					schemaProperties[key] =
						prop.default !== undefined
							? z.number().default(prop.default).optional()
							: z.number().optional();
				} else if (prop.type === "boolean") {
					schemaProperties[key] = z.boolean().optional();
				} else {
					schemaProperties[key] = z.string().optional();
				}
			},
		);

		// Register the tool
		server.tool(
			toolDef.name,
			toolDef.description,
			schemaProperties,
			async (input: any) => {
				try {
					const result = await implementation(input);
					return {
						content: [
							{
								type: "text",
								text:
									typeof result === "string"
										? result
										: JSON.stringify(result, null, 2),
							},
						],
					};
				} catch (error) {
					console.error(`Error in ${toolDef.name}:`, error);
					throw error;
				}
			},
		);
	});

	console.error(
		`Registered ${boardToolDefinitions.length} board-specific tools`,
	);
}

// Export tool definitions for reference
export { boardToolDefinitions };
