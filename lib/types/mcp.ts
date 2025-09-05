export interface MCPRequest {
  jsonrpc: '2.0';
  id?: string | number;
  method: string;
  params?: any;
}

export interface MCPResponse {
  jsonrpc: '2.0';
  id?: string | number;
  result?: any;
  error?: MCPError;
}

export interface MCPError {
  code: number;
  message: string;
  data?: any;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface UserContext {
  userId: string;
  permissions: {
    canUsePublisherTools: boolean;
    canUseForecastTools: boolean;
    canUseMemoryTools: boolean;
    rateLimit: number;
  };
}

export const MCPErrorCodes = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  
  // Custom error codes
  AUTHENTICATION_REQUIRED: -32001,
  INVALID_TOKEN: -32002,
  PERMISSION_DENIED: -32003,
  RATE_LIMIT_EXCEEDED: -32004,
} as const;