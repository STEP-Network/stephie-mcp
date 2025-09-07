# STEPhie MCP Testing System

## Overview

This is a comprehensive testing system for all Monday.com tools in the STEPhie MCP Server. The system validates that every tool works correctly with all supported filters and parameters, ensuring data accuracy and proper formatting.

## Architecture

### Testing Framework
- **Vitest**: Modern testing framework with TypeScript support
- **Real Data Testing**: Uses actual Monday.com data for realistic validation
- **Automated Validation**: Comprehensive validators for output format, filtering, pagination

### Test Structure
```
tests/
├── setup.ts                 # Test environment setup
├── run-all-tests.ts        # Comprehensive test runner
├── quick-test.ts           # Quick validation for individual tools
├── utils/
│   ├── collect-test-data.ts    # Fetches 500 items from each board
│   ├── validators.ts            # Output validation functions
│   ├── test-helpers.ts          # Test utilities and data loading
│   └── test-factory.ts          # Generic test suite generator
├── fixtures/
│   └── test-data.json          # Cached Monday.com test data
├── reports/                    # Test execution reports
└── tools/
    ├── crm/                    # CRM tool tests
    ├── sales/                  # Sales tool tests
    ├── tasks/                  # Task tool tests
    └── ...                     # Other categories
```

## Quick Start

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Set Environment Variables
```bash
# .env.local
MONDAY_API_KEY=your-api-key
TEST_AUTH_TOKEN=test-token
```

### 3. Collect Test Data
```bash
# Fetch 500 items from each Monday.com board
pnpm test:collect-data
```

### 4. Run Tests
```bash
# Run all tests with fresh data
pnpm test:all-fresh

# Run all tests with cached data
pnpm test:all

# Run specific tool test
pnpm test:quick getAccounts

# Interactive test UI
pnpm test:ui

# Run with coverage
pnpm test:coverage
```

## Test Coverage

### What We Test

#### 1. Basic Functionality
- Valid markdown output format
- Required fields presence (ID, Total Items)
- Empty result handling

#### 2. Pagination
- Limit parameter respect (0, 1, 5, 100, 10000)
- Edge case handling
- Consistent item counts

#### 3. Search Functionality
- Text search filtering
- Special character handling (&, %, (), quotes)
- Case sensitivity

#### 4. Status Filters
- All status field variations
- Invalid status value handling
- Multiple status combinations

#### 5. Date Filters
- Date field filtering
- Invalid date format handling
- Date range queries

#### 6. Board Relations
- Cross-board filtering (accountId, contactId, etc.)
- Invalid relation ID handling
- Multiple relation filters

#### 7. Combined Filters
- Multiple parameter combinations
- Filter precedence
- Result consistency

#### 8. Error Handling
- Invalid parameter values
- Extremely large limits
- Malformed queries

#### 9. Performance
- Response time (<10 seconds)
- Parallel request handling
- Memory usage

### Tools Tested (30+)

**CRM Tools:**
- getAccounts
- getContacts
- getLeads

**Sales Tools:**
- getOpportunities
- getSalesActivities
- getBookings
- getDeals

**Task Tools:**
- getTasksTechIntelligence
- getTasksAdOps
- getTasksMarketing

**HR Tools:**
- getPeople
- getTeams

**Strategy Tools:**
- getOKR

**Support Tools:**
- getTickets

**Development Tools:**
- getBugs
- getFeatures

**Finance Tools:**
- getMarketingBudgets
- getMarketingExpenses

## Test Factory

The test factory (`test-factory.ts`) generates consistent test suites for all tools:

```typescript
createToolTestSuite({
  toolName: 'getAccounts',
  toolFunction: getAccounts,
  boardKey: 'accounts',
  titleText: '# Accounts',
  
  parameters: {
    search: true,
    limit: true,
    statusFields: ['status', 'status5'],
    dateFields: ['date', 'created_at'],
    relationFields: [{
      param: 'contactsId',
      relatedTool: 'getContacts',
      relationName: 'Contact'
    }]
  },
  
  testData: {
    validSearchTerms: ['test', 'demo'],
    validStatusValues: [0, 1, 2],
    validDateValues: ['2024-01-01']
  }
});
```

## Validation System

### Validators (`validators.ts`)

**validateToolOutput**: Ensures proper markdown structure
**validatePagination**: Verifies limit parameter respect
**validateSearch**: Confirms search term filtering
**validateStatusFilter**: Checks status value filtering
**validateRelationFilter**: Validates board relation filtering
**extractItemCount**: Parses total item count
**extractItemIds**: Extracts all item IDs

### Test Helpers (`test-helpers.ts`)

**loadTestData**: Loads cached Monday.com data
**getSampleIds**: Gets sample IDs for testing
**findItemWithColumn**: Finds items with specific values
**getRelatedIds**: Extracts linked item IDs
**TestTimer**: Performance measurement utility

## Test Data Collection

The `collect-test-data.ts` script:
1. Fetches 500 items from each Monday.com board
2. Includes all column data for comprehensive coverage
3. Handles pagination with 100-item batches
4. Saves to `fixtures/test-data.json`
5. Updates automatically with `--collect-data` flag

## Test Reports

The test runner generates comprehensive reports:

```
📊 TEST REPORT
================================================================================
📅 Timestamp: 2024-12-15T10:30:00Z
⏱️ Total Duration: 45.23s

📈 Overall Statistics:
  - Tools Tested: 20
  - Total Tests: 480
  - Passed: 475 (99.0%)
  - Failed: 5 (1.0%)
  - Skipped: 0

📁 By Category:
  crm:
    - Tools: 3
    - Tests: 72
    - Pass Rate: 100.0%
  sales:
    - Tools: 4
    - Tests: 96
    - Pass Rate: 98.0%

❌ Failed Tools:
  - getOpportunities: 2 failures
    First error: Status filter not applied correctly...

🐌 Slowest Tools:
  - getOKR: 3.45s
  - getAccounts: 2.89s

💾 Detailed report saved to: tests/reports/test-report-1234567890.json
```

## Continuous Integration

### GitHub Actions (recommended setup)
```yaml
name: Test Tools
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - name: Install dependencies
        run: pnpm install
      - name: Collect test data
        run: pnpm test:collect-data
        env:
          MONDAY_API_KEY: ${{ secrets.MONDAY_API_KEY }}
      - name: Run tests
        run: pnpm test:all
```

## Troubleshooting

### Common Issues

**"Test data not found"**
- Run `pnpm test:collect-data` first
- Check Monday.com API key is set

**"Tool function not found"**
- Ensure tool is exported from its module
- Check import paths in test files

**"Timeout exceeded"**
- Monday.com API may be slow
- Increase timeout in `vitest.config.ts`

**"Invalid status value"**
- Status indices may have changed
- Re-collect test data

### Debug Commands

```bash
# Test single tool with verbose output
TEST_AUTH_TOKEN=test-token npx vitest run tests/tools/crm/getAccounts.test.ts

# Run specific test
npx vitest -t "should respect limit parameter"

# Debug test data collection
npx tsx tests/utils/collect-test-data.ts
```

## Best Practices

1. **Always collect fresh data** before major test runs
2. **Use the test factory** for new tools to ensure consistency
3. **Add tool-specific tests** only when needed (e.g., OKR hierarchy)
4. **Update validators** when adding new output formats
5. **Monitor test performance** - tools should complete < 10s
6. **Cache test data** for faster development cycles
7. **Document edge cases** in test comments

## Adding New Tool Tests

1. Create test file in appropriate category folder
2. Use the test factory for standard tests
3. Add tool to TEST_CATEGORIES in run-all-tests.ts
4. Update quick-test.ts tool mapping
5. Run tests to verify

Example:
```typescript
// tests/tools/new-category/getNewTool.test.ts
import { createToolTestSuite } from '../../utils/test-factory.js';
import { getNewTool } from '../../../lib/tools/new-category/getNewTool.js';

createToolTestSuite({
  toolName: 'getNewTool',
  toolFunction: getNewTool,
  boardKey: 'newBoard',
  titleText: '# New Tool',
  parameters: {
    search: true,
    limit: true
  }
});
```

## Maintenance

### Weekly Tasks
- Run full test suite with fresh data
- Review failed tests and fix issues
- Update test data if board structure changes

### Monthly Tasks
- Review test coverage metrics
- Update validators for new features
- Optimize slow-running tests
- Archive old test reports

## Support

For issues or questions:
- Check test reports in `tests/reports/`
- Review debug output with verbose flag
- Consult CLAUDE.md for tool specifications
- Run quick-test for rapid validation