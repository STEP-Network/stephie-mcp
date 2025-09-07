import { createToolTestSuite } from '../../utils/test-factory.js';
import { getContacts } from '../../../lib/tools/crm/getContacts.js';

createToolTestSuite({
  toolName: 'getContacts',
  toolFunction: getContacts,
  boardKey: 'contacts',
  titleText: '# Contacts',
  
  parameters: {
    search: true,
    limit: true,
    statusFields: ['status', 'contact_type'],
    dateFields: ['created_date', 'last_activity_date'],
    relationFields: [
      {
        param: 'accountId',
        relatedTool: 'getAccounts',
        relationName: 'Account'
      }
    ],
    customFields: [
      {
        param: 'people',
        type: 'string',
        testValue: 'admin'
      },
      {
        param: 'job_title',
        type: 'string',
        testValue: 'Manager'
      }
    ]
  },
  
  testData: {
    validSearchTerms: ['john', 'maria', 'manager'],
    validStatusValues: [0, 1, 2],
    validDateValues: ['2024-02-01', '2024-07-31']
  }
});