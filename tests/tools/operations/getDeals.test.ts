import { createToolTestSuite } from '../../utils/test-factory.js';
import { getDeals } from '../../../lib/tools/operations/getDeals.js';

createToolTestSuite({
  toolName: 'getDeals',
  toolFunction: getDeals,
  boardKey: 'deals',
  titleText: '# Deals',
  
  parameters: {
    search: true,
    limit: true,
    statusFields: ['status', 'deal_stage'],
    dateFields: ['close_date', 'created_at'],
    customFields: [
      {
        param: 'people',
        type: 'string',
        testValue: 'admin'
      },
      {
        param: 'deal_value',
        type: 'number',
        testValue: 100000
      }
    ]
  },
  
  testData: {
    validSearchTerms: ['enterprise', 'annual', 'Q2'],
    validStatusValues: [0, 1, 2, 3],
    validDateValues: ['2024-02-01', '2024-07-15']
  }
});