# Board Relations Filtering Pattern

## Overview
Many Monday.com boards have board relation (connect_boards) columns that link items between boards. To properly filter by these relations, we use item IDs rather than string matching.

## Implementation Pattern

### 1. Parameter Definition
```typescript
// Use ID-based filtering, not string matching
teamId?: string;        // ✅ Good - uses exact item ID
team?: string;         // ❌ Bad - requires fuzzy string matching
```

### 2. Tool Description
Always include instructions to use the related tool first:
```typescript
description: 'For team filtering, use getTeams first to find team IDs.'
```

### 3. Filtering Implementation
```typescript
// Filter by related item ID (post-query filtering)
if (teamId) {
  items = items.filter((item: any) => {
    const relationCol = item.column_values.find((c: any) => c.id === 'connect_boards_column_id');
    if (relationCol?.value) {
      try {
        const linkedItems = JSON.parse(relationCol.value);
        // Check if the ID is in the linkedItemIds array
        return linkedItems?.linkedItemIds?.includes(teamId);
      } catch {
        return false;
      }
    }
    return false;
  });
}
```

### 4. Display Enhancement
Show both the name and ID for clarity:
```typescript
if (teamId) {
  // Get the name from the first matching item's text field
  const firstWithRelation = items.find((item: any) => {
    const relationCol = item.column_values.find((c: any) => c.id === 'connect_boards_column_id');
    return relationCol?.text;
  });
  const relationName = firstWithRelation?.column_values
    .find((c: any) => c.id === 'connect_boards_column_id')?.text || 'Unknown';
  
  lines.push(`**Filter:** ${relationName} (ID: ${teamId})`);
}
```

## Examples of Board Relations

### OKR Board
- **Team** (`connect_boards__1`) → Teams board
- **Key Results** (`connect_boards1__1`) → Key Results board (deprecated)
- **Strategies** (`link_to_strategies__1`) → Strategies board
- **Products** (`connect_boards3__1`) → Products board

### Tasks Boards
- **Key Result** → Links tasks to specific Key Results
- **Project** → Links tasks to projects
- **Owner** → Links to People board

### Sales Boards
- **Account** → Links opportunities/deals to accounts
- **Contact** → Links to contacts
- **Bookings** → Links to bookings

## Workflow for LLMs

When an LLM needs to filter by a board relation:

1. **First call**: Get the list of available items
   ```
   getTeams() → Returns teams with IDs
   ```

2. **Second call**: Use the ID for filtering
   ```
   getOKR({ teamId: "1698674912" })
   ```

## Benefits

1. **Accuracy**: Exact ID matching instead of fuzzy string matching
2. **Performance**: Can potentially use Monday.com's native filtering
3. **Consistency**: Same pattern across all tools
4. **Relationships**: Properly respects Monday.com's data model
5. **Context**: Can traverse relationships for richer information

## Migration Checklist

When updating a tool to use this pattern:

- [ ] Change parameter from `name` to `nameId`
- [ ] Update parameter description to mention using related tool first
- [ ] Implement ID-based filtering using `linkedItemIds`
- [ ] Update tool description with instructions
- [ ] Show both name and ID in output for clarity
- [ ] Test with actual Monday.com item IDs
- [ ] Update CLAUDE.md documentation

## Common Board Relation Columns

| Column Type | Example Fields | Pattern |
|------------|---------------|---------|
| `board_relation` | `connect_boards__1` | Single/multiple board links |
| `link_to_item` | `link_to_item__1` | Links within same board |
| `mirror` | `mirror__1` | Mirrors values from linked items |
| `lookup` | `lookup__1` | Looks up values from linked items |

## Error Handling

Always wrap JSON parsing in try-catch:
```typescript
try {
  const linkedItems = JSON.parse(relationCol.value);
  return linkedItems?.linkedItemIds?.includes(targetId);
} catch {
  return false; // Invalid JSON or missing value
}
```