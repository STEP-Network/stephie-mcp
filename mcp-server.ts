#!/usr/bin/env node

// biome-ignore assist/source/organizeImports: Don't know how to organize these imports
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
	CallToolRequestSchema,
	ListToolsRequestSchema,
	ListResourcesRequestSchema,
	ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { AuthValidator } from "./lib/auth/auth-validator.js";
import { TOOL_DEFINITIONS } from "./lib/mcp/toolDefinitions.js";
import { RESOURCE_DEFINITIONS } from "./lib/mcp/resources.js";
import { availabilityForecast } from "./lib/tools/availabilityForecast.js";
import { getBoardColumns } from "./lib/tools/debug/getBoardColumns.js";
import { getItems } from "./lib/tools/debug/getItems.js";
import { listAllBoards } from "./lib/tools/debug/listBoards.js";

// Import all tools
import { getAllPublishers } from "./lib/tools/publishers/getAllPublishers.js";
import { getPublisherFormats } from "./lib/tools/publishers/getPublisherFormats.js";
import { getPublishersByFormats, type FormatFilters } from "./lib/tools/publishers/getPublishersByFormats.js";
import { getAllProducts } from "./lib/tools/business/getAllProducts.js";
import { getAllFormats } from "./lib/tools/business/getAllFormats.js";
import { getAllSizes } from "./lib/tools/targeting/getAllSizes.js";
import { getAllAdPrices } from "./lib/tools/business/getAllAdPrices.js";
import { findPublisherAdUnits } from "./lib/tools/targeting/findPublisherAdUnits.js";
import { getKeyValues } from "./lib/tools/targeting/getKeyValues.js";
import { getAudienceSegments } from "./lib/tools/targeting/getAudienceSegments.js";
import { getAllPlacements } from "./lib/tools/targeting/getAllPlacements.js";
import { getGeoLocations } from "./lib/tools/targeting/getGeoLocations.js";
import { getContextualTargeting } from "./lib/tools/targeting/getContextualTargeting.js";
import { getAccounts } from "./lib/tools/crm/getAccounts.js";
import { getContacts } from "./lib/tools/crm/getContacts.js";
import { getLeads } from "./lib/tools/crm/getLeads.js";
import { createAccount } from "./lib/tools/crm/createAccount.js";
import { updateAccount } from "./lib/tools/crm/updateAccount.js";
import { createContact } from "./lib/tools/crm/createContact.js";
import { updateContact } from "./lib/tools/crm/updateContact.js";
import { createLead } from "./lib/tools/crm/createLead.js";
import { updateLead } from "./lib/tools/crm/updateLead.js";
import { getPeople } from "./lib/tools/business/getPeople.js";
import { getTeams } from "./lib/tools/business/getTeams.js";
import { getOpportunities } from "./lib/tools/sales/getOpportunities.js";
import { getSalesActivities } from "./lib/tools/sales/getSalesActivities.js";
import { getInternalAdSales } from "./lib/tools/support/getInternalAdSales.js";
import { getDeals } from "./lib/tools/sales/getDeals.js";
import { createOpportunity } from "./lib/tools/sales/createOpportunity.js";
import { updateOpportunity } from "./lib/tools/sales/updateOpportunity.js";
import { createSalesActivity } from "./lib/tools/sales/createSalesActivity.js";
import { updateSalesActivity } from "./lib/tools/sales/updateSalesActivity.js";
import { createDeal } from "./lib/tools/sales/createDeal.js";
import { updateDeal } from "./lib/tools/sales/updateDeal.js";
import { getTasksAdOps } from "./lib/tools/tasks/getTasksAdOps.js";
import { getTasksMarketing } from "./lib/tools/tasks/getTasksMarketing.js";
import { getTasksAdTech } from "./lib/tools/tasks/getTasksAdTech.js";
import { getTasksVideo } from "./lib/tools/tasks/getTasksVideo.js";
import { getTasksYieldGrowth } from "./lib/tools/tasks/getTasksYieldGrowth.js";
import { getTasksTechIntelligence } from "./lib/tools/tasks/getTasksTechIntelligence.js";
import { createTasksTechIntelligence } from "./lib/tools/tasks/createTasksTechIntelligence.js";
import { updateTasksTechIntelligence } from "./lib/tools/tasks/updateTasksTechIntelligence.js";
import { createTaskAdOps } from "./lib/tools/tasks/createTaskAdOps.js";
import { updateTaskAdOps } from "./lib/tools/tasks/updateTaskAdOps.js";
import { createTaskMarketing } from "./lib/tools/tasks/createTaskMarketing.js";
import { updateTaskMarketing } from "./lib/tools/tasks/updateTaskMarketing.js";
import { createTaskAdTech } from "./lib/tools/tasks/createTaskAdTech.js";
import { updateTaskAdTech } from "./lib/tools/tasks/updateTaskAdTech.js";
import { createTaskVideo } from "./lib/tools/tasks/createTaskVideo.js";
import { updateTaskVideo } from "./lib/tools/tasks/updateTaskVideo.js";
import { createTaskYieldGrowth } from "./lib/tools/tasks/createTaskYieldGrowth.js";
import { updateTaskYieldGrowth } from "./lib/tools/tasks/updateTaskYieldGrowth.js";
import { getBugs } from "./lib/tools/development/getBugs.js";
import { getChangelog } from "./lib/tools/development/getChangelog.js";
import { getFeatures } from "./lib/tools/development/getFeatures.js";
import { getTests } from "./lib/tools/development/getTests.js";
import { createBug } from "./lib/tools/development/createBug.js";
import { updateBug } from "./lib/tools/development/updateBug.js";
import { getPartners } from "./lib/tools/business/getPartners.js";
import { getStrategies } from "./lib/tools/business/getStrategies.js";
import { getVertikaler } from "./lib/tools/business/getVertikaler.js";
import { getMarketingBudgets } from "./lib/tools/marketing/getMarketingBudgets.js";
import { getMarketingExpenses } from "./lib/tools/marketing/getMarketingExpenses.js";
import { getOKR } from "./lib/tools/business/getOKR.js";
import { createOKR } from "./lib/tools/business/createOKR.js";
import { updateOKR } from "./lib/tools/business/updateOKR.js";
import { getBookings } from "./lib/tools/sales/getBookings.js";
import { getInternalAdOpsAdTech } from "./lib/tools/support/getInternalAdOpsAdTech.js";
import { getTickets } from "./lib/tools/support/getTickets.js";
import { getPublisherFAQ } from "./lib/tools/support/getPublisherFAQ.js";
import { createTicket } from "./lib/tools/support/createTicket.js";
import { updateTicket } from "./lib/tools/support/updateTicket.js";
import { getOTTPublishers } from "./lib/tools/publishers/getOTTPublishers.js";

import * as dotenv from "dotenv";
import type { ColumnFilter } from "./lib/tools/debug/getItems.js";

// Load environment variables
dotenv.config({ path: ".env.local" });

// Initialize auth validator
const authValidator = new AuthValidator();

// Create server instance
const server = new Server(
	{
		name: "STEPhie MCP Server",
		version: "1.0.0",
	},
	{
		capabilities: {
			tools: {},
			resources: {},  // Enable resources capability
		},
	},
);

// Tool implementations map
const toolImplementations: Record<
	string,
	(args: Record<string, unknown>) => Promise<unknown>
> = {
	getAllPublishers: () => getAllPublishers(),
	getPublisherFormats: (args) => getPublisherFormats(args),
	getPublishersByFormats: (args) => getPublishersByFormats(args as FormatFilters),
	getAllProducts: (args) => getAllProducts(args),
	getAllFormats: (args) => getAllFormats(args),
	getAllSizes: (args) => getAllSizes(args),
	getAllAdPrices: (args) => getAllAdPrices(args),
	findPublisherAdUnits: (args) => findPublisherAdUnits(args),
	getKeyValues: (args) => getKeyValues(args),
	getAudienceSegments: (args) => getAudienceSegments(args),
	getAllPlacements: (args) => getAllPlacements(args),
	getGeoLocations: (args) => getGeoLocations(args),
	getContextualTargeting: (args) => getContextualTargeting(args),
	availabilityForecast: (args) =>
		availabilityForecast({
			startDate: args.startDate as string,
			endDate: args.endDate as string,
			sizes: args.sizes as number[][],
			goalQuantity: args.goalQuantity as number | null | undefined,
			targetedAdUnitIds: args.targetedAdUnitIds as number[] | null | undefined,
			excludedAdUnitIds: args.excludedAdUnitIds as number[] | null | undefined,
			audienceSegmentIds: args.audienceSegmentIds as
				| string[]
				| null
				| undefined,
			customTargeting: args.customTargeting as {
				keyId: string;
				valueIds: string[];
				operator?: "IS" | "IS_NOT" | undefined;
			}[],
			frequencyCapMaxImpressions: args.frequencyCapMaxImpressions as
				| number
				| null
				| undefined,
			frequencyCapTimeUnit: args.frequencyCapTimeUnit as
				| "MINUTE"
				| "HOUR"
				| "DAY"
				| "WEEK"
				| "MONTH"
				| "LIFETIME"
				| null
				| undefined,
			targetedPlacementIds: args.targetedPlacementIds as
				| string[]
				| null
				| undefined,
		}),
	listBoards: () => listAllBoards(),
	getBoardColumns: (args) => getBoardColumns(args.boardId as string),
	getItems: (args) =>
		getItems(
			args as {
				boardId: string;
				limit?: number;
				columnIds?: string[];
				itemIds?: string[];
				search?: string;
				columnFilters?: ColumnFilter[];
				includeColumnMetadata?: boolean;
			},
		),
	getAccounts: (args) => getAccounts(args),
	getContacts: (args) => getContacts(args),
	getLeads: (args) => getLeads(args),
	createAccount: (args) => createAccount(args as any),
	updateAccount: (args) => updateAccount(args as any),
	createContact: (args) => createContact(args as any),
	updateContact: (args) => updateContact(args as any),
	createLead: (args) => createLead(args as any),
	updateLead: (args) => updateLead(args as any),
	getPeople: (args) => getPeople(args),
	getTeams: (args) => getTeams(args),
	getOpportunities: (args) => getOpportunities(args),
	getSalesActivities: (args) => getSalesActivities(args),
	getInternalAdSales: (args) => getInternalAdSales(args),
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
	getTasksTechIntelligence: (args) => getTasksTechIntelligence(args),
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
	getPartners: (args) => getPartners(args),
	getStrategies: (args) => getStrategies(args),
	getVertikaler: (args) => getVertikaler(args),
	getMarketingBudgets: (args) => getMarketingBudgets(args),
	getMarketingExpenses: (args) => getMarketingExpenses(args),
	getOKR: (args) => getOKR(args),
	createOKR: (args) => createOKR(args as any),
	updateOKR: (args) => updateOKR(args as any),
	getBookings: (args) => getBookings(args),
	getInternalAdOpsAdTech: (args) => getInternalAdOpsAdTech(args),
	getTickets: (args) => getTickets(args),
	getPublisherFAQ: (args) => getPublisherFAQ(args),
	createTicket: (args) => createTicket(args as any),
	updateTicket: (args) => updateTicket(args as any),
	getOTTPublishers: (args) => getOTTPublishers(args),
};

// Handle list tools request
server.setRequestHandler(ListToolsRequestSchema, async () => {
	return {
		tools: TOOL_DEFINITIONS,
	};
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
	const { name, arguments: args } = request.params;

	try {
		// Validate authentication for non-test environments
		if (process.env.NODE_ENV !== "test" && !process.env.TEST_AUTH_TOKEN) {
			const authToken = process.env.STEPHIE_AUTH_TOKEN;
			if (!authToken) {
				throw new Error(
					"Authentication required. Please provide STEPHIE_AUTH_TOKEN.",
				);
			}

			// Skip validation for test token
			if (authToken !== "test-token") {
				const isValid = await authValidator.validateToken(authToken);
				if (!isValid) {
					throw new Error("Invalid authentication token.");
				}
			}
		}

		// Find and execute the tool
		const implementation = toolImplementations[name];
		if (!implementation) {
			throw new Error(`Unknown tool: ${name}`);
		}

		const result = await implementation(args || {});

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
		console.error(`Error in tool ${name}:`, error);
		return {
			content: [
				{
					type: "text",
					text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
				},
			],
		};
	}
});

// Handle list resources request with standard query parameter
server.setRequestHandler(ListResourcesRequestSchema, async (request) => {
	const query = request.params?.query;
	
	let resources = RESOURCE_DEFINITIONS;
	
	// Standard query filtering - search in name, description, and URI
	if (query && typeof query === 'string') {
		const searchTerm = query.toLowerCase();
		resources = resources.filter(r => 
			r.name.toLowerCase().includes(searchTerm) ||
			r.description.toLowerCase().includes(searchTerm) ||
			r.uri.toLowerCase().includes(searchTerm)
		);
	}
	
	return {
		resources: resources.map(r => ({
			uri: r.uri,
			name: r.name,
			description: r.description,
			mimeType: r.mimeType
		}))
	};
});

// Handle read resource request
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
	const { uri } = request.params;
	
	// Find the resource definition
	const resource = RESOURCE_DEFINITIONS.find(r => r.uri === uri);
	if (!resource) {
		throw new Error(`Resource not found: ${uri}`);
	}
	
	try {
		// Fetch the resource content
		const content = await resource.fetcher();
		
		return {
			contents: [{
				uri: resource.uri,
				mimeType: resource.mimeType,
				text: typeof content === 'string' ? content : JSON.stringify(content)
			}]
		};
	} catch (error) {
		throw new Error(`Failed to fetch resource ${uri}: ${error instanceof Error ? error.message : 'Unknown error'}`);
	}
});

// Start the server
async function main() {
	const transport = new StdioServerTransport();
	
	// Add process error handlers
	process.on('uncaughtException', (error) => {
		console.error('Uncaught Exception:', error);
		// Don't exit, just log the error
	});
	
	process.on('unhandledRejection', (reason, promise) => {
		console.error('Unhandled Rejection at:', promise, 'reason:', reason);
		// Don't exit, just log the error
	});
	
	// Add connection error handling
	try {
		await server.connect(transport);
		console.error("STEPhie MCP server running on stdio");
		
		// Keep the process alive
		process.stdin.resume();
	} catch (error) {
		console.error("Failed to start MCP server:", error);
		throw error;
	}
}

main().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});
