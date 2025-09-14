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
	// ============================================
	// CAMPAIGN EXPERT WORKFLOWS
	// Comprehensive multi-tool orchestrations for advanced campaign planning
	// ============================================

	// Discovery & Analysis Workflows
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
				'getAllSizes',
				'getAllPlacements',
				'getAllVerticals',
				'getAllAdPrices',
				'getAudienceSegments',
				'getTargetingKeys',
				'getTargetingValues',
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

	// All campaign expert workflows require orchestration
	// They don't map directly to single tool parameters
	if (promptName.startsWith('campaign_')) {
		return {
			_workflowType: promptName,
			_workflowArgs: args,
			_meta: prompt._meta
		};
	}

	// Default fallback for any non-workflow prompts
	return args;
}

// Helper functions removed - campaign expert workflows handle dates contextually