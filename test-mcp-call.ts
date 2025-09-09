#!/usr/bin/env node

// Test MCP tool call to local server
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function testMCPCall() {
	const testPayload = {
		jsonrpc: "2.0",
		id: 1,
		method: "tools/call",
		params: {
			name: "getTasksTechIntelligence",
			arguments: {} // Empty arguments object
		}
	};

	try {
		console.log("🧪 Testing MCP tool call...");
		console.log("Payload:", JSON.stringify(testPayload, null, 2));

		const response = await fetch("http://localhost:3001/api", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(testPayload),
		});

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		const result = await response.json();
		console.log("✅ Response:", JSON.stringify(result, null, 2));
	} catch (error) {
		console.error("❌ Error:", error);
	}
}

testMCPCall();