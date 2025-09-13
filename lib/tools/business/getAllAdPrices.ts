import {
	type MondayItemResponse,
	mondayApi,
} from "../../monday/client.js";

const AD_PRICES_BOARD_ID = "1432155906";

interface AdPrice {
	mondayItemId: string;
	name: string;
	device: string | null;
	bruttoCPM: number | null;
	bulk: number | null;
	cpc: number | null;
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
		// Only fetch the specific columns we need
		const query = `{
			boards(ids: ${AD_PRICES_BOARD_ID}) {
				id
				name
				items_page(limit: 500) {
					items {
						id
						name
						column_values(ids: ["text", "numbers", "numbers7", "numbers4"]) {
							id
							text
							value
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

		// Process prices
		const prices: AdPrice[] = [];
		const priceRanges = new Map<string, { min: number; max: number; avg: number }>();
		const deviceCounts = new Map<string, number>();

		for (const item of items as MondayItemResponse[]) {
			const columnValues = item.column_values || [];

			// Helper to find column value by ID
			const getColumnValue = (id: string) => {
				return columnValues.find((col: ColumnValue) => col.id === id);
			};

			// Extract values
			const deviceCol = getColumnValue("text");
			const bruttoCPMCol = getColumnValue("numbers");
			const bulkCol = getColumnValue("numbers7");
			const cpcCol = getColumnValue("numbers4");

			// Parse numeric values
			const parseNumber = (col: ColumnValue | undefined): number | null => {
				if (!col?.text) return null;
				const num = parseFloat(col.text);
				return isNaN(num) ? null : num;
			};

			const price: AdPrice = {
				mondayItemId: String(item.id),
				name: String(item.name),
				device: deviceCol?.text || null,
				bruttoCPM: parseNumber(bruttoCPMCol),
				bulk: parseNumber(bulkCol),
				cpc: parseNumber(cpcCol),
			};

			prices.push(price);

			// Track device counts
			const device = price.device || "Not specified";
			deviceCounts.set(device, (deviceCounts.get(device) || 0) + 1);

			// Track price ranges by device
			const cpm = price.bruttoCPM;
			if (cpm && device) {
				const existing = priceRanges.get(device);
				if (existing) {
					existing.min = Math.min(existing.min, cpm);
					existing.max = Math.max(existing.max, cpm);
					existing.avg = (existing.avg + cpm) / 2;
				} else {
					priceRanges.set(device, { min: cpm, max: cpm, avg: cpm });
				}
			}
		}

		// Sort prices by name within device groups
		prices.sort((a, b) => {
			if (a.device !== b.device) {
				return (a.device || "").localeCompare(b.device || "");
			}
			return a.name.localeCompare(b.name);
		});

		// Group prices by device
		const pricesByDevice = new Map<string, AdPrice[]>();
		for (const price of prices) {
			const device = price.device || "Not specified";
			if (!pricesByDevice.has(device)) {
				pricesByDevice.set(device, []);
			}
			pricesByDevice.get(device)?.push(price);
		}

		// Convert to hierarchical structure
		const deviceOrder = ["Desktop", "Mobile", "Tablet"];
		const deviceGroups = Array.from(pricesByDevice.entries())
			.sort(([a], [b]) => {
				const aIndex = deviceOrder.indexOf(a);
				const bIndex = deviceOrder.indexOf(b);
				if (aIndex !== -1 && bIndex !== -1) {
					return aIndex - bIndex;
				}
				if (aIndex !== -1) return -1;
				if (bIndex !== -1) return 1;
				return a.localeCompare(b);
			})
			.map(([device, devicePrices]) => {
				const range = priceRanges.get(device);
				return {
					device,
					priceCount: devicePrices.length,
					priceRange: range ? {
						min: range.min,
						max: range.max,
						average: Math.round(range.avg * 100) / 100
					} : null,
					prices: devicePrices
				};
			});

		// Calculate statistics
		const totalPrices = prices.length;
		const pricesWithCPM = prices.filter(p => p.bruttoCPM).length;
		const pricesWithCPC = prices.filter(p => p.cpc).length;
		const pricesWithBulk = prices.filter(p => p.bulk).length;

		// Build metadata
		const metadata = {
			boardId: AD_PRICES_BOARD_ID,
			boardName: board.name,
			totalPrices,
			totalDevices: pricesByDevice.size,
			priceTypes: {
				withCPM: pricesWithCPM,
				withCPC: pricesWithCPC,
				withBulk: pricesWithBulk
			},
			deviceCounts: Object.fromEntries(deviceCounts),
			currency: "DKK",
			availableMetrics: ["Brutto CPM", "Bulk", "CPC"]
		};

		const summary = `Found ${totalPrices} ad price${totalPrices !== 1 ? 's' : ''} across ${pricesByDevice.size} device${pricesByDevice.size !== 1 ? 's' : ''} (${pricesWithCPM} with CPM, ${pricesWithCPC} with CPC) in DKK`;

		return JSON.stringify(
			{
				tool: "getAllAdPrices",
				timestamp: new Date().toISOString(),
				status: "success",
				metadata,
				data: deviceGroups,
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