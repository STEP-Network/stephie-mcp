# CLAUDE.md

This file provides comprehensive guidance to Claude (claude.ai) when working with the STEPhie MCP Server codebase.

## Project Overview

STEPhie MCP Server is a Model Context Protocol (MCP) implementation that provides AI assistants with access to STEP Networks' advertising and publisher data. It serves as a bridge between Monday.com boards (containing publisher, ad unit, and campaign data) and AI systems, enabling intelligent ad campaign planning and forecasting through Google Ad Manager integration.

## Architecture

### Core Technology Stack
- **TypeScript** with ES modules (`"type": "module"`)
- **MCP SDK** (`@modelcontextprotocol/sdk`) for protocol implementation
- **Monday.com GraphQL API** for data access
- **Google Ad Manager API** (REST v1) for contextual targeting & forecasting
- **Stack Auth** for authentication (from main STEPhie app)
- **google-auth-library** for GAM service account authentication
- **Vercel** for deployment (Edge Functions)
- **dotenv** for environment configuration

### Key Components

#### MCP Server (`mcp-server.ts`)
- Main entry point for MCP protocol
- Handles tool registration and execution
- Implements stdio transport for Claude Desktop
- Validates authentication via Stack Auth

#### Tool System (`/lib/tools/`)
- Each tool is a separate module with consistent structure
- Returns **markdown-formatted text** for LLM consumption (not JSON)
- Tools handle specific Monday.com boards
- Implements error handling and data transformation

#### Authentication (`/lib/auth/`)
- Stack Auth integration for user validation
- Shared authentication with main STEPhie application
- Token-based authentication for API access

## Monday.com Board Structure

### Critical Board IDs
```javascript
BOARD_IDS = {
  PUBLISHERS: '1545299249',        // Publisher information
  AD_UNITS: '1558569789',          // Ad units hierarchy (3 levels)
  PUBLISHER_FORMATS: '1222800432',  // Publisher format matrix
  KEY_VALUES: '1802371471',        // GAM targeting key-values
  AUDIENCE_SEGMENTS: '2051827669', // Demographic/behavioral segments
  PRODUCTS: '1983692701',          // Ad products
  PRODUCT_GROUPS: '1611223368',    // Product group definitions
  FORMATS: '1983719743',           // Format specifications
  SIZES: '1558597958',             // Ad unit sizes
  PRICES: '1432155906',            // Display/video pricing
  VERTICALS: '2054670440',         // Publisher verticals
  PLACEMENTS: '1935559241',        // Ad placements
  BOARDS: '1698570295'             // Meta board listing all boards
}
```

### Ad Unit Hierarchy (Board 1558569789)

The ad unit system has **three levels**:
1. **Level 1 (Publisher Groups)**: Type index 4, e.g., "JFM", "PLBold"
2. **Level 2 (Publishers)**: Type index 3, e.g., "jv.dk", "plbold.dk"  
3. **Level 3 (Child Ad Units)**: Type index 1-2, e.g., "billboard_1", "mobile_2"

#### Parent-Child Relationships
- Uses **GAM IDs** for relationships, NOT Monday.com item IDs
- `text__1` = Ad Unit ID (GAM ID)
- `text2__1` = Parent Ad Unit ID (parent's GAM ID)
- `board_relation_mkqp4eh1` = Parent Ad Unit (display name only)
- Algorithm: When finding "jv.dk", get:
  1. Publisher where name contains "jv.dk"
  2. Parent group where `text__1` equals publisher's `text2__1`
  3. Children where `text2__1` equals publisher's `text__1`

#### Source Filtering
- `color_mkqpmnmr` = Source column (status type)
- Index 0 = Google Ad Manager (default)
- Index 1 = Adform

## Tool Implementation Patterns

### Output Format
All tools return **markdown-formatted strings** for optimal LLM parsing:

```typescript
// Good - Markdown format
const lines: string[] = [];
lines.push('# Publishers');
lines.push('');
lines.push('| Name | Status | Group |');
lines.push('|------|--------|-------|');
// ...
return lines.join('\n');

// Bad - JSON format
return { publishers: [...] }; // Don't do this
```

### Common Markdown Patterns
```markdown
# Main Title
**Metadata:** Value
**Filter:** Applied filter

## Section Header
*Count: X items*

### Item Name
- **Property:** `value`
- **ID:** `12345`

| Column | Value |
|--------|-------|
| Data   | Here  |

```json
[1234, 5678, 9101] // For ID arrays
```
```

### Error Handling
```typescript
try {
  const response = await mondayApi(query);
  // Process response
} catch (error) {
  console.error('Error context:', error);
  throw new Error(`Failed to X: ${error instanceof Error ? error.message : 'Unknown error'}`);
}
```

## Available Tools

### Publisher Tools
- `getAllPublishers` - Returns markdown table of publishers
- `getPublisherFormats` - Hierarchical format listing by group
- `getPublishersByFormats` - Find publishers supporting specific formats
- `findPublisherAdUnits` - **Complete hierarchy with parent groups and child units**

### Targeting Tools
- `getKeyValues` - Content-based targeting (22k+ values, uses batching)
- `getAudienceSegments` - Demographic/behavioral targeting
- `getAllPlacements` - GAM placements/verticals (NOTE: RON, Gambling, Finance, RE-AD are NOT verticals)
- `getGeoLocations` - Geographic targeting with 1700+ Danish locations (cities, regions, postal codes)
- `getContextualTargeting` - Neuwo contextual categories from GAM API (requires GAM auth)

### Product & Pricing Tools
- `getAllProducts` - Product hierarchy
- `getAllFormats` - Format specifications by device
- `getAllSizes` - Ad unit sizes with benchmarks
- `getAllAdPrices` - Display/video pricing in DKK

### Forecasting
- `availabilityForecast` - GAM inventory forecasting (placeholder, real implementation coming)

### Debug Tools
- `listBoards` - List boards from meta board (1698570295)
- `getBoardColumns` - Get column structure for any board
- `getItems` - Generic item fetcher for debugging

## Critical Implementation Details

### findPublisherAdUnits Algorithm
When searching for a publisher (e.g., "jv.dk"):
1. Query for items where name contains search term AND Type is 3 or 4
2. Extract GAM IDs (`text__1`) and parent IDs (`text2__1`)
3. Fetch parent groups where their `text__1` matches publisher's `text2__1`
4. Fetch children where their `text2__1` matches publisher's `text__1`
5. Always includes children - no `includeChildren` parameter
6. Returns all GAM IDs for forecasting in JSON code block

### Performance Optimizations
- `getKeyValues`: Limits values (50 default, 500 max) to handle 22k+ dataset
- Batch fetching for related items
- Query filtering at Monday.com level when possible
- Text output cached and formatted once

### Column Types in Monday.com
- **text**: Simple text values
- **status**: Uses index values (not labels)
- **board_relation**: Links to other items
- **dropdown**: Multiple choice with values
- **numbers**: Numeric values with optional symbols
- **color**: Status-like with index values

## Environment Configuration

### Required Variables
```env
# Authentication
STEPHIE_AUTH_TOKEN=<from Stack Auth or use 'test-token' for local dev>

# Monday.com
MONDAY_API_KEY=<your API key>

# Google Ad Manager (for contextual targeting & forecasting)
GOOGLE_AD_MANAGER_NETWORK_CODE=21809957681
GOOGLE_SERVICE_ACCOUNT_EMAIL=<service-account@project.iam.gserviceaccount.com>
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Optional - for full Stack Auth integration
NEXT_PUBLIC_STACK_PROJECT_ID=<project id>
STACK_SECRET_SERVER_KEY=<server key>
DATABASE_URL=<Neon PostgreSQL URL>
```

### Claude Desktop Configuration
When configuring for Claude Desktop, ensure the private key has `\n` escaped as `\\n` in the JSON config.

### Development Commands
```bash
# Install dependencies
pnpm install

# Run MCP server locally
pnpm mcp:dev

# Build for production
pnpm mcp:build

# Test tools locally
TEST_AUTH_TOKEN=test-token pnpm test:local
```

## Testing

### Test Individual Tools
```typescript
// test-find-publisher.ts
import { findPublisherAdUnits } from './lib/tools/findPublisherAdUnits.js';
const result = await findPublisherAdUnits({ names: ['jv.dk'] });
```

### Claude Desktop Configuration
```json
{
  "mcpServers": {
    "stephie-mcp": {
      "command": "node",
      "args": ["/path/to/stephie-mcp/dist/mcp-server.js"],
      "env": {
        "STEPHIE_AUTH_TOKEN": "your-token",
        "MONDAY_API_KEY": "your-monday-key"
      }
    }
  }
}
```

## Common Issues & Solutions

### Issue: Empty Results from Monday.com
- Check board ID is correct
- Verify column IDs match (use `getBoardColumns` tool)
- Ensure Source filter is set correctly (Google Ad Manager = index 0)

### Issue: Child Ad Units Not Found
- Verify Type indices (1-2 for children)
- Check Parent Ad Unit ID (`text2__1`) matches publisher's Ad Unit ID (`text__1`)
- Ensure Source filter matches

### Issue: Authentication Errors
- Stack Auth token must be valid
- For local dev, use `TEST_AUTH_TOKEN=test-token`
- Production requires valid Stack Auth integration

## Best Practices

1. **Always return markdown**, not JSON objects
2. **Use backticks** around IDs for code formatting
3. **Include metadata** at the top (totals, filters)
4. **Group related data** using markdown headers
5. **Use tables** for comparative data
6. **Add JSON code blocks** for arrays of IDs
7. **Test with real publisher names** like "jv.dk", "berlingske.dk"
8. **Handle missing data gracefully** with "N/A" or "-"
9. **Log errors to console.error** for debugging
10. **Follow TypeScript strict mode** patterns

## Recent Changes & Context

- Converted from JSON to markdown output format for all tools
- Removed `includeChildren` parameter - always returns full hierarchy
- Changed "Niveau" to "Level" in all output
- Fixed parent-child relationship to use GAM IDs instead of item IDs
- Added Source filtering with Google Ad Manager as default
- Implemented comprehensive error handling and logging
- Added `getAllPlacements` tool with vertical clarification
- Added `getGeoLocations` tool with local Danish location data
- Added `getContextualTargeting` tool with GAM API integration
- Implemented Google Ad Manager authentication with JWT

## Tool-Specific Notes

### findPublisherAdUnits
- Most complex tool with 3-level hierarchy
- Returns 50+ items for publishers like "jv.dk"
- Critical for `availabilityForecast` tool
- Always fetches complete hierarchy
- Uses GAM IDs for parent-child relationships

### getKeyValues
- Handles 22,000+ values
- Two-step process: search keys, then get values
- Performance limits prevent fetching all values
- Searches custom targeting from Monday.com board

### getAllPlacements
- Returns GAM placements/verticals
- **Important**: RON, Gambling, Finance, and RE-AD are NOT content verticals
- RE-AD = Responsible Advertisement (not retargeting)
- Most items are content verticals (Sport, News, etc.)

### getGeoLocations
- Uses local data file with 1700+ Danish locations
- Searches cities, regions, postal codes, municipalities
- Returns GAM criteria IDs for geographic targeting
- Works offline (no API required)

### getContextualTargeting
- Fetches Neuwo contextual categories from Google Ad Manager API
- Requires GAM service account authentication
- Categories include news, sports, business, entertainment
- Returns category IDs for content-based targeting

### availabilityForecast
- Currently a placeholder implementation
- Real GAM API integration planned
- Will use ad unit IDs from `findPublisherAdUnits`
- Will support all targeting criteria (geo, contextual, custom)

## Debugging & Testing

### MCP Server Testing
```bash
# Test the MCP server directly
pnpm mcp:dev

# Test with auth token
TEST_AUTH_TOKEN=test-token pnpm test:local
```

### Test Individual Tools Locally
```bash
# Example test for findPublisherAdUnits
TEST_AUTH_TOKEN=test-token npx tsx -e "
import { findPublisherAdUnits } from './lib/tools/findPublisherAdUnits.ts';

(async () => {
  try {
    const result = await findPublisherAdUnits({ names: ['jv.dk'] });
    console.log(result);
  } catch (error) {
    console.error('Error:', error.message);
  }
})();
"
```

### Debug Tools
- `listBoards` - List all boards from meta board
- `getBoardColumns` - Inspect column structure of any board
- `getItems` - Generic item fetcher with full column data

### Common Debug Scenarios
```bash
# Check board structure
TEST_AUTH_TOKEN=test-token npx tsx -e "
import { getBoardColumns } from './lib/tools/getBoardColumns.ts';
const result = await getBoardColumns({ boardId: '1558569789' });
console.log(result);
"

# Get raw items from a board
TEST_AUTH_TOKEN=test-token npx tsx -e "
import { getItems } from './lib/tools/getItems.ts';
const result = await getItems({ 
  boardId: '1558569789', 
  limit: 5,
  columnIds: ['text__1', 'text2__1'] 
});
console.log(result);
"
```

## Security & Production

### Environment Variables
- Never commit `.env.local` to version control
- Use Vercel environment variables in production
- Rotate API keys regularly
- Use `TEST_AUTH_TOKEN=test-token` for local development only

### Authentication Flow
1. MCP client sends auth token
2. Server validates against Stack Auth
3. For local dev, `TEST_AUTH_TOKEN` bypasses validation
4. Production requires valid Stack Auth integration

### Rate Limiting
- Monday.com API has rate limits
- Implement caching for frequently accessed data
- Use batch operations where possible

## Deployment

### Vercel Deployment
```bash
# Deploy to production
vercel --prod

# Deploy to preview
vercel
```

### Post-Deployment Checklist
- [ ] Verify environment variables are set
- [ ] Test authentication flow
- [ ] Check Monday.com API connectivity
- [ ] Validate tool responses
- [ ] Monitor error logs

## Troubleshooting Guide

### "No items found" errors
- Verify board ID is correct
- Check column IDs match current schema
- Ensure Source filter is set (0 for Google Ad Manager)
- Use `getBoardColumns` to inspect structure

### Authentication failures
- Check Stack Auth token validity
- Verify environment variables are loaded
- For local dev, ensure `TEST_AUTH_TOKEN` is set

### Parent-child relationship issues
- Remember: use GAM IDs (`text__1`, `text2__1`), not item IDs
- Parent groups have Type index 4
- Publishers have Type index 3
- Children have Type indices 1-2

### Performance issues
- Implement pagination for large datasets
- Use `limit` parameters appropriately
- Consider caching frequently accessed data
- Monitor Monday.com API rate limits

## Future Enhancements
- Google Ad Manager REST API integration
- Real-time forecast caching
- WebSocket support for streaming
- Bulk operations for large campaigns
- Integration with main STEPhie chat interface
- Automated testing suite
- Performance monitoring dashboard