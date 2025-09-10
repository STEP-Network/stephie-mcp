#!/bin/bash

echo "Testing MCP endpoints..."
echo "========================="

# Test different possible endpoints
URLS=(
  "https://stephie.vercel.app/api/server"
  "https://stephie.vercel.app/sse"  
  "https://stephie.vercel.app/message"
  "https://stephie-mcp.vercel.app/api/server"
  "https://stephie-mcp.vercel.app/sse"
  "https://stephie-mcp.vercel.app/message"
)

for URL in "${URLS[@]}"; do
  echo ""
  echo "Testing: $URL"
  echo "---"
  
  # Test with initialize method
  RESPONSE=$(curl -X POST "$URL" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer test-token" \
    -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}' \
    -s -w "\nHTTP_STATUS:%{http_code}" \
    --max-time 5)
  
  HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
  BODY=$(echo "$RESPONSE" | grep -v "HTTP_STATUS:")
  
  echo "HTTP Status: $HTTP_STATUS"
  
  if [ "$HTTP_STATUS" = "200" ]; then
    # Check if it's valid JSON-RPC response
    if echo "$BODY" | jq -e '.result.protocolVersion' > /dev/null 2>&1; then
      echo "✅ Valid MCP endpoint!"
      echo "Protocol Version: $(echo "$BODY" | jq -r '.result.protocolVersion')"
      echo "Server Name: $(echo "$BODY" | jq -r '.result.serverInfo.name')"
      
      # Test tools/list
      TOOLS_RESPONSE=$(curl -X POST "$URL" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer test-token" \
        -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' \
        -s --max-time 5)
      
      TOOLS_COUNT=$(echo "$TOOLS_RESPONSE" | jq -r '.result.tools | length' 2>/dev/null)
      if [ -n "$TOOLS_COUNT" ] && [ "$TOOLS_COUNT" -gt 0 ]; then
        echo "Tools available: $TOOLS_COUNT"
        echo ""
        echo "🎉 THIS IS THE CORRECT URL FOR CLAUDE DESKTOP: $URL"
      fi
    else
      echo "❌ Not a valid MCP response"
    fi
  else
    echo "❌ Failed (HTTP $HTTP_STATUS)"
  fi
done

echo ""
echo "========================="
echo "Recommended Claude Desktop config:"
echo ""
echo '"STEPhie": {'
echo '  "command": "npx",'
echo '  "args": ['
echo '    "-y",'
echo '    "mcp-remote",'
echo '    "UPDATE_WITH_WORKING_URL_FROM_ABOVE"'
echo '  ],'
echo '  "env": {'
echo '    "STEPHIE_AUTH_TOKEN": "your-token-here"'
echo '  }'
echo '}'