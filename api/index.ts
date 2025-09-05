import { VercelRequest, VercelResponse } from '@vercel/node';
import { AuthValidator } from '../lib/auth/auth-validator.js';
import { 
  MCPRequest, 
  MCPResponse, 
  MCPErrorCodes, 
  MCPTool,
  UserContext 
} from '../lib/types/mcp.js';

// Initialize auth validator
const authValidator = new AuthValidator();

// Tool definitions
const AVAILABLE_TOOLS: MCPTool[] = [
  {
    name: 'getAllPublishers',
    description: 'Get all publishers from Monday.com with their details',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { 
          type: 'number', 
          description: 'Maximum number of publishers to return',
          default: 100 
        },
        searchTerm: { 
          type: 'string', 
          description: 'Search term to filter publishers' 
        },
        active: {
          type: 'boolean',
          description: 'Filter by active status'
        }
      }
    }
  },
  {
    name: 'getPublisherFormats',
    description: 'Get available ad formats for specific publishers',
    inputSchema: {
      type: 'object',
      properties: {
        publisherNames: { 
          type: 'array',
          items: { type: 'string' },
          description: 'List of publisher names'
        }
      },
      required: ['publisherNames']
    }
  },
  {
    name: 'getPublishersByFormats',
    description: 'Find publishers that support specific ad formats',
    inputSchema: {
      type: 'object',
      properties: {
        formats: { 
          type: 'array',
          items: { type: 'string' },
          description: 'List of ad format names'
        },
        includeInactive: {
          type: 'boolean',
          description: 'Include inactive publishers',
          default: false
        }
      },
      required: ['formats']
    }
  },
  {
    name: 'getAllProducts',
    description: 'Get all available ad products',
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Filter by product category'
        }
      }
    }
  },
  {
    name: 'getAllFormats',
    description: 'Get all available ad formats with specifications',
    inputSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          description: 'Filter by format type (display, video, etc.)'
        }
      }
    }
  },
  {
    name: 'getAllSizes',
    description: 'Get all available ad sizes',
    inputSchema: {
      type: 'object',
      properties: {
        minWidth: {
          type: 'number',
          description: 'Minimum width in pixels'
        },
        minHeight: {
          type: 'number',
          description: 'Minimum height in pixels'
        }
      }
    }
  },
  {
    name: 'getAllAdPrices',
    description: 'Get ad pricing information',
    inputSchema: {
      type: 'object',
      properties: {
        format: {
          type: 'string',
          description: 'Filter by ad format'
        },
        publisher: {
          type: 'string',
          description: 'Filter by publisher'
        }
      }
    }
  },
  {
    name: 'findPublisherAdUnits',
    description: 'Find ad units for specific publishers',
    inputSchema: {
      type: 'object',
      properties: {
        publisherNames: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of publisher names'
        },
        format: {
          type: 'string',
          description: 'Filter by ad format'
        }
      },
      required: ['publisherNames']
    }
  },
  {
    name: 'getAdUnits',
    description: 'Get ad unit details',
    inputSchema: {
      type: 'object',
      properties: {
        adUnitIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of ad unit IDs'
        },
        includeTargeting: {
          type: 'boolean',
          description: 'Include targeting information',
          default: false
        }
      }
    }
  },
  {
    name: 'availabilityForecast',
    description: 'Get Google Ad Manager availability forecast',
    inputSchema: {
      type: 'object',
      properties: {
        startDate: { 
          type: 'string', 
          description: 'Start date (YYYY-MM-DD)' 
        },
        endDate: { 
          type: 'string', 
          description: 'End date (YYYY-MM-DD)' 
        },
        adUnitIds: { 
          type: 'array',
          items: { type: 'string' },
          description: 'List of GAM ad unit IDs'
        },
        targeting: { 
          type: 'object',
          description: 'Targeting criteria',
          properties: {
            geoTargets: { type: 'array' },
            deviceCategories: { type: 'array' },
            keyValues: { type: 'object' }
          }
        }
      },
      required: ['startDate', 'endDate']
    }
  }
];

// CORS headers
const getCorsHeaders = (origin: string | null) => {
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
    'https://ai.stepnetwork.dk',
    'https://mcp.stepnetwork.dk',
    'http://localhost:3000',
    'http://localhost:3001'
  ];
  
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (origin && allowedOrigins.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }

  return headers;
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const corsHeaders = getCorsHeaders(req.headers.origin as string);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).setHeader('Content-Type', 'text/plain');
    Object.entries(corsHeaders).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    res.end();
    return;
  }

  // Only allow POST
  if (req.method !== 'POST') {
    res.status(405).json({
      jsonrpc: '2.0',
      error: {
        code: MCPErrorCodes.INVALID_REQUEST,
        message: 'Method not allowed'
      }
    });
    return;
  }

  // Set CORS headers for response
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  let userContext: UserContext | null = null;
  let request: MCPRequest;

  try {
    request = req.body as MCPRequest;
  } catch (error) {
    res.status(400).json({
      jsonrpc: '2.0',
      error: {
        code: MCPErrorCodes.PARSE_ERROR,
        message: 'Invalid JSON'
      }
    });
    return;
  }

  // Handle different MCP methods
  try {
    let result: any;

    switch (request.method) {
      case 'initialize':
        // Validate authentication token
        const token = request.params?.authToken || 
                     req.headers.authorization?.replace('Bearer ', '');

        if (!token) {
          res.status(401).json({
            jsonrpc: '2.0',
            id: request.id,
            error: {
              code: MCPErrorCodes.AUTHENTICATION_REQUIRED,
              message: 'Authentication token required. Get your token from https://ai.stepnetwork.dk/api-keys'
            }
          });
          return;
        }

        const validation = await authValidator.validateToken(token);
        
        if (!validation.valid) {
          res.status(401).json({
            jsonrpc: '2.0',
            id: request.id,
            error: {
              code: MCPErrorCodes.INVALID_TOKEN,
              message: validation.error || 'Invalid authentication token'
            }
          });
          return;
        }

        // Get user permissions
        const permissions = await authValidator.getUserPermissions(validation.userId!);
        
        userContext = {
          userId: validation.userId!,
          permissions
        };

        result = {
          protocolVersion: '0.1.0',
          capabilities: {
            tools: {
              listChanged: true,
            },
            prompts: {},
            resources: {},
          },
          serverInfo: {
            name: process.env.MCP_SERVER_NAME || 'stephie-mcp',
            version: process.env.MCP_SERVER_VERSION || '1.0.0',
          },
          user: {
            id: userContext.userId,
            permissions: userContext.permissions
          }
        };
        break;

      case 'tools/list':
        // Check if user is authenticated (simple check via auth header)
        const authToken = req.headers.authorization;
        if (!authToken) {
          result = { tools: [] };
        } else {
          // Filter tools based on permissions if needed
          result = { tools: AVAILABLE_TOOLS };
        }
        break;

      case 'tools/call':
        // Require authentication for tool calls
        const callToken = req.headers.authorization?.replace('Bearer ', '');
        
        if (!callToken) {
          res.status(401).json({
            jsonrpc: '2.0',
            id: request.id,
            error: {
              code: MCPErrorCodes.AUTHENTICATION_REQUIRED,
              message: 'Authentication required for tool execution'
            }
          });
          return;
        }

        const callValidation = await authValidator.validateToken(callToken);
        if (!callValidation.valid) {
          res.status(401).json({
            jsonrpc: '2.0',
            id: request.id,
            error: {
              code: MCPErrorCodes.INVALID_TOKEN,
              message: 'Invalid authentication token'
            }
          });
          return;
        }

        const { name, arguments: args } = request.params;
        
        // Execute tool (this will be implemented with actual tool handlers)
        result = await executeToolHandler(name, args, callValidation.userId!);
        break;

      default:
        res.status(404).json({
          jsonrpc: '2.0',
          id: request.id,
          error: {
            code: MCPErrorCodes.METHOD_NOT_FOUND,
            message: `Method not found: ${request.method}`
          }
        });
        return;
    }

    // Send successful response
    res.status(200).json({
      jsonrpc: '2.0',
      id: request.id,
      result
    } as MCPResponse);

  } catch (error) {
    console.error('MCP handler error:', error);
    res.status(500).json({
      jsonrpc: '2.0',
      id: request.id,
      error: {
        code: MCPErrorCodes.INTERNAL_ERROR,
        message: error instanceof Error ? error.message : 'Internal server error'
      }
    } as MCPResponse);
  }
}

// Tool execution handler (placeholder - will be replaced with actual implementations)
async function executeToolHandler(toolName: string, args: any, userId: string): Promise<any> {
  // This will be replaced with actual tool implementations
  // For now, return mock data
  
  switch (toolName) {
    case 'getAllPublishers':
      return {
        publishers: [
          { id: '1', name: 'Example Publisher', active: true },
          // Mock data - replace with actual Monday.com integration
        ],
        total: 1
      };
      
    case 'availabilityForecast':
      return {
        available: 1000000,
        matched: 950000,
        possible: 900000,
        delivered: 0,
        reserved: 50000
      };
      
    default:
      throw new Error(`Tool not implemented: ${toolName}`);
  }
}