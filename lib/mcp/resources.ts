/**
 * MCP Resources Configuration
 * 
 * Resources provide readable context to LLMs, while tools perform actions.
 * Many of our read-only "get" tools could be better implemented as resources.
 * 
 * Benefits of using resources instead of tools for read-only data:
 * - Better semantic clarity (resources = data, tools = actions)
 * - Can be cached by the client
 * - Support for URI-based identification
 * - Built-in metadata like mimeType and annotations
 */

export interface ResourceDefinition {
	uri: string;
	name: string;
	description: string;
	mimeType: string;
	// Function to fetch the resource content
	fetcher: () => Promise<string>;
}

/**
 * Sample resources that could replace some of our read-only tools
 * These demonstrate how static or semi-static data should be resources
 */
export const RESOURCE_DEFINITIONS: ResourceDefinition[] = [
	{
		uri: 'monday://publishers/all',
		name: 'All Publishers',
		description: 'Complete list of all publishers in the system',
		mimeType: 'application/json',
		fetcher: async () => {
			// This would call the same logic as getAllPublishers
			const { getAllPublishers } = await import('../tools/publishers/getAllPublishers.js');
			return getAllPublishers();
		}
	},
	{
		uri: 'monday://products/all',
		name: 'All Products',
		description: 'Complete catalog of available ad products',
		mimeType: 'application/json',
		fetcher: async () => {
			const { getAllProducts } = await import('../tools/business/getAllProducts.js');
			return getAllProducts();
		}
	},
	{
		uri: 'monday://formats/all',
		name: 'All Ad Formats',
		description: 'List of all available advertising formats',
		mimeType: 'application/json',
		fetcher: async () => {
			const { getAllFormats } = await import('../tools/business/getAllFormats.js');
			return getAllFormats();
		}
	},
	{
		uri: 'monday://prices/all',
		name: 'Ad Pricing Catalog',
		description: 'Complete pricing information for all ad products',
		mimeType: 'application/json',
		fetcher: async () => {
			const { getAllAdPrices } = await import('../tools/business/getAllAdPrices.js');
			return getAllAdPrices();
		}
	},
	{
		uri: 'monday://placements/all',
		name: 'All Ad Placements',
		description: 'Available ad placement positions',
		mimeType: 'application/json',
		fetcher: async () => {
			const { getAllPlacements } = await import('../tools/targeting/getAllPlacements.js');
			return getAllPlacements({});
		}
	},
	{
		uri: 'monday://sizes/all',
		name: 'Ad Size Specifications',
		description: 'Standard ad size specifications and dimensions',
		mimeType: 'application/json',
		fetcher: async () => {
			const { getAllSizes } = await import('../tools/targeting/getAllSizes.js');
			return getAllSizes({});
		}
	},
	{
		uri: 'monday://teams/directory',
		name: 'Team Directory',
		description: 'Organization teams and their members',
		mimeType: 'application/json',
		fetcher: async () => {
			const { getTeams } = await import('../tools/business/getTeams.js');
			return getTeams({});
		}
	},
	{
		uri: 'monday://people/directory',
		name: 'People Directory',
		description: 'Company personnel directory',
		mimeType: 'application/json',
		fetcher: async () => {
			const { getPeople } = await import('../tools/business/getPeople.js');
			return getPeople({});
		}
	},
	{
		uri: 'monday://tasks/tech-intelligence',
		name: 'Tech Intelligence Tasks',
		description: 'Recent technical intelligence and development tasks',
		mimeType: 'application/json',
		fetcher: async () => {
			const { getTasksTechIntelligence } = await import('../tools/tasks/getTasksTechIntelligence.js');
			return getTasksTechIntelligence({ limit: 20 });
		}
	},
	{
		uri: 'monday://publishers/ott',
		name: 'OTT Publishers',
		description: 'Complete list of all OTT (Over-The-Top) publishers',
		mimeType: 'application/json',
		fetcher: async () => {
			const { getOTTPublishers } = await import('../tools/publishers/getOTTPublishers.js');
			// Get all OTT publishers without any filters
			return getOTTPublishers({ limit: 100 });
		}
	},
	{
		uri: 'monday://strategies/active',
		name: 'Active Strategies',
		description: 'Active and open strategies (excludes Done and Rejected)',
		mimeType: 'application/json',
		fetcher: async () => {
			const { getStrategies } = await import('../tools/business/getStrategies.js');
			// Get strategies, filtering will be done in the modified function
			return getStrategies({ limit: 100 });
		}
	},
	{
		uri: 'monday://verticals/all',
		name: 'All Verticals',
		description: 'Complete list of business verticals with all available data',
		mimeType: 'application/json',
		fetcher: async () => {
			const { getVertikaler } = await import('../tools/business/getVertikaler.js');
			// Get all verticals with all columns
			return getVertikaler({ limit: 100 });
		}
	},
	{
		uri: 'monday://development/changelog',
		name: 'Recent Changelog',
		description: 'Latest changelog entries with optional search',
		mimeType: 'application/json',
		fetcher: async (search?: string) => {
			const { getChangelog } = await import('../tools/development/getChangelog.js');
			// Get 20 latest changelogs, with optional search
			return getChangelog({ limit: 20, search });
		}
	}
	// Note: getPublisherFAQ is intentionally not included yet
];

/**
 * Guidelines for choosing between Resources and Tools:
 * 
 * Use RESOURCES for:
 * - Reference data (catalogs, directories, specifications)
 * - Configuration information
 * - Static or semi-static content
 * - Data that doesn't require parameters (or has sensible defaults)
 * - Information that could be cached
 * 
 * Use TOOLS for:
 * - Actions that modify data (create, update, delete)
 * - Queries that require complex parameters
 * - Dynamic searches with filters
 * - Operations that trigger side effects
 * - Real-time data that should never be cached
 * 
 * Examples of tools that should remain tools:
 * - getTasksTechIntelligence (complex filtering)
 * - getPublishersByFormats (parameter-driven query)
 * - availabilityForecast (real-time calculation)
 * - All create/update operations
 */