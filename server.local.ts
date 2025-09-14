import dotenv from "dotenv";
import express from "express";
import healthHandler from "./api/health.js";
import { POST as mcpHandlerPost } from "./api/server.js";

// Load environment variables
dotenv.config({ path: ".env.local" });

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());

// Convert Express req/res to Vercel format
const wrapHandler = (handler: any) => {
	return async (req: express.Request, res: express.Response) => {
		// Create Vercel-like request/response objects with Web API Request interface
		const vercelReq: any = {
			...req,
			query: req.query,
			cookies: req.cookies,
			body: req.body,
			headers: {
				...req.headers,
				get: (name: string) => req.headers[name.toLowerCase()]
			},
			method: req.method,
			url: `http://localhost:${PORT}${req.url}`,
		};

		const vercelRes: any = {
			status: (code: number) => {
				res.status(code);
				return vercelRes;
			},
			json: (data: any) => {
				res.json(data);
				return vercelRes;
			},
			setHeader: (key: string, value: string) => {
				res.setHeader(key, value);
				return vercelRes;
			},
			write: (data: any) => {
				res.write(data);
				return vercelRes;
			},
			end: (data?: any) => {
				if (data) {
					res.end(data);
				} else {
					res.end();
				}
				return vercelRes;
			},
		};

		await handler(vercelReq, vercelRes);
	};
};

// Routes
app.post("/api", wrapHandler(mcpHandlerPost));
app.post("/api/sse", wrapHandler(mcpHandlerPost)); // SSE uses same handler
app.get("/api/health", wrapHandler(healthHandler));
app.get("/health", wrapHandler(healthHandler));

// Root endpoint
app.get("/", (_req, res) => {
	res.json({
		service: "STEPhie MCP Server",
		status: "running",
		endpoints: {
			health: "/health",
			mcp: "/api (POST)",
			streaming: "/api/sse (POST)",
		},
		documentation: "https://github.com/stepnetwork/stephie-mcp",
	});
});

// Start server
app.listen(PORT, () => {
	console.log(`\n🚀 STEPhie MCP Server running at http://localhost:${PORT}`);
	console.log("\nEndpoints:");
	console.log(`  Health:    http://localhost:${PORT}/health`);
	console.log(`  MCP:       http://localhost:${PORT}/api`);
	console.log(`  Streaming: http://localhost:${PORT}/api/sse`);
	console.log("\nEnvironment:");
	console.log(
		`  Stack Project ID: ${process.env.NEXT_PUBLIC_STACK_PROJECT_ID ? "✓ Set" : "✗ Missing"}`,
	);
	console.log(
		`  Stack Secret Key: ${process.env.STACK_SECRET_SERVER_KEY ? "✓ Set" : "✗ Missing"}`,
	);
	console.log(
		`  Monday API Key:   ${process.env.MONDAY_API_KEY ? "✓ Set" : "✗ Missing"}`,
	);
	console.log("\n📝 To test: npm run test:local\n");
});
