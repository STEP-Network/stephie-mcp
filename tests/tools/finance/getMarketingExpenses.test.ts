import { createToolTestSuite } from '../../utils/test-factory.js';
import { getMarketingExpenses } from '../../../lib/tools/marketing/getMarketingExpenses.js';

createToolTestSuite({
  toolName: 'getMarketingExpenses',
  toolFunction: getMarketingExpenses,
  boardKey: 'marketingExpenses',
  titleText: '# Expenses',
  
  parameters: {
    search: true,
    limit: true,
    statusFields: ['status', 'expense_type', 'approval_status'],
    dateFields: ['expense_date', 'payment_date'],
    customFields: [
      {
        param: 'vendor',
        type: 'string',
        testValue: 'Google'
      },
      {
        param: 'min_amount',
        type: 'number',
        testValue: 5000
      }
    ]
  },
  
  testData: {
    validSearchTerms: ['campaign', 'google', 'facebook'],
    validStatusValues: [0, 1, 2, 3],
    validDateValues: ['2024-01-15', '2024-11-30']
  }
});