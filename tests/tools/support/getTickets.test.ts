import { createToolTestSuite } from '../../utils/test-factory.js';
import { getTickets } from '../../../lib/tools/support/getTickets.js';

createToolTestSuite({
  toolName: 'getTickets',
  toolFunction: getTickets,
  boardKey: 'tickets',
  titleText: '# Support Tickets',
  
  parameters: {
    search: true,
    limit: true,
    statusFields: ['status', 'priority', 'ticket_type'],
    dateFields: ['created_date', 'resolved_date'],
    customFields: [
      {
        param: 'people',
        type: 'string',
        testValue: 'admin'
      },
      {
        param: 'category',
        type: 'string',
        testValue: 'Technical'
      }
    ]
  },
  
  testData: {
    validSearchTerms: ['bug', 'feature', 'support'],
    validStatusValues: [0, 1, 2, 3, 4],
    validDateValues: ['2024-01-01', '2024-12-31']
  }
});