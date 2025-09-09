import { parseStringPromise } from "xml2js";
import { getGoogleServiceAuthCached, getGAMAccessTokenCached } from "./auth-cache.js";
import { gamRequestQueue } from "./request-queue.js";

/**
 * Builds geo targeting XML for SOAP request
 */
function buildGeoTargetingXML(geoTargeting: {
	targetedLocationIds?: number[];
	excludedLocationIds?: number[];
}): string {
	if (
		!geoTargeting.targetedLocationIds?.length &&
		!geoTargeting.excludedLocationIds?.length
	) {
		return "";
	}

	let geoTargetingXML = "<geoTargeting>";

	if (
		geoTargeting.targetedLocationIds &&
		geoTargeting.targetedLocationIds.length > 0
	) {
		geoTargetingXML += "\n                            <targetedLocations>";
		geoTargeting.targetedLocationIds.forEach((id) => {
			geoTargetingXML += `\n                                <id>${id}</id>`;
		});
		geoTargetingXML += "\n                            </targetedLocations>";
	}

	if (
		geoTargeting.excludedLocationIds &&
		geoTargeting.excludedLocationIds.length > 0
	) {
		geoTargetingXML += "\n                            <excludedLocations>";
		geoTargeting.excludedLocationIds.forEach((id) => {
			geoTargetingXML += `\n                                <id>${id}</id>`;
		});
		geoTargetingXML += "\n                            </excludedLocations>";
	}

	geoTargetingXML += "\n                        </geoTargeting>";

	return geoTargetingXML;
}

/**
 * Builds a SOAP XML request for the Google Ad Manager Availability Forecast API
 */
function buildAvailabilityForecastXML(params: {
	startDateTime: string;
	endDateTime: string;
	sizes: Array<{ width: number; height: number }>;
	goalImpressions?: number | null;
	targetedAdUnitIds?: number[] | null;
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
		| "LIFETIME";
	geoTargeting?: {
		targetedLocationIds?: number[];
		excludedLocationIds?: number[];
	} | null;
	targetedPlacementIds?: number[] | null;
}) {
	const {
		startDateTime,
		endDateTime,
		sizes,
		goalImpressions,
		targetedAdUnitIds,
		excludedAdUnitIds,
		audienceSegmentIds,
		customTargeting,
		frequencyCapMaxImpressions,
		frequencyCapTimeUnit = "WEEK",
		geoTargeting,
		targetedPlacementIds,
	} = params;

	const sizesXML = sizes
		.map(
			(size) => `
        <creativePlaceholders>
            <size>
                <width>${size.width}</width>
                <height>${size.height}</height>
                <isAspectRatio>false</isAspectRatio>
            </size>
        </creativePlaceholders>`,
		)
		.join("");

	// Build inventory targeting XML
	let inventoryTargeting = "";
	if (targetedAdUnitIds && targetedAdUnitIds.length > 0) {
		const targetedUnits = targetedAdUnitIds
			.map(
				(id) => `
            <targetedAdUnits>
                <adUnitId>${id}</adUnitId>
                <includeDescendants>true</includeDescendants>
            </targetedAdUnits>`,
			)
			.join("");
		inventoryTargeting += targetedUnits;
	}

	if (excludedAdUnitIds && excludedAdUnitIds.length > 0) {
		const excludedUnits = excludedAdUnitIds
			.map(
				(id) => `
            <excludedAdUnits>
                <adUnitId>${id}</adUnitId>
                <includeDescendants>true</includeDescendants>
            </excludedAdUnits>`,
			)
			.join("");
		inventoryTargeting += excludedUnits;
	}

	// Add targeted placement IDs
	if (targetedPlacementIds && targetedPlacementIds.length > 0) {
		const placementTargeting = targetedPlacementIds
			.map(
				(id) => `
            <targetedPlacementIds>${id}</targetedPlacementIds>`,
			)
			.join("");
		inventoryTargeting += placementTargeting;
	}

	// Build custom targeting XML
	let customTargetingXML = "";
	const customCriteria: string[] = [];

	// Add audience segments
	if (audienceSegmentIds && audienceSegmentIds.length > 0) {
		const segmentIdsXML = audienceSegmentIds
			.map(
				(id) =>
					`                                <audienceSegmentIds>${id}</audienceSegmentIds>`,
			)
			.join("\n");

		customCriteria.push(`
                            <children xsi:type="AudienceSegmentCriteria">
                                <operator>IS</operator>
${segmentIdsXML}
                            </children>`);
	}

	// Add key-value targeting
	if (customTargeting && customTargeting.length > 0) {
		for (const ct of customTargeting) {
			customCriteria.push(`
                            <children xsi:type="CustomCriteria">
                                <keyId>${ct.keyId}</keyId>
                                ${ct.valueIds.map((id) => `<valueIds>${id}</valueIds>`).join("\n                                ")}
                                <operator>${ct.operator || "IS"}</operator>
                            </children>`);
		}
	}

	// Combine all custom criteria
	if (customCriteria.length > 0) {
		customTargetingXML = `
                        <customTargeting>
                            <logicalOperator>${customCriteria.length > 1 ? "AND" : "OR"}</logicalOperator>${customCriteria.join("")}
                        </customTargeting>`;
	}

	// Handle date/time formatting
	let startDateTimeXML: string;

	if (startDateTime === "IMMEDIATELY") {
		startDateTimeXML = "<startDateTimeType>IMMEDIATELY</startDateTimeType>";
	} else {
		const startDate = new Date(startDateTime);
		startDateTimeXML = `
            <startDateTime>
                <date>
                    <year>${startDate.getFullYear()}</year>
                    <month>${startDate.getMonth() + 1}</month>
                    <day>${startDate.getDate()}</day>
                </date>
                <hour>0</hour>
                <minute>0</minute>
                <second>0</second>
                <timeZoneId>Europe/Copenhagen</timeZoneId>
            </startDateTime>`;
	}

	const endDate = new Date(endDateTime);
	const endDateTimeXML = `
        <endDateTime>
            <date>
                <year>${endDate.getFullYear()}</year>
                <month>${endDate.getMonth() + 1}</month>
                <day>${endDate.getDate()}</day>
            </date>
            <hour>23</hour>
            <minute>59</minute>
            <second>59</second>
            <timeZoneId>Europe/Copenhagen</timeZoneId>
        </endDateTime>`;

	return `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
    <soapenv:Header>
        <ns1:RequestHeader soapenv:actor="http://schemas.xmlsoap.org/soap/actor/next" soapenv:mustUnderstand="0" xmlns:ns1="https://www.google.com/apis/ads/publisher/v202502">
            <ns1:networkCode>${process.env.GOOGLE_AD_MANAGER_NETWORK_CODE?.replace(/"/g, "")}</ns1:networkCode>
            <ns1:applicationName>STEPhie-MCP</ns1:applicationName>
        </ns1:RequestHeader>
    </soapenv:Header>
    <soapenv:Body>
        <getAvailabilityForecast xmlns="https://www.google.com/apis/ads/publisher/v202502">
            <lineItem>
                <lineItem>
                    ${startDateTimeXML}
                    ${endDateTimeXML}
                    ${
											frequencyCapMaxImpressions
												? `<frequencyCaps>
                        <maxImpressions>${frequencyCapMaxImpressions}</maxImpressions>
                        <timeUnit>${frequencyCapTimeUnit || "WEEK"}</timeUnit>
                    </frequencyCaps>`
												: ""
										}
                    <lineItemType>STANDARD</lineItemType>
                    <costType>CPM</costType>
                    ${sizesXML}
                    <primaryGoal>
                        <goalType>LIFETIME</goalType>
                        <unitType>IMPRESSIONS</unitType>
                        ${goalImpressions ? `<units>${goalImpressions}</units>` : ""}
                    </primaryGoal>
                    <targeting>
                        ${geoTargeting ? buildGeoTargetingXML(geoTargeting) : ""}
                        <inventoryTargeting>
                            ${inventoryTargeting}
                        </inventoryTargeting>
                        ${customTargetingXML}
                    </targeting>
                </lineItem>
            </lineItem>
            <forecastOptions xsi:type="AvailabilityForecastOptions">
                <includeTargetingCriteriaBreakdown>true</includeTargetingCriteriaBreakdown>
                <includeContendingLineItems>true</includeContendingLineItems>
            </forecastOptions>
        </getAvailabilityForecast>
    </soapenv:Body>
</soapenv:Envelope>`;
}

/**
 * Executes a SOAP request to get availability forecast from Google Ad Manager
 */
export async function getAvailabilityForecast(params: {
	startDateTime: string;
	endDateTime: string;
	sizes: Array<{ width: number; height: number }>;
	goalImpressions?: number | null;
	targetedAdUnitIds?: number[] | null;
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
		| "LIFETIME";
	geoTargeting?: {
		targetedLocationIds?: number[];
		excludedLocationIds?: number[];
	} | null;
	targetedPlacementIds?: number[] | null;
}) {
	// Queue the request to avoid rate limiting
	return gamRequestQueue.add(async () => {
		try {
			// Get cached access token
			const token = await getGAMAccessTokenCached();
			console.error("[GAM SOAP] Access Token acquired");

			// Build SOAP XML payload
			const xmlBody = buildAvailabilityForecastXML(params);

			console.error("[GAM SOAP] Sending SOAP request to GAM API");

			// Make the request
			const response = await fetch(
			`https://www.google.com/apis/ads/publisher/v202502/ForecastService?getAvailabilityForecast`,
			{
				method: "POST",
				headers: {
					"Content-Type": "text/xml;charset=UTF-8",
					Authorization: `Bearer ${token}`,
					"Accept-Encoding": "gzip",
				},
				body: xmlBody,
			},
		);

		if (!response.ok) {
			const errorText = await response.text();
			console.error("SOAP Response Error Body:", errorText);

			// Extract fault string from SOAP response using xml2js
			let faultString = "Unknown fault";
			try {
				const parsedResponse = await parseStringPromise(errorText);
				faultString =
					parsedResponse["soap:Envelope"]["soap:Body"][0]["soap:Fault"][0]
						.faultstring[0];
				console.error("[GAM SOAP] Parsed Fault String:", faultString);
			} catch (parseError) {
				console.error("Failed to parse SOAP response:", parseError);
			}

			throw new Error(
				`SOAP request failed with status: ${response.status}, Fault: ${faultString}`,
			);
		}

		const responseText = await response.text();
		console.error("[GAM SOAP] Received SOAP response from GAM API");
		return {
			success: true,
			data: responseText,
		};
		} catch (error) {
			console.error("SOAP Request Failed:", error);
			return {
				success: false,
				error: error instanceof Error ? error.message : "Unknown error occurred",
			};
		}
	});
}
