# STEPhie MCP Server

Model Context Protocol (MCP) server for STEPhie tools, providing secure access to publisher data and ad forecasting capabilities.

## Features

- 🔐 **Secure Authentication** via Stack Auth
- 📊 **Publisher Tools** - Access Monday.com publisher data
- 📈 **Forecast Tools** - Google Ad Manager availability forecasting
- 🗂️ **34 Board Tools** - Complete Monday.com board access (CRM, Tasks, Operations, etc.)
- ✏️ **Mutation Tools** - Create and update Monday.com items (Tasks - Tech & Intelligence)
- 🚀 **Fast Response** - Optimized Vercel Edge Functions
- 🎯 **Dual Deployment** - Works with both Claude Desktop (local) and Vercel (cloud)

## Architecture

This project follows the [Vercel MCP template](https://github.com/vercel-labs/mcp-on-vercel) best practices with a clean, maintainable structure:

```
stephie-mcp/
├── api/
│   ├── server.ts        # Main Vercel endpoint (uses mcp-handler)
│   └── health.ts        # Health check endpoint
├── lib/
│   ├── mcp/
│   │   ├── toolDefinitions.ts     # Shared tool definitions
│   │   ├── boardToolDefinitions.json # Auto-generated board tools
│   │   └── registerBoardTools.ts  # Board tool registration
│   ├── tools/           # Tool implementations (organized by category)
│   │   ├── crm/         # getAccounts, getContacts, getLeads
│   │   ├── sales/       # getDeals, getOpportunities, etc.
│   │   ├── tasks/       # getTasksAdOps, getTasksMarketing, etc.
│   │   ├── debug/       # listBoards, getBoardColumns, getItems
│   │   └── ...          # 50+ tools total
│   ├── monday/          # Monday.com client
│   ├── gam/             # Google Ad Manager integration
│   └── auth/            # Authentication
├── docs/                # Extended documentation
│   ├── technical/       # Architecture & patterns
│   ├── deployment/      # Setup & deployment guides
│   └── implementation/  # Feature implementation details
├── scripts/             # Development utilities
│   ├── generate-board-tools.ts    # Auto-generate tools from boards
│   └── add-column-names-to-boards.ts # Update meta board
├── tests/               # Organized test files
│   ├── publishers/
│   ├── formats/
│   └── debug/
├── mcp-server.ts        # Claude Desktop server (stdio transport)
├── vercel.json          # Vercel deployment config
├── CLAUDE.md            # AI assistant context guide
├── CHANGELOG.md         # Version history
└── package.json
```

## Available Tools

### Publisher Management
- `getAllPublishers` - Get all 126 Live publishers/sites with GAM IDs, verticals, groups
- `getPublisherFormats` - Matrix of publishers/sites and their ad formats by device
- `getPublishersByFormats` - Find publishers/sites supporting specific formats
- `findPublisherAdUnits` - Complete 3-level ad unit hierarchy

### Product & Pricing
- `getAllProducts` - Ad products and product groups
- `getAllFormats` - Ad format specifications by device
- `getAllSizes` - Ad unit sizes with IAB standards
- `getAllAdPrices` - CPM rates in DKK

### Targeting
- `getKeyValues` - 22,000+ custom targeting options
- `getAudienceSegments` - Demographic/behavioral segments
- `getAllPlacements` - GAM placements and verticals
- `getGeoLocations` - 1,700+ Danish locations
- `getContextualTargeting` - Neuwo content categories

### Forecasting
- `availabilityForecast` - Real GAM SOAP API integration for inventory forecasting

### Board Tools (34 tools)
- **CRM**: `getAccounts`, `getContacts`, `getLeads`
- **Sales**: `getDeals`, `getOpportunities`, `getSalesActivities`
- **Tasks**: 
  - Get: `getTasksAdOps`, `getTasksMarketing`, `getTasksTechIntelligence`, etc.
  - Create/Update: `createTaskTechIntelligence`, `updateTaskTechIntelligence`
- **Operations**: `getBookings`, `getInternalAdOpsAdTech`
- **Development**: `getBugs`, `getFeatures`, `getTests`, `getChangelog`
- And 15+ more covering HR, Support, Marketing, Business, OKR boards

### Debug Tools
- `listBoards` - List all Monday.com boards with metadata
- `getBoardColumns` - Inspect board columns with status/dropdown options
- `getItems` - Generic item fetcher with advanced filtering

## Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Environment Variables

Copy `.env.example` to `.env.local` and fill in your credentials:

```env
# Authentication (use 'test-token' for local development)
STEPHIE_AUTH_TOKEN=your_token_or_test-token

# Monday.com API
MONDAY_API_KEY=your_monday_key

# Google Ad Manager (for forecasting)
GOOGLE_SERVICE_ACCOUNT_EMAIL=service@account.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
GOOGLE_AD_MANAGER_NETWORK_CODE=your_network_code

# Stack Auth (optional for production)
NEXT_PUBLIC_STACK_PROJECT_ID=your_project_id
STACK_SECRET_SERVER_KEY=your_secret_key
DATABASE_URL=your_postgres_url
```

## Usage

### Claude Desktop (Cloud via Vercel)

1. **Deploy to Vercel** (see deployment section below)

2. **Configure Claude Desktop:**
   
   Edit your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):
   
   ```json
   {
     "mcpServers": {
       "stephie-mcp": {
         "command": "npx",
         "args": ["-y", "mcp-remote", "https://stephie-mcp.vercel.app/sse"]
       }
     }
   }
   ```

3. **Restart Claude Desktop** to connect to the cloud MCP server

### Claude Desktop (Local Development)

1. **Build the MCP server:**
   ```bash
   pnpm mcp:build
   ```

2. **Configure Claude Desktop for local server:**
   
   ```json
   {
     "mcpServers": {
       "stephie-mcp-local": {
         "command": "node",
         "args": ["/path/to/stephie-mcp/dist/mcp-server.js"],
         "env": {
           "STEPHIE_AUTH_TOKEN": "test-token",
           "MONDAY_API_KEY": "your_key",
           "GOOGLE_SERVICE_ACCOUNT_EMAIL": "...",
           "GOOGLE_PRIVATE_KEY": "...",
           "GOOGLE_AD_MANAGER_NETWORK_CODE": "..."
         }
       }
     }
   }
   ```

3. **Restart Claude Desktop** to load the local MCP server

### Vercel Deployment (Cloud)

1. **Deploy to Vercel:**
   ```bash
   vercel --prod
   ```

2. **Set environment variables** in Vercel dashboard:
   - All variables from `.env.local` need to be added
   - Go to Project Settings → Environment Variables
   - Add each variable for Production environment

3. **Verify deployment:**
   ```bash
   # Check SSE endpoint
   curl -I https://stephie-mcp.vercel.app/sse
   
   # Should return HTTP 200 with text/event-stream content-type
   ```

4. **Use with Claude Desktop** via mcp-remote (see Claude Desktop section above)

## Dynamic Column System

The codebase includes a **Dynamic Column System** that eliminates hardcoded column arrays in tools. This system provides:

- **🔄 Automatic Adaptation**: Tools fetch column configurations from a central Columns board (333 columns tracked)
- **🎯 Single Source of Truth**: All column IDs managed in Monday.com board ID 2135717897
- **🧪 Test Resilience**: Tests can discover actual columns instead of hardcoding expectations
- **✨ Zero Maintenance**: When Monday.com boards change, just update the Columns board

### How It Works
```typescript
// Instead of hardcoding columns in each tool:
const columns = await getDynamicColumns(boardId);
// Tools automatically use the correct columns for each board
```

### Migration Status
- ✅ Infrastructure complete with 333 columns migrated
- ✅ `getDynamicColumns()` function ready in `lib/tools/dynamic-columns.ts`
- 🔄 Tools being migrated (see `DYNAMIC_COLUMNS_MIGRATION_GUIDE.md`)

This is an internal implementation improvement - tool interfaces and parameters remain unchanged for users.

## Development

### Running Locally

```bash
# Run MCP server for testing
pnpm mcp:dev

# Run Vercel dev server
vercel dev

# Run tests
TEST_AUTH_TOKEN=test-token pnpm test:local

# Build for production
pnpm mcp:build
```

### Adding New Tools Manually

⚠️ **IMPORTANT**: When adding a new tool, you MUST update FOUR places:

1. **Create tool implementation**: `/lib/tools/[category]/[toolName].ts`
2. **Add to toolDefinitions**: `/lib/mcp/toolDefinitions.ts` (with full parameter descriptions)
3. **Register in BOTH servers**:
   - `api/server.ts` (Vercel) - uses `buildZodSchema()` helper
   - `mcp-server.ts` (local MCP) - add to `toolImplementations` map

#### Tool Definition Pattern

```typescript
// 1. Create: lib/tools/example/getExample.ts
export async function getExample(params: { search?: string; limit?: number }) { 
  // Implementation
}

// 2. Add to: lib/mcp/toolDefinitions.ts (SINGLE SOURCE OF TRUTH)
{
  name: 'getExample',
  description: 'Get example data from the system',
  inputSchema: {
    type: 'object',
    properties: {
      search: { 
        type: 'string', 
        description: 'Search term to filter results'  // Descriptions here!
      },
      limit: { 
        type: 'number', 
        description: 'Maximum results (default: 10)',
        default: 10
      }
    }
  }
}

// 3. Register in: api/server.ts (NO REDUNDANT DESCRIPTIONS)
server.tool(
  'getExample',
  getToolDescription('getExample'),        // Gets description from toolDefinitions
  buildZodSchema('getExample'),            // Builds Zod schema from toolDefinitions
  async (input) => {
    const result = await getExample(input);
    return { content: [{ type: 'text', text: result }] };
  }
);

// 4. Register in: mcp-server.ts
import { getExample } from './lib/tools/example/getExample.js';
// Add to toolImplementations map
```

#### Parameter Description Management

The `buildZodSchema()` helper automatically:
- Reads parameter definitions from `toolDefinitions.ts`
- Builds proper Zod validation schemas
- Includes all descriptions, defaults, and enums
- Handles nested objects and arrays
- **Eliminates redundancy** - maintain descriptions in ONE place only!
const toolImplementations = {
  // ...
  getExample: (args) => getExample(args),
};
```

### Adding New Board Tools

1. **Auto-generate from Monday.com boards:**
   ```bash
   npx tsx scripts/generate-board-tools.ts
   ```
   This creates tools with essential columns and filtering

2. **Update meta board column names:**
   ```bash
   npx tsx scripts/add-column-names-to-boards.ts
   ```
   Tracks column usage across boards

3. **Register in server.ts** to make available immediately

### Tool Development Guidelines

- **Output Format**: Always return markdown strings, never JSON
- **Tool Names**: Use concise names without 'Items' suffix (e.g., `getAccounts`)
- **Descriptions**: Include status index mappings for LLM understanding
- **Filtering**: Support numeric indices for status/dropdown columns
- **Error Handling**: Use console.error for debug output

### Testing Tools

Example test scripts are in the `tests/` directory:

```bash
# Test publisher tools
TEST_AUTH_TOKEN=test-token npx tsx tests/publishers/test-publishers-output.ts

# Test board tools
TEST_AUTH_TOKEN=test-token npx tsx tests/debug/test-board-tools.ts

# Debug tools
TEST_AUTH_TOKEN=test-token npx tsx tests/debug/test-find-publisher.ts
```

## Key Improvements

This setup follows best practices from the Vercel MCP template:

1. **Single Tool Definition Source** - `lib/mcp/toolDefinitions.ts` eliminates duplication
2. **Simplified Vercel Endpoint** - Uses `mcp-handler` library for cleaner code
3. **Organized Test Files** - Tests grouped by functionality in `tests/` directory
4. **Dual Deployment Support** - Works with both Claude Desktop and Vercel
5. **Clean Architecture** - Clear separation of concerns

## API Documentation

The MCP server exposes tools via the Model Context Protocol. Each tool returns markdown-formatted text optimized for LLM consumption.

### Example: Get All Publishers

```javascript
// Request
{
  "method": "tools/call",
  "params": {
    "name": "getAllPublishers",
    "arguments": {}
  }
}

// Response (markdown table)
# Publishers/Sites

**Total:** 126 Live publishers/sites

| Publisher/Site | GAM ID | Vertical | Group | Approval |
|----------------|--------|----------|-------|----------|
| berlingske.dk | 123... | News | Berlingske | Gambling |
...
```

## Troubleshooting

### "No items found" errors
- Verify board IDs in `lib/monday/client.ts`
- Check column IDs match current Monday.com schema
- Use `getBoardColumns` tool to inspect structure

### Authentication failures
- For local dev: Set `TEST_AUTH_TOKEN=test-token`
- For production: Ensure valid Stack Auth token
- Check environment variables are loaded

### Vercel deployment issues
- Ensure TypeScript compiles: `pnpm build`
- Check Vercel logs: `vercel logs stephie-mcp.vercel.app`
- Verify environment variables are set in Vercel dashboard
- Note: DOM types are required in tsconfig.json for Response API

### MCP connection issues
- The server uses SSE transport at `/sse` endpoint
- Requires mcp-remote for Claude Desktop connection
- Check that rewrites in vercel.json include `/sse` and `/message`

### Rate limiting
- Monday.com API has rate limits
- Implement caching for frequently accessed data
- Use batch operations where possible

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

## License

MIT © STEP Networks