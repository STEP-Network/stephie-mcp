/**
 * Test setup file - runs before all tests
 */

import { config } from "dotenv";
import { afterAll, beforeAll } from "vitest";

// Load environment variables
config({ path: ".env.local" });

// Ensure test auth token is set
beforeAll(() => {
	if (!process.env.STEPHIE_AUTH_TOKEN && !process.env.TEST_AUTH_TOKEN) {
		process.env.TEST_AUTH_TOKEN = "test-token";
	}
});

// Clean up after tests
afterAll(() => {
	// Any cleanup needed
});

// Set longer timeout for API tests
export const TEST_TIMEOUT = 30000;
