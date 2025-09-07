import { createToolTestSuite } from '../../utils/test-factory.js';
import { getFeatures } from '../../../lib/tools/development/getFeatures.js';

createToolTestSuite({
  toolName: 'getFeatures',
  toolFunction: getFeatures,
  boardKey: 'features',
  titleText: '# Features',
  
  parameters: {
    search: true,
    limit: true,
    statusFields: ['status', 'priority', 'complexity'],
    dateFields: ['planned_date', 'release_date'],
    customFields: [
      {
        param: 'people',
        type: 'string',
        testValue: 'admin'
      },
      {
        param: 'feature_type',
        type: 'string',
        testValue: 'Enhancement'
      }
    ]
  },
  
  testData: {
    validSearchTerms: ['api', 'ui', 'integration'],
    validStatusValues: [0, 1, 2, 3],
    validDateValues: ['2024-03-01', '2024-12-31']
  }
});