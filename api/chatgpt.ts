/**
 * ChatGPT MCP Endpoint - Open authentication version
 * This endpoint is designed for ChatGPT Custom Connectors
 * URL: https://stephie-mcp.vercel.app/chatgpt
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { TOOL_DEFINITIONS } from "../lib/mcp/toolDefinitions.js";
import { RESOURCE_DEFINITIONS } from "../lib/mcp/resources.js";
import { toolImplementations } from "../lib/mcp/tool-implementations.js";

// Helper to build Zod schema from tool definition
const buildZodSchema = (name: string): z.ZodObject<any> => {
	const tool = TOOL_DEFINITIONS.find((t) => t.name === name);
	if (!tool || !tool.inputSchema) return z.object({});

	const schemaProperties: Record<string, any> = {};

	Object.entries(tool.inputSchema.properties || {}).forEach(
		([key, prop]: [string, any]) => {
			let zodType: any;

			// Handle arrays
			if (prop.type === "array") {
				if (prop.items?.type === "string") {
					zodType = z.array(z.string());
				} else if (prop.items?.type === "number") {
					zodType = z.array(z.number());
				} else if (prop.items?.type === "object") {
					zodType = z.array(z.record(z.any()));
				} else {
					zodType = z.array(z.any());
				}
			}
			// Handle anyOf types (for nullable fields)
			else if (prop.anyOf) {
				const types = prop.anyOf.map((t: any) => {
					if (t.type === "string") {
						return t.enum ? z.enum(t.enum as any) : z.string();
					}
					if (t.type === "number") return z.number();
					if (t.type === "boolean") return z.boolean();
					if (t.type === "null") return z.null();
					if (t.type === "array") {
						return z.array(z.any());
					}
					return z.any();
				});
				zodType = z.union(types as any);
			}
			// Handle arrays in type field
			else if (Array.isArray(prop.type)) {
				const types = prop.type.map((t: string) => {
					if (t === "string") return z.string();
					if (t === "number") return z.number();
					if (t === "boolean") return z.boolean();
					if (t === "null") return z.null();
					return z.any();
				});
				zodType = types.length > 1 ? z.union(types as any) : types[0];
			}
			// Handle single types
			else if (prop.type === "string") {
				zodType = prop.enum ? z.enum(prop.enum as any) : z.string();
			} else if (prop.type === "number" || prop.type === "integer") {
				zodType = z.number();
			} else if (prop.type === "boolean") {
				zodType = z.boolean();
			} else if (prop.type === "object") {
				zodType = z.record(z.any());
			} else {
				zodType = z.any();
			}

			// Add description
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
		},
	);

	return z.object(schemaProperties);
};

// Create the MCP handler with open authentication for ChatGPT
const handler = createMcpHandler(
	async (server) => {
		// Register all tools
		TOOL_DEFINITIONS.forEach((toolDef) => {
			const implementation = toolImplementations[toolDef.name];
			if (!implementation) {
				console.warn(`No implementation found for tool: ${toolDef.name}`);
				return;
			}

			server.tool(
				toolDef.name,
				toolDef.description || "",
				buildZodSchema(toolDef.name),
				async (input) => {
					try {
						// No authentication required for ChatGPT endpoint
						const result = await implementation(input);
						
						return {
							content: [
								{
									type: "text",
									text: typeof result === "string" 
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
									text: `Error: ${
										error instanceof Error
											? error.message
											: "Unknown error"
									}`,
								},
							],
						};
					}
				},
			);
		});

		// Register all resources
		RESOURCE_DEFINITIONS.forEach((resource) => {
			server.resource(
				resource.name,
				resource.uri,
				{
					description: resource.description,
					mimeType: resource.mimeType as "application/json"
				},
				async () => {
					try {
						// No authentication required for ChatGPT endpoint
						const content = await resource.fetcher();
						return {
							contents: [{
								uri: resource.uri,
								mimeType: resource.mimeType as "application/json",
								text: typeof content === 'string' ? content : JSON.stringify(content)
							}]
						};
					} catch (error) {
						throw new Error(
							`Failed to fetch resource ${resource.uri}: ${
								error instanceof Error ? error.message : 'Unknown error'
							}`
						);
					}
				}
			);
		});

		console.log(
			`ChatGPT MCP server initialized with ${TOOL_DEFINITIONS.length} tools and ${RESOURCE_DEFINITIONS.length} resources (no auth)`,
		);
	},
	{
		serverInfo: {
			name: "stephie-chatgpt-mcp",
			version: "1.0.0",
		},
		capabilities: {
			tools: { listChanged: true },
			resources: { listChanged: true },
			completions: {},
		},
	},
	{
		basePath: "/chatgpt",
		streamableHttpEndpoint: "/chatgpt",
		sseEndpoint: "/chatgpt/sse",
		sseMessageEndpoint: "/chatgpt/message",
		verboseLogs: process.env.NODE_ENV === "development",
	},
);

export default async function chatgptHandler(
	req: VercelRequest,
	res: VercelResponse,
) {
	// Handle CORS for ChatGPT
	res.setHeader("Access-Control-Allow-Origin", "*");
	res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
	res.setHeader(
		"Access-Control-Allow-Headers",
		"Content-Type, Authorization, Accept, X-Requested-With",
	);

	if (req.method === "OPTIONS") {
		return res.status(200).end();
	}

	// No authentication check - open endpoint for ChatGPT
	console.log(`ChatGPT MCP request: ${req.method} ${req.url}`);
	
	return handler(req, res);
}