import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { TOOL_DEFINITIONS } from "../lib/mcp/toolDefinitions.js";
import { availabilityForecast } from "../lib/tools/availabilityForecast.js";
import { createOKR } from "../lib/tools/business/createOKR.js";
import { getAllAdPrices } from "../lib/tools/business/getAllAdPrices.js";
import { getAllFormats } from "../lib/tools/business/getAllFormats.js";
import { getAllProducts } from "../lib/tools/business/getAllProducts.js";
import { getOKR } from "../lib/tools/business/getOKR.js";
import { getPeople } from "../lib/tools/business/getPeople.js";
import { getTeams } from "../lib/tools/business/getTeams.js";
import { updateOKR } from "../lib/tools/business/updateOKR.js";
// Import create/update tools
import { createAccount } from "../lib/tools/crm/createAccount.js";
import { createContact } from "../lib/tools/crm/createContact.js";
import { createLead } from "../lib/tools/crm/createLead.js";
// Import board-specific tools (selected key ones)
import { getAccounts } from "../lib/tools/crm/getAccounts.js";
import { getContacts } from "../lib/tools/crm/getContacts.js";
import { getLeads } from "../lib/tools/crm/getLeads.js";
import { updateAccount } from "../lib/tools/crm/updateAccount.js";
import { updateContact } from "../lib/tools/crm/updateContact.js";
import { updateLead } from "../lib/tools/crm/updateLead.js";
import { getBoardColumns } from "../lib/tools/debug/getBoardColumns.js";
import { type ColumnFilter, getItems } from "../lib/tools/debug/getItems.js";
import { listAllBoards } from "../lib/tools/debug/listBoards.js";
import { createBug } from "../lib/tools/development/createBug.js";
import { getBugs } from "../lib/tools/development/getBugs.js";
import { updateBug } from "../lib/tools/development/updateBug.js";
import { getMarketingBudgets } from "../lib/tools/marketing/getMarketingBudgets.js";
// Import all tools
import { getAllPublishers } from "../lib/tools/publishers/getAllPublishers.js";
import { getPublisherFormats } from "../lib/tools/publishers/getPublisherFormats.js";
import { getPublishersByFormats } from "../lib/tools/publishers/getPublishersByFormats.js";
import { createDeal } from "../lib/tools/sales/createDeal.js";
import { createOpportunity } from "../lib/tools/sales/createOpportunity.js";
import { createSalesActivity } from "../lib/tools/sales/createSalesActivity.js";
import { getBookings } from "../lib/tools/sales/getBookings.js";
import { getDeals } from "../lib/tools/sales/getDeals.js";
import { getOpportunities } from "../lib/tools/sales/getOpportunities.js";
import { getSalesActivities } from "../lib/tools/sales/getSalesActivities.js";
import { updateDeal } from "../lib/tools/sales/updateDeal.js";
import { updateOpportunity } from "../lib/tools/sales/updateOpportunity.js";
import { updateSalesActivity } from "../lib/tools/sales/updateSalesActivity.js";
import { createTicket } from "../lib/tools/support/createTicket.js";
import { getTickets } from "../lib/tools/support/getTickets.js";
import { updateTicket } from "../lib/tools/support/updateTicket.js";
import { findPublisherAdUnits } from "../lib/tools/targeting/findPublisherAdUnits.js";
import { getAllPlacements } from "../lib/tools/targeting/getAllPlacements.js";
import { getAllSizes } from "../lib/tools/targeting/getAllSizes.js";
import { getAudienceSegments } from "../lib/tools/targeting/getAudienceSegments.js";
import { getContextualTargeting } from "../lib/tools/targeting/getContextualTargeting.js";
import { getGeoLocations } from "../lib/tools/targeting/getGeoLocations.js";
import { getKeyValues } from "../lib/tools/targeting/getKeyValues.js";
import { createTaskAdOps } from "../lib/tools/tasks/createTaskAdOps.js";
import { createTaskAdTech } from "../lib/tools/tasks/createTaskAdTech.js";
import { createTaskMarketing } from "../lib/tools/tasks/createTaskMarketing.js";
import { createTaskTechIntelligence } from "../lib/tools/tasks/createTaskTechIntelligence.js";
import { createTaskVideo } from "../lib/tools/tasks/createTaskVideo.js";
import { createTaskYieldGrowth } from "../lib/tools/tasks/createTaskYieldGrowth.js";
import { getTasksAdOps } from "../lib/tools/tasks/getTasksAdOps.js";
import { getTasksAdTech } from "../lib/tools/tasks/getTasksAdTech.js";
import { getTasksMarketing } from "../lib/tools/tasks/getTasksMarketing.js";
import { getTasksTechIntelligence } from "../lib/tools/tasks/getTasksTechIntelligence.js";
import { getTasksVideo } from "../lib/tools/tasks/getTasksVideo.js";
import { getTasksYieldGrowth } from "../lib/tools/tasks/getTasksYieldGrowth.js";
import { updateTaskAdOps } from "../lib/tools/tasks/updateTaskAdOps.js";
import { updateTaskAdTech } from "../lib/tools/tasks/updateTaskAdTech.js";
import { updateTaskMarketing } from "../lib/tools/tasks/updateTaskMarketing.js";
import { updateTaskTechIntelligence } from "../lib/tools/tasks/updateTaskTechIntelligence.js";
import { updateTaskVideo } from "../lib/tools/tasks/updateTaskVideo.js";
import { updateTaskYieldGrowth } from "../lib/tools/tasks/updateTaskYieldGrowth.js";

// Helper to get tool description
const getToolDescription = (name: string): string => {
	const tool = TOOL_DEFINITIONS.find((t) => t.name === name);
	return tool?.description || "";
};

// Helper to build Zod schema from tool definition
const buildZodSchema = (name: string): Record<string, any> => {
	try {
		const tool = TOOL_DEFINITIONS.find((t) => t.name === name);
		if (!tool) return {};
		
		// Handle tools with no parameters
		if (!tool.inputSchema?.properties || Object.keys(tool.inputSchema.properties).length === 0) {
			return {};
		}
		
		const schema: Record<string, any> = {};
		
		for (const [key, prop] of Object.entries(tool.inputSchema.properties)) {
		let zodType: any;
		
		// Handle different types
		if (prop.type === "string") {
			zodType = z.string();
			if (prop.enum) {
				zodType = z.enum(prop.enum as [string, ...string[]]);
			}
		} else if (prop.type === "number") {
			zodType = z.number();
		} else if (prop.type === "boolean") {
			zodType = z.boolean();
		} else if (prop.type === "array") {
			if (prop.items) {
				const items = prop.items as any;
				if (items.type === "string") {
					// Use preprocess to parse JSON strings into arrays
					zodType = z.preprocess((val) => {
						if (typeof val === "string") {
							try {
								return JSON.parse(val);
							} catch {
								return val;
							}
						}
						return val;
					}, z.array(z.string()));
				} else if (items.type === "number") {
					// Use preprocess to parse JSON strings into arrays
					zodType = z.preprocess((val) => {
						if (typeof val === "string") {
							try {
								return JSON.parse(val);
							} catch {
								return val;
							}
						}
						return val;
					}, z.array(z.number()));
				} else if (items.type === "array" && items.items) {
					// Handle nested arrays like sizes [[300,250]]
					zodType = z.preprocess((val) => {
						if (typeof val === "string") {
							try {
								return JSON.parse(val);
							} catch {
								return val;
							}
						}
						return val;
					}, z.array(z.array(z.number())));
				} else if (items.type === "object") {
					// Handle array of objects
					const objSchema: Record<string, any> = {};
					if (items.properties) {
						for (const [objKey, objProp] of Object.entries(items.properties as Record<string, any>)) {
							if (objProp.type === "string") {
								objSchema[objKey] = objProp.enum 
									? z.enum(objProp.enum as [string, ...string[]])
									: z.string();
							} else if (objProp.type === "array") {
								objSchema[objKey] = z.array(z.string());
							} else if (!objProp.type) {
								// Handle missing type (defaults to any)
								objSchema[objKey] = z.any();
							}
							if (objProp.description && objSchema[objKey]) {
								objSchema[objKey] = objSchema[objKey].describe(objProp.description);
							}
						}
					}
					zodType = z.array(z.object(objSchema));
				}
			}
		} else if (prop.type === "object") {
			// Handle nested objects like geoTargeting and link__1
			const objSchema: Record<string, any> = {};
			if (prop.properties) {
				for (const [objKey, objProp] of Object.entries(prop.properties as Record<string, any>)) {
					if (objProp.type === "string") {
						objSchema[objKey] = z.string();
					} else if (objProp.type === "number") {
						objSchema[objKey] = z.number();
					} else if (objProp.type === "array") {
						// Use preprocess for nested arrays in objects too
						objSchema[objKey] = z.preprocess((val) => {
							if (typeof val === "string") {
								try {
									return JSON.parse(val);
								} catch {
									return val;
								}
							}
							return val;
						}, z.array(z.string()));
					} else if (!objProp.type) {
						// Handle missing type (defaults to any)
						objSchema[objKey] = z.any();
					}
					// Make nested properties optional by default
					if (objSchema[objKey]) {
						objSchema[objKey] = objSchema[objKey].optional();
						if (objProp.description) {
							objSchema[objKey] = objSchema[objKey].describe(objProp.description);
						}
					}
				}
			}
			zodType = z.object(objSchema);
		}
		
		// Add description if present
		if (prop.description && zodType) {
			zodType = zodType.describe(prop.description);
		}
		
		// Handle nullable/optional
		if (!prop.required && !tool.inputSchema.required?.includes(key)) {
			zodType = zodType?.nullable?.()?.optional?.() || zodType?.optional?.();
		}
		
		// Add default if present
		if (prop.default !== undefined && zodType?.default) {
			zodType = zodType.default(prop.default);
		}
		
		schema[key] = zodType;
	}
	
	return schema;
	} catch (error) {
		console.error(`Error building Zod schema for ${name}:`, error);
		return {};
	}
};

// Create the MCP handler with all tools
const handler = createMcpHandler((server) => {
	// Publisher tools
	server.tool(
		"getAllPublishers",
		getToolDescription("getAllPublishers"),
		buildZodSchema("getAllPublishers"),
		async () => {
			const result = await getAllPublishers();
			return { content: [{ type: "text", text: String(result) }] };
		},
	);

	server.tool(
		"getPublisherFormats",
		getToolDescription("getPublisherFormats"),
		buildZodSchema("getPublisherFormats"),
		async (input) => {
			const result = await getPublisherFormats(input);
			const text =
				typeof result === "string" ? result : JSON.stringify(result, null, 2);
			return { content: [{ type: "text", text }] };
		},
	);

	server.tool(
		"getPublishersByFormats",
		getToolDescription("getPublishersByFormats"),
		buildZodSchema("getPublishersByFormats"),
		async (input) => {
			const result = await getPublishersByFormats(input);
			const text =
				typeof result === "string" ? result : JSON.stringify(result, null, 2);
			return { content: [{ type: "text", text }] };
		},
	);

	server.tool(
		"findPublisherAdUnits",
		getToolDescription("findPublisherAdUnits"),
		buildZodSchema("findPublisherAdUnits"),
		async (input) => {
			// Zod preprocessing handles string parsing now
			const result = await findPublisherAdUnits(input);
			const text =
				typeof result === "string" ? result : JSON.stringify(result, null, 2);
			return { content: [{ type: "text", text }] };
		},
	);

	// Product & pricing tools
	server.tool(
		"getAllProducts",
		getToolDescription("getAllProducts"),
		buildZodSchema("getAllProducts"),
		async () => {
			const result = await getAllProducts({});
			const text =
				typeof result === "string" ? result : JSON.stringify(result, null, 2);
			return { content: [{ type: "text", text }] };
		},
	);

	server.tool(
		"getAllFormats",
		getToolDescription("getAllFormats"),
		buildZodSchema("getAllFormats"),
		async () => {
			const result = await getAllFormats({});
			const text =
				typeof result === "string" ? result : JSON.stringify(result, null, 2);
			return { content: [{ type: "text", text }] };
		},
	);

	server.tool(
		"getAllSizes",
		getToolDescription("getAllSizes"),
		buildZodSchema("getAllSizes"),
		async () => {
			const result = await getAllSizes({});
			const text =
				typeof result === "string" ? result : JSON.stringify(result, null, 2);
			return { content: [{ type: "text", text }] };
		},
	);

	server.tool(
		"getAllAdPrices",
		getToolDescription("getAllAdPrices"),
		buildZodSchema("getAllAdPrices"),
		async () => {
			const result = await getAllAdPrices({});
			const text =
				typeof result === "string" ? result : JSON.stringify(result, null, 2);
			return { content: [{ type: "text", text }] };
		},
	);

	// Targeting tools
	server.tool(
		"getKeyValues",
		getToolDescription("getKeyValues"),
		buildZodSchema("getKeyValues"),
		async (input) => {
			const result = await getKeyValues(input);
			const text =
				typeof result === "string" ? result : JSON.stringify(result, null, 2);
			return { content: [{ type: "text", text }] };
		},
	);

	server.tool(
		"getAudienceSegments",
		getToolDescription("getAudienceSegments"),
		buildZodSchema("getAudienceSegments"),
		async (input) => {
			const result = await getAudienceSegments(input);
			const text =
				typeof result === "string" ? result : JSON.stringify(result, null, 2);
			return { content: [{ type: "text", text }] };
		},
	);

	server.tool(
		"getAllPlacements",
		getToolDescription("getAllPlacements"),
		buildZodSchema("getAllPlacements"),
		async () => {
			const result = await getAllPlacements({});
			const text =
				typeof result === "string" ? result : JSON.stringify(result, null, 2);
			return { content: [{ type: "text", text }] };
		},
	);

	server.tool(
		"getGeoLocations",
		getToolDescription("getGeoLocations"),
		buildZodSchema("getGeoLocations"),
		async (input) => {
			// Zod preprocessing handles string parsing now
			const result = await getGeoLocations(input);
			const text =
				typeof result === "string" ? result : JSON.stringify(result, null, 2);
			return { content: [{ type: "text", text }] };
		},
	);

	server.tool(
		"getContextualTargeting",
		getToolDescription("getContextualTargeting"),
		buildZodSchema("getContextualTargeting"),
		async (input) => {
			const result = await getContextualTargeting(input);
			const text =
				typeof result === "string" ? result : JSON.stringify(result, null, 2);
			return { content: [{ type: "text", text }] };
		},
	);

	// Forecasting tool
	server.tool(
		"availabilityForecast",
		getToolDescription("availabilityForecast"),
		buildZodSchema("availabilityForecast"),
		async (input) => {
			console.error(`[server.ts] availabilityForecast input:`, JSON.stringify(input));
			
			// Zod preprocessing will handle JSON string parsing, so we can pass input directly
			const result = await availabilityForecast(
				input as Parameters<typeof availabilityForecast>[0],
			);
			const text =
				typeof result === "string" ? result : JSON.stringify(result, null, 2);
			return { content: [{ type: "text", text }] };
		},
	);

	// Debug tools
	server.tool("listBoards", getToolDescription("listBoards"), buildZodSchema("listBoards"), async () => {
		const result = await listAllBoards();
		// Convert object to string if needed
		const text =
			typeof result === "string" ? result : JSON.stringify(result, null, 2);
		return { content: [{ type: "text", text }] };
	});

	server.tool(
		"getBoardColumns",
		getToolDescription("getBoardColumns"),
		buildZodSchema("getBoardColumns"),
		async (input) => {
			const result = await getBoardColumns(input.boardId);
			return {
				content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
			};
		},
	);

	server.tool(
		"getItems",
		getToolDescription("getItems"),
		buildZodSchema("getItems"),
		async (input) => {
			// Zod preprocessing handles string parsing now
			const result = await getItems(input);
			return {
				content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
			};
		},
	);

	// Board-specific tools
	server.tool(
		"getAccounts",
		getToolDescription("getAccounts"),
		buildZodSchema("getAccounts"),
		async (input) => {
			const result = await getAccounts(input);
			return { content: [{ type: "text", text: result }] };
		},
	);

	server.tool(
		"getContacts",
		getToolDescription("getContacts"),
		buildZodSchema("getContacts"),
		async (input) => {
			const result = await getContacts(input);
			return { content: [{ type: "text", text: result }] };
		},
	);

	server.tool(
		"getLeads",
		getToolDescription("getLeads"),
		buildZodSchema("getLeads"),
		async (input) => {
			const result = await getLeads(input);
			return { content: [{ type: "text", text: result }] };
		},
	);

	server.tool(
		"getOpportunities",
		getToolDescription("getOpportunities"),
		buildZodSchema("getOpportunities"),
		async (input) => {
			const result = await getOpportunities(input);
			return { content: [{ type: "text", text: result }] };
		},
	);

	server.tool(
		"getSalesActivities",
		getToolDescription("getSalesActivities"),
		buildZodSchema("getSalesActivities"),
		async (input) => {
			const result = await getSalesActivities(input);
			return { content: [{ type: "text", text: result }] };
		},
	);

	server.tool(
		"getBookings",
		getToolDescription("getBookings"),
		buildZodSchema("getBookings"),
		async (input) => {
			const result = await getBookings(input);
			return { content: [{ type: "text", text: result }] };
		},
	);

	server.tool(
		"getBugs",
		getToolDescription("getBugs"),
		buildZodSchema("getBugs"),
		async (input) => {
			const result = await getBugs(input);
			return { content: [{ type: "text", text: result }] };
		},
	);

	server.tool(
		"getTasksTechIntelligence",
		getToolDescription("getTasksTechIntelligence"),
		buildZodSchema("getTasksTechIntelligence"),
		async (input) => {
			const result = await getTasksTechIntelligence(input);
			return { content: [{ type: "text", text: result }] };
		},
	);

	server.tool(
		"createTaskTechIntelligence",
		getToolDescription("createTaskTechIntelligence"),
		buildZodSchema("createTaskTechIntelligence"),
		async (input) => {
			const result = await createTaskTechIntelligence(
				input as Parameters<typeof createTaskTechIntelligence>[0],
			);
			return { content: [{ type: "text", text: result }] };
		},
	);

	server.tool(
		"updateTaskTechIntelligence",
		getToolDescription("updateTaskTechIntelligence"),
		buildZodSchema("updateTaskTechIntelligence"),
		async (input) => {
			const result = await updateTaskTechIntelligence(
				input as Parameters<typeof updateTaskTechIntelligence>[0],
			);
			return { content: [{ type: "text", text: result }] };
		},
	);

	server.tool(
		"getTasksAdOps",
		getToolDescription("getTasksAdOps"),
		buildZodSchema("getTasksAdOps"),
		async (input) => {
			const result = await getTasksAdOps(input);
			return { content: [{ type: "text", text: result }] };
		},
	);

	server.tool(
		"getTasksMarketing",
		getToolDescription("getTasksMarketing"),
		buildZodSchema("getTasksMarketing"),
		async (input) => {
			const result = await getTasksMarketing(input);
			return { content: [{ type: "text", text: result }] };
		},
	);

	server.tool(
		"getTasksAdTech",
		getToolDescription("getTasksAdTech"),
		buildZodSchema("getTasksAdTech"),
		async (input) => {
			const result = await getTasksAdTech(input);
			return { content: [{ type: "text", text: result }] };
		},
	);

	server.tool(
		"getTasksVideo",
		getToolDescription("getTasksVideo"),
		buildZodSchema("getTasksVideo"),
		async (input) => {
			const result = await getTasksVideo(input);
			return { content: [{ type: "text", text: result }] };
		},
	);

	server.tool(
		"getTasksYieldGrowth",
		getToolDescription("getTasksYieldGrowth"),
		buildZodSchema("getTasksYieldGrowth"),
		async (input) => {
			const result = await getTasksYieldGrowth(input);
			return { content: [{ type: "text", text: result }] };
		},
	);

	server.tool(
		"getOKR",
		getToolDescription("getOKR"),
		buildZodSchema("getOKR"),
		async (input) => {
			const result = await getOKR(input);
			return { content: [{ type: "text", text: result }] };
		},
	);

	server.tool(
		"getMarketingBudgets",
		getToolDescription("getMarketingBudgets"),
		buildZodSchema("getMarketingBudgets"),
		async (input) => {
			const result = await getMarketingBudgets(input);
			return { content: [{ type: "text", text: result }] };
		},
	);

	server.tool(
		"getDeals",
		getToolDescription("getDeals"),
		buildZodSchema("getDeals"),
		async (input) => {
			const result = await getDeals(input);
			return { content: [{ type: "text", text: result }] };
		},
	);

	server.tool(
		"getTeams",
		getToolDescription("getTeams"),
		buildZodSchema("getTeams"),
		async (input) => {
			const result = await getTeams(input);
			return { content: [{ type: "text", text: result }] };
		},
	);

	server.tool(
		"getPeople",
		getToolDescription("getPeople"),
		buildZodSchema("getPeople"),
		async (input) => {
			const result = await getPeople(input);
			return { content: [{ type: "text", text: result }] };
		},
	);

	server.tool(
		"getTickets",
		getToolDescription("getTickets"),
		buildZodSchema("getTickets"),
		async (input) => {
			const result = await getTickets(input);
			return { content: [{ type: "text", text: result }] };
		},
	);

	// Create/Update tools - Accounts
	server.tool(
		"createAccount",
		getToolDescription("createAccount"),
		buildZodSchema("createAccount"),
		async (input) => {
			const result = await createAccount(
				input as Parameters<typeof createAccount>[0],
			);
			return { content: [{ type: "text", text: result }] };
		},
	);

	server.tool(
		"updateAccount",
		getToolDescription("updateAccount"),
		buildZodSchema("updateAccount"),
		async (input) => {
			const result = await updateAccount(
				input as Parameters<typeof updateAccount>[0],
			);
			return { content: [{ type: "text", text: result }] };
		},
	);

	// Create/Update tools - Contacts
	server.tool(
		"createContact",
		getToolDescription("createContact"),
		buildZodSchema("createContact"),
		async (input) => {
			const result = await createContact(
				input as Parameters<typeof createContact>[0],
			);
			return { content: [{ type: "text", text: result }] };
		},
	);

	server.tool(
		"updateContact",
		getToolDescription("updateContact"),
		buildZodSchema("updateContact"),
		async (input) => {
			const result = await updateContact(
				input as Parameters<typeof updateContact>[0],
			);
			return { content: [{ type: "text", text: result }] };
		},
	);

	// Create/Update tools - Leads
	server.tool(
		"createLead",
		getToolDescription("createLead"),
		buildZodSchema("createLead"),
		async (input) => {
			const result = await createLead(
				input as Parameters<typeof createLead>[0],
			);
			return { content: [{ type: "text", text: result }] };
		},
	);

	server.tool(
		"updateLead",
		getToolDescription("updateLead"),
		buildZodSchema("updateLead"),
		async (input) => {
			const result = await updateLead(
				input as Parameters<typeof updateLead>[0],
			);
			return { content: [{ type: "text", text: result }] };
		},
	);

	// Create/Update tools - Opportunities
	server.tool(
		"createOpportunity",
		getToolDescription("createOpportunity"),
		buildZodSchema("createOpportunity"),
		async (input) => {
			const result = await createOpportunity(
				input as Parameters<typeof createOpportunity>[0],
			);
			return { content: [{ type: "text", text: result }] };
		},
	);

	server.tool(
		"updateOpportunity",
		getToolDescription("updateOpportunity"),
		buildZodSchema("updateOpportunity"),
		async (input) => {
			const result = await updateOpportunity(
				input as Parameters<typeof updateOpportunity>[0],
			);
			return { content: [{ type: "text", text: result }] };
		},
	);

	// Create/Update tools - Sales Activities
	server.tool(
		"createSalesActivity",
		getToolDescription("createSalesActivity"),
		buildZodSchema("createSalesActivity"),
		async (input) => {
			const result = await createSalesActivity(
				input as Parameters<typeof createSalesActivity>[0],
			);
			return { content: [{ type: "text", text: result }] };
		},
	);

	server.tool(
		"updateSalesActivity",
		getToolDescription("updateSalesActivity"),
		buildZodSchema("updateSalesActivity"),
		async (input) => {
			const result = await updateSalesActivity(
				input as Parameters<typeof updateSalesActivity>[0],
			);
			return { content: [{ type: "text", text: result }] };
		},
	);

	// Create/Update tools - Bugs
	server.tool(
		"createBug",
		getToolDescription("createBug"),
		buildZodSchema("createBug"),
		async (input) => {
			const result = await createBug(input as Parameters<typeof createBug>[0]);
			return { content: [{ type: "text", text: result }] };
		},
	);

	server.tool(
		"updateBug",
		getToolDescription("updateBug"),
		buildZodSchema("updateBug"),
		async (input) => {
			const result = await updateBug(input as Parameters<typeof updateBug>[0]);
			return { content: [{ type: "text", text: result }] };
		},
	);

	// Create/Update tools - Tasks (AdOps)
	server.tool(
		"createTaskAdOps",
		getToolDescription("createTaskAdOps"),
		buildZodSchema("createTaskAdOps"),
		async (input) => {
			const result = await createTaskAdOps(
				input as Parameters<typeof createTaskAdOps>[0],
			);
			return { content: [{ type: "text", text: result }] };
		},
	);

	server.tool(
		"updateTaskAdOps",
		getToolDescription("updateTaskAdOps"),
		buildZodSchema("updateTaskAdOps"),
		async (input) => {
			const result = await updateTaskAdOps(
				input as Parameters<typeof updateTaskAdOps>[0],
			);
			return { content: [{ type: "text", text: result }] };
		},
	);

	// Create/Update tools - Tasks (Marketing)
	server.tool(
		"createTaskMarketing",
		getToolDescription("createTaskMarketing"),
		buildZodSchema("createTaskMarketing"),
		async (input) => {
			const result = await createTaskMarketing(
				input as Parameters<typeof createTaskMarketing>[0],
			);
			return { content: [{ type: "text", text: result }] };
		},
	);

	server.tool(
		"updateTaskMarketing",
		getToolDescription("updateTaskMarketing"),
		buildZodSchema("updateTaskMarketing"),
		async (input) => {
			const result = await updateTaskMarketing(
				input as Parameters<typeof updateTaskMarketing>[0],
			);
			return { content: [{ type: "text", text: result }] };
		},
	);

	// Create/Update tools - Tasks (AdTech)
	server.tool(
		"createTaskAdTech",
		getToolDescription("createTaskAdTech"),
		buildZodSchema("createTaskAdTech"),
		async (input) => {
			const result = await createTaskAdTech(
				input as Parameters<typeof createTaskAdTech>[0],
			);
			return { content: [{ type: "text", text: result }] };
		},
	);

	server.tool(
		"updateTaskAdTech",
		getToolDescription("updateTaskAdTech"),
		buildZodSchema("updateTaskAdTech"),
		async (input) => {
			const result = await updateTaskAdTech(
				input as Parameters<typeof updateTaskAdTech>[0],
			);
			return { content: [{ type: "text", text: result }] };
		},
	);

	// Create/Update tools - Tasks (Video)
	server.tool(
		"createTaskVideo",
		getToolDescription("createTaskVideo"),
		buildZodSchema("createTaskVideo"),
		async (input) => {
			const result = await createTaskVideo(
				input as Parameters<typeof createTaskVideo>[0],
			);
			return { content: [{ type: "text", text: result }] };
		},
	);

	server.tool(
		"updateTaskVideo",
		getToolDescription("updateTaskVideo"),
		buildZodSchema("updateTaskVideo"),
		async (input) => {
			const result = await updateTaskVideo(
				input as Parameters<typeof updateTaskVideo>[0],
			);
			return { content: [{ type: "text", text: result }] };
		},
	);

	// Create/Update tools - Tasks (Yield Growth)
	server.tool(
		"createTaskYieldGrowth",
		getToolDescription("createTaskYieldGrowth"),
		buildZodSchema("createTaskYieldGrowth"),
		async (input) => {
			const result = await createTaskYieldGrowth(
				input as Parameters<typeof createTaskYieldGrowth>[0],
			);
			return { content: [{ type: "text", text: result }] };
		},
	);

	server.tool(
		"updateTaskYieldGrowth",
		getToolDescription("updateTaskYieldGrowth"),
		buildZodSchema("updateTaskYieldGrowth"),
		async (input) => {
			const result = await updateTaskYieldGrowth(
				input as Parameters<typeof updateTaskYieldGrowth>[0],
			);
			return { content: [{ type: "text", text: result }] };
		},
	);

	// Create/Update tools - OKRs
	server.tool(
		"createOKR",
		getToolDescription("createOKR"),
		buildZodSchema("createOKR"),
		async (input) => {
			const result = await createOKR(input as Parameters<typeof createOKR>[0]);
			return { content: [{ type: "text", text: result }] };
		},
	);

	server.tool(
		"updateOKR",
		getToolDescription("updateOKR"),
		buildZodSchema("updateOKR"),
		async (input) => {
			const result = await updateOKR(input as Parameters<typeof updateOKR>[0]);
			return { content: [{ type: "text", text: result }] };
		},
	);

	// Create/Update tools - Deals
	server.tool(
		"createDeal",
		getToolDescription("createDeal"),
		buildZodSchema("createDeal"),
		async (input) => {
			const result = await createDeal(
				input as Parameters<typeof createDeal>[0],
			);
			return { content: [{ type: "text", text: result }] };
		},
	);

	server.tool(
		"updateDeal",
		getToolDescription("updateDeal"),
		buildZodSchema("updateDeal"),
		async (input) => {
			const result = await updateDeal(
				input as Parameters<typeof updateDeal>[0],
			);
			return { content: [{ type: "text", text: result }] };
		},
	);

	// Create/Update tools - Tickets
	server.tool(
		"createTicket",
		getToolDescription("createTicket"),
		buildZodSchema("createTicket"),
		async (input) => {
			const result = await createTicket(
				input as Parameters<typeof createTicket>[0],
			);
			return { content: [{ type: "text", text: result }] };
		},
	);

	server.tool(
		"updateTicket",
		getToolDescription("updateTicket"),
		buildZodSchema("updateTicket"),
		async (input) => {
			const result = await updateTicket(
				input as Parameters<typeof updateTicket>[0],
			);
			return { content: [{ type: "text", text: result }] };
		},
	);
});

// Export handler for Vercel Edge Runtime
export { handler as GET, handler as POST };
