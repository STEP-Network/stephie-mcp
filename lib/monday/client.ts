/**
 * Monday.com API Client for MCP Server
 */

import type { MondayApiResponse } from "./types.js";

export type { 
	MondayApiResponse, 
	MondayBoardResponse, 
	MondayItemResponse, 
	MondayColumnValueResponse,
	MondayColumnValues,
	MondayColumnValue,
	GraphQLError
} from "./types.js";

export async function mondayApi(
	query: string,
	variables?: Record<string, unknown>,
): Promise<MondayApiResponse> {
	const apiKey = process.env.MONDAY_API_KEY;

	if (!apiKey) {
		throw new Error("MONDAY_API_KEY environment variable is not set");
	}

	const response = await fetch("https://api.monday.com/v2", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: apiKey,
		},
		body: JSON.stringify({
			query,
			variables,
		}),
	});

	if (!response.ok) {
		const errorBody = await response.text();
		console.error(
			`Monday.com API request failed: ${response.status}`,
			errorBody,
		);
		throw new Error(
			`Monday.com API responded with status: ${response.status}. Details: ${errorBody}`,
		);
	}

	const mondayResponse = (await response.json()) as MondayApiResponse;

	// Check for GraphQL errors
	if (mondayResponse.errors) {
		console.error("Monday.com GraphQL errors:", mondayResponse.errors);
		throw new Error(
			`Monday.com GraphQL error: ${mondayResponse.errors[0]?.message || "Unknown error"}`,
		);
	}

	return mondayResponse;
}

// Board IDs from STEPhie
export const BOARD_IDS = {
	PUBLISHERS: "1222800432", // Updated to correct accessible board ID
	PUBLISHER_FORMATS: "1222800432", // Publisher format matrix board
	AD_UNITS: "1558578956",
	KEY_VALUES: "1802371471",
	AUDIENCE_SEGMENTS: "2051827669",
	AD_PLACEMENTS: "1935559241",
	FORMATS: "1983719743", // Updated to correct Formater board ID
	PRODUCTS: "1901343536",
	AD_PRICES: "1919479291",
} as const;
