import { z } from 'zod';
import { createMcpHandler } from 'mcp-handler';
import * as dotenv from 'dotenv';

// Import all tools
import { getAllPublishers } from '../lib/tools/getAllPublishers.js';
import { getPublisherFormats } from '../lib/tools/getPublisherFormats.js';
import { getPublishersByFormats } from '../lib/tools/getPublishersByFormats.js';
import { getAllProducts } from '../lib/tools/getAllProducts.js';
import { getAllFormats } from '../lib/tools/getAllFormats.js';
import { getAllSizes } from '../lib/tools/getAllSizes.js';
import { getAllAdPrices } from '../lib/tools/getAllAdPrices.js';
import { findPublisherAdUnits } from '../lib/tools/findPublisherAdUnits.js';
import { getKeyValues } from '../lib/tools/getKeyValues.js';
import { getAudienceSegments } from '../lib/tools/getAudienceSegments.js';
import { getAllPlacements } from '../lib/tools/getAllPlacements.js';
import { getGeoLocations } from '../lib/tools/getGeoLocations.js';
import { getContextualTargeting } from '../lib/tools/getContextualTargeting.js';
import { availabilityForecast } from '../lib/tools/availabilityForecast.js';
import { listBoards } from '../lib/tools/debug/listBoards.js';
import { getBoardColumns } from '../lib/tools/debug/getBoardColumns.js';
import { getItems } from '../lib/tools/debug/getItems.js';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Create the MCP handler with all tools
export default createMcpHandler({
  name: 'STEPhie MCP Server',
  version: '1.0.0',
  description: 'MCP server for STEPhie tools - Access publisher data and ad forecasting'
}, (server) => {
  // Publisher tools
  server.tool('getAllPublishers', 
    z.object({}),
    async () => getAllPublishers()
  );

  server.tool('getPublisherFormats',
    z.object({
      publisherName: z.string().optional(),
      publisherGroupName: z.string().optional(),
      limit: z.number().default(100).optional()
    }),
    async (input) => getPublisherFormats(input)
  );

  server.tool('getPublishersByFormats',
    z.object({
      topscroll: z.enum(['Desktop', 'Mobile', 'App', 'All']).optional(),
      topscrollExpand: z.enum(['Desktop', 'Mobile', 'App', 'All']).optional(),
      doubleMidscroll: z.enum(['Desktop', 'Mobile', 'All']).optional(),
      midscroll: z.enum(['Desktop', 'Mobile', 'All']).optional(),
      midscrollExpand: z.enum(['Desktop', 'Mobile', 'All']).optional(),
      slider: z.enum(['Desktop', 'Mobile', 'All']).optional(),
      parallax: z.enum(['Desktop', 'Mobile', 'All']).optional(),
      topscrollHighimpact: z.enum(['Desktop', 'Mobile', 'All']).optional(),
      midscrollHighimpact: z.enum(['Desktop', 'Mobile', 'All']).optional(),
      sticky: z.enum(['Desktop', 'Mobile', 'App', 'All']).optional(),
      interstitial: z.enum(['Desktop', 'Mobile', 'App', 'All']).optional(),
      trueNative: z.enum(['Desktop', 'Mobile', 'All']).optional(),
      video: z.enum(['Desktop', 'Mobile', 'All']).optional(),
      vertikalVideo: z.enum(['Desktop', 'Mobile', 'All']).optional(),
      outstream: z.enum(['Desktop', 'Mobile', 'All']).optional(),
      videoPlayback: z.boolean().optional(),
      ott: z.boolean().optional(),
      reAd: z.boolean().optional()
    }),
    async (input) => getPublishersByFormats(input)
  );

  server.tool('findPublisherAdUnits',
    z.object({
      names: z.array(z.string())
    }),
    async (input) => findPublisherAdUnits(input)
  );

  // Product & pricing tools
  server.tool('getAllProducts',
    z.object({
      includeIds: z.boolean().default(false).optional()
    }),
    async (input) => getAllProducts(input)
  );

  server.tool('getAllFormats',
    z.object({
      device: z.enum(['Desktop', 'Mobile', 'App', 'All']).optional(),
      includeIds: z.boolean().default(false).optional()
    }),
    async (input) => getAllFormats(input)
  );

  server.tool('getAllSizes',
    z.object({
      minWidth: z.number().optional(),
      maxWidth: z.number().optional(),
      includeIds: z.boolean().default(false).optional()
    }),
    async (input) => getAllSizes(input)
  );

  server.tool('getAllAdPrices',
    z.object({
      format: z.string().optional(),
      includeIds: z.boolean().default(false).optional()
    }),
    async (input) => getAllAdPrices(input)
  );

  // Targeting tools
  server.tool('getKeyValues',
    z.object({
      keySearch: z.string().optional(),
      valueSearch: z.string().optional(),
      limit: z.number().default(50).optional(),
      valueLimit: z.number().default(50).optional(),
      totalValueLimit: z.number().default(500).optional()
    }),
    async (input) => getKeyValues(input)
  );

  server.tool('getAudienceSegments',
    z.object({
      search: z.string().optional(),
      limit: z.number().default(100).optional()
    }),
    async (input) => getAudienceSegments(input)
  );

  server.tool('getAllPlacements',
    z.object({
      includeIds: z.boolean().default(false).optional()
    }),
    async (input) => getAllPlacements(input)
  );

  server.tool('getGeoLocations',
    z.object({
      search: z.string(),
      limit: z.number().default(50).optional()
    }),
    async (input) => getGeoLocations(input)
  );

  server.tool('getContextualTargeting',
    z.object({
      search: z.string().optional(),
      limit: z.number().default(100).optional()
    }),
    async (input) => getContextualTargeting(input)
  );

  // Forecasting tool
  server.tool('availabilityForecast',
    z.object({
      startDate: z.string(),
      endDate: z.string(),
      sizes: z.array(z.array(z.number())),
      adUnitIds: z.array(z.string()).optional(),
      excludeAdUnitDescendants: z.boolean().default(false).optional(),
      geoTargeting: z.object({
        include: z.array(z.string()).optional(),
        exclude: z.array(z.string()).optional()
      }).optional(),
      customTargeting: z.array(z.object({
        keyId: z.string(),
        valueIds: z.array(z.string()),
        operator: z.enum(['IS', 'IS_NOT'])
      })).optional(),
      audienceSegmentIds: z.array(z.string()).optional(),
      placementIds: z.array(z.string()).optional(),
      frequencyCap: z.object({
        maxImpressions: z.number(),
        numTimeUnits: z.number(),
        timeUnit: z.enum(['MINUTE', 'HOUR', 'DAY', 'WEEK', 'MONTH', 'LIFETIME', 'POD', 'STREAM', 'UNKNOWN'])
      }).optional(),
      goalQuantity: z.number().optional(),
      includeContendingLineItems: z.boolean().default(false).optional(),
      includeTargetingCriteriaBreakdown: z.boolean().default(false).optional()
    }),
    async (input) => availabilityForecast(input)
  );

  // Debug tools
  server.tool('listBoards',
    z.object({}),
    async () => listBoards()
  );

  server.tool('getBoardColumns',
    z.object({
      boardId: z.string()
    }),
    async (input) => getBoardColumns(input.boardId)
  );

  server.tool('getItems',
    z.object({
      boardId: z.string(),
      limit: z.number().default(10).optional(),
      columnIds: z.array(z.string()).optional()
    }),
    async (input) => getItems(input)
  );
});