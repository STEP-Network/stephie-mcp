# CLAUDE.md - AI Assistant Context Guide

## Project Overview

**STEPhie MCP** - Model Context Protocol server for STEP Networks' advertising and publisher platform

- **Purpose**: Bridge between Claude and Monday.com + Google Ad Manager APIs
- **Stack**: TypeScript, MCP SDK, Monday.com GraphQL, GAM SOAP API v202502
- **Deployment**: Vercel Edge Functions with SSE transport + Local MCP stdio

## Architecture

```folders
/api            → Vercel Edge handlers (server.ts)
/lib            → Core business logic
  /tools        → Tool implementations (organized by domain)
  /monday       → Monday.com API client
  /gam          → Google Ad Manager SOAP client
  /mcp          → Tool definitions
/scripts        → Automation scripts
/tests          → Test suites
/docs           → Extended documentation
```

## Critical Development Rules

### Adding/Modifying Tools

1. **Implementation**: `/lib/tools/[category]/[toolName].ts`
2. **Definition**: Add to `/lib/mcp/toolDefinitions.ts`
3. **Registration**: BOTH files:
   - `api/server.ts` (Vercel deployment) - use `getToolDescription(toolName)`
   - `mcp-server.ts` (local MCP)

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

- Return markdown strings, never JSON objects
- Use headers, tables, code blocks
- Include metadata (counts, filters)

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

## Performance Notes

- Local cache for frequently accessed data
- Batch operations where possible
- Limit default results to 10-50 items

---
*For detailed documentation, see `/docs` folder*
