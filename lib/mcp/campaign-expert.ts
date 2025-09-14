/**
 * Campaign Expert System for STEPhie MCP
 * 
 * A sophisticated workflow orchestration system for campaign planning,
 * analysis, and optimization using availabilityForecast and related tools.
 * 
 * Based on industry best practices and LLM agent patterns for media planning.
 */

import { type MCPPrompt } from './prompts.js';

/**
 * Campaign Expert Prompts - Advanced workflow templates for campaign planning
 */
export const campaignExpertPrompts: MCPPrompt[] = [
	// ============================================================================
	// DISCOVERY & ANALYSIS PHASE
	// ============================================================================
	{
		name: "campaign_discovery",
		description: "Initial discovery phase for new campaign planning. Gathers all available inventory and targeting options.",
		arguments: [
			{
				name: "client_industry",
				description: "Client's industry (e.g., 'automotive', 'retail', 'finance')",
				required: true
			},
			{
				name: "campaign_type",
				description: "Type of campaign (brand_awareness/performance/launch/seasonal)",
				required: true
			},
			{
				name: "market_scope",
				description: "Geographic scope (national/regional/local)",
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
				'getAllAdPrices',
				'getVertikaler',
				'getAudienceSegments'
			],
			workflow: [
				'Inventory Discovery: getAllProducts, getAllFormats, getAllSizes',
				'Publisher Analysis: getAllPublishers, getVertikaler',
				'Placement Options: getAllPlacements',
				'Pricing Structure: getAllAdPrices',
				'Audience Options: getAudienceSegments',
				'Compile comprehensive inventory report'
			],
			outputFormat: 'Complete inventory and targeting options catalog'
		}
	},

	// ============================================================================
	// STRATEGY DEVELOPMENT PHASE
	// ============================================================================
	{
		name: "campaign_strategy_builder",
		description: "Develop multi-tiered campaign strategy with budget allocation recommendations.",
		arguments: [
			{
				name: "campaign_objective",
				description: "Primary objective (awareness/consideration/conversion/retention)",
				required: true
			},
			{
				name: "total_budget",
				description: "Total campaign budget or impression goal",
				required: true
			},
			{
				name: "campaign_duration",
				description: "Campaign duration (e.g., '3 months', 'Q2 2024')",
				required: true
			},
			{
				name: "target_audience",
				description: "Target audience description",
				required: true
			},
			{
				name: "kpis",
				description: "Key performance indicators (e.g., 'reach, frequency, CTR')",
				required: false
			}
		],
		_meta: {
			toolsRequired: [
				'getStrategies',
				'getAudienceSegments',
				'findPublisherAdUnits',
				'getTargetingKeys',
				'getTargetingValues',
				'availabilityForecast'
			],
			workflow: [
				'Analyze existing strategies: getStrategies',
				'Map audience to segments: getAudienceSegments',
				'Identify optimal publishers: findPublisherAdUnits',
				'Setup custom targeting: getTargetingKeys, getTargetingValues',
				'Run tiered forecasts: Core, Extended, Premium',
				'Calculate budget allocation across tiers',
				'Generate strategy document with recommendations'
			],
			outputFormat: 'Tiered strategy with budget allocation and forecast data'
		}
	},

	// ============================================================================
	// SCENARIO PLANNING PHASE
	// ============================================================================
	{
		name: "campaign_scenario_matrix",
		description: "Generate comprehensive scenario matrix testing different targeting combinations.",
		arguments: [
			{
				name: "base_parameters",
				description: "Base campaign parameters (dates, budget)",
				required: true
			},
			{
				name: "variables_to_test",
				description: "Variables to test (publishers/formats/audiences/geo)",
				required: true
			},
			{
				name: "scenario_count",
				description: "Number of scenarios to generate (3-10)",
				required: false
			},
			{
				name: "optimization_goal",
				description: "What to optimize for (reach/efficiency/quality)",
				required: true
			}
		],
		_meta: {
			toolsRequired: [
				'availabilityForecast',
				'findPublisherAdUnits',
				'getPublisherFormats',
				'getContextualTargeting',
				'getGeoLocations',
				'getAudienceSegments'
			],
			workflow: [
				'Define scenario matrix based on variables',
				'Scenario 1: Baseline RON forecast',
				'Scenario 2: Premium publishers only',
				'Scenario 3: Contextual targeting focused',
				'Scenario 4: Audience segment optimized',
				'Scenario 5: Geographic concentration',
				'Scenario 6: Format-specific (video/native)',
				'Scenario 7: Mobile-first approach',
				'Scenario 8: Frequency optimized',
				'Compare all scenarios on KPIs',
				'Rank by optimization goal',
				'Generate comparison matrix'
			],
			outputFormat: 'Scenario comparison matrix with recommendations'
		}
	},

	// ============================================================================
	// COMPETITIVE ANALYSIS PHASE
	// ============================================================================
	{
		name: "campaign_competitive_intel",
		description: "Analyze competitive landscape and identify inventory opportunities.",
		arguments: [
			{
				name: "industry_vertical",
				description: "Industry vertical for analysis",
				required: true
			},
			{
				name: "competitor_size",
				description: "Competitor category (enterprise/medium/challenger)",
				required: true
			},
			{
				name: "time_period",
				description: "Analysis period",
				required: true
			},
			{
				name: "focus_areas",
				description: "Specific areas to analyze (formats/publishers/timing)",
				required: false
			}
		],
		_meta: {
			toolsRequired: [
				'getVertikaler',
				'getAllPublishers',
				'getPublisherFormats',
				'availabilityForecast',
				'getBookings',
				'getDeals'
			],
			workflow: [
				'Identify vertical-specific publishers: getVertikaler',
				'Analyze publisher format availability: getPublisherFormats',
				'Check booking patterns: getBookings',
				'Review deal structures: getDeals',
				'Run availability forecasts for key periods',
				'Identify inventory gaps and opportunities',
				'Generate competitive intelligence report'
			],
			outputFormat: 'Competitive analysis with opportunity identification'
		}
	},

	// ============================================================================
	// EXECUTION PLANNING PHASE
	// ============================================================================
	{
		name: "campaign_execution_plan",
		description: "Create detailed execution plan with phasing and optimization triggers.",
		arguments: [
			{
				name: "selected_strategy",
				description: "Selected strategy from strategy builder",
				required: true
			},
			{
				name: "launch_date",
				description: "Campaign launch date",
				required: true
			},
			{
				name: "phases",
				description: "Number of campaign phases",
				required: false
			},
			{
				name: "optimization_frequency",
				description: "How often to optimize (daily/weekly/monthly)",
				required: true
			}
		],
		_meta: {
			toolsRequired: [
				'availabilityForecast',
				'findPublisherAdUnits',
				'getAllSizes',
				'getPublisherFormats',
				'createTasksTechIntelligence'
			],
			workflow: [
				'Phase 1: Soft launch forecast (10% budget)',
				'Phase 2: Scale forecast (40% budget)',
				'Phase 3: Optimization forecast (35% budget)',
				'Phase 4: Retargeting forecast (15% budget)',
				'Define KPI thresholds for phase transitions',
				'Set optimization triggers and rules',
				'Create implementation tasks',
				'Generate execution timeline'
			],
			outputFormat: 'Phased execution plan with optimization framework'
		}
	},

	// ============================================================================
	// PREMIUM INVENTORY STRATEGIES
	// ============================================================================
	{
		name: "campaign_premium_planner",
		description: "Specialized planner for premium inventory and high-impact formats.",
		arguments: [
			{
				name: "premium_formats",
				description: "Desired premium formats (video/high-impact/native/OTT)",
				required: true
			},
			{
				name: "brand_safety_level",
				description: "Brand safety requirements (standard/elevated/maximum)",
				required: true
			},
			{
				name: "viewability_target",
				description: "Minimum viewability percentage",
				required: false
			},
			{
				name: "premium_budget_allocation",
				description: "Percentage of budget for premium",
				required: true
			}
		],
		_meta: {
			toolsRequired: [
				'getPublisherFormats',
				'getOTTPublisherDetails',
				'getAllFormats',
				'findPublisherAdUnits',
				'availabilityForecast',
				'getContextualTargeting'
			],
			workflow: [
				'Identify premium format availability: getPublisherFormats',
				'Check OTT inventory: getOTTPublisherDetails',
				'Filter for brand-safe environments',
				'Exclude sensitive contextual categories',
				'Run premium-only forecast',
				'Calculate premium CPM premiums',
				'Optimize for viewability and engagement',
				'Generate premium inventory plan'
			],
			outputFormat: 'Premium inventory strategy with pricing analysis'
		}
	},

	// ============================================================================
	// AUDIENCE-FIRST PLANNING
	// ============================================================================
	{
		name: "campaign_audience_architect",
		description: "Build campaign from audience segments outward, optimizing for behavioral targeting.",
		arguments: [
			{
				name: "primary_segments",
				description: "Primary audience segments to target",
				required: true
			},
			{
				name: "segment_priority",
				description: "Prioritization strategy (size/quality/cost)",
				required: true
			},
			{
				name: "lookalike_expansion",
				description: "Include lookalike audiences? (yes/no)",
				required: false
			},
			{
				name: "exclusion_segments",
				description: "Segments to exclude",
				required: false
			}
		],
		_meta: {
			toolsRequired: [
				'getAudienceSegments',
				'availabilityForecast',
				'findPublisherAdUnits',
				'getContextualTargeting',
				'getTargetingKeys',
				'getTargetingValues'
			],
			workflow: [
				'Analyze all available segments: getAudienceSegments',
				'Filter by size and relevance',
				'Build segment hierarchy',
				'Map segments to publisher inventory',
				'Add contextual layer for relevance',
				'Apply custom targeting for precision',
				'Run forecasts for each segment tier',
				'Calculate segment-specific CPMs',
				'Generate audience targeting strategy'
			],
			outputFormat: 'Audience-centric campaign plan with segment analysis'
		}
	},

	// ============================================================================
	// SEASONAL & EVENT CAMPAIGNS
	// ============================================================================
	{
		name: "campaign_seasonal_optimizer",
		description: "Optimize campaigns for seasonal events and peak periods.",
		arguments: [
			{
				name: "event_type",
				description: "Event type (black_friday/christmas/summer/back_to_school/custom)",
				required: true
			},
			{
				name: "peak_dates",
				description: "Peak period dates",
				required: true
			},
			{
				name: "ramp_up_period",
				description: "Pre-event ramp-up in days",
				required: true
			},
			{
				name: "competitive_intensity",
				description: "Expected competition level (low/medium/high/extreme)",
				required: true
			}
		],
		_meta: {
			toolsRequired: [
				'availabilityForecast',
				'getAllPublishers',
				'getPublisherFormats',
				'getAllAdPrices',
				'findPublisherAdUnits',
				'getBookings'
			],
			workflow: [
				'Analyze historical seasonal patterns',
				'Check current bookings for period',
				'Identify inventory scarcity risks',
				'Run pre-peak forecast',
				'Run peak period forecast',
				'Run post-peak forecast',
				'Calculate premium pricing for peak',
				'Identify alternative inventory options',
				'Generate seasonal strategy with contingencies'
			],
			outputFormat: 'Seasonal campaign plan with pricing dynamics'
		}
	},

	// ============================================================================
	// PERFORMANCE OPTIMIZATION
	// ============================================================================
	{
		name: "campaign_performance_optimizer",
		description: "Mid-campaign optimization analysis and reallocation recommendations.",
		arguments: [
			{
				name: "campaign_id",
				description: "Current campaign identifier",
				required: true
			},
			{
				name: "performance_data",
				description: "Current performance metrics",
				required: true
			},
			{
				name: "remaining_budget",
				description: "Remaining budget to allocate",
				required: true
			},
			{
				name: "optimization_goals",
				description: "What to optimize for",
				required: true
			}
		],
		_meta: {
			toolsRequired: [
				'availabilityForecast',
				'findPublisherAdUnits',
				'getPublisherFormats',
				'getAudienceSegments',
				'getTasksTechIntelligence'
			],
			workflow: [
				'Analyze current performance by segment',
				'Identify underperforming elements',
				'Find high-performing patterns',
				'Reforecast remaining inventory',
				'Test new targeting combinations',
				'Calculate reallocation scenarios',
				'Generate optimization recommendations',
				'Create implementation tasks'
			],
			outputFormat: 'Optimization plan with specific actions'
		}
	},

	// ============================================================================
	// COMPREHENSIVE PROPOSAL GENERATOR
	// ============================================================================
	{
		name: "campaign_master_proposal",
		description: "Generate complete, presentation-ready campaign proposal with all supporting data.",
		arguments: [
			{
				name: "client_brief",
				description: "Complete client brief and requirements",
				required: true
			},
			{
				name: "proposal_depth",
				description: "Level of detail (executive/detailed/comprehensive)",
				required: true
			},
			{
				name: "alternative_count",
				description: "Number of alternative approaches to present",
				required: false
			},
			{
				name: "include_competitors",
				description: "Include competitive analysis? (yes/no)",
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
				'getAllAdPrices',
				'getAudienceSegments',
				'getContextualTargeting',
				'getGeoLocations',
				'findPublisherAdUnits',
				'getPublisherFormats',
				'availabilityForecast',
				'getStrategies',
				'getVertikaler',
				'getOKR'
			],
			workflow: [
				'Executive Summary Generation',
				'Market Analysis: gather all inventory data',
				'Audience Insights: segment analysis',
				'Strategy Development: 3-tier approach',
				'Media Mix Optimization: channel allocation',
				'Publisher Recommendations: quality scoring',
				'Format Strategy: engagement optimization',
				'Targeting Framework: precision vs reach',
				'Budget Scenarios: 3 investment levels',
				'Forecast Analysis: availability confirmation',
				'Risk Assessment: inventory and pricing',
				'Performance Projections: KPI estimates',
				'Implementation Roadmap: phased approach',
				'Measurement Framework: attribution model',
				'Competitive Positioning: if requested',
				'Compile Professional Proposal Document'
			],
			outputFormat: 'Complete campaign proposal with executive summary, detailed strategy, forecasts, and appendices'
		}
	}
];

/**
 * Campaign Workflow Orchestrator
 * Manages complex multi-tool workflows for campaign planning
 */
export class CampaignWorkflowOrchestrator {
	private workflowState: Map<string, any> = new Map();
	private toolResults: Map<string, any> = new Map();

	/**
	 * Execute a campaign workflow
	 */
	async executeWorkflow(
		promptName: string,
		args: Record<string, string>,
		toolExecutor: (toolName: string, params: any) => Promise<any>
	): Promise<any> {
		const prompt = campaignExpertPrompts.find(p => p.name === promptName);
		if (!prompt) throw new Error(`Campaign prompt ${promptName} not found`);

		const workflow = prompt._meta?.workflow || [];
		const results: any[] = [];

		for (const step of workflow) {
			// Parse step to identify tools
			const toolMatches = step.match(/(\w+)(?:\([^)]*\))?/g) || [];
			
			for (const toolMatch of toolMatches) {
				const toolName = toolMatch.replace(/\([^)]*\)/, '');
				
				// Check if this is a known tool
				if (this.isKnownTool(toolName)) {
					const params = this.buildToolParams(toolName, args, this.toolResults);
					const result = await toolExecutor(toolName, params);
					this.toolResults.set(toolName, result);
					results.push({ tool: toolName, result });
				}
			}
		}

		return this.compileWorkflowResults(promptName, results);
	}

	/**
	 * Check if a string is a known tool name
	 */
	private isKnownTool(name: string): boolean {
		const knownTools = [
			'getAllProducts', 'getAllFormats', 'getAllSizes', 'getAllPublishers',
			'getAllPlacements', 'getAllAdPrices', 'getPublisherFormats',
			'findPublisherAdUnits', 'getTargetingKeys', 'getTargetingValues',
			'getAudienceSegments', 'getGeoLocations', 'getContextualTargeting',
			'availabilityForecast', 'getStrategies', 'getVertikaler',
			'getOTTPublisherDetails', 'getBookings', 'getDeals', 'getOKR'
		];
		return knownTools.includes(name);
	}

	/**
	 * Build parameters for a tool based on workflow context
	 */
	private buildToolParams(
		toolName: string,
		userArgs: Record<string, string>,
		previousResults: Map<string, any>
	): any {
		// Tool-specific parameter building logic
		switch (toolName) {
			case 'availabilityForecast':
				return this.buildForecastParams(userArgs, previousResults);
			case 'findPublisherAdUnits':
				return this.buildPublisherParams(userArgs, previousResults);
			case 'getAudienceSegments':
				return this.buildAudienceParams(userArgs);
			// Add more as needed
			default:
				return {};
		}
	}

	/**
	 * Build forecast parameters from context
	 */
	private buildForecastParams(
		userArgs: Record<string, string>,
		previousResults: Map<string, any>
	): any {
		const params: any = {
			startDate: userArgs.start_date || 'now',
			endDate: userArgs.end_date || this.calculateEndDate(30),
			sizes: [[300, 250], [728, 90], [320, 50]]
		};

		// Add publisher targeting if available
		const publisherResults = previousResults.get('findPublisherAdUnits');
		if (publisherResults) {
			params.targetedAdUnitIds = this.extractAdUnitIds(publisherResults);
		}

		// Add audience targeting if available
		const audienceResults = previousResults.get('getAudienceSegments');
		if (audienceResults) {
			params.audienceSegmentIds = this.extractSegmentIds(audienceResults);
		}

		return params;
	}

	/**
	 * Build publisher search parameters
	 */
	private buildPublisherParams(
		userArgs: Record<string, string>,
		previousResults: Map<string, any>
	): any {
		const verticalResults = previousResults.get('getVertikaler');
		
		return {
			names: userArgs.publisher_names?.split(',').map(s => s.trim()),
			verticals: verticalResults ? this.extractVerticals(verticalResults) : undefined
		};
	}

	/**
	 * Build audience segment parameters
	 */
	private buildAudienceParams(userArgs: Record<string, string>): any {
		return {
			search: userArgs.target_audience?.split(',').map(s => s.trim()),
			type: userArgs.audience_type || 'ALL',
			limit: 50
		};
	}

	/**
	 * Compile workflow results into final output
	 */
	private compileWorkflowResults(workflowName: string, results: any[]): any {
		// Workflow-specific compilation logic
		const summary = {
			workflow: workflowName,
			timestamp: new Date().toISOString(),
			toolsExecuted: results.length,
			results: results
		};

		// Add workflow-specific analysis
		if (workflowName.includes('proposal')) {
			return this.compileProposal(summary);
		} else if (workflowName.includes('scenario')) {
			return this.compileScenarios(summary);
		} else if (workflowName.includes('optimization')) {
			return this.compileOptimization(summary);
		}

		return summary;
	}

	/**
	 * Helper methods for data extraction
	 */
	private extractAdUnitIds(publisherData: any): number[] {
		// Extract ad unit IDs from publisher results
		try {
			const parsed = typeof publisherData === 'string' ? JSON.parse(publisherData) : publisherData;
			return parsed.data?.map((item: any) => parseInt(item.adUnitId)) || [];
		} catch {
			return [];
		}
	}

	private extractSegmentIds(segmentData: any): string[] {
		// Extract segment IDs from audience results
		try {
			const parsed = typeof segmentData === 'string' ? JSON.parse(segmentData) : segmentData;
			return parsed.data?.map((item: any) => item.gamId) || [];
		} catch {
			return [];
		}
	}

	private extractVerticals(verticalData: any): string[] {
		// Extract vertical names
		try {
			const parsed = typeof verticalData === 'string' ? JSON.parse(verticalData) : verticalData;
			return parsed.data?.map((item: any) => item.name) || [];
		} catch {
			return [];
		}
	}

	private calculateEndDate(daysFromNow: number): string {
		const date = new Date();
		date.setDate(date.getDate() + daysFromNow);
		return date.toISOString().split('T')[0];
	}

	/**
	 * Compilation methods for different workflow types
	 */
	private compileProposal(summary: any): any {
		return {
			...summary,
			proposalSections: {
				executiveSummary: 'Generated from workflow results',
				strategyRecommendation: 'Based on forecast analysis',
				budgetAllocation: 'Optimized across channels',
				expectedPerformance: 'KPI projections'
			}
		};
	}

	private compileScenarios(summary: any): any {
		return {
			...summary,
			scenarioComparison: {
				baseline: 'RON forecast results',
				targeted: 'Publisher-specific results',
				premium: 'High-impact format results',
				optimal: 'Recommended scenario'
			}
		};
	}

	private compileOptimization(summary: any): any {
		return {
			...summary,
			optimizationRecommendations: {
				reallocate: 'Budget reallocation suggestions',
				pause: 'Underperforming elements to pause',
				scale: 'High-performing elements to scale',
				test: 'New elements to test'
			}
		};
	}
}

/**
 * Export all campaign expert prompts for registration
 */
export function getCampaignExpertPrompts(): MCPPrompt[] {
	return campaignExpertPrompts;
}