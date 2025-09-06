import { z } from 'zod';
import { createMcpHandler } from 'mcp-handler';

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
import { listAllBoards } from '../lib/tools/debug/listBoards.js';
import { getBoardColumns } from '../lib/tools/debug/getBoardColumns.js';
import { getItems, type ColumnFilter } from '../lib/tools/debug/getItems.js';

// Create the MCP handler with all tools
const handler = createMcpHandler((server) => {
  // Publisher tools
  server.tool('getAllPublishers', 
    {},
    async () => {
      const result = await getAllPublishers();
      return { content: [{ type: 'text', text: String(result) }] };
    }
  );

  server.tool('getPublisherFormats',
    {
      publisherName: z.string().optional(),
      publisherGroupName: z.string().optional()
    },
    async (input) => {
      const result = await getPublisherFormats(input);
      const text = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
      return { content: [{ type: 'text', text }] };
    }
  );

  server.tool('getPublishersByFormats',
    {
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
    },
    async (input) => {
      const result = await getPublishersByFormats(input);
      const text = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
      return { content: [{ type: 'text', text }] };
    }
  );

  server.tool('findPublisherAdUnits',
    {
      names: z.array(z.string())
    },
    async (input) => {
      const result = await findPublisherAdUnits(input);
      const text = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
      return { content: [{ type: 'text', text }] };
    }
  );

  // Product & pricing tools
  server.tool('getAllProducts',
    {},
    async () => {
      const result = await getAllProducts({});
      const text = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
      return { content: [{ type: 'text', text }] };
    }
  );

  server.tool('getAllFormats',
    {},
    async () => {
      const result = await getAllFormats({});
      const text = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
      return { content: [{ type: 'text', text }] };
    }
  );

  server.tool('getAllSizes',
    {},
    async () => {
      const result = await getAllSizes({});
      const text = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
      return { content: [{ type: 'text', text }] };
    }
  );

  server.tool('getAllAdPrices',
    {},
    async () => {
      const result = await getAllAdPrices({});
      const text = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
      return { content: [{ type: 'text', text }] };
    }
  );

  // Targeting tools
  server.tool('getKeyValues',
    {
      keySearch: z.string().optional(),
      valueSearch: z.string().optional(),
      limit: z.number().default(50).optional(),
      valueLimit: z.number().default(50).optional(),
      totalValueLimit: z.number().default(500).optional()
    },
    async (input) => {
      const result = await getKeyValues(input);
      const text = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
      return { content: [{ type: 'text', text }] };
    }
  );

  server.tool('getAudienceSegments',
    {
      search: z.string().optional(),
      limit: z.number().default(100).optional()
    },
    async (input) => {
      const result = await getAudienceSegments(input);
      const text = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
      return { content: [{ type: 'text', text }] };
    }
  );

  server.tool('getAllPlacements',
    {},
    async () => {
      const result = await getAllPlacements({});
      const text = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
      return { content: [{ type: 'text', text }] };
    }
  );

  server.tool('getGeoLocations',
    {
      search: z.array(z.string()).optional(),
      type: z.enum(['region', 'country', 'postal_code', 'city', 'municipality']).optional(),
      limit: z.number().default(20).optional()
    },
    async (input) => {
      const result = await getGeoLocations(input);
      const text = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
      return { content: [{ type: 'text', text }] };
    }
  );

  server.tool('getContextualTargeting',
    {
      search: z.string().optional(),
      limit: z.number().default(100).optional()
    },
    async (input) => {
      const result = await getContextualTargeting(input);
      const text = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
      return { content: [{ type: 'text', text }] };
    }
  );

  // Forecasting tool
  server.tool('availabilityForecast',
    {
      startDate: z.string(),
      endDate: z.string(),
      sizes: z.array(z.array(z.number())),
      goalQuantity: z.number().nullable().optional(),
      targetedAdUnitIds: z.array(z.number()).nullable().optional(),
      excludedAdUnitIds: z.array(z.number()).nullable().optional(),
      audienceSegmentIds: z.array(z.string()).nullable().optional(),
      customTargeting: z.array(z.object({
        keyId: z.string(),
        valueIds: z.array(z.string()),
        operator: z.enum(['IS', 'IS_NOT']).optional()
      })).nullable().optional(),
      frequencyCapMaxImpressions: z.number().nullable().optional(),
      frequencyCapTimeUnit: z.enum(['MINUTE', 'HOUR', 'DAY', 'WEEK', 'MONTH', 'LIFETIME', 'POD', 'STREAM', 'UNKNOWN']).nullable().optional(),
      frequencyCapTimeLength: z.number().nullable().optional()
    },
    async (input) => {
      // Ensure required fields are present
      const params = {
        startDate: input.startDate,
        endDate: input.endDate,
        sizes: input.sizes,
        ...input
      };
      const result = await availabilityForecast(params as any);
      const text = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
      return { content: [{ type: 'text', text }] };
    }
  );

  // Debug tools
  server.tool('listBoards',
    {},
    async () => {
      const result = await listAllBoards();
      // Convert object to string if needed
      const text = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
      return { content: [{ type: 'text', text }] };
    }
  );

  server.tool('getBoardColumns',
    {
      boardId: z.string()
    },
    async (input) => {
      const result = await getBoardColumns(input.boardId);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool('getItems',
    {
      boardId: z.string(),
      limit: z.number().default(10).optional(),
      columnIds: z.array(z.string()).optional(),
      itemIds: z.array(z.string()).optional(),
      search: z.string().optional(),
      columnFilters: z.array(z.object({
        columnId: z.string(),
        value: z.any(),
        operator: z.enum(['equals', 'notEquals', 'contains', 'notContains', 'greater', 'greaterOrEqual', 'less', 'lessOrEqual', 'between', 'empty', 'notEmpty', 'me', 'checked', 'unchecked']).optional()
      })).optional(),
      includeColumnMetadata: z.boolean().optional()
    },
    async (input) => {
      // Transform input to match expected types
      const params = {
        boardId: input.boardId,
        limit: input.limit,
        columnIds: input.columnIds,
        itemIds: input.itemIds,
        search: input.search,
        columnFilters: input.columnFilters as ColumnFilter[] | undefined,
        includeColumnMetadata: input.includeColumnMetadata
      };
      const result = await getItems(params);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );
});

// Export handler for Vercel Edge Runtime
export { handler as GET, handler as POST };