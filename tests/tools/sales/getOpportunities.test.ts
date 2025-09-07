import { createToolTestSuite } from '../../utils/test-factory.js';
import { getOpportunities } from '../../../lib/tools/sales/getOpportunities.js';

createToolTestSuite({
  toolName: 'getOpportunities',
  toolFunction: getOpportunities,
  boardKey: 'opportunities',
  titleText: '# Opportunities',
  
  parameters: {
    search: true,
    limit: true,
    statusFields: ['status', 'probability_level', 'timeline_status'],
    dateFields: ['expected_close_date', 'created_date'],
    relationFields: [
      {
        param: 'accountId',
        relatedTool: 'getAccounts',
        relationName: 'Account'
      },
      {
        param: 'contactId',
        relatedTool: 'getContacts',
        relationName: 'Contact'
      },
      {
        param: 'leadId',
        relatedTool: 'getLeads',
        relationName: 'Lead'
      }
    ],
    customFields: [
      {
        param: 'sales_stage',
        type: 'string',
        testValue: 'Negotiation'
      },
      {
        param: 'min_value',
        type: 'number',
        testValue: 100000
      }
    ]
  },
  
  testData: {
    validSearchTerms: ['deal', 'campaign', 'Q1'],
    validStatusValues: [0, 1, 2, 3],
    validDateValues: ['2024-01-01', '2024-06-15', '2024-12-31']
  }
});