#!/usr/bin/env tsx

import { config } from "dotenv";
import { cache } from "./lib/cache/simple-cache.js";
import { getAccounts } from "./lib/tools/crm/getAccounts.js";
import { getDynamicColumns } from "./lib/tools/dynamic-columns.js";

config({ path: ".env.local" });

async function testCachePerformance() {
	console.log("🧪 Testing Cache Performance\n");
	console.log("=".repeat(60));

	// Test 1: First sync (populate cache)
	console.log("\n1. INITIAL CACHE SYNC:");
	const syncStart = Date.now();
	await cache.sync();
	const syncTime = Date.now() - syncStart;
	console.log(`   ✅ Sync completed in ${syncTime}ms`);

	// Test 2: Cache read performance
	console.log("\n2. CACHE READ PERFORMANCE:");
	const boardId = "1402911027"; // Accounts board

	const cacheStart = Date.now();
	const columnsFromCache = await cache.getColumns(boardId);
	const cacheTime = Date.now() - cacheStart;
	console.log(
		`   Cache read: ${cacheTime}ms (${columnsFromCache.length} columns)`,
	);

	// Test 3: getDynamicColumns with cache
	console.log("\n3. GET DYNAMIC COLUMNS (with cache):");
	const dynamicStart = Date.now();
	const dynamicColumns = await getDynamicColumns(boardId);
	const dynamicTime = Date.now() - dynamicStart;
	console.log(
		`   Dynamic columns: ${dynamicTime}ms (${dynamicColumns.length} columns)`,
	);

	// Test 4: Full tool execution
	console.log("\n4. FULL TOOL EXECUTION:");
	const toolStart = Date.now();
	const result = await getAccounts({ limit: 2 });
	const toolTime = Date.now() - toolStart;
	const lines = result.split("\n").length;
	console.log(`   Tool execution: ${toolTime}ms (${lines} lines of output)`);

	// Test 5: Second call (should be instant)
	console.log("\n5. SECOND CALL (cached):");
	const cachedStart = Date.now();
	const _cachedColumns = await getDynamicColumns(boardId);
	const cachedTime = Date.now() - cachedStart;
	console.log(`   Cached call: ${cachedTime}ms`);

	// Summary
	console.log(`\n${"=".repeat(60)}`);
	console.log("📊 PERFORMANCE SUMMARY:");
	console.log(`   Initial sync: ${syncTime}ms (one-time cost)`);
	console.log(`   Cache reads: ${cacheTime}ms`);
	console.log(`   Tool overhead: ~${dynamicTime}ms (was 3900ms before cache)`);
	console.log(
		`   Performance improvement: ${Math.round((1 - dynamicTime / 3900) * 100)}%`,
	);

	// Check cache metadata
	const metadata = await cache.getMetadata();
	console.log("\n📦 CACHE STATS:");
	console.log(
		`   Boards cached: ${Object.keys(metadata?.columns || {}).length}`,
	);
	console.log(
		`   Total columns: ${Object.values(metadata?.columns || {}).reduce((sum, cols) => sum + cols.length, 0)}`,
	);
	console.log(`   Last sync: ${metadata?.lastSync}`);
	console.log(
		`   Cache location: ${process.env.VERCEL ? "/tmp/cache" : "./cache"}`,
	);
}

testCachePerformance().catch(console.error);
