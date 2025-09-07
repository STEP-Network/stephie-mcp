import { createToolTestSuite } from '../../utils/test-factory.js';
import { getMarketingBudgets } from '../../../lib/tools/marketing/getMarketingBudgets.js';

createToolTestSuite({
  toolName: 'getMarketingBudgets',
  toolFunction: getMarketingBudgets,
  boardKey: 'marketingBudgets',
  titleText: '# Budgets',
  
  parameters: {
    search: true,
    limit: true,
    statusFields: ['status', 'budget_type'],
    dateFields: ['budget_period', 'approval_date'],
    customFields: [
      {
        param: 'department',
        type: 'string',
        testValue: 'Digital'
      },
      {
        param: 'min_budget',
        type: 'number',
        testValue: 100000
      }
    ]
  },
  
  testData: {
    validSearchTerms: ['Q1', 'annual', 'digital'],
    validStatusValues: [0, 1, 2],
    validDateValues: ['2024-01-01', '2024-12-31']
  }
});