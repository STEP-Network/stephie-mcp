import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';

// Load board tool definitions
const boardToolDefinitions = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'boardToolDefinitions.json'), 'utf-8')
);

// Import all generated board tools
import { getAccounts } from '../tools/crm/getAccounts.js';
import { getBookings } from '../tools/operations/getBookings.js';
import { getBugs } from '../tools/development/getBugs.js';
import { getChangelog } from '../tools/development/getChangelog.js';
import { getContacts } from '../tools/crm/getContacts.js';
import { getDeals } from '../tools/sales/getDeals.js';
import { getFeatures } from '../tools/development/getFeatures.js';
import { getInternalAdOpsAdTech } from '../tools/operations/getInternalAdOpsAdTech.js';
import { getInternalAdSales } from '../tools/sales/getInternalAdSales.js';
import { getLeads } from '../tools/crm/getLeads.js';
import { getMarketingBudgets } from '../tools/marketing/getMarketingBudgets.js';
import { getMarketingExpenses } from '../tools/marketing/getMarketingExpenses.js';
import { getOKR } from '../tools/okr/getOKR.js';
import { getOpportunities } from '../tools/sales/getOpportunities.js';
import { getOTTPublishers } from '../tools/publishers/getOTTPublishers.js';
import { getPartners } from '../tools/business/getPartners.js';
import { getPeople } from '../tools/hr/getPeople.js';
import { getPlatforms } from '../tools/tech/getPlatforms.js';
import { getProcesses } from '../tools/operations/getProcesses.js';
import { getPublisherFAQ } from '../tools/support/getPublisherFAQ.js';
import { getSalesActivities } from '../tools/sales/getSalesActivities.js';
import { getStrategies } from '../tools/business/getStrategies.js';
import { getTasksAdOps } from '../tools/tasks/getTasksAdOps.js';
import { getTasksAdTech } from '../tools/tasks/getTasksAdTech.js';
import { getTasksMarketing } from '../tools/tasks/getTasksMarketing.js';
import { getTasksTechIntelligence } from '../tools/tasks/getTasksTechIntelligence.js';
import { getTasksVideo } from '../tools/tasks/getTasksVideo.js';
import { getTasksYieldGrowth } from '../tools/tasks/getTasksYieldGrowth.js';
import { getTeams } from '../tools/hr/getTeams.js';
import { getTests } from '../tools/development/getTests.js';
import { getTickets } from '../tools/support/getTickets.js';
import { getVertikaler } from '../tools/business/getVertikaler.js';

// Map tool names to their implementations
const BOARD_TOOL_IMPLEMENTATIONS: Record<string, Function> = {
  getAccounts,
  getBookings,
  getBugs,
  getChangelog,
  getContacts,
  getDeals,
  getFeatures,
  getInternalAdOpsAdTech,
  getInternalAdSales,
  getLeads,
  getMarketingBudgets,
  getMarketingExpenses,
  getOKR,
  getOpportunities,
  getOTTPublishers,
  getPartners,
  getPeople,
  getPlatforms,
  getProcesses,
  getPublisherFAQ,
  getSalesActivities,
  getStrategies,
  getTasksAdOps,
  getTasksAdTech,
  getTasksMarketing,
  getTasksTechIntelligence,
  getTasksVideo,
  getTasksYieldGrowth,
  getTeams,
  getTests,
  getTickets,
  getVertikaler,
};

/**
 * Register all board-specific tools with the MCP server
 */
export function registerBoardTools(server: any) {
  boardToolDefinitions.forEach((toolDef: any) => {
    const implementation = BOARD_TOOL_IMPLEMENTATIONS[toolDef.name];
    
    if (!implementation) {
      console.error(`Warning: No implementation found for tool ${toolDef.name}`);
      return;
    }

    // Build Zod schema from the tool definition
    const schemaProperties: Record<string, any> = {};
    
    Object.entries(toolDef.inputSchema.properties).forEach(([key, prop]: [string, any]) => {
      if (prop.type === 'number') {
        schemaProperties[key] = prop.default !== undefined 
          ? z.number().default(prop.default).optional()
          : z.number().optional();
      } else if (prop.type === 'boolean') {
        schemaProperties[key] = z.boolean().optional();
      } else {
        schemaProperties[key] = z.string().optional();
      }
    });

    // Register the tool
    server.tool(
      toolDef.name,
      toolDef.description,
      schemaProperties,
      async (input: any) => {
        try {
          const result = await implementation(input);
          return { 
            content: [{ 
              type: 'text', 
              text: typeof result === 'string' ? result : JSON.stringify(result, null, 2) 
            }] 
          };
        } catch (error) {
          console.error(`Error in ${toolDef.name}:`, error);
          throw error;
        }
      }
    );
  });
  
  console.error(`Registered ${boardToolDefinitions.length} board-specific tools`);
}

// Export tool definitions for reference
export { boardToolDefinitions };