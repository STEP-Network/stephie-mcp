/**
 * MCP Prompt Message Generation
 * 
 * This module shows how prompts generate messages that guide tool usage.
 * In MCP, prompts return messages that the LLM interprets to decide which tools to call.
 */

import { type MCPPrompt } from './prompts.js';

/**
 * Generate a message from a prompt with filled arguments
 * This is what would be returned by the MCP server when a prompt is executed
 */
export function generatePromptMessage(
	promptName: string,
	args: Record<string, string>
): { role: string; content: string } {
	// Campaign Expert Workflows
	switch (promptName) {
		case 'campaign_discovery_complete':
			return {
				role: 'assistant',
				content: `I'll perform a complete inventory and targeting discovery analysis${args.focus_areas ? ` with focus on ${args.focus_areas}` : ''}.

This comprehensive discovery will map:
- Publisher ecosystem and available inventory
- Product catalog with formats and sizes
- Audience segments for targeting
- Contextual categories
- Custom targeting capabilities

Starting discovery process...

[Tool sequence:
1. getAllPublishers - Map publisher ecosystem
2. getAllProducts - Catalog available products
3. getAllFormats - Document supported formats
4. getAudienceSegments - Discover targeting segments
5. getContextualTargeting - Explore content categories
6. getTargetingKeys - Identify custom targeting options
]

Compiling comprehensive inventory report...`
			};

		case 'campaign_strategy_builder':
			return {
				role: 'assistant',
				content: `I'll build a data-driven campaign strategy for ${args.client_vertical} with ${args.campaign_goal} goal and ${args.budget_level} budget tier.

Strategy development will include:
- Competitive landscape analysis${args.competitive_brands ? ` for ${args.competitive_brands}` : ''}
- Market opportunity assessment
- Optimal targeting recommendations
- Strategic positioning

Initiating market analysis...

[Tool: getTargetingKeys - Research industry targeting patterns]
[Tool: getTargetingValues with vertical: "${args.client_vertical}"]
[Tool: findPublisherAdUnits - Identify key publisher partnerships]
[Tool: getContextualTargeting with search: "${args.client_vertical}"]

Running competitive scenario forecasts...

[Tool: availabilityForecast - Multiple scenarios based on competitive insights]

Developing strategic recommendations based on analysis...`
			};

		case 'campaign_proposal_master':
			return {
				role: 'assistant',
				content: `I'll create a comprehensive ${args.proposal_type} proposal for ${args.client_name}.

Business Objective: ${args.business_objective}
Success Metrics: ${args.success_metrics}
${args.constraints ? `Constraints: ${args.constraints}` : ''}

This master proposal will include:
1. Executive Summary
2. Market Analysis
3. Strategic Recommendations
4. Targeting Strategy
5. Scenario Forecasts
6. Budget Allocation
7. Implementation Plan
8. Success Metrics

Phase 1: Complete Discovery

[Tool sequence:
- getAllPublishers
- getAllProducts
- getAllFormats
- getAudienceSegments
- getContextualTargeting
- getTargetingKeys
]

Phase 2: Strategic Analysis

[Tool: findPublisherAdUnits - Analyze publisher alignment]
[Tool: getTargetingValues - Research targeting opportunities]

Phase 3: Scenario Development

[Tool: availabilityForecast - Baseline RON scenario]
[Tool: availabilityForecast - Premium publisher scenario]
[Tool: availabilityForecast - Targeted audience scenario]
${args.business_objective === 'conversion' ? '[Tool: availabilityForecast - Performance-optimized scenario]' : ''}

Phase 4: Proposal Compilation

Generating executive summary and recommendations...`
			};

		case 'campaign_scenario_planner':
			return {
				role: 'assistant',
				content: `I'll create ${args.num_scenarios} scenarios for testing, optimizing for ${args.optimization_metric}.

Base Scenario: ${args.base_scenario}
Variables to Test: ${args.variables_to_test}

[Tool: availabilityForecast - Baseline configuration]
${Array(parseInt(args.num_scenarios) - 1).fill(0).map((_, i) => 
	`[Tool: availabilityForecast - Scenario ${i + 2}: Varying ${args.variables_to_test}]`
).join('\n')}

Analyzing scenarios for ${args.optimization_metric} optimization...`
			};

		case 'campaign_competitive_intelligence':
			return {
				role: 'assistant',
				content: `I'll analyze the competitive landscape for ${args.industry} during ${args.time_period}.

[Tool: getTargetingKeys - Industry targeting patterns]
[Tool: getTargetingValues - Competitive targeting analysis]
[Tool: getContextualTargeting - Content alignment]
[Tool: findPublisherAdUnits - Publisher preferences]
[Tool: availabilityForecast - Inventory pressure analysis]

Compiling competitive intelligence report...`
			};

		case 'campaign_execution_planner':
			return {
				role: 'assistant',
				content: `I'll create a detailed execution plan for ${args.campaign_name}.

Strategy: ${args.approved_strategy}
Start Date: ${args.start_date}
Flighting: ${args.flight_schedule}

[Tool: availabilityForecast - Confirm inventory]
[Tool: getAllFormats - Creative requirements]
[Tool: getAllPlacements - Placement strategies]

Generating trafficking specifications...`
			};

		case 'campaign_premium_maximizer':
			return {
				role: 'assistant',
				content: `I'll optimize premium inventory for ${args.brand_name}.

Premium Criteria: ${args.premium_criteria}
Budget Split: ${args.budget_allocation}

[Tool: getAllFormats - Premium format options]
[Tool: getAllPlacements - Premium placements]
[Tool: findPublisherAdUnits - Top-tier publishers]
[Tool: availabilityForecast - Premium availability]

Optimizing premium/standard mix...`
			};

		case 'campaign_audience_orchestrator':
			return {
				role: 'assistant',
				content: `I'll orchestrate an audience-first campaign.

Target Segments: ${args.target_segments}
Priority: ${args.segment_priority}
Overlap Strategy: ${args.overlap_strategy}

[Tool: getAudienceSegments - Map segments]
[Tool: getContextualTargeting - Content alignment]
[Tool: findPublisherAdUnits - Publisher affinity]
[Tool: availabilityForecast - Segment reach]

Optimizing segment mix...`
			};

		case 'campaign_seasonal_optimizer':
			return {
				role: 'assistant',
				content: `I'll optimize for ${args.season_event} with ${args.ramp_strategy} strategy.

Competition Level: ${args.competitive_factor}

[Tool: availabilityForecast - Seasonal patterns]
[Tool: getContextualTargeting - Seasonal content]
[Tool: findPublisherAdUnits - Publisher timing]

Creating seasonal calendar...`
			};

		case 'campaign_performance_optimizer':
			return {
				role: 'assistant',
				content: `I'll optimize ${args.campaign_id} for ${args.optimization_goal}.

Issue: ${args.performance_issue}

[Tool: getTargetingValues - Current setup]
[Tool: findPublisherAdUnits - Publisher performance]
[Tool: availabilityForecast - Alternative configs]

Generating optimization recommendations...`
			};

		default:
			return {
				role: 'assistant',
				content: `I'll execute the ${promptName} workflow with the provided parameters.

${JSON.stringify(args, null, 2)}

This campaign expert workflow will orchestrate multiple tools to deliver comprehensive results.`
			};
	}
}

// Helper functions are no longer needed since we removed basic forecast prompts

/**
 * Extract tool calls from a prompt message
 * This helps LLMs understand which tools to call and in what order
 */
export function extractToolCallsFromMessage(message: string): Array<{
	tool: string;
	description: string;
}> {
	const toolCalls: Array<{ tool: string; description: string }> = [];
	
	// Match [Tool: toolName ...] patterns
	const matches = message.matchAll(/\[Tool: (\w+)[^\]]*\]/g);
	
	for (const match of matches) {
		toolCalls.push({
			tool: match[1],
			description: match[0]
		});
	}
	
	// Also match "Tool sequence:" lists
	const sequenceMatch = message.match(/\[Tool sequence:([\s\S]*?)\]/);
	if (sequenceMatch) {
		const lines = sequenceMatch[1].split('\n');
		for (const line of lines) {
			const toolMatch = line.match(/\d+\.\s*(\w+)/);
			if (toolMatch) {
				toolCalls.push({
					tool: toolMatch[1],
					description: line.trim()
				});
			}
		}
	}
	
	return toolCalls;
}