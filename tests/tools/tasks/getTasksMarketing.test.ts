import { createToolTestSuite } from '../../utils/test-factory.js';
import { getTasksMarketing } from '../../../lib/tools/tasks/getTasksMarketing.js';

createToolTestSuite({
  toolName: 'getTasksMarketing',
  toolFunction: getTasksMarketing,
  boardKey: 'tasksMarketing',
  titleText: '# Tasks - Marketing',
  
  parameters: {
    search: true,
    limit: true,
    statusFields: ['status', 'priority'],
    dateFields: ['due_date', 'launch_date'],
    customFields: [
      {
        param: 'people',
        type: 'string',
        testValue: 'admin'
      },
      {
        param: 'marketing_channel',
        type: 'string',
        testValue: 'Social'
      }
    ]
  },
  
  testData: {
    validSearchTerms: ['content', 'social', 'email'],
    validStatusValues: [0, 1, 2, 3],
    statusLabels: ['New', 'In Progress', 'Done', 'Stuck'],
    validDateValues: ['2024-05-01', '2024-10-31']
  }
});