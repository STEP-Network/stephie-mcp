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
import { getTasksAdTech } from '../lib/tools/tasks/getTasksAdTech.js';
import { getTasksVideo } from '../lib/tools/tasks/getTasksVideo.js';
import { getTasksYieldGrowth } from '../lib/tools/tasks/getTasksYieldGrowth.js';
import { getOKR } from '../lib/tools/okr/getOKR.js';
import { getMarketingBudgets } from '../lib/tools/marketing/getMarketingBudgets.js';
import { getDeals } from '../lib/tools/sales/getDeals.js';
import { getTeams } from '../lib/tools/hr/getTeams.js';
import { getPeople } from '../lib/tools/hr/getPeople.js';
import { getTickets } from '../lib/tools/support/getTickets.js';

// Import create/update tools
import { createAccount } from '../lib/tools/crm/createAccount.js';
import { updateAccount } from '../lib/tools/crm/updateAccount.js';
import { createContact } from '../lib/tools/crm/createContact.js';
import { updateContact } from '../lib/tools/crm/updateContact.js';
import { createLead } from '../lib/tools/crm/createLead.js';
import { updateLead } from '../lib/tools/crm/updateLead.js';
import { createOpportunity } from '../lib/tools/sales/createOpportunity.js';
import { updateOpportunity } from '../lib/tools/sales/updateOpportunity.js';
import { createSalesActivity } from '../lib/tools/sales/createSalesActivity.js';
import { updateSalesActivity } from '../lib/tools/sales/updateSalesActivity.js';
import { createBug } from '../lib/tools/development/createBug.js';
import { updateBug } from '../lib/tools/development/updateBug.js';
import { createTaskAdOps } from '../lib/tools/tasks/createTaskAdOps.js';
import { updateTaskAdOps } from '../lib/tools/tasks/updateTaskAdOps.js';
import { createTaskMarketing } from '../lib/tools/tasks/createTaskMarketing.js';
import { updateTaskMarketing } from '../lib/tools/tasks/updateTaskMarketing.js';
import { createTaskAdTech } from '../lib/tools/tasks/createTaskAdTech.js';
import { updateTaskAdTech } from '../lib/tools/tasks/updateTaskAdTech.js';
import { createTaskVideo } from '../lib/tools/tasks/createTaskVideo.js';
import { updateTaskVideo } from '../lib/tools/tasks/updateTaskVideo.js';
import { createTaskYieldGrowth } from '../lib/tools/tasks/createTaskYieldGrowth.js';
import { updateTaskYieldGrowth } from '../lib/tools/tasks/updateTaskYieldGrowth.js';
import { createOKR } from '../lib/tools/business/createOKR.js';
import { updateOKR } from '../lib/tools/business/updateOKR.js';
import { createDeal } from '../lib/tools/sales/createDeal.js';
import { updateDeal } from '../lib/tools/sales/updateDeal.js';
import { createTicket } from '../lib/tools/support/createTicket.js';
import { updateTicket } from '../lib/tools/support/updateTicket.js';

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
      const result = await availabilityForecast(params as Parameters<typeof availabilityForecast>[0]);
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
      status: z.number().optional().describe('Account Status: 0=On hold, 4=Client, 13=Past Client, 17=New Biz'),
      status5: z.number().optional().describe('Type: 0=Agency, 1=Agency Group, 2=Partner, 3=Publisher, 4=Publisher Lead, 107=Advertiser'),
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
      status: z.number().optional().describe('Status: 0=Working on it, 1=Good relation, 2=Stuck, 3=Rejected, 4=Stopped, 19=No contact, 107=Waiting'),
      tier: z.number().optional().describe('Tier: 0=D-level, 1=C-level, 2=A-level, 19=P-level, 107=Ambassador')
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
      opportunityId: z.string().optional(),
      status: z.number().optional().describe('Status: 0=New, 1=Qualified, 2=New Lead, 5=Ikke interesseret, 11=Unqualified, 14=Contacted'),
      type: z.number().optional().describe('Type: 1=Publisher, 2=Advertiser')
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
      bookingId: z.string().optional(),
      stage: z.number().optional().describe('Stage: 0=Contacted, 1=Won (don\'t use), 2=Lost, 3=Offer sent, 4=New, 6=Won PG/PD, 7=Won IO, 8=Won Publisher, 9=In pitch'),
      status3__1: z.number().optional().describe('Booking Status: 1=Delivering completed + report sent, 2=Deal not ready, 4=Ready for midway report, 6=Ready for final report, 19=New IO\'s, 107=Booked / Delivering'),
      status9__1: z.number().optional().describe('Product: 3=Programmatic Guaranteed, 4=Insertion Order, 6=Brand Bridge, 19=Preferred Deal')
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
      opportunityId: z.string().optional(),
      activity_status: z.number().optional().describe('Status: 0=To do, 1=Done, 2=Open, 3=Planned, 4=Add Expense, 5=Waiting for progress'),
      activity_type: z.number().optional().describe('Activity Type: 0=Call summary, 1=Email, 4=Event, 9=Anniversary (mærkedag), 11=Follow-up, 12=Send offer, 13=Social activity, 14=Meeting, 17=Contact (call/email/sms), 18=Agency presentation, 19=Media meeting')
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
      status0__1: z.number().optional().describe('Status: 0=Not ready, 1=Delivering completed + report sent, 2=Under Booking, 3=Booked, 4=Delivering, 6=Ready for final reporting, 19=New'),
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
      color_mkqnwy18: z.number().optional().describe('Priority: 0=Medium, 1=Minimal, 2=Low, 3=Critical, 4=High, 5=Not Prioritized, 6=Unknown'),
      color_mkqhya7m: z.number().optional().describe('Status: 0=In Review, 1=Done, 2=Rejected, 3=Planned, 4=In Progress, 5=Missing Status, 6=Waiting On Others, 7=New, 8=On Hold')
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
      const result = await createTaskTechIntelligence(input as Parameters<typeof createTaskTechIntelligence>[0]);
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
      const result = await updateTaskTechIntelligence(input as Parameters<typeof updateTaskTechIntelligence>[0]);
      return { content: [{ type: 'text', text: result }] };
    }
  );

  server.tool('getTasksAdOps',
    getToolDescription('getTasksAdOps'),
    {
      limit: z.number().default(10).optional(),
      search: z.string().optional(),
      assignedId: z.string().optional(),
      status: z.number().optional().describe('Status: 0=In Review, 1=Done, 2=Rejected, 3=Planned, 4=In Progress, 5=Missing Status, 6=Waiting On Others, 7=New, 8=On Hold'),
      priority: z.number().optional().describe('Priority: 0=Medium, 1=Minimal, 2=Low, 3=Critical, 4=High, 5=Not Prioritized, 6=Unknown'),
      type: z.number().optional().describe('Type: 0=Hackathon, 1=Publisher, 2=Product, 3=Template, 5=Task')
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
      assignedId: z.string().optional(),
      status: z.number().optional().describe('Status: 0=In Review, 1=Done, 2=Rejected, 3=Planned, 4=In Progress, 5=Missing Status, 6=Waiting On Others, 7=New, 8=On Hold'),
      priority: z.number().optional().describe('Priority: 0=Medium, 1=Minimal, 2=Low, 3=Critical, 4=High, 5=Not Prioritized, 6=Unknown'),
      type: z.number().optional().describe('Type: 0=Andet, 1=Kommunikationsplan Media Summit 2025, 3=Case, 4=Aktivitet, 19=Content'),
      channel: z.number().optional().describe('Channel: 0=LinkedIn, 1=Newsletter, 2=PR, 3=Annoncering, 4=Blogindlæg')
    },
    async (input) => {
      const result = await getTasksMarketing(input);
      return { content: [{ type: 'text', text: result }] };
    }
  );

  server.tool('getTasksAdTech',
    getToolDescription('getTasksAdTech'),
    {
      limit: z.number().default(10).optional(),
      search: z.string().optional(),
      status: z.number().optional().describe('Status: 0=In Review, 1=Done, 2=Rejected, 3=Planned, 4=In Progress, 5=Missing Status, 6=Waiting On Others, 7=New, 8=On Hold'),
      priority: z.number().optional().describe('Priority: 0=P2 - Medium, 1=P4 - Minimal, 2=P3 - Low, 3=P0 - Critical ⚠️️, 4=P1 - High, 5=Missing, 6=P5 - Unknown'),
      releaseStatus: z.number().optional().describe('Release status: 0=Alpha (pre-testing), 1=Production (live), 2=Beta (pre-release), 3=Drift or bugs, 4=Reminder, 107=Research (bubbles)')
    },
    async (input) => {
      const result = await getTasksAdTech(input);
      return { content: [{ type: 'text', text: result }] };
    }
  );

  server.tool('getTasksVideo',
    getToolDescription('getTasksVideo'),
    {
      limit: z.number().default(10).optional(),
      search: z.string().optional(),
      status: z.number().optional().describe('Status: 0=In Review, 1=Done, 2=Rejected, 3=Planned, 4=In Progress, 5=Missing Status, 6=Waiting On Others, 7=New, 8=On Hold'),
      type: z.number().optional().describe('Type: 0=Question, 1=Idea, 2=Opportunity, 3=Bug, 4=Development, 5=Not Labelled, 6=Stuck')
    },
    async (input) => {
      const result = await getTasksVideo(input);
      return { content: [{ type: 'text', text: result }] };
    }
  );

  server.tool('getTasksYieldGrowth',
    getToolDescription('getTasksYieldGrowth'),
    {
      limit: z.number().default(10).optional(),
      assignedId: z.string().optional(),
      search: z.string().optional(),
      status: z.number().optional().describe('Status: 0=In Review, 1=Done, 2=Rejected, 3=Planned, 4=In Progress, 5=Missing Status, 6=Waiting On Others, 7=New, 8=On Hold'),
      priority: z.number().optional()
    },
    async (input) => {
      const result = await getTasksYieldGrowth(input);
      return { content: [{ type: 'text', text: result }] };
    }
  );

  server.tool('getOKR',
    getToolDescription('getOKR'),
    {
      limit: z.number().default(10).optional(),
      search: z.string().optional(),
      status: z.number().optional().describe('Status: 0=In Review, 1=Done, 2=Rejected, 3=Planned, 4=In Progress, 5=Missing Status, 6=Waiting On Others, 7=New, 8=On Hold'),
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
      status: z.number().optional().describe('Status: 0=Working on it, 1=Done, 2=Stuck, 3=Deal godkendt, 4=Archived, 6=Contacted, 19=Sendt til godkendelse, 107=On hold'),
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
      status: z.number().optional().describe('Status: 0=New response, 1=Customer responded, 2=On hold, 3=Email Sent, 5=New, 7=Awaiting response, 11=Resolved'),
      priority: z.number().optional().describe('Priority: 7=Low, 10=Critical, 109=Medium, 110=High'),
      contactId: z.string().optional(),
      assignedId: z.string().optional(),
      publisherId: z.string().optional()
    },
    async (input) => {
      const result = await getTickets(input);
      return { content: [{ type: 'text', text: result }] };
    }
  );

  // Create/Update tools - Accounts
  server.tool('createAccount',
    getToolDescription('createAccount'),
    {
      name: z.string(),
      status: z.number().optional().describe('Account Status: 0=On hold, 4=Client, 13=Past Client, 17=New Biz'),
      status5: z.number().optional().describe('Type: 0=Agency, 1=Agency Group, 2=Partner, 3=Publisher, 4=Publisher Lead, 107=Advertiser'),
      people: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      text: z.string().optional(),
      contactsId: z.string().optional(),
      opportunitiesId: z.string().optional(),
      leadsId: z.string().optional(),
      groupId: z.string().optional()
    },
    async (input) => {
      const result = await createAccount(input as Parameters<typeof createAccount>[0]);
      return { content: [{ type: 'text', text: result }] };
    }
  );

  server.tool('updateAccount',
    getToolDescription('updateAccount'),
    {
      itemId: z.string(),
      name: z.string().optional(),
      status: z.number().optional().describe('Account Status: 0=On hold, 4=Client, 13=Past Client, 17=New Biz'),
      status5: z.number().optional().describe('Type: 0=Agency, 1=Agency Group, 2=Partner, 3=Publisher, 4=Publisher Lead, 107=Advertiser'),
      people: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      text: z.string().optional(),
      contactsId: z.string().optional(),
      opportunitiesId: z.string().optional(),
      leadsId: z.string().optional()
    },
    async (input) => {
      const result = await updateAccount(input as Parameters<typeof updateAccount>[0]);
      return { content: [{ type: 'text', text: result }] };
    }
  );

  // Create/Update tools - Contacts
  server.tool('createContact',
    getToolDescription('createContact'),
    {
      name: z.string(),
      status: z.number().optional().describe('Department: 0=CEO/C-Suite, 1=Sales Director, 2=Sales Manager, 3=Head of Programmatic/Media, 10=AdOps, 102=Marketing, 103=Finance, 104=Data/Engineering/Tech, 108=Head of Creative'),
      people: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      text: z.string().optional(),
      accountId: z.string().optional(),
      opportunitiesId: z.string().optional(),
      leadsId: z.string().optional(),
      groupId: z.string().optional()
    },
    async (input) => {
      const result = await createContact(input as Parameters<typeof createContact>[0]);
      return { content: [{ type: 'text', text: result }] };
    }
  );

  server.tool('updateContact',
    getToolDescription('updateContact'),
    {
      itemId: z.string(),
      name: z.string().optional(),
      status: z.number().optional().describe('Department: 0=CEO/C-Suite, 1=Sales Director, 2=Sales Manager, 3=Head of Programmatic/Media, 10=AdOps, 102=Marketing, 103=Finance, 104=Data/Engineering/Tech, 108=Head of Creative'),
      people: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      text: z.string().optional(),
      accountId: z.string().optional(),
      opportunitiesId: z.string().optional(),
      leadsId: z.string().optional()
    },
    async (input) => {
      const result = await updateContact(input as Parameters<typeof updateContact>[0]);
      return { content: [{ type: 'text', text: result }] };
    }
  );

  // Create/Update tools - Leads
  server.tool('createLead',
    getToolDescription('createLead'),
    {
      name: z.string(),
      status: z.number().optional().describe('Lead Status: 0=Nurturing, 5=Closed Lost, 15=Lead, 20=Reached-out, 21=Connected, 22=Evaluated, 24=Qualified'),
      status1: z.number().optional().describe('Lead Rating: 0=Hot, 1=Warm, 2=Cold'),
      status_12: z.number().optional().describe('Tier: 0=1, 1=2, 2=3, 3=4'),
      people: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      text: z.string().optional(),
      accountId: z.string().optional(),
      contactId: z.string().optional(),
      opportunitiesId: z.string().optional(),
      groupId: z.string().optional()
    },
    async (input) => {
      const result = await createLead(input as Parameters<typeof createLead>[0]);
      return { content: [{ type: 'text', text: result }] };
    }
  );

  server.tool('updateLead',
    getToolDescription('updateLead'),
    {
      itemId: z.string(),
      name: z.string().optional(),
      status: z.number().optional().describe('Lead Status: 0=Nurturing, 5=Closed Lost, 15=Lead, 20=Reached-out, 21=Connected, 22=Evaluated, 24=Qualified'),
      status1: z.number().optional().describe('Lead Rating: 0=Hot, 1=Warm, 2=Cold'),
      status_12: z.number().optional().describe('Tier: 0=1, 1=2, 2=3, 3=4'),
      people: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      text: z.string().optional(),
      accountId: z.string().optional(),
      contactId: z.string().optional(),
      opportunitiesId: z.string().optional()
    },
    async (input) => {
      const result = await updateLead(input as Parameters<typeof updateLead>[0]);
      return { content: [{ type: 'text', text: result }] };
    }
  );

  // Create/Update tools - Opportunities
  server.tool('createOpportunity',
    getToolDescription('createOpportunity'),
    {
      name: z.string(),
      status: z.number().optional().describe('Opportunity Stage: 0=Lead, 1=Lead Nurturing, 2=Meeting, 3=Negotiation, 4=Legal, 5=Sent Commercial, 7=Closed Lost, 9=Closed Won, 101=Pilot'),
      people: z.string().optional(),
      status_14: z.number().optional().describe('Product Type: 0=Display, 2=Video, 3=Display + Video, 5=OOH/DOOH, 8=Display + Video + OOH/DOOH, 10=Display + OOH/DOOH, 11=Video + OOH/DOOH'),
      numbers: z.number().optional(),
      leadId: z.string().optional(),
      accountId: z.string().optional(),
      contactId: z.string().optional(),
      groupId: z.string().optional()
    },
    async (input) => {
      const result = await createOpportunity(input as Parameters<typeof createOpportunity>[0]);
      return { content: [{ type: 'text', text: result }] };
    }
  );

  server.tool('updateOpportunity',
    getToolDescription('updateOpportunity'),
    {
      itemId: z.string(),
      name: z.string().optional(),
      status: z.number().optional().describe('Opportunity Stage: 0=Lead, 1=Lead Nurturing, 2=Meeting, 3=Negotiation, 4=Legal, 5=Sent Commercial, 7=Closed Lost, 9=Closed Won, 101=Pilot'),
      people: z.string().optional(),
      status_14: z.number().optional().describe('Product Type: 0=Display, 2=Video, 3=Display + Video, 5=OOH/DOOH, 8=Display + Video + OOH/DOOH, 10=Display + OOH/DOOH, 11=Video + OOH/DOOH'),
      numbers: z.number().optional(),
      leadId: z.string().optional(),
      accountId: z.string().optional(),
      contactId: z.string().optional()
    },
    async (input) => {
      const result = await updateOpportunity(input as Parameters<typeof updateOpportunity>[0]);
      return { content: [{ type: 'text', text: result }] };
    }
  );

  // Create/Update tools - Sales Activities
  server.tool('createSalesActivity',
    getToolDescription('createSalesActivity'),
    {
      name: z.string(),
      status: z.number().optional().describe('Status: 0=To do, 1=Done, 2=Meeting canceled, 6=No meeting yet'),
      dropdown: z.number().optional().describe('Activity Type: 0=Email, 1=Phone, 2=Call, 3=Meeting, 7=Note'),
      people: z.string().optional(),
      date: z.string().optional(),
      text: z.string().optional(),
      accountId: z.string().optional(),
      opportunityId: z.string().optional(),
      leadId: z.string().optional(),
      contactId: z.string().optional(),
      groupId: z.string().optional()
    },
    async (input) => {
      const result = await createSalesActivity(input as Parameters<typeof createSalesActivity>[0]);
      return { content: [{ type: 'text', text: result }] };
    }
  );

  server.tool('updateSalesActivity',
    getToolDescription('updateSalesActivity'),
    {
      itemId: z.string(),
      name: z.string().optional(),
      status: z.number().optional().describe('Status: 0=To do, 1=Done, 2=Meeting canceled, 6=No meeting yet'),
      dropdown: z.number().optional().describe('Activity Type: 0=Email, 1=Phone, 2=Call, 3=Meeting, 7=Note'),
      people: z.string().optional(),
      date: z.string().optional(),
      text: z.string().optional(),
      accountId: z.string().optional(),
      opportunityId: z.string().optional(),
      leadId: z.string().optional(),
      contactId: z.string().optional()
    },
    async (input) => {
      const result = await updateSalesActivity(input as Parameters<typeof updateSalesActivity>[0]);
      return { content: [{ type: 'text', text: result }] };
    }
  );

  // Create/Update tools - Bugs
  server.tool('createBug',
    getToolDescription('createBug'),
    {
      name: z.string(),
      status: z.number().optional().describe('Status: 0=Open, 1=Fixed, 2=In Progress, 3=Pending Review, 4=Cancelled, 5=Investigating, 6=Won\'t Fix, 107=Retest'),
      priority: z.number().optional().describe('Priority: 0=Critical, 1=High, 2=Medium, 3=Low, 4=Best Effort'),
      dropdown: z.number().optional().describe('Type: 0=Bug, 1=Improvement, 2=Infrastructure, 3=Feature Request, 4=UI'),
      people: z.string().optional(),
      long_text: z.string().optional(),
      text: z.string().optional(),
      groupId: z.string().optional()
    },
    async (input) => {
      const result = await createBug(input as Parameters<typeof createBug>[0]);
      return { content: [{ type: 'text', text: result }] };
    }
  );

  server.tool('updateBug',
    getToolDescription('updateBug'),
    {
      itemId: z.string(),
      name: z.string().optional(),
      status: z.number().optional().describe('Status: 0=Open, 1=Fixed, 2=In Progress, 3=Pending Review, 4=Cancelled, 5=Investigating, 6=Won\'t Fix, 107=Retest'),
      priority: z.number().optional().describe('Priority: 0=Critical, 1=High, 2=Medium, 3=Low, 4=Best Effort'),
      dropdown: z.number().optional().describe('Type: 0=Bug, 1=Improvement, 2=Infrastructure, 3=Feature Request, 4=UI'),
      people: z.string().optional(),
      long_text: z.string().optional(),
      text: z.string().optional()
    },
    async (input) => {
      const result = await updateBug(input as Parameters<typeof updateBug>[0]);
      return { content: [{ type: 'text', text: result }] };
    }
  );

  // Create/Update tools - Tasks (AdOps)
  server.tool('createTaskAdOps',
    getToolDescription('createTaskAdOps'),
    {
      name: z.string(),
      status: z.number().optional().describe('Status: 0=Done, 3=Working on it, 4=New, 5=Waiting/On hold, 6=Ready to work, 8=Test pending, 9=Not doing, 10=In review, 11=Stuck'),
      priority: z.number().optional().describe('Priority: 0=Critical, 1=High, 2=Medium, 3=Low'),
      people: z.string().optional(),
      date4: z.string().optional(),
      text: z.string().optional(),
      groupId: z.string().optional()
    },
    async (input) => {
      const result = await createTaskAdOps(input as Parameters<typeof createTaskAdOps>[0]);
      return { content: [{ type: 'text', text: result }] };
    }
  );

  server.tool('updateTaskAdOps',
    getToolDescription('updateTaskAdOps'),
    {
      itemId: z.string(),
      name: z.string().optional(),
      status: z.number().optional().describe('Status: 0=Done, 3=Working on it, 4=New, 5=Waiting/On hold, 6=Ready to work, 8=Test pending, 9=Not doing, 10=In review, 11=Stuck'),
      priority: z.number().optional().describe('Priority: 0=Critical, 1=High, 2=Medium, 3=Low'),
      people: z.string().optional(),
      date4: z.string().optional(),
      text: z.string().optional()
    },
    async (input) => {
      const result = await updateTaskAdOps(input as Parameters<typeof updateTaskAdOps>[0]);
      return { content: [{ type: 'text', text: result }] };
    }
  );

  // Create/Update tools - Tasks (Marketing)
  server.tool('createTaskMarketing',
    getToolDescription('createTaskMarketing'),
    {
      name: z.string(),
      status: z.number().optional().describe('Status: 0=In Review, 1=Done, 2=Rejected, 3=Planned, 4=In Progress, 5=Missing Status, 6=Waiting On Others, 7=New, 8=On Hold'),
      priority: z.number().optional().describe('Priority: 0=Critical, 1=High, 2=Medium, 3=Low'),
      people: z.string().optional(),
      date: z.string().optional(),
      long_text: z.string().optional(),
      groupId: z.string().optional()
    },
    async (input) => {
      const result = await createTaskMarketing(input as Parameters<typeof createTaskMarketing>[0]);
      return { content: [{ type: 'text', text: result }] };
    }
  );

  server.tool('updateTaskMarketing',
    getToolDescription('updateTaskMarketing'),
    {
      itemId: z.string(),
      name: z.string().optional(),
      status: z.number().optional().describe('Status: 0=In Review, 1=Done, 2=Rejected, 3=Planned, 4=In Progress, 5=Missing Status, 6=Waiting On Others, 7=New, 8=On Hold'),
      priority: z.number().optional().describe('Priority: 0=Critical, 1=High, 2=Medium, 3=Low'),
      people: z.string().optional(),
      date: z.string().optional(),
      long_text: z.string().optional()
    },
    async (input) => {
      const result = await updateTaskMarketing(input as Parameters<typeof updateTaskMarketing>[0]);
      return { content: [{ type: 'text', text: result }] };
    }
  );

  // Create/Update tools - Tasks (AdTech)
  server.tool('createTaskAdTech',
    getToolDescription('createTaskAdTech'),
    {
      name: z.string(),
      status: z.number().optional().describe('Status: 0=Done, 2=In Progress, 3=New, 5=On Hold, 6=Waiting, 7=Blocked'),
      priority: z.number().optional().describe('Priority: 0=Critical, 1=High, 2=Medium, 3=Low'),
      people: z.string().optional(),
      date4: z.string().optional(),
      text: z.string().optional(),
      groupId: z.string().optional()
    },
    async (input) => {
      const result = await createTaskAdTech(input as Parameters<typeof createTaskAdTech>[0]);
      return { content: [{ type: 'text', text: result }] };
    }
  );

  server.tool('updateTaskAdTech',
    getToolDescription('updateTaskAdTech'),
    {
      itemId: z.string(),
      name: z.string().optional(),
      status: z.number().optional().describe('Status: 0=Done, 2=In Progress, 3=New, 5=On Hold, 6=Waiting, 7=Blocked'),
      priority: z.number().optional().describe('Priority: 0=Critical, 1=High, 2=Medium, 3=Low'),
      people: z.string().optional(),
      date4: z.string().optional(),
      text: z.string().optional()
    },
    async (input) => {
      const result = await updateTaskAdTech(input as Parameters<typeof updateTaskAdTech>[0]);
      return { content: [{ type: 'text', text: result }] };
    }
  );

  // Create/Update tools - Tasks (Video)
  server.tool('createTaskVideo',
    getToolDescription('createTaskVideo'),
    {
      name: z.string(),
      status: z.number().optional().describe('Status: 0=Done, 1=Working on it, 2=Stuck, 3=On Hold, 9=New, 102=Missing Status'),
      priority: z.number().optional().describe('Priority: 0=Critical, 1=High, 2=Medium, 3=Low'),
      people: z.string().optional(),
      date4: z.string().optional(),
      text: z.string().optional(),
      groupId: z.string().optional()
    },
    async (input) => {
      const result = await createTaskVideo(input as Parameters<typeof createTaskVideo>[0]);
      return { content: [{ type: 'text', text: result }] };
    }
  );

  server.tool('updateTaskVideo',
    getToolDescription('updateTaskVideo'),
    {
      itemId: z.string(),
      name: z.string().optional(),
      status: z.number().optional().describe('Status: 0=Done, 1=Working on it, 2=Stuck, 3=On Hold, 9=New, 102=Missing Status'),
      priority: z.number().optional().describe('Priority: 0=Critical, 1=High, 2=Medium, 3=Low'),
      people: z.string().optional(),
      date4: z.string().optional(),
      text: z.string().optional()
    },
    async (input) => {
      const result = await updateTaskVideo(input as Parameters<typeof updateTaskVideo>[0]);
      return { content: [{ type: 'text', text: result }] };
    }
  );

  // Create/Update tools - Tasks (Yield Growth)
  server.tool('createTaskYieldGrowth',
    getToolDescription('createTaskYieldGrowth'),
    {
      name: z.string(),
      status: z.number().optional().describe('Status: 0=Done, 1=Working on it, 2=Stuck, 3=Waiting for review, 5=Not started'),
      priority: z.number().optional().describe('Priority: 0=Critical, 1=High, 2=Medium, 3=Low'),
      people: z.string().optional(),
      date4: z.string().optional(),
      text: z.string().optional(),
      groupId: z.string().optional()
    },
    async (input) => {
      const result = await createTaskYieldGrowth(input as Parameters<typeof createTaskYieldGrowth>[0]);
      return { content: [{ type: 'text', text: result }] };
    }
  );

  server.tool('updateTaskYieldGrowth',
    getToolDescription('updateTaskYieldGrowth'),
    {
      itemId: z.string(),
      name: z.string().optional(),
      status: z.number().optional().describe('Status: 0=Done, 1=Working on it, 2=Stuck, 3=Waiting for review, 5=Not started'),
      priority: z.number().optional().describe('Priority: 0=Critical, 1=High, 2=Medium, 3=Low'),
      people: z.string().optional(),
      date4: z.string().optional(),
      text: z.string().optional()
    },
    async (input) => {
      const result = await updateTaskYieldGrowth(input as Parameters<typeof updateTaskYieldGrowth>[0]);
      return { content: [{ type: 'text', text: result }] };
    }
  );

  // Create/Update tools - OKRs
  server.tool('createOKR',
    getToolDescription('createOKR'),
    {
      name: z.string(),
      status: z.number().optional().describe('Status: 0=On Track, 1=At Risk, 2=Off Track, 3=Completed, 5=Not Started'),
      people: z.string().optional(),
      numbers: z.number().optional(),
      date: z.string().optional(),
      long_text: z.string().optional(),
      teamId: z.string().optional(),
      groupId: z.string().optional()
    },
    async (input) => {
      const result = await createOKR(input as Parameters<typeof createOKR>[0]);
      return { content: [{ type: 'text', text: result }] };
    }
  );

  server.tool('updateOKR',
    getToolDescription('updateOKR'),
    {
      itemId: z.string(),
      name: z.string().optional(),
      status: z.number().optional().describe('Status: 0=On Track, 1=At Risk, 2=Off Track, 3=Completed, 5=Not Started'),
      people: z.string().optional(),
      numbers: z.number().optional(),
      date: z.string().optional(),
      long_text: z.string().optional(),
      teamId: z.string().optional()
    },
    async (input) => {
      const result = await updateOKR(input as Parameters<typeof updateOKR>[0]);
      return { content: [{ type: 'text', text: result }] };
    }
  );

  // Create/Update tools - Deals
  server.tool('createDeal',
    getToolDescription('createDeal'),
    {
      name: z.string(),
      status: z.number().optional().describe('Deal Stage: 0=Lead, 1=Meeting, 2=Proposal, 3=Negotiation, 9=Won, 5=Lost'),
      status5: z.number().optional().describe('Deal Type: 0=New Business, 1=Expansion, 2=Renewal'),
      people: z.string().optional(),
      numbers: z.number().optional(),
      date: z.string().optional(),
      accountId: z.string().optional(),
      contactId: z.string().optional(),
      opportunityId: z.string().optional(),
      groupId: z.string().optional()
    },
    async (input) => {
      const result = await createDeal(input as Parameters<typeof createDeal>[0]);
      return { content: [{ type: 'text', text: result }] };
    }
  );

  server.tool('updateDeal',
    getToolDescription('updateDeal'),
    {
      itemId: z.string(),
      name: z.string().optional(),
      status: z.number().optional().describe('Deal Stage: 0=Lead, 1=Meeting, 2=Proposal, 3=Negotiation, 9=Won, 5=Lost'),
      status5: z.number().optional().describe('Deal Type: 0=New Business, 1=Expansion, 2=Renewal'),
      people: z.string().optional(),
      numbers: z.number().optional(),
      date: z.string().optional(),
      accountId: z.string().optional(),
      contactId: z.string().optional(),
      opportunityId: z.string().optional()
    },
    async (input) => {
      const result = await updateDeal(input as Parameters<typeof updateDeal>[0]);
      return { content: [{ type: 'text', text: result }] };
    }
  );

  // Create/Update tools - Tickets
  server.tool('createTicket',
    getToolDescription('createTicket'),
    {
      name: z.string(),
      status: z.number().optional().describe('Status: 0=New, 1=In Progress, 2=Waiting for Customer, 3=Resolved, 4=Closed'),
      priority: z.number().optional().describe('Priority: 0=Urgent, 1=High, 2=Medium, 3=Low'),
      people: z.string().optional(),
      email: z.string().optional(),
      text: z.string().optional(),
      long_text: z.string().optional(),
      date: z.string().optional(),
      groupId: z.string().optional()
    },
    async (input) => {
      const result = await createTicket(input as Parameters<typeof createTicket>[0]);
      return { content: [{ type: 'text', text: result }] };
    }
  );

  server.tool('updateTicket',
    getToolDescription('updateTicket'),
    {
      itemId: z.string(),
      name: z.string().optional(),
      status: z.number().optional().describe('Status: 0=New, 1=In Progress, 2=Waiting for Customer, 3=Resolved, 4=Closed'),
      priority: z.number().optional().describe('Priority: 0=Urgent, 1=High, 2=Medium, 3=Low'),
      people: z.string().optional(),
      email: z.string().optional(),
      text: z.string().optional(),
      long_text: z.string().optional(),
      date: z.string().optional()
    },
    async (input) => {
      const result = await updateTicket(input as Parameters<typeof updateTicket>[0]);
      return { content: [{ type: 'text', text: result }] };
    }
  );
});

// Export handler for Vercel Edge Runtime
export { handler as GET, handler as POST };