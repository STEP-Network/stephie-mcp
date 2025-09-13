#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { z } from "zod";
import { AuthValidator } from "./lib/auth/auth-validator.js";
import { TOOL_DEFINITIONS } from "./lib/mcp/toolDefinitions.js";
import { RESOURCE_DEFINITIONS } from "./lib/mcp/resources.js";
import { toolImplementations } from "./lib/mcp/tool-implementations.js";

// Helper to build Zod schema from tool definition
const buildZodSchema = (name: string): Record<string, any> => {
	const tool = TOOL_DEFINITIONS.find((t) => t.name === name);
	if (!tool || !tool.inputSchema) return {};
	
	const schemaProperties: Record<string, any> = {};
	
	Object.entries(tool.inputSchema.properties || {}).forEach(([key, prop]: [string, any]) => {
		// Build the Zod schema based on type
		let zodType;
		if (prop.type === "number" || prop.type === "integer") {
			zodType = z.number();
		} else if (prop.type === "boolean") {
			zodType = z.boolean();
		} else if (prop.type === "array") {
			zodType = z.array(z.string());
		} else {
			zodType = z.string();
		}
		
		// Add description if available
		if (prop.description) {
			zodType = zodType.describe(prop.description);
		}
		
		// Add default if available
		if (prop.default !== undefined) {
			zodType = zodType.default(prop.default);
		}
		
		// Make optional if not required
		const requiredFields = tool.inputSchema.required || [];
		if (!requiredFields.includes(key)) {
			zodType = zodType.optional();
		}
		
		schemaProperties[key] = zodType;
	});
	
	return schemaProperties;
};

// Create auth validator
const authValidator = new AuthValidator();

// Create MCP server with implementation info
const mcpServer = new McpServer(
	{
		name: "stephie-mcp",
		version: "1.0.0",
		description: "MCP server for STEP Networks' STEPhie platform integration",
		vendor: "STEP Networks",
	},
	{
		capabilities: {
			tools: {},
			resources: {},
		},
	}
);

// Register all tools from TOOL_DEFINITIONS
for (const toolDef of TOOL_DEFINITIONS) {
	const implementation = toolImplementations[toolDef.name];
	if (!implementation) {
		console.warn(`No implementation found for tool: ${toolDef.name}`);
		continue;
	}

	// Register tool with McpServer
	mcpServer.tool(
		toolDef.name,
		toolDef.description || "",
		buildZodSchema(toolDef.name),
		async (args) => {
			try {
				// Validate authentication for non-test environments
				if (process.env.NODE_ENV !== "test" && !process.env.TEST_AUTH_TOKEN) {
					const authToken = process.env.STEPHIE_AUTH_TOKEN;
					if (!authToken) {
						throw new Error(
							"Authentication required. Please provide STEPHIE_AUTH_TOKEN.",
						);
					}

					// Skip validation for test token
					if (authToken !== "test-token") {
						const isValid = await authValidator.validateToken(authToken);
						if (!isValid) {
							throw new Error("Invalid authentication token.");
						}
					}
				}

				const result = await implementation(args || {});
				
				return {
					content: [
						{
							type: "text",
							text:
								typeof result === "string"
									? result
									: JSON.stringify(result, null, 2),
						},
					],
				};
			} catch (error) {
				console.error(`Error in tool ${toolDef.name}:`, error);
				return {
					content: [
						{
							type: "text",
							text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
						},
					],
				};
			}
		}
	);
}

// Register all resources from RESOURCE_DEFINITIONS
for (const resourceDef of RESOURCE_DEFINITIONS) {
	mcpServer.resource(
		resourceDef.name,
		resourceDef.uri,
		{
			description: resourceDef.description,
			mimeType: resourceDef.mimeType as "application/json",
		},
		async () => {
			try {
				const content = await resourceDef.fetcher();
				return {
					contents: [{
						uri: resourceDef.uri,
						mimeType: resourceDef.mimeType as "application/json",
						text: typeof content === 'string' ? content : JSON.stringify(content)
					}]
				};
			} catch (error) {
				throw new Error(`Failed to fetch resource ${resourceDef.uri}: ${error instanceof Error ? error.message : 'Unknown error'}`);
			}
		}
	);
}

// Start the server
async function main() {
	const transport = new StdioServerTransport();
	await mcpServer.connect(transport);
	console.error("MCP Server running on stdio");
}

main().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});