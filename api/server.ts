import { z } from 'zod';
import { createMcpHandler } from 'mcp-handler';
import { TOOL_DEFINITIONS } from '../lib/mcp/toolDefinitions.js';

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

// Import board-specific tools (selected key ones)
import { getAccounts } from '../lib/tools/crm/getAccounts.js';
import { getContacts } from '../lib/tools/crm/getContacts.js';
import { getLeads } from '../lib/tools/crm/getLeads.js';
import { getOpportunities } from '../lib/tools/sales/getOpportunities.js';
import { getSalesActivities } from '../lib/tools/sales/getSalesActivities.js';
import { getBookings } from '../lib/tools/operations/getBookings.js';
import { getBugs } from '../lib/tools/development/getBugs.js';
import { getTasksTechIntelligence } from '../lib/tools/tasks/getTasksTechIntelligence.js';
import { createTaskTechIntelligence } from '../lib/tools/tasks/createTaskTechIntelligence.js';
import { updateTaskTechIntelligence } from '../lib/tools/tasks/updateTaskTechIntelligence.js';
import { getTasksAdOps } from '../lib/tools/tasks/getTasksAdOps.js';
import { getTasksMarketing } from '../lib/tools/tasks/getTasksMarketing.js';
import { getOKR } from '../lib/tools/okr/getOKR.js';
import { getMarketingBudgets } from '../lib/tools/marketing/getMarketingBudgets.js';
import { getDeals } from '../lib/tools/sales/getDeals.js';
import { getTeams } from '../lib/tools/hr/getTeams.js';
import { getPeople } from '../lib/tools/hr/getPeople.js';
import { getTickets } from '../lib/tools/support/getTickets.js';

// Helper to get tool description
const getToolDescription = (name: string): string => {
  const tool = TOOL_DEFINITIONS.find(t => t.name === name);
  return tool?.description || '';
};

// Create the MCP handler with all tools
const handler = createMcpHandler((server) => {
  // Publisher tools
  server.tool('getAllPublishers',
    getToolDescription('getAllPublishers'),
    {},
    async () => {
      const result = await getAllPublishers();
      return { content: [{ type: 'text', text: String(result) }] };
    }
  );

  server.tool('getPublisherFormats',
    getToolDescription('getPublisherFormats'),
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
    getToolDescription('getPublishersByFormats'),
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
    getToolDescription('findPublisherAdUnits'),
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
    getToolDescription('getAllProducts'),
    {},
    async () => {
      const result = await getAllProducts({});
      const text = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
      return { content: [{ type: 'text', text }] };
    }
  );

  server.tool('getAllFormats',
    getToolDescription('getAllFormats'),
    {},
    async () => {
      const result = await getAllFormats({});
      const text = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
      return { content: [{ type: 'text', text }] };
    }
  );

  server.tool('getAllSizes',
    getToolDescription('getAllSizes'),
    {},
    async () => {
      const result = await getAllSizes({});
      const text = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
      return { content: [{ type: 'text', text }] };
    }
  );

  server.tool('getAllAdPrices',
    getToolDescription('getAllAdPrices'),
    {},
    async () => {
      const result = await getAllAdPrices({});
      const text = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
      return { content: [{ type: 'text', text }] };
    }
  );

  // Targeting tools
  server.tool('getKeyValues',
    getToolDescription('getKeyValues'),
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
    getToolDescription('getAudienceSegments'),
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
    getToolDescription('getAllPlacements'),
    {},
    async () => {
      const result = await getAllPlacements({});
      const text = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
      return { content: [{ type: 'text', text }] };
    }
  );

  server.tool('getGeoLocations',
    getToolDescription('getGeoLocations'),
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
    getToolDescription('getContextualTargeting'),
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
    getToolDescription('availabilityForecast'),
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
    getToolDescription('listBoards'),
    {},
    async () => {
      const result = await listAllBoards();
      // Convert object to string if needed
      const text = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
      return { content: [{ type: 'text', text }] };
    }
  );

  server.tool('getBoardColumns',
    getToolDescription('getBoardColumns'),
    {
      boardId: z.string()
    },
    async (input) => {
      const result = await getBoardColumns(input.boardId);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool('getItems',
    getToolDescription('getItems'),
    {
      boardId: z.string(),
      limit: z.number().default(10).optional(),
      columnIds: z.array(z.string()).optional(),
      itemIds: z.array(z.string()).optional(),
      search: z.string().optional(),
      columnFilters: z.array(z.object({
        columnId: z.string(),
        value: z.any(),
        operator: z.enum(['equals', 'notEquals', 'contains', 'notContains', 'greater', 'less', 'between', 'empty', 'notEmpty', 'me', 'checked', 'unchecked']).optional()
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

  // Board-specific tools
  server.tool('getAccounts',
    getToolDescription('getAccounts'),
    {
      limit: z.number().default(10).optional(),
      search: z.string().optional(),
      status: z.number().optional(),
      status5: z.number().optional(),
      contactsId: z.string().optional(),
      opportunitiesId: z.string().optional(),
      leadsId: z.string().optional()
    },
    async (input) => {
      const result = await getAccounts(input);
      return { content: [{ type: 'text', text: result }] };
    }
  );

  server.tool('getContacts',
    getToolDescription('getContacts'),
    {
      limit: z.number().default(10).optional(),
      search: z.string().optional(),
      accountId: z.string().optional(),
      opportunitiesId: z.string().optional()
    },
    async (input) => {
      const result = await getContacts(input);
      return { content: [{ type: 'text', text: result }] };
    }
  );

  server.tool('getLeads',
    getToolDescription('getLeads'),
    {
      limit: z.number().default(10).optional(),
      search: z.string().optional(),
      existingContactId: z.string().optional(),
      existingAccountId: z.string().optional(),
      opportunityId: z.string().optional()
    },
    async (input) => {
      const result = await getLeads(input);
      return { content: [{ type: 'text', text: result }] };
    }
  );

  server.tool('getOpportunities',
    getToolDescription('getOpportunities'),
    {
      limit: z.number().default(10).optional(),
      search: z.string().optional(),
      accountId: z.string().optional(),
      contactId: z.string().optional(),
      bookingId: z.string().optional()
    },
    async (input) => {
      const result = await getOpportunities(input);
      return { content: [{ type: 'text', text: result }] };
    }
  );

  server.tool('getSalesActivities',
    getToolDescription('getSalesActivities'),
    {
      limit: z.number().default(10).optional(),
      search: z.string().optional(),
      accountId: z.string().optional(),
      contactId: z.string().optional(),
      opportunityId: z.string().optional()
    },
    async (input) => {
      const result = await getSalesActivities(input);
      return { content: [{ type: 'text', text: result }] };
    }
  );

  server.tool('getBookings',
    getToolDescription('getBookings'),
    {
      limit: z.number().default(10).optional(),
      search: z.string().optional(),
      status0__1: z.number().optional(),
      date: z.string().optional(),
      opportunityId: z.string().optional()
    },
    async (input) => {
      const result = await getBookings(input);
      return { content: [{ type: 'text', text: result }] };
    }
  );

  server.tool('getBugs',
    getToolDescription('getBugs'),
    {
      limit: z.number().default(10).optional(),
      search: z.string().optional(),
      color_mkqnwy18: z.number().optional(),
      color_mkqhya7m: z.number().optional()
    },
    async (input) => {
      const result = await getBugs(input);
      return { content: [{ type: 'text', text: result }] };
    }
  );

  server.tool('getTasksTechIntelligence',
    getToolDescription('getTasksTechIntelligence'),
    {
      limit: z.number().default(10).optional(),
      search: z.string().optional(),
      status_19__1: z.number().optional().describe('Status: 0=In Review, 1=Done, 2=Rejected, 3=Planned, 4=In Progress, 5=Missing Status, 6=Waiting On Others, 7=New, 8=On Hold'),
      type_1__1: z.number().optional().describe('Type: 0=Training, 1=Support, 2=UI Element, 3=Maintenance, 4=Development, 5=Not Labelled, 6=Bug, 7=Documentation, 8=Info, 9=Newsletter, 10=Operations, 11=Spam, 12=Meeting'),
      priority_1__1: z.number().optional().describe('Priority: 0=Medium, 1=Minimal, 2=Low, 3=Critical, 4=High, 5=Not Prioritized, 6=Unknown'),
      keyResultId: z.string().optional(),
      teamTaskId: z.string().optional()
    },
    async (input) => {
      const result = await getTasksTechIntelligence(input);
      return { content: [{ type: 'text', text: result }] };
    }
  );

  server.tool('createTaskTechIntelligence',
    getToolDescription('createTaskTechIntelligence'),
    {
      name: z.string(),
      person: z.string().optional(),
      status_19__1: z.number().optional().describe('Status: 0=In Review, 1=Done, 2=Rejected, 3=Planned, 4=In Progress, 5=Missing Status, 6=Waiting On Others, 7=New, 8=On Hold'),
      type_1__1: z.number().optional().describe('Type: 0=Training, 1=Support, 2=UI Element, 3=Maintenance, 4=Development, 5=Not Labelled, 6=Bug, 7=Documentation, 8=Info, 9=Newsletter, 10=Operations, 11=Spam, 12=Meeting'),
      priority_1__1: z.number().optional().describe('Priority: 0=Medium, 1=Minimal, 2=Low, 3=Critical, 4=High, 5=Not Prioritized, 6=Unknown'),
      date__1: z.string().optional(),
      text__1: z.string().optional(),
      text0__1: z.string().optional(),
      long_text__1: z.string().optional(),
      link__1: z.object({
        url: z.string(),
        text: z.string()
      }).optional(),
      numbers__1: z.number().optional(),
      keyResultId: z.string().optional(),
      teamTaskId: z.string().optional(),
      groupId: z.string().optional()
    },
    async (input) => {
      const result = await createTaskTechIntelligence(input as any);
      return { content: [{ type: 'text', text: result }] };
    }
  );

  server.tool('updateTaskTechIntelligence',
    getToolDescription('updateTaskTechIntelligence'),
    {
      itemId: z.string(),
      name: z.string().optional(),
      person: z.string().optional(),
      status_19__1: z.number().optional().describe('Status: 0=In Review, 1=Done, 2=Rejected, 3=Planned, 4=In Progress, 5=Missing Status, 6=Waiting On Others, 7=New, 8=On Hold'),
      type_1__1: z.number().optional().describe('Type: 0=Training, 1=Support, 2=UI Element, 3=Maintenance, 4=Development, 5=Not Labelled, 6=Bug, 7=Documentation, 8=Info, 9=Newsletter, 10=Operations, 11=Spam, 12=Meeting'),
      priority_1__1: z.number().optional().describe('Priority: 0=Medium, 1=Minimal, 2=Low, 3=Critical, 4=High, 5=Not Prioritized, 6=Unknown'),
      date__1: z.string().optional(),
      text__1: z.string().optional(),
      text0__1: z.string().optional(),
      long_text__1: z.string().optional(),
      link__1: z.object({
        url: z.string(),
        text: z.string()
      }).optional(),
      numbers__1: z.number().optional(),
      keyResultId: z.string().optional(),
      teamTaskId: z.string().optional()
    },
    async (input) => {
      const result = await updateTaskTechIntelligence(input as any);
      return { content: [{ type: 'text', text: result }] };
    }
  );

  server.tool('getTasksAdOps',
    getToolDescription('getTasksAdOps'),
    {
      limit: z.number().default(10).optional(),
      search: z.string().optional(),
      keyResultId: z.string().optional(),
      publisherId: z.string().optional()
    },
    async (input) => {
      const result = await getTasksAdOps(input);
      return { content: [{ type: 'text', text: result }] };
    }
  );

  server.tool('getTasksMarketing',
    getToolDescription('getTasksMarketing'),
    {
      limit: z.number().default(10).optional(),
      search: z.string().optional(),
      keyResultId: z.string().optional(),
      budgetId: z.string().optional()
    },
    async (input) => {
      const result = await getTasksMarketing(input);
      return { content: [{ type: 'text', text: result }] };
    }
  );

  server.tool('getOKR',
    getToolDescription('getOKR'),
    {
      limit: z.number().default(10).optional(),
      search: z.string().optional(),
      status: z.number().optional(),
      teamId: z.string().optional(),
      includeKeyResults: z.boolean().default(true).optional(),
      onlyActive: z.boolean().default(false).optional(),
      strategiesId: z.string().optional(),
      peopleId: z.string().optional()
    },
    async (input) => {
      const result = await getOKR(input);
      return { content: [{ type: 'text', text: result }] };
    }
  );

  server.tool('getMarketingBudgets',
    getToolDescription('getMarketingBudgets'),
    {
      limit: z.number().default(10).optional(),
      search: z.string().optional()
    },
    async (input) => {
      const result = await getMarketingBudgets(input);
      return { content: [{ type: 'text', text: result }] };
    }
  );

  server.tool('getDeals',
    getToolDescription('getDeals'),
    {
      limit: z.number().default(10).optional(),
      search: z.string().optional(),
      status: z.number().optional(),
      agencyId: z.string().optional(),
      advertiserId: z.string().optional(),
      contactsId: z.string().optional()
    },
    async (input) => {
      const result = await getDeals(input);
      return { content: [{ type: 'text', text: result }] };
    }
  );

  server.tool('getTeams',
    getToolDescription('getTeams'),
    {
      limit: z.number().default(10).optional(),
      search: z.string().optional(),
      status: z.number().describe('Status: 0=Under-Ressourced, 1=Active, 2=Inactive').optional(),
      peopleId: z.string().optional(),
      objectiveId: z.string().optional()
    },
    async (input) => {
      const result = await getTeams(input);
      return { content: [{ type: 'text', text: result }] };
    }
  );

  server.tool('getPeople',
    getToolDescription('getPeople'),
    {
      limit: z.number().default(10).optional(),
      search: z.string().optional(),
      teamId: z.string().optional()
    },
    async (input) => {
      const result = await getPeople(input);
      return { content: [{ type: 'text', text: result }] };
    }
  );

  server.tool('getTickets',
    getToolDescription('getTickets'),
    {
      limit: z.number().default(10).optional(),
      search: z.string().optional(),
      status: z.number().optional(),
      priority: z.number().optional(),
      contactId: z.string().optional(),
      assignedId: z.string().optional(),
      publisherId: z.string().optional()
    },
    async (input) => {
      const result = await getTickets(input);
      return { content: [{ type: 'text', text: result }] };
    }
  );
});

// Export handler for Vercel Edge Runtime
export { handler as GET, handler as POST };