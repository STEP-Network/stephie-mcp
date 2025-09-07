import { mondayApi } from '../../monday/client.js';

export async function getOKR(params: {
  limit?: number;
  search?: string;
  status?: number; // Objective status (0=Planned, 1=In Progress, 2=On Hold, 3=Done, 4=Cancelled)
  teamId?: string; // Filter by team ID (use getTeams to find team IDs)
  includeKeyResults?: boolean; // Whether to include Key Results (default: true)
  onlyActive?: boolean; // Filter to only active objectives (In Progress)
  strategiesId?: string; // Filter by linked strategies (use getStrategies to find IDs)
  peopleId?: string; // Filter by linked people (use getPeople to find IDs)
} = {}) {
  const { 
    limit = 10, 
    search, 
    status,
    teamId,
    includeKeyResults = true,
    onlyActive = false,
    strategiesId,
    peopleId
  } = params;
  
  // Build filters for objectives
  const filters: any[] = [];
  if (search) {
    filters.push({
      column_id: 'name',
      compare_value: search,
      operator: 'contains_text'
    });
  }
  
  if (status !== undefined) {
    filters.push({
      column_id: 'color_mkpksp3f',
      compare_value: [status],
      operator: 'any_of'
    });
  } else if (onlyActive) {
    // In Progress = index 1
    filters.push({
      column_id: 'color_mkpksp3f',
      compare_value: [1],
      operator: 'any_of'
    });
  }
  
  const queryParams = filters.length > 0 
    ? `, query_params: { rules: [${filters.map(f => `{
        column_id: "${f.column_id}",
        compare_value: ${Array.isArray(f.compare_value) ? `[${f.compare_value}]` : typeof f.compare_value === 'string' ? `"${f.compare_value}"` : f.compare_value},
        operator: ${f.operator}
      }`).join(',')}]}`
    : '';
  
  // Build the query with optional subitems
  const subitems = includeKeyResults ? `
    subitems {
      id
      name
      column_values(ids: ["status0__1", "person", "numbers__1", "date8__1", "text_1__1"]) {
        id
        text
        value
        column {
          title
        }
      }
    }` : '';
  
  const query = `
    query {
      boards(ids: [1631918659]) {
        id
        name
        items_page(limit: ${limit}${queryParams}) {
          items {
            id
            name
            created_at
            updated_at
            column_values(ids: ["color_mkpksp3f", "people__1", "lookup_mkpkjxjy", "date4", "description_mkmp3w28", "connect_boards__1", "link_to_strategies__1", "connect_boards35__1"]) {
              id
              text
              value
              column {
                title
                type
              }
            }
            ${subitems}
          }
        }
      }
    }
  `;
  
  try {
    const response = await mondayApi(query);
    const board = response.data?.boards?.[0];
    if (!board) throw new Error('OKR board not found');
    
    let items = board.items_page?.items || [];
    
    // Filter by team ID if specified (post-query filtering since board_relation doesn't support query params)
    if (teamId) {
      items = items.filter((item: any) => {
        const teamCol = item.column_values.find((c: any) => c.id === 'connect_boards__1');
        // Parse the value field which contains linked item IDs
        if (teamCol?.value) {
          try {
            const linkedItems = JSON.parse(teamCol.value);
            // Check if the teamId is in the linkedItemIds array
            return linkedItems?.linkedItemIds?.includes(teamId);
          } catch {
            return false;
          }
        }
        return false;
      });
    }
    
    // Filter by strategies ID if specified
    if (strategiesId) {
      items = items.filter((item: any) => {
        const stratCol = item.column_values.find((c: any) => c.id === 'link_to_strategies__1');
        if (stratCol?.value) {
          try {
            const linked = JSON.parse(stratCol.value);
            return linked?.linkedItemIds?.includes(strategiesId);
          } catch {
            return false;
          }
        }
        return false;
      });
    }
    
    // Filter by people ID if specified
    if (peopleId) {
      items = items.filter((item: any) => {
        const peopleCol = item.column_values.find((c: any) => c.id === 'connect_boards35__1');
        if (peopleCol?.value) {
          try {
            const linked = JSON.parse(peopleCol.value);
            return linked?.linkedItemIds?.includes(peopleId);
          } catch {
            return false;
          }
        }
        return false;
      });
    }
    
    // Format response as markdown
    const lines: string[] = [];
    lines.push('# Objectives & Key Results');
    lines.push(`**Total Objectives:** ${items.length}`);
    if (search) lines.push(`**Search:** "${search}"`);
    if (status !== undefined) {
      const statusLabels = ['Planned', 'In Progress', 'On Hold', 'Done', 'Cancelled'];
      lines.push(`**Status Filter:** ${statusLabels[status] || `Index ${status}`}`);
    }
    if (teamId) {
      // Try to get team name from first matching item
      let teamName = 'Unknown';
      const firstWithTeam = items.find((item: any) => {
        const teamCol = item.column_values.find((c: any) => c.id === 'connect_boards__1');
        return teamCol?.text;
      });
      if (firstWithTeam) {
        const teamCol = firstWithTeam.column_values.find((c: any) => c.id === 'connect_boards__1');
        teamName = teamCol?.text || 'Unknown';
      }
      lines.push(`**Team Filter:** ${teamName} (ID: ${teamId})`);
    }
    if (strategiesId) lines.push(`**Filter:** Related to Strategy ID ${strategiesId}`);
    if (peopleId) lines.push(`**Filter:** Related to Person ID ${peopleId}`);
    if (onlyActive) lines.push('**Filter:** Active objectives only');
    lines.push('');
    
    // Statistics
    const stats = {
      totalObjectives: items.length,
      totalKeyResults: 0,
      byStatus: {} as Record<string, number>
    };
    
    items.forEach((item: any) => {
      // Parse objective data
      const statusCol = item.column_values.find((c: any) => c.id === 'color_mkpksp3f');
      const ownerCol = item.column_values.find((c: any) => c.id === 'people__1');
      const progressCol = item.column_values.find((c: any) => c.id === 'lookup_mkpkjxjy');
      const deadlineCol = item.column_values.find((c: any) => c.id === 'date4');
      const descCol = item.column_values.find((c: any) => c.id === 'description_mkmp3w28');
      const teamCol = item.column_values.find((c: any) => c.id === 'connect_boards__1');
      
      // Update statistics
      const statusText = statusCol?.text || 'No Status';
      stats.byStatus[statusText] = (stats.byStatus[statusText] || 0) + 1;
      if (item.subitems) {
        stats.totalKeyResults += item.subitems.length;
      }
      
      // Format objective
      lines.push(`## 🎯 ${item.name}`);
      lines.push(`- **ID:** \`${item.id}\``);
      lines.push(`- **Status:** ${statusCol?.text || 'N/A'}`);
      lines.push(`- **Owner:** ${ownerCol?.text || 'N/A'}`);
      lines.push(`- **Team:** ${teamCol?.text || 'N/A'}`);
      lines.push(`- **Progress:** ${progressCol?.text || 'N/A'}`);
      lines.push(`- **Deadline:** ${deadlineCol?.text || 'N/A'}`);
      
      if (descCol?.text && descCol.text !== '') {
        lines.push(`- **Description:** ${descCol.text}`);
      }
      
      // Add Key Results if included
      if (includeKeyResults && item.subitems && item.subitems.length > 0) {
        lines.push('');
        lines.push(`### Key Results (${item.subitems.length})`);
        
        item.subitems.forEach((kr: any, idx: number) => {
          const krStatus = kr.column_values.find((c: any) => c.id === 'status0__1');
          const krOwner = kr.column_values.find((c: any) => c.id === 'person');
          const krProgress = kr.column_values.find((c: any) => c.id === 'numbers__1');
          const krDeadline = kr.column_values.find((c: any) => c.id === 'date8__1');
          const krDesc = kr.column_values.find((c: any) => c.id === 'text_1__1');
          
          lines.push(`${idx + 1}. **${kr.name}** (\`${kr.id}\`)`);
          lines.push(`   - Status: ${krStatus?.text || 'N/A'}`);
          lines.push(`   - Owner: ${krOwner?.text || 'N/A'}`);
          lines.push(`   - Progress: ${krProgress?.text || 'N/A'}`);
          if (krDeadline?.text) {
            lines.push(`   - Due: ${krDeadline.text}`);
          }
          if (krDesc?.text && krDesc.text !== '') {
            lines.push(`   - Description: ${krDesc.text}`);
          }
        });
      } else if (!includeKeyResults && item.subitems) {
        lines.push(`- **Key Results:** ${item.subitems.length} items`);
      }
      
      lines.push('');
    });
    
    // Add summary statistics
    lines.push('---');
    lines.push('## 📊 Summary');
    lines.push(`- **Total Objectives:** ${stats.totalObjectives}`);
    if (includeKeyResults) {
      lines.push(`- **Total Key Results:** ${stats.totalKeyResults}`);
      lines.push(`- **Average KRs per Objective:** ${stats.totalObjectives > 0 ? (stats.totalKeyResults / stats.totalObjectives).toFixed(1) : 0}`);
    }
    lines.push('');
    lines.push('**Status Distribution:**');
    Object.entries(stats.byStatus).forEach(([status, count]) => {
      lines.push(`- ${status}: ${count}`);
    });
    
    return lines.join('\n');
  } catch (error) {
    console.error('Error fetching OKR items:', error);
    throw error;
  }
}
