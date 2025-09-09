import type { VercelRequest, VercelResponse } from "@vercel/node";
import { gamRequestQueue } from "../lib/gam/request-queue.js";
import { getGAMAccessTokenCached } from "../lib/gam/auth-cache.js";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
	const healthChecks = {
		status: "healthy",
		service: "stephie-mcp",
		version: process.env.MCP_SERVER_VERSION || "1.0.0",
		timestamp: new Date().toISOString(),
		environment: process.env.VERCEL_ENV || "development",
		capabilities: ["tools", "streaming", "authentication"],
		checks: {
			api: "healthy",
			queue: {
				status: "healthy",
				pending: 0,
				active: 0,
			},
			auth: {
				status: "unknown",
				hasToken: false,
			},
			environment: {
				hasMonday: !!process.env.MONDAY_API_KEY,
				hasGAM: !!process.env.GOOGLE_AD_MANAGER_NETWORK_CODE,
				hasAuth: !!process.env.STEPHIE_AUTH_TOKEN,
			},
		},
	};

	try {
		// Check queue status
		healthChecks.checks.queue.pending = gamRequestQueue.getQueueLength();
		healthChecks.checks.queue.active = gamRequestQueue.getActiveRequests();
		
		// Check if we can get an auth token (cached)
		if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
			try {
				const token = await getGAMAccessTokenCached();
				healthChecks.checks.auth.status = "healthy";
				healthChecks.checks.auth.hasToken = !!token;
			} catch (error) {
				healthChecks.checks.auth.status = "error";
				console.error("[Health Check] Auth check failed:", error);
			}
		} else {
			healthChecks.checks.auth.status = "not_configured";
		}
		
		// Determine overall status
		if (healthChecks.checks.auth.status === "error") {
			healthChecks.status = "degraded";
		}
		
		if (healthChecks.checks.queue.pending > 10) {
			healthChecks.status = "degraded";
			healthChecks.checks.queue.status = "congested";
		}
		
		const statusCode = healthChecks.status === "healthy" ? 200 : 503;
		res.status(statusCode).json(healthChecks);
		
	} catch (error) {
		console.error("[Health Check] Error:", error);
		res.status(500).json({
			status: "error",
			service: "stephie-mcp",
			timestamp: new Date().toISOString(),
			error: String(error),
		});
	}
}
