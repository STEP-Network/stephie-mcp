import { VercelRequest, VercelResponse } from '@vercel/node';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import * as dotenv from 'dotenv';

// Import all tools
import { getAllPublishers } from '../lib/tools/getAllPublishers.js';
import { getPublisherFormats } from '../lib/tools/getPublisherFormats.js';
import { getPublishersByFormats } from '../lib/tools/getPublishersByFormats.js';
import { findPublisherAdUnits } from '../lib/tools/findPublisherAdUnits.js';
import { getKeyValues } from '../lib/tools/getKeyValues.js';
import { getAudienceSegments } from '../lib/tools/getAudienceSegments.js';
import { getAllPlacements } from '../lib/tools/getAllPlacements.js';
import { getGeoLocations } from '../lib/tools/getGeoLocations.js';
import { getContextualTargeting } from '../lib/tools/getContextualTargeting.js';
import { getAllProducts } from '../lib/tools/getAllProducts.js';
import { getAllFormats } from '../lib/tools/getAllFormats.js';
import { getAllSizes } from '../lib/tools/getAllSizes.js';
import { getAllAdPrices } from '../lib/tools/getAllAdPrices.js';
import { availabilityForecast } from '../lib/tools/availabilityForecast.js';
import { listAllBoards } from '../lib/tools/debug/listBoards.js';
import { getBoardColumns } from '../lib/tools/debug/getBoardColumns.js';
import { getItems } from '../lib/tools/debug/getItems.js';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Create MCP server instance
const server = new Server(
  {
    name: 'STEPhie',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool definitions with all our tools
const TOOL_DEFINITIONS = [
  {
    name: 'getAllPublishers',
    description: 'Get all publishers from Monday.com with details',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', default: 100 },
        searchTerm: { type: 'string' },
        active: { type: 'boolean' }
      }
    }
  },
  {
    name: 'getPublisherFormats',
    description: 'Get publishers and their available ad formats',
    inputSchema: {
      type: 'object',
      properties: {
        publisherName: { type: 'string' },
        publisherGroupName: { type: 'string' },
        limit: { type: 'number', default: 100 }
      }
    }
  },
  {
    name: 'getPublishersByFormats',
    description: 'Find publishers supporting specific ad formats',
    inputSchema: {
      type: 'object',
      properties: {
        formats: { type: 'array', items: { type: 'string' } },
        includeInactive: { type: 'boolean', default: false }
      },
      required: ['formats']
    }
  },
  {
    name: 'findPublisherAdUnits',
    description: 'Find ad units for publishers with full hierarchy',
    inputSchema: {
      type: 'object',
      properties: {
        names: { type: 'array', items: { type: 'string' } }
      },
      required: ['names']
    }
  },
  {
    name: 'getKeyValues',
    description: 'Get GAM custom targeting key-values',
    inputSchema: {
      type: 'object',
      properties: {
        keySearch: { type: 'string' },
        valueSearch: { type: 'string' },
        limit: { type: 'number', default: 50 },
        valueLimit: { type: 'number', default: 50 },
        totalValueLimit: { type: 'number', default: 500 }
      }
    }
  },
  {
    name: 'getAudienceSegments',
    description: 'Get demographic/behavioral audience segments',
    inputSchema: {
      type: 'object',
      properties: {
        search: { type: 'string' },
        limit: { type: 'number', default: 100 }
      }
    }
  },
  {
    name: 'getAllPlacements',
    description: 'Get GAM placements and verticals',
    inputSchema: {
      type: 'object',
      properties: {
        includeIds: { type: 'boolean', default: false }
      }
    }
  },
  {
    name: 'getGeoLocations',
    description: 'Search geographic locations for targeting',
    inputSchema: {
      type: 'object',
      properties: {
        search: { type: 'array', items: { type: 'string' } },
        type: { type: 'string', enum: ['city', 'region', 'postal', 'all'] },
        limit: { type: 'number', default: 10 }
      }
    }
  },
  {
    name: 'getContextualTargeting',
    description: 'Get Neuwo contextual categories from GAM',
    inputSchema: {
      type: 'object',
      properties: {
        search: { type: 'string' },
        limit: { type: 'number', default: 100 }
      }
    }
  },
  {
    name: 'getAllProducts',
    description: 'Get all ad products',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'getAllFormats',
    description: 'Get all ad format specifications',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'getAllSizes',
    description: 'Get all ad sizes with benchmarks',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'getAllAdPrices',
    description: 'Get ad pricing in DKK',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'availabilityForecast',
    description: 'Google Ad Manager availability forecast',
    inputSchema: {
      type: 'object',
      properties: {
        startDate: { type: 'string' },
        endDate: { type: 'string' },
        sizes: { type: 'array', items: { type: 'array', items: { type: 'number' } } },
        goalQuantity: { type: 'number' },
        targetedAdUnitIds: { type: 'array', items: { type: 'number' } },
        excludedAdUnitIds: { type: 'array', items: { type: 'number' } },
        audienceSegmentIds: { type: 'array', items: { type: 'string' } },
        customTargeting: { type: 'array' },
        frequencyCapMaxImpressions: { type: 'number' },
        frequencyCapTimeUnit: { type: 'string' },
        geoTargeting: { type: 'object' },
        targetedPlacementIds: { type: 'array', items: { type: 'string' } }
      },
      required: ['startDate', 'endDate', 'sizes']
    }
  },
  {
    name: 'listBoards',
    description: 'List all Monday.com boards',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'getBoardColumns',
    description: 'Get column structure for a board',
    inputSchema: {
      type: 'object',
      properties: {
        boardId: { type: 'string' }
      },
      required: ['boardId']
    }
  },
  {
    name: 'getItems',
    description: 'Get items from a Monday.com board',
    inputSchema: {
      type: 'object',
      properties: {
        boardId: { type: 'string' },
        limit: { type: 'number', default: 100 },
        columnIds: { type: 'array', items: { type: 'string' } }
      },
      required: ['boardId']
    }
  }
];

// Tool handlers
const toolHandlers: Record<string, (args: any) => Promise<any>> = {
  getAllPublishers,
  getPublisherFormats,
  getPublishersByFormats,
  findPublisherAdUnits,
  getKeyValues,
  getAudienceSegments,
  getAllPlacements,
  getGeoLocations,
  getContextualTargeting,
  getAllProducts,
  getAllFormats,
  getAllSizes,
  getAllAdPrices,
  availabilityForecast,
  listBoards: listAllBoards,
  getBoardColumns,
  getItems,
};

// Register tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: TOOL_DEFINITIONS,
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  const handler = toolHandlers[name];
  if (!handler) {
    throw new McpError(
      ErrorCode.MethodNotFound,
      `Tool not found: ${name}`
    );
  }

  try {
    const result = await handler(args || {});
    return {
      content: [
        {
          type: 'text',
          text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    console.error(`Error executing tool ${name}:`, error);
    throw new McpError(
      ErrorCode.InternalError,
      error instanceof Error ? error.message : 'Tool execution failed'
    );
  }
});

// Vercel handler
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { method, params, id } = req.body;

    // Handle different MCP methods
    if (method === 'initialize') {
      return res.json({
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {},
          },
          serverInfo: {
            name: 'STEPhie',
            version: '1.0.0',
          },
        },
      });
    }

    if (method === 'tools/list') {
      return res.json({
        jsonrpc: '2.0',
        id,
        result: {
          tools: TOOL_DEFINITIONS,
        },
      });
    }

    if (method === 'tools/call') {
      const { name, arguments: args } = params;
      const handler = toolHandlers[name];
      
      if (!handler) {
        return res.status(404).json({
          jsonrpc: '2.0',
          id,
          error: {
            code: -32601,
            message: `Tool not found: ${name}`,
          },
        });
      }

      const result = await handler(args || {});
      return res.json({
        jsonrpc: '2.0',
        id,
        result: {
          content: [
            {
              type: 'text',
              text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
            },
          ],
        },
      });
    }

    return res.status(404).json({
      jsonrpc: '2.0',
      id,
      error: {
        code: -32601,
        message: `Method not found: ${method}`,
      },
    });
  } catch (error) {
    console.error('MCP handler error:', error);
    return res.status(500).json({
      jsonrpc: '2.0',
      id: req.body?.id,
      error: {
        code: -32603,
        message: error instanceof Error ? error.message : 'Internal error',
      },
    });
  }
}