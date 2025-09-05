#!/bin/bash

# STEPhie MCP Server - Claude Desktop Setup Script

echo "🚀 STEPhie MCP Server - Claude Desktop Setup"
echo "============================================"
echo ""

# Detect OS
if [[ "$OSTYPE" == "darwin"* ]]; then
    CONFIG_PATH="$HOME/Library/Application Support/Claude/claude_desktop_config.json"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    CONFIG_PATH="$HOME/.config/Claude/claude_desktop_config.json"
else
    echo "❌ Unsupported OS. Please configure manually."
    exit 1
fi

echo "📍 Config location: $CONFIG_PATH"
echo ""

# Check if config exists
if [ -f "$CONFIG_PATH" ]; then
    echo "✓ Found existing Claude Desktop config"
    echo ""
    echo "Current config:"
    cat "$CONFIG_PATH" | jq '.' 2>/dev/null || cat "$CONFIG_PATH"
    echo ""
    
    # Backup existing config
    BACKUP_PATH="$CONFIG_PATH.backup.$(date +%Y%m%d_%H%M%S)"
    cp "$CONFIG_PATH" "$BACKUP_PATH"
    echo "📦 Backed up to: $BACKUP_PATH"
    echo ""
else
    echo "⚠️  No existing config found. Creating new one..."
    mkdir -p "$(dirname "$CONFIG_PATH")"
    echo '{"mcpServers": {}}' > "$CONFIG_PATH"
fi

# Get absolute path to MCP server
MCP_SERVER_PATH="$(cd "$(dirname "$0")" && pwd)/mcp-server.ts"
echo "📂 MCP Server path: $MCP_SERVER_PATH"
echo ""

# Ask for auth token
echo "🔐 Authentication Setup"
echo "For testing, you can use 'test-token'"
echo "For production, get a token from https://ai.stepnetwork.dk/api-keys"
echo ""
read -p "Enter auth token (or press Enter for 'test-token'): " AUTH_TOKEN
AUTH_TOKEN=${AUTH_TOKEN:-test-token}

# Create new config with stephie server added
echo "📝 Adding STEPhie MCP server to config..."

# Use jq to merge configs if available, otherwise use Python
if command -v jq &> /dev/null; then
    jq --arg path "$MCP_SERVER_PATH" --arg token "$AUTH_TOKEN" \
        '.mcpServers["stephie-local"] = {
            "command": "npx",
            "args": ["tsx", $path],
            "env": {
                "STEPHIE_AUTH_TOKEN": $token
            }
        }' "$CONFIG_PATH" > "$CONFIG_PATH.tmp" && mv "$CONFIG_PATH.tmp" "$CONFIG_PATH"
else
    python3 -c "
import json
import sys

with open('$CONFIG_PATH', 'r') as f:
    config = json.load(f)

if 'mcpServers' not in config:
    config['mcpServers'] = {}

config['mcpServers']['stephie-local'] = {
    'command': 'npx',
    'args': ['tsx', '$MCP_SERVER_PATH'],
    'env': {
        'STEPHIE_AUTH_TOKEN': '$AUTH_TOKEN'
    }
}

with open('$CONFIG_PATH', 'w') as f:
    json.dump(config, f, indent=2)
"
fi

echo "✅ Configuration updated!"
echo ""
echo "New config:"
cat "$CONFIG_PATH" | jq '.' 2>/dev/null || cat "$CONFIG_PATH"
echo ""

echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Completely quit Claude Desktop (Cmd+Q on macOS)"
echo "2. Start Claude Desktop again"
echo "3. Test by asking Claude: 'What MCP tools do you have available?'"
echo ""
echo "Available STEPhie tools:"
echo "  • getAllPublishers - Get publisher data"
echo "  • getPublisherFormats - Get ad formats"
echo "  • availabilityForecast - Get GAM forecasts"
echo "  • getAllProducts - Get ad products"
echo "  • getAllFormats - Get format specifications"
echo ""
echo "To revert changes, restore from backup:"
echo "  cp \"$BACKUP_PATH\" \"$CONFIG_PATH\""