# MCP Prompts for STEPhie

## Overview

MCP Prompts provide pre-configured templates that guide users through complex operations like `availabilityForecast`. Instead of manually specifying all parameters, users can select a prompt that matches their use case.

## How Prompts Work

1. **Discovery**: Clients call `prompts/list` to see available prompts (includes tool metadata)
2. **Selection**: User chooses a prompt based on their needs
3. **Arguments**: Client collects required arguments from user
4. **Message Generation**: Prompt generates a message with tool references
5. **LLM Interpretation**: The LLM reads the message and decides which tools to call
6. **Tool Execution**: LLM calls the referenced tools in the suggested order

### Key Points:
- **Prompts don't directly execute tools** - they generate messages
- **Messages contain tool references** - like `[Tool: findPublisherAdUnits]`
- **LLMs interpret these references** - and make the actual tool calls
- **Metadata helps understanding** - `_meta.toolsRequired` lists needed tools
- **Workflows guide execution** - `_meta.workflow` shows the steps

## Benefits for availabilityForecast

The `availabilityForecast` tool has 10+ parameters with complex relationships. Prompts simplify this by:

- **Guiding users** through common scenarios
- **Setting sensible defaults** for non-critical parameters
- **Orchestrating multiple tool calls** (e.g., finding publisher IDs before forecasting)
- **Providing templates** for different use cases

## Available Prompt Categories

### Basic Forecasts
- `forecast_basic` - Essential parameters only
- `quick_ron_forecast` - Run of Network with minimal config
- `quick_premium_inventory` - Check premium format availability

### Targeted Forecasts
- `forecast_publisher_specific` - Target specific websites
- `forecast_contextual` - Use contextual categories
- `forecast_audience` - Target demographic segments
- `forecast_geo` - Geographic targeting
- `forecast_vertical` - Content vertical targeting
- `forecast_custom_targeting` - Advanced key-value pairs

### Analysis & Optimization
- `forecast_competitive_analysis` - Compare multiple scenarios
- `forecast_roi_optimization` - Find optimal configuration
- `analyze_publisher_inventory` - Deep publisher analysis
- `forecast_inventory_audit` - Comprehensive availability audit

### Campaign Planning
- `forecast_seasonal_campaign` - Seasonal event planning
- `forecast_complete_proposal` - Full campaign proposal
- `forecast_vertical` - Vertical-specific campaigns

## Example Usage Flow

### 1. Client Lists Prompts
```json
{
  "method": "prompts/list"
}
```

### 2. User Selects "forecast_publisher_specific"
```json
{
  "method": "prompts/get",
  "params": {
    "name": "forecast_publisher_specific"
  }
}
```

Returns:
```json
{
  "name": "forecast_publisher_specific",
  "description": "Forecast for specific publishers/sites",
  "arguments": [
    {
      "name": "publisher_names",
      "description": "Comma-separated publisher names",
      "required": true
    },
    {
      "name": "start_date",
      "description": "Campaign start date",
      "required": true
    }
    // ...
  ],
  "_meta": {
    "toolsRequired": ["findPublisherAdUnits", "availabilityForecast"],
    "workflow": [
      "Call findPublisherAdUnits with publisher_names to get ad unit IDs",
      "Extract publisher and child ad unit IDs from response",
      "If exclude_premium, identify premium child units to exclude",
      "Call availabilityForecast with targetedAdUnitIds and excludedAdUnitIds"
    ],
    "outputFormat": "Forecast results with publisher-specific inventory availability"
  }
}
```

### 3. Client Collects Arguments
User provides:
- publisher_names: "jv.dk, berlingske.dk"
- start_date: "2024-03-01"
- end_date: "2024-03-31"
- exclude_premium: "yes"

### 4. System Executes

Behind the scenes, the system:
1. Calls `findPublisherAdUnits` with ["jv.dk", "berlingske.dk"]
2. Extracts ad unit IDs from response
3. If exclude_premium is "yes", identifies premium child units
4. Calls `availabilityForecast` with:
   - targetedAdUnitIds: [publisher IDs]
   - excludedAdUnitIds: [premium unit IDs]
   - dates and other parameters

## Implementation Benefits

### For Users
- **Simplified interface** - Answer questions instead of filling forms
- **Guided workflows** - System knows what's needed
- **Best practices** - Built-in optimization strategies
- **Error prevention** - Valid parameter combinations

### For Developers
- **Reusable patterns** - Common scenarios encoded once
- **Orchestration** - Complex multi-tool flows simplified
- **Documentation** - Prompts serve as usage examples
- **Extensibility** - Easy to add new scenarios

## Technical Implementation

Prompts are defined in `/lib/mcp/prompts.ts` with:
- Name and description
- Required/optional arguments
- Mapping logic to tool parameters

The server handles:
- `prompts/list` - Returns all available prompts
- `prompts/get` - Returns specific prompt details

## Future Enhancements

1. **Dynamic prompts** based on available inventory
2. **Learning prompts** that adapt to user patterns
3. **Prompt chaining** for complex workflows
4. **Result templates** for consistent output formatting
5. **Prompt versioning** for backward compatibility

## Integration with LLMs

LLMs can leverage prompts to:
- Understand available workflows
- Guide users through parameter selection
- Validate input before execution
- Explain results in context

Example LLM interaction:
```
User: "I need to check inventory for Danish news sites next month"
LLM: "I'll use the forecast_publisher_specific prompt. Let me gather the publishers..."
[Executes findPublisherAdUnits for Danish news publishers]
[Executes availabilityForecast with found IDs]
LLM: "Here's the availability for Danish news sites in March..."
```

## Conclusion

MCP Prompts transform complex tools like `availabilityForecast` from parameter-heavy operations into guided conversations, making the system more accessible while maintaining full flexibility.