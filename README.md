# STEPhie MCP Server

Model Context Protocol (MCP) server for STEPhie tools, providing secure access to publisher data and ad forecasting capabilities.

## Features

- 🔐 **Secure Authentication** via Stack Auth
- 📊 **Publisher Tools** - Access Monday.com publisher data
- 📈 **Forecast Tools** - Google Ad Manager availability forecasting  
- 🚀 **Fast Response** - Optimized Vercel Edge Functions
- 🔄 **Streaming Support** - SSE for real-time updates

## Available Tools

### Publisher Management
- `getAllPublishers` - Get all publishers with details
- `getPublisherFormats` - Get ad formats for publishers
- `getPublishersByFormats` - Find publishers by ad formats
- `findPublisherAdUnits` - Find ad units for publishers
- `getAdUnits` - Get ad unit details

### Product & Pricing
- `getAllProducts` - Get ad products
- `getAllFormats` - Get ad format specifications
- `getAllSizes` - Get ad sizes
- `getAllAdPrices` - Get pricing information

### Forecasting
- `availabilityForecast` - GAM availability forecasting

## Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Environment Variables

Copy `.env.example` to `.env.local` and fill in your credentials:

```env
# Stack Auth (from STEPhie)
NEXT_PUBLIC_STACK_PROJECT_ID=your_project_id
STACK_SECRET_SERVER_KEY=your_secret_key

# Monday.com API
MONDAY_API_KEY=your_monday_key

# Database (shared with STEPhie)
DATABASE_URL=your_neon_database_url
```

### 3. Local Development

```bash
pnpm dev
```

Server will be available at `http://localhost:3000/api`

## Client Configuration

### For Claude Desktop

Add to your Claude Desktop config:

```json
{
  "mcpServers": {
    "stephie": {
      "url": "https://mcp.stepnetwork.dk/api",
      "headers": {
        "Authorization": "Bearer YOUR_STACK_AUTH_TOKEN"
      }
    }
  }
}
```

### For Programmatic Access

```typescript
const response = await fetch('https://mcp.stepnetwork.dk/api', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: JSON.stringify({
    jsonrpc: '2.0',
    method: 'tools/call',
    params: {
      name: 'getAllPublishers',
      arguments: { limit: 10 }
    },
    id: 1
  })
});
```

## Getting an Auth Token

1. Log in to STEPhie at https://ai.stepnetwork.dk
2. Navigate to Settings → API Keys
3. Generate a new MCP token
4. Use the token in your MCP client configuration

## Deployment

### Deploy to Vercel

```bash
vercel --prod
```

### Add Domain in Vercel

1. Go to Project Settings → Domains
2. Add `mcp.stepnetwork.dk`
3. Update DNS records:
   ```
   Type: CNAME
   Name: mcp
   Value: cname.vercel-dns.com
   ```

## API Documentation

### Initialize Connection

```json
POST /api
{
  "jsonrpc": "2.0",
  "method": "initialize",
  "params": {
    "authToken": "YOUR_TOKEN"
  },
  "id": 1
}
```

### List Available Tools

```json
POST /api
{
  "jsonrpc": "2.0",
  "method": "tools/list",
  "id": 2
}
```

### Call a Tool

```json
POST /api
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "getAllPublishers",
    "arguments": {
      "limit": 10,
      "active": true
    }
  },
  "id": 3
}
```

## Development

### Project Structure

```
stephie-mcp/
├── api/              # Vercel API endpoints
│   ├── index.ts      # Main MCP endpoint
│   ├── sse.ts        # SSE streaming endpoint
│   └── health.ts     # Health check
├── lib/
│   ├── auth/         # Stack Auth integration
│   ├── tools/        # Tool implementations
│   ├── monday/       # Monday.com client
│   └── types/        # TypeScript types
└── package.json
```

### Adding New Tools

1. Add tool definition in `api/index.ts` AVAILABLE_TOOLS array
2. Implement handler in `lib/tools/`
3. Add to executeToolHandler switch statement

## Support

- Documentation: https://ai.stepnetwork.dk/docs/mcp
- Issues: https://github.com/stepnetwork/stephie-mcp/issues
- Email: support@stepnetwork.dk

## License

MIT © STEP Networks