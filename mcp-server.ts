#!/usr/bin/env node

// biome-ignore assist/source/organizeImports: Don't know how to organize these imports
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { AuthValidator } from './lib/auth/auth-validator.js';
import { TOOL_DEFINITIONS } from './lib/mcp/toolDefinitions.js';
import { availabilityForecast } from './lib/tools/availabilityForecast.js';
import { getBoardColumns } from './lib/tools/debug/getBoardColumns.js';
import { getItems } from './lib/tools/debug/getItems.js';
import { listAllBoards } from './lib/tools/debug/listBoards.js';
import { findPublisherAdUnits } from './lib/tools/findPublisherAdUnits.js';
import { getAllAdPrices } from './lib/tools/getAllAdPrices.js';
import { getAllFormats } from './lib/tools/getAllFormats.js';
import { getAllPlacements } from './lib/tools/getAllPlacements.js';
import { getAllProducts } from './lib/tools/getAllProducts.js';
import { getAllPublishers } from './lib/tools/getAllPublishers.js';
import { getAllSizes } from './lib/tools/getAllSizes.js';
import { getAudienceSegments } from './lib/tools/getAudienceSegments.js';
import { getContextualTargeting } from './lib/tools/getContextualTargeting.js';
import { getGeoLocations } from './lib/tools/getGeoLocations.js';
import { getKeyValues } from './lib/tools/getKeyValues.js';
import { getPublisherFormats } from './lib/tools/getPublisherFormats.js';
import { getPublishersByFormats } from './lib/tools/getPublishersByFormats.js';
import * as dotenv from 'dotenv';
import type { ColumnFilter } from './lib/tools/debug/getItems.js';

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
const toolImplementations: Record<string, (args: Record<string, unknown>) => Promise<unknown>> = {
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
  availabilityForecast: (args) => availabilityForecast({
    startDate: args.startDate as string,
    endDate: args.endDate as string,
    sizes: args.sizes as number[][],
    goalQuantity: args.goalQuantity as number | null | undefined,
    targetedAdUnitIds: args.targetedAdUnitIds as number[] | null | undefined,
    excludedAdUnitIds: args.excludedAdUnitIds as number[] | null | undefined,
    audienceSegmentIds: args.audienceSegmentIds as string[] | null | undefined,
    customTargeting: args.customTargeting as { keyId: string; valueIds: string[]; operator?: "IS" | "IS_NOT" | undefined; }[],
    frequencyCapMaxImpressions: args.frequencyCapMaxImpressions as number | null | undefined,
    frequencyCapTimeUnit: args.frequencyCapTimeUnit as "MINUTE" | "HOUR" | "DAY" | "WEEK" | "MONTH" | "LIFETIME" | null | undefined,
    targetedPlacementIds: args.targetedPlacementIds as string[] | null | undefined,
  }),
  listBoards: () => listAllBoards(),
  getBoardColumns: (args) => getBoardColumns(args.boardId as string),
  getItems: (args) => getItems(args as {
    boardId: string;
    limit?: number;
    columnIds?: string[];
    itemIds?: string[];
    search?: string;
    columnFilters?: ColumnFilter[];
    includeColumnMetadata?: boolean;
  }),
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

    const result = await implementation(args || {});
    
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