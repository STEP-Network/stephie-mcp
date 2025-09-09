import { GEO_LOCATIONS, type GeoLocation } from "../../data/geoLocations.js";
import { createListResponse } from "../json-output.js";

export async function getGeoLocations(args: {
	search?: string[];
	type?: "region" | "country" | "postal_code" | "city" | "municipality";
	limit?: number;
}) {
	const { search, type, limit = 20 } = args;

	try {
		console.error("[getGeoLocations] Starting search:", {
			search,
			type,
			limit,
		});

		// Map lowercase types to PascalCase types
		const typeMap: Record<string, string> = {
			region: "Region",
			country: "Country",
			postal_code: "Postal Code",
			city: "City",
			municipality: "Municipality",
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
					index === self.findIndex((l) => l.criteriaId === location.criteriaId),
			);

			// Apply limit to final results
			allLocations = uniqueLocations.slice(0, limit);
		} else {
			// If no search terms provided, get locations filtered by type
			allLocations = searchGeoLocations(undefined, mappedType, limit);
		}

		console.error(`[getGeoLocations] Found ${allLocations.length} locations`);

		// Group by type for better organization
		const grouped = allLocations.reduce(
			(acc, loc) => {
				if (!acc[loc.type]) acc[loc.type] = [];
				acc[loc.type].push(loc);
				return acc;
			},
			{} as Record<string, GeoLocation[]>,
		);

		// Sort each group by name
		Object.keys(grouped).forEach(type => {
			grouped[type].sort((a, b) => a.name.localeCompare(b.name));
		});

		// Build metadata
		const metadata: Record<string, any> = {
			totalLocations: allLocations.length,
			filters: {},
			locationsByType: Object.entries(grouped).reduce((acc, [type, locs]) => {
				acc[type] = locs.length;
				return acc;
			}, {} as Record<string, number>),
			usageInfo: {
				description: "Use Criteria IDs for geographic targeting in GAM",
				exampleGeoTargeting: {
					geoTargeting: {
						targetedLocations: allLocations.slice(0, 3).map(loc => loc.criteriaId)
					}
				}
			}
		};

		if (search && search.length > 0) {
			metadata.filters.searchTerms = search;
		}
		if (type) {
			metadata.filters.type = mappedType;
		}
		if (limit) {
			metadata.filters.limit = limit;
		}

		// Format locations for JSON response
		const formattedLocations = allLocations.map(loc => ({
			id: loc.criteriaId,
			name: loc.name,
			type: loc.type,
			canonicalName: loc.canonicalName,
			parentId: loc.parentId || null
		}));

		// Add grouped data for easier consumption
		const dataWithGroups = {
			items: formattedLocations,
			groupedByType: grouped,
			criteriaIds: allLocations.map(loc => loc.criteriaId)
		};

		return JSON.stringify(
			createListResponse(
				"getGeoLocations",
				allLocations,
				metadata,
				{
					summary: `Found ${allLocations.length} geographic location${allLocations.length !== 1 ? 's' : ''}${type ? ` of type ${mappedType}` : ''}${search && search.length > 0 ? ` matching "${search.join(', ')}"` : ''}`
				}
			),
			null,
			2
		);
	} catch (error) {
		console.error("[getGeoLocations] Error:", error);
		throw new Error(
			`Failed to search geo locations: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}
}

// Helper function to search geo locations
function searchGeoLocations(
	searchTerm?: string,
	type?: string,
	limit?: number,
): GeoLocation[] {
	let results = [...GEO_LOCATIONS];

	// Filter by type if specified
	if (type) {
		results = results.filter((loc) => loc.type === type);
	}

	// Search by term if specified
	if (searchTerm) {
		const term = searchTerm.toLowerCase();
		results = results.filter(
			(loc) =>
				loc.name.toLowerCase().includes(term) ||
				loc.canonicalName.toLowerCase().includes(term),
		);
	}

	// Apply limit
	if (limit) {
		results = results.slice(0, limit);
	}

	return results;
}
