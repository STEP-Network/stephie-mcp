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

// Tool definitions
const TOOL_DEFINITIONS = [
  {
    name: 'getAllPublishers',
    description: 'Get all Live publishers/sites from Monday.com Publishers board. Returns all 126 Live publishers/sites with essential information: Publisher/Site name, GAM Ad Unit ID, Vertical, Publisher Group, and Approval status (Gambling/Finance). Results are sorted by Vertical, then alphabetically by name.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'getPublisherFormats',
    description: 'Get publishers/sites and their available ad formats',
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
    description: 'Find publishers/sites supporting specific ad formats on specific devices',
    inputSchema: {
      type: 'object',
      properties: {
        // Display formats - specify device
        topscroll: { type: 'string', enum: ['Desktop', 'Mobile', 'App', 'All'] },
        topscrollExpand: { type: 'string', enum: ['Desktop', 'Mobile', 'App', 'All'] },
        topscrollHighimpact: { type: 'string', enum: ['Desktop', 'Mobile', 'App', 'All'] },
        midscroll: { type: 'string', enum: ['Desktop', 'Mobile', 'App', 'All'] },
        doubleMidscroll: { type: 'string', enum: ['Desktop', 'Mobile', 'App', 'All'] },
        midscrollHighimpact: { type: 'string', enum: ['Desktop', 'Mobile', 'App', 'All'] },
        wallpaper: { type: 'string', enum: ['Desktop', 'Mobile', 'App', 'All'] },
        anchor: { type: 'string', enum: ['Desktop', 'Mobile', 'App', 'All'] },
        interstitial: { type: 'string', enum: ['Desktop', 'Mobile', 'App', 'All'] },
        trueNative: { type: 'string', enum: ['Desktop', 'Mobile', 'App', 'All'] },
        adnamiNative: { type: 'string', enum: ['Desktop', 'Mobile', 'App', 'All'] },
        // Video formats - specify device
        outstream: { type: 'string', enum: ['Desktop', 'Mobile', 'App', 'All'] },
        video: { type: 'string', enum: ['Desktop', 'Mobile', 'App', 'All'] },
        vertikalVideo: { type: 'string', enum: ['Desktop', 'Mobile', 'App', 'All'] },
        // Status formats - boolean
        videoPlayback: { type: 'boolean' },
        ott: { type: 'boolean' },
        reAd: { type: 'boolean' },
        includeInactive: { type: 'boolean', default: false }
      }
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

// SSE handler for mcp-remote
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // For SSE, we need to handle both GET (initial connection) and POST (messages)
  if (req.method === 'GET') {
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    // Send initial connection event
    res.write(`data: ${JSON.stringify({
      jsonrpc: '2.0',
      method: 'connection.ready',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {},
        },
        serverInfo: {
          name: 'STEPhie',
          version: '1.0.0',
        },
      }
    })}\n\n`);

    // Keep connection alive
    const keepAlive = setInterval(() => {
      res.write(': keepalive\n\n');
    }, 30000);

    // Clean up on close
    req.on('close', () => {
      clearInterval(keepAlive);
    });

    return;
  }

  if (req.method === 'POST') {
    // Set SSE headers for response
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      const { method, params, id } = req.body;

      let response: any;

      if (method === 'initialize') {
        response = {
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
        };
      } else if (method === 'tools/list') {
        response = {
          jsonrpc: '2.0',
          id,
          result: {
            tools: TOOL_DEFINITIONS,
          },
        };
      } else if (method === 'tools/call') {
        const { name, arguments: args } = params;
        const handler = toolHandlers[name];
        
        if (!handler) {
          response = {
            jsonrpc: '2.0',
            id,
            error: {
              code: -32601,
              message: `Tool not found: ${name}`,
            },
          };
        } else {
          try {
            const result = await handler(args || {});
            response = {
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
            };
          } catch (error) {
            response = {
              jsonrpc: '2.0',
              id,
              error: {
                code: -32603,
                message: error instanceof Error ? error.message : 'Tool execution failed',
              },
            };
          }
        }
      } else {
        response = {
          jsonrpc: '2.0',
          id,
          error: {
            code: -32601,
            message: `Method not found: ${method}`,
          },
        };
      }

      // Send response as SSE event
      res.write(`data: ${JSON.stringify(response)}\n\n`);
      res.end();
    } catch (error) {
      console.error('SSE handler error:', error);
      const errorResponse = {
        jsonrpc: '2.0',
        id: req.body?.id,
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : 'Internal error',
        },
      };
      res.write(`data: ${JSON.stringify(errorResponse)}\n\n`);
      res.end();
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}