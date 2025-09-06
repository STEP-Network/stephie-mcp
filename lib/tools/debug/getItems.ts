import { mondayApi } from '../../monday/client.js';

// Supported filter operators
export type FilterOperator = 
  | 'equals' 
  | 'notEquals' 
  | 'contains' 
  | 'notContains' 
  | 'greater' 
  | 'greaterOrEqual' 
  | 'less' 
  | 'lessOrEqual' 
  | 'between' 
  | 'empty' 
  | 'notEmpty';

// Column filter type definition
export interface ColumnFilter {
  columnId: string;
  value: any;
  operator?: FilterOperator; // Optional - will be determined by column type if not provided
}

// Operator mapping based on Monday.com column types
const COLUMN_TYPE_OPERATORS: Record<string, Record<string, string>> = {
  // Text-based columns
  text: {
    equals: 'any_of',
    contains: 'contains_text',
    notContains: 'not_contains_text',
    empty: 'is_empty',
    notEmpty: 'is_not_empty'
  },
  long_text: {
    contains: 'contains_text',
    notContains: 'not_contains_text',
    empty: 'is_empty',
    notEmpty: 'is_not_empty'
  },
  // Status column (uses index values)
  status: {
    equals: 'any_of',
    notEquals: 'not_any_of',
    empty: 'is_empty',
    notEmpty: 'is_not_empty'
  },
  // Dropdown column
  dropdown: {
    equals: 'any_of',
    notEquals: 'not_any_of',
    empty: 'is_empty',
    notEmpty: 'is_not_empty'
  },
  // Numbers column
  numbers: {
    equals: '=',
    notEquals: '!=',
    greater: '>',
    greaterOrEqual: '>=',
    less: '<',
    lessOrEqual: '<=',
    between: 'between',
    empty: 'is_empty',
    notEmpty: 'is_not_empty'
  },
  // Date column
  date: {
    exact: 'exact',
    greater: 'greater_than',
    greaterOrEqual: 'greater_than_or_equal',
    less: 'lower_than',
    lessOrEqual: 'lower_than_or_equal',
    between: 'between',
    empty: 'is_empty',
    notEmpty: 'is_not_empty'
  },
  // Checkbox column
  checkbox: {
    checked: '=',
    unchecked: '!='
  },
  // People column
  people: {
    contains: 'person_filter_by_me',
    anyOf: 'contains_terms',
    empty: 'is_empty',
    notEmpty: 'is_not_empty'
  }
};

export async function getItems(args: {
  boardId: string;
  limit?: number;
  columnIds?: string[];
  itemIds?: string[];
  search?: string;
  columnFilters?: ColumnFilter[];
  includeColumnMetadata?: boolean;
}) {
  const { 
    boardId, 
    limit = 50, 
    columnIds, 
    itemIds,
    search,
    columnFilters,
    includeColumnMetadata = false 
  } = args;

  if (!boardId) {
    throw new Error('boardId is required');
  }

  try {
    // First, get column metadata if we have filters to determine column types and status labels
    let columnTypes: Record<string, string> = {};
    let statusColumnSettings: Record<string, any> = {};
    
    if (columnFilters && columnFilters.length > 0) {
      const metadataQuery = `
        query {
          boards(ids: [${boardId}]) {
            columns {
              id
              type
              settings_str
            }
          }
        }
      `;
      
      const metadataResponse = await mondayApi(metadataQuery);
      const columns = metadataResponse.data?.boards?.[0]?.columns || [];
      columns.forEach((col: any) => {
        columnTypes[col.id] = col.type;
        
        // Parse status column settings to get label-to-index mapping
        if ((col.type === 'color' || col.type === 'status') && col.settings_str) {
          try {
            const settings = JSON.parse(col.settings_str);
            statusColumnSettings[col.id] = settings;
            // console.error(`[getItems] Status column ${col.id} labels:`, settings.labels);
          } catch (e) {
            console.error(`[getItems] Failed to parse settings for column ${col.id}`);
          }
        }
      });
    }
    
    // Build the items query part
    let itemsQuery = '';
    
    if (itemIds && itemIds.length > 0) {
      // Query specific items by ID
      itemsQuery = `items(ids: [${itemIds.join(',')}]) {`;
    } else {
      // Build filter rules
      const rules: any[] = [];
      
      // Add search filter if provided
      if (search) {
        rules.push({
          column_id: "name",
          compare_value: search.replace(/"/g, '\\"'),
          operator: "contains_text"
        });
      }
      
      // Add column filters with intelligent operator selection
      if (columnFilters) {
        columnFilters.forEach(filter => {
          const columnType = columnTypes[filter.columnId] || 'text';
          let operator = filter.operator;
          
          // Map user-friendly operator names to Monday.com operators
          if (operator && typeof operator === 'string') {
            const typeOperators = COLUMN_TYPE_OPERATORS[columnType];
            if (typeOperators && typeOperators[operator]) {
              operator = typeOperators[operator];
            } else {
              console.error(`[getItems] Warning: Operator "${operator}" not found for column type "${columnType}", using default`);
              operator = undefined; // Reset to use default
            }
          }
          
          // Determine operator based on column type if not provided
          if (!operator) {
            const typeOperators = COLUMN_TYPE_OPERATORS[columnType];
            if (typeOperators) {
              // Default operators based on column type
              if (columnType === 'color' || columnType === 'status' || columnType === 'dropdown') {
                operator = 'any_of'; // Status columns use 'any_of'
                // console.error(`[getItems] Using default operator 'any_of' for ${columnType} column ${filter.columnId}`);
              } else if (columnType === 'text' || columnType === 'long_text') {
                operator = typeOperators.contains; // 'contains_text'
                // console.error(`[getItems] Using default operator 'contains_text' for ${columnType} column ${filter.columnId}`);
              } else if (columnType === 'numbers') {
                operator = typeOperators.equals; // '='
                // console.error(`[getItems] Using default operator '=' for ${columnType} column ${filter.columnId}`);
              } else if (columnType === 'checkbox') {
                operator = filter.value ? typeOperators.checked : typeOperators.unchecked;
                // console.error(`[getItems] Using operator '${operator}' for checkbox column ${filter.columnId}`);
              } else {
                operator = 'any_of'; // fallback
                // console.error(`[getItems] Using fallback operator 'any_of' for unknown column type ${columnType}`);
              }
            }
          }
          
          // Format value based on column type
          let compareValue = filter.value;
          
          // Status columns (type 'color' or 'status') need index values
          if ((columnType === 'color' || columnType === 'status') && typeof filter.value === 'string') {
            // Try to map label to index
            const settings = statusColumnSettings[filter.columnId];
            if (settings && settings.labels) {
              // Find the index for the given label
              const labelIndex = Object.entries(settings.labels).find(
                ([index, label]) => label === filter.value
              );
              
              if (labelIndex) {
                compareValue = parseInt(labelIndex[0]);
                console.error(`[getItems] Mapped status label "${filter.value}" to index ${compareValue}`);
              } else {
                console.error(`[getItems] Warning: Could not find index for status label "${filter.value}" in column ${filter.columnId}`);
                console.error(`[getItems] Available labels:`, settings.labels);
                // Try to use the value as-is, might be an index already
                if (!isNaN(Number(filter.value))) {
                  compareValue = Number(filter.value);
                }
              }
            } else {
              console.error(`[getItems] Warning: No label mapping found for status column ${filter.columnId}`);
            }
          }
          
          // Array values for any_of operator
          if (operator === 'any_of' && !Array.isArray(compareValue)) {
            compareValue = [compareValue];
          }
          
          rules.push({
            column_id: filter.columnId,
            compare_value: compareValue,
            operator: operator
          });
        });
      }
      
      // Build query params string
      let queryParams = '';
      if (rules.length > 0) {
        // Build the rules array as a GraphQL-compatible string
        const rulesString = rules.map(rule => {
          let compareValue;
          if (Array.isArray(rule.compare_value)) {
            compareValue = `[${rule.compare_value.join(', ')}]`;
          } else if (typeof rule.compare_value === 'string') {
            compareValue = `"${rule.compare_value.replace(/"/g, '\\"')}"`;
          } else {
            compareValue = rule.compare_value;
          }
          
          return `{
            column_id: "${rule.column_id}",
            compare_value: ${compareValue},
            operator: ${rule.operator}
          }`;
        }).join(', ');
        
        queryParams = `, query_params: {
          rules: [${rulesString}]
        }`;
        // console.error(`[getItems] Query params:`, queryParams);
      }
      
      itemsQuery = `items_page(limit: ${limit}${queryParams}) {
        items {`;
    }

    // Build column values query part
    let columnValuesQuery = 'column_values';
    if (columnIds && columnIds.length > 0) {
      columnValuesQuery = `column_values(ids: [${columnIds.map(id => `"${id}"`).join(',')}])`;
    } else {
      columnValuesQuery = 'column_values';
    }

    // Main query
    let query = `
      query {
        boards(ids: [${boardId}]) {
          id
          name
          description
    `;

    // Add columns metadata if requested
    if (includeColumnMetadata) {
      query += `
          columns {
            id
            title
            type
            settings_str
          }
      `;
    }

    // Add items query
    query += `
          ${itemsQuery}
            id
            name
            created_at
            updated_at
            ${columnValuesQuery} {
              id
              text
              value
              column {
                id
                title
                type
              }
              ... on StatusValue {
                text
                index
              }
              ... on DropdownValue {
                text
              }
              ... on BoardRelationValue {
                display_value
                linked_item_ids
              }
              ... on NumbersValue {
                text
                number
              }
              ... on TextValue {
                text
                value
              }
              ... on LongTextValue {
                text
                value
              }
              ... on CheckboxValue {
                checked
              }
              ... on DateValue {
                date
                time
              }
              ... on EmailValue {
                email
                text
              }
              ... on LinkValue {
                url
                text
              }
              ... on MirrorValue {
                display_value
              }
            }
    `;

    // Close the query structure based on whether we're using items or items_page
    if (itemIds && itemIds.length > 0) {
      query += `
          }
        }
      }
    `;
    } else {
      query += `
          }
        }
        }
      }
    `;
    }

    console.error(`[getItems] Querying board ${boardId} with limit ${limit}`);
    // console.error(`[getItems] GraphQL query (first 500 chars):`, query.substring(0, 500));
    if (search) console.error(`[getItems] Search filter: "${search}"`);
    if (itemIds) console.error(`[getItems] Specific item IDs: ${itemIds.join(', ')}`);
    if (columnIds) console.error(`[getItems] Specific column IDs: ${columnIds.join(', ')}`);
    if (columnFilters) {
      console.error(`[getItems] Column filters:`, columnFilters.map(f => ({
        column: f.columnId,
        operator: f.operator || 'auto',
        value: f.value
      })));
    }

    const response = await mondayApi(query);
    
    if (!response.data?.boards || response.data.boards.length === 0) {
      return { 
        error: `Board ${boardId} not found or not accessible`,
        items: [],
        boardId 
      };
    }

    const board = response.data.boards[0];
    const items = itemIds ? board.items : (board.items_page?.items || []);
    
    // Process items to make them more readable
    const processedItems = items.map((item: any) => {
      const columnData: Record<string, any> = {};
      const columnMetadata: Record<string, any> = {};
      
      item.column_values?.forEach((col: any) => {
        const columnId = col.id;
        const columnTitle = col.column.title;
        const columnType = col.column.type;
        
        // Store the value based on type
        let value = col.text || col.value || col.display_value || '';
        
        // Special handling for specific column types
        if (columnType === 'checkbox' && col.checked !== undefined) {
          value = col.checked ? 'Yes' : 'No';
        } else if (columnType === 'numbers' && col.number !== undefined) {
          value = col.number;
        } else if (columnType === 'date' && col.date) {
          value = col.time ? `${col.date} ${col.time}` : col.date;
        } else if (columnType === 'email' && col.email) {
          value = col.email;
        } else if (columnType === 'link' && col.url) {
          value = col.url;
        } else if (columnType === 'board-relation' && col.linked_item_ids) {
          value = `Linked items: ${col.linked_item_ids.join(', ')}`;
        }
        
        columnData[columnTitle] = value;
        
        // Store metadata for debugging
        columnMetadata[columnTitle] = {
          id: columnId,
          type: columnType,
          rawValue: col.value
        };
      });
      
      return {
        id: item.id,
        name: item.name,
        created_at: item.created_at,
        updated_at: item.updated_at,
        columns: columnData,
        _metadata: columnMetadata
      };
    });

    // Build result
    const result: any = {
      board: {
        id: board.id,
        name: board.name,
        description: board.description || ''
      },
      items: processedItems,
      itemCount: processedItems.length,
      totalItemsInBoard: board.items_count
    };

    // Add column metadata if requested
    if (includeColumnMetadata && board.columns) {
      result.boardColumns = board.columns.map((col: any) => ({
        id: col.id,
        title: col.title,
        type: col.type,
        settings: col.settings_str ? JSON.parse(col.settings_str) : null
      }));
    }

    return result;
  } catch (error) {
    console.error('Error fetching items:', error);
    throw new Error(`Failed to fetch items: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}