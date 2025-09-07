import { createToolTestSuite } from '../../utils/test-factory.js';
import { getTeams } from '../../../lib/tools/hr/getTeams.js';

createToolTestSuite({
  toolName: 'getTeams',
  toolFunction: getTeams,
  boardKey: 'teams',
  titleText: '# Teams',
  
  parameters: {
    search: true,
    limit: true,
    statusFields: ['status', 'team_type'],
    relationFields: [
      {
        param: 'peopleId',
        relatedTool: 'getPeople',
        relationName: 'Person'
      },
      {
        param: 'objectiveId',
        relatedTool: 'getOKR',
        relationName: 'Objective'
      }
    ],
    customFields: [
      {
        param: 'department',
        type: 'string',
        testValue: 'Sales'
      },
      {
        param: 'size',
        type: 'number',
        testValue: 10
      }
    ]
  },
  
  testData: {
    validSearchTerms: ['sales', 'engineering', 'marketing'],
    validStatusValues: [0, 1, 2],
  }
});