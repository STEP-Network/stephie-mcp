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
      
      // Get basic publisher column values (no format columns)
      const statusCol = getColumnValue('status8'); // Publisher status
      const websiteCol = getColumnValue('link__1'); // Hjemmeside link
      const descriptionCol = getColumnValue('text_mkm6ckz5'); // Publisher beskrivelse
      const contactEmailCol = getColumnValue('email'); // Kontakt email
      const vertikalCol = getColumnValue('board_relation_mksx8dny'); // Vertikal
      const publisherGroupCol = getColumnValue('board_relation__1'); // Publisher Group
      const approvalStatusCol = getColumnValue('status32'); // Approval Status (Gambling/Finance)
      
      // All items are already Live (filtered by query_params)
      const isActive = true;
      
      // Get approval status
      let approval = '';
      if (approvalStatusCol?.text) {
        if (approvalStatusCol.text.toLowerCase().includes('gambling')) {
          approval = 'Gambling';
        } else if (approvalStatusCol.text.toLowerCase().includes('finance')) {
          approval = 'Finance';
        }
      }
      
      const publisher = {
        id: item.id,
        name: item.name,
        website: websiteCol?.text || '',
        description: descriptionCol?.text || '',
        status: statusCol?.text || 'Unknown',
        active: isActive,
        contactEmail: contactEmailCol?.text || '',
        vertikal: vertikalCol?.text || '',
        publisherGroup: publisherGroupCol?.text || '',
        approval,
      };

      return publisher;
    });

    // No filtering - always return all Live publishers
    const filteredPublishers = publishers;

    // Format as markdown
    const lines: string[] = [];
    
    lines.push('# Publishers');
    lines.push('');
    lines.push(`**Total:** ${filteredPublishers.length} Live publishers`);
    lines.push(`**Status Filter:** Live publishers only`);
    lines.push('');
    
    if (filteredPublishers.length === 0) {
      lines.push('*No publishers found matching criteria*');
      return lines.join('\n');
    }
    
    // Group by publisher group
    const grouped = filteredPublishers.reduce((acc, pub) => {
      const group = pub.publisherGroup || 'Uncategorized';
      if (!acc[group]) acc[group] = [];
      acc[group].push(pub);
      return acc;
    }, {} as Record<string, typeof filteredPublishers>);
    
    // Create table
    lines.push('| Publisher | Website | Status | Vertical | Group | Approval |');
    lines.push('|-----------|---------|--------|----------|-------|----------|');
    
    for (const [group, pubs] of Object.entries(grouped)) {
      for (const pub of pubs as any) {
        lines.push(`| **${pub.name}** | ${pub.website} | ${pub.active ? '✅ Active' : '❌ Inactive'} | ${pub.vertikal || '-'} | ${group} | ${pub.approval} |`);
      }
    }
    
    return lines.join('\n');
  } catch (error) {
    console.error('Error fetching publishers:', error);
    throw new Error(`Failed to fetch publishers: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}