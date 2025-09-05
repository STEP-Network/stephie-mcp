import { mondayApi } from '../monday/client.js';

const GAM_BOARD_ID = '1558569789';
const VERTICALS_BOARD_ID = '2054670440';

export async function findPublisherAdUnits(args: {
  names?: string[];
  verticals?: Array<'News' | 'Sport' | 'Auto' | 'Pets' | 'Food & Lifestyle' | 'Home & Garden' | 'Gaming & Tech'>;
  countOnly?: boolean;
  source?: 'Google Ad Manager' | 'Adform';
}) {
  const { names, verticals, countOnly = false, source = 'Google Ad Manager' } = args;
  
  // Map source names to status indices
  // Based on observation: index 0 = Google Ad Manager, index 1 = Adform
  const sourceIndexMap: Record<string, number> = {
    'Google Ad Manager': 0,
    'Adform': 1
  };
  const sourceIndex = sourceIndexMap[source];
  
  console.error(`[findPublisherAdUnits] Source filter: ${source} -> index ${sourceIndex}`);

  try {
    console.error(`[findPublisherAdUnits] Finding publisher ad units...`);
    
    // Filter for Publisher Groups (4) and Publishers (3) from Type column
    const publisherTypes = [3, 4];
    
    // sourceIndex is already defined above based on sourceIndexMap
    
    // Base rules for Type and Source filters
    const typeRuleString = `{column_id: "color_mkqp16yy", compare_value: [${publisherTypes.join(', ')}], operator: any_of}`;
    const sourceRuleString = `{column_id: "color_mkqpmnmr", compare_value: [${sourceIndex}], operator: any_of}`;
    
    console.error('[findPublisherAdUnits] sourceRuleString:', sourceRuleString);
    
    const rulesForQueryArray = [typeRuleString, sourceRuleString];
    let queryOperator = 'and';
    
    // Collect all search rules
    const allSearchRules = [];
    
    if (names && names.length > 0) {
      // Create rules for name searches
      const nameRules = names.map((n) => {
        const escapedName = n.replace(/"/g, '\\\\"');
        return `{column_id: "name", compare_value: "${escapedName}", operator: contains_text}`;
      });
      allSearchRules.push(...nameRules);
    }
    
    // Handle verticals - query the Vertikaler board for ad unit IDs
    const verticalAdUnitIds: number[] = [];
    if (verticals && verticals.length > 0) {
      const verticalRules = verticals
        .map((v) => `{column_id: "name", compare_value: "${v}", operator: contains_text}`)
        .join(', ');
        
      const verticalQuery = `{
        boards(ids: ${VERTICALS_BOARD_ID}) {
          items_page(
            query_params: {
              rules: [
                {column_id: "color_mksxpbk5", compare_value: 1, operator: any_of}${verticalRules ? `, ${verticalRules}` : ''}
              ],
              operator: ${verticals.length > 1 ? 'or' : 'and'}
            }
          ) {
            items {
              name
              column_values(ids: ["lookup_mktdz674"]) {
                ... on MirrorValue {
                  display_value
                }
              }
            }
          }
        }
      }`;
      
      console.error('[findPublisherAdUnits] Querying Vertikaler board for GAM IDs');
      
      const verticalResponse = await mondayApi(verticalQuery);
      
      // Extract ad unit IDs from the vertical results
      verticalResponse.data?.boards?.[0]?.items_page?.items?.forEach((item: any) => {
        const adUnitIdsCol = item.column_values?.find((col: any) => col.display_value);
        if (adUnitIdsCol?.display_value) {
          const ids = adUnitIdsCol.display_value
            .split(',')
            .map((id: string) => id.trim());
          ids.forEach((id: string) => {
            const parsed = Number.parseInt(id, 10);
            if (!Number.isNaN(parsed)) {
              verticalAdUnitIds.push(parsed);
            }
          });
        }
      });
      
      console.error(`[findPublisherAdUnits] Found ${verticalAdUnitIds.length} ad unit IDs in verticals`);
      
      // Add ad unit ID rules based on vertical results
      if (verticalAdUnitIds.length > 0) {
        const adUnitIdRule = `{column_id: "text__1", compare_value: [${verticalAdUnitIds.map((id) => `"${id}"`).join(', ')}], operator: any_of}`;
        allSearchRules.push(adUnitIdRule);
      }
    }
    
    if (allSearchRules.length > 0) {
      // Handle search logic
      if (names && names.length > 1) {
        // Multiple names - use OR logic
        rulesForQueryArray.push(...allSearchRules);
        queryOperator = 'or';
      } else {
        // Single search term - simple AND
        rulesForQueryArray.push(...allSearchRules);
        queryOperator = 'and';
      }
    }
    
    const rulesQueryParamSegment = rulesForQueryArray.join(', ');
    
    const query = `{
      boards(ids: ${GAM_BOARD_ID}) {
        items_page(limit: 500, query_params: { rules: [${rulesQueryParamSegment}], operator: ${queryOperator} }) {
          items {
            name
            column_values(ids: ["text__1", "text2__1", "color_mkqp16yy", "board_relation_mkqp4eh1"]) {
              column {
                title
              }
              ... on TextValue {
                text
              }
              ... on BoardRelationValue {
                display_value
              }
              ... on StatusValue {
                text
                index
              }
            }
          }
        }
      }
    }`;
    
    console.error('[findPublisherAdUnits] Query:', query.substring(0, 500));
    console.error('[findPublisherAdUnits] Executing query');
    
    const response = await mondayApi(query);
    
    console.error('[findPublisherAdUnits] Response structure:', {
      hasData: !!response?.data,
      hasBoards: !!response?.data?.boards,
      boardsLength: response?.data?.boards?.length,
      hasItemsPage: !!response?.data?.boards?.[0]?.items_page,
      itemsCount: response?.data?.boards?.[0]?.items_page?.items?.length ?? 0
    });
    
    const allItems = response?.data?.boards?.[0]?.items_page?.items ?? [];
    
    // Process and simplify the results
    const publishers = allItems
      .map((item: any) => {
        const result: {
          name: string;
          adUnitId: string | null;
          parentAdUnitId: string | null;
          type: string;
          parentPublisher?: string;
        } = {
          name: item.name,
          adUnitId: null,
          parentAdUnitId: null,
          type: 'Unknown',
          parentPublisher: undefined,
        };
        
        item.column_values.forEach((col: any) => {
          const title = col.column?.title;
          if (title === 'Ad Unit ID') {
            result.adUnitId = col.text || null;
          } else if (title === 'Parent Ad Unit ID') {
            result.parentAdUnitId = col.text || null;
          } else if (title === 'Type') {
            // Map type index to readable string
            if (col.index === 4) {
              result.type = 'Publisher Group';
            } else if (col.index === 3) {
              result.type = 'Publisher';
            }
          } else if (title === 'Parent Ad Unit') {
            // Only use for display name
            if (col.display_value) {
              result.parentPublisher = col.display_value;
            }
          }
        });
        return result;
      })
      // Filter out items that don't have the correct type when using OR logic
      .filter((item: any) => {
        if (queryOperator === 'or' && names && names.length > 1) {
          return item.type === 'Publisher Group' || item.type === 'Publisher';
        }
        return true;
      });
    
    // If we found publishers by name, also fetch their parent groups
    let parentGroups: any[] = [];
    if (names && names.length > 0 && publishers.length > 0) {
      // Get unique parent GAM IDs from publishers
      const parentGamIds = [...new Set(
        publishers
          .filter(p => p.parentAdUnitId)
          .map(p => p.parentAdUnitId)
      )];
      
      if (parentGamIds.length > 0) {
        console.error(`[findPublisherAdUnits] Fetching parent groups for GAM IDs: ${parentGamIds.join(', ')}`);
        
        // Search for parent groups that have these GAM IDs
        const parentQuery = `{
          boards(ids: ${GAM_BOARD_ID}) {
            items_page(limit: 500, query_params: { 
              rules: [
                {column_id: "color_mkqp16yy", compare_value: [4], operator: any_of},
                {column_id: "color_mkqpmnmr", compare_value: [${sourceIndex}], operator: any_of}
              ],
              operator: and
            }) {
              items {
                name
                column_values {
                  column {
                    title
                  }
                  ... on TextValue {
                    text
                  }
                  ... on StatusValue {
                    index
                  }
                }
              }
            }
          }
        }`;
        
        const parentResponse = await mondayApi(parentQuery);
        const allParentItems = parentResponse?.data?.boards?.[0]?.items_page?.items || [];
        
        // Filter parent groups to only those matching our GAM IDs
        parentGroups = allParentItems
          .map((item: any) => {
            const result: any = {
              name: item.name,
              adUnitId: null,
              type: 'Publisher Group',
            };
            
            item.column_values.forEach((col: any) => {
              if (col.column?.title === 'Ad Unit ID') {
                result.adUnitId = col.text || null;
              }
            });
            
            return result;
          })
          .filter((group: any) => parentGamIds.includes(group.adUnitId));
        
        console.error(`[findPublisherAdUnits] Found ${parentGroups.length} parent groups`);
      }
    }
    
    // If we're searching for specific names, fetch child ad units
    let childAdUnits: any[] = [];
    if (names && names.length > 0 && publishers.length > 0) {
      console.error('[findPublisherAdUnits] Fetching child ad units for found publishers...');
      
      // Get the GAM IDs of all found publishers
      const publisherGamIds = publishers
        .filter(p => p.adUnitId)
        .map(p => p.adUnitId);
      console.error(`[findPublisherAdUnits] Publisher GAM IDs to search children for: ${publisherGamIds.join(', ')}`);
      
      // Query for child ad units by matching Parent Ad Unit ID with publisher GAM IDs
      // We filter by text2__1 (Parent Ad Unit ID) matching any of our publisher GAM IDs
      const childQuery = `{
        boards(ids: ${GAM_BOARD_ID}) {
          items_page(
            limit: 500,
            query_params: {
              rules: [
                {column_id: "text2__1", compare_value: [${publisherGamIds.map(id => `"${id}"`).join(', ')}], operator: any_of},
                {column_id: "color_mkqpmnmr", compare_value: [${sourceIndex}], operator: any_of}
              ],
              operator: and
            }
          ) {
            items {
              name
              column_values {
                column {
                  title
                }
                ... on TextValue {
                  text
                }
                ... on BoardRelationValue {
                  display_value
                }
                ... on StatusValue {
                  text
                  index
                }
                ... on NumbersValue {
                  number
                }
              }
            }
          }
        }
      }`;
      
      const childResponse = await mondayApi(childQuery);
      const allChildItems = childResponse?.data?.boards?.[0]?.items_page?.items || [];
      
      console.error(`[findPublisherAdUnits] Child query returned ${allChildItems.length} items of types 1 or 2`);
      
      // Debug: log first few items to see their parent relationships
      if (allChildItems.length > 0) {
        console.error(`[findPublisherAdUnits] Sample child items (first 3):`, 
          allChildItems.slice(0, 3).map((item: any) => ({
            name: item.name,
            parentAdUnitId: item.column_values?.find((col: any) => col.column?.title === 'Parent Ad Unit ID')?.text
          }))
        );
      }
      
      // Map all child items to extract their data (already filtered by query)
      childAdUnits = allChildItems.map((item: any) => {
        const result: any = {
          name: item.name,
          type: 'Child Ad Unit',
          adUnitId: null,
          parentAdUnitId: null,
          parent: null,
        };
        
        item.column_values.forEach((col: any) => {
          const title = col.column?.title;
          
          switch(title) {
            case 'Ad Unit ID':
              result.adUnitId = col.text || null;
              break;
            case 'Parent Ad Unit ID':
              result.parentAdUnitId = col.text || null;
              break;
            case 'Type':
              // Type might be different for child units
              if (col.index !== undefined) {
                result.typeIndex = col.index;
              }
              break;
            case 'Parent Ad Unit':
              // Only for display name
              result.parent = col.display_value || null;
              break;
          }
        });
        
        return result;
      });
      
      console.error(`[findPublisherAdUnits] Found ${childAdUnits.length} child ad units`);
    }
    
    if (countOnly) {
      const totalCount = parentGroups.length + publishers.length + childAdUnits.length;
      return `Found ${parentGroups.length} publisher groups, ${publishers.length} publishers${childAdUnits.length > 0 ? `, and ${childAdUnits.length} child ad units` : ''}`;
    }
    
    // Combine parent groups with those found directly
    const allPublisherGroups = [
      ...parentGroups,
      ...publishers.filter(p => p.type === 'Publisher Group')
    ].filter((group, index, self) => 
      index === self.findIndex(g => g.id === group.id) // unique by id
    );
    
    // Group by type for better organization
    const publisherGroups = allPublisherGroups;
    const regularPublishers = publishers.filter(p => p.type === 'Publisher');
    const childAdUnitItems = childAdUnits.filter(c => c.type === 'Ad Unit');
    const childAdPlacements = childAdUnits.filter(c => c.type === 'Ad Placement');
    
    // Format as markdown output
    const textLines: string[] = [];
    const totalItems = publisherGroups.length + regularPublishers.length + childAdUnits.length;
    textLines.push('# Publisher Ad Units');
    textLines.push('');
    textLines.push(`**Total Items:** ${totalItems}`);
    textLines.push('');
    
    // Add search info
    const searchInfo = [];
    if (names && names.length > 0) {
      searchInfo.push(`Names: ${names.join(', ')}`);
    }
    if (verticals && verticals.length > 0) {
      searchInfo.push(`Verticals: ${verticals.join(', ')}`);
    }
    if (searchInfo.length > 0) {
      searchInfo.forEach(info => textLines.push(`**${info}**`));
      textLines.push('');
    }
    
    // Publisher Groups
    if (publisherGroups.length > 0) {
      textLines.push(`## Level 1: Publisher Groups`);
      textLines.push(`*${publisherGroups.length} groups*`);
      textLines.push('');
      
      for (const pg of publisherGroups) {
        textLines.push(`### ${pg.name}`);
        textLines.push(`- **Ad Unit ID:** \`${pg.adUnitId || 'N/A'}\``);
        if (pg.parentPublisher) {
          textLines.push(`- **Parent:** ${pg.parentPublisher}`);
        }
        textLines.push('');
      }
      textLines.push('');
    }
    
    // Regular Publishers
    if (regularPublishers.length > 0) {
      textLines.push(`## Level 2: Publishers`);
      textLines.push(`*${regularPublishers.length} publishers*`);
      textLines.push('');
      
      for (const pub of regularPublishers) {
        textLines.push(`### ${pub.name}`);
        textLines.push(`- **Ad Unit ID:** \`${pub.adUnitId || 'N/A'}\``);
        if (pub.parentPublisher) {
          textLines.push(`- **Parent:** ${pub.parentPublisher}`);
        }
        
        // Show child ad units for this publisher
        if (childAdUnits.length > 0) {
          const pubChildren = childAdUnits.filter(c => c.parent === pub.name);
          if (pubChildren.length > 0) {
            textLines.push(`- **Children:** ${pubChildren.length} units`);
            textLines.push('');
            textLines.push('| Child Unit | Ad Unit ID |');
            textLines.push('|------------|------------|');
            for (const child of pubChildren) {
              textLines.push(`| ${child.name} | \`${child.adUnitId || 'N/A'}\` |`);
            }
          }
        }
        textLines.push('');
      }
      textLines.push('');
    }
    
    // Child Ad Units section (if we have them and they weren't shown inline)
    if (childAdUnitItems.length > 0 && !regularPublishers.length) {
      textLines.push(`## Level 3: Ad Units`);
      textLines.push(`*${childAdUnitItems.length} ad units*`);
      textLines.push('');
      
      for (const unit of childAdUnitItems) {
        textLines.push(`▸ ${unit.name}`);
        textLines.push(`  Ad Unit ID: ${unit.adUnitId || 'N/A'}`);
        if (unit.parent) {
          textLines.push(`  Parent: ${unit.parent}`);
        }
        if (unit.impressions) {
          textLines.push(`  Impressions (30d): ${unit.impressions.toLocaleString()}`);
        }
      }
      textLines.push('');
    }
    
    // Ad Placements
    if (childAdPlacements.length > 0) {
      textLines.push(`AD PLACEMENTS (${childAdPlacements.length})`);
      textLines.push('─'.repeat(40));
      
      for (const placement of childAdPlacements) {
        textLines.push(`▸ ${placement.name}`);
        textLines.push(`  Ad Unit ID: ${placement.adUnitId || 'N/A'}`);
        if (placement.parent) {
          textLines.push(`  Parent: ${placement.parent}`);
        }
        if (placement.impressions) {
          textLines.push(`  Impressions (30d): ${placement.impressions.toLocaleString()}`);
        }
      }
      textLines.push('');
    }
    
    // Summary for forecasting
    textLines.push('## Forecast Usage');
    textLines.push('');
    textLines.push('• Use Publisher Group IDs (Level 1) for group-level forecasts');
    textLines.push('• Use Publisher IDs (Level 2) for specific publisher forecasts');
    if (childAdUnits.length > 0) {
      textLines.push('• Child Ad Units (Level 3) included for detailed targeting');
    }
    
    // Extract all IDs for easy use
    const allAdUnitIds = [
      ...publishers.filter(p => p.adUnitId !== null).map(p => p.adUnitId),
      ...childAdUnits.filter(c => c.adUnitId !== null).map(c => c.adUnitId)
    ];
    
    if (allAdUnitIds.length > 0) {
      textLines.push('');
      textLines.push('### Ad Unit IDs for Forecasting');
      textLines.push('```json');
      textLines.push(JSON.stringify(allAdUnitIds, null, 2));
      textLines.push('```');
    }
    
    return textLines.join('\n');
  } catch (error) {
    console.error('Error finding publisher ad units:', error);
    throw new Error(`Failed to find publisher ad units: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}