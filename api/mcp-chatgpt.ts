/**
 * ChatGPT MCP Endpoint - Direct implementation without mcp-handler
 * URL: https://stephie-mcp.vercel.app/api/mcp-chatgpt
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";
import { TOOL_DEFINITIONS } from "../lib/mcp/toolDefinitions.js";
import { RESOURCE_DEFINITIONS } from "../lib/mcp/resources.js";
import { toolImplementations } from "../lib/mcp/tool-implementations.js";

// Helper to build Zod schema from tool definition
const buildZodSchema = (name: string): Record<string, any> => {
	const tool = TOOL_DEFINITIONS.find((t) => t.name === name);
	if (!tool || !tool.inputSchema) return {};

	const schemaProperties: Record<string, any> = {};

	Object.entries(tool.inputSchema.properties || {}).forEach(
		([key, prop]: [string, any]) => {
			let zodType: any;

			// Handle arrays
			if (prop.type === "array") {
				zodType = z.array(z.any());
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

	return schemaProperties;
};

export default async function handler(
	req: VercelRequest,
	res: VercelResponse,
) {
	// Handle CORS
	res.setHeader("Access-Control-Allow-Origin", "*");
	res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
	res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept");
	res.setHeader("Access-Control-Allow-Credentials", "true");

	if (req.method === "OPTIONS") {
		return res.status(200).end();
	}

	// For SSE transport
	if (req.headers.accept?.includes("text/event-stream")) {
		res.setHeader("Content-Type", "text/event-stream");
		res.setHeader("Cache-Control", "no-cache");
		res.setHeader("Connection", "keep-alive");
		res.setHeader("X-Accel-Buffering", "no");

		const transport = new SSEServerTransport("/api/mcp-chatgpt", res);
		
		const server = new McpServer(
			{
				name: "stephie-chatgpt",
				version: "1.0.0",
			},
			{
				capabilities: {
					tools: {},
					resources: {},
				},
			}
		);

		// Register tools
		for (const toolDef of TOOL_DEFINITIONS) {
			const implementation = toolImplementations[toolDef.name];
			if (!implementation) continue;

			server.tool(
				toolDef.name,
				toolDef.description || "",
				buildZodSchema(toolDef.name),
				async (input) => {
					try {
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
						return {
							content: [
								{
									type: "text",
									text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
								},
							],
						};
					}
				},
			);
		}

		// Register resources
		for (const resource of RESOURCE_DEFINITIONS) {
			server.resource(
				resource.name,
				resource.uri,
				{
					description: resource.description,
					mimeType: resource.mimeType as "application/json",
				},
				async () => {
					const content = await resource.fetcher();
					return {
						contents: [{
							uri: resource.uri,
							mimeType: resource.mimeType as "application/json",
							text: typeof content === 'string' ? content : JSON.stringify(content)
						}]
					};
				}
			);
		}

		await server.connect(transport);
		
		// Keep connection alive
		req.on("close", () => {
			transport.close();
		});
	} else {
		// Regular JSON-RPC request
		res.setHeader("Content-Type", "application/json");
		
		const server = new McpServer(
			{
				name: "stephie-chatgpt",
				version: "1.0.0",
			},
			{
				capabilities: {
					tools: {},
					resources: {},
				},
			}
		);

		// Simple JSON-RPC handler
		const body = req.body;
		
		if (body.method === "initialize") {
			res.json({
				jsonrpc: "2.0",
				id: body.id,
				result: {
					protocolVersion: body.params.protocolVersion || "2024-11-05",
					capabilities: {
						tools: { listChanged: true },
						resources: { listChanged: true },
					},
					serverInfo: {
						name: "stephie-chatgpt",
						version: "1.0.0",
					},
				},
			});
		} else if (body.method === "tools/list") {
			// ChatGPT requires exactly these two tools with specific signatures
			const chatGPTTools = [
				{
					name: "search",
					description: "Search for records matching a query",
					inputSchema: {
						type: "object",
						properties: {
							query: {
								type: "string",
								description: "Search query string"
							}
						},
						required: ["query"]
					}
				},
				{
					name: "fetch",
					description: "Fetch a record by ID or URI",
					inputSchema: {
						type: "object",
						properties: {
							id: {
								type: "string",
								description: "Record ID or URI to fetch"
							}
						},
						required: ["id"]
					}
				}
			];
			
			res.json({
				jsonrpc: "2.0",
				id: body.id,
				result: {
					tools: chatGPTTools,
				},
			});
		} else if (body.method === "resources/list") {
			res.json({
				jsonrpc: "2.0",
				id: body.id,
				result: {
					resources: RESOURCE_DEFINITIONS.map(r => ({
						uri: r.uri,
						name: r.name,
						description: r.description,
						mimeType: r.mimeType,
					})),
				},
			});
		} else if (body.method === "tools/call") {
			const toolName = body.params.name;
			
			// Handle ChatGPT's specific tool signatures
			if (toolName === "search") {
				const searchImpl = toolImplementations.search;
				if (!searchImpl) {
					res.json({
						jsonrpc: "2.0",
						id: body.id,
						error: {
							code: -32601,
							message: "Search tool not found",
						},
					});
					return;
				}
				
				try {
					// ChatGPT passes "query" directly, not in a params object
					const query = body.params.arguments?.query || "";
					const result = await searchImpl({ query, limit: 20 });
					res.json({
						jsonrpc: "2.0",
						id: body.id,
						result: {
							content: [
								{
									type: "text",
									text: typeof result === "string" 
										? result 
										: JSON.stringify(result, null, 2),
								},
							],
						},
					});
				} catch (error) {
					res.json({
						jsonrpc: "2.0",
						id: body.id,
						error: {
							code: -32603,
							message: error instanceof Error ? error.message : "Unknown error",
						},
					});
				}
			} else if (toolName === "fetch") {
				const fetchImpl = toolImplementations.fetch;
				if (!fetchImpl) {
					res.json({
						jsonrpc: "2.0",
						id: body.id,
						error: {
							code: -32601,
							message: "Fetch tool not found",
						},
					});
					return;
				}
				
				try {
					// ChatGPT passes "id" but our implementation expects "uri"
					const id = body.params.arguments?.id || "";
					const result = await fetchImpl({ uri: id });
					res.json({
						jsonrpc: "2.0",
						id: body.id,
						result: {
							content: [
								{
									type: "text",
									text: typeof result === "string" 
										? result 
										: JSON.stringify(result, null, 2),
								},
							],
						},
					});
				} catch (error) {
					res.json({
						jsonrpc: "2.0",
						id: body.id,
						error: {
							code: -32603,
							message: error instanceof Error ? error.message : "Unknown error",
						},
					});
				}
			} else {
				res.json({
					jsonrpc: "2.0",
					id: body.id,
					error: {
						code: -32601,
						message: `Tool not found: ${toolName}`,
					},
				});
			}
		} else if (body.method === "resources/read") {
			const uri = body.params?.uri;
			if (!uri) {
				res.json({
					jsonrpc: "2.0",
					id: body.id,
					error: {
						code: -32602,
						message: "Missing URI parameter",
					},
				});
				return;
			}
			
			const resource = RESOURCE_DEFINITIONS.find(r => r.uri === uri);
			if (!resource) {
				res.json({
					jsonrpc: "2.0",
					id: body.id,
					error: {
						code: -32602,
						message: `Resource not found: ${uri}`,
					},
				});
				return;
			}
			
			try {
				const content = await resource.fetcher();
				res.json({
					jsonrpc: "2.0",
					id: body.id,
					result: {
						contents: [{
							uri: resource.uri,
							mimeType: resource.mimeType,
							text: typeof content === 'string' ? content : JSON.stringify(content)
						}]
					},
				});
			} catch (error) {
				res.json({
					jsonrpc: "2.0",
					id: body.id,
					error: {
						code: -32603,
						message: error instanceof Error ? error.message : "Unknown error",
					},
				});
			}
		} else {
			res.json({
				jsonrpc: "2.0",
				id: body.id,
				error: {
					code: -32601,
					message: `Method not found: ${body.method}`,
				},
			});
		}
	}
}