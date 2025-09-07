import { createToolTestSuite } from '../../utils/test-factory.js';
import { getPeople } from '../../../lib/tools/hr/getPeople.js';

createToolTestSuite({
  toolName: 'getPeople',
  toolFunction: getPeople,
  boardKey: 'people',
  titleText: '# People',
  
  parameters: {
    search: true,
    limit: true,
    statusFields: ['status', 'employment_status'],
    dateFields: ['start_date', 'birthday'],
    relationFields: [
      {
        param: 'teamId',
        relatedTool: 'getTeams',
        relationName: 'Team'
      }
    ],
    customFields: [
      {
        param: 'department',
        type: 'string',
        testValue: 'Engineering'
      },
      {
        param: 'location',
        type: 'string',
        testValue: 'Copenhagen'
      }
    ]
  },
  
  testData: {
    validSearchTerms: ['admin', 'manager', 'developer'],
    validStatusValues: [0, 1, 2],
    validDateValues: ['2024-01-01', '2024-06-15']
  }
});