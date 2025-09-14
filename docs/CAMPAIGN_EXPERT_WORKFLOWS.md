# Campaign Expert Workflows

## Overview

The Campaign Expert system provides 11 sophisticated workflow templates that orchestrate multiple tools to deliver comprehensive campaign planning and optimization. These workflows go beyond simple tool calls to provide strategic, multi-phase campaign operations.

## How It Works

### 1. Prompt Selection
When an LLM or client selects a campaign expert prompt (e.g., `campaign_proposal_master`), the prompt returns:
- **Arguments**: User inputs needed
- **_meta.toolsRequired**: List of tools that will be used
- **_meta.workflow**: Step-by-step execution plan
- **_meta.outputFormat**: Expected deliverable format

### 2. Message Generation
The prompt generates a message with tool references like:
```
[Tool: getAllPublishers - Map publisher ecosystem]
[Tool sequence:
1. getAllProducts
2. getAllFormats
3. getAudienceSegments
]
```

### 3. LLM Interpretation
The LLM reads these references and executes the actual tool calls in the suggested order, using results from earlier calls to inform later ones.

## Available Campaign Expert Workflows

### Discovery & Analysis

#### `campaign_discovery_complete`
Complete inventory and targeting discovery for campaign planning.
- **Purpose**: Map entire advertising ecosystem
- **Tools Used**: 6 discovery tools
- **Output**: Comprehensive inventory report

#### `campaign_competitive_intelligence`
Analyze market positioning and identify opportunities.
- **Purpose**: Understand competitive landscape
- **Tools Used**: 5 analysis tools
- **Output**: Competitive insights with opportunities

### Strategy & Planning

#### `campaign_strategy_builder`
Build data-driven campaign strategy with market analysis.
- **Purpose**: Develop optimal campaign approach
- **Tools Used**: 5 strategy tools
- **Output**: Strategic blueprint with insights

#### `campaign_scenario_planner`
Multi-scenario planning with what-if analysis.
- **Purpose**: Test various configurations
- **Tools Used**: 4 forecasting tools
- **Output**: Scenario comparison matrix

### Execution & Optimization

#### `campaign_execution_planner`
Create implementation-ready campaign blueprint.
- **Purpose**: Generate trafficking specifications
- **Tools Used**: 5 execution tools
- **Output**: Execution-ready specifications

#### `campaign_performance_optimizer`
Optimize ongoing campaign performance.
- **Purpose**: Identify and fix bottlenecks
- **Tools Used**: 3 optimization tools
- **Output**: Optimization recommendations

### Specialized Workflows

#### `campaign_premium_maximizer`
Optimize premium inventory for high-impact campaigns.
- **Purpose**: Maximize viewability and engagement
- **Tools Used**: 4 premium tools
- **Output**: Premium strategy with allocation

#### `campaign_audience_orchestrator`
Audience-first campaign with segment optimization.
- **Purpose**: Maximize audience relevance
- **Tools Used**: 4 audience tools
- **Output**: Audience strategy with forecasts

#### `campaign_seasonal_optimizer`
Seasonal campaign optimization with timing strategy.
- **Purpose**: Maximize seasonal impact
- **Tools Used**: 3 timing tools
- **Output**: Seasonal calendar with pacing

### Master Workflows

#### `campaign_proposal_master`
Generate comprehensive, client-ready proposals.
- **Purpose**: Complete campaign proposal
- **Tools Used**: 8 comprehensive tools
- **Phases**:
  1. Complete Discovery
  2. Strategic Analysis
  3. Scenario Development
  4. Proposal Compilation
- **Output**: Full proposal with executive summary

## Workflow Execution Pattern

### Example: `campaign_proposal_master`

```javascript
// User provides arguments
{
  client_name: "Acme Corp",
  proposal_type: "new_business",
  business_objective: "increase brand awareness",
  success_metrics: "reach and frequency"
}

// Workflow executes in phases:

// Phase 1: Discovery (6 tools)
getAllPublishers() → publisher landscape
getAllProducts() → available products
getAllFormats() → supported formats
getAudienceSegments() → targeting options
getContextualTargeting() → content categories
getTargetingKeys() → custom targeting

// Phase 2: Analysis (2 tools)
findPublisherAdUnits() → publisher alignment
getTargetingValues() → targeting opportunities

// Phase 3: Scenarios (3-4 forecasts)
availabilityForecast() → RON baseline
availabilityForecast() → Premium publishers
availabilityForecast() → Targeted audience
[optional] availabilityForecast() → Performance optimized

// Phase 4: Compilation
→ Executive Summary
→ Strategic Recommendations
→ Implementation Plan
```

## Integration with LLMs

LLMs can leverage these workflows by:

1. **Understanding Intent**: Recognizing when a user needs comprehensive planning vs simple queries
2. **Selecting Workflow**: Choosing the appropriate campaign expert prompt
3. **Orchestrating Execution**: Following the workflow steps in order
4. **Synthesizing Results**: Combining tool outputs into coherent recommendations

## Benefits

### For Users
- **Guided Experience**: Complex operations simplified
- **Best Practices**: Industry expertise encoded
- **Comprehensive Results**: Multi-dimensional analysis
- **Time Savings**: Hours of work automated

### For Campaign Planners
- **Strategic Insights**: Data-driven recommendations
- **Scenario Planning**: What-if analysis capabilities
- **Competitive Intelligence**: Market positioning
- **Optimization**: Performance improvement paths

## Usage Example

```
User: "I need a complete campaign proposal for a new automotive client"

LLM: "I'll use the campaign_proposal_master workflow. Let me gather some details:
- Client name?
- Business objective?
- Success metrics?
- Any constraints?"

User: "Tesla, brand awareness for new model, reach 80% of target audience, exclude competitors"

LLM: [Executes campaign_proposal_master workflow]
- Discovers inventory (6 tools)
- Analyzes opportunities (2 tools)
- Runs scenarios (4 forecasts)
- Compiles proposal

Result: Complete proposal with:
- Executive summary
- Market analysis
- 4 scenario comparisons
- Recommended approach
- Budget allocation
- Implementation timeline
```

## Technical Implementation

The campaign expert workflows are implemented in:
- `/lib/mcp/prompts.ts` - Workflow definitions with metadata
- `/lib/mcp/prompt-messages.ts` - Message generation for LLMs
- `/lib/mcp/campaign-expert.ts` - Advanced workflow orchestration

## Future Enhancements

1. **Workflow State Management**: Track progress through multi-phase workflows
2. **Parallel Execution**: Run independent tools simultaneously
3. **Result Caching**: Reuse discovery data across workflows
4. **Custom Workflows**: User-defined workflow templates
5. **Workflow Analytics**: Track usage and optimize patterns

## Conclusion

Campaign Expert Workflows transform STEPhie MCP from a tool collection into an intelligent campaign planning assistant, capable of orchestrating complex, multi-phase operations that deliver strategic value.