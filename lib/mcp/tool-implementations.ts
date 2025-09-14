/**
 * Centralized tool implementations map for both mcp-server.ts and api/server.ts
 * This ensures consistency between local MCP and Vercel deployments
 */

import { getAllPublishers } from "../tools/publishers/getAllPublishers.js";
import { getOTTPublisherDetails } from "../tools/publishers/getOTTPublisherDetails.js";
import { getAllProducts } from "../tools/business/getAllProducts.js";
import { getAllFormats } from "../tools/business/getAllFormats.js";
import { getAllSizes } from "../tools/targeting/getAllSizes.js";
import { getAllAdPrices } from "../tools/business/getAllAdPrices.js";
import { getAllPlacements } from "../tools/targeting/getAllPlacements.js";
import { getTeamMembers } from "../tools/business/getTeamMembers.js";
import { getStrategies } from "../tools/business/getStrategies.js";
import { getTeams } from "../tools/business/getTeams.js";
import { getVertikaler } from "../tools/business/getVertikaler.js";
import { availabilityForecast } from "../tools/availabilityForecast.js";
import { getPublisherFormats } from "../tools/publishers/getPublisherFormats.js";
import { getPublishersByFormats } from "../tools/publishers/getPublishersByFormats.js";
import { findPublisherAdUnits } from "../tools/targeting/findPublisherAdUnits.js";
import { getTargetingKeys } from "../tools/targeting/getTargetingKeys.js";
import { getTargetingValues } from "../tools/targeting/getTargetingValues.js";
import { getAudienceSegments } from "../tools/targeting/getAudienceSegments.js";
import { getGeoLocations } from "../tools/targeting/getGeoLocations.js";
import { getContextualTargeting } from "../tools/targeting/getContextualTargeting.js";
import { getAccounts } from "../tools/crm/getAccounts.js";
import { getContacts } from "../tools/crm/getContacts.js";
import { getLeads } from "../tools/crm/getLeads.js";
import { createAccount } from "../tools/crm/createAccount.js";
import { updateAccount } from "../tools/crm/updateAccount.js";
import { createContact } from "../tools/crm/createContact.js";
import { updateContact } from "../tools/crm/updateContact.js";
import { createLead } from "../tools/crm/createLead.js";
import { updateLead } from "../tools/crm/updateLead.js";
import { getBoardColumns } from "../tools/debug/getBoardColumns.js";
import { getItems } from "../tools/debug/getItems.js";
import { listAllBoards } from "../tools/debug/listBoards.js";
import { getOpportunities } from "../tools/sales/getOpportunities.js";
import { getSalesActivities } from "../tools/sales/getSalesActivities.js";
import { getDeals } from "../tools/sales/getDeals.js";
import { createOpportunity } from "../tools/sales/createOpportunity.js";
import { updateOpportunity } from "../tools/sales/updateOpportunity.js";
import { createSalesActivity } from "../tools/sales/createSalesActivity.js";
import { updateSalesActivity } from "../tools/sales/updateSalesActivity.js";
import { createDeal } from "../tools/sales/createDeal.js";
import { updateDeal } from "../tools/sales/updateDeal.js";
import { getTasksAdOps } from "../tools/tasks/getTasksAdOps.js";
import { getTasksMarketing } from "../tools/tasks/getTasksMarketing.js";
import { getTasksAdTech } from "../tools/tasks/getTasksAdTech.js";
import { getTasksVideo } from "../tools/tasks/getTasksVideo.js";
import { getTasksYieldGrowth } from "../tools/tasks/getTasksYieldGrowth.js";
import { getTasksTechIntelligence } from "../tools/tasks/getTasksTechIntelligence.js";
import { createTasksTechIntelligence } from "../tools/tasks/createTasksTechIntelligence.js";
import { updateTasksTechIntelligence } from "../tools/tasks/updateTasksTechIntelligence.js";
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
import { getBugs } from "../tools/development/getBugs.js";
import { getChangelog } from "../tools/development/getChangelog.js";
import { getFeatures } from "../tools/development/getFeatures.js";
import { getTests } from "../tools/development/getTests.js";
import { createBug } from "../tools/development/createBug.js";
import { updateBug } from "../tools/development/updateBug.js";
import { getMarketingBudgets } from "../tools/marketing/getMarketingBudgets.js";
import { getMarketingExpenses } from "../tools/marketing/getMarketingExpenses.js";
import { getOKR } from "../tools/business/getOKR.js";
import { createOKR } from "../tools/business/createOKR.js";
import { updateOKR } from "../tools/business/updateOKR.js";
import { getBookings } from "../tools/sales/getBookings.js";
import { getTickets } from "../tools/support/getTickets.js";
import { createTicket } from "../tools/support/createTicket.js";
import { updateTicket } from "../tools/support/updateTicket.js";
import { search } from "../tools/chatgpt/search.js";
import { fetch } from "../tools/chatgpt/fetch.js";

/**
 * Centralized tool implementations map
 * Used by both mcp-server.ts (McpServer) and api/server.ts (mcp-handler)
 */
export const toolImplementations: Record<string, (args: any) => Promise<string | Record<string, unknown>>> = {
	// ChatGPT required tools
	search: (args) => search(args),
	fetch: (args) => fetch(args),
	// Standard tools
	getAllPublishers: () => getAllPublishers(),
	getOTTPublisherDetails: () => getOTTPublisherDetails(),
	getAllProducts: () => getAllProducts(),
	getAllFormats: () => getAllFormats(),
	getAllSizes: () => getAllSizes(),
	getAllAdPrices: () => getAllAdPrices(),
	getAllPlacements: () => getAllPlacements(),
	getTeamMembers: () => getTeamMembers(),
	getStrategies: () => getStrategies(),
	getTeams: () => getTeams(),
	getVertikaler: () => getVertikaler(),
	getTasksTechIntelligence: () => getTasksTechIntelligence(),
	availabilityForecast: (args) => availabilityForecast(args),
	getPublisherFormats: (args) => getPublisherFormats(args),
	getPublishersByFormats: (args) => getPublishersByFormats(args),
	findPublisherAdUnits: (args) => findPublisherAdUnits(args),
	getTargetingKeys: () => getTargetingKeys(),
	getTargetingValues: (args) => getTargetingValues(args),
	getAudienceSegments: (args) => getAudienceSegments(args),
	getGeoLocations: (args) => getGeoLocations(args),
	getContextualTargeting: (args) => getContextualTargeting(args),
	getAccounts: (args) => getAccounts(args),
	getContacts: (args) => getContacts(args),
	getLeads: (args) => getLeads(args),
	createAccount: (args) => createAccount(args as any),
	updateAccount: (args) => updateAccount(args as any),
	createContact: (args) => createContact(args as any),
	updateContact: (args) => updateContact(args as any),
	createLead: (args) => createLead(args as any),
	updateLead: (args) => updateLead(args as any),
	getBoardColumns: (args) => getBoardColumns(args),
	getItems: (args) => getItems(args),
	listAllBoards: (_args) => listAllBoards(),
	listBoards: (_args) => listAllBoards(), // Alias for compatibility
	getOpportunities: (args) => getOpportunities(args),
	getSalesActivities: (args) => getSalesActivities(args),
	getDeals: (args) => getDeals(args),
	createOpportunity: (args) => createOpportunity(args as any),
	updateOpportunity: (args) => updateOpportunity(args as any),
	createSalesActivity: (args) => createSalesActivity(args as any),
	updateSalesActivity: (args) => updateSalesActivity(args as any),
	createDeal: (args) => createDeal(args as any),
	updateDeal: (args) => updateDeal(args as any),
	getTasksAdOps: (args) => getTasksAdOps(args),
	getTasksMarketing: (args) => getTasksMarketing(args),
	getTasksAdTech: (args) => getTasksAdTech(args),
	getTasksVideo: (args) => getTasksVideo(args),
	getTasksYieldGrowth: (args) => getTasksYieldGrowth(args),
	createTasksTechIntelligence: (args) => createTasksTechIntelligence(args as any),
	updateTasksTechIntelligence: (args) => updateTasksTechIntelligence(args as any),
	createTaskAdOps: (args) => createTaskAdOps(args as any),
	updateTaskAdOps: (args) => updateTaskAdOps(args as any),
	createTaskMarketing: (args) => createTaskMarketing(args as any),
	updateTaskMarketing: (args) => updateTaskMarketing(args as any),
	createTaskAdTech: (args) => createTaskAdTech(args as any),
	updateTaskAdTech: (args) => updateTaskAdTech(args as any),
	createTaskVideo: (args) => createTaskVideo(args as any),
	updateTaskVideo: (args) => updateTaskVideo(args as any),
	createTaskYieldGrowth: (args) => createTaskYieldGrowth(args as any),
	updateTaskYieldGrowth: (args) => updateTaskYieldGrowth(args as any),
	getBugs: (args) => getBugs(args),
	getChangelog: (args) => getChangelog(args),
	getFeatures: (args) => getFeatures(args),
	getTests: (args) => getTests(args),
	createBug: (args) => createBug(args as any),
	updateBug: (args) => updateBug(args as any),
	getMarketingBudgets: (args) => getMarketingBudgets(args),
	getMarketingExpenses: (args) => getMarketingExpenses(args),
	getOKR: (args) => getOKR(args),
	createOKR: (args) => createOKR(args as any),
	updateOKR: (args) => updateOKR(args as any),
	getBookings: (args) => getBookings(args),
	getTickets: (args) => getTickets(args),
	createTicket: (args) => createTicket(args as any),
	updateTicket: (args) => updateTicket(args as any),
};