import { parseStringPromise } from "xml2js";
import { getAvailabilityForecast } from "../gam/soap.js";
import { type MondayItemResponse, mondayApi } from "../monday/client.js";
import { createToolResponse, createErrorResponse } from "./json-output.js";

export type ContendingLineItem = {
	lineItemId: number;
	lineItemName?: string;
	orderName?: string;
	priority?: number;
	contendingImpressions: number;
};

export type TargetingCriteriaBreakdown = {
	targetingCriterion: string;
	targetingDimension: string;
	availableUnits: number;
	matchedUnits: number;
};

export type CustomTargeting = {
	keyId: string;
	keyName?: string;
	valueIds: string[];
	valueNames?: string[];
	operator?: "IS" | "IS_NOT";
};

/**
 * Availability forecast tool for Google Ad Manager SOAP API
 * Returns JSON-formatted forecast data for LLM consumption
 */
export const availabilityForecast = async (params: {
	startDate: string;
	endDate: string;
	goalQuantity?: number | null;
	targetedAdUnitIds?: number[] | null;
	sizes: number[][];
	excludedAdUnitIds?: number[] | null;
	audienceSegmentIds?: string[] | null;
	customTargeting?: Array<{
		keyId: string;
		valueIds: string[];
		operator?: "IS" | "IS_NOT";
	}> | null;
	frequencyCapMaxImpressions?: number | null;
	frequencyCapTimeUnit?:
		| "MINUTE"
		| "HOUR"
		| "DAY"
		| "WEEK"
		| "MONTH"
		| "LIFETIME"
		| null;
	geoTargeting?: {
		targetedLocationIds?: string[];
		excludedLocationIds?: string[];
	} | null;
	targetedPlacementIds?: string[] | null;
}): Promise<string> => {
	console.error("[availabilityForecast] START. Tool execution started.");

	try {
		const {
			startDate,
			endDate,
			goalQuantity,
			targetedAdUnitIds,
			sizes,
			excludedAdUnitIds,
			audienceSegmentIds,
			customTargeting,
			frequencyCapMaxImpressions,
			frequencyCapTimeUnit = "WEEK",
			geoTargeting,
			targetedPlacementIds,
		} = params;

		// Add default ad unit ID if none provided
		// 21808880960 is the RON (Run of Network) ad unit - targets all inventory
		const effectiveTargetedAdUnitIds = (!targetedAdUnitIds || targetedAdUnitIds.length === 0) 
			? [21808880960] 
			: targetedAdUnitIds;

		console.error(
			"[availabilityForecast] Making GAM availability forecast with params:",
			{
				startDate,
				endDate,
				goalQuantity,
				targetedAdUnitIds: effectiveTargetedAdUnitIds.length,
				excludedAdUnitIds: excludedAdUnitIds?.length || 0,
				sizes: sizes.length,
				audienceSegmentIds: audienceSegmentIds?.length || 0,
				customTargeting: customTargeting?.length || 0,
				frequencyCapMaxImpressions,
				frequencyCapTimeUnit,
				geoTargeting,
				targetedPlacementIds: targetedPlacementIds?.length || 0,
			},
		);

		const sizeValues = sizes.map(([width, height]) => ({
			width,
			height,
		}));

		// Check if startDate is "now" for immediate start
		const isImmediateStart = startDate.toLowerCase() === "now";

		// Call the SOAP implementation with timeout protection
		const startTime = Date.now();
		console.error(`[availabilityForecast] Starting SOAP request at ${new Date(startTime).toISOString()}`);
		
		const soapResult = await getAvailabilityForecast({
			startDateTime: isImmediateStart ? "IMMEDIATELY" : startDate,
			endDateTime: endDate,
			sizes: sizeValues,
			goalImpressions: goalQuantity || null,
			targetedAdUnitIds: effectiveTargetedAdUnitIds,
			excludedAdUnitIds: excludedAdUnitIds || null,
			audienceSegmentIds: audienceSegmentIds || null,
			customTargeting: customTargeting || null,
			frequencyCapMaxImpressions: frequencyCapMaxImpressions || null,
			frequencyCapTimeUnit: frequencyCapTimeUnit || "WEEK",
			geoTargeting: geoTargeting
				? {
						targetedLocationIds: geoTargeting.targetedLocationIds?.map((id) =>
							Number.parseInt(id, 10),
						),
						excludedLocationIds: geoTargeting.excludedLocationIds?.map((id) =>
							Number.parseInt(id, 10),
						),
					}
				: null,
			targetedPlacementIds:
				targetedPlacementIds?.map((id) => Number.parseInt(id, 10)) || null,
		});
		
		const elapsed = Date.now() - startTime;
		console.error(`[availabilityForecast] SOAP request completed in ${elapsed}ms`);

		if (!soapResult.success) {
			console.error(`[availabilityForecast] SOAP request failed after ${elapsed}ms:`, soapResult.error);
			throw new Error(soapResult.error || "SOAP request failed");
		}

		// Parse the SOAP response XML
		if (!soapResult.data) {
			throw new Error("No data returned from SOAP request");
		}
		const parsedSoapResult = await parseStringPromise(soapResult.data);

		// Navigate the XML structure for availability forecast
		const soapBody = parsedSoapResult["soap:Envelope"]["soap:Body"][0];
		const getAvailabilityForecastResponse =
			soapBody.getAvailabilityForecastResponse[0];
		const rval = getAvailabilityForecastResponse.rval[0];

		// Extract availability metrics
		const availableUnits = Number.parseInt(rval.availableUnits?.[0] || "0", 10);
		const matchedUnits = Number.parseInt(rval.matchedUnits?.[0] || "0", 10);
		const possibleUnits = Number.parseInt(rval.possibleUnits?.[0] || "0", 10);
		const deliveredUnits = Number.parseInt(rval.deliveredUnits?.[0] || "0", 10);
		const reservedUnits = Number.parseInt(rval.reservedUnits?.[0] || "0", 10);

		// Extract contending line items
		const contendingLineItems: ContendingLineItem[] = [];
		if (rval.contendingLineItems) {
			const items = Array.isArray(rval.contendingLineItems)
				? rval.contendingLineItems
				: [rval.contendingLineItems];

			items.forEach((item: Record<string, unknown>) => {
				if (item) {
					const lineItemIdArray = item.lineItemId as string[] | undefined;
					const lineItemId = Number.parseInt(lineItemIdArray?.[0] || "0", 10);

					const lineItemNameArray = item.lineItemName as string[] | undefined;
					const nameArray = item.name as string[] | undefined;
					const priorityArray = item.priority as string[] | undefined;
					const contendingImpressionsArray = item.contendingImpressions as
						| string[]
						| undefined;

					contendingLineItems.push({
						lineItemId,
						lineItemName: lineItemNameArray?.[0] || nameArray?.[0],
						priority: priorityArray?.[0]
							? Number.parseInt(priorityArray[0], 10)
							: undefined,
						contendingImpressions: Number.parseInt(
							contendingImpressionsArray?.[0] || "0",
							10,
						),
					});
				}
			});
		}

		// Extract targeting criteria breakdown
		const targetingCriteriaBreakdown: TargetingCriteriaBreakdown[] = [];
		if (rval.targetingCriteriaBreakdowns?.[0]) {
			const breakdowns = Array.isArray(rval.targetingCriteriaBreakdowns)
				? rval.targetingCriteriaBreakdowns
				: [rval.targetingCriteriaBreakdowns];

			breakdowns.forEach((breakdown: Record<string, unknown>) => {
				if (breakdown) {
					targetingCriteriaBreakdown.push({
						targetingCriterion:
							(breakdown.targetingCriteriaName as string[])?.[0] ||
							(breakdown.targetingCriterion as string[])?.[0] ||
							"Unknown",
						targetingDimension: (breakdown.targetingDimension as string[])?.[0] || "Unknown",
						availableUnits: Number.parseInt(
							(breakdown.availableUnits as string[])?.[0] || "0",
							10,
						),
						matchedUnits: Number.parseInt(
							(breakdown.matchedUnits as string[])?.[0] || "0",
							10,
						),
					});
				}
			});
		}

		console.error("[availabilityForecast] Availability Forecast Results:", {
			availableUnits,
			matchedUnits,
			possibleUnits,
			deliveredUnits,
			reservedUnits,
			contendingLineItems: contendingLineItems.length,
			targetingBreakdowns: targetingCriteriaBreakdown.length,
		});

		// Fetch ad unit names from Monday.com if we have IDs
		const adUnitNames: Record<number, string> = {};
		const allAdUnitIds = [
			...effectiveTargetedAdUnitIds,
			...(excludedAdUnitIds || []),
		];

		if (allAdUnitIds.length > 0) {
			try {
				const query = `{
          boards(ids: 1558569789) {
            items_page(limit: 500, query_params: { 
              rules: [{
                column_id: "text__1",
                compare_value: [${allAdUnitIds.join(", ")}],
                operator: any_of
              }]
            }) {
              items {
                name
                column_values(ids: ["text__1"]) {
                  ... on TextValue {
                    text
                  }
                }
              }
            }
          }
        }`;

				const response = await mondayApi(query);
				const items = response.data?.boards?.[0]?.items_page?.items || [];

				items.forEach((item: Record<string, unknown>) => {
					const adUnitId = (item as MondayItemResponse).column_values?.[0]
						?.text;
					if (adUnitId) {
						const id = Number.parseInt(adUnitId, 10);
						if (!Number.isNaN(id)) {
							adUnitNames[id] = item.name as string;
						}
					}
				});

				console.error(
					`[availabilityForecast] Fetched ${Object.keys(adUnitNames).length} ad unit names from Monday.com`,
				);
			} catch (error) {
				console.error(
					"[availabilityForecast] Failed to fetch ad unit names from Monday.com:",
					error,
				);
			}
		}

		// Build JSON output
		const forecastData = {
			metrics: {
				availableUnits,
				matchedUnits,
				possibleUnits,
				deliveredUnits,
				reservedUnits
			},
			request: {
				period: {
					start: startDate.toLowerCase() === "now" ? "now" : startDate,
					end: endDate
				},
				sizes: sizes.map(([w, h]) => ({ width: w, height: h })),
				goal: goalQuantity || null
			},
			targeting: {} as any,
			contendingLineItems: contendingLineItems.length > 0 ? contendingLineItems : [],
			targetingBreakdown: targetingCriteriaBreakdown.length > 0 ? targetingCriteriaBreakdown : [],
			goalAchievement: null as any
		};

		// Add targeting details to JSON
		if (effectiveTargetedAdUnitIds.length > 0) {
			forecastData.targeting.adUnits = effectiveTargetedAdUnitIds.map(id => ({
				id,
				name: adUnitNames[id] || `Ad Unit ${id}`
			}));
		}

		if (excludedAdUnitIds && excludedAdUnitIds.length > 0) {
			forecastData.targeting.excludedAdUnits = excludedAdUnitIds.map(id => ({
				id,
				name: adUnitNames[id] || `Ad Unit ${id}`
			}));
		}

		if (audienceSegmentIds && audienceSegmentIds.length > 0) {
			forecastData.targeting.audienceSegments = audienceSegmentIds;
		}

		if (customTargeting && customTargeting.length > 0) {
			forecastData.targeting.customTargeting = customTargeting;
		}

		if (geoTargeting?.targetedLocationIds?.length || geoTargeting?.excludedLocationIds?.length) {
			forecastData.targeting.geo = {
				targeted: geoTargeting.targetedLocationIds || [],
				excluded: geoTargeting.excludedLocationIds || []
			};
		}

		if (targetedPlacementIds && targetedPlacementIds.length > 0) {
			forecastData.targeting.placements = targetedPlacementIds;
		}

		if (frequencyCapMaxImpressions) {
			forecastData.targeting.frequencyCap = {
				maxImpressions: frequencyCapMaxImpressions,
				timeUnit: frequencyCapTimeUnit || "WEEK"
			};
		}

		// Calculate goal achievement
		if (goalQuantity) {
			const percentageAvailable = (availableUnits / goalQuantity) * 100;
			forecastData.goalAchievement = {
				percentage: Math.round(percentageAvailable),
				status: percentageAvailable >= 95 ? 'achievable' : 
				        percentageAvailable >= 75 ? 'partially_achievable' : 
				        'difficult',
				canFulfill: percentageAvailable >= 100
			};
		}

		// Build summary
		let summary = '';
		if (goalQuantity) {
			const percentageAvailable = (availableUnits / goalQuantity) * 100;
			summary = `GAM can deliver ${availableUnits.toLocaleString()} impressions (${Math.round(percentageAvailable)}% of ${goalQuantity.toLocaleString()} goal) for the specified targeting and period.`;
		} else {
			summary = `GAM has ${availableUnits.toLocaleString()} available impressions for the specified targeting and period.`;
		}

		// Return JSON response
		const metadata = {
			dateRange: `${startDate} to ${endDate}`,
			sizesCount: sizes.length,
			targetedAdUnitsCount: effectiveTargetedAdUnitIds.length,
			excludedAdUnitsCount: excludedAdUnitIds?.length || 0,
			contendingLineItemsCount: contendingLineItems.length
		};

		return JSON.stringify(
			createToolResponse(
				"availabilityForecast",
				forecastData,
				metadata,
				{ summary }
			),
			null,
			2
		);
	} catch (error) {
		console.error("[availabilityForecast] ERROR in tool execution:", error);
		const errorMessage =
			(error as Error)?.message ||
			(typeof error === "string" ? error : "Failed to fetch forecast");

		return JSON.stringify(
			createErrorResponse(
				"availabilityForecast",
				errorMessage,
				{
					startDate: params.startDate,
					endDate: params.endDate,
					sizes: params.sizes
				}
			),
			null,
			2
		);
	}
};

// Export the tool schema for MCP (unchanged)
export const availabilityForecastTool = {
	name: "availabilityForecast",
	description:
		"Get availability forecast from Google Ad Manager. Returns impression availability for specified ad units, targeting, and date range.",
	inputSchema: {
		type: "object",
		properties: {
			startDate: {
				type: "string",
				description:
					'Start date in YYYY-MM-DD format or "now" for immediate start',
			},
			endDate: {
				type: "string",
				description: "End date in YYYY-MM-DD format",
			},
			goalQuantity: {
				type: ["number", "null"],
				description:
					"Target number of impressions. Leave null for maximum available",
			},
			targetedAdUnitIds: {
				type: ["array", "null"],
				items: { type: "number" },
				description:
					"Array of ad unit IDs to target (from findPublisherAdUnits)",
			},
			sizes: {
				type: "array",
				items: {
					type: "array",
					items: { type: "number" },
					minItems: 2,
					maxItems: 2,
				},
				description:
					"Array of ad sizes as [width, height] pairs, e.g. [[300,250], [728,90]]",
			},
			excludedAdUnitIds: {
				type: ["array", "null"],
				items: { type: "number" },
				description: "Array of ad unit IDs to exclude from forecast",
			},
			audienceSegmentIds: {
				type: ["array", "null"],
				items: { type: "string" },
				description: "Array of audience segment IDs for demographic targeting",
			},
			customTargeting: {
				type: ["array", "null"],
				items: {
					type: "object",
					properties: {
						keyId: { type: "string" },
						valueIds: { type: "array", items: { type: "string" } },
						operator: { type: "string", enum: ["IS", "IS_NOT"] },
					},
					required: ["keyId", "valueIds"],
				},
				description: "Array of custom targeting key-value pairs",
			},
			frequencyCapMaxImpressions: {
				type: ["number", "null"],
				description: "Maximum impressions per user for frequency capping",
			},
			frequencyCapTimeUnit: {
				type: ["string", "null"],
				enum: ["MINUTE", "HOUR", "DAY", "WEEK", "MONTH", "LIFETIME"],
				description: "Time unit for frequency capping",
			},
			geoTargeting: {
				type: ["object", "null"],
				properties: {
					targetedLocationIds: {
						type: "array",
						items: { type: "string" },
						description: "Array of location IDs to target",
					},
					excludedLocationIds: {
						type: "array",
						items: { type: "string" },
						description: "Array of location IDs to exclude",
					},
				},
				description: "Geographic targeting configuration",
			},
			targetedPlacementIds: {
				type: ["array", "null"],
				items: { type: "string" },
				description: "Array of placement IDs to target",
			},
		},
		required: ["startDate", "endDate", "sizes"],
	},
} as const;