# Claude Desktop Setup Guide

This guide will help you connect STEPhie MCP server to Claude Desktop for local testing.

## Prerequisites

- Claude Desktop app installed
- Node.js 18+ installed
- STEPhie MCP server code

## Setup Steps

### 1. Build the MCP Server

First, build the TypeScript code:

```bash
cd /Users/naref/Documents/Code/stephie-mcp
pnpm build
pnpm mcp:build
```

### 2. Test the MCP Server Manually

Test that the server starts correctly:

```bash
# This should output the server capabilities
echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | STEPHIE_AUTH_TOKEN=test-token node dist/mcp-server.js
```

### 3. Configure Claude Desktop

Claude Desktop configuration is typically located at:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

#### Option A: Using the built binary (after build)

Edit your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "stephie": {
      "command": "node",
      "args": ["/Users/naref/Documents/Code/stephie-mcp/dist/mcp-server.js"],
      "env": {
        "STEPHIE_AUTH_TOKEN": "test-token"
      }
    }
  }
}
```

#### Option B: Using tsx for development (no build needed)

```json
{
  "mcpServers": {
    "stephie": {
      "command": "npx",
      "args": ["tsx", "/Users/naref/Documents/Code/stephie-mcp/mcp-server.ts"],
      "env": {
        "STEPHIE_AUTH_TOKEN": "test-token"
      }
    }
  }
}
```

#### Option C: Using npx (if published to npm)

```json
{
  "mcpServers": {
    "stephie": {
      "command": "npx",
      "args": ["@stephie/mcp-server"],
      "env": {
        "STEPHIE_AUTH_TOKEN": "your-real-token"
      }
    }
  }
}
```

### 4. Copy Environment Variables

If you have a `.env.local` file with real credentials:

```json
{
  "mcpServers": {
    "stephie": {
      "command": "node",
      "args": ["/Users/naref/Documents/Code/stephie-mcp/dist/mcp-server.js"],
      "env": {
        "STEPHIE_AUTH_TOKEN": "test-token",
        "NEXT_PUBLIC_STACK_PROJECT_ID": "your-project-id",
        "STACK_SECRET_SERVER_KEY": "your-secret-key",
        "MONDAY_API_KEY": "your-monday-key",
        "DATABASE_URL": "your-database-url"
      }
    }
  }
}
```

### 5. Restart Claude Desktop

After updating the configuration:

1. Completely quit Claude Desktop (Cmd+Q on macOS)
2. Start Claude Desktop again
3. The MCP server should now be available

### 6. Test in Claude Desktop

In a new Claude conversation, you should be able to:

1. Ask Claude to list available MCP tools
2. Use the STEPhie tools like:
   - "Use the getAllPublishers tool to show me publishers"
   - "Get a forecast for next week"
   - "Show me available ad formats"

## Troubleshooting

### Check if MCP is connected

In Claude Desktop, you can check if the MCP server is connected by:
1. Looking for the MCP indicator in the interface
2. Asking Claude "What MCP tools do you have available?"

### Debug Mode

To see what's happening, run the server manually:

```bash
STEPHIE_AUTH_TOKEN=test-token node dist/mcp-server.js
```

Then send it JSON-RPC commands:

```bash
# List tools
echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | STEPHIE_AUTH_TOKEN=test-token node dist/mcp-server.js

# Call a tool
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"getAllPublishers","arguments":{}},"id":2}' | STEPHIE_AUTH_TOKEN=test-token node dist/mcp-server.js
```

### Common Issues

1. **"MCP server failed to start"**
   - Check the path to mcp-server.js is correct
   - Ensure you've run `pnpm build` and `pnpm mcp:build`
   - Check environment variables are set

2. **"Authentication required"**
   - Make sure STEPHIE_AUTH_TOKEN is set in the env section
   - For local testing, use "test-token"

3. **"Command not found"**
   - Ensure Node.js is in your PATH
   - Try using full path to node: `/usr/local/bin/node`

4. **Tools not showing up**
   - Restart Claude Desktop completely
   - Check the configuration file syntax is valid JSON
   - Look for errors in Claude Desktop logs

## Development Workflow

For active development:

1. Make changes to `mcp-server.ts`
2. Use the tsx version in Claude Desktop config (no build needed)
3. Restart Claude Desktop to reload the server
4. Test your changes

## Production Setup

For production use with real Stack Auth:

1. Get a real auth token from https://ai.stepnetwork.dk/api-keys
2. Replace "test-token" with your real token
3. Ensure all environment variables are set correctly
4. Consider using the HTTP endpoint instead for better security

## Using HTTP Mode Instead

If stdio mode doesn't work, you can use the HTTP server:

1. Start the HTTP server:
   ```bash
   cd /Users/naref/Documents/Code/stephie-mcp
   pnpm dev
   ```

2. Configure Claude Desktop (if it supports HTTP):
   ```json
   {
     "mcpServers": {
       "stephie": {
         "url": "http://localhost:3001/api",
         "headers": {
           "Authorization": "Bearer test-token"
         }
       }
     }
   }
   ```

Note: Not all MCP clients support HTTP mode yet.