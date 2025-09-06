import { mondayApi, BOARD_IDS } from '../monday/client.js';

export async function getAllPublishers() {
  // Always fetch all Live publishers - no parameters needed
  const limit = 500;

  // Query with proper filtering for Live publishers (status8 index 1)
  const query = `
    query GetPublishers($boardId: ID!, $limit: Int!) {
      boards(ids: [$boardId]) {
        id
        name
        items_page(
          limit: $limit,
          query_params: {
            rules: [{
              column_id: "status8",
              compare_value: [1],
              operator: any_of
            }]
          }
        ) {
          items {
            id
            name
            column_values {
              id
              text
              value
              ... on BoardRelationValue {
                linked_items {
                  id
                  name
                }
              }
            }
          }
        }
      }
    }
  `;

  const variables = {
    boardId: BOARD_IDS.PUBLISHERS,
    limit,
  };

  try {
    const response = await mondayApi(query, variables);
    
    // Debug logging
    console.error('Monday.com response:', JSON.stringify(response, null, 2));
    
    // Check if we got boards
    if (!response.data?.boards || response.data.boards.length === 0) {
      console.error('No boards found in response');
      return { publishers: [], total: 0, error: 'No boards found' };
    }
    
    const board = response.data.boards[0];
    console.error('Board found:', board.name, 'ID:', board.id);
    
    const items = board?.items_page?.items || [];

    // Parse publisher data using actual column IDs
    const publishers = items.map((item: any) => {
      const columnValues = item.column_values || [];
      
      // Helper to find column value by ID
      const getColumnValue = (id: string) => {
        return columnValues.find((col: any) => col.id === id);
      };
      
      // Get publisher column values
      const gamIdCol = getColumnValue('text_mktdhmar'); // GAM Ad Unit ID
      const vertikalCol = getColumnValue('board_relation_mksx8dny'); // Vertikal
      const publisherGroupCol = getColumnValue('board_relation_mkp69z9s'); // Publisher Group
      const approvalStatusCol = getColumnValue('status32'); // Approval Status (Gambling/Finance)
      
      // Get approval status
      let approval = '';
      if (approvalStatusCol?.text) {
        if (approvalStatusCol.text.toLowerCase().includes('gambling')) {
          approval = 'Gambling';
        } else if (approvalStatusCol.text.toLowerCase().includes('finance')) {
          approval = 'Finance';
        }
      }
      
      // Extract linked item names for board relations
      const verticalName = vertikalCol?.linked_items?.[0]?.name || '-';
      const groupName = publisherGroupCol?.linked_items?.[0]?.name || '-';
      
      const publisher = {
        id: item.id,
        name: item.name,
        gamId: gamIdCol?.text || '-',
        vertical: verticalName,
        group: groupName,
        approval: approval || '-',
      };

      return publisher;
    });

    // No filtering - always return all Live publishers
    const filteredPublishers = publishers;

    // Format as markdown
    const lines: string[] = [];
    
    lines.push('# Publishers/Sites');
    lines.push('');
    lines.push(`**Total:** ${filteredPublishers.length} Live publishers/sites`);
    lines.push('');
    
    if (filteredPublishers.length === 0) {
      lines.push('*No publishers found matching criteria*');
      return lines.join('\n');
    }
    
    // Sort publishers by vertical, then by name
    const sortedPublishers = filteredPublishers.sort((a, b) => {
      // First sort by vertical
      const verticalCompare = a.vertical.toLowerCase().localeCompare(b.vertical.toLowerCase());
      if (verticalCompare !== 0) return verticalCompare;
      // Then sort by name within same vertical
      return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    });
    
    // Create table with new columns
    lines.push('| Publisher/Site | GAM ID | Vertical | Group | Approval |');
    lines.push('|----------------|--------|----------|-------|----------|');
    
    for (const pub of sortedPublishers as any) {
      lines.push(`| **${pub.name}** | ${pub.gamId} | ${pub.vertical} | ${pub.group} | ${pub.approval} |`);
    }
    
    return lines.join('\n');
  } catch (error) {
    console.error('Error fetching publishers:', error);
    throw new Error(`Failed to fetch publishers: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}