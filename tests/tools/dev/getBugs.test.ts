import { createToolTestSuite } from '../../utils/test-factory.js';
import { getBugs } from '../../../lib/tools/development/getBugs.js';

createToolTestSuite({
  toolName: 'getBugs',
  toolFunction: getBugs,
  boardKey: 'bugs',
  titleText: '# Bugs',
  
  parameters: {
    search: true,
    limit: true,
    statusFields: ['status', 'severity', 'priority'],
    dateFields: ['reported_date', 'fixed_date'],
    customFields: [
      {
        param: 'people',
        type: 'string',
        testValue: 'admin'
      },
      {
        param: 'component',
        type: 'string',
        testValue: 'Frontend'
      }
    ]
  },
  
  testData: {
    validSearchTerms: ['crash', 'error', 'performance'],
    validStatusValues: [0, 1, 2, 3, 4],
    validDateValues: ['2024-02-01', '2024-11-30']
  }
});