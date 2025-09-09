import { GEO_LOCATIONS, type GeoLocation } from '../../data/geoLocations.js';

export async function getGeoLocations(args: {
  search?: string[];
  type?: 'region' | 'country' | 'postal_code' | 'city' | 'municipality';
  limit?: number;
}) {
  const { search, type, limit = 20 } = args;

  try {
    console.error('[getGeoLocations] Starting search:', { search, type, limit });
    
    // Map lowercase types to PascalCase types
    const typeMap: Record<string, string> = {
      region: 'Region',
      country: 'Country',
      postal_code: 'Postal Code',
      city: 'City',
      municipality: 'Municipality',
    };

    const mappedType = type ? typeMap[type] : undefined;

    // Search for all terms and combine results
    let allLocations: GeoLocation[] = [];

    if (search && search.length > 0) {
      // Search for each term
      for (const searchTerm of search) {
        const locations = searchGeoLocations(searchTerm, mappedType, limit);
        allLocations.push(...locations);
      }

      // Remove duplicates based on criteriaId
      const uniqueLocations = allLocations.filter(
        (location, index, self) =>
          index === self.findIndex((l) => l.criteriaId === location.criteriaId)
      );

      // Apply limit to final results
      allLocations = uniqueLocations.slice(0, limit);
    } else {
      // If no search terms provided, get locations filtered by type
      allLocations = searchGeoLocations(undefined, mappedType, limit);
    }

    console.error(`[getGeoLocations] Found ${allLocations.length} locations`);

    // Convert to markdown format
    const lines: string[] = [];
    
    lines.push('# Geographic Locations');
    lines.push('');
    lines.push(`**Total Locations:** ${allLocations.length}`);
    
    if (search && search.length > 0) {
      lines.push(`**Search Terms:** ${search.join(', ')}`);
    }
    if (type) {
      lines.push(`**Type Filter:** ${mappedType}`);
    }
    lines.push('');
    
    if (allLocations.length === 0) {
      lines.push('*No locations found matching the criteria*');
    } else {
      // Group by type
      const grouped = allLocations.reduce((acc, loc) => {
        if (!acc[loc.type]) acc[loc.type] = [];
        acc[loc.type].push(loc);
        return acc;
      }, {} as Record<string, GeoLocation[]>);
      
      // Sort types for consistent output
      const typeOrder = ['Country', 'Region', 'City', 'Municipality', 'Postal Code'];
      const sortedTypes = Object.keys(grouped).sort((a, b) => {
        const aIndex = typeOrder.indexOf(a);
        const bIndex = typeOrder.indexOf(b);
        if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      });
      
      for (const locType of sortedTypes) {
        const locations = grouped[locType];
        lines.push(`## ${locType}s`);
        lines.push(`*${locations.length} location${locations.length !== 1 ? 's' : ''}*`);
        lines.push('');
        lines.push('| Name | Criteria ID | Canonical Name |');
        lines.push('|------|-------------|----------------|');
        
        // Sort locations by name
        locations.sort((a, b) => a.name.localeCompare(b.name));
        
        for (const loc of locations) {
          const canonicalShort = loc.canonicalName.length > 50 
            ? `${loc.canonicalName.substring(0, 47)}...`
            : loc.canonicalName;
          lines.push(`| ${loc.name} | \`${loc.criteriaId}\` | ${canonicalShort} |`);
        }
        lines.push('');
      }
      
      // Add usage section
      lines.push('## Usage for GAM Targeting');
      lines.push('');
      lines.push('Use the **Criteria IDs** (shown in code format) for geographic targeting in:');
      lines.push('- `availabilityForecast` tool - Add to geoTargeting.targetedLocations');
      lines.push('- Google Ad Manager campaigns - Geographic targeting settings');
      lines.push('');
      lines.push('### Example Usage:');
      lines.push('```json');
      lines.push('{');
      lines.push('  "geoTargeting": {');
      lines.push('    "targetedLocations": [');
      
      // Show first 3 IDs as example
      const exampleIds = allLocations.slice(0, 3).map(loc => loc.criteriaId);
      exampleIds.forEach((id, index) => {
        const comma = index < exampleIds.length - 1 ? ',' : '';
        lines.push(`      ${id}${comma}`);
      });
      
      lines.push('    ]');
      lines.push('  }');
      lines.push('}');
      lines.push('```');
      
      // Extract all criteria IDs for easy copying
      lines.push('');
      lines.push('### All Criteria IDs');
      lines.push('```json');
      lines.push(JSON.stringify(allLocations.map(loc => loc.criteriaId), null, 2));
      lines.push('```');
    }
    
    return lines.join('\n');
  } catch (error) {
    console.error('[getGeoLocations] Error:', error);
    throw new Error(`Failed to search geo locations: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Helper function to search geo locations
function searchGeoLocations(
  searchTerm?: string,
  type?: string,
  limit?: number
): GeoLocation[] {
  let results = [...GEO_LOCATIONS];
  
  // Filter by type if specified
  if (type) {
    results = results.filter(loc => loc.type === type);
  }
  
  // Search by term if specified
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    results = results.filter(loc => 
      loc.name.toLowerCase().includes(term) ||
      loc.canonicalName.toLowerCase().includes(term)
    );
  }
  
  // Apply limit
  if (limit) {
    results = results.slice(0, limit);
  }
  
  return results;
}