import * as fs from "node:fs";
import * as path from "node:path";
import { z } from "zod";

// Load board tool definitions
const boardToolDefinitions = JSON.parse(
	fs.readFileSync(path.join(__dirname, "boardToolDefinitions.json"), "utf-8"),
);

import { getTeamMembers } from "../tools/business/getTeamMembers.js";
import { getAllProducts } from "../tools/business/getAllProducts.js";
import { getAllFormats } from "../tools/business/getAllFormats.js";
import { getAllAdPrices } from "../tools/business/getAllAdPrices.js";
import { getStrategies } from "../tools/business/getStrategies.js";
import { getTeams } from "../tools/business/getTeams.js";
import { getVertikaler } from "../tools/business/getVertikaler.js";
import { getOKR } from "../tools/business/getOKR.js";
import { createOKR } from "../tools/business/createOKR.js";
import { updateOKR } from "../tools/business/updateOKR.js";
import { getBugs } from "../tools/development/getBugs.js";
import { getChangelog } from "../tools/development/getChangelog.js";
import { getFeatures } from "../tools/development/getFeatures.js";
import { getTests } from "../tools/development/getTests.js";
import { createBug } from "../tools/development/createBug.js";
import { updateBug } from "../tools/development/updateBug.js";
import { getOTTPublisherDetails } from "../tools/publishers/getOTTPublisherDetails.js";
import { getAllPublishers } from "../tools/publishers/getAllPublishers.js";
import { getPublisherFormats } from "../tools/publishers/getPublisherFormats.js";
import { getPublishersByFormats } from "../tools/publishers/getPublishersByFormats.js";
import { getAccounts } from "../tools/crm/getAccounts.js";
import { getContacts } from "../tools/crm/getContacts.js";
import { getLeads } from "../tools/crm/getLeads.js";
import { createAccount } from "../tools/crm/createAccount.js";
import { updateAccount } from "../tools/crm/updateAccount.js";
import { createContact } from "../tools/crm/createContact.js";
import { updateContact } from "../tools/crm/updateContact.js";
import { createLead } from "../tools/crm/createLead.js";
import { updateLead } from "../tools/crm/updateLead.js";
import { getMarketingBudgets } from "../tools/marketing/getMarketingBudgets.js";
import { getMarketingExpenses } from "../tools/marketing/getMarketingExpenses.js";
import { getBookings } from "../tools/sales/getBookings.js";
import { getDeals } from "../tools/sales/getDeals.js";
import { getOpportunities } from "../tools/sales/getOpportunities.js";
import { getSalesActivities } from "../tools/sales/getSalesActivities.js";
import { createOpportunity } from "../tools/sales/createOpportunity.js";
import { updateOpportunity } from "../tools/sales/updateOpportunity.js";
import { createSalesActivity } from "../tools/sales/createSalesActivity.js";
import { updateSalesActivity } from "../tools/sales/updateSalesActivity.js";
import { createDeal } from "../tools/sales/createDeal.js";
import { updateDeal } from "../tools/sales/updateDeal.js";
import { getTickets } from "../tools/support/getTickets.js";
import { createTicket } from "../tools/support/createTicket.js";
import { updateTicket } from "../tools/support/updateTicket.js";
import { getTasksAdOps } from "../tools/tasks/getTasksAdOps.js";
import { getTasksAdTech } from "../tools/tasks/getTasksAdTech.js";
import { getTasksMarketing } from "../tools/tasks/getTasksMarketing.js";
import { getTasksTechIntelligence } from "../tools/tasks/getTasksTechIntelligence.js";
import { getTasksVideo } from "../tools/tasks/getTasksVideo.js";
import { getTasksYieldGrowth } from "../tools/tasks/getTasksYieldGrowth.js";
import { createTaskAdOps } from "../tools/tasks/createTaskAdOps.js";
import { updateTaskAdOps } from "../tools/tasks/updateTaskAdOps.js";
import { createTaskMarketing } from "../tools/tasks/createTaskMarketing.js";
import { updateTaskMarketing } from "../tools/tasks/updateTaskMarketing.js";
import { createTaskAdTech } from "../tools/tasks/createTaskAdTech.js";
import { updateTaskAdTech } from "../tools/tasks/updateTaskAdTech.js";
import { createTaskVideo } from "../tools/tasks/createTaskVideo.js";
import { updateTaskVideo } from "../tools/tasks/updateTaskVideo.js";
import { createTaskYieldGrowth } from "../tools/tasks/createTaskYieldGrowth.js";
import { updateTaskYieldGrowth } from "../tools/tasks/updateTaskYieldGrowth.js";
import { createTasksTechIntelligence } from "../tools/tasks/createTasksTechIntelligence.js";
import { updateTasksTechIntelligence } from "../tools/tasks/updateTasksTechIntelligence.js";
// Additional imports for missing tools
import { availabilityForecast } from "../tools/availabilityForecast.js";
import { getAllSizes } from "../tools/targeting/getAllSizes.js";
import { getAllPlacements } from "../tools/targeting/getAllPlacements.js";
import { getTargetingKeys } from "../tools/targeting/getTargetingKeys.js";
import { getTargetingValues } from "../tools/targeting/getTargetingValues.js";
import { getAudienceSegments } from "../tools/targeting/getAudienceSegments.js";
import { getGeoLocations } from "../tools/targeting/getGeoLocations.js";
import { getContextualTargeting } from "../tools/targeting/getContextualTargeting.js";
import { findPublisherAdUnits } from "../tools/targeting/findPublisherAdUnits.js";
import { getBoardColumns } from "../tools/debug/getBoardColumns.js";
import { getItems } from "../tools/debug/getItems.js";
import { listAllBoards } from "../tools/debug/listBoards.js";
import { search } from "../tools/chatgpt/search.js";
import { fetch } from "../tools/chatgpt/fetch.js";

// Map tool names to their implementations
const BOARD_TOOL_IMPLEMENTATIONS: Record<string, Function> = {
	// Business tools
	getAllProducts,
	getAllFormats,
	getAllAdPrices,
	getTeamMembers,
	getTeams,
	getStrategies,
	getVertikaler,
	getOKR,
	createOKR,
	updateOKR,
	// Development tools
	getBugs,
	getChangelog,
	getFeatures,
	getTests,
	createBug,
	updateBug,
	// Publisher tools
	getAllPublishers,
	getOTTPublisherDetails,
	getPublisherFormats,
	getPublishersByFormats,
	// CRM tools
	getAccounts,
	getContacts,
	getLeads,
	createAccount,
	updateAccount,
	createContact,
	updateContact,
	createLead,
	updateLead,
	// Sales tools
	getBookings,
	getDeals,
	getOpportunities,
	getSalesActivities,
	createOpportunity,
	updateOpportunity,
	createSalesActivity,
	updateSalesActivity,
	createDeal,
	updateDeal,
	// Marketing tools
	getMarketingBudgets,
	getMarketingExpenses,
	// Support tools
	getTickets,
	createTicket,
	updateTicket,
	// Task tools
	getTasksAdOps,
	getTasksAdTech,
	getTasksMarketing,
	getTasksTechIntelligence,
	getTasksVideo,
	getTasksYieldGrowth,
	createTaskAdOps,
	updateTaskAdOps,
	createTaskMarketing,
	updateTaskMarketing,
	createTaskAdTech,
	updateTaskAdTech,
	createTaskVideo,
	updateTaskVideo,
	createTaskYieldGrowth,
	updateTaskYieldGrowth,
	createTasksTechIntelligence,
	updateTasksTechIntelligence,
	// Targeting tools
	getAllSizes,
	getAllPlacements,
	getTargetingKeys,
	getTargetingValues,
	getAudienceSegments,
	getGeoLocations,
	getContextualTargeting,
	findPublisherAdUnits,
	// Forecast tools
	availabilityForecast,
	// Debug tools
	getBoardColumns,
	getItems,
	listAllBoards,
	listBoards: listAllBoards, // Alias for compatibility
	// ChatGPT tools
	search,
	fetch,
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
