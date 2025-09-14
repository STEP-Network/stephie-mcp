import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { TOOL_DEFINITIONS } from "../lib/mcp/toolDefinitions.js";
import { RESOURCE_DEFINITIONS } from "../lib/mcp/resources.js";

// Dynamic import to handle potential module resolution issues
let toolImplementations: Record<string, any> = {};
try {
	const module = await import("../lib/mcp/tool-implementations.js");
	toolImplementations = module.toolImplementations || {};
	console.log(`Loaded ${Object.keys(toolImplementations).length} tool implementations`);
} catch (error) {
	console.error("Failed to load tool implementations:", error);
	// Fallback: try to load individual tools if centralized import fails
	toolImplementations = {};
}

// Helper to get tool description
const getToolDescription = (name: string): string => {
	const tool = TOOL_DEFINITIONS.find((t) => t.name === name);
	return tool?.description || `Tool: ${name}`;
};

// Helper to build Zod schema from tool definition
const buildZodSchema = (name: string): Record<string, any> => {
	try {
		const tool = TOOL_DEFINITIONS.find((t) => t.name === name);
		if (!tool || !tool.inputSchema) return {};

		const schema: Record<string, any> = {};
		const props = tool.inputSchema.properties || {};
		const required = tool.inputSchema.required || [];

		for (const [key, prop] of Object.entries(props as Record<string, any>)) {
			let zodType: any;

			if (prop.type === "string") {
				if (prop.enum) {
					zodType = z.enum(prop.enum as [string, ...string[]]);
				} else {
					zodType = z.string();
				}
			} else if (prop.type === "number") {
				zodType = z.number();
			} else if (prop.type === "boolean") {
				zodType = z.boolean();
			} else if (prop.type === "array") {
				const items = prop.items || {};
				if (items.type === "string") {
					zodType = z.array(z.string());
				} else if (items.type === "number") {
					// Handle array of arrays of numbers with preprocessing
					zodType = z.preprocess((val: any) => {
						if (Array.isArray(val)) {
							return val.map((item: any) => {
								if (typeof item === "string") {
									try {
										const parsed = JSON.parse(item);
										return Array.isArray(parsed) ? parsed : item;
									} catch {
										return item;
									}
								}
								return item;
							});
						}
						return val;
					}, z.array(z.array(z.number())));
				} else if (items.type === "object") {
					// Handle array of objects
					const objSchema: Record<string, any> = {};
					if (items.properties) {
						for (const [objKey, objProp] of Object.entries(items.properties as Record<string, any>)) {
							if (objProp.type === "string") {
								objSchema[objKey] = objProp.enum 
									? z.enum(objProp.enum as [string, ...string[]])
									: z.string();
							} else if (objProp.type === "number") {
								objSchema[objKey] = z.number();
							} else if (objProp.type === "boolean") {
								objSchema[objKey] = z.boolean();
							} else if (objProp.type === "array") {
								objSchema[objKey] = z.array(z.string());
							} else if (!objProp.type) {
								// Handle missing type (defaults to any)
								objSchema[objKey] = z.any();
							}
							
							// Handle required fields for nested objects
							if (!objProp.required) {
								objSchema[objKey] = objSchema[objKey]?.optional?.();
							}
							
							if (objProp.description && objSchema[objKey]) {
								objSchema[objKey] = objSchema[objKey].describe(objProp.description);
							}
						}
					}
					zodType = z.array(z.object(objSchema));
				}
			} else if (prop.type === "object") {
			// Handle nested objects like geoTargeting and link__1
			const objSchema: Record<string, any> = {};
			if (prop.properties) {
				for (const [objKey, objProp] of Object.entries(prop.properties as Record<string, any>)) {
					if (objProp.type === "string") {
						objSchema[objKey] = z.string();
					} else if (objProp.type === "number") {
						objSchema[objKey] = z.number();
					} else if (objProp.type === "array") {
						// Use preprocess for nested arrays in objects too
						objSchema[objKey] = z.preprocess((val: any) => {
							if (Array.isArray(val)) {
								return val.map((item: any) => {
									if (typeof item === "string") {
										try {
											return JSON.parse(item);
										} catch {
											return item;
										}
									}
									return item;
								});
							}
							return val;
						}, z.array(z.string()));
					}
					
					// Mark as optional if not in required list for nested objects
					const isRequired = objProp.required !== false;
					if (!isRequired) {
						objSchema[objKey] = objSchema[objKey]?.optional?.();
					}
					
					if (objProp.description && objSchema[objKey]) {
						objSchema[objKey] = objSchema[objKey].describe(objProp.description);
					}
				}
			}
			zodType = z.object(objSchema);
		} else if (!prop.type) {
			// Handle cases where type is not defined (defaults to any)
			zodType = z.any();
		}

		// Mark as optional if not in required list
		if (zodType && !required.includes(key)) {
			zodType = zodType.optional();
		}

		// Add description if available
		if (prop.description && zodType) {
			zodType = zodType.describe(prop.description);
		}

		// Handle default values
		if (prop.default !== undefined && zodType) {
			zodType = zodType.default(prop.default);
		}

		if (zodType) {
			schema[key] = zodType;
		}
		}

		// Create the final Zod schema
	const finalSchema = z.object(schema);

	// If there are no required fields, make everything optional
	if (required.length === 0) {
		return finalSchema.partial();
	}

	return finalSchema;
	} catch (error) {
		console.error(`Error building Zod schema for ${name}:`, error);
		return {};
	}
};

// Track active requests for debugging
const activeRequests = new Map<string, { tool: string; startTime: number }>();

// Create the MCP handler with all tools
const handler = createMcpHandler((server) => {
	// Register all tools from TOOL_DEFINITIONS
	for (const toolDef of TOOL_DEFINITIONS) {
		const implementation = toolImplementations[toolDef.name];
		if (!implementation) {
			console.warn(`No implementation found for tool: ${toolDef.name}`);
			continue;
		}

		server.tool(
			toolDef.name,
			getToolDescription(toolDef.name),
			buildZodSchema(toolDef.name),
			async (input) => {
				const result = await implementation(input);
				// Convert to string if needed
				const textResult = typeof result === 'string' ? result : JSON.stringify(result);
				return { content: [{ type: "text", text: textResult }] };
			}
		);
	}

	// Register all resources from RESOURCE_DEFINITIONS
	RESOURCE_DEFINITIONS.forEach((resource) => {
		server.resource(
			resource.name,
			resource.uri,
			async () => {
				const response = await resource.fetcher();
				// Resources should already return proper MCP format
				return {
					contents: [
						{
							uri: resource.uri,
							mimeType: resource.mimeType || 'application/json',
							text: response
						}
					]
				};
			}
		);
	});
});

// Export for Vercel
export default async function POST(request: Request) {
	// Determine if this is an SSE request
	const isSSE = request.headers.get('accept')?.includes('text/event-stream');
	
	// Log incoming request
	const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	console.log(`[${requestId}] Incoming ${isSSE ? 'SSE' : 'JSON-RPC'} request`);
	
	try {
		// Parse request body
		const body = await request.json() as any;
		console.log(`[${requestId}] Method: ${body.method}, ID: ${body.id}`);
		
		// Track if this is a tool call
		if (body.method === 'tools/call') {
			const toolName = body.params?.name || 'unknown';
			activeRequests.set(requestId, { tool: toolName, startTime: Date.now() });
			console.log(`[${requestId}] Starting tool: ${toolName}`);
		}
		
		// Special handling for resources/read to support ChatGPT
		if (body.method === 'resources/read' && body.params?.uri) {
			// Find the matching resource by URI
			const resource = RESOURCE_DEFINITIONS.find(r => r.uri === body.params.uri);
			
			if (resource) {
				try {
					// Call the resource fetcher
					const result = await resource.fetcher();
					
					// Format response - for resources/read, we need the contents array
					const response = {
						jsonrpc: '2.0',
						id: body.id,
						result: {
							contents: [
								{
									uri: resource.uri,
									mimeType: resource.mimeType || 'application/json',
									text: typeof result === 'string' ? result : JSON.stringify(result)
								}
							]
						}
					};
					
					if (isSSE) {
						// Format as SSE
						return new Response(
							`data: ${JSON.stringify(response)}\n\n`,
							{
								status: 200,
								headers: {
									'Content-Type': 'text/event-stream',
									'Cache-Control': 'no-cache',
									'Connection': 'keep-alive'
								}
							}
						);
					} else {
						return new Response(
							JSON.stringify(response),
							{
								status: 200,
								headers: { 'Content-Type': 'application/json' }
							}
						);
					}
				} catch (error) {
					const errorResponse = {
						jsonrpc: '2.0',
						id: body.id,
						error: {
							code: -32603,
							message: `Failed to fetch resource: ${error}`
						}
					};
					
					if (isSSE) {
						return new Response(
							`data: ${JSON.stringify(errorResponse)}\n\n`,
							{
								status: 200,
								headers: {
									'Content-Type': 'text/event-stream',
									'Cache-Control': 'no-cache',
									'Connection': 'keep-alive'
								}
							}
						);
					} else {
						return new Response(
							JSON.stringify(errorResponse),
							{
								status: 200,
								headers: { 'Content-Type': 'application/json' }
							}
						);
					}
				}
			}
		}
		
		// Process with MCP handler
		const result = await handler(body);
		
		// Clean up tracking
		if (activeRequests.has(requestId)) {
			const { tool, startTime } = activeRequests.get(requestId)!;
			const duration = Date.now() - startTime;
			console.log(`[${requestId}] Completed tool: ${tool} in ${duration}ms`);
			activeRequests.delete(requestId);
		}
		
		console.log(`[${requestId}] Response ready`);
		
		// Format response based on request type
		if (isSSE) {
			// For SSE, wrap in data field
			return new Response(
				`data: ${JSON.stringify(result)}\n\n`,
				{
					status: 200,
					headers: {
						'Content-Type': 'text/event-stream',
						'Cache-Control': 'no-cache',
						'Connection': 'keep-alive'
					}
				}
			);
		} else {
			// For JSON-RPC, return as-is
			return new Response(
				JSON.stringify(result),
				{
					status: 200,
					headers: { 'Content-Type': 'application/json' }
				}
			);
		}
	} catch (error) {
		console.error(`[${requestId}] Error:`, error);
		
		// Clean up if error occurred
		if (activeRequests.has(requestId)) {
			activeRequests.delete(requestId);
		}
		
		const errorResponse = {
			jsonrpc: '2.0',
			id: null,
			error: {
				code: -32700,
				message: `Parse error: ${error}`
			}
		};
		
		if (isSSE) {
			return new Response(
				`data: ${JSON.stringify(errorResponse)}\n\n`,
				{
					status: 200,
					headers: {
						'Content-Type': 'text/event-stream',
						'Cache-Control': 'no-cache',
						'Connection': 'keep-alive'
					}
				}
			);
		} else {
			return new Response(
				JSON.stringify(errorResponse),
				{
					status: 400,
					headers: { 'Content-Type': 'application/json' }
				}
			);
		}
	}
}