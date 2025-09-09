import { mondayApi } from '../../monday/client.js';

const CUSTOM_TARGETING_BOARD_ID = '2056578615';

// Column IDs
const COLUMNS = {
  GAM_ID: 'text_mkszrqah', // GAM ID for both keys and values
  CODE: 'text_mksypb8d',
  TYPE: 'color_mksy2gg4',
  KEY_RELATION: 'board_relation_mksz4q6f', // Empty for keys, has linked key for values
  PUBLISHER_RELATION: 'board_relation_mkt2ygj6',
};

export interface CustomTargetingKeyResult {
  itemId: string;
  gamId: string;
  name: string;
  displayName: string;
  code: string;
  type: 'PREDEFINED' | 'FREEFORM';
  valueCount?: number;
  values?: Array<{
    id: string;
    name: string;
    displayName: string;
  }>;
}

export async function getKeyValues(args: {
  search?: string | string[];
  type?: 'PREDEFINED' | 'FREEFORM' | 'ALL';
  includeValues?: boolean;
  gamIds?: string[];
  limit?: number;
  valueLimit?: number;
}) {
  const {
    search,
    type = 'ALL',
    includeValues = false,
    gamIds,
    limit = 50,
    valueLimit = 50,
  } = args;

  console.error(`[getKeyValues] Search: ${search}, Type: ${type}, Include values: ${includeValues}`);

  try {
    // Build search filters
    const searchTerms = search
      ? Array.isArray(search)
        ? search
        : [search]
      : [];

    // Query for keys
    let keyQuery = `
      query {
        boards(ids: ${CUSTOM_TARGETING_BOARD_ID}) {
          items_page(
            limit: 500
            query_params: {
              rules: [
                {
                  column_id: "${COLUMNS.KEY_RELATION}",
                  compare_value: [],
                  operator: is_empty
                }
    `;

    // Add search filter if provided
    if (searchTerms.length > 0) {
      const searchRule = searchTerms.map(term => `
                {
                  column_id: "name",
                  compare_value: "${term.replace(/"/g, '\\"')}",
                  operator: contains_text
                }
      `).join(',');
      
      keyQuery += `,${searchRule}`;
    }

    keyQuery += `
              ]
              operator: and
            }
          ) {
            items {
              id
              name
              column_values {
                id
                text
                value
              }
            }
          }
        }
      }
    `;

    const response = await mondayApi(keyQuery);
    
    if (!response.data?.boards || response.data.boards.length === 0) {
      return { keys: [], total: 0 };
    }

    const items = response.data.boards[0].items_page.items || [];
    const allKeys: CustomTargetingKeyResult[] = [];

    // Process keys
    for (const item of items) {
      const columnMap = new Map(
        item.column_values.map((col: any) => [col.id, col])
      );

      const gamId = (columnMap.get(COLUMNS.GAM_ID) as any)?.text || '';
      const code = (columnMap.get(COLUMNS.CODE) as any)?.text || '';
      const typeValue = (columnMap.get(COLUMNS.TYPE) as any)?.value;
      
      // Parse type from status column value
      let keyType: 'PREDEFINED' | 'FREEFORM' = 'FREEFORM';
      if (typeValue) {
        try {
          const parsed = JSON.parse(typeValue);
          keyType = parsed.index === 1 ? 'PREDEFINED' : 'FREEFORM';
        } catch (e) {
          // Default to FREEFORM
        }
      }

      if (type === 'ALL' || type === keyType) {
        if (!gamIds || gamIds.length === 0 || gamIds.includes(gamId)) {
          allKeys.push({
            itemId: item.id,
            gamId,
            name: item.name,
            displayName: item.name,
            code: code || item.name,
            type: keyType,
          });
        }
      }
    }

    // Fetch values if requested
    if (includeValues && allKeys.length > 0) {
      const keyIds = allKeys.map(k => k.itemId);
      
      // Query for values linked to these keys
      const valueQuery = `
        query {
          boards(ids: ${CUSTOM_TARGETING_BOARD_ID}) {
            items_page(
              limit: 1000
              query_params: {
                rules: [
                  {
                    column_id: "${COLUMNS.KEY_RELATION}",
                    compare_value: [${keyIds.join(',')}],
                    operator: any_of
                  }
                ]
              }
            ) {
              items {
                id
                name
                column_values {
                  id
                  text
                  ... on BoardRelationValue {
                    linked_item_ids
                  }
                }
              }
            }
          }
        }
      `;

      const valueResponse = await mondayApi(valueQuery);
      const valueItems = valueResponse.data?.boards?.[0]?.items_page?.items || [];
      
      // Group values by parent key
      const valuesByKey = new Map<string, any[]>();
      
      for (const item of valueItems) {
        const columnMap = new Map(
          item.column_values.map((col: any) => [col.id, col])
        );
        
        const keyRelation = columnMap.get(COLUMNS.KEY_RELATION) as any;
        const parentKeyId = keyRelation?.linked_item_ids?.[0];
        const gamId = (columnMap.get(COLUMNS.GAM_ID) as any)?.text || '';
        const code = (columnMap.get(COLUMNS.CODE) as any)?.text || '';
        
        if (parentKeyId) {
          if (!valuesByKey.has(parentKeyId)) {
            valuesByKey.set(parentKeyId, []);
          }
          valuesByKey.get(parentKeyId)?.push({
            id: gamId,
            name: code || item.name,
            displayName: item.name,
          });
        }
      }
      
      // Add values to keys
      for (const key of allKeys) {
        const keyValues = valuesByKey.get(key.itemId) || [];
        if (keyValues.length > 0) {
          key.values = keyValues.slice(0, valueLimit);
          key.valueCount = keyValues.length;
        }
      }
    }

    // Sort by display name
    allKeys.sort((a, b) => a.displayName.localeCompare(b.displayName));

    // Apply limit
    const limitedResults = allKeys.slice(0, limit);

    // Format as text output
    const textLines: string[] = [];
    textLines.push(`CUSTOM TARGETING KEYS (${limitedResults.length} keys)`);
    textLines.push('');
    
    for (const key of limitedResults) {
      textLines.push(`${key.displayName} [${key.gamId}] (${key.type})`);
      if (key.values && key.values.length > 0) {
        textLines.push(`  Values (${key.valueCount} total):`);
        for (const value of key.values) {
          textLines.push(`    - ${value.displayName} [${value.id}]`);
        }
      } else if (key.valueCount) {
        textLines.push(`  ${key.valueCount} values available`);
      }
    }

    return textLines.join('\n');
  } catch (error) {
    console.error('Error fetching key values:', error);
    throw new Error(`Failed to fetch key values: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}