import { getGAMAccessToken } from '../gam/auth.js';

const NEUWO_CONTEXTUAL_KEY_ID = '14509472';
const NETWORK_ID = process.env.GOOGLE_AD_MANAGER_NETWORK_CODE || '21809957681';

export interface ContextualValue {
  id: string;
  name: string;
  displayName: string;
  matchType?: string;
}

export async function getContextualTargeting(args: {
  search?: string | string[];
  limit?: number;
}) {
  const { search, limit = 50 } = args;

  console.error('[getContextualTargeting] Starting with:', { search, limit });

  try {
    // Get authentication
    const accessToken = await getGAMAccessToken();
    
    // Fetch all values for the contextual key
    const allValues = await fetchContextualValues(accessToken);
    console.error(`[getContextualTargeting] Total contextual values found: ${allValues.length}`);

    // Normalize search to array
    const searchTerms = search
      ? Array.isArray(search)
        ? search
        : [search]
      : [];

    // Filter values based on search terms
    let filteredValues = allValues;
    if (searchTerms.length > 0) {
      filteredValues = allValues.filter((value) => {
        const nameLower = value.displayName.toLowerCase();
        return searchTerms.some((term) =>
          nameLower.includes(term.toLowerCase())
        );
      });
    }

    // Sort alphabetically by display name
    filteredValues.sort((a, b) =>
      a.displayName.localeCompare(b.displayName)
    );

    // Apply limit
    const limitedValues = filteredValues.slice(0, limit);

    console.error(
      `[getContextualTargeting] Returning ${limitedValues.length} contextual values after filtering`
    );

    // Convert to markdown format
    const lines: string[] = [];
    
    lines.push('# Contextual Targeting Categories');
    lines.push('');
    lines.push(`**Total Categories:** ${limitedValues.length}`);
    if (searchTerms.length > 0) {
      lines.push(`**Search Terms:** ${searchTerms.join(', ')}`);
    }
    if (filteredValues.length > limitedValues.length) {
      lines.push(`**Note:** Showing ${limitedValues.length} of ${filteredValues.length} matching results`);
    }
    lines.push('');
    
    if (limitedValues.length === 0) {
      lines.push('*No contextual categories found matching the criteria*');
    } else {
      // Group by category prefix if they have common patterns
      const categorized = analyzeCategoryPatterns(limitedValues);
      
      if (categorized.mainCategories.length > 0) {
        lines.push('## Main Categories');
        lines.push(`*${categorized.mainCategories.length} top-level categories*`);
        lines.push('');
        lines.push('| Category | ID | Type |');
        lines.push('|----------|----|----|');
        
        categorized.mainCategories.forEach(value => {
          lines.push(`| **${value.displayName}** | \`${value.id}\` | ${value.matchType || 'EXACT'} |`);
        });
        lines.push('');
      }
      
      if (categorized.subCategories.length > 0) {
        lines.push('## Subcategories');
        lines.push(`*${categorized.subCategories.length} specific categories*`);
        lines.push('');
        lines.push('| Subcategory | ID | Parent Category |');
        lines.push('|-------------|----|----|');
        
        categorized.subCategories.forEach(value => {
          const parent = value.displayName.split('_')[0] || 'General';
          lines.push(`| ${value.displayName} | \`${value.id}\` | ${parent} |`);
        });
        lines.push('');
      }
      
      // Summary section
      lines.push('## Category Summary');
      lines.push('');
      
      const categoryGroups = new Map<string, number>();
      limitedValues.forEach(value => {
        const prefix = value.displayName.split(/[_\-\s]/)[0];
        categoryGroups.set(prefix, (categoryGroups.get(prefix) || 0) + 1);
      });
      
      if (categoryGroups.size > 0) {
        lines.push('| Category Group | Count |');
        lines.push('|----------------|-------|');
        
        Array.from(categoryGroups.entries())
          .sort((a, b) => b[1] - a[1])
          .forEach(([group, count]) => {
            lines.push(`| ${group} | ${count} |`);
          });
        lines.push('');
      }
      
      // Usage section
      lines.push('## Usage for GAM Targeting');
      lines.push('');
      lines.push('Use these contextual categories for content-based targeting:');
      lines.push('- **News & Media**: Target news-related content');
      lines.push('- **Sports**: Target sports content and events');
      lines.push('- **Business**: Target business and finance content');
      lines.push('- **Entertainment**: Target entertainment content');
      lines.push('');
      lines.push('### Example Usage:');
      lines.push('```json');
      lines.push('{');
      lines.push('  "customTargeting": {');
      lines.push('    "14509472": [');
      
      // Show first 3 IDs as example
      const exampleValues = limitedValues.slice(0, 3);
      exampleValues.forEach((value, index) => {
        const comma = index < exampleValues.length - 1 ? ',' : '';
        lines.push(`      "${value.id}"${comma}`);
      });
      
      lines.push('    ]');
      lines.push('  }');
      lines.push('}');
      lines.push('```');
      
      // All IDs for easy copying
      lines.push('');
      lines.push('### All Category IDs');
      lines.push('```json');
      lines.push(JSON.stringify(limitedValues.map(v => v.id), null, 2));
      lines.push('```');
    }
    
    return lines.join('\n');
  } catch (error: any) {
    console.error('[getContextualTargeting] Error:', error);
    throw new Error(`Failed to fetch contextual targeting: ${error.message}`);
  }
}

// Helper function to fetch all values for the contextual key
async function fetchContextualValues(
  accessToken: string
): Promise<ContextualValue[]> {
  const allValues: ContextualValue[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL(
      `https://admanager.googleapis.com/v1/networks/${NETWORK_ID}/customTargetingKeys/${NEUWO_CONTEXTUAL_KEY_ID}/customTargetingValues`
    );
    url.searchParams.set('pageSize', '100');
    if (pageToken) {
      url.searchParams.set('pageToken', pageToken);
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `Failed to fetch contextual values: ${response.status} - ${errorText}`
      );
      throw new Error(`Failed to fetch contextual values: ${response.status}`);
    }

    const data = await response.json();

    if (data.customTargetingValues) {
      for (const value of data.customTargetingValues) {
        // Extract the ID from the resource name
        const id = value.name.split('/').pop() || value.customTargetingValueId;
        const displayName = value.displayName || value.adTagName || id;

        allValues.push({
          id,
          name: value.adTagName || id,
          displayName,
          matchType: value.matchType,
        });
      }
    }

    pageToken = data.nextPageToken;
  } while (pageToken);

  console.error(`[getContextualTargeting] Fetched ${allValues.length} contextual values`);

  return allValues;
}

// Helper to analyze category patterns
function analyzeCategoryPatterns(values: ContextualValue[]) {
  const mainCategories: ContextualValue[] = [];
  const subCategories: ContextualValue[] = [];
  
  values.forEach(value => {
    // Main categories typically don't have underscores or are shorter
    if (!value.displayName.includes('_') || value.displayName.split('_').length === 1) {
      mainCategories.push(value);
    } else {
      subCategories.push(value);
    }
  });
  
  return { mainCategories, subCategories };
}