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

// CRM Tools
import { getAccounts } from './lib/tools/crm/getAccounts.js';
import { getContacts } from './lib/tools/crm/getContacts.js';
import { getLeads } from './lib/tools/crm/getLeads.js';

// HR Tools
import { getPeople } from './lib/tools/hr/getPeople.js';
import { getTeams } from './lib/tools/hr/getTeams.js';

// Sales Tools
import { getOpportunities } from './lib/tools/sales/getOpportunities.js';
import { getSalesActivities } from './lib/tools/sales/getSalesActivities.js';
import { getInternalAdSales } from './lib/tools/sales/getInternalAdSales.js';
import { getDeals } from './lib/tools/sales/getDeals.js';

// Tasks Tools
import { getTasksAdOps } from './lib/tools/tasks/getTasksAdOps.js';
import { getTasksMarketing } from './lib/tools/tasks/getTasksMarketing.js';
import { getTasksAdTech } from './lib/tools/tasks/getTasksAdTech.js';
import { getTasksVideo } from './lib/tools/tasks/getTasksVideo.js';
import { getTasksYieldGrowth } from './lib/tools/tasks/getTasksYieldGrowth.js';
import { getTasksTechIntelligence } from './lib/tools/tasks/getTasksTechIntelligence.js';
import { createTaskTechIntelligence } from './lib/tools/tasks/createTaskTechIntelligence.js';
import { updateTaskTechIntelligence } from './lib/tools/tasks/updateTaskTechIntelligence.js';

// Development Tools
import { getBugs } from './lib/tools/development/getBugs.js';
import { getChangelog } from './lib/tools/development/getChangelog.js';
import { getFeatures } from './lib/tools/development/getFeatures.js';
import { getTests } from './lib/tools/development/getTests.js';

// Business Tools
import { getPartners } from './lib/tools/business/getPartners.js';
import { getStrategies } from './lib/tools/business/getStrategies.js';
import { getVertikaler } from './lib/tools/business/getVertikaler.js';

// Marketing Tools
import { getMarketingBudgets } from './lib/tools/marketing/getMarketingBudgets.js';
import { getMarketingExpenses } from './lib/tools/marketing/getMarketingExpenses.js';

// OKR Tools
import { getOKR } from './lib/tools/okr/getOKR.js';

// Operations Tools
import { getBookings } from './lib/tools/operations/getBookings.js';
import { getInternalAdOpsAdTech } from './lib/tools/operations/getInternalAdOpsAdTech.js';
import { getProcesses } from './lib/tools/operations/getProcesses.js';

// Support Tools
import { getTickets } from './lib/tools/support/getTickets.js';
import { getPublisherFAQ } from './lib/tools/support/getPublisherFAQ.js';

// Publishers Tools
import { getOTTPublishers } from './lib/tools/publishers/getOTTPublishers.js';

// Tech Tools
import { getPlatforms } from './lib/tools/tech/getPlatforms.js';

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
  
  // CRM Tools
  getAccounts: (args) => getAccounts(args),
  getContacts: (args) => getContacts(args),
  getLeads: (args) => getLeads(args),
  
  // HR Tools
  getPeople: (args) => getPeople(args),
  getTeams: (args) => getTeams(args),
  
  // Sales Tools
  getOpportunities: (args) => getOpportunities(args),
  getSalesActivities: (args) => getSalesActivities(args),
  getInternalAdSales: (args) => getInternalAdSales(args),
  getDeals: (args) => getDeals(args),
  
  // Tasks Tools
  getTasksAdOps: (args) => getTasksAdOps(args),
  getTasksMarketing: (args) => getTasksMarketing(args),
  getTasksAdTech: (args) => getTasksAdTech(args),
  getTasksVideo: (args) => getTasksVideo(args),
  getTasksYieldGrowth: (args) => getTasksYieldGrowth(args),
  getTasksTechIntelligence: (args) => getTasksTechIntelligence(args),
  createTaskTechIntelligence: (args) => createTaskTechIntelligence(args as any),
  updateTaskTechIntelligence: (args) => updateTaskTechIntelligence(args as any),
  
  // Development Tools
  getBugs: (args) => getBugs(args),
  getChangelog: (args) => getChangelog(args),
  getFeatures: (args) => getFeatures(args),
  getTests: (args) => getTests(args),
  
  // Business Tools
  getPartners: (args) => getPartners(args),
  getStrategies: (args) => getStrategies(args),
  getVertikaler: (args) => getVertikaler(args),
  
  // Marketing Tools
  getMarketingBudgets: (args) => getMarketingBudgets(args),
  getMarketingExpenses: (args) => getMarketingExpenses(args),
  
  // OKR Tools
  getOKR: (args) => getOKR(args),
  
  // Operations Tools
  getBookings: (args) => getBookings(args),
  getInternalAdOpsAdTech: (args) => getInternalAdOpsAdTech(args),
  getProcesses: (args) => getProcesses(args),
  
  // Support Tools
  getTickets: (args) => getTickets(args),
  getPublisherFAQ: (args) => getPublisherFAQ(args),
  
  // Publishers Tools
  getOTTPublishers: (args) => getOTTPublishers(args),
  
  // Tech Tools
  getPlatforms: (args) => getPlatforms(args),
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