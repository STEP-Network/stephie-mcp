/**
 * Universal JSON converter for all tool outputs
 * This wrapper can be used to convert any markdown output to JSON
 */

import { createToolResponse, createListResponse, createErrorResponse, createSuccessResponse } from "./json-output.js";

/**
 * Convert markdown tool output to JSON
 * This is a temporary wrapper that can be used until all tools are properly converted
 */
export function convertMarkdownToJSON(toolName: string, markdownOutput: string): string {
  try {
    // Parse common markdown patterns
    const lines = markdownOutput.split('\n');
    
    // Try to detect the type of response
    if (markdownOutput.includes('Error:') || markdownOutput.includes('# Error')) {
      // Error response
      const errorMatch = markdownOutput.match(/\*\*Error:\*\* (.+)|Error: (.+)/);
      const errorMessage = errorMatch ? (errorMatch[1] || errorMatch[2]) : 'Unknown error';
      return JSON.stringify(createErrorResponse(toolName, errorMessage), null, 2);
    }
    
    if (markdownOutput.includes('Successfully created') || markdownOutput.includes('Successfully updated')) {
      // Success response for create/update
      const operation = markdownOutput.includes('created') ? 'created' : 'updated';
      const nameMatch = markdownOutput.match(/Successfully \w+ (.+)/);
      const idMatch = markdownOutput.match(/ID: (\d+)/);
      
      return JSON.stringify(
        createSuccessResponse(
          toolName,
          operation,
          {
            id: idMatch ? idMatch[1] : 'unknown',
            name: nameMatch ? nameMatch[1] : 'item'
          }
        ),
        null,
        2
      );
    }
    
    // Try to parse as a list response
    const items: any[] = [];
    let currentItem: any = null;
    let metadata: any = {};
    
    for (const line of lines) {
      // Parse headers for metadata
      if (line.startsWith('# ')) {
        metadata.title = line.substring(2);
      }
      
      // Parse total count
      const totalMatch = line.match(/\*\*Total (?:Items?|Results?):\*\* (\d+)/);
      if (totalMatch) {
        metadata.total = parseInt(totalMatch[1]);
      }
      
      // Parse filters
      if (line.includes('**Filter:**')) {
        if (!metadata.filters) metadata.filters = [];
        metadata.filters.push(line.replace('**Filter:** ', '').trim());
      }
      
      // Parse item headers
      if (line.startsWith('## ')) {
        if (currentItem) {
          items.push(currentItem);
        }
        currentItem = {
          name: line.substring(3).trim()
        };
      }
      
      // Parse item properties
      if (currentItem && line.startsWith('- **')) {
        const propMatch = line.match(/- \*\*(.+?):\*\* (.+)/);
        if (propMatch) {
          const key = propMatch[1].toLowerCase().replace(/\s+/g, '_');
          currentItem[key] = propMatch[2];
        }
      }
      
      // Parse table rows (for formats, placements, etc.)
      if (line.startsWith('| ') && !line.includes('---')) {
        const cells = line.split('|').map(c => c.trim()).filter(c => c);
        if (cells.length >= 2 && !cells[0].includes('**')) {
          items.push({
            name: cells[0],
            value: cells[1],
            ...(cells[2] && { additional: cells[2] })
          });
        }
      }
    }
    
    // Add last item if exists
    if (currentItem) {
      items.push(currentItem);
    }
    
    // If we found items, return as list response
    if (items.length > 0 || metadata.total !== undefined) {
      return JSON.stringify(
        createListResponse(toolName, items, metadata),
        null,
        2
      );
    }
    
    // Default: return as generic tool response with markdown in data field
    return JSON.stringify(
      createToolResponse(
        toolName,
        { markdown: markdownOutput },
        metadata,
        { summary: 'Markdown content converted to JSON' }
      ),
      null,
      2
    );
    
  } catch (error) {
    console.error(`Error converting markdown to JSON for ${toolName}:`, error);
    // Fallback: return the markdown wrapped in JSON
    return JSON.stringify(
      createToolResponse(
        toolName,
        { markdown: markdownOutput },
        {},
        { summary: 'Raw markdown output' }
      ),
      null,
      2
    );
  }
}

/**
 * Wrapper function to convert any tool's markdown output to JSON
 * Use this in server.ts for tools that haven't been converted yet
 */
export async function wrapToolWithJSON<T extends (...args: any[]) => Promise<string>>(
  toolName: string,
  toolFunction: T,
  ...args: Parameters<T>
): Promise<string> {
  try {
    const markdownResult = await toolFunction(...args);
    
    // Check if it's already JSON
    try {
      JSON.parse(markdownResult);
      return markdownResult; // Already JSON
    } catch {
      // Not JSON, convert from markdown
      return convertMarkdownToJSON(toolName, markdownResult);
    }
  } catch (error) {
    return JSON.stringify(
      createErrorResponse(toolName, error instanceof Error ? error.message : String(error)),
      null,
      2
    );
  }
}