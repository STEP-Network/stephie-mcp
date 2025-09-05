import { mondayApi } from '../../monday/client.js';

export async function getItems(args: {
  boardId: string;
  limit?: number;
  columnIds?: string[];
  itemIds?: string[];
  search?: string;
  includeColumnMetadata?: boolean;
}) {
  const { 
    boardId, 
    limit = 50, 
    columnIds, 
    itemIds,
    search,
    includeColumnMetadata = false 
  } = args;

  if (!boardId) {
    throw new Error('boardId is required');
  }

  try {
    // Build the items query part
    let itemsQuery = '';
    
    if (itemIds && itemIds.length > 0) {
      // Query specific items by ID
      itemsQuery = `items(ids: [${itemIds.join(',')}]) {`;
    } else {
      // Query items_page with optional search
      let queryParams = '';
      
      if (search) {
        queryParams = `, query_params: {
          rules: [
            {
              column_id: "name",
              compare_value: "${search.replace(/"/g, '\\"')}",
              operator: contains_text
            }
          ]
        }`;
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
    if (search) console.error(`[getItems] Search filter: "${search}"`);
    if (itemIds) console.error(`[getItems] Specific item IDs: ${itemIds.join(', ')}`);
    if (columnIds) console.error(`[getItems] Specific column IDs: ${columnIds.join(', ')}`);

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