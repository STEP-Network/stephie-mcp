#!/usr/bin/env tsx

import { config } from "dotenv";
import { mondayApi } from "./lib/monday/client.js";
import { getAccounts } from "./lib/tools/crm/getAccounts.js";
import { getDynamicColumns } from "./lib/tools/dynamic-columns.js";

config({ path: ".env.local" });

async function measurePerformance() {
	console.log("🔬 Performance Analysis: Dynamic Columns Impact\n");
	console.log("=".repeat(60));

	// Test 1: Measure getDynamicColumns overhead
	console.log("\n1. DYNAMIC COLUMNS FETCH TIME:");
	const colStart = Date.now();
	const columns = await getDynamicColumns("1402911027");
	const colTime = Date.now() - colStart;
	console.log(`   Time to fetch columns: ${colTime}ms`);
	console.log(`   Columns retrieved: ${columns.length}`);

	// Test 2: Direct query without dynamic columns
	console.log("\n2. DIRECT QUERY (hardcoded columns):");
	const directStart = Date.now();
	const directQuery = `
    query {
      boards(ids: [1402911027]) {
        items_page(limit: 5) {
          items {
            id
            name
            column_values(ids: ["status", "people", "text5"]) {
              text
            }
          }
        }
      }
    }
  `;
	await mondayApi(directQuery);
	const directTime = Date.now() - directStart;
	console.log(`   Direct query time: ${directTime}ms`);

	// Test 3: Full tool execution with dynamic columns
	console.log("\n3. FULL TOOL EXECUTION:");
	const toolStart = Date.now();
	await getAccounts({ limit: 5 });
	const toolTime = Date.now() - toolStart;
	console.log(`   Total tool execution: ${toolTime}ms`);
	console.log(
		`   Overhead from dynamic columns: ~${colTime}ms (${Math.round((colTime / toolTime) * 100)}%)`,
	);

	// Test 4: Cached performance (second call)
	console.log("\n4. CACHED PERFORMANCE:");
	const cachedStart = Date.now();
	const _cachedColumns = await getDynamicColumns("1402911027");
	const cachedTime = Date.now() - cachedStart;
	console.log(`   Cached fetch time: ${cachedTime}ms`);
	console.log(
		`   Speed improvement: ${Math.round((1 - cachedTime / colTime) * 100)}%`,
	);

	// Analysis
	console.log(`\n${"=".repeat(60)}`);
	console.log("📊 ANALYSIS:");
	console.log(`   • First call overhead: ${colTime}ms`);
	console.log(`   • Cached calls: ${cachedTime}ms`);
	console.log(`   • Two API calls needed: Column fetch + Data fetch`);
	console.log(`   • Network latency doubled for cold starts`);

	// Estimate with Redis/Local cache
	console.log("\n💡 PROJECTED IMPROVEMENTS:");
	console.log("   With Redis cache: ~5-10ms overhead");
	console.log("   With local file cache: ~1-2ms overhead");
	console.log("   With in-memory cache: ~0ms overhead");
	console.log("   With metadata-driven system: Single API call possible");
}

measurePerformance().catch(console.error);
