# CLAUDE.md - AI Assistant Context Guide

## Project Overview

**STEPhie MCP** - Model Context Protocol server for STEP Networks' advertising and publisher platform

- **Purpose**: Bridge between Claude and Monday.com + Google Ad Manager APIs
- **Stack**: TypeScript, MCP SDK, Monday.com GraphQL, GAM SOAP API v202502
- **Deployment**: Vercel Edge Functions with SSE transport + Local MCP stdio

## Endpoints

### Production Endpoints

- **SSE (Claude Desktop)**: `https://stephie-mcp.vercel.app/sse`
- **JSON-RPC**: `https://stephie-mcp.vercel.app/api/server`
- **Health Check**: `https://stephie-mcp.vercel.app/api/health`

### MCP Methods

- `tools/list` - Lists all available tools
- `tools/call` - Executes a tool with parameters
- `resources/list` - Lists available MCP resources
- `resources/read` - Reads resource content by URI
- `prompts/list` - Returns empty array (spec compliance)

## Architecture

```folders
/api            → Vercel Edge handlers (server.ts)
/lib            → Core business logic
  /tools        → Tool implementations (organized by domain)
  /monday       → Monday.com API client
  /gam          → Google Ad Manager SOAP client
  /mcp          → MCP definitions and implementations
    toolDefinitions.ts     → Tool schemas and metadata
    resources.ts          → Resource definitions
    tool-implementations.ts → Centralized tool mapping
/scripts        → Automation scripts
/tests          → Test suites
/docs           → Extended documentation
```

## Critical Development Rules

### Adding/Modifying Tools

1. **Implementation**: `/lib/tools/[category]/[toolName].ts`
2. **Definition**: Add to `/lib/mcp/toolDefinitions.ts` (with ALL parameter descriptions)
3. **Registration**: Add to `/lib/mcp/tool-implementations.ts`
   - Automatically used by both deployments

**CRITICAL**: Parameter descriptions go ONLY in toolDefinitions.ts!

```typescript
// In server.ts - NO manual schema definitions!
server.tool(
  'toolName',
  getToolDescription('toolName'),  // Gets description
  buildZodSchema('toolName'),      // Builds full Zod schema with descriptions
  async (input) => { ... }
);
```

### Board IDs (Centralized)

```typescript
// Use TOOL_BOARD_IDS from lib/tools/board-ids.ts
import { TOOL_BOARD_IDS } from '../board-ids.js';
// Never hardcode board IDs in tools
// Add/change board ids when needed
```

### Monday.com Meta Boards

- **Boards Meta** (1698570295): Maps board names → IDs
- **Columns Board** (2135717897): Stores column configurations

### Status/Dropdown Mappings

Always include index mappings in descriptions:

```typescript
status: z.number().describe('Status: 0=New, 1=In Progress, 2=Done')
```

## Key Scripts

```bash
pnpm mcp:dev          # Local development
pnpm mcp:build        # Build for production  
pnpm test:local       # Run tests
vercel --prod         # Deploy to production
```

## Environment Variables

```env
STEPHIE_AUTH_TOKEN      # Required (use 'test-token' for dev)
MONDAY_API_KEY          # Monday.com API access
GOOGLE_AD_MANAGER_NETWORK_CODE
GOOGLE_SERVICE_ACCOUNT_EMAIL
GOOGLE_PRIVATE_KEY
```

## Common Patterns

### GAM Availability Forecast

- **Default Ad Unit**: If `targetedAdUnitIds` is null/empty, defaults to `21808880960`
- Use for RON (Run of Network) forecasts without specifying individual ad units

### Board Relations

- Use Monday.com GraphQL to get relations:

```GraphQL
... on BoardRelation { linked_items { id name } }
```

```typescript
// Always use IDs, not names
if (teamId) {
  const relationCol = item.column_values.find(c => c.id === 'connect_boards__1');
  const linked = JSON.parse(relationCol?.value || '{}');
  return linked?.linkedItemIds?.includes(teamId);
}
```

### Output Format

- Tools now return **JSON strings** (not objects) for better LLM consumption
- Consistent structure: `tool`, `timestamp`, `status`, `data`, `metadata`, `options` (with summary)
- Use `createListResponse`, `createSuccessResponse`, or `createErrorResponse` from `/lib/tools/json-output.js`
- Include metadata (counts, filters, board info, dynamic columns)

### Hierarchical Data Structures

**Products**: 3-level hierarchy (ProductGroup → Product → Formats)

```json
{
  "data": [
    {
      "productGroup": "Group Name",
      "description": "Group Description", 
      "productCount": 5,
      "formatCount": 15,
      "products": [
        {
          "name": "Product Name",
          "description": "Product Description",
          "formatCount": 3,
          "formats": ["Format1", "Format2"]
        }
      ]
    }
  ]
}
```

**Publishers**: 2-level hierarchy (Vertical → Publishers)

```json
{
  "data": [
    {
      "vertical": "Vertical Name",
      "publisherCount": 10,
      "publishers": [
        {
          "name": "Publisher Name",
          "group": "Publisher Group",
          "gamId": "12345",
          "approval": "Gambling"
        }
      ]
    }
  ]
}
```

**Metadata**: Includes distinct counts

- `totalPublishers`, `totalVerticals`, `totalPublisherGroups` (from board relations)
- `totalProducts`, `totalProductGroups`, `totalFormats` (unique counts per level)

### Error Handling

- Use `console.error` for debug (stdout must be clean JSON)
- Handle GraphQL errors gracefully
- Return user-friendly error messages

## Testing Approach

```bash
TEST_AUTH_TOKEN=test-token npx tsx -e "
import { getAllPublishers } from './lib/tools/getAllPublishers.js';
const result = await getAllPublishers();
console.log(result);
"
```

## Known Limitations

- Publisher formats use different dropdown IDs for same devices
- Dynamic columns system not fully migrated

## Quick Reference

- [Board Relations Pattern](docs/technical/BOARD_RELATIONS_PATTERN.md)
- [Status/Dropdown Mappings](docs/technical/STATUS_DROPDOWN_MAPPINGS.md)
- [Dynamic Columns Guide](docs/technical/DYNAMIC_COLUMNS_MIGRATION_GUIDE.md)
- [Deployment Guide](docs/deployment/DEPLOYMENT.md)
- Project based on MCP package: `https://github.com/modelcontextprotocol/typescript-sdk/tree/main`
- Sample project: `https://github.com/vercel-labs/mcp-on-vercel`

## MCP SDK Reference

### Core Components

**Tools (POST/PUT/DELETE)**: Actions with custom parameters. Use to perform actions, complex queries.
```typescript
server.tool('search', { search: z.string() }, async (params) => {})
```

**Resources (GET)**: Read-only data, cacheable, but manually selectable (not triggered through prompt). Two types:
- Static: `server.resource('data', 'monday://data', async () => {})`  
- Templates: URI with variables `monday://tasks/{board}?search={query}`

**ResourceTemplate**: Enables filtered resources via URI parameters
```typescript
new ResourceTemplate('monday://tasks/{board}?search={query}', {
  list: async () => [], // Optional listing
  complete: { query: (v) => ['option1','option2'] } // Autocomplete
})
// Callback receives: (uri, variables: {board, query}, extra)
```

### Recent Improvements

1. ✅ **Fixed**: Removed non-standard `query` from resources/list
2. ✅ **Fixed**: Standardized all tool `search` params as strings with clear descriptions
3. ✅ **Fixed**: Migrated mcp-server.ts to use McpServer class from SDK
4. ✅ **Fixed**: Centralized tool implementations in `/lib/mcp/tool-implementations.ts`
5. ✅ **Fixed**: Cleaned up imports and reduced code duplication

### Best Practices

**Use Resources for**: Reading data, simple filtering via URI
**Use Tools for**: Complex queries, modifications, real-time calculations

**Correct filtering pattern**: ResourceTemplate with URI variables, not query params on list

## Performance Notes

- Local cache for frequently accessed data
- Batch operations where possible
- Limit default results to 10-50 items
- Resources can be cached by clients (unlike tools)

---
*For detailed documentation, see `/docs` folder*
