import { JWT } from "google-auth-library";

/**
 * Get Google Service Account authentication for Ad Manager API
 */
export async function getGoogleServiceAuth(): Promise<JWT> {
	const serviceEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
	const privateKey = process.env.GOOGLE_PRIVATE_KEY;

	if (!serviceEmail || !privateKey) {
		throw new Error(
			"Google service account credentials not configured. Set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY environment variables.",
		);
	}

	// Replace escaped newlines in private key
	const formattedPrivateKey = privateKey.replace(/\\n/g, "\n");

	const jwtClient = new JWT({
		email: serviceEmail,
		key: formattedPrivateKey,
		scopes: [
			"https://www.googleapis.com/auth/dfp",
			"https://www.googleapis.com/auth/admanager",
		],
	});

	// Authorize the client (important!)
	await jwtClient.authorize();

	return jwtClient;
}

/**
 * Get access token for Google Ad Manager API
 */
export async function getGAMAccessToken(): Promise<string> {
	const jwtClient = await getGoogleServiceAuth();
	const tokenResponse = await jwtClient.getAccessToken();

	if (!tokenResponse.token) {
		throw new Error("Failed to get Google Ad Manager access token");
	}

	return tokenResponse.token;
}
