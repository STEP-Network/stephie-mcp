/**
 * Simple local cache for Monday.com metadata
 * Uses /tmp on Vercel for per-instance caching
 */

import fs from "node:fs";
import path from "node:path";
import { mondayApi } from "../monday/client.js";

// Use /tmp in production (Vercel), local cache dir in development
const CACHE_DIR = process.env.VERCEL ? "/tmp/cache" : "./cache";
const CACHE_FILE = path.join(CACHE_DIR, "metadata.json");
const LOCK_FILE = path.join(CACHE_DIR, "metadata.lock");
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

interface CacheMetadata {
	columns: Record<string, string[]>; // boardId -> column IDs
	boards: Record<string, any>; // boardId -> board info
	lastSync: string;
	version: string;
}

class SimpleCache {
	private memoryCache: CacheMetadata | null = null;

	/**
	 * Initialize cache - load from disk if available
	 */
	async initialize(): Promise<void> {
		try {
			// Ensure cache directory exists
			if (!fs.existsSync(CACHE_DIR)) {
				fs.mkdirSync(CACHE_DIR, { recursive: true });
			}

			// Try to load existing cache
			if (fs.existsSync(CACHE_FILE)) {
				const data = fs.readFileSync(CACHE_FILE, "utf8");
				this.memoryCache = JSON.parse(data);
				console.error(
					`✅ Loaded cache from disk (${Object.keys(this.memoryCache?.columns || {}).length} boards)`,
				);

				// Check if cache is stale
				if (this.isStale()) {
					console.error("⚠️ Cache is stale, will refresh in background");
					this.refreshInBackground();
				}
			} else {
				console.error("📦 No cache found, will sync on first request");
			}
		} catch (error) {
			console.error("❌ Failed to initialize cache:", error);
		}
	}

	/**
	 * Get columns for a specific board
	 */
	async getColumns(boardId: string): Promise<string[]> {
		// Try memory cache first (0ms)
		if (this.memoryCache?.columns?.[boardId]) {
			return this.memoryCache.columns[boardId];
		}

		// Try loading from disk (1-2ms)
		await this.loadFromDisk();
		if (this.memoryCache?.columns?.[boardId]) {
			return this.memoryCache.columns[boardId];
		}

		// Cache miss - sync and retry
		console.error(`Cache miss for board ${boardId}, syncing...`);
		await this.sync();

		return this.memoryCache?.columns?.[boardId] || ["name", "status"];
	}

	/**
	 * Get all metadata
	 */
	async getMetadata(): Promise<CacheMetadata | null> {
		if (!this.memoryCache) {
			await this.loadFromDisk();
		}
		if (!this.memoryCache) {
			await this.sync();
		}
		return this.memoryCache;
	}

	/**
	 * Force sync with Monday.com
	 */
	async sync(): Promise<void> {
		console.error("🔄 Syncing metadata from Monday.com...");
		const startTime = Date.now();

		try {
			// Fetch metadata from both boards in one query
			const query = `
        query {
          boards(ids: [2135717897, 1698570295]) {
            id
            name
            items_page(limit: 500) {
              items {
                id
                name
                column_values {
                  id
                  text
                  ... on BoardRelationValue {
                    linked_item_ids
                  }
                }
              }
            }
          }
        }
      `;

			const response = await mondayApi(query);
			const metadata = this.processResponse(response);

			// Save to memory and disk
			this.memoryCache = metadata;
			this.saveToDisk(metadata);

			const duration = Date.now() - startTime;
			console.error(
				`✅ Sync complete in ${duration}ms (${Object.keys(metadata.columns).length} boards)`,
			);
		} catch (error) {
			console.error("❌ Sync failed:", error);
			// Keep using existing cache if sync fails
		}
	}

	/**
	 * Process Monday.com response into cache format
	 */
	private processResponse(response: any): CacheMetadata {
		const columns: Record<string, string[]> = {};
		const boards: Record<string, any> = {};

		const columnsBoard = response.data?.boards?.find(
			(b: any) => b.id === "2135717897",
		);
		const metaBoard = response.data?.boards?.find(
			(b: any) => b.id === "1698570295",
		);

		if (!columnsBoard || !metaBoard) {
			console.warn("⚠️ Could not find required boards in response");
			return {
				columns,
				boards,
				lastSync: new Date().toISOString(),
				version: "1.0.0",
			};
		}

		// Build board ID mappings from meta board
		const boardMappings = new Map<string, string>(); // itemId -> boardId
		metaBoard.items_page?.items?.forEach((item: any) => {
			const boardId = item.column_values.find(
				(c: any) => c.id === "board_id_mkn3k16t",
			)?.text;
			if (boardId) {
				boardMappings.set(item.id, boardId);
				boards[boardId] = {
					name: item.name,
					itemId: item.id,
					boardId,
				};
			}
		});

		// Build column mappings from columns board
		columnsBoard.items_page?.items?.forEach((colItem: any) => {
			const columnId = colItem.column_values.find(
				(c: any) => c.id === "text_mkvjc46e",
			)?.text;
			const boardRelation = colItem.column_values.find(
				(c: any) => c.id === "board_relation_mkvjb1w9",
			);
			const linkedBoardItemId = boardRelation?.linked_item_ids?.[0];

			if (columnId && linkedBoardItemId) {
				const boardId = boardMappings.get(linkedBoardItemId);
				if (boardId) {
					if (!columns[boardId]) {
						columns[boardId] = [];
					}
					columns[boardId].push(columnId);
				}
			}
		});

		return {
			columns,
			boards,
			lastSync: new Date().toISOString(),
			version: "1.0.0",
		};
	}

	/**
	 * Load cache from disk
	 */
	private async loadFromDisk(): Promise<void> {
		try {
			if (fs.existsSync(CACHE_FILE)) {
				const data = fs.readFileSync(CACHE_FILE, "utf8");
				this.memoryCache = JSON.parse(data);
			}
		} catch (error) {
			console.error("Failed to load cache from disk:", error);
		}
	}

	/**
	 * Save cache to disk
	 */
	private saveToDisk(metadata: CacheMetadata): void {
		try {
			if (!fs.existsSync(CACHE_DIR)) {
				fs.mkdirSync(CACHE_DIR, { recursive: true });
			}
			fs.writeFileSync(CACHE_FILE, JSON.stringify(metadata, null, 2));
			fs.writeFileSync(LOCK_FILE, new Date().toISOString());
		} catch (error) {
			console.error("Failed to save cache to disk:", error);
		}
	}

	/**
	 * Check if cache is stale
	 */
	private isStale(): boolean {
		if (!this.memoryCache?.lastSync) return true;

		const age = Date.now() - new Date(this.memoryCache.lastSync).getTime();
		return age > CACHE_TTL;
	}

	/**
	 * Refresh cache in background (non-blocking)
	 */
	private refreshInBackground(): void {
		// Don't block, refresh async
		setImmediate(() => {
			this.sync().catch((error) => {
				console.error("Background refresh failed:", error);
			});
		});
	}
}

// Export singleton instance
export const cache = new SimpleCache();

// Initialize on module load
cache.initialize().catch((error) => {
	console.error("Failed to initialize cache:", error);
});
