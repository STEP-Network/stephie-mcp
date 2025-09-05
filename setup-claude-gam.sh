#!/bin/bash

# Script to update Claude Desktop config with GAM credentials from .env.local

echo "Setting up Claude Desktop config with GAM credentials..."

# Source the .env.local file
if [ -f .env.local ]; then
    source .env.local
else
    echo "Error: .env.local file not found!"
    echo "Please create .env.local with your credentials first."
    exit 1
fi

# Check if required variables are set
if [ -z "$MONDAY_API_KEY" ] || [ -z "$GOOGLE_SERVICE_ACCOUNT_EMAIL" ] || [ -z "$GOOGLE_PRIVATE_KEY" ]; then
    echo "Error: Required environment variables not found in .env.local"
    echo "Please ensure these are set:"
    echo "  - MONDAY_API_KEY"
    echo "  - GOOGLE_SERVICE_ACCOUNT_EMAIL"
    echo "  - GOOGLE_PRIVATE_KEY"
    exit 1
fi

# Escape the private key for JSON (handles newlines and quotes)
ESCAPED_KEY=$(echo "$GOOGLE_PRIVATE_KEY" | sed 's/\\/\\\\/g' | sed 's/"/\\"/g' | sed ':a;N;$!ba;s/\n/\\n/g')

# Create the Claude Desktop config
cat > claude-desktop-config.json << EOF
{
  "mcpServers": {
    "stephie-local": {
      "command": "npx",
      "args": [
        "tsx",
        "$PWD/mcp-server.ts"
      ],
      "env": {
        "STEPHIE_AUTH_TOKEN": "test-token",
        "MONDAY_API_KEY": "$MONDAY_API_KEY",
        "GOOGLE_AD_MANAGER_NETWORK_CODE": "${GOOGLE_AD_MANAGER_NETWORK_CODE:-21809957681}",
        "GOOGLE_SERVICE_ACCOUNT_EMAIL": "$GOOGLE_SERVICE_ACCOUNT_EMAIL",
        "GOOGLE_PRIVATE_KEY": "$ESCAPED_KEY"
      }
    }
  }
}
EOF

echo "✅ Claude Desktop config updated with GAM credentials!"
echo ""
echo "To use in Claude Desktop:"
echo "1. Open Claude Desktop settings"
echo "2. Go to Developer → Edit Config"
echo "3. Copy the contents of claude-desktop-config.json"
echo "4. Restart Claude Desktop"
echo ""
echo "The following tools will now work with GAM:"
echo "  - getContextualTargeting: Search contextual categories"
echo "  - getGeoLocations: Find geographic locations for targeting"
echo "  - availabilityForecast: (when implemented) Get inventory forecasts"