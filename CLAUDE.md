# CLAUDE.md

MCP Server for STEP Networks' advertising and publisher data via Monday.com and Google Ad Manager.

## Recent Updates (December 2025)

- **32 Board-Specific Tools**: Added tools for all Monday.com boards (CRM, Tasks, Operations, etc.)
- **Tool Naming**: Simplified naming convention - removed 'Items' suffix (e.g., `getAccounts` instead of `getAccountsItems`)
- **Meta Board Integration**: Column names tracking in Boards meta board (1698570295)
- **Tool Descriptions**: Enhanced with status index mappings for better LLM understanding
- **Board Relations**: Shows linked item names alongside IDs
- **Vercel Deployment**: Full cloud deployment with mcp-handler library
- **SSE Transport**: Server-Sent Events support for Claude Desktop via mcp-remote

## Tech Stack
- TypeScript ES modules
- MCP SDK for protocol implementation  
- Monday.com GraphQL API
- Google Ad Manager SOAP API v202502
- Stack Auth for authentication

## Monday.com Board IDs
```javascript
BOARD_IDS = {
  PUBLISHERS: '1222800432',        // Publisher information (ALWAYS filter by status8='Live')
  PUBLISHER_FORMATS: '1222800432', // Same board - publisher format matrix
  AD_UNITS: '1558578956',          // Ad units hierarchy (3 levels)
  KEY_VALUES: '1802371471',        // GAM targeting key-values
  AUDIENCE_SEGMENTS: '2051827669', // Demographic/behavioral segments
  PRODUCTS: '1983692701',          // Ad products
  PRODUCT_GROUPS: '1611223368',    // Product group definitions
  FORMATS: '1983719743',           // Format specifications
  SIZES: '1558597958',             // Ad unit sizes
  PRICES: '1432155906',            // Display/video pricing
  VERTICALS: '2054670440',         // Publisher verticals
  PLACEMENTS: '1935559241',        // Ad placements
  BOARDS: '1698570295'             // Meta board listing
}
```

## Critical Implementation Rules

### Publisher Filtering
- Publisher formats board uses dropdown columns with device-specific IDs

### Ad Unit Hierarchy  
- Level 1: Publisher Groups (Type index 4)
- Level 2: Publishers (Type index 3)
- Level 3: Child Ad Units (Type index 1-2)
- Use GAM IDs for relationships: `text__1` (Ad Unit ID), `text2__1` (Parent Ad Unit ID)

### Tool Output Format
- Return **markdown strings**, never JSON objects
- Use headers, tables, code blocks for structure
- Include metadata (counts, filters applied)
- Console.error for debug output (stdout must be clean JSON for MCP)

## Available Tools

### Publisher Tools
- `getAllPublishers` - Publisher list (Live only)
- `getPublisherFormats` - Format support by publisher
- `getPublishersByFormats` - Filter by format support (Adnami vs High-impact.js)
- `findPublisherAdUnits` - Complete 3-level hierarchy with GAM IDs

### Targeting Tools
- `getKeyValues` - Content targeting (22k+ values, batched)
- `getAudienceSegments` - Demographic/behavioral segments
- `getAllPlacements` - GAM placements (RON/Gambling/Finance/RE-AD are NOT verticals)
- `getGeoLocations` - 1700+ Danish locations
- `getContextualTargeting` - Neuwo categories from GAM

### Product & Pricing
- `getAllProducts` - Product list and hierarchy
- `getAllFormats` - Format specs by device
- `getAllSizes` - Ad unit sizes
- `getAllAdPrices` - DKK pricing

### Forecasting
- `availabilityForecast` - GAM SOAP API for inventory forecasting

### Board-Specific Tools (32 tools)
- **CRM**: `getAccounts`, `getContacts`, `getLeads`
- **Sales**: `getDeals`, `getOpportunities`, `getSalesActivities`, `getInternalAdSales`
- **Operations**: `getBookings`, `getProcesses`, `getInternalAdOpsAdTech`
- **Development**: `getBugs`, `getFeatures`, `getTests`, `getChangelog`
- **Tasks**: `getTasksAdOps`, `getTasksAdTech`, `getTasksMarketing`, `getTasksTechIntelligence`, `getTasksVideo`, `getTasksYieldGrowth`
- **Marketing**: `getMarketingBudgets`, `getMarketingExpenses`
- **Business**: `getPartners`, `getStrategies`, `getVertikaler`
- **HR**: `getPeople`, `getTeams`
- **Support**: `getTickets`, `getPublisherFAQ`
- **OKR**: `getOKR`
- **Publishers**: `getOTTPublishers`

### Debug Tools
- `listBoards` - Available boards with metadata
- `getBoardColumns` - Column structure with status/dropdown options
- `getItems` - Generic item fetcher with advanced filtering

## Development Workflow

### Adding New Board Tools
1. Run `scripts/generate-board-tools.ts` to auto-generate tools from Monday.com boards
2. Tools are created with essential columns and filtering capabilities
3. Register tools in `server.ts` for immediate availability
4. Tool definitions stored in `lib/mcp/boardToolDefinitions.json`

### Meta Board Management
- Board ID: 1698570295 tracks all boards and their column names
- Use `scripts/add-column-names-to-boards.ts` to update column tracking
- Dropdown column `dropdown_mkvj2a8r` stores column names per board

## Critical Implementation Details

### Google Ad Manager SOAP Implementation

STEPhie MCP now includes a full SOAP client for Google Ad Manager v202502:

#### SOAP Client (`/lib/gam/soap.ts`)
- **getAvailabilityForecast**: Complete SOAP implementation for forecast requests
- Supports all GAM targeting options: inventory, geo, custom, audience, placement, frequency capping
- Handles immediate start ("now") and scheduled campaigns
- Includes contending line item analysis and targeting criteria breakdown
- Built-in XML parsing and error handling
- Uses service account JWT authentication

#### SOAP Request Features
- **Inventory Targeting**: Ad unit IDs with descendant inclusion/exclusion
- **Geographic Targeting**: Location-based targeting with inclusion/exclusion lists
- **Custom Targeting**: Key-value pairs with IS/IS_NOT operators
- **Audience Segments**: Demographic and behavioral targeting via segment IDs
- **Placement Targeting**: Content vertical and placement-based targeting
- **Frequency Capping**: Per-user impression limits with time units (minute to lifetime)
- **Advanced Options**: Targeting criteria breakdown and contending line item analysis

### findPublisherAdUnits Algorithm
When searching for a publisher (e.g., "jv.dk"):
1. Query for items where name contains search term AND Type is 3 or 4
2. Extract GAM IDs (`text__1`) and parent IDs (`text2__1`)
3. Fetch parent groups where their `text__1` matches publisher's `text2__1`
4. Fetch children where their `text2__1` matches publisher's `text__1`
5. Always includes children
6. Returns all GAM IDs for forecasting in JSON code block

## Format Column IDs & Device Mappings

```javascript
// Column-specific device IDs (important for filtering)
columnSpecificMappings = {
  // Adnami formats
  'dropdown_mksd7frz': { 1: 'Mobile', 8: 'Desktop', 15: 'App' },  // Topscroll
  'dropdown_mksd17vw': { 1: 'Mobile', 4: 'Desktop' },              // Midscroll
  
  // High-impact.js formats (different IDs!)
  'dropdown_mksdcgvj': { 20: 'Mobile', 108: 'Desktop' },           // Topscroll
  'dropdown_mksdjpqx': { 4: 'Mobile', 108: 'Desktop' },            // Midscroll
}
```

## Environment Variables

```env
# Required
STEPHIE_AUTH_TOKEN=<token or 'test-token' for dev>
MONDAY_API_KEY=<api-key>

# GAM Integration  
GOOGLE_AD_MANAGER_NETWORK_CODE=21809957681
GOOGLE_SERVICE_ACCOUNT_EMAIL=<service-account@project.iam.gserviceaccount.com>
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
```

## Development

```bash
pnpm install
pnpm mcp:dev          # Run locally
pnpm mcp:build        # Build for production
TEST_AUTH_TOKEN=test-token pnpm test:local
```

## Claude Desktop Config

```json
{
  "mcpServers": {
    "STEPhie": {
      "command": "node",
      "args": ["/path/to/dist/mcp-server.js"],
      "env": {
        "STEPHIE_AUTH_TOKEN": "token",
        "MONDAY_API_KEY": "key"
      }
    }
  }
}
```

## Deployment

### Vercel Deployment
```bash
# Deploy to production
vercel --prod

# Set environment variables in Vercel dashboard
# Project Settings → Environment Variables
```

### Claude Desktop Configuration
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

## Common Issues

- **Missing formats**: Verify column IDs match current board schema
- **High-impact vs Adnami**: Different dropdown IDs for same devices
- **Parent-child relationships**: Use GAM IDs not Monday item IDs
- **TypeScript errors**: Ensure DOM types in tsconfig.json for Response API
- **Vercel 500 errors**: Check no dotenv in api/server.ts, use named exports
- **404 on /message**: Ensure vercel.json has rewrites for /sse and /message
- **CRITICAL: Use console.error for debug output** - MCP protocol requires clean JSON on stdout

## Testing Individual Tools

```bash
TEST_AUTH_TOKEN=test-token npx tsx -e "
import { config } from 'dotenv';
import { getPublishersByFormats } from './lib/tools/getPublishersByFormats.ts';
config({ path: '.env.local' });

const result = await getPublishersByFormats({ 
  topscrollHighimpact: 'All',
  midscrollHighimpact: 'All'
});
console.log(result);
"
```