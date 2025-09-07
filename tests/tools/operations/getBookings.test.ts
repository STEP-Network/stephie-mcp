import { createToolTestSuite } from '../../utils/test-factory.js';
import { getBookings } from '../../../lib/tools/operations/getBookings.js';

createToolTestSuite({
  toolName: 'getBookings',
  toolFunction: getBookings,
  boardKey: 'bookings',
  titleText: '# Bookings',
  
  parameters: {
    search: true,
    limit: true,
    statusFields: ['status', 'booking_type'],
    dateFields: ['booking_date', 'execution_date'],
    relationFields: [
      {
        param: 'opportunityId',
        relatedTool: 'getOpportunities',
        relationName: 'Opportunity'
      }
    ],
    customFields: [
      {
        param: 'people',
        type: 'string',
        testValue: 'admin'
      },
      {
        param: 'min_amount',
        type: 'number',
        testValue: 50000
      }
    ]
  },
  
  testData: {
    validSearchTerms: ['campaign', 'Q1', 'display'],
    validStatusValues: [0, 1, 2, 3],
    validDateValues: ['2024-01-01', '2024-06-15']
  }
});