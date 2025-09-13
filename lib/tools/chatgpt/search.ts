/**
 * ChatGPT-required search tool
 * This tool is required by ChatGPT's MCP implementation
 */

import { getItems } from '../monday/getItems.js';
import { getPublisherFormats } from '../publishers/getPublisherFormats.js';
import { getKeyValues } from '../targeting/getKeyValues.js';
import { createListResponse } from '../json-output.js';

export async function search(params: { query: string; limit?: number }): Promise<string> {
	const { query, limit = 20 } = params;
	
	if (!query || query.trim().length === 0) {
		return createListResponse(
			'search',
			[],
			{
				query,
				resultCount: 0,
				searchType: 'empty'
			},
			{ summary: 'No search query provided' }
		);
	}
	
	const lowerQuery = query.toLowerCase();
	const results: any[] = [];
	
	// Search publishers
	if (lowerQuery.includes('publisher') || lowerQuery.includes('site')) {
		try {
			const publisherData = await getPublisherFormats({ 
				publisherName: query,
				limit: Math.min(limit, 10)
			});
			const parsed = JSON.parse(publisherData);
			if (parsed.data && parsed.data.length > 0) {
				results.push({
					type: 'publishers',
					matches: parsed.data.length,
					data: parsed.data
				});
			}
		} catch (e) {
			// Silently handle errors
		}
	}
	
	// Search key values
	if (lowerQuery.includes('key') || lowerQuery.includes('value') || lowerQuery.includes('target')) {
		try {
			const keyData = await getKeyValues({
				keySearch: query,
				limit: Math.min(limit, 10)
			});
			const parsed = JSON.parse(keyData);
			if (parsed.data && parsed.data.length > 0) {
				results.push({
					type: 'keyValues',
					matches: parsed.data.length,
					data: parsed.data
				});
			}
		} catch (e) {
			// Silently handle errors
		}
	}
	
	// Generic search in items if no specific match
	if (results.length === 0) {
		try {
			// Search in multiple boards
			const boards = [
				{ id: '1738114062', name: 'Publishers' },
				{ id: '1678021538', name: 'Accounts' },
				{ id: '1698570295', name: 'Boards' }
			];
			
			for (const board of boards) {
				try {
					const itemData = await getItems({
						boardId: board.id,
						columnIds: ['name'],
						search: query,
						limit: Math.min(limit, 5)
					});
					const parsed = JSON.parse(itemData);
					if (parsed.data && parsed.data.length > 0) {
						results.push({
							type: board.name.toLowerCase(),
							boardId: board.id,
							matches: parsed.data.length,
							data: parsed.data
						});
					}
				} catch (e) {
					// Continue with next board
				}
			}
		} catch (e) {
			// Handle errors
		}
	}
	
	return createListResponse(
		'search',
		results,
		{
			query,
			resultCount: results.reduce((sum, r) => sum + (r.matches || 0), 0),
			searchTypes: results.map(r => r.type)
		},
		{ 
			summary: results.length > 0 
				? `Found ${results.reduce((sum, r) => sum + (r.matches || 0), 0)} results across ${results.length} categories`
				: `No results found for "${query}"`
		}
	);
}