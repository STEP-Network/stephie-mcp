import { JWT } from "google-auth-library";

interface TokenCache {
  token: string;
  expiry: number;
  jwtClient: JWT;
}

let tokenCache: TokenCache | null = null;

/**
 * Get Google Service Account authentication for Ad Manager API with caching
 */
export async function getGoogleServiceAuthCached(): Promise<JWT> {
  const serviceEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!serviceEmail || !privateKey) {
    throw new Error(
      "Google service account credentials not configured. Set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY environment variables.",
    );
  }

  // Return cached JWT client if available
  if (tokenCache?.jwtClient) {
    return tokenCache.jwtClient;
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

  // Cache the JWT client
  if (!tokenCache) {
    tokenCache = { token: "", expiry: 0, jwtClient };
  } else {
    tokenCache.jwtClient = jwtClient;
  }

  return jwtClient;
}

/**
 * Get access token for Google Ad Manager API with caching
 */
export async function getGAMAccessTokenCached(): Promise<string> {
  const now = Date.now();

  // Check if we have a valid cached token (with 5 minute buffer)
  if (tokenCache?.token && tokenCache.expiry > now + 5 * 60 * 1000) {
    console.error("[GAM Auth] Using cached access token");
    return tokenCache.token;
  }

  console.error("[GAM Auth] Fetching new access token");
  const jwtClient = await getGoogleServiceAuthCached();
  const tokenResponse = await jwtClient.getAccessToken();

  if (!tokenResponse.token) {
    throw new Error("Failed to get Google Ad Manager access token");
  }

  // Cache the token with expiry
  // Google OAuth tokens typically expire in 1 hour (3600 seconds)
  const expiry = now + 55 * 60 * 1000; // 55 minutes from now

  tokenCache = {
    token: tokenResponse.token,
    expiry,
    jwtClient: tokenCache?.jwtClient || jwtClient,
  };

  return tokenResponse.token;
}

/**
 * Clear the token cache (useful for testing or force refresh)
 */
export function clearTokenCache(): void {
  tokenCache = null;
}