/**
 * JSON Output Helper for MCP Tools
 * Provides consistent JSON structure for all tool responses
 */

export interface ToolResponse {
  tool: string;
  timestamp: string;
  metadata: {
    total?: number;
    filtered?: number;
    page?: number;
    limit?: number;
    search?: string;
    filters?: Record<string, any>;
    [key: string]: any;
  };
  data: any;
  error?: string;
  warnings?: string[];
  summary?: string;
}

export interface ListItem {
  id: string;
  name: string;
  [key: string]: any;
}

export interface DetailedItem extends ListItem {
  description?: string;
  status?: string | number;
  priority?: string | number;
  assignees?: string[];
  created?: string;
  updated?: string;
  customFields?: Record<string, any>;
}

/**
 * Create a standardized JSON response for tools
 */
export function createToolResponse(
  tool: string,
  data: any,
  metadata: Record<string, any> = {},
  options: {
    error?: string;
    warnings?: string[];
    summary?: string;
  } = {}
): ToolResponse {
  return {
    tool,
    timestamp: new Date().toISOString(),
    metadata,
    data,
    ...(options.error && { error: options.error }),
    ...(options.warnings && { warnings: options.warnings }),
    ...(options.summary && { summary: options.summary }),
  };
}

/**
 * Format a list response with consistent structure
 */
export function createListResponse(
  tool: string,
  items: any[],
  metadata: Record<string, any> = {},
  options: {
    summary?: string;
    warnings?: string[];
  } = {}
): ToolResponse {
  const total = items.length;
  
  return createToolResponse(
    tool,
    items,
    {
      total,
      ...metadata,
    },
    {
      summary: options.summary || `Found ${total} item${total !== 1 ? 's' : ''}`,
      warnings: options.warnings,
    }
  );
}

/**
 * Format an error response
 */
export function createErrorResponse(
  tool: string,
  error: string | Error,
  metadata: Record<string, any> = {}
): ToolResponse {
  const errorMessage = error instanceof Error ? error.message : error;
  
  return createToolResponse(
    tool,
    null,
    metadata,
    {
      error: errorMessage,
      summary: `Error: ${errorMessage}`,
    }
  );
}

/**
 * Format a success response for create/update operations
 */
export function createSuccessResponse(
  tool: string,
  operation: 'created' | 'updated' | 'deleted',
  item: any,
  metadata: Record<string, any> = {}
): ToolResponse {
  return createToolResponse(
    tool,
    item,
    {
      operation,
      ...metadata,
    },
    {
      summary: `Successfully ${operation} ${item.name || `item ${item.id}`}`,
    }
  );
}

/**
 * Convert status/dropdown indices to labels if mapping provided
 */
export function mapStatusToLabel(
  value: number | string | undefined | null,
  mapping: Record<number | string, string>
): string | undefined {
  if (value === undefined || value === null) return undefined;
  return mapping[value] || String(value);
}

/**
 * Parse column values from Monday.com items
 */
export function parseColumnValue(column: any): any {
  if (!column) return null;
  
  // Handle different column types
  switch (column.type) {
    case 'text':
    case 'long-text':
      return column.text || column.value || '';
    
    case 'numeric':
    case 'numbers':
      return column.value ? parseFloat(column.value) : null;
    
    case 'status':
    case 'dropdown':
      return column.index !== undefined ? column.index : column.text;
    
    case 'date':
      return column.date || column.text || null;
    
    case 'multiple-person':
      return column.personsAndTeams?.map((p: any) => ({
        id: p.id,
        name: p.name,
        kind: p.kind,
      })) || [];
    
    case 'board-relation':
      return column.linkedItems?.map((item: any) => ({
        id: item.id,
        name: item.name,
      })) || [];
    
    case 'email':
      return column.email || column.text || null;
    
    case 'phone':
      return column.phone || column.text || null;
    
    case 'link':
      return column.url || column.text || null;
    
    default:
      // Try to parse JSON value
      if (column.value) {
        try {
          return JSON.parse(column.value);
        } catch {
          return column.value;
        }
      }
      return column.text || null;
  }
}

/**
 * Extract and format Monday.com item data
 */
export function formatMondayItem(item: any, columnMappings?: Record<string, string>): DetailedItem {
  const formatted: DetailedItem = {
    id: item.id,
    name: item.name,
    created: item.created_at,
    updated: item.updated_at,
    customFields: {},
  };
  
  // Process column values
  if (item.column_values) {
    for (const column of item.column_values) {
      const fieldName = columnMappings?.[column.id] || column.id;
      formatted.customFields![fieldName] = parseColumnValue(column);
    }
  }
  
  return formatted;
}