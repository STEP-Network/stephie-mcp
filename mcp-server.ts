#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import * as dotenv from 'dotenv';
import { AuthValidator } from './lib/auth/auth-validator.js';
import { TOOL_DEFINITIONS } from './lib/mcp/toolDefinitions.js';

// Import all tool implementations
import { getAllPublishers } from './lib/tools/getAllPublishers.js';
import { getPublisherFormats } from './lib/tools/getPublisherFormats.js';
import { getPublishersByFormats } from './lib/tools/getPublishersByFormats.js';
import { getAllProducts } from './lib/tools/getAllProducts.js';
import { getAllFormats } from './lib/tools/getAllFormats.js';
import { getAllSizes } from './lib/tools/getAllSizes.js';
import { getAllAdPrices } from './lib/tools/getAllAdPrices.js';
import { findPublisherAdUnits } from './lib/tools/findPublisherAdUnits.js';
import { getKeyValues } from './lib/tools/getKeyValues.js';
import { getAudienceSegments } from './lib/tools/getAudienceSegments.js';
import { getAllPlacements } from './lib/tools/getAllPlacements.js';
import { getGeoLocations } from './lib/tools/getGeoLocations.js';
import { getContextualTargeting } from './lib/tools/getContextualTargeting.js';
import { availabilityForecast } from './lib/tools/availabilityForecast.js';
import { listAllBoards } from './lib/tools/debug/listBoards.js';
import { getBoardColumns } from './lib/tools/debug/getBoardColumns.js';
import { getItems } from './lib/tools/debug/getItems.js';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Initialize auth validator
const authValidator = new AuthValidator();

// Create server instance
const server = new Server(
  {
    name: 'STEPhie MCP Server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool implementations map
const toolImplementations: Record<string, (args: any) => Promise<any>> = {
  getAllPublishers: () => getAllPublishers(),
  getPublisherFormats: (args) => getPublisherFormats(args),
  getPublishersByFormats: (args) => getPublishersByFormats(args),
  getAllProducts: (args) => getAllProducts(args),
  getAllFormats: (args) => getAllFormats(args),
  getAllSizes: (args) => getAllSizes(args),
  getAllAdPrices: (args) => getAllAdPrices(args),
  findPublisherAdUnits: (args) => findPublisherAdUnits(args),
  getKeyValues: (args) => getKeyValues(args),
  getAudienceSegments: (args) => getAudienceSegments(args),
  getAllPlacements: (args) => getAllPlacements(args),
  getGeoLocations: (args) => getGeoLocations(args),
  getContextualTargeting: (args) => getContextualTargeting(args),
  availabilityForecast: (args) => availabilityForecast(args),
  listBoards: () => listAllBoards(),
  getBoardColumns: (args) => getBoardColumns(args.boardId),
  getItems: (args) => getItems(args),
};

// Handle list tools request
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: TOOL_DEFINITIONS,
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  try {
    // Validate authentication for non-test environments
    if (process.env.NODE_ENV !== 'test' && !process.env.TEST_AUTH_TOKEN) {
      const authToken = process.env.STEPHIE_AUTH_TOKEN;
      if (!authToken) {
        throw new Error('Authentication required. Please provide STEPHIE_AUTH_TOKEN.');
      }
      
      // Skip validation for test token
      if (authToken !== 'test-token') {
        const isValid = await authValidator.validateToken(authToken);
        if (!isValid) {
          throw new Error('Invalid authentication token.');
        }
      }
    }

    // Find and execute the tool
    const implementation = toolImplementations[name];
    if (!implementation) {
      throw new Error(`Unknown tool: ${name}`);
    }

    const result = await implementation(args);
    
    return {
      content: [
        {
          type: 'text',
          text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    console.error(`Error in tool ${name}:`, error);
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('STEPhie MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});