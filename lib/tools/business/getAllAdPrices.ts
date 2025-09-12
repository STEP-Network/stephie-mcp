import {
	type MondayItemResponse,
	mondayApi,
} from "../../monday/client.js";

const AD_PRICES_BOARD_ID = "1432155906";

interface ColumnValue {
	column?: {
		title?: string;
		type?: string;
	};
	text?: string | null;
	display_value?: string;
}

export async function getAllAdPrices(type: "display" | "video" | "all" = "all") {
	try {
		const query = `{
			boards(ids: ${AD_PRICES_BOARD_ID}) {
				items_page(limit: 500) {
					items {
						id
						name
						column_values {
							column {
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
				const title = col.column?.title || "";

				// Handle board relation column for product type
				if (title === "*Produktgrupper" && col.display_value) {
					productType = col.display_value.toLowerCase();
				}
				// Handle number columns (they come as text in the response)
				else if (col.column?.type === "numbers") {
					const numValue = col.text ? parseFloat(col.text) : null;
					columnValues[title] = numValue;
				}
				// Handle other text columns
				else {
					columnValues[title] = col.text || null;
				}
			});

			const bruttoCPM = columnValues["Brutto CPM"];
			const minimumCPM = columnValues["Minimum CPM"];
			const bulk = columnValues["Bulk"];
			const cpc = columnValues["CPC"];
			const sspFloorprice = columnValues["SSP Floorprice"];
			const platform = columnValues["Platform"];
			const link = columnValues["Link"];

			allPrices.push({
				name: item.name,
				type: productType,
				platform: platform || "Not specified",
				bruttoCPM,
				minimumCPM,
				bulk,
				cpc,
				sspFloorprice,
				link: link && link !== "" && link !== "-" ? link : null,
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

		// Calculate price ranges
		const _getPriceRange = (
			prices: Array<Record<string, unknown>>,
			field: string,
		) => {
			const values = prices
				.map((p) => p[field])
				.filter((v) => v !== null && v !== undefined)
				.map((v) => Number(v));

			if (values.length === 0) return null;

			const min = Math.min(...values);
			const max = Math.max(...values);
			return min === max ? min : { min, max };
		};

		// Format as markdown output
		const textLines: string[] = [];
		textLines.push(`# Ad Prices`);
		textLines.push("");
		textLines.push(`**Type:** ${type}`);
		textLines.push(`**Currency:** DKK`);
		textLines.push("");

		// Display prices
		if (type === "display" || type === "all") {
			const displayMap = pricesByTypeAndProduct.get("display");
			if (displayMap && displayMap.size > 0) {
				textLines.push(`DISPLAY PRISER (${displayMap.size} produkter)`);
				textLines.push("─".repeat(40));

				for (const [productName, variants] of displayMap.entries()) {
					textLines.push(`▸ ${productName}`);

					if (variants.length === 1) {
						const p = variants[0];
						const prices = [];
						if (p.bruttoCPM !== null) prices.push(`Brutto: ${p.bruttoCPM} DKK`);
						if (p.minimumCPM !== null) prices.push(`Min: ${p.minimumCPM} DKK`);
						if (p.bulk !== null) prices.push(`Bulk: ${p.bulk} DKK`);
						if (p.cpc !== null) prices.push(`CPC: ${p.cpc} DKK`);
						if (p.sspFloorprice !== null)
							prices.push(`Floor: ${p.sspFloorprice} DKK`);

						if (prices.length > 0) {
							textLines.push(`  ${prices.join(", ")}`);
						}
					} else {
						// Multiple platforms
						for (const variant of variants) {
							textLines.push(`  ${variant.platform}:`);
							const prices = [];
							if (variant.bruttoCPM !== null)
								prices.push(`Brutto: ${variant.bruttoCPM} DKK`);
							if (variant.minimumCPM !== null)
								prices.push(`Min: ${variant.minimumCPM} DKK`);
							if (variant.bulk !== null)
								prices.push(`Bulk: ${variant.bulk} DKK`);
							if (variant.cpc !== null) prices.push(`CPC: ${variant.cpc} DKK`);
							if (variant.sspFloorprice !== null)
								prices.push(`Floor: ${variant.sspFloorprice} DKK`);

							if (prices.length > 0) {
								textLines.push(`    ${prices.join(", ")}`);
							}
						}
					}
					textLines.push("");
				}
			}
		}

		// Video prices
		if (type === "video" || type === "all") {
			const videoMap = pricesByTypeAndProduct.get("video");
			if (videoMap && videoMap.size > 0) {
				textLines.push(`VIDEO PRISER (${videoMap.size} produkter)`);
				textLines.push("─".repeat(40));

				for (const [productName, variants] of videoMap.entries()) {
					textLines.push(`▸ ${productName}`);

					if (variants.length === 1) {
						const p = variants[0];
						const prices = [];
						if (p.bruttoCPM !== null) prices.push(`Brutto: ${p.bruttoCPM} DKK`);
						if (p.minimumCPM !== null) prices.push(`Min: ${p.minimumCPM} DKK`);
						if (p.bulk !== null) prices.push(`Bulk: ${p.bulk} DKK`);
						if (p.cpc !== null) prices.push(`CPC: ${p.cpc} DKK`);

						if (prices.length > 0) {
							textLines.push(`  ${prices.join(", ")}`);
						}
					} else {
						// Multiple platforms
						for (const variant of variants) {
							textLines.push(`  ${variant.platform}:`);
							const prices = [];
							if (variant.bruttoCPM !== null)
								prices.push(`Brutto: ${variant.bruttoCPM} DKK`);
							if (variant.minimumCPM !== null)
								prices.push(`Min: ${variant.minimumCPM} DKK`);
							if (variant.bulk !== null)
								prices.push(`Bulk: ${variant.bulk} DKK`);
							if (variant.cpc !== null) prices.push(`CPC: ${variant.cpc} DKK`);

							if (prices.length > 0) {
								textLines.push(`    ${prices.join(", ")}`);
							}
						}
					}
					textLines.push("");
				}
			}
		}

		// Summary
		textLines.push("OVERSIGT");
		textLines.push("─".repeat(40));

		const displayCount = pricesByTypeAndProduct.get("display")?.size || 0;
		const videoCount = pricesByTypeAndProduct.get("video")?.size || 0;

		textLines.push(`Total produkter: ${displayCount + videoCount}`);
		if (displayCount > 0) textLines.push(`Display produkter: ${displayCount}`);
		if (videoCount > 0) textLines.push(`Video produkter: ${videoCount}`);
		textLines.push(`Valuta: DKK`);
		textLines.push(
			`Pristyper: Brutto CPM, Minimum CPM, Bulk, CPC, SSP Floorprice`,
		);

		return textLines.join("\n");
	} catch (error) {
		console.error("Error fetching ad prices:", error);
		throw new Error(
			`Failed to fetch ad prices: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}
}
