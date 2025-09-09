#!/bin/bash

# STEPhie MCP Server Restart Script
# This script helps restart the MCP server when connection issues occur

echo "🔄 Restarting STEPhie MCP Server..."

# Kill any existing mcp-server processes
echo "📋 Checking for existing processes..."
pkill -f "mcp-server.ts" && echo "✅ Killed existing processes" || echo "ℹ️  No existing processes found"

# Wait a moment
sleep 2

# Check if Claude Desktop is running and restart it
if pgrep -x "Claude" > /dev/null; then
    echo "🔄 Restarting Claude Desktop..."
    osascript -e 'tell application "Claude" to quit'
    sleep 3
    open -a "Claude"
    echo "✅ Claude Desktop restarted"
else
    echo "ℹ️  Claude Desktop not running"
fi

# Clear any cache that might be causing issues
if [ -d "/Users/naref/Library/Logs/Claude" ]; then
    echo "🧹 Clearing Claude logs..."
    rm -f /Users/naref/Library/Logs/Claude/mcp-server-STEPhie.log
    echo "✅ Logs cleared"
fi

echo "✨ Restart complete! The MCP server will start automatically when Claude connects."
echo "💡 If issues persist, try using the stable config: claude-desktop-config-stable.json"