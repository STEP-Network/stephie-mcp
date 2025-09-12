import {
	type MondayItemResponse,
	mondayApi,
} from "../../monday/client.js";

const AD_PRICES_BOARD_ID = "1432155906";

interface AdPrice {
	id: string;
	name: string;
	productGroup: string;
	platform: string | null;
	bruttoCPM: number | null;
	minimumCPM: number | null;
	bulk: number | null;
	cpc: number | null;
	sspFloorprice: number | null;
	prisPerKvartal: number | null;
	testPrice: number | null;
	link: string | null;
	createdAt: string;
	updatedAt: string;
}

interface ColumnValue {
	column?: {
		id?: string;
		title?: string;
		type?: string;
	};
	id?: string;
	text?: string | null;
	value?: string;
	display_value?: string;
	linked_items?: Array<{ id: string; name: string }>;
}

export async function getAllAdPrices() {
	try {
		const query = `{
			boards(ids: ${AD_PRICES_BOARD_ID}) {
				id
				name
				groups {
					id
					title
				}
				items_page(limit: 500) {
					items {
						id
						name
						created_at
						updated_at
						group {
							id
							title
						}
						column_values {
							id
							column {
								id
								title
								type
							}
							text
							value
							... on BoardRelationValue {
								display_value
								linked_items {
									id
									name
								}
							}
						}
					}
				}
			}
		}`;

		console.error(`[getAllAdPrices] Fetching ad prices...`);

		// Execute query
		const response = await mondayApi(query);

		const board = response.data?.boards?.[0];
		if (!board) throw new Error("Board not found");

		const items = board.items_page?.items || [];
		const groups = board.groups || [];

		// Process prices
		const prices: AdPrice[] = [];
		const priceRanges = new Map<string, { min: number; max: number; avg: number }>();
		const platformCounts = new Map<string, number>();

		for (const item of items as MondayItemResponse[]) {
			const groupTitle = item.group?.title || "Uncategorized";
			const columnValues = item.column_values || [];

			// Helper to find column value by ID
			const getColumnValue = (id: string) => {
				return columnValues.find((col: ColumnValue) => col.id === id);
			};

			// Extract values
			const productGroupCol = getColumnValue("board_relation_mkvq72fm");
			const platformCol = getColumnValue("text");
			const bruttoCPMCol = getColumnValue("numbers");
			const minimumCPMCol = getColumnValue("numbers0");
			const bulkCol = getColumnValue("numbers7");
			const cpcCol = getColumnValue("numbers4");
			const sspFloorpriceCol = getColumnValue("numbers5");
			const prisPerKvartalCol = getColumnValue("numeric_mktawenh");
			const testPriceCol = getColumnValue("numeric_mkv6ents");
			const linkCol = getColumnValue("text3");

			// Parse product group
			let productGroupName = groupTitle;
			if (productGroupCol?.linked_items && productGroupCol.linked_items.length > 0) {
				productGroupName = productGroupCol.linked_items[0].name;
			}

			// Parse numeric values
			const parseNumber = (col: ColumnValue | undefined): number | null => {
				if (!col?.text) return null;
				const num = parseFloat(col.text);
				return isNaN(num) ? null : num;
			};

			const price: AdPrice = {
				id: String(item.id),
				name: String(item.name),
				productGroup: productGroupName,
				platform: platformCol?.text || null,
				bruttoCPM: parseNumber(bruttoCPMCol),
				minimumCPM: parseNumber(minimumCPMCol),
				bulk: parseNumber(bulkCol),
				cpc: parseNumber(cpcCol),
				sspFloorprice: parseNumber(sspFloorpriceCol),
				prisPerKvartal: parseNumber(prisPerKvartalCol),
				testPrice: parseNumber(testPriceCol),
				link: linkCol?.text && linkCol.text !== "-" ? linkCol.text : null,
				createdAt: String(item.created_at),
				updatedAt: String(item.updated_at),
			};

			prices.push(price);

			// Track platform counts
			const platform = price.platform || "Not specified";
			platformCounts.set(platform, (platformCounts.get(platform) || 0) + 1);

			// Track price ranges
			const cpm = price.bruttoCPM || price.minimumCPM;
			if (cpm) {
				const key = price.productGroup;
				const existing = priceRanges.get(key);
				if (existing) {
					existing.min = Math.min(existing.min, cpm);
					existing.max = Math.max(existing.max, cpm);
					existing.avg = (existing.avg + cpm) / 2;
				} else {
					priceRanges.set(key, { min: cpm, max: cpm, avg: cpm });
				}
			}
		}

		// Sort prices by name within groups
		prices.sort((a, b) => {
			if (a.productGroup !== b.productGroup) {
				return a.productGroup.localeCompare(b.productGroup);
			}
			return a.name.localeCompare(b.name);
		});

		// Group prices by product group
		const pricesByGroup = new Map<string, AdPrice[]>();
		for (const price of prices) {
			const group = price.productGroup;
			if (!pricesByGroup.has(group)) {
				pricesByGroup.set(group, []);
			}
			pricesByGroup.get(group)?.push(price);
		}

		// Convert to hierarchical structure
		const groupOrder = ["Display", "Video", "Boligsiden Forsideejerskab Priser 2026"];
		const productGroups = Array.from(pricesByGroup.entries())
			.sort(([a], [b]) => {
				const aIndex = groupOrder.indexOf(a);
				const bIndex = groupOrder.indexOf(b);
				if (aIndex !== -1 && bIndex !== -1) {
					return aIndex - bIndex;
				}
				if (aIndex !== -1) return -1;
				if (bIndex !== -1) return 1;
				return a.localeCompare(b);
			})
			.map(([productGroup, groupPrices]) => {
				const range = priceRanges.get(productGroup);
				return {
					productGroup,
					priceCount: groupPrices.length,
					priceRange: range ? {
						min: range.min,
						max: range.max,
						average: Math.round(range.avg * 100) / 100
					} : null,
					prices: groupPrices
				};
			});

		// Calculate statistics
		const totalPrices = prices.length;
		const pricesWithCPM = prices.filter(p => p.bruttoCPM || p.minimumCPM).length;
		const pricesWithCPC = prices.filter(p => p.cpc).length;
		const pricesWithFloorprice = prices.filter(p => p.sspFloorprice).length;
		const pricesWithLink = prices.filter(p => p.link).length;

		// Build metadata
		const metadata = {
			boardId: AD_PRICES_BOARD_ID,
			boardName: board.name,
			totalPrices,
			totalProductGroups: pricesByGroup.size,
			priceTypes: {
				withCPM: pricesWithCPM,
				withCPC: pricesWithCPC,
				withFloorprice: pricesWithFloorprice,
				withLink: pricesWithLink
			},
			platformCounts: Object.fromEntries(platformCounts),
			currency: "DKK",
			availableMetrics: ["Brutto CPM", "Minimum CPM", "Bulk", "CPC", "SSP Floorprice", "Pris pr. kvartal", "Test Price"]
		};

		const summary = `Found ${totalPrices} ad price${totalPrices !== 1 ? 's' : ''} across ${pricesByGroup.size} product group${pricesByGroup.size !== 1 ? 's' : ''} (${pricesWithCPM} with CPM, ${pricesWithCPC} with CPC) in DKK`;

		return JSON.stringify(
			{
				tool: "getAllAdPrices",
				timestamp: new Date().toISOString(),
				status: "success",
				data: productGroups,
				metadata,
				options: { summary }
			},
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