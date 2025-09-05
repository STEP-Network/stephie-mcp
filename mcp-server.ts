#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import * as dotenv from 'dotenv';
import { AuthValidator } from './lib/auth/auth-validator.js';
import { getAllPublishers } from './lib/tools/getAllPublishers.js';
import { getPublisherFormats } from './lib/tools/getPublisherFormats.js';
import { getPublishersByFormats } from './lib/tools/getPublishersByFormats.js';
import { availabilityForecast } from './lib/tools/availabilityForecast.js';
import { listAllBoards } from './lib/tools/debug/listBoards.js';
import { getBoardColumns } from './lib/tools/debug/getBoardColumns.js';
import { getItems } from './lib/tools/debug/getItems.js';
import { getKeyValues } from './lib/tools/getKeyValues.js';
import { getAudienceSegments } from './lib/tools/getAudienceSegments.js';
import { getAllProducts } from './lib/tools/getAllProducts.js';
import { getAllFormats } from './lib/tools/getAllFormats.js';
import { getAllSizes } from './lib/tools/getAllSizes.js';
import { getAllAdPrices } from './lib/tools/getAllAdPrices.js';
import { findPublisherAdUnits } from './lib/tools/findPublisherAdUnits.js';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Initialize auth validator
const authValidator = new AuthValidator();

// Tool definitions
const AVAILABLE_TOOLS = [
  {
    name: 'getAllPublishers',
    description: 'Get all publishers from Monday.com Publishers board (1222800432) with basic information: name, website, description, status, vertical, publisher group, and approval status. For format information use getPublisherFormats or getPublishersByFormats.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { 
          type: 'number', 
          description: 'Maximum number of publishers to return (default: 100)',
          default: 100 
        },
        searchTerm: { 
          type: 'string', 
          description: 'Search term to filter publishers by name (partial match)' 
        },
        active: {
          type: 'boolean',
          description: 'Filter by active status (true for active only, false for inactive only, omit for all)'
        }
      }
    }
  },
  {
    name: 'getPublisherFormats',
    description: 'Get detailed matrix of publishers and their available ad formats grouped by device type. Shows ONLY ACTIVE formats per publisher - if a format is not listed, the publisher does NOT support it. Device abbreviations: M=Mobile, D=Desktop, A=App. Useful for finding which publishers support specific format combinations.',
    inputSchema: {
      type: 'object',
      properties: {
        publisherName: { 
          type: 'string',
          description: 'Filter by publisher name (partial match, case-insensitive)'
        },
        publisherGroupName: {
          type: 'string',
          description: 'Filter by publisher group name (e.g., "JyskFynske", "Berlingske")'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of publishers to return (1-500, default: 100)',
          default: 100
        }
      }
    }
  },
  {
    name: 'getPublishersByFormats',
    description: 'Find all publishers that support specific ad format combinations. Use this to identify which publishers can run your desired ad formats. Returns publishers grouped by how many of the requested formats they support.',
    inputSchema: {
      type: 'object',
      properties: {
        formats: { 
          type: 'array',
          items: { type: 'string' },
          description: 'List of ad format names to search for (e.g., ["Topscroll", "Billboard", "Mobile"]). Publishers are returned if they support ANY of these formats.'
        },
        includeInactive: {
          type: 'boolean',
          description: 'Include inactive/disabled publishers in results (default: false)',
          default: false
        }
      },
      required: ['formats']
    }
  },
  {
    name: 'getAllProducts',
    description: 'Get all ad products and product groups from Monday.com boards (Produktgrupper: 1611223368, Produkt: 1983692701). Shows product hierarchy with associated formats and ad unit sizes. Product groups contain multiple products (e.g., Display group contains Standard, High Impact products).',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of items to return from each board (default: 100)',
          default: 100
        }
      }
    }
  },
  {
    name: 'getAllFormats',
    description: 'Get all ad format specifications from Monday.com Formater board (1983719743). Returns formats grouped by device type (Desktop, Mobile, etc.) with their sizes, supported products, and descriptions. Essential for understanding available ad inventory.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of formats to return (default: 100)',
          default: 100
        }
      }
    }
  },
  {
    name: 'availabilityForecast',
    description: 'Get Google Ad Manager (GAM) availability forecast for ad inventory. Checks available impressions for specified date ranges and targeting criteria. Essential for campaign planning and inventory availability checks.',
    inputSchema: {
      type: 'object',
      properties: {
        startDate: { 
          type: 'string', 
          description: 'Campaign start date in YYYY-MM-DD format (e.g., "2024-12-01")' 
        },
        endDate: { 
          type: 'string', 
          description: 'Campaign end date in YYYY-MM-DD format (e.g., "2024-12-31")' 
        },
        adUnitIds: { 
          type: 'array',
          items: { type: 'string' },
          description: 'List of Google Ad Manager ad unit IDs to check inventory for'
        },
        targeting: { 
          type: 'object',
          description: 'Optional targeting criteria to refine the forecast',
          properties: {
            geoTargets: { 
              type: 'array',
              description: 'Geographic targeting (country/city codes)'
            },
            deviceCategories: { 
              type: 'array',
              description: 'Device types (DESKTOP, MOBILE, TABLET)'
            },
            keyValues: { 
              type: 'object',
              description: 'Custom key-value targeting pairs'
            }
          }
        }
      },
      required: ['startDate', 'endDate']
    }
  },
  {
    name: 'getKeyValues',
    description: 'Get custom targeting KEY-VALUES from Monday.com (board: 1802371471) for CONTENT-based targeting in GAM. Use two-step process: STEP 1: Search for keys without values. STEP 2: Get specific key values using GAM IDs. Supports both PREDEFINED and FREEFORM keys. NOT for audience/demographic targeting - use getAudienceSegments instead.',
    inputSchema: {
      type: 'object',
      properties: {
        search: {
          type: ['string', 'array'],
          description: 'Search for KEY names (not values). Examples: "ingredients" for recipe targeting, "category" for content categories, "sport" for sports content'
        },
        type: {
          type: 'string',
          enum: ['PREDEFINED', 'FREEFORM', 'ALL'],
          description: 'Filter by key type. PREDEFINED = fixed value lists, FREEFORM = any text value, ALL = both types (default: ALL)',
          default: 'ALL'
        },
        includeValues: {
          type: 'boolean',
          description: 'Include values for each key. WARNING: Slow for large datasets, use sparingly (default: false)',
          default: false
        },
        gamIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Specific GAM key IDs to fetch (use after finding keys in step 1)'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of keys to return (default: 50)',
          default: 50
        },
        valueLimit: {
          type: 'number',
          description: 'Maximum number of values per key when includeValues=true (default: 50)',
          default: 50
        }
      }
    }
  },
  {
    name: 'getAudienceSegments',
    description: 'Get audience segments from Monday.com (board: 2051827669) for DEMOGRAPHIC and BEHAVIORAL targeting. Includes 1st party data, 3rd party providers (Omniseg), and contextual segments. Shows segment sizes and providers. NOT for content targeting - use getKeyValues for that.',
    inputSchema: {
      type: 'object',
      properties: {
        search: {
          type: ['string', 'array'],
          description: 'Search terms to find in segment name or description (e.g., "female", "sports fans", "high income")'
        },
        type: {
          type: 'string',
          enum: ['1st Party', '3rd Party', 'Contextual', 'Omniseg', 'ALL'],
          description: 'Filter by segment type. 1st Party = STEP\'s own data, 3rd Party = external providers, Omniseg = behavioral data, Contextual = content-based (default: ALL)',
          default: 'ALL'
        },
        minSize: {
          type: 'number',
          description: 'Minimum audience size in number of users (filters out small segments)'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of segments to return (default: 20)',
          default: 20
        }
      }
    }
  },
  {
    name: 'getAllSizes',
    description: 'Get all ad unit sizes from Monday.com (board: 1558597958) with descriptions, benchmarks, formats, and device types. Can filter by device (Desktop/Mobile/Tablet/App). Shows CTR, viewability, and eAPM benchmarks.',
    inputSchema: {
      type: 'object',
      properties: {
        device: {
          type: 'string',
          enum: ['Desktop', 'Mobile', 'Tablet', 'App'],
          description: 'Filter sizes by device type. Omit to get all devices.'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of sizes to return (default: 500)',
          default: 500
        }
      }
    }
  },
  {
    name: 'getAllAdPrices',
    description: 'Get all display and video ad prices from Monday.com (board: 1432155906). Returns pricing in DKK for different products with Brutto CPM, Minimum CPM, Bulk, CPC, and SSP Floorprice. Products may have multiple platform variants.',
    inputSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['display', 'video', 'all'],
          description: 'Filter by ad type: display, video, or all (default: all)',
          default: 'all'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of prices per group (default: 500)',
          default: 500
        }
      }
    }
  },
  {
    name: 'findPublisherAdUnits',
    description: 'Find Publisher Ad Units with complete hierarchy for GAM forecasting. When searching by publisher name (e.g., "jv.dk"), automatically fetches: 1) The parent group (Level 1, e.g., JFM), 2) The publisher(s) (Level 2), and 3) ALL child ad units (Level 3, e.g., billboard_1, mobile_2). Returns all GAM Ad Unit IDs needed for forecasting. Board: 1558569789. Filters by Source (default: Google Ad Manager).',
    inputSchema: {
      type: 'object',
      properties: {
        names: {
          type: 'array',
          items: { type: 'string' },
          description: 'Publisher names or domains to search for (without www/https). Example: ["jv.dk", "berlingske"]. Returns parent group, publisher, and child ad units.'
        },
        verticals: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['News', 'Sport', 'Auto', 'Pets', 'Food & Lifestyle', 'Home & Garden', 'Gaming & Tech']
          },
          description: 'Filter by verticals. Example: ["News", "Sport"]'
        },
        source: {
          type: 'string',
          enum: ['Google Ad Manager', 'Adform'],
          description: 'Filter by ad source system (default: Google Ad Manager)',
          default: 'Google Ad Manager'
        },
        countOnly: {
          type: 'boolean',
          description: 'Return only the count of items, not the full data (default: false)',
          default: false
        }
      }
    }
  }
];

// Tool execution handler
async function executeToolHandler(toolName: string, args: any): Promise<any> {
  // Get auth token from environment
  const token = process.env.STEPHIE_AUTH_TOKEN;
  
  if (!token) {
    throw new Error('Authentication required. Set STEPHIE_AUTH_TOKEN environment variable.');
  }

  // Validate token
  const validation = await authValidator.validateToken(token);
  if (!validation.valid) {
    throw new Error('Invalid authentication token');
  }

  // Execute real tools
  try {
    switch (toolName) {
      case 'getAllPublishers':
        return await getAllPublishers(args);
        
      case 'getPublisherFormats':
        return await getPublisherFormats(args);
        
      case 'availabilityForecast':
        return await availabilityForecast(args);
        
      case 'listBoards':
        // Debug tool to list all accessible boards
        return await listAllBoards();
        
      case 'getBoardColumns':
        // Debug tool to get board column structure
        return await getBoardColumns(args.boardId);
        
      case 'getItems':
        // Debug tool to get items from any board
        return await getItems(args);
        
      case 'getPublishersByFormats':
        return await getPublishersByFormats(args);
        
      case 'getKeyValues':
        return await getKeyValues(args);
        
      case 'getAudienceSegments':
        return await getAudienceSegments(args);
        
      case 'getAllProducts':
        return await getAllProducts(args);
        
      case 'getAllFormats':
        return await getAllFormats(args);
        
      case 'getAllSizes':
        return await getAllSizes(args);
        
      case 'getAllAdPrices':
        return await getAllAdPrices(args);
        
      case 'findPublisherAdUnits':
        return await findPublisherAdUnits(args);
        
      default:
        throw new Error(`Tool not implemented: ${toolName}`);
    }
  } catch (error) {
    console.error(`Error executing tool ${toolName}:`, error);
    throw error;
  }
}

// Create MCP server
async function main() {
  const server = new Server(
    {
      name: 'stephie-mcp',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: AVAILABLE_TOOLS
    };
  });

  // Execute tool
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    
    try {
      const result = await executeToolHandler(name, args);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
          }
        ],
        isError: true
      };
    }
  });

  // Start server
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  // Log to stderr so it doesn't interfere with stdio communication
  console.error('STEPhie MCP Server started');
}

// Run server
main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});