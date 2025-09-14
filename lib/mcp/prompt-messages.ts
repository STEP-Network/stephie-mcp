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
	// Different prompts generate different message patterns
	switch (promptName) {
		case 'forecast_publisher_specific':
			return {
				role: 'assistant',
				content: `I'll help you forecast availability for the specified publishers. Let me:

1. First find the ad unit IDs for: ${args.publisher_names}
2. Then run an availability forecast from ${args.start_date} to ${args.end_date}
${args.exclude_premium === 'yes' ? '3. I\'ll exclude premium placements like interstitials' : ''}

Let me start by finding the publisher ad units...

[Tool: findPublisherAdUnits with names: [${args.publisher_names.split(',').map(s => `"${s.trim()}"`).join(', ')}]]

Now I'll run the availability forecast with the found ad unit IDs...

[Tool: availabilityForecast with:
- startDate: "${args.start_date}"
- endDate: "${args.end_date}"
- targetedAdUnitIds: [from previous response]
${args.exclude_premium === 'yes' ? '- excludedAdUnitIds: [premium units from previous response]' : ''}
- sizes: [[300,250], [728,90], [320,50]]
]`
			};

		case 'forecast_contextual':
			return {
				role: 'assistant',
				content: `I'll forecast availability using contextual targeting for ${args.categories}. Here's my approach:

1. Search for contextual categories matching: ${args.categories}
2. ${args.exclude_sensitive !== 'no' ? 'Identify and exclude sensitive categories' : 'Include all matching categories'}
3. Run forecast for the period: ${args.date_range}

Starting with contextual category lookup...

[Tool: getContextualTargeting with search: [${args.categories.split(',').map(s => `"${s.trim()}"`).join(', ')}]]

Now running the availability forecast with contextual targeting...

[Tool: availabilityForecast with:
- startDate: "${parseFlexibleDate(args.date_range).start}"
- endDate: "${parseFlexibleDate(args.date_range).end}"
- customTargeting: [{
    keyId: "14509472",
    valueIds: [category IDs from previous response],
    operator: "IS"
  }]
${args.exclude_sensitive !== 'no' ? '- Additional exclusion for sensitive categories' : ''}
- sizes: [[300,250], [728,90]]
]`
			};

		case 'forecast_complete_proposal':
			return {
				role: 'assistant',
				content: `I'll create a comprehensive campaign proposal for ${args.client_name}. Given the ${args.campaign_objective} objective, I'll:

1. **Inventory Discovery Phase**
   - Gather available products and formats
   - Identify publisher inventory
   - Review placement options

2. **Scenario Planning Phase**
   - Baseline: Run of Network (RON) forecast
   - Targeted: Top-tier publishers
   ${args.campaign_objective === 'awareness' ? '- Premium: High-impact formats' : ''}
   ${args.campaign_objective === 'conversion' ? '- Audience: Demographic segments' : ''}

3. **Analysis & Recommendations**
   ${args.budget_range ? `- Optimize for budget: ${args.budget_range}` : '- Maximize available inventory'}
   ${args.constraints ? `- Apply constraints: ${args.constraints}` : ''}

Let me begin gathering the inventory data...

[Tool sequence:
1. getAllProducts - Understand product offerings
2. getAllFormats - Available ad formats
3. getAllSizes - Supported dimensions
4. getAllPublishers - Publisher inventory
5. getAllPlacements - Placement options
${args.campaign_objective === 'conversion' ? '6. getAudienceSegments - Targeting options' : ''}
]

Now I'll run multiple forecast scenarios...

[Tool: availabilityForecast - Scenario 1: RON baseline]
[Tool: availabilityForecast - Scenario 2: Premium publishers]
${args.campaign_objective === 'awareness' ? '[Tool: availabilityForecast - Scenario 3: High-impact formats]' : ''}
${args.campaign_objective === 'conversion' ? '[Tool: availabilityForecast - Scenario 3: Audience targeted]' : ''}

Compiling the proposal with recommendations based on the scenarios...`
			};

		case 'quick_ron_forecast':
			return {
				role: 'assistant',
				content: `I'll run a quick Run of Network forecast for ${args.days} days starting immediately.

[Tool: availabilityForecast with:
- startDate: "now"
- endDate: "${calculateEndDate(parseInt(args.days))}"
- targetedAdUnitIds: null (defaults to RON)
- sizes: [[300,250], [728,90], [320,50], [970,250]]
]

This will show maximum available inventory across the entire network.`
			};

		// Campaign Expert Workflows
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

		default:
			return {
				role: 'assistant',
				content: `I'll help you with the ${promptName} workflow using the provided parameters: ${JSON.stringify(args, null, 2)}`
			};
	}
}

/**
 * Helper functions
 */
function calculateEndDate(daysFromNow: number): string {
	const date = new Date();
	date.setDate(date.getDate() + daysFromNow);
	return date.toISOString().split('T')[0];
}

function parseFlexibleDate(dateStr: string): { start: string; end: string } {
	const lower = dateStr.toLowerCase();
	
	// Handle "next X days"
	if (lower.includes('next') && lower.includes('days')) {
		const match = lower.match(/(\d+)/);
		const days = match ? parseInt(match[1]) : 30;
		return {
			start: 'now',
			end: calculateEndDate(days)
		};
	}
	
	// Handle date range with " to "
	if (dateStr.includes(' to ')) {
		const [start, end] = dateStr.split(' to ');
		return {
			start: start.trim(),
			end: end.trim()
		};
	}
	
	// Default
	return {
		start: 'now',
		end: calculateEndDate(30)
	};
}

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