# Dynamic Columns Migration Guide

## Overview
This guide explains how to migrate Monday.com tools from hardcoded column arrays to the dynamic column system using the Columns board.

## Current State
- **333 columns** are now tracked in the Columns board (ID: 2135717897)
- Each column is linked to its parent board via board relations
- Column IDs can be shared across boards (e.g., "name", "status", "owner")

## Migration Pattern

### Before (Hardcoded Columns)
```typescript
// ❌ Old approach - hardcoded column IDs
const query = `
  query {
    boards(ids: [1693359113]) {
      items_page(limit: ${limit}) {
        items {
          column_values(ids: ["name", "person", "status_1__1", "color_mkpwc7hm", "status_mkkw7ehb"]) {
            // ... hardcoded list of columns
          }
        }
      }
    }
  }
`;
```

### After (Dynamic Columns)
```typescript
// ✅ New approach - dynamic columns from Columns board
import { getDynamicColumns } from '../dynamic-columns.js';

const dynamicColumns = await getDynamicColumns(boardId);
const columnIds = dynamicColumns.map(id => `"${id}"`).join(', ');

const query = `
  query {
    boards(ids: [${boardId}]) {
      items_page(limit: ${limit}) {
        items {
          column_values(ids: [${columnIds}]) {
            // ... columns loaded dynamically
          }
        }
      }
    }
  }
`;
```

## Step-by-Step Migration

### 1. Import Dynamic Columns Function
```typescript
import { getDynamicColumns } from '../dynamic-columns.js';
```

### 2. Replace Hardcoded Board ID with Constant
```typescript
const BOARD_ID = '1693359113'; // Your board ID
const BOARD_NAME = 'Tasks - Marketing'; // For logging
```

### 3. Fetch Dynamic Columns
```typescript
// Get columns at the start of your function
const dynamicColumns = await getDynamicColumns(BOARD_ID);
console.error(`Loaded ${dynamicColumns.length} columns for ${BOARD_NAME}`);
```

### 4. Build Column IDs String
```typescript
const columnIds = dynamicColumns.map(id => `"${id}"`).join(', ');
```

### 5. Update GraphQL Query
Replace the hardcoded column array with the dynamic `columnIds`:
```typescript
column_values(ids: [${columnIds}])
```

### 6. Update Filters (if needed)
Check if filter columns exist in dynamic columns:
```typescript
if (keyResultId && dynamicColumns.includes('board_relation_mkpjg0ky')) {
  // Apply filter only if column exists
}
```

## Complete Example: getTasksMarketing

### Original (Hardcoded)
```typescript
export async function getTasksMarketing(params: any = {}) {
  const query = `
    query {
      boards(ids: [1693359113]) {
        items_page {
          items {
            column_values(ids: ["name", "person", "status_1__1", /* ... 10 more ... */]) {
              // ...
            }
          }
        }
      }
    }
  `;
  // ... rest of function
}
```

### Migrated (Dynamic)
```typescript
import { getDynamicColumns } from '../dynamic-columns.js';

export async function getTasksMarketing(params: any = {}) {
  const BOARD_ID = '1693359113';
  
  // Fetch columns dynamically
  const dynamicColumns = await getDynamicColumns(BOARD_ID);
  const columnIds = dynamicColumns.map(id => `"${id}"`).join(', ');
  
  const query = `
    query {
      boards(ids: [${BOARD_ID}]) {
        items_page {
          items {
            column_values(ids: [${columnIds}]) {
              // ...
            }
          }
        }
      }
    }
  `;
  // ... rest of function
}
```

## Benefits of Migration

### 1. **No More Hardcoded Arrays**
- Columns are centrally managed in the Columns board
- Changes to board columns automatically reflected

### 2. **Automatic Adaptation**
- When columns are added/removed from boards, tools automatically use the new set
- No code changes needed for column updates

### 3. **Better Maintenance**
- Single source of truth for column configurations
- Easy to audit which columns are used by which boards

### 4. **Performance**
- Built-in caching reduces API calls
- Second calls to same board use cached columns

## Tools to Migrate

### High Priority (Most Used)
- [ ] `getAccounts` - 25 columns
- [ ] `getContacts` - 15 columns
- [ ] `getOpportunities` - 28 columns
- [ ] `getLeads` - 11 columns
- [ ] `getTickets` - 21 columns

### Task Management
- [x] `getTasksMarketing` - 16 columns ✅ (Example completed)
- [ ] `getTasksTechIntelligence` - 18 columns
- [ ] `getTasksAdTech` - 16 columns
- [ ] `getTasksAdOps` - 17 columns
- [ ] `getTasksVideo` - 15 columns
- [ ] `getTasksYieldGrowth` - 14 columns

### Strategy & Planning
- [ ] `getStrategies` - 4 columns
- [ ] `getOKR` - 15 columns
- [ ] `getTeams` - 9 columns
- [ ] `getPeople` - 15 columns

### Sales & Finance
- [ ] `getSalesActivities` - 13 columns
- [ ] `getDeals` - 9 columns
- [ ] `getBookings` - 10 columns
- [ ] `getMarketingBudgets` - 6 columns
- [ ] `getMarketingExpenses` - 9 columns

## Testing After Migration

### 1. Verify Column Count
```typescript
const columns = await getDynamicColumns(boardId);
console.log(`Loaded ${columns.length} columns`);
// Should match number in Columns board for this board
```

### 2. Compare Output
- Run both old and new versions
- Verify same data is returned
- Check all expected columns are present

### 3. Test Filters
- Ensure existing filters still work
- Test that missing columns are handled gracefully

### 4. Performance Check
```typescript
const start = Date.now();
await getToolDynamic({ limit: 10 });
console.log(`Execution time: ${Date.now() - start}ms`);
```

## Troubleshooting

### "Board not found in meta board"
- Ensure board ID exists in meta board (1698570295)
- Check board_id_mkn3k16t column has correct board ID

### "No columns found"
- Verify columns exist in Columns board (2135717897)
- Check board relations are properly linked

### Missing columns in output
- Some columns might not have migrated
- Check Columns board for the specific column
- May need to run migration script again

## Future Enhancements

1. **Auto-discovery of new columns**
   - Periodic sync from actual boards to Columns board
   
2. **Column metadata**
   - Store column types, descriptions in Columns board
   
3. **Version tracking**
   - Track when columns are added/removed
   
4. **Test automation**
   - Automatic tests that adapt to column changes

## Summary

The dynamic column system eliminates hardcoded column arrays and makes tools automatically adapt to board changes. With 333 columns already migrated to the Columns board, the infrastructure is ready for all tools to be updated.

**Key takeaway**: Replace hardcoded column arrays with `getDynamicColumns(boardId)` and let the system handle the rest!