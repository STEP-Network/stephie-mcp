import { StackServerApp } from "@stackframe/stack";

export interface AuthValidation {
	valid: boolean;
	userId?: string;
	error?: string;
}

export interface UserPermissions {
	canUsePublisherTools: boolean;
	canUseForecastTools: boolean;
	canUseMemoryTools: boolean;
	rateLimit: number;
}

export class StackAuthValidator {
	private stackApp: StackServerApp | null = null;

	constructor() {
		// Only initialize if we have the required env vars
		if (
			process.env.NEXT_PUBLIC_STACK_PROJECT_ID &&
			process.env.STACK_SECRET_SERVER_KEY
		) {
			this.stackApp = new StackServerApp({
				tokenStore: "none", // No cookie storage in MCP server
			});
		}
	}

	async validateToken(token: string): Promise<AuthValidation> {
		if (!this.stackApp) {
			return {
				valid: false,
				error: "Stack Auth not configured",
			};
		}

		try {
			// Remove 'Bearer ' prefix if present
			const cleanToken = token.replace("Bearer ", "");

			// Verify the token with Stack Auth
			const user = await this.stackApp.verifyTokenWithoutDatabase(cleanToken);

			if (user) {
				return {
					valid: true,
					userId: user.userId,
				};
			}

			return {
				valid: false,
				error: "Invalid token",
			};
		} catch (error) {
			console.error("Token validation failed:", error);
			return {
				valid: false,
				error:
					error instanceof Error ? error.message : "Token validation failed",
			};
		}
	}

	async getUserPermissions(userId: string): Promise<UserPermissions> {
		if (!this.stackApp) {
			// Default permissions if Stack Auth is not configured
			return {
				canUsePublisherTools: true,
				canUseForecastTools: true,
				canUseMemoryTools: true,
				rateLimit: 100,
			};
		}

		try {
			// Get user details from Stack Auth
			const user = await this.stackApp.getUser({ userId });

			// Extract permissions from user metadata
			// You can customize this based on your user metadata structure
			const metadata = user?.clientMetadata || {};

			return {
				canUsePublisherTools: metadata.canUsePublisherTools !== false,
				canUseForecastTools: metadata.canUseForecastTools !== false,
				canUseMemoryTools: metadata.canUseMemoryTools !== false,
				rateLimit: metadata.rateLimit || 100,
			};
		} catch (error) {
			console.error("Failed to get user permissions:", error);
			// Return default permissions on error
			return {
				canUsePublisherTools: true,
				canUseForecastTools: true,
				canUseMemoryTools: true,
				rateLimit: 100,
			};
		}
	}
}
