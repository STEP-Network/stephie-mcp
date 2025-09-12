import {
	type MondayItemResponse,
	mondayApi,
} from "../../monday/client.js";
import { createListResponse } from "../json-output.js";

const AD_PRICES_BOARD_ID = "1432155906";

interface ColumnValue {
	column?: {
		id?: string;
		title?: string;
		type?: string;
	};
	text?: string | null;
	display_value?: string;
}

export async function getAllAdPrices() {
	try {
		const query = `{
			boards(ids: ${AD_PRICES_BOARD_ID}) {
				items_page(limit: 500) {
					items {
						id
						name
						column_values {
							column {
								id
								title
								type
							}
							text
							... on BoardRelationValue {
								display_value
							}
						}
					}
				}
			}
		}`;

		console.error(`[getAllAdPrices] Fetching ad prices...`);

		// Execute query
		const response = await mondayApi(query);

		const allPrices: Array<Record<string, unknown>> = [];

		// Process the single response
		const items = response.data?.boards?.[0]?.items_page?.items || [];

		for (const item of items as MondayItemResponse[]) {
			const columnValues: Record<string, unknown> = {};
			let productType = "display"; // Default to display

			item.column_values?.forEach((col: ColumnValue) => {
				const columnId = col.column?.id || "";

				// Handle board relation column for product type (using ID)
				if (columnId === "board_relation_mkvq72fm" && col.display_value) {
					productType = col.display_value.toLowerCase();
				}
				// Handle number columns (they come as text in the response)
				else if (col.column?.type === "numbers") {
					const numValue = col.text ? parseFloat(col.text) : null;
					// Map column IDs to semantic keys
					switch (columnId) {
						case "numbers": // Brutto CPM
							columnValues["bruttoCPM"] = numValue;
							break;
						case "numbers0": // Minimum CPM
							columnValues["minimumCPM"] = numValue;
							break;
						case "numbers7": // Bulk
							columnValues["bulk"] = numValue;
							break;
						case "numbers4": // CPC
							columnValues["cpc"] = numValue;
							break;
						case "numbers5": // SSP Floorprice
							columnValues["sspFloorprice"] = numValue;
							break;
						case "numeric_mktawenh": // Pris pr. kvartal
							columnValues["prisPerKvartal"] = numValue;
							break;
					}
				}
				// Handle text columns
				else if (col.column?.type === "text") {
					switch (columnId) {
						case "text": // Platform
							columnValues["platform"] = col.text || null;
							break;
						case "text3": // Link
							columnValues["link"] = col.text || null;
							break;
					}
				}
			});

			allPrices.push({
				name: item.name,
				type: productType,
				platform: columnValues["platform"] || "Not specified",
				bruttoCPM: columnValues["bruttoCPM"],
				minimumCPM: columnValues["minimumCPM"],
				bulk: columnValues["bulk"],
				cpc: columnValues["cpc"],
				sspFloorprice: columnValues["sspFloorprice"],
				prisPerKvartal: columnValues["prisPerKvartal"],
				link: columnValues["link"] && columnValues["link"] !== "" && columnValues["link"] !== "-" ? columnValues["link"] : null,
			});
		}

		// Group by product name and type
		const pricesByTypeAndProduct = new Map<string, Map<string, Array<Record<string, unknown>>>>();

		for (const price of allPrices) {
			if (!pricesByTypeAndProduct.has(price.type as string)) {
				pricesByTypeAndProduct.set(price.type as string, new Map());
			}
			const typeMap = pricesByTypeAndProduct.get(price.type as string);
			if (!typeMap) continue;

			if (!typeMap.has(price.name as string)) {
				typeMap.set(price.name as string, []);
			}
			typeMap.get(price.name as string)?.push(price);
		}

		// Count prices by type for metadata
		const displayCount = allPrices.filter(p => p.type === "display").length;
		const videoCount = allPrices.filter(p => p.type === "video").length;
		const otherCount = allPrices.length - displayCount - videoCount;

		// Build metadata
		const metadata = {
			boardId: AD_PRICES_BOARD_ID,
			boardName: "Ad Prices",
			totalCount: allPrices.length,
			displayCount,
			videoCount,
			otherCount,
			currency: "DKK",
			priceTypes: ["Brutto CPM", "Minimum CPM", "Bulk", "CPC", "SSP Floorprice", "Pris pr. kvartal"]
		};

		const summary = `Found ${allPrices.length} ad prices (${displayCount} display, ${videoCount} video, ${otherCount} other) in DKK`;

		return JSON.stringify(
			createListResponse(
				"getAllAdPrices",
				allPrices,
				metadata,
				{ summary }
			),
			null,
			2
		);
	} catch (error) {
		console.error("Error fetching ad prices:", error);
		throw new Error(
			`Failed to fetch ad prices: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}
}
