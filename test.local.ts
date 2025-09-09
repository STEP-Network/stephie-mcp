import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

const BASE_URL = "http://localhost:3001";
const TOKEN = process.env.TEST_AUTH_TOKEN || process.argv[2] || null; // Pass token as argument or env var

// Color helpers for console output
const colors = {
	green: (text: string) => `\x1b[32m${text}\x1b[0m`,
	red: (text: string) => `\x1b[31m${text}\x1b[0m`,
	yellow: (text: string) => `\x1b[33m${text}\x1b[0m`,
	blue: (text: string) => `\x1b[34m${text}\x1b[0m`,
	gray: (text: string) => `\x1b[90m${text}\x1b[0m`,
};

async function testEndpoint(name: string, fn: () => Promise<void>) {
	try {
		console.log(`\n${colors.blue("→")} Testing ${name}...`);
		await fn();
		console.log(`${colors.green("✓")} ${name} passed`);
	} catch (error) {
		console.log(`${colors.red("✗")} ${name} failed`);
		console.error(
			colors.gray(
				`  ${error instanceof Error ? error.message : String(error)}`,
			),
		);
	}
}

async function runTests() {
	console.log(colors.yellow("\n🧪 STEPhie MCP Server Test Suite\n"));
	console.log(`Server URL: ${BASE_URL}`);
	console.log(
		`Auth Token: ${TOKEN ? colors.green("Configured") : colors.red("Missing")}\n`,
	);

	// Test 1: Health Check
	await testEndpoint("Health Check", async () => {
		const response = await fetch(`${BASE_URL}/health`);
		if (!response.ok) throw new Error(`HTTP ${response.status}`);
		const data = await response.json();
		if (data.status !== "healthy") throw new Error("Unhealthy status");
		console.log(colors.gray(`  Service: ${data.service} v${data.version}`));
	});

	// Test 2: Initialize without auth (should fail)
	await testEndpoint("Initialize (No Auth)", async () => {
		const response = await fetch(`${BASE_URL}/api`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				jsonrpc: "2.0",
				method: "initialize",
				params: {},
				id: 1,
			}),
		});

		const data = await response.json();
		if (!data.error || data.error.code !== -32001) {
			throw new Error("Should require authentication");
		}
		console.log(colors.gray(`  Correctly rejected: ${data.error.message}`));
	});

	// Test 3: Initialize with auth
	if (TOKEN) {
		await testEndpoint("Initialize (With Auth)", async () => {
			const response = await fetch(`${BASE_URL}/api`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${TOKEN}`,
				},
				body: JSON.stringify({
					jsonrpc: "2.0",
					method: "initialize",
					params: { authToken: TOKEN },
					id: 2,
				}),
			});

			const data = await response.json();
			if (data.error) {
				throw new Error(data.error.message);
			}

			console.log(colors.gray(`  Protocol: ${data.result.protocolVersion}`));
			console.log(
				colors.gray(
					`  Server: ${data.result.serverInfo.name} v${data.result.serverInfo.version}`,
				),
			);
			if (data.result.user) {
				console.log(colors.gray(`  User ID: ${data.result.user.id}`));
			}
		});

		// Test 4: List Tools
		await testEndpoint("List Tools", async () => {
			const response = await fetch(`${BASE_URL}/api`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${TOKEN}`,
				},
				body: JSON.stringify({
					jsonrpc: "2.0",
					method: "tools/list",
					id: 3,
				}),
			});

			const data = await response.json();
			if (data.error) throw new Error(data.error.message);

			const tools = data.result.tools;
			console.log(colors.gray(`  Found ${tools.length} tools:`));
			tools.slice(0, 5).forEach((tool: any) => {
				console.log(colors.gray(`    - ${tool.name}`));
			});
			if (tools.length > 5) {
				console.log(colors.gray(`    ... and ${tools.length - 5} more`));
			}
		});

		// Test 5: Call a Tool
		await testEndpoint("Call Tool (getAllPublishers)", async () => {
			const response = await fetch(`${BASE_URL}/api`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${TOKEN}`,
				},
				body: JSON.stringify({
					jsonrpc: "2.0",
					method: "tools/call",
					params: {
						name: "getAllPublishers",
						arguments: { limit: 5 },
					},
					id: 4,
				}),
			});

			const data = await response.json();
			if (data.error) throw new Error(data.error.message);

			console.log(
				colors.gray(
					`  Response: ${JSON.stringify(data.result).substring(0, 100)}...`,
				),
			);
		});

		// Test 6: SSE Streaming
		await testEndpoint("SSE Streaming", async () => {
			const response = await fetch(`${BASE_URL}/api/sse`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${TOKEN}`,
				},
				body: JSON.stringify({
					method: "tools/call",
					params: {
						name: "getAllPublishers",
						arguments: { limit: 3 },
					},
				}),
			});

			if (!response.ok) throw new Error(`HTTP ${response.status}`);

			const text = await response.text();
			const events = text.split("\n\n").filter((e) => e.startsWith("data: "));
			console.log(colors.gray(`  Received ${events.length} SSE events`));

			const firstEvent = events[0];
			if (firstEvent) {
				const eventData = JSON.parse(firstEvent.substring(6));
				console.log(colors.gray(`  First event type: ${eventData.type}`));
			}
		});
	} else {
		console.log(colors.yellow("\n⚠️  Skipping authenticated tests"));
		console.log(
			colors.gray("  To run full tests, set TEST_AUTH_TOKEN in .env.local"),
		);
		console.log(
			colors.gray("  Get a token from: https://ai.stepnetwork.dk/api-keys"),
		);
	}

	console.log(colors.green("\n✨ Test suite completed!\n"));
}

// Run tests
runTests().catch((error) => {
	console.error(colors.red("\n❌ Test suite failed:"));
	console.error(error);
	process.exit(1);
});
