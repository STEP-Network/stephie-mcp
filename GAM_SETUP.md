# Google Ad Manager Setup for STEPhie MCP

This guide explains how to set up Google Ad Manager (GAM) credentials for the STEPhie MCP server.

## Required Credentials

To use GAM-powered tools (`getContextualTargeting`, `availabilityForecast`), you need:

1. **Google Service Account Email** - Service account created in Google Cloud Console
2. **Google Private Key** - Private key for the service account
3. **Network Code** - Your Google Ad Manager network ID (default: `21809957681`)

## Setup Methods

### Method 1: Using the Setup Script (Recommended)

1. Create a `.env.local` file with your credentials:
```env
MONDAY_API_KEY=your-monday-api-key
GOOGLE_SERVICE_ACCOUNT_EMAIL=stephie@admanager-428908.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_AD_MANAGER_NETWORK_CODE=21809957681
```

2. Run the setup script:
```bash
./setup-claude-gam.sh
```

3. Copy the generated `claude-desktop-config.json` contents to Claude Desktop:
   - Open Claude Desktop
   - Go to Settings → Developer → Edit Config
   - Replace/merge with the generated config
   - Restart Claude Desktop

### Method 2: Manual Configuration

Add these environment variables to your Claude Desktop config:

```json
{
  "mcpServers": {
    "stephie-local": {
      "command": "npx",
      "args": ["tsx", "/path/to/stephie-mcp/mcp-server.ts"],
      "env": {
        "STEPHIE_AUTH_TOKEN": "test-token",
        "MONDAY_API_KEY": "your-monday-key",
        "GOOGLE_AD_MANAGER_NETWORK_CODE": "21809957681",
        "GOOGLE_SERVICE_ACCOUNT_EMAIL": "your-service@project.iam.gserviceaccount.com",
        "GOOGLE_PRIVATE_KEY": "-----BEGIN PRIVATE KEY-----\\n...key...\\n-----END PRIVATE KEY-----\\n"
      }
    }
  }
}
```

**Important:** The private key must have `\n` escaped as `\\n` in the JSON config.

## Verifying Setup

After configuration, test the tools in Claude Desktop:

1. **Test getGeoLocations** (works without GAM):
```
Use the getGeoLocations tool to find Copenhagen
```

2. **Test getContextualTargeting** (requires GAM):
```
Use the getContextualTargeting tool to search for sports categories
```

If you see results, your GAM credentials are working!

## Troubleshooting

### Error: "Google service account credentials not configured"
- Ensure all three GAM environment variables are set in your Claude Desktop config
- Check that the private key is properly escaped (\\n instead of \n)

### Error: "Could not refresh access token"
- Verify your service account has the required permissions in GAM
- Check that the private key matches the service account email
- Ensure the service account is added to your GAM network

### Error: "Failed to fetch contextual values: 403"
- The service account doesn't have permission to access the GAM network
- Add the service account email to your GAM network with appropriate permissions

## Available GAM Tools

With proper credentials, these tools become available:

1. **getContextualTargeting**
   - Search Neuwo contextual categories
   - Returns category IDs for content-based targeting
   - Example: Sports, News, Business categories

2. **getGeoLocations** 
   - Search geographic locations (works offline)
   - Returns criteria IDs for geographic targeting
   - Includes Danish cities, regions, postal codes

3. **availabilityForecast** (coming soon)
   - Real-time inventory forecasting from GAM
   - Uses ad unit IDs from `findPublisherAdUnits`
   - Supports all targeting criteria

## Security Notes

- Never commit credentials to git
- The `.env.local` file is gitignored
- Use environment variables or secure vaults in production
- Rotate service account keys regularly

## Getting Service Account Credentials

If you don't have credentials yet:

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project
3. Go to IAM & Admin → Service Accounts
4. Create a new service account or use existing
5. Create a new key (JSON format)
6. Add the service account email to your GAM network with API access