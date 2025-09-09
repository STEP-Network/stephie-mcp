#!/bin/bash

# Batch convert simple tools to JSON output

echo "Converting simple get tools to JSON output..."

# Convert CRM tools
echo "Converting CRM tools..."
for file in /Users/naref/Documents/Code/stephie-mcp/lib/tools/crm/*.ts; do
  if [[ "$file" == *"getAccounts.ts" ]]; then
    echo "  Skipping getAccounts.ts (already converted)"
    continue
  fi
  
  if grep -q "lines.push\|lines.join" "$file" 2>/dev/null; then
    echo "  Converting $(basename $file)..."
    
    # Add import
    sed -i '' '1a\
import { createListResponse, createErrorResponse, createSuccessResponse, formatMondayItem } from "../json-output.js";
' "$file"
    
    # Replace markdown formatting section with JSON
    sed -i '' '/\/\/ Format response as markdown/,/return lines\.join("\\n");/{
      s/.*/\t\t\/\/ Format items for JSON response\
\t\tconst formattedItems = items.map((item: any) => formatMondayItem(item));\
\
\t\treturn JSON.stringify(\
\t\t\tcreateListResponse(\
\t\t\t\t"'$(basename "$file" .ts)'",\
\t\t\t\tformattedItems,\
\t\t\t\t{ boardId: board.id, boardName: board.name, ...params }\
\t\t\t),\
\t\t\tnull,\
\t\t\t2\
\t\t);/
      q
    }' "$file"
  fi
done

# Convert sales tools
echo "Converting sales tools..."
for file in /Users/naref/Documents/Code/stephie-mcp/lib/tools/sales/*.ts; do
  if grep -q "lines.push\|lines.join" "$file" 2>/dev/null; then
    echo "  Converting $(basename $file)..."
    
    # Add import if not present
    if ! grep -q "json-output" "$file"; then
      sed -i '' '1a\
import { createListResponse, createErrorResponse, createSuccessResponse, formatMondayItem } from "../json-output.js";
' "$file"
    fi
    
    # Replace markdown formatting
    sed -i '' '/\/\/ Format response as markdown/,/return lines\.join("\\n");/{
      s/.*/\t\t\/\/ Format items for JSON response\
\t\tconst formattedItems = items.map((item: any) => formatMondayItem(item));\
\
\t\treturn JSON.stringify(\
\t\t\tcreateListResponse(\
\t\t\t\t"'$(basename "$file" .ts)'",\
\t\t\t\tformattedItems,\
\t\t\t\t{ boardId: board.id, boardName: board.name, ...params }\
\t\t\t),\
\t\t\tnull,\
\t\t\t2\
\t\t);/
      q
    }' "$file"
  fi
done

echo "Conversion complete!"