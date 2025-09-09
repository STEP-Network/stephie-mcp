# Tech Intelligence Tasks - Enhanced Filtering Examples

## New Enum-Based Filtering with any_of/not_any_of Operators

### Example 1: Get all tasks NOT Done or Rejected
```json
{
  "status_19__1": ["Done", "Rejected"],
  "status_19__1_operator": "not_any_of"
}
```

### Example 2: Get all high priority Development tasks
```json
{
  "priority_1__1": ["High", "Critical"],
  "priority_1__1_operator": "any_of",
  "type_1__1": ["Development"],
  "type_1__1_operator": "any_of"
}
```

### Example 3: Get all tasks except Meetings and Documentation
```json
{
  "type_1__1": ["Meeting", "Documentation"],
  "type_1__1_operator": "not_any_of"
}
```

### Example 4: Get In Progress or Planned tasks that are NOT low priority
```json
{
  "status_19__1": ["In Progress", "Planned"],
  "status_19__1_operator": "any_of",
  "priority_1__1": ["Low", "Minimal"],
  "priority_1__1_operator": "not_any_of"
}
```

## Available Enum Values

### Status
- "In Review"
- "Done" 
- "Rejected"
- "Planned"
- "In Progress"
- "Missing Status"
- "Waiting On Others"
- "New"
- "On Hold"

### Type
- "Support"
- "Maintenance"
- "Development"
- "Not Labelled"
- "Bugfix"
- "Documentation"
- "Meeting"

### Priority
- "Medium"
- "Minimal"
- "Low"
- "Critical"
- "High"
- "Not Prioritized"
- "Unknown"

## Operators
- `"any_of"` (default): Include tasks matching ANY of the specified values
- `"not_any_of"`: Exclude tasks matching ANY of the specified values