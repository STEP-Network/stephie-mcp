# STEPhie MCP Server

Model Context Protocol (MCP) server for STEPhie tools, providing secure access to publisher data and ad forecasting capabilities.

## Features

- 🔐 **Secure Authentication** via Stack Auth
- 📊 **Publisher Tools** - Access Monday.com publisher data
- 📈 **Forecast Tools** - Google Ad Manager availability forecasting  
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
│   │   └── toolDefinitions.ts  # Shared tool definitions (single source of truth)
│   ├── tools/           # Tool implementations
│   │   ├── getAllPublishers.ts
│   │   ├── getPublisherFormats.ts
│   │   └── ...
│   ├── monday/          # Monday.com client
│   ├── gam/             # Google Ad Manager integration
│   └── auth/            # Authentication
├── tests/               # Organized test files
│   ├── publishers/
│   ├── formats/
│   └── debug/
├── mcp-server.ts        # Claude Desktop server (stdio transport)
├── vercel.json          # Vercel deployment config
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

### Debug Tools
- `listBoards` - List all Monday.com boards
- `getBoardColumns` - Inspect board column structure
- `getItems` - Generic item fetcher

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

### Claude Desktop (Local)

1. **Build the MCP server:**
   ```bash
   pnpm mcp:build
   ```

2. **Configure Claude Desktop:**
   
   Edit your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):
   
   ```json
   {
     "mcpServers": {
       "stephie-mcp": {
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

3. **Restart Claude Desktop** to load the MCP server

### Vercel Deployment (Cloud)

1. **Deploy to Vercel:**
   ```bash
   vercel --prod
   ```

2. **Set environment variables** in Vercel dashboard

3. **Access via HTTP:**
   ```bash
   curl -X POST https://your-deployment.vercel.app \
     -H "Content-Type: application/json" \
     -d '{"method": "tools/list"}'
   ```

## Development

### Running Locally

```bash
# Run MCP server for testing
pnpm mcp:dev

# Run Vercel dev server
vercel dev

# Run tests
TEST_AUTH_TOKEN=test-token pnpm test:local
```

### Testing Tools

Example test scripts are in the `tests/` directory:

```bash
# Test publisher tools
TEST_AUTH_TOKEN=test-token npx tsx tests/publishers/test-publishers-output.ts

# Test format tools  
TEST_AUTH_TOKEN=test-token npx tsx tests/formats/test-highimpact.ts

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
- Verify board IDs in `lib/monday/client.js`
- Check column IDs match current Monday.com schema
- Use `getBoardColumns` tool to inspect structure

### Authentication failures
- For local dev: Set `TEST_AUTH_TOKEN=test-token`
- For production: Ensure valid Stack Auth token
- Check environment variables are loaded

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