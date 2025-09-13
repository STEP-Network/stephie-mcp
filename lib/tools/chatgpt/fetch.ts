/**
 * ChatGPT-required fetch tool
 * This tool is required by ChatGPT's MCP implementation
 */

import { RESOURCE_DEFINITIONS } from '../../mcp/resources.js';
import { createSuccessResponse, createErrorResponse } from '../json-output.js';

export async function fetch(params: { uri: string }): Promise<string> {
	const { uri } = params;
	
	if (!uri) {
		return JSON.stringify(createErrorResponse(
			'fetch',
			'No URI provided',
			{ uri }
		));
	}
	
	// Check if it's a resource URI
	const resource = RESOURCE_DEFINITIONS.find(r => r.uri === uri);
	if (resource) {
		try {
			const content = await resource.fetcher();
			return typeof content === 'string' ? content : JSON.stringify(content);
		} catch (error) {
			return JSON.stringify(createErrorResponse(
				'fetch',
				`Failed to fetch resource: ${error instanceof Error ? error.message : 'Unknown error'}`,
				{ uri }
			));
		}
	}
	
	// Check if it's a board item reference (e.g., monday://item/1234567890)
	const itemMatch = uri.match(/^monday:\/\/item\/(\d+)$/);
	if (itemMatch) {
		const itemId = itemMatch[1];
		try {
			// Import dynamically to avoid circular dependencies
			const { getItems } = await import('../debug/getItems.js');
			
			// Try common boards where items might exist
			const boards = [
				'1738114062', // Publishers
				'1678021538', // Accounts
				'1678185527', // Contacts
			];
			
			for (const boardId of boards) {
				try {
					const result = await getItems({
						boardId,
						columnIds: ['name'],
						itemIds: [itemId],
						limit: 1
					});
					const parsed = JSON.parse(result);
					if (parsed.data && parsed.data.length > 0) {
						return JSON.stringify(createSuccessResponse(
							'fetch',
							'fetched',
							parsed.data[0],
							{ uri, boardId, itemId }
						));
					}
				} catch (e) {
					// Try next board
				}
			}
			
			return JSON.stringify(createErrorResponse(
				'fetch',
				`Item ${itemId} not found in any board`,
				{ uri, itemId }
			));
		} catch (error) {
			return JSON.stringify(createErrorResponse(
				'fetch',
				`Failed to fetch item: ${error instanceof Error ? error.message : 'Unknown error'}`,
				{ uri }
			));
		}
	}
	
	// Check if it's a board reference (e.g., monday://board/1738114062)
	const boardMatch = uri.match(/^monday:\/\/board\/(\d+)$/);
	if (boardMatch) {
		const boardId = boardMatch[1];
		try {
			const { getBoardColumns } = await import('../debug/getBoardColumns.js');
			const result = await getBoardColumns({ boardId: boardId });
			return result;
		} catch (error) {
			return JSON.stringify(createErrorResponse(
				'fetch',
				`Failed to fetch board: ${error instanceof Error ? error.message : 'Unknown error'}`,
				{ uri, boardId }
			));
		}
	}
	
	return JSON.stringify(createErrorResponse(
		'fetch',
		`Unknown URI scheme: ${uri}`,
		{ uri }
	));
}