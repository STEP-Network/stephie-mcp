import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';

// Load board tool definitions
const boardToolDefinitions = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'boardToolDefinitions.json'), 'utf-8')
);

// Import all generated board tools
import { getAccountsItems } from '../tools/crm/getAccountsItems.js';
import { getBookingsItems } from '../tools/operations/getBookingsItems.js';
import { getBugsItems } from '../tools/development/getBugsItems.js';
import { getChangelogItems } from '../tools/development/getChangelogItems.js';
import { getContactsItems } from '../tools/crm/getContactsItems.js';
import { getDealsItems } from '../tools/sales/getDealsItems.js';
import { getFeaturesItems } from '../tools/development/getFeaturesItems.js';
import { getInternalAdOpsAdTechItems } from '../tools/operations/getInternalAdOpsAdTechItems.js';
import { getInternalAdSalesItems } from '../tools/sales/getInternalAdSalesItems.js';
import { getKeyResultsItems } from '../tools/okr/getKeyResultsItems.js';
import { getLeadsItems } from '../tools/crm/getLeadsItems.js';
import { getMarketingBudgetsItems } from '../tools/marketing/getMarketingBudgetsItems.js';
import { getMarketingExpensesItems } from '../tools/marketing/getMarketingExpensesItems.js';
import { getOKRItems } from '../tools/okr/getOKRItems.js';
import { getOpportunitiesItems } from '../tools/sales/getOpportunitiesItems.js';
import { getOTTPublishersItems } from '../tools/publishers/getOTTPublishersItems.js';
import { getPartnersItems } from '../tools/business/getPartnersItems.js';
import { getPeopleItems } from '../tools/hr/getPeopleItems.js';
import { getPlatformsItems } from '../tools/tech/getPlatformsItems.js';
import { getProcessesItems } from '../tools/operations/getProcessesItems.js';
import { getPublisherFAQItems } from '../tools/support/getPublisherFAQItems.js';
import { getSalesActivitiesItems } from '../tools/sales/getSalesActivitiesItems.js';
import { getStrategiesItems } from '../tools/business/getStrategiesItems.js';
import { getTasksAdOpsItems } from '../tools/tasks/getTasksAdOpsItems.js';
import { getTasksAdTechItems } from '../tools/tasks/getTasksAdTechItems.js';
import { getTasksMarketingItems } from '../tools/tasks/getTasksMarketingItems.js';
import { getTasksTechIntelligenceItems } from '../tools/tasks/getTasksTechIntelligenceItems.js';
import { getTasksVideoItems } from '../tools/tasks/getTasksVideoItems.js';
import { getTasksYieldGrowthItems } from '../tools/tasks/getTasksYieldGrowthItems.js';
import { getTeamsItems } from '../tools/hr/getTeamsItems.js';
import { getTestsItems } from '../tools/development/getTestsItems.js';
import { getTicketsItems } from '../tools/support/getTicketsItems.js';
import { getVertikalerItems } from '../tools/business/getVertikalerItems.js';

// Map tool names to their implementations
const BOARD_TOOL_IMPLEMENTATIONS: Record<string, Function> = {
  getAccountsItems,
  getBookingsItems,
  getBugsItems,
  getChangelogItems,
  getContactsItems,
  getDealsItems,
  getFeaturesItems,
  getInternalAdOpsAdTechItems,
  getInternalAdSalesItems,
  getKeyResultsItems,
  getLeadsItems,
  getMarketingBudgetsItems,
  getMarketingExpensesItems,
  getOKRItems,
  getOpportunitiesItems,
  getOTTPublishersItems,
  getPartnersItems,
  getPeopleItems,
  getPlatformsItems,
  getProcessesItems,
  getPublisherFAQItems,
  getSalesActivitiesItems,
  getStrategiesItems,
  getTasksAdOpsItems,
  getTasksAdTechItems,
  getTasksMarketingItems,
  getTasksTechIntelligenceItems,
  getTasksVideoItems,
  getTasksYieldGrowthItems,
  getTeamsItems,
  getTestsItems,
  getTicketsItems,
  getVertikalerItems,
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