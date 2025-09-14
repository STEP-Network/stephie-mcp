/**
 * MCP Prompts for STEPhie
 * 
 * Prompts are pre-configured templates that guide users through complex operations.
 * They're especially useful for tools like availabilityForecast that have many parameters.
 */

export interface MCPPrompt {
	name: string;
	description: string;
	arguments?: Array<{
		name: string;
		description: string;
		required?: boolean;
	}>;
	// Additional metadata to help LLMs understand the workflow
	_meta?: {
		toolsRequired: string[];  // Tools that will be used
		workflow?: string[];      // Step-by-step workflow
		outputFormat?: string;    // Expected output format
	};
}

export const prompts: MCPPrompt[] = [
	// Basic Forecast Prompts
	{
		name: "forecast_basic",
		description: "Basic availability forecast for a standard display campaign. Guides through essential parameters only.",
		arguments: [
			{
				name: "campaign_name",
				description: "Name or description of the campaign (e.g., 'Q1 Brand Awareness')",
				required: true
			},
			{
				name: "duration_days",
				description: "Campaign duration in days (e.g., 30)",
				required: true
			},
			{
				name: "target_impressions",
				description: "Target number of impressions (leave empty for maximum available)",
				required: false
			}
		]
	},

	{
		name: "forecast_publisher_specific",
		description: "Forecast for specific publishers/sites. Helps target inventory on particular websites.",
		arguments: [
			{
				name: "publisher_names",
				description: "Comma-separated publisher names (e.g., 'jv.dk, berlingske.dk')",
				required: true
			},
			{
				name: "start_date",
				description: "Campaign start date (YYYY-MM-DD or 'now')",
				required: true
			},
			{
				name: "end_date",
				description: "Campaign end date (YYYY-MM-DD)",
				required: true
			},
			{
				name: "exclude_premium",
				description: "Exclude premium placements like interstitials? (yes/no)",
				required: false
			}
		],
		_meta: {
			toolsRequired: ['findPublisherAdUnits', 'availabilityForecast'],
			workflow: [
				'Call findPublisherAdUnits with publisher_names to get ad unit IDs',
				'Extract publisher and child ad unit IDs from response',
				'If exclude_premium, identify premium child units to exclude',
				'Call availabilityForecast with targetedAdUnitIds and excludedAdUnitIds'
			],
			outputFormat: 'Forecast results with publisher-specific inventory availability'
		}
	},

	{
		name: "forecast_contextual",
		description: "Forecast using contextual targeting for relevant content categories.",
		arguments: [
			{
				name: "categories",
				description: "Target categories (e.g., 'sports, news, automotive')",
				required: true
			},
			{
				name: "exclude_sensitive",
				description: "Exclude sensitive categories? (yes/no, default: yes)",
				required: false
			},
			{
				name: "date_range",
				description: "Date range (e.g., 'next 30 days', '2024-02-01 to 2024-02-29')",
				required: true
			}
		],
		_meta: {
			toolsRequired: ['getContextualTargeting', 'availabilityForecast'],
			workflow: [
				'Call getContextualTargeting with search terms from categories',
				'Extract category IDs for targeting',
				'If exclude_sensitive, get sensitive category IDs',
				'Call availabilityForecast with customTargeting using keyId: 14509472'
			],
			outputFormat: 'Forecast with contextual category breakdown'
		}
	},

	{
		name: "forecast_audience",
		description: "Forecast targeting specific audience segments with demographics.",
		arguments: [
			{
				name: "audience_type",
				description: "Type of audience (e.g., '1st Party', '3rd Party', 'Omniseg')",
				required: true
			},
			{
				name: "segment_names",
				description: "Specific segments to target (optional, searches by name)",
				required: false
			},
			{
				name: "min_segment_size",
				description: "Minimum segment size required",
				required: false
			},
			{
				name: "campaign_dates",
				description: "Campaign period (e.g., 'February 2024')",
				required: true
			}
		]
	},

	{
		name: "forecast_geo",
		description: "Geographic targeting forecast for location-based campaigns.",
		arguments: [
			{
				name: "locations",
				description: "Target locations (e.g., 'Copenhagen, Aarhus' or 'Denmark')",
				required: true
			},
			{
				name: "exclude_locations",
				description: "Locations to exclude (optional)",
				required: false
			},
			{
				name: "campaign_period",
				description: "Campaign period",
				required: true
			}
		]
	},

	// Advanced Forecast Prompts
	{
		name: "forecast_vertical",
		description: "Forecast for specific content verticals (News, Sport, Auto, etc.)",
		arguments: [
			{
				name: "verticals",
				description: "Target verticals (News/Sport/Auto/Pets/Food & Lifestyle/Home & Garden/Gaming & Tech)",
				required: true
			},
			{
				name: "dates",
				description: "Campaign dates",
				required: true
			},
			{
				name: "frequency_cap",
				description: "Max impressions per user per week (optional)",
				required: false
			}
		]
	},

	{
		name: "forecast_custom_targeting",
		description: "Advanced forecast with custom key-value targeting.",
		arguments: [
			{
				name: "targeting_keys",
				description: "Custom targeting keys to use (will list available)",
				required: true
			},
			{
				name: "values_search",
				description: "Search terms for values",
				required: true
			},
			{
				name: "dates",
				description: "Campaign dates",
				required: true
			}
		]
	},

	{
		name: "forecast_competitive_analysis",
		description: "Analyze inventory availability across multiple scenarios for competitive insights.",
		arguments: [
			{
				name: "scenarios",
				description: "Number of different targeting scenarios to test (e.g., 3)",
				required: true
			},
			{
				name: "base_targeting",
				description: "Base targeting criteria to vary (e.g., 'publishers', 'geo', 'audience')",
				required: true
			},
			{
				name: "comparison_period",
				description: "Period to analyze",
				required: true
			}
		]
	},

	{
		name: "forecast_seasonal_campaign",
		description: "Forecast for seasonal campaigns with specific timing requirements.",
		arguments: [
			{
				name: "season_event",
				description: "Seasonal event (e.g., 'Christmas', 'Black Friday', 'Summer Sale')",
				required: true
			},
			{
				name: "lead_time_days",
				description: "Days before event to start campaign",
				required: true
			},
			{
				name: "targeting_strategy",
				description: "Broad, focused, or premium targeting?",
				required: true
			}
		]
	},

	{
		name: "forecast_roi_optimization",
		description: "Multi-scenario forecast to find optimal ROI configuration.",
		arguments: [
			{
				name: "budget_constraint",
				description: "Budget consideration (high/medium/low/flexible)",
				required: true
			},
			{
				name: "performance_goal",
				description: "Primary goal (reach/frequency/efficiency)",
				required: true
			},
			{
				name: "test_variations",
				description: "Number of variations to test",
				required: true
			}
		]
	},

	// Workflow Prompts
	{
		name: "forecast_complete_proposal",
		description: "Generate a complete campaign proposal with multiple forecast scenarios.",
		arguments: [
			{
				name: "client_name",
				description: "Client or campaign name",
				required: true
			},
			{
				name: "campaign_objective",
				description: "Campaign objective (awareness/conversion/traffic)",
				required: true
			},
			{
				name: "budget_range",
				description: "Budget range or impression goals",
				required: false
			},
			{
				name: "constraints",
				description: "Any specific requirements or restrictions",
				required: false
			}
		],
		_meta: {
			toolsRequired: [
				'getAllProducts',
				'getAllFormats', 
				'getAllSizes',
				'getAllPublishers',
				'getAllPlacements',
				'getAudienceSegments',
				'availabilityForecast'
			],
			workflow: [
				'Gather available inventory: getAllProducts, getAllFormats, getAllSizes',
				'Identify publisher options: getAllPublishers, getAllPlacements',
				'Get audience segments if objective is conversion/traffic',
				'Run baseline RON forecast',
				'Run targeted forecast with top publishers',
				'Run premium format forecast if awareness objective',
				'Compare scenarios and compile proposal'
			],
			outputFormat: 'Multi-scenario proposal with recommendations'
		}
	},

	{
		name: "forecast_inventory_audit",
		description: "Comprehensive inventory availability audit across all targeting options.",
		arguments: [
			{
				name: "audit_period",
				description: "Period to audit (e.g., 'Next Quarter', 'March 2024')",
				required: true
			},
			{
				name: "granularity",
				description: "Level of detail (high/medium/summary)",
				required: true
			}
		]
	},

	// Publisher Analysis Prompts
	{
		name: "analyze_publisher_inventory",
		description: "Deep analysis of specific publisher's available inventory.",
		arguments: [
			{
				name: "publisher",
				description: "Publisher name or group",
				required: true
			},
			{
				name: "time_period",
				description: "Analysis period",
				required: true
			},
			{
				name: "compare_formats",
				description: "Compare different ad formats? (yes/no)",
				required: false
			}
		]
	},

	// Quick Actions
	{
		name: "quick_ron_forecast",
		description: "Quick Run of Network (RON) forecast for maximum reach.",
		arguments: [
			{
				name: "days",
				description: "Number of days for campaign",
				required: true
			}
		]
	},

	{
		name: "quick_premium_inventory",
		description: "Check availability of premium inventory (video, high-impact formats).",
		arguments: [
			{
				name: "format_type",
				description: "Premium format type (video/high-impact/native)",
				required: true
			},
			{
				name: "dates",
				description: "Target dates",
				required: true
			}
		]
	},

	// Expert Campaign Workflows - Advanced multi-tool orchestrations
	{
		name: "campaign_discovery_complete",
		description: "Complete inventory and targeting discovery for campaign planning. Comprehensively maps available inventory, targeting options, and constraints.",
		arguments: [
			{
				name: "focus_areas",
				description: "Comma-separated areas to focus on (e.g., 'publishers,audiences,contextual')",
				required: false
			}
		],
		_meta: {
			toolsRequired: [
				'getAllPublishers',
				'getAllProducts',
				'getAllFormats',
				'getAudienceSegments',
				'getContextualTargeting',
				'getTargetingKeys'
			],
			workflow: [
				'Map entire publisher ecosystem with getAllPublishers',
				'Catalog all available products and formats',
				'Discover audience segments for targeting',
				'Explore contextual categories',
				'Identify custom targeting keys',
				'Compile comprehensive inventory report'
			],
			outputFormat: 'Complete inventory and targeting capabilities report'
		}
	},

	{
		name: "campaign_strategy_builder",
		description: "Build data-driven campaign strategy with market analysis. Analyzes competitive landscape and recommends optimal approach.",
		arguments: [
			{
				name: "client_vertical",
				description: "Client industry vertical",
				required: true
			},
			{
				name: "campaign_goal",
				description: "Primary campaign goal (awareness/consideration/conversion)",
				required: true
			},
			{
				name: "competitive_brands",
				description: "Competitor brands to analyze (comma-separated)",
				required: false
			},
			{
				name: "budget_level",
				description: "Budget tier (premium/standard/efficiency)",
				required: true
			}
		],
		_meta: {
			toolsRequired: [
				'getTargetingKeys',
				'getTargetingValues',
				'findPublisherAdUnits',
				'getContextualTargeting',
				'availabilityForecast'
			],
			workflow: [
				'Research competitive targeting with getTargetingKeys/Values',
				'Identify key publisher partnerships',
				'Map contextual alignment opportunities',
				'Run competitive scenario forecasts',
				'Analyze market gaps and opportunities',
				'Develop strategic recommendations'
			],
			outputFormat: 'Strategic campaign blueprint with competitive insights'
		}
	},

	{
		name: "campaign_scenario_planner",
		description: "Multi-scenario planning with what-if analysis. Tests various targeting combinations to find optimal configuration.",
		arguments: [
			{
				name: "base_scenario",
				description: "Starting point scenario description",
				required: true
			},
			{
				name: "variables_to_test",
				description: "Variables to vary (publishers/audiences/dates/formats)",
				required: true
			},
			{
				name: "num_scenarios",
				description: "Number of scenarios to generate (3-10)",
				required: true
			},
			{
				name: "optimization_metric",
				description: "Metric to optimize (reach/frequency/cost/coverage)",
				required: true
			}
		],
		_meta: {
			toolsRequired: [
				'availabilityForecast',
				'findPublisherAdUnits',
				'getAudienceSegments',
				'getGeoLocations'
			],
			workflow: [
				'Define baseline scenario parameters',
				'Generate scenario variations based on variables',
				'Execute availability forecasts for each scenario',
				'Calculate performance metrics',
				'Rank scenarios by optimization metric',
				'Provide comparative analysis and recommendations'
			],
			outputFormat: 'Scenario comparison matrix with recommendations'
		}
	},

	{
		name: "campaign_competitive_intelligence",
		description: "Competitive campaign intelligence gathering. Analyzes market positioning and identifies opportunities.",
		arguments: [
			{
				name: "industry",
				description: "Industry to analyze",
				required: true
			},
			{
				name: "competitor_focus",
				description: "Specific competitors to track (optional)",
				required: false
			},
			{
				name: "time_period",
				description: "Analysis period",
				required: true
			}
		],
		_meta: {
			toolsRequired: [
				'getTargetingKeys',
				'getTargetingValues',
				'getContextualTargeting',
				'findPublisherAdUnits',
				'availabilityForecast'
			],
			workflow: [
				'Identify industry-specific targeting keys',
				'Map competitor targeting patterns',
				'Analyze publisher preferences',
				'Assess inventory pressure points',
				'Identify underutilized opportunities',
				'Compile competitive insights report'
			],
			outputFormat: 'Competitive landscape analysis with strategic opportunities'
		}
	},

	{
		name: "campaign_execution_planner",
		description: "Detailed execution plan with trafficking instructions. Creates implementation-ready campaign blueprint.",
		arguments: [
			{
				name: "campaign_name",
				description: "Campaign identifier",
				required: true
			},
			{
				name: "approved_strategy",
				description: "Brief description of approved strategy",
				required: true
			},
			{
				name: "start_date",
				description: "Campaign start date",
				required: true
			},
			{
				name: "flight_schedule",
				description: "Flighting requirements (continuous/pulsing/custom)",
				required: true
			}
		],
		_meta: {
			toolsRequired: [
				'availabilityForecast',
				'findPublisherAdUnits',
				'getAllFormats',
				'getAllSizes',
				'getAllPlacements'
			],
			workflow: [
				'Finalize targeting parameters',
				'Confirm inventory availability',
				'Map creative requirements to formats',
				'Define placement strategies',
				'Generate trafficking specifications',
				'Create implementation checklist'
			],
			outputFormat: 'Execution-ready campaign specifications'
		}
	},

	{
		name: "campaign_premium_maximizer",
		description: "Premium inventory optimization for high-impact campaigns. Focuses on viewability and engagement.",
		arguments: [
			{
				name: "brand_name",
				description: "Brand requiring premium placement",
				required: true
			},
			{
				name: "premium_criteria",
				description: "Premium requirements (viewability/position/format)",
				required: true
			},
			{
				name: "budget_allocation",
				description: "Percentage for premium vs standard",
				required: true
			}
		],
		_meta: {
			toolsRequired: [
				'getAllFormats',
				'getAllPlacements',
				'findPublisherAdUnits',
				'availabilityForecast'
			],
			workflow: [
				'Identify premium format options',
				'Map top-tier publisher inventory',
				'Evaluate placement opportunities',
				'Forecast premium availability',
				'Calculate premium vs standard mix',
				'Optimize for maximum impact'
			],
			outputFormat: 'Premium inventory strategy with budget allocation'
		}
	},

	{
		name: "campaign_audience_orchestrator",
		description: "Audience-first campaign orchestration with segment optimization. Maximizes audience reach and relevance.",
		arguments: [
			{
				name: "target_segments",
				description: "Primary audience segments",
				required: true
			},
			{
				name: "segment_priority",
				description: "Priority order for segments",
				required: true
			},
			{
				name: "overlap_strategy",
				description: "How to handle segment overlap (include/exclude/optimize)",
				required: true
			}
		],
		_meta: {
			toolsRequired: [
				'getAudienceSegments',
				'availabilityForecast',
				'getContextualTargeting',
				'findPublisherAdUnits'
			],
			workflow: [
				'Map available audience segments',
				'Analyze segment sizes and overlaps',
				'Identify contextual alignment',
				'Match segments to publisher affinity',
				'Forecast reach by segment',
				'Optimize segment mix for goals'
			],
			outputFormat: 'Audience strategy with segment-level forecasts'
		}
	},

	{
		name: "campaign_seasonal_optimizer",
		description: "Seasonal campaign optimization with timing strategy. Maximizes impact during key seasonal moments.",
		arguments: [
			{
				name: "season_event",
				description: "Seasonal event or holiday",
				required: true
			},
			{
				name: "ramp_strategy",
				description: "How to ramp up (gradual/burst/sustained)",
				required: true
			},
			{
				name: "competitive_factor",
				description: "Expected competition level (high/medium/low)",
				required: true
			}
		],
		_meta: {
			toolsRequired: [
				'availabilityForecast',
				'findPublisherAdUnits',
				'getContextualTargeting'
			],
			workflow: [
				'Analyze seasonal inventory patterns',
				'Identify peak demand periods',
				'Map contextual opportunities',
				'Forecast availability by phase',
				'Develop pacing strategy',
				'Create contingency plans'
			],
			outputFormat: 'Seasonal campaign calendar with pacing strategy'
		}
	},

	{
		name: "campaign_performance_optimizer",
		description: "Performance optimization workflow for ongoing campaigns. Identifies optimization opportunities.",
		arguments: [
			{
				name: "campaign_id",
				description: "Current campaign identifier",
				required: true
			},
			{
				name: "performance_issue",
				description: "Issue to address (delivery/pacing/targeting)",
				required: true
			},
			{
				name: "optimization_goal",
				description: "What to optimize for",
				required: true
			}
		],
		_meta: {
			toolsRequired: [
				'availabilityForecast',
				'findPublisherAdUnits',
				'getTargetingValues'
			],
			workflow: [
				'Analyze current targeting setup',
				'Identify performance bottlenecks',
				'Test alternative configurations',
				'Forecast impact of changes',
				'Recommend optimizations',
				'Project performance improvements'
			],
			outputFormat: 'Optimization recommendations with projected impact'
		}
	},

	{
		name: "campaign_proposal_master",
		description: "Master proposal generator with full campaign blueprint. Creates comprehensive, client-ready proposals.",
		arguments: [
			{
				name: "client_name",
				description: "Client name",
				required: true
			},
			{
				name: "proposal_type",
				description: "Proposal type (new_business/renewal/upsell)",
				required: true
			},
			{
				name: "business_objective",
				description: "Client's business objective",
				required: true
			},
			{
				name: "success_metrics",
				description: "How success will be measured",
				required: true
			},
			{
				name: "constraints",
				description: "Any constraints or requirements",
				required: false
			}
		],
		_meta: {
			toolsRequired: [
				'getAllPublishers',
				'getAllProducts',
				'getAllFormats',
				'getAudienceSegments',
				'getContextualTargeting',
				'getTargetingKeys',
				'findPublisherAdUnits',
				'availabilityForecast'
			],
			workflow: [
				'Complete inventory discovery',
				'Analyze targeting opportunities',
				'Develop strategic approach',
				'Create multiple scenario forecasts',
				'Build recommendation matrix',
				'Compile executive summary',
				'Generate detailed appendices'
			],
			outputFormat: 'Complete campaign proposal with executive summary, recommendations, and appendices'
		}
	}
];

/**
 * Get prompt by name
 */
export function getPrompt(name: string): MCPPrompt | undefined {
	return prompts.find(p => p.name === name);
}

/**
 * Format prompt for execution - converts prompt arguments to tool parameters
 */
export function formatPromptForExecution(promptName: string, args: Record<string, string>): any {
	const prompt = getPrompt(promptName);
	if (!prompt) throw new Error(`Prompt ${promptName} not found`);

	// Map prompt arguments to actual tool parameters based on prompt type
	switch (promptName) {
		case 'forecast_basic':
			return {
				startDate: 'now',
				endDate: calculateEndDate(parseInt(args.duration_days || '30')),
				sizes: [[300, 250], [728, 90], [320, 50]], // Common sizes
				goalQuantity: args.target_impressions ? parseInt(args.target_impressions) : null
			};

		case 'forecast_publisher_specific':
			return {
				startDate: args.start_date,
				endDate: args.end_date,
				sizes: [[300, 250], [728, 90], [320, 50]],
				// Note: Would need to call findPublisherAdUnits first to get IDs
				_publishers: args.publisher_names.split(',').map(s => s.trim()),
				_excludePremium: args.exclude_premium === 'yes'
			};

		case 'forecast_contextual':
			return {
				startDate: parseDateRange(args.date_range).start,
				endDate: parseDateRange(args.date_range).end,
				sizes: [[300, 250], [728, 90]],
				// Note: Would need to call getContextualTargeting first
				_categories: args.categories.split(',').map(s => s.trim()),
				_excludeSensitive: args.exclude_sensitive !== 'no'
			};

		// Campaign Expert Workflows - These require orchestration
		case 'campaign_discovery_complete':
		case 'campaign_strategy_builder':
		case 'campaign_scenario_planner':
		case 'campaign_competitive_intelligence':
		case 'campaign_execution_planner':
		case 'campaign_premium_maximizer':
		case 'campaign_audience_orchestrator':
		case 'campaign_seasonal_optimizer':
		case 'campaign_performance_optimizer':
		case 'campaign_proposal_master':
			// These prompts require workflow orchestration
			// They don't map directly to single tool parameters
			return {
				_workflowType: promptName,
				_workflowArgs: args,
				_meta: prompt._meta
			};

		// Add more mappings as needed...

		default:
			return args;
	}
}

/**
 * Helper to calculate end date from duration
 */
function calculateEndDate(daysFromNow: number): string {
	const date = new Date();
	date.setDate(date.getDate() + daysFromNow);
	return date.toISOString().split('T')[0];
}

/**
 * Helper to parse flexible date ranges
 */
function parseDateRange(range: string): { start: string; end: string } {
	// Handle various formats like "next 30 days", "February 2024", etc.
	const lower = range.toLowerCase();
	
	if (lower.includes('next') && lower.includes('days')) {
		const days = parseInt(lower.match(/\d+/)?.[0] || '30');
		return {
			start: 'now',
			end: calculateEndDate(days)
		};
	}
	
	// Add more parsing logic as needed
	
	// Default fallback
	return {
		start: 'now',
		end: calculateEndDate(30)
	};
}