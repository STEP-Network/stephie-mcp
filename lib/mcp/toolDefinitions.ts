/**
 * Shared MCP Tool Definitions
 * Single source of truth for all MCP server implementations
 */

import { required } from "zod/v4-mini";

export interface ToolDefinition {
	name: string;
	description: string;
	inputSchema: {
		type: "object";
		properties: Record<
			string,
			{
				type: string;
				description?: string;
				enum?: string[] | number[] | boolean[];
				items?: unknown;
				properties?: Record<string, unknown>;
				required?: boolean;
				default?: unknown;
			}
		>;
		required?: string[];
	};
}

export const TOOL_DEFINITIONS: ToolDefinition[] = [
	{
		name: "getAllPublishers",
		description:
			"Get all Live publishers/sites from Monday.com Publishers board. Returns all Live publishers/sites with essential information: Publisher/Site name, GAM Ad Unit ID, Vertical, Publisher Group, and Approval status (Gambling/Finance). Results are sorted by Vertical, then alphabetically by name.",
		inputSchema: {
			type: "object",
			properties: {},
		},
	},
	{
		name: "getPublisherFormats",
		description:
			"Get detailed matrix of publishers/sites and their available ad formats grouped by device type. Shows ONLY ACTIVE formats per publisher/site - if a format is not listed, the publisher/site does NOT support it. Device abbreviations: M=Mobile, D=Desktop, A=App. Useful for finding which publishers/sites support specific format combinations.",
		inputSchema: {
			type: "object",
			properties: {
				publisherName: {
					type: "string",
					description:
						"Filter by publisher/site name (partial match, case-insensitive)",
				},
				publisherGroupName: {
					type: "string",
					description:
						'Filter by publisher/site group name (e.g., "JFM", "HeyMate")',
				},
				limit: {
					type: "number",
					description:
						"Maximum number of publishers/sites to return (1-500, default: 100)",
					default: 100,
				},
			},
		},
	},
	{
		name: "getPublishersByFormats",
		description:
			"Find publishers/sites that support specific ad formats on specific devices. Each format has its own available device options based on Monday.com configuration.",
		inputSchema: {
			type: "object",
			properties: {
				// Adnami formats with full device options
				topscroll: {
					type: "string",
					enum: ["Desktop", "Mobile", "App", "All"],
					description:
						"Topscroll (Adnami) - Desktop: 970x510, Mobile: 300x220/300x280",
				},
				topscrollExpand: {
					type: "string",
					enum: ["Desktop", "Mobile", "App", "All"],
					description:
						"Topscroll Expand (Adnami) - Desktop: 970x510, Mobile: 300x280",
				},
				// Adnami formats without App option
				doubleMidscroll: {
					type: "string",
					enum: ["Desktop", "Mobile", "All"],
					description:
						"Double Midscroll (Adnami) - Desktop: 970x550, Mobile: 300x210",
				},
				midscroll: {
					type: "string",
					enum: ["Desktop", "Mobile", "All"],
					description: "Midscroll (Adnami) - Desktop: 970x250, Mobile: 300x100",
				},
				midscrollExpand: {
					type: "string",
					enum: ["Desktop", "Mobile", "All"],
					description:
						"Midscroll Expand (Adnami) - Desktop: 970x250, Mobile: 300x200",
				},
				slider: {
					type: "string",
					enum: ["Desktop", "Mobile", "All"],
					description: "Slider (Adnami) format",
				},
				parallax: {
					type: "string",
					enum: ["Desktop", "Mobile", "All"],
					description: "Parallax (Adnami) effect format",
				},
				// High-impact.js formats
				topscrollHighimpact: {
					type: "string",
					enum: ["Desktop", "Mobile", "All"],
					description:
						"Topscroll (High-impact.js) - Desktop: 970x510, Mobile: 300x250",
				},
				midscrollHighimpact: {
					type: "string",
					enum: ["Desktop", "Mobile", "All"],
					description:
						"Midscroll (High-impact.js) - Desktop: 970x250, Mobile: 300x200",
				},
				// Other formats with full device options
				sticky: {
					type: "string",
					enum: ["Desktop", "Mobile", "App", "All"],
					description: "Anchor/sticky format",
				},
				interstitial: {
					type: "string",
					enum: ["Desktop", "Mobile", "App", "All"],
					description: "Google Interstitial (full-screen between pages)",
				},
				// Native format without App
				trueNative: {
					type: "string",
					enum: ["Desktop", "Mobile", "All"],
					description: "True Native format (matches site content)",
				},
				// Video formats without App option
				video: {
					type: "string",
					enum: ["Desktop", "Mobile", "All"],
					description: "Standard video format",
				},
				vertikalVideo: {
					type: "string",
					enum: ["Desktop", "Mobile", "All"],
					description: "Vertical/portrait video format",
				},
				outstream: {
					type: "string",
					enum: ["Desktop", "Mobile", "All"],
					description: "Outstream video (plays in content)",
				},
				// Status-based formats (boolean)
				videoPlayback: {
					type: "boolean",
					description: "Video Click-To-Play (CTP) and Autoplay (AP) support",
				},
				ott: {
					type: "boolean",
					description: "OTT (Over-The-Top) streaming video",
				},
				reAd: {
					type: "boolean",
					description:
						"RE-AD (Responsible Advertisement) - environmental friendly single ad per page",
				},
			},
		},
	},
	{
		name: "getAllProducts",
		description:
			"Get all ad products and product groups from Monday.com boards (Produktgrupper: 1611223368, Produkt: 1983692701). Shows product hierarchy with associated formats and ad unit sizes. Product groups contain multiple products (e.g., Display group contains Standard, High Impact products).",
		inputSchema: {
			type: "object",
			properties: {
				includeIds: {
					type: "boolean",
					description: "Include Monday.com item IDs in output",
					default: false,
				},
			},
		},
	},
	{
		name: "getAllFormats",
		description:
			"Get all ad format specifications from Monday.com Formater board (1983719743). Shows format dimensions, devices, and technical specifications. Formats are grouped by device type (Desktop, Mobile, App).",
		inputSchema: {
			type: "object",
			properties: {
				device: {
					type: "string",
					enum: ["Desktop", "Mobile", "App", "All"],
					description: "Filter by device type",
				},
				includeIds: {
					type: "boolean",
					description: "Include format IDs in output",
					default: false,
				},
			},
		},
	},
	{
		name: "getAllSizes",
		description:
			"Get all ad unit sizes from Monday.com Sizes board (1558597958). Returns width, height, aspect ratio, and IAB standards compliance. Sizes are sorted by width then height.",
		inputSchema: {
			type: "object",
			properties: {
				minWidth: {
					type: "number",
					description: "Minimum width in pixels",
				},
				maxWidth: {
					type: "number",
					description: "Maximum width in pixels",
				},
				includeIds: {
					type: "boolean",
					description: "Include size IDs in output",
					default: false,
				},
			},
		},
	},
	{
		name: "getAllAdPrices",
		description:
			"Get all ad pricing from Monday.com Priser board (1432155906). Shows CPM rates by format and market segment. Prices are in DKK (Danish Kroner).",
		inputSchema: {
			type: "object",
			properties: {
				format: {
					type: "string",
					description: "Filter by format name",
				},
				includeIds: {
					type: "boolean",
					description: "Include price IDs in output",
					default: false,
				},
			},
		},
	},
	{
		name: "findPublisherAdUnits",
		description:
			"Find ad units for publishers/sites with complete 3-level hierarchy: Publisher Groups (Level 1) → Publishers/Sites (Level 2) → Child Ad Units (Level 3). Returns all GAM IDs needed for forecasting. Essential for availabilityForecast tool.",
		inputSchema: {
			type: "object",
			properties: {
				names: {
					type: "array",
					items: { type: "string" },
					description:
						'Publisher/site names to search for (e.g., ["jv.dk", "berlingske.dk"])',
				},
			},
			required: ["names"],
		},
	},
	{
		name: "getKeyValues",
		description:
			"Get custom targeting key-values from Monday.com Key Values board (1802371471). Contains 22,000+ targeting options for content, demographics, and behavior. Returns keys with their associated values for GAM custom targeting.",
		inputSchema: {
			type: "object",
			properties: {
				keySearch: {
					type: "string",
					description: 'Search term for key names (e.g., "sport", "age")',
				},
				valueSearch: {
					type: "string",
					description: "Search term for values within keys",
				},
				limit: {
					type: "number",
					description: "Maximum keys to return (default: 50)",
					default: 50,
				},
				valueLimit: {
					type: "number",
					description: "Maximum values per key (default: 50)",
					default: 50,
				},
				totalValueLimit: {
					type: "number",
					description: "Maximum total values across all keys (default: 500)",
					default: 500,
				},
			},
		},
	},
	{
		name: "getAudienceSegments",
		description:
			"Get demographic and behavioral audience segments from Monday.com Audience board (2051827669). Includes age, gender, interests, and third-party data segments. Returns segment IDs for GAM audience targeting.",
		inputSchema: {
			type: "object",
			properties: {
				search: {
					type: "string",
					description: "Search term for segment names or descriptions",
				},
				limit: {
					type: "number",
					description: "Maximum segments to return (default: 100)",
					default: 100,
				},
			},
		},
	},
	{
		name: "getAllPlacements",
		description:
			"Get all GAM placements and content verticals from Monday.com Ad Placements board (1935559241). Returns placement names and IDs for targeting. Note: RON, Gambling, Finance, and RE-AD are special placements, not content verticals.",
		inputSchema: {
			type: "object",
			properties: {
				includeIds: {
					type: "boolean",
					description: "Include GAM placement IDs in output",
					default: false,
				},
			},
		},
	},
	{
		name: "getGeoLocations",
		description:
			"Search geographic locations for targeting in Denmark. Includes 1700+ cities, regions, postal codes, and municipalities. Returns location names with GAM criteria IDs for geographic targeting.",
		inputSchema: {
			type: "object",
			properties: {
				search: {
					type: "string",
					description: "Search term for location (city, postal code, region)",
					required: true,
				},
				limit: {
					type: "number",
					description: "Maximum results to return (default: 50)",
					default: 50,
				},
			},
			required: ["search"],
		},
	},
	{
		name: "getContextualTargeting",
		description:
			"Get Neuwo contextual targeting categories from Google Ad Manager REST API. Returns content categories like news, sports, entertainment with their GAM IDs. Requires GAM authentication.",
		inputSchema: {
			type: "object",
			properties: {
				search: {
					type: "string",
					description: "Search term for category names",
				},
				limit: {
					type: "number",
					description: "Maximum categories to return (default: 100)",
					default: 100,
				},
			},
		},
	},
	{
		name: "availabilityForecast",
		description:
			"Get availability forecast from Google Ad Manager. Returns impression availability for specified targeting and date range.",
		inputSchema: {
			type: "object",
			properties: {
				startDate: {
					type: "string",
					description:
						'Start date in YYYY-MM-DD format or "now" for immediate start',
					required: true,
				},
				endDate: {
					type: "string",
					description: "End date in YYYY-MM-DD format",
					required: true,
				},
				sizes: {
					type: "array",
					items: {
						type: "array",
						items: { type: "number" },
					},
					description:
						"Array of ad sizes as [width, height] pairs, e.g. [[300,250], [1,2]]. Use getAllSizes tool to confirm the available sizes.",
					required: true,
				},
				goalQuantity: {
					type: "number",
					description:
						"Target number of impressions. Leave null for maximum available",
				},
				targetedAdUnitIds: {
					type: "array",
					items: { type: "number" },
					description:
						"Array of ad unit IDs to target. Not necessary if using targetedPlacementIds. Use findPublisherAdUnits tool to get valid IDs. Include only same-level ad units (e.g. level 2 'jv.dk' OR level 3 'billboard_1').",
				},
				excludedAdUnitIds: {
					type: "array",
					items: { type: "number" },
					description:
						"Array of ad unit IDs to exclude from forecast. Use findPublisherAdUnits tool to get valid IDs. Can include any level ad units regardless of targetedAdUnitIds.",
				},
				audienceSegmentIds: {
					type: "array",
					items: { type: "string" },
					description:
						"Array of audience segment IDs for demographic targeting. Use getAudienceSegments tool to get valid IDs.",
				},
				customTargeting: {
					type: "array",
					items: {
						type: "object",
						properties: {
							keyId: {
								type: "string",
								description:
									"Custom targeting key ID. Use getKeyValues tool to get valid key IDs.",
							},
							valueIds: {
								type: "array",
								items: { type: "string" },
								description:
									"Array of value IDs for the key. Use getKeyValues tool to get valid value IDs.",
							},
							operator: {
								type: "string",
								enum: ["IS", "IS_NOT"],
								description: "Targeting operator",
							},
						},
					},
					description:
						"Array of custom targeting key-value pairs. Use getKeyValues tool to get valid keys and values.",
				},
				frequencyCapMaxImpressions: {
					type: "number",
					description: "Maximum impressions per user for frequency capping",
				},
				frequencyCapTimeUnit: {
					type: "string",
					enum: ["MINUTE", "HOUR", "DAY", "WEEK", "MONTH", "LIFETIME"],
					description: "Time unit for frequency capping (defaults to WEEK)",
				},
				geoTargeting: {
					type: "object",
					properties: {
						targetedLocationIds: {
							type: "array",
							items: { type: "string" },
							description:
								"Array of location IDs to target. Use getGeoLocations tool to get valid IDs.",
						},
						excludedLocationIds: {
							type: "array",
							items: { type: "string" },
							description:
								"Array of location IDs to exclude. Use getGeoLocations tool to get valid IDs.",
						},
					},
					description:
						"Geographic targeting configuration. Use getGeoLocations tool to get valid location IDs.",
				},
				targetedPlacementIds: {
					type: "array",
					items: { type: "string" },
					description:
						"Array of placement IDs to target. Use getAllPlacements tool to get valid IDs. Not necessary if using targetedAdUnitIds.",
				},
			},
			required: ["startDate", "endDate", "sizes"],
		},
	},
	// Debug tools
	{
		name: "listBoards",
		description:
			"List all Monday.com boards from the Boards meta board (1698570295). Useful for discovering board structure and IDs.",
		inputSchema: {
			type: "object",
			properties: {},
		},
	},
	{
		name: "getBoardColumns",
		description:
			"Get board columns with IDs, types, and status/dropdown options. Shows numeric index to label mappings for status/dropdown columns.",
		inputSchema: {
			type: "object",
			properties: {
				boardId: {
					type: "string",
					description: "Monday.com board ID",
					required: true,
				},
			},
			required: ["boardId"],
		},
	},
	{
		name: "getItems",
		description: `Query Monday.com board items. Use getBoardColumns first to get column IDs and types. ALWAYS use columnIds parameter to avoid data overload (boards can have 50+ columns).`,
		inputSchema: {
			type: "object",
			properties: {
				boardId: {
					type: "string",
					description: "Board ID",
					required: true,
				},
				limit: {
					type: "number",
					description: "Max items",
					default: 10,
				},
				columnIds: {
					type: "array",
					items: { type: "string" },
					description: "Column IDs to return",
					required: true,
				},
				itemIds: {
					type: "array",
					items: { type: "string" },
					description: "Item IDs to fetch",
				},
				search: {
					type: "string",
					description: "Name search",
				},
				columnFilters: {
					type: "array",
					description: "Column filters.",
					items: {
						type: "object",
						properties: {
							columnId: {
								type: "string",
								description: "Column ID",
							},
							value: {
								description:
									"Filter value. Status/dropdown: numeric index only.",
							},
							operator: {
								type: "string",
								description: "Filter operator",
								enum: [
									"equals",
									"notEquals",
									"contains",
									"notContains",
									"greater",
									"less",
									"between",
									"empty",
									"notEmpty",
									"me",
									"checked",
									"unchecked",
								],
							},
						},
						required: ["columnId", "value"],
					},
				},
				includeColumnMetadata: {
					type: "boolean",
					description: "Include column metadata",
					default: false,
				},
			},
			required: ["boardId", "columnIds"],
		},
	},
	// Board-specific tools (auto-generated)
	{
		name: "getAccounts",
		description:
			"Get items from Accounts CRM board. Search and filter by status, owner, and type.",
		inputSchema: {
			type: "object",
			properties: {
				limit: { type: "number", default: 10 },
				contactsId: {
					type: "string",
					description:
						"Filter by linked contacts (use getContacts to find IDs)",
				},
				opportunitiesId: {
					type: "string",
					description:
						"Filter by linked opportunities (use getOpportunities to find IDs)",
				},
				leadsId: {
					type: "string",
					description: "Filter by linked leads (use getLeads to find IDs)",
				},
				search: { type: "string" },
				status: {
					type: "number",
					description:
						"Account Status: 0=On hold, 4=Client, 13=Past Client, 17=New Biz",
				},
				status5: {
					type: "number",
					description:
						"Type: 0=Agency, 1=Agency Group, 2=Partner, 3=Publisher, 4=Publisher Lead, 107=Advertiser",
				},
			},
		},
	},
	{
		name: "getBookings",
		description:
			"Get items from Bookings board. Filter by status, dates, and campaign status.",
		inputSchema: {
			type: "object",
			properties: {
				limit: { type: "number", default: 10 },
				search: { type: "string" },
				status0__1: {
					type: "number",
					description:
						"Status: 0=Not ready, 1=Delivering completed + report sent, 2=Under Booking, 3=Booked, 4=Delivering, 6=Ready for final reporting, 19=New",
				},
				date: { type: "string", description: "Midway date (YYYY-MM-DD)" },
			},
		},
	},
	{
		name: "getBugs",
		description:
			"Get items from Bugs board. Filter by priority, status, and owner.",
		inputSchema: {
			type: "object",
			properties: {
				limit: { type: "number", default: 10 },
				search: { type: "string" },
				color_mkqnwy18: {
					type: "number",
					description:
						"Priority: 0=Medium, 1=Minimal, 2=Low, 3=Critical, 4=High, 5=Not Prioritized, 6=Unknown",
				},
				color_mkqhya7m: {
					type: "number",
					description:
						"Status: 0=In Review, 1=Done, 2=Rejected, 3=Planned, 4=In Progress, 5=Missing Status, 6=Waiting On Others, 7=New, 8=On Hold",
				},
			},
		},
	},
	{
		name: "getTasksTechIntelligence",
		description:
			"Get tasks from Tech & Intelligence Tasks board (team members: Nate). Progress on technical and data projects such as STEPhie, make.com and monday.com developments.",
		inputSchema: {
			type: "object",
			properties: {
				limit: { type: "number", default: 10 },
				board_relation_mkpjqgpv: {
					type: "string",
					description:
						"Filter by linked key result item ID (use OKR subitems tool to find IDs)",
				},
				board_relation_mkqhkyb7: {
					type: "string",
					description:
						"Filter by linked STEPhie feature item ID (use getStephieFeatures tool to find IDs)",
				},
				name: {
					type: "string",
					description: "Use a string to search tasks by full or partial task names",
				},
				status_19__1: {
					type: "array",
					items: {
						type: "string",
						enum: [
							"In Review",
							"Done", 
							"Rejected",
							"Planned",
							"In Progress",
							"Missing Status",
							"Waiting On Others",
							"New",
							"On Hold"
						]
					},
					description:
						"Filter by status values. Use status names like ['Done', 'In Progress'] or ['Rejected']",
				},
				status_19__1_operator: {
					type: "string",
					enum: ["any_of", "not_any_of"],
					default: "any_of",
					description: "Operator for status filtering: 'any_of' to include, 'not_any_of' to exclude",
				},
				type_1__1: {
					type: "array",
					items: {
						type: "string",
						enum: [
							"Support",
							"Maintenance",
							"Development",
							"Not Labelled",
							"Bugfix",
							"Documentation",
							"Meeting"
						]
					},
					description:
						"Filter by type values. Use type names like ['Development', 'Bugfix'] or ['Meeting']",
				},
				type_1__1_operator: {
					type: "string",
					enum: ["any_of", "not_any_of"],
					default: "any_of",
					description: "Operator for type filtering: 'any_of' to include, 'not_any_of' to exclude",
				},
				priority_1__1: {
					type: "array",
					items: {
						type: "string",
						enum: [
							"Medium",
							"Minimal",
							"Low",
							"Critical",
							"High",
							"Not Prioritized",
							"Unknown"
						]
					},
					description:
						"Filter by priority values. Use priority names like ['High', 'Critical'] or ['Low']",
				},
				priority_1__1_operator: {
					type: "string",
					enum: ["any_of", "not_any_of"],
					default: "any_of",
					description: "Operator for priority filtering: 'any_of' to include, 'not_any_of' to exclude",
				},
				date__1: {
					type: "string",
					description:
						"Due date: 'YYYY-MM-DD', 'TODAY', 'TOMORROW', 'NEXT_WEEK', 'NEXT_MONTH', 'YESTERDAY', 'ONE_WEEK_AGO', 'ONE_MONTH_AGO'",
				},
				date__1_operator: {
					type: "string",
					enum: [
						"any_of",
						"not_any_of",
						"greater_than",
						"lower_than",
					],
					description: "Operator for due date comparison",
				},
				date4: {
					type: "string",
					description:
						"Follow up date: 'YYYY-MM-DD', 'TODAY', 'TOMORROW', 'NEXT_WEEK', 'NEXT_MONTH', 'YESTERDAY', 'ONE_WEEK_AGO', 'ONE_MONTH_AGO'",
				},
				date4_operator: {
					type: "string",
					enum: [
						"any_of",
						"not_any_of",
						"greater_than",
						"lower_than",
					],
					description: "Operator for follow up date comparison",
				},
				date4__1: {
					type: "string",
					description:
						"Created date: 'YYYY-MM-DD', 'TODAY', 'TOMORROW', 'NEXT_WEEK', 'NEXT_MONTH', 'YESTERDAY', 'ONE_WEEK_AGO', 'ONE_MONTH_AGO'",
				},
				date4__1_operator: {
					type: "string",
					enum: [
						"any_of",
						"not_any_of",
						"greater_than",
						"lower_than",
					],
					description: "Operator for created date comparison",
				},
				date3__1: {
					type: "string",
					description:
						"Started date: 'YYYY-MM-DD', 'TODAY', 'TOMORROW', 'NEXT_WEEK', 'NEXT_MONTH', 'YESTERDAY', 'ONE_WEEK_AGO', 'ONE_MONTH_AGO'",
				},
				date3__1_operator: {
					type: "string",
					enum: [
						"any_of",
						"not_any_of",
						"greater_than",
						"lower_than",
					],
					description: "Operator for started date comparison",
				},
				date7__1: {
					type: "string",
					description:
						"Done date: 'YYYY-MM-DD', 'TODAY', 'TOMORROW', 'NEXT_WEEK', 'NEXT_MONTH', 'YESTERDAY', 'ONE_WEEK_AGO', 'ONE_MONTH_AGO'",
				},
				date7__1_operator: {
					type: "string",
					enum: [
						"any_of",
						"not_any_of",
						"greater_than",
						"lower_than",
					],
					description: "Operator for done date comparison",
				},
			},
		},
	},

	// Tasks - Tech & Intelligence Mutation Tools
	{
		name: "createTasksTechIntelligence",
		description: "Create one or more tasks in the Tasks - Tech & Intelligence board (team members: Nate).",
		inputSchema: {
			type: "object",
			properties: {
				tasks: {
					type: "array",
					items: {
						type: "object",
						properties: {
							name: { type: "string", description: "Required parameter - Task name", required: true },
							board_relation_mkpjqgpv: {
								type: "string",
								description:
									"Link to key result item ID (use OKR subitems tool to find IDs)",
							},
							board_relation_mkqhkyb7: {
								type: "string",
								description:
									"Link to STEPhie feature item ID (use getStephieFeatures tool to find IDs)",
							},
							status_19__1: {
								type: "number",
								description:
									"Status index: 0=In Review, 1=Done, 2=Rejected, 3=Planned, 4=In Progress, 5=Missing Status, 6=Waiting On Others, 7=New, 8=On Hold",
							},
							type_1__1: {
								type: "number",
								description:
									"Required parameter - Type index: 1=Support, 3=Maintenance, 4=Development, 5=Not Labelled, 6=Bugfix, 7=Documentation, 12=Meeting",
								required: true,
							},
							priority_1__1: {
								type: "number",
								description:
									"Required parameter - Priority index: 0=Medium, 1=Minimal, 2=Low, 3=Critical, 4=High, 5=Not Prioritized, 6=Unknown",
								required: true,
							},
							date__1: {
								type: "string",
								description:
									"Due date: 'YYYY-MM-DD'",
							},
							date4: {
								type: "string",
								description:
									"Follow up date: 'YYYY-MM-DD'",
							},
						},
						required: ["name", "type_1__1", "priority_1__1"],
					},
					description: "Array of task objects to create",
					required: true,
				},
			},
			required: ["tasks"],
		},
	},
	{
		name: "updateTasksTechIntelligence",
		description:
			"Update or delete multiple tasks in the Tasks - Tech & Intelligence board (team members: Nate). Use delete: true to delete tasks.",
		inputSchema: {
			type: "object",
			properties: {
				tasks: {
					type: "array",
					items: {
						type: "object",
						properties: {
							itemId: { type: "string", description: "Item ID to update (required)", required: true },
							name: { type: "string", description: "Task name" },
							board_relation_mkpjqgpv: {
								type: "string",
								description:
									"Link to key result item ID (use OKR subitems tool to find IDs)",
							},
							board_relation_mkqhkyb7: {
								type: "string",
								description:
									"Link to STEPhie feature item ID (use getStephieFeatures tool to find IDs)",
							},
							status_19__1: {
								type: "number",
								description:
									"Status index: 0=In Review, 1=Done, 2=Rejected, 3=Planned, 4=In Progress, 5=Missing Status, 6=Waiting On Others, 7=New, 8=On Hold",
							},
							type_1__1: {
								type: "number",
								description:
									"Type index: 1=Support, 3=Maintenance, 4=Development, 5=Not Labelled, 6=Bugfix, 7=Documentation, 12=Meeting",
							},
							priority_1__1: {
								type: "number",
								description:
									"Priority index: 0=Medium, 1=Minimal, 2=Low, 3=Critical, 4=High, 5=Not Prioritized, 6=Unknown",
							},
							date__1: {
								type: "string",
								description:
									"Due date: 'YYYY-MM-DD'",
							},
							date4: {
								type: "string",
								description:
									"Follow up date: 'YYYY-MM-DD'",
							},
							delete: {
								type: "boolean",
								description: "Set to true to delete the task. When true, other fields are ignored.",
							},
						},
						required: ["itemId"],
					},
					description: "Array of task objects to update or delete",
					required: true,
				},
			},
			required: ["tasks"],
		},
	},
	{
		name: "getOKR",
		description:
			"Get Objectives & Key Results with full hierarchy. Returns objectives with their associated key results. For team filtering, use getTeams first to find team IDs.",
		inputSchema: {
			type: "object",
			properties: {
				limit: { type: "number", default: 10 },
				strategiesId: {
					type: "string",
					description:
						"Filter by linked strategies (use getStrategies to find IDs)",
				},
				peopleId: {
					type: "string",
					description: "Filter by linked people (use getPeople to find IDs)",
				},
				search: { type: "string" },
				status: {
					type: "number",
					description:
						"Status: 0=In Review, 1=Done, 2=Rejected, 3=Planned, 4=In Progress, 5=Missing Status, 6=Waiting On Others, 7=New, 8=On Hold",
				},
				health: {
					type: "number",
					description: "Health: 0=At Risk, 1=On Track, 2=Off Track",
				},
				teamId: {
					type: "string",
					description: "Team ID (use getTeams to find IDs)",
				},
				includeKeyResults: { type: "boolean", default: true },
				onlyActive: { type: "boolean", default: false },
			},
		},
	},
	{
		name: "getMarketingBudgets",
		description:
			"Get items from Marketing Budgets board. Track marketing spend and budgets.",
		inputSchema: {
			type: "object",
			properties: {
				limit: { type: "number", default: 10 },
				search: { type: "string" },
			},
		},
	},
	{
		name: "getDeals",
		description:
			"Get items from Deals board. Track sales opportunities and deal stages.",
		inputSchema: {
			type: "object",
			properties: {
				limit: { type: "number", default: 10 },
				agencyId: {
					type: "string",
					description: "Filter by agency account (use getAccounts to find IDs)",
				},
				advertiserId: {
					type: "string",
					description:
						"Filter by advertiser account (use getAccounts to find IDs)",
				},
				contactsId: {
					type: "string",
					description:
						"Filter by linked contacts (use getContacts to find IDs)",
				},
				search: { type: "string" },
				status: {
					type: "number",
					description:
						"Status: 0=Working on it, 1=Done, 2=Stuck, 3=Deal godkendt, 4=Archived, 6=Contacted, 19=Sendt til godkendelse, 107=On hold",
				},
			},
		},
	},
	{
		name: "getTeams",
		description: "Get items from Teams board. View team structure and members.",
		inputSchema: {
			type: "object",
			properties: {
				limit: { type: "number", default: 10 },
				search: { type: "string" },
				status: {
					type: "number",
					description: "Status: 0=Under-Ressourced, 1=Active, 2=Inactive",
				},
				peopleId: {
					type: "string",
					description: "Filter by person ID (use getPeople to find IDs)",
				},
				objectiveId: {
					type: "string",
					description: "Filter by objective ID (use getOKR to find IDs)",
				},
			},
		},
	},
	{
		name: "getTickets",
		description:
			"Get items from Support Tickets board. Track customer issues and resolutions.",
		inputSchema: {
			type: "object",
			properties: {
				limit: { type: "number", default: 10 },
				contactId: {
					type: "string",
					description: "Filter by linked contact (use getContacts to find IDs)",
				},
				assignedId: {
					type: "string",
					description: "Filter by assigned person (use getPeople to find IDs)",
				},
				publisherId: {
					type: "string",
					description: "Filter by publisher (use getAllPublishers to find IDs)",
				},
				search: { type: "string" },
				status: {
					type: "number",
					description:
						"Status: 0=New response, 1=Customer responded, 2=On hold, 3=Email Sent, 5=New, 7=Awaiting response, 11=Resolved",
				},
				priority: {
					type: "number",
					description: "Priority: 7=Low, 10=Critical, 109=Medium, 110=High",
				},
			},
		},
	},

	// CRM Tools
	{
		name: "getContacts",
		description:
			"Get items from Contacts board. Access contact details, roles, and publisher affiliations.",
		inputSchema: {
			type: "object",
			properties: {
				limit: { type: "number", default: 10 },
				accountId: {
					type: "string",
					description: "Filter by linked account (use getAccounts to find IDs)",
				},
				search: { type: "string" },
				status: {
					type: "number",
					description:
						"Status: 0=Working on it, 1=Good relation, 2=Stuck, 3=Rejected, 4=Stopped, 19=No contact, 107=Waiting",
				},
				tier: {
					type: "number",
					description:
						"Tier: 0=D-level, 1=C-level, 2=A-level, 19=P-level, 107=Ambassador",
				},
			},
		},
	},
	{
		name: "getLeads",
		description:
			"Get items from Leads board. Track potential new publishers and opportunities.",
		inputSchema: {
			type: "object",
			properties: {
				limit: { type: "number", default: 10 },
				assignedId: {
					type: "string",
					description: "Filter by assigned person (use getPeople to find IDs)",
				},
				search: { type: "string" },
				status: {
					type: "number",
					description:
						"Status: 0=New, 1=Qualified, 2=New Lead, 5=Ikke interesseret, 11=Unqualified, 14=Contacted",
				},
				type: {
					type: "number",
					description: "Type: 1=Publisher, 2=Advertiser",
				},
			},
		},
	},

	// HR Tools
	{
		name: "getPeople",
		description:
			"Get items from People board. Access team member details and assignments.",
		inputSchema: {
			type: "object",
			properties: {
				limit: { type: "number", default: 10 },
				teamId: {
					type: "string",
					description: "Filter by team (use getTeams to find IDs)",
				},
				search: { type: "string" },
				role: { type: "number", description: "Role index" },
			},
		},
	},

	// Sales Tools
	{
		name: "getOpportunities",
		description:
			"Get items from Opportunities board. Track sales pipeline and revenue forecasts.",
		inputSchema: {
			type: "object",
			properties: {
				limit: { type: "number", default: 10 },
				accountId: {
					type: "string",
					description: "Filter by linked account (use getAccounts to find IDs)",
				},
				leadId: {
					type: "string",
					description: "Filter by linked lead (use getLeads to find IDs)",
				},
				assignedId: {
					type: "string",
					description: "Filter by assigned person (use getPeople to find IDs)",
				},
				search: { type: "string" },
				stage: {
					type: "number",
					description:
						"Stage: 0=Contacted, 1=Won (don't use), 2=Lost, 3=Offer sent, 4=New, 6=Won PG/PD, 7=Won IO, 8=Won Publisher, 9=In pitch",
				},
				bookingStatus: {
					type: "number",
					description:
						"Booking Status: 1=Delivering completed + report sent, 2=Deal not ready, 4=Ready for midway report, 6=Ready for final report, 19=New IO's, 107=Booked / Delivering",
				},
				product: {
					type: "number",
					description:
						"Product: 3=Programmatic Guaranteed, 4=Insertion Order, 6=Brand Bridge, 19=Preferred Deal",
				},
			},
		},
	},
	{
		name: "getSalesActivities",
		description:
			"Get items from Sales Activities board. Monitor outreach, meetings, and deal progress.",
		inputSchema: {
			type: "object",
			properties: {
				limit: { type: "number", default: 10 },
				opportunityId: {
					type: "string",
					description:
						"Filter by linked opportunity (use getOpportunities to find IDs)",
				},
				assignedId: {
					type: "string",
					description: "Filter by assigned person (use getPeople to find IDs)",
				},
				search: { type: "string" },
				type: {
					type: "number",
					description:
						"Activity Type: 0=Call summary, 1=Email, 4=Event, 9=Anniversary (mærkedag), 11=Follow-up, 12=Send offer, 13=Social activity, 14=Meeting, 17=Contact (call/email/sms), 18=Agency presentation, 19=Media meeting",
				},
				status: {
					type: "number",
					description:
						"Status: 0=To do, 1=Done, 2=Open, 3=Planned, 4=Add Expense, 5=Waiting for progress",
				},
			},
		},
	},
	{
		name: "getInternalAdSales",
		description:
			"Get items from Internal - Ad Sales board. Track internal sales processes and targets.",
		inputSchema: {
			type: "object",
			properties: {
				limit: { type: "number", default: 10 },
				search: { type: "string" },
				status: { type: "number", description: "Sales Status index" },
			},
		},
	},

	// Tasks Tools
	{
		name: "getTasksAdOps",
		description:
			"Get items from Tasks - Ad Ops board. Monitor campaign setup and optimization tasks.",
		inputSchema: {
			type: "object",
			properties: {
				limit: { type: "number", default: 10 },
				assignedId: {
					type: "string",
					description: "Filter by assigned person (use getPeople to find IDs)",
				},
				search: { type: "string" },
				status: {
					type: "number",
					description:
						"Status: 0=In Review, 1=Done, 2=Rejected, 3=Planned, 4=In Progress, 5=Missing Status, 6=Waiting On Others, 7=New, 8=On Hold",
				},
				priority: {
					type: "number",
					description:
						"Priority: 0=Medium, 1=Minimal, 2=Low, 3=Critical, 4=High, 5=Not Prioritized, 6=Unknown",
				},
				type: {
					type: "number",
					description:
						"Type: 0=Hackathon, 1=Publisher, 2=Product, 3=Template, 5=Task",
				},
			},
		},
	},
	{
		name: "getTasksMarketing",
		description:
			"Get items from Tasks - Marketing board. Track marketing campaigns and initiatives.",
		inputSchema: {
			type: "object",
			properties: {
				limit: { type: "number", default: 10 },
				assignedId: {
					type: "string",
					description: "Filter by assigned person (use getPeople to find IDs)",
				},
				search: { type: "string" },
				status: {
					type: "number",
					description:
						"Status: 0=In Review, 1=Done, 2=Rejected, 3=Planned, 4=In Progress, 5=Missing Status, 6=Waiting On Others, 7=New, 8=On Hold",
				},
				priority: {
					type: "number",
					description:
						"Priority: 0=Medium, 1=Minimal, 2=Low, 3=Critical, 4=High, 5=Not Prioritized, 6=Unknown",
				},
				type: {
					type: "number",
					description:
						"Type: 0=Andet, 1=Kommunikationsplan Media Summit 2025, 3=Case, 4=Aktivitet, 19=Content",
				},
				channel: {
					type: "number",
					description:
						"Channel (dropdown): 0=LinkedIn, 1=Newsletter, 2=PR, 3=Annoncering, 4=Blogindlæg",
				},
			},
		},
	},
	{
		name: "getTasksAdTech",
		description:
			"Get items from Tasks - Ad Tech board. Monitor technical implementations and integrations.",
		inputSchema: {
			type: "object",
			properties: {
				limit: { type: "number", default: 10 },
				assignedId: {
					type: "string",
					description: "Filter by assigned person (use getPeople to find IDs)",
				},
				search: { type: "string" },
				status: {
					type: "number",
					description:
						"Status: 0=In Review, 1=Done, 2=Rejected, 3=Planned, 4=In Progress, 5=Missing Status, 6=Waiting On Others, 7=New, 8=On Hold",
				},
				priority: {
					type: "number",
					description:
						"Priority: 0=P2 - Medium, 1=P4 - Minimal, 2=P3 - Low, 3=P0 - Critical ⚠️️, 4=P1 - High, 5=Missing, 6=P5 - Unknown",
				},
				releaseStatus: {
					type: "number",
					description:
						"Release status: 0=Alpha (pre-testing), 1=Production (live), 2=Beta (pre-release), 3=Drift or bugs, 4=Reminder, 107=Research (bubbles)",
				},
			},
		},
	},
	{
		name: "getTasksVideo",
		description:
			"Get items from Tasks - Video board. Track video content and production tasks.",
		inputSchema: {
			type: "object",
			properties: {
				limit: { type: "number", default: 10 },
				assignedId: {
					type: "string",
					description: "Filter by assigned person (use getPeople to find IDs)",
				},
				search: { type: "string" },
				status: {
					type: "number",
					description:
						"Status: 0=In Review, 1=Done, 2=Rejected, 3=Planned, 4=In Progress, 5=Missing Status, 6=Waiting On Others, 7=New, 8=On Hold",
				},
				type: {
					type: "number",
					description:
						"Type: 0=Question, 1=Idea, 2=Opportunity, 3=Bug, 4=Development, 5=Not Labelled, 6=Stuck",
				},
			},
		},
	},
	{
		name: "getTasksYieldGrowth",
		description:
			"Get items from Tasks - Yield/Growth board. Monitor revenue optimization initiatives.",
		inputSchema: {
			type: "object",
			properties: {
				limit: { type: "number", default: 10 },
				assignedId: {
					type: "string",
					description: "Filter by assigned person (use getPeople to find IDs)",
				},
				search: { type: "string" },
				status: {
					type: "number",
					description:
						"Status: 0=In Review, 1=Done, 2=Rejected, 3=Planned, 4=In Progress, 5=Missing Status, 6=Waiting On Others, 7=New, 8=On Hold",
				},
				priority: { type: "number", description: "Priority index" },
			},
		},
	},

	// Development Tools
	{
		name: "getChangelog",
		description:
			"Get items from Changelog board. Track system updates and releases.",
		inputSchema: {
			type: "object",
			properties: {
				limit: { type: "number", default: 10 },
				search: { type: "string" },
				version: { type: "string", description: "Filter by version number" },
				type: { type: "number", description: "Change Type index" },
			},
		},
	},
	{
		name: "getFeatures",
		description:
			"Get items from Features board. Monitor feature requests and development.",
		inputSchema: {
			type: "object",
			properties: {
				limit: { type: "number", default: 10 },
				assignedId: {
					type: "string",
					description: "Filter by assigned person (use getPeople to find IDs)",
				},
				search: { type: "string" },
				status: {
					type: "number",
					description:
						"Status: 0=In Review, 1=Done, 2=Rejected, 3=Planned, 4=In Progress, 5=Missing Status, 6=Waiting On Others, 7=New, 8=On Hold",
				},
				priority: {
					type: "number",
					description:
						"Priority: 0=Medium, 1=Minimal, 2=Low, 3=Critical, 4=High, 5=Not Prioritized, 6=Unknown",
				},
			},
		},
	},
	{
		name: "getTests",
		description:
			"Get items from Tests board. Track QA testing and quality assurance.",
		inputSchema: {
			type: "object",
			properties: {
				limit: { type: "number", default: 10 },
				featureId: {
					type: "string",
					description: "Filter by linked feature (use getFeatures to find IDs)",
				},
				search: { type: "string" },
				status: { type: "number", description: "Test Status index" },
				result: { type: "number", description: "Test Result index" },
			},
		},
	},

	// Business Tools
	{
		name: "getPartners",
		description:
			"Get items from Partners board. Access business partner details and agreements.",
		inputSchema: {
			type: "object",
			properties: {
				limit: { type: "number", default: 10 },
				search: { type: "string" },
				type: { type: "number", description: "Partner Type index" },
				status: { type: "number", description: "Partnership Status index" },
			},
		},
	},
	{
		name: "getStrategies",
		description:
			"Get items from Strategies board. Monitor strategic initiatives and business plans.",
		inputSchema: {
			type: "object",
			properties: {
				limit: { type: "number", default: 10 },
				search: { type: "string" },
				quarter: {
					type: "string",
					description: 'Filter by quarter (e.g., "Q1 2024")',
				},
				status: { type: "number", description: "Strategy Status index" },
			},
		},
	},

	// Marketing Tools
	{
		name: "getMarketingExpenses",
		description:
			"Get items from Marketing Expenses board. Track marketing spend and ROI.",
		inputSchema: {
			type: "object",
			properties: {
				limit: { type: "number", default: 10 },
				budgetId: {
					type: "string",
					description:
						"Filter by linked budget (use getMarketingBudgets to find IDs)",
				},
				search: { type: "string" },
				category: { type: "number", description: "Expense Category index" },
				status: { type: "number", description: "Expense Status index" },
			},
		},
	},

	// Operations Tools
	{
		name: "getInternalAdOpsAdTech",
		description:
			"Get items from Internal - Ad Ops/AdTech board. Monitor internal operations processes.",
		inputSchema: {
			type: "object",
			properties: {
				limit: { type: "number", default: 10 },
				search: { type: "string" },
				type: { type: "number", description: "Process Type index" },
				status: { type: "number", description: "Process Status index" },
			},
		},
	},

	// Support Tools
	{
		name: "getPublisherFAQ",
		description:
			"Get items from Publisher FAQ board. Access frequently asked questions and answers.",
		inputSchema: {
			type: "object",
			properties: {
				limit: { type: "number", default: 10 },
				search: { type: "string" },
				category: { type: "number", description: "FAQ Category index" },
				status: { type: "number", description: "FAQ Status index" },
			},
		},
	},

	// Publishers Tools
	{
		name: "getOTTPublishers",
		description:
			"Get items from OTT Publishers board. Access Over-The-Top streaming publisher details.",
		inputSchema: {
			type: "object",
			properties: {
				limit: { type: "number", default: 10 },
				search: { type: "string" },
				platform: { type: "number", description: "Platform Type index" },
				status: { type: "number", description: "Publisher Status index" },
			},
		},
	},

	// Create/Update Tools - CRM
	{
		name: "createAccount",
		description: "Create a new account in the CRM system",
		inputSchema: {
			type: "object",
			properties: {
				name: { type: "string", description: "Account name" },
				status: {
					type: "number",
					description:
						"Account Status: 0=On hold, 4=Client, 13=Past Client, 17=New Biz",
				},
				status5: {
					type: "number",
					description:
						"Type: 0=Agency, 1=Agency Group, 2=Partner, 3=Publisher, 4=Publisher Lead, 107=Advertiser",
				},
				people: { type: "string", description: "Owner (person ID)" },
				email: { type: "string", description: "Email address" },
				phone: { type: "string", description: "Phone number" },
				text: { type: "string", description: "Website" },
				contactsId: {
					type: "string",
					description: "Link to contacts (use getContacts to find IDs)",
				},
				opportunitiesId: {
					type: "string",
					description:
						"Link to opportunities (use getOpportunities to find IDs)",
				},
				leadsId: {
					type: "string",
					description: "Link to leads (use getLeads to find IDs)",
				},
				groupId: { type: "string", description: "Group to add the item to" },
			},
			required: ["name"],
		},
	},
	{
		name: "updateAccount",
		description: "Update an existing account in the CRM system",
		inputSchema: {
			type: "object",
			properties: {
				itemId: { type: "string", description: "Item ID to update" },
				name: { type: "string", description: "Account name" },
				status: {
					type: "number",
					description:
						"Account Status: 0=On hold, 4=Client, 13=Past Client, 17=New Biz",
				},
				status5: {
					type: "number",
					description:
						"Type: 0=Agency, 1=Agency Group, 2=Partner, 3=Publisher, 4=Publisher Lead, 107=Advertiser",
				},
				people: { type: "string", description: "Owner (person ID)" },
				email: { type: "string", description: "Email address" },
				phone: { type: "string", description: "Phone number" },
				text: { type: "string", description: "Website" },
				contactsId: { type: "string", description: "Link to contacts" },
				opportunitiesId: {
					type: "string",
					description: "Link to opportunities",
				},
				leadsId: { type: "string", description: "Link to leads" },
			},
			required: ["itemId"],
		},
	},
	{
		name: "createContact",
		description: "Create a new contact in the CRM system",
		inputSchema: {
			type: "object",
			properties: {
				name: { type: "string", description: "Contact name" },
				status: {
					type: "number",
					description:
						"Department: 0=CEO/C-Suite, 1=Sales Director, 2=Sales Manager, 3=Head of Programmatic/Media, 10=AdOps, 102=Marketing, 103=Finance, 104=Data/Engineering/Tech, 108=Head of Creative",
				},
				people: { type: "string", description: "Owner (person ID)" },
				email: { type: "string", description: "Email address" },
				phone: { type: "string", description: "Phone number" },
				text: { type: "string", description: "Position" },
				accountId: {
					type: "string",
					description: "Link to account (use getAccounts to find IDs)",
				},
				opportunitiesId: {
					type: "string",
					description: "Link to opportunities",
				},
				leadsId: { type: "string", description: "Link to leads" },
				groupId: { type: "string", description: "Group to add the item to" },
			},
			required: ["name"],
		},
	},
	{
		name: "updateContact",
		description: "Update an existing contact in the CRM system",
		inputSchema: {
			type: "object",
			properties: {
				itemId: { type: "string", description: "Item ID to update" },
				name: { type: "string", description: "Contact name" },
				status: {
					type: "number",
					description:
						"Department: 0=CEO/C-Suite, 1=Sales Director, 2=Sales Manager, 3=Head of Programmatic/Media, 10=AdOps, 102=Marketing, 103=Finance, 104=Data/Engineering/Tech, 108=Head of Creative",
				},
				people: { type: "string", description: "Owner (person ID)" },
				email: { type: "string", description: "Email address" },
				phone: { type: "string", description: "Phone number" },
				text: { type: "string", description: "Position" },
				accountId: { type: "string", description: "Link to account" },
				opportunitiesId: {
					type: "string",
					description: "Link to opportunities",
				},
				leadsId: { type: "string", description: "Link to leads" },
			},
			required: ["itemId"],
		},
	},
	{
		name: "createLead",
		description: "Create a new lead in the CRM system",
		inputSchema: {
			type: "object",
			properties: {
				name: { type: "string", description: "Lead name" },
				status: {
					type: "number",
					description:
						"Lead Status: 0=Nurturing, 5=Closed Lost, 15=Lead, 20=Reached-out, 21=Connected, 22=Evaluated, 24=Qualified",
				},
				status1: {
					type: "number",
					description: "Lead Rating: 0=Hot, 1=Warm, 2=Cold",
				},
				status_12: { type: "number", description: "Tier: 0=1, 1=2, 2=3, 3=4" },
				people: { type: "string", description: "Owner (person ID)" },
				email: { type: "string", description: "Email address" },
				phone: { type: "string", description: "Phone number" },
				text: { type: "string", description: "Company" },
				accountId: { type: "string", description: "Link to account" },
				contactId: { type: "string", description: "Link to contact" },
				opportunitiesId: {
					type: "string",
					description: "Link to opportunities",
				},
				groupId: { type: "string", description: "Group to add the item to" },
			},
			required: ["name"],
		},
	},
	{
		name: "updateLead",
		description: "Update an existing lead in the CRM system",
		inputSchema: {
			type: "object",
			properties: {
				itemId: { type: "string", description: "Item ID to update" },
				name: { type: "string", description: "Lead name" },
				status: {
					type: "number",
					description:
						"Lead Status: 0=Nurturing, 5=Closed Lost, 15=Lead, 20=Reached-out, 21=Connected, 22=Evaluated, 24=Qualified",
				},
				status1: {
					type: "number",
					description: "Lead Rating: 0=Hot, 1=Warm, 2=Cold",
				},
				status_12: { type: "number", description: "Tier: 0=1, 1=2, 2=3, 3=4" },
				people: { type: "string", description: "Owner (person ID)" },
				email: { type: "string", description: "Email address" },
				phone: { type: "string", description: "Phone number" },
				text: { type: "string", description: "Company" },
				accountId: { type: "string", description: "Link to account" },
				contactId: { type: "string", description: "Link to contact" },
				opportunitiesId: {
					type: "string",
					description: "Link to opportunities",
				},
			},
			required: ["itemId"],
		},
	},

	// Sales Tools
	{
		name: "createOpportunity",
		description: "Create a new sales opportunity",
		inputSchema: {
			type: "object",
			properties: {
				name: { type: "string", description: "Opportunity name" },
				status: {
					type: "number",
					description:
						"Opportunity Stage: 0=Lead, 1=Lead Nurturing, 2=Meeting, 3=Negotiation, 4=Legal, 5=Sent Commercial, 7=Closed Lost, 9=Closed Won, 101=Pilot",
				},
				people: { type: "string", description: "Owner (person ID)" },
				status_14: {
					type: "number",
					description:
						"Product Type: 0=Display, 2=Video, 3=Display + Video, 5=OOH/DOOH, 8=Display + Video + OOH/DOOH, 10=Display + OOH/DOOH, 11=Video + OOH/DOOH",
				},
				numbers: { type: "number", description: "Deal Size" },
				leadId: { type: "string", description: "Link to lead" },
				accountId: { type: "string", description: "Link to account" },
				contactId: { type: "string", description: "Link to contact" },
				groupId: { type: "string", description: "Group to add the item to" },
			},
			required: ["name"],
		},
	},
	{
		name: "updateOpportunity",
		description: "Update an existing sales opportunity",
		inputSchema: {
			type: "object",
			properties: {
				itemId: { type: "string", description: "Item ID to update" },
				name: { type: "string", description: "Opportunity name" },
				status: {
					type: "number",
					description:
						"Opportunity Stage: 0=Lead, 1=Lead Nurturing, 2=Meeting, 3=Negotiation, 4=Legal, 5=Sent Commercial, 7=Closed Lost, 9=Closed Won, 101=Pilot",
				},
				people: { type: "string", description: "Owner (person ID)" },
				status_14: {
					type: "number",
					description:
						"Product Type: 0=Display, 2=Video, 3=Display + Video, 5=OOH/DOOH, 8=Display + Video + OOH/DOOH, 10=Display + OOH/DOOH, 11=Video + OOH/DOOH",
				},
				numbers: { type: "number", description: "Deal Size" },
				leadId: { type: "string", description: "Link to lead" },
				accountId: { type: "string", description: "Link to account" },
				contactId: { type: "string", description: "Link to contact" },
			},
			required: ["itemId"],
		},
	},
	{
		name: "createSalesActivity",
		description: "Create a new sales activity",
		inputSchema: {
			type: "object",
			properties: {
				name: { type: "string", description: "Activity name" },
				status: {
					type: "number",
					description:
						"Status: 0=To do, 1=Done, 2=Meeting canceled, 6=No meeting yet",
				},
				dropdown: {
					type: "number",
					description:
						"Activity Type: 0=Email, 1=Phone, 2=Call, 3=Meeting, 7=Note",
				},
				people: { type: "string", description: "Lead Owner (person ID)" },
				date: {
					type: "string",
					description: "Activity Date (YYYY-MM-DD format)",
				},
				text: { type: "string", description: "Notes" },
				accountId: { type: "string", description: "Link to account" },
				opportunityId: { type: "string", description: "Link to opportunity" },
				leadId: { type: "string", description: "Link to lead" },
				contactId: { type: "string", description: "Link to contact" },
				groupId: { type: "string", description: "Group to add the item to" },
			},
			required: ["name"],
		},
	},
	{
		name: "updateSalesActivity",
		description: "Update an existing sales activity",
		inputSchema: {
			type: "object",
			properties: {
				itemId: { type: "string", description: "Item ID to update" },
				name: { type: "string", description: "Activity name" },
				status: {
					type: "number",
					description:
						"Status: 0=To do, 1=Done, 2=Meeting canceled, 6=No meeting yet",
				},
				dropdown: {
					type: "number",
					description:
						"Activity Type: 0=Email, 1=Phone, 2=Call, 3=Meeting, 7=Note",
				},
				people: { type: "string", description: "Lead Owner (person ID)" },
				date: {
					type: "string",
					description: "Activity Date (YYYY-MM-DD format)",
				},
				text: { type: "string", description: "Notes" },
				accountId: { type: "string", description: "Link to account" },
				opportunityId: { type: "string", description: "Link to opportunity" },
				leadId: { type: "string", description: "Link to lead" },
				contactId: { type: "string", description: "Link to contact" },
			},
			required: ["itemId"],
		},
	},
	{
		name: "createDeal",
		description: "Create a new sales deal",
		inputSchema: {
			type: "object",
			properties: {
				name: { type: "string", description: "Deal name" },
				status: {
					type: "number",
					description:
						"Deal Stage: 0=Lead, 1=Meeting, 2=Proposal, 3=Negotiation, 9=Won, 5=Lost",
				},
				status5: {
					type: "number",
					description: "Deal Type: 0=New Business, 1=Expansion, 2=Renewal",
				},
				people: { type: "string", description: "Owner (person ID)" },
				numbers: { type: "number", description: "Deal Value" },
				date: { type: "string", description: "Close Date (YYYY-MM-DD format)" },
				accountId: { type: "string", description: "Link to account" },
				contactId: { type: "string", description: "Link to contact" },
				opportunityId: { type: "string", description: "Link to opportunity" },
				groupId: { type: "string", description: "Group to add the item to" },
			},
			required: ["name"],
		},
	},
	{
		name: "updateDeal",
		description: "Update an existing sales deal",
		inputSchema: {
			type: "object",
			properties: {
				itemId: { type: "string", description: "Item ID to update" },
				name: { type: "string", description: "Deal name" },
				status: {
					type: "number",
					description:
						"Deal Stage: 0=Lead, 1=Meeting, 2=Proposal, 3=Negotiation, 9=Won, 5=Lost",
				},
				status5: {
					type: "number",
					description: "Deal Type: 0=New Business, 1=Expansion, 2=Renewal",
				},
				people: { type: "string", description: "Owner (person ID)" },
				numbers: { type: "number", description: "Deal Value" },
				date: { type: "string", description: "Close Date (YYYY-MM-DD format)" },
				accountId: { type: "string", description: "Link to account" },
				contactId: { type: "string", description: "Link to contact" },
				opportunityId: { type: "string", description: "Link to opportunity" },
			},
			required: ["itemId"],
		},
	},

	// Development Tools
	{
		name: "createBug",
		description: "Create a new bug report",
		inputSchema: {
			type: "object",
			properties: {
				name: { type: "string", description: "Bug title" },
				status: {
					type: "number",
					description:
						"Status: 0=Open, 1=Fixed, 2=In Progress, 3=Pending Review, 4=Cancelled, 5=Investigating, 6=Won't Fix, 107=Retest",
				},
				priority: {
					type: "number",
					description:
						"Priority: 0=Critical, 1=High, 2=Medium, 3=Low, 4=Best Effort",
				},
				dropdown: {
					type: "number",
					description:
						"Type: 0=Bug, 1=Improvement, 2=Infrastructure, 3=Feature Request, 4=UI",
				},
				people: { type: "string", description: "Developer (person ID)" },
				long_text: { type: "string", description: "Bug Report" },
				text: { type: "string", description: "Environment" },
				groupId: { type: "string", description: "Group to add the item to" },
			},
			required: ["name"],
		},
	},
	{
		name: "updateBug",
		description: "Update an existing bug report",
		inputSchema: {
			type: "object",
			properties: {
				itemId: { type: "string", description: "Item ID to update" },
				name: { type: "string", description: "Bug title" },
				status: {
					type: "number",
					description:
						"Status: 0=Open, 1=Fixed, 2=In Progress, 3=Pending Review, 4=Cancelled, 5=Investigating, 6=Won't Fix, 107=Retest",
				},
				priority: {
					type: "number",
					description:
						"Priority: 0=Critical, 1=High, 2=Medium, 3=Low, 4=Best Effort",
				},
				dropdown: {
					type: "number",
					description:
						"Type: 0=Bug, 1=Improvement, 2=Infrastructure, 3=Feature Request, 4=UI",
				},
				people: { type: "string", description: "Developer (person ID)" },
				long_text: { type: "string", description: "Bug Report" },
				text: { type: "string", description: "Environment" },
			},
			required: ["itemId"],
		},
	},

	// Task Tools
	{
		name: "createTaskAdOps",
		description: "Create a new AdOps task",
		inputSchema: {
			type: "object",
			properties: {
				name: { type: "string", description: "Task name" },
				status: {
					type: "number",
					description:
						"Status: 0=Done, 3=Working on it, 4=New, 5=Waiting/On hold, 6=Ready to work, 8=Test pending, 9=Not doing, 10=In review, 11=Stuck",
				},
				priority: {
					type: "number",
					description: "Priority: 0=Critical, 1=High, 2=Medium, 3=Low",
				},
				people: { type: "string", description: "Person (person ID)" },
				date4: { type: "string", description: "Due Date (YYYY-MM-DD format)" },
				text: { type: "string", description: "Description" },
				groupId: { type: "string", description: "Group to add the item to" },
			},
			required: ["name"],
		},
	},
	{
		name: "updateTaskAdOps",
		description: "Update an existing AdOps task",
		inputSchema: {
			type: "object",
			properties: {
				itemId: { type: "string", description: "Item ID to update" },
				name: { type: "string", description: "Task name" },
				status: {
					type: "number",
					description:
						"Status: 0=Done, 3=Working on it, 4=New, 5=Waiting/On hold, 6=Ready to work, 8=Test pending, 9=Not doing, 10=In review, 11=Stuck",
				},
				priority: {
					type: "number",
					description: "Priority: 0=Critical, 1=High, 2=Medium, 3=Low",
				},
				people: { type: "string", description: "Person (person ID)" },
				date4: { type: "string", description: "Due Date (YYYY-MM-DD format)" },
				text: { type: "string", description: "Description" },
			},
			required: ["itemId"],
		},
	},
	{
		name: "createTaskMarketing",
		description: "Create a new Marketing task",
		inputSchema: {
			type: "object",
			properties: {
				name: { type: "string", description: "Task name" },
				status: {
					type: "number",
					description:
						"Status: 0=In Review, 1=Done, 2=Rejected, 3=Planned, 4=In Progress, 5=Missing Status, 6=Waiting On Others, 7=New, 8=On Hold",
				},
				priority: {
					type: "number",
					description: "Priority: 0=Critical, 1=High, 2=Medium, 3=Low",
				},
				people: { type: "string", description: "Assignee (person ID)" },
				date: { type: "string", description: "Due Date (YYYY-MM-DD format)" },
				long_text: { type: "string", description: "Notes" },
				groupId: { type: "string", description: "Group to add the item to" },
			},
			required: ["name"],
		},
	},
	{
		name: "updateTaskMarketing",
		description: "Update an existing Marketing task",
		inputSchema: {
			type: "object",
			properties: {
				itemId: { type: "string", description: "Item ID to update" },
				name: { type: "string", description: "Task name" },
				status: {
					type: "number",
					description:
						"Status: 0=In Review, 1=Done, 2=Rejected, 3=Planned, 4=In Progress, 5=Missing Status, 6=Waiting On Others, 7=New, 8=On Hold",
				},
				priority: {
					type: "number",
					description: "Priority: 0=Critical, 1=High, 2=Medium, 3=Low",
				},
				people: { type: "string", description: "Assignee (person ID)" },
				date: { type: "string", description: "Due Date (YYYY-MM-DD format)" },
				long_text: { type: "string", description: "Notes" },
			},
			required: ["itemId"],
		},
	},
	{
		name: "createTaskAdTech",
		description: "Create a new AdTech task",
		inputSchema: {
			type: "object",
			properties: {
				name: { type: "string", description: "Task name" },
				status: {
					type: "number",
					description:
						"Status: 0=Done, 2=In Progress, 3=New, 5=On Hold, 6=Waiting, 7=Blocked",
				},
				priority: {
					type: "number",
					description: "Priority: 0=Critical, 1=High, 2=Medium, 3=Low",
				},
				people: { type: "string", description: "Assignee (person ID)" },
				date4: { type: "string", description: "Due Date (YYYY-MM-DD format)" },
				text: { type: "string", description: "Notes" },
				groupId: { type: "string", description: "Group to add the item to" },
			},
			required: ["name"],
		},
	},
	{
		name: "updateTaskAdTech",
		description: "Update an existing AdTech task",
		inputSchema: {
			type: "object",
			properties: {
				itemId: { type: "string", description: "Item ID to update" },
				name: { type: "string", description: "Task name" },
				status: {
					type: "number",
					description:
						"Status: 0=Done, 2=In Progress, 3=New, 5=On Hold, 6=Waiting, 7=Blocked",
				},
				priority: {
					type: "number",
					description: "Priority: 0=Critical, 1=High, 2=Medium, 3=Low",
				},
				people: { type: "string", description: "Assignee (person ID)" },
				date4: { type: "string", description: "Due Date (YYYY-MM-DD format)" },
				text: { type: "string", description: "Notes" },
			},
			required: ["itemId"],
		},
	},
	{
		name: "createTaskVideo",
		description: "Create a new Video task",
		inputSchema: {
			type: "object",
			properties: {
				name: { type: "string", description: "Task name" },
				status: {
					type: "number",
					description:
						"Status: 0=Done, 1=Working on it, 2=Stuck, 3=On Hold, 9=New, 102=Missing Status",
				},
				priority: {
					type: "number",
					description: "Priority: 0=Critical, 1=High, 2=Medium, 3=Low",
				},
				people: { type: "string", description: "Assignee (person ID)" },
				date4: { type: "string", description: "Due Date (YYYY-MM-DD format)" },
				text: { type: "string", description: "Notes" },
				groupId: { type: "string", description: "Group to add the item to" },
			},
			required: ["name"],
		},
	},
	{
		name: "updateTaskVideo",
		description: "Update an existing Video task",
		inputSchema: {
			type: "object",
			properties: {
				itemId: { type: "string", description: "Item ID to update" },
				name: { type: "string", description: "Task name" },
				status: {
					type: "number",
					description:
						"Status: 0=Done, 1=Working on it, 2=Stuck, 3=On Hold, 9=New, 102=Missing Status",
				},
				priority: {
					type: "number",
					description: "Priority: 0=Critical, 1=High, 2=Medium, 3=Low",
				},
				people: { type: "string", description: "Assignee (person ID)" },
				date4: { type: "string", description: "Due Date (YYYY-MM-DD format)" },
				text: { type: "string", description: "Notes" },
			},
			required: ["itemId"],
		},
	},
	{
		name: "createTaskYieldGrowth",
		description: "Create a new Yield Growth task",
		inputSchema: {
			type: "object",
			properties: {
				name: { type: "string", description: "Task name" },
				status: {
					type: "number",
					description:
						"Status: 0=Done, 1=Working on it, 2=Stuck, 3=Waiting for review, 5=Not started",
				},
				priority: {
					type: "number",
					description: "Priority: 0=Critical, 1=High, 2=Medium, 3=Low",
				},
				people: { type: "string", description: "Assignee (person ID)" },
				date4: { type: "string", description: "Due Date (YYYY-MM-DD format)" },
				text: { type: "string", description: "Notes" },
				groupId: { type: "string", description: "Group to add the item to" },
			},
			required: ["name"],
		},
	},
	{
		name: "updateTaskYieldGrowth",
		description: "Update an existing Yield Growth task",
		inputSchema: {
			type: "object",
			properties: {
				itemId: { type: "string", description: "Item ID to update" },
				name: { type: "string", description: "Task name" },
				status: {
					type: "number",
					description:
						"Status: 0=Done, 1=Working on it, 2=Stuck, 3=Waiting for review, 5=Not started",
				},
				priority: {
					type: "number",
					description: "Priority: 0=Critical, 1=High, 2=Medium, 3=Low",
				},
				people: { type: "string", description: "Assignee (person ID)" },
				date4: { type: "string", description: "Due Date (YYYY-MM-DD format)" },
				text: { type: "string", description: "Notes" },
			},
			required: ["itemId"],
		},
	},

	// Business/OKR Tools
	{
		name: "createOKR",
		description: "Create a new OKR (Objectives and Key Results)",
		inputSchema: {
			type: "object",
			properties: {
				name: { type: "string", description: "OKR name" },
				status: {
					type: "number",
					description:
						"Status: 0=On Track, 1=At Risk, 2=Off Track, 3=Completed, 5=Not Started",
				},
				people: { type: "string", description: "Owner (person ID)" },
				numbers: { type: "number", description: "Progress (0-100)" },
				date: {
					type: "string",
					description: "Target Date (YYYY-MM-DD format)",
				},
				long_text: { type: "string", description: "Key Results" },
				teamId: {
					type: "string",
					description: "Link to team (use getTeams to find IDs)",
				},
				groupId: { type: "string", description: "Group to add the item to" },
			},
			required: ["name"],
		},
	},
	{
		name: "updateOKR",
		description: "Update an existing OKR (Objectives and Key Results)",
		inputSchema: {
			type: "object",
			properties: {
				itemId: { type: "string", description: "Item ID to update" },
				name: { type: "string", description: "OKR name" },
				status: {
					type: "number",
					description:
						"Status: 0=On Track, 1=At Risk, 2=Off Track, 3=Completed, 5=Not Started",
				},
				people: { type: "string", description: "Owner (person ID)" },
				numbers: { type: "number", description: "Progress (0-100)" },
				date: {
					type: "string",
					description: "Target Date (YYYY-MM-DD format)",
				},
				long_text: { type: "string", description: "Key Results" },
				teamId: { type: "string", description: "Link to team" },
			},
			required: ["itemId"],
		},
	},

	// Support Tools
	{
		name: "createTicket",
		description: "Create a new support ticket",
		inputSchema: {
			type: "object",
			properties: {
				name: { type: "string", description: "Ticket title" },
				status: {
					type: "number",
					description:
						"Status: 0=New, 1=In Progress, 2=Waiting for Customer, 3=Resolved, 4=Closed",
				},
				priority: {
					type: "number",
					description: "Priority: 0=Urgent, 1=High, 2=Medium, 3=Low",
				},
				people: { type: "string", description: "Assignee (person ID)" },
				email: { type: "string", description: "Customer Email" },
				text: { type: "string", description: "Subject" },
				long_text: { type: "string", description: "Description" },
				date: { type: "string", description: "Due Date (YYYY-MM-DD format)" },
				groupId: { type: "string", description: "Group to add the item to" },
			},
			required: ["name"],
		},
	},
	{
		name: "updateTicket",
		description: "Update an existing support ticket",
		inputSchema: {
			type: "object",
			properties: {
				itemId: { type: "string", description: "Item ID to update" },
				name: { type: "string", description: "Ticket title" },
				status: {
					type: "number",
					description:
						"Status: 0=New, 1=In Progress, 2=Waiting for Customer, 3=Resolved, 4=Closed",
				},
				priority: {
					type: "number",
					description: "Priority: 0=Urgent, 1=High, 2=Medium, 3=Low",
				},
				people: { type: "string", description: "Assignee (person ID)" },
				email: { type: "string", description: "Customer Email" },
				text: { type: "string", description: "Subject" },
				long_text: { type: "string", description: "Description" },
				date: { type: "string", description: "Due Date (YYYY-MM-DD format)" },
			},
			required: ["itemId"],
		},
	},
];
