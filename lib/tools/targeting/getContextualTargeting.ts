import { getGAMAccessToken } from "../../gam/auth.js";
import { createListResponse } from "../json-output.js";

const NEUWO_CONTEXTUAL_KEY_ID = "14509472";
const NETWORK_ID = process.env.GOOGLE_AD_MANAGER_NETWORK_CODE || "21809957681";

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

	console.error("[getContextualTargeting] Starting with:", { search, limit });

	try {
		// Get authentication
		const accessToken = await getGAMAccessToken();

		// Fetch all values for the contextual key
		const allValues = await fetchContextualValues(accessToken);
		console.error(
			`[getContextualTargeting] Total contextual values found: ${allValues.length}`,
		);

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
					nameLower.includes(term.toLowerCase()),
				);
			});
		}

		// Sort alphabetically by display name
		filteredValues.sort((a, b) => a.displayName.localeCompare(b.displayName));

		// Apply limit
		const limitedValues = filteredValues.slice(0, limit);

		console.error(
			`[getContextualTargeting] Returning ${limitedValues.length} contextual values after filtering`,
		);

		// Analyze category patterns
		const categorized = analyzeCategoryPatterns(limitedValues);

		// Build hierarchical structure for better LLM understanding
		const hierarchy: Record<string, any> = {};
		const customCategories: Record<string, string[]> = {};
		const topicMappings: Record<string, string[]> = {};
		
		// Process categories into hierarchy
		limitedValues.forEach(value => {
			const displayName = value.displayName;
			
			// Handle custom categories (step_, neg_, gs_, oersted)
			if (displayName.startsWith('step_') || displayName.startsWith('neg_') || 
				displayName.startsWith('gs_') || displayName === 'oersted') {
				const prefix = displayName.split('_')[0];
				if (!customCategories[prefix]) customCategories[prefix] = [];
				customCategories[prefix].push(displayName.replace(`${prefix}_custom_`, ''));
				
				// Add to topic mappings
				if (displayName.includes('bil') || displayName.includes('car')) {
					if (!topicMappings.automotive) topicMappings.automotive = [];
					topicMappings.automotive.push(value.id);
				}
				if (displayName.includes('fodbold') || displayName.includes('soccer')) {
					if (!topicMappings.sports) topicMappings.sports = [];
					topicMappings.sports.push(value.id);
				}
			} 
			// Handle standard categories
			else if (displayName.includes('_')) {
				const [parent, ...rest] = displayName.split('_');
				if (!hierarchy[parent]) {
					hierarchy[parent] = { subcategories: {} };
				}
				hierarchy[parent].subcategories[rest.join('_')] = value.id;
			} else {
				// Main category
				if (!hierarchy[displayName]) {
					hierarchy[displayName] = { id: value.id, subcategories: {} };
				} else {
					hierarchy[displayName].id = value.id;
				}
			}
		});

		// Format for JSON response - keep backward compatibility
		const formattedCategories = limitedValues.map(value => ({
			id: value.id,
			name: value.name,
			displayName: value.displayName,
			matchType: value.matchType || "EXACT",
			categoryType: categorized.mainCategories.includes(value) ? "main" : "subcategory",
			parentCategory: value.displayName.includes("_") ? value.displayName.split("_")[0] : null
		}));

		// Build category groups summary
		const categoryGroups = new Map<string, number>();
		limitedValues.forEach((value) => {
			const prefix = value.displayName.split(/[_\-\s]/)[0];
			categoryGroups.set(prefix, (categoryGroups.get(prefix) || 0) + 1);
		});

		// Identify sensitive categories to exclude
		const sensitiveCategories = limitedValues.filter(v => 
			v.displayName.includes('Sensitive') || 
			v.displayName.includes('Weapons') || 
			v.displayName.includes('War') ||
			v.displayName.includes('Crime') ||
			v.displayName.includes('Disasters') ||
			v.displayName.includes('neg_')
		).map(v => v.id);

		// Build metadata with optimized structure
		const metadata: Record<string, any> = {
			// Core identifiers
			network: NETWORK_ID,
			targetingKey: NEUWO_CONTEXTUAL_KEY_ID,
			
			// Results summary
			results: {
				total: allValues.length,
				matched: filteredValues.length,
				returned: limitedValues.length
			},
			
			// Hierarchical organization for better LLM understanding
			hierarchy: hierarchy,
			customCategories: customCategories,
			
			// Topic-based groupings for easy targeting
			targeting: {
				byTopic: topicMappings,
				safelist: limitedValues
					.filter(v => !sensitiveCategories.includes(v.id))
					.map(v => v.id),
				exclusions: sensitiveCategories,
				all: limitedValues.map(v => v.id)
			},
			
			// Simplified usage examples
			usage: {
				example: {
					targetSports: topicMappings.sports || [],
					excludeSensitive: sensitiveCategories,
					customTargeting: {
						[NEUWO_CONTEXTUAL_KEY_ID]: limitedValues.slice(0, 3).map(v => v.id)
					}
				}
			}
		};

		if (searchTerms.length > 0) {
			metadata.filters.searchTerms = searchTerms;
		}

		if (filteredValues.length > limitedValues.length) {
			metadata.note = `Showing ${limitedValues.length} of ${filteredValues.length} matching results`;
		}

		return JSON.stringify(
			createListResponse(
				"getContextualTargeting",
				formattedCategories,
				metadata,
				{
					summary: limitedValues.length === 0 
						? "No contextual categories found matching the criteria"
						: `Found ${limitedValues.length} contextual targeting categor${limitedValues.length !== 1 ? 'ies' : 'y'}: ${categorized.mainCategories.length} main, ${categorized.subCategories.length} subcategor${categorized.subCategories.length !== 1 ? 'ies' : 'y'}`
				}
			),
			null,
			2
		);
	} catch (error: any) {
		console.error("[getContextualTargeting] Error:", error);
		throw new Error(`Failed to fetch contextual targeting: ${error.message}`);
	}
}

// Helper function to fetch all values for the contextual key
async function fetchContextualValues(
	accessToken: string,
): Promise<ContextualValue[]> {
	const allValues: ContextualValue[] = [];
	let pageToken: string | undefined;

	do {
		const url = new URL(
			`https://admanager.googleapis.com/v1/networks/${NETWORK_ID}/customTargetingKeys/${NEUWO_CONTEXTUAL_KEY_ID}/customTargetingValues`,
		);
		url.searchParams.set("pageSize", "100");
		if (pageToken) {
			url.searchParams.set("pageToken", pageToken);
		}

		const response = await fetch(url.toString(), {
			headers: {
				Authorization: `Bearer ${accessToken}`,
				"Content-Type": "application/json",
			},
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.error(
				`Failed to fetch contextual values: ${response.status} - ${errorText}`,
			);
			throw new Error(`Failed to fetch contextual values: ${response.status}`);
		}

		const data = (await response.json()) as any;

		if (data.customTargetingValues) {
			for (const value of data.customTargetingValues) {
				// Extract the ID from the resource name
				const id = value.name.split("/").pop() || value.customTargetingValueId;
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

	console.error(
		`[getContextualTargeting] Fetched ${allValues.length} contextual values`,
	);

	return allValues;
}

// Helper to analyze category patterns
function analyzeCategoryPatterns(values: ContextualValue[]) {
	const mainCategories: ContextualValue[] = [];
	const subCategories: ContextualValue[] = [];

	values.forEach((value) => {
		// Main categories typically don't have underscores or are shorter
		if (
			!value.displayName.includes("_") ||
			value.displayName.split("_").length === 1
		) {
			mainCategories.push(value);
		} else {
			subCategories.push(value);
		}
	});

	return { mainCategories, subCategories };
}
