import {
	type MondayColumnValueResponse,
	type MondayItemResponse,
	mondayApi,
} from "../../monday/client.js";

const AD_SIZES_BOARD_ID = "1558597958";

interface AdSize {
	mondayItemId: string;
	name: string;
	deviceType: string;
	adProducts: string[];
	adFormats: string[];
	standardCPM: number | null;
	averageEAPM: number | null;
	adUnitNames: string | null;
	averageCTR: string | null;
	averageViewability: string | null;
	description: string | null;
	specsUrl: string | null;
	isVideo: boolean;
}

export async function getAllSizes() {
	try {
		// Get all ad sizes from the Ad Sizes board
		const query = `
		query {
			boards(ids: ${AD_SIZES_BOARD_ID}) {
				id
				name
				items_page(limit: 500) {
					cursor
					items {
						id
						name
						column_values {
							id
							text
							value
							... on NumbersValue {
								number
								symbol
							}
							... on DropdownValue {
								text
							}
							... on BoardRelationValue {
								display_value
								linked_items {
									id
									name
								}
							}
							column {
								id
								title
								type
							}
						}
					}
				}
			}
		}`;

		console.error("[getAllSizes] Fetching ad sizes...");

		const response = await mondayApi(query);
		const board = response?.data?.boards?.[0];
		if (!board) throw new Error("Board not found");

		const items = board.items_page?.items || [];

		// Process sizes
		const sizes: AdSize[] = [];
		const uniqueDeviceTypes = new Set<string>();
		const deviceTypeCounts = new Map<string, number>();
		const productCounts = new Map<string, number>();
		const formatCounts = new Map<string, number>();

		for (const item of items as MondayItemResponse[]) {
			const columnValues = item.column_values || [];

			// Helper to find column value by ID
			const getColumnValue = (id: string) => {
				return columnValues.find((col: MondayColumnValueResponse) => col.id === id);
			};

			// Extract fields
			const standardCPMCol = getColumnValue("numeric_mkrhdmee");
			const averageEAPMCol = getColumnValue("numeric_mkqsqecq");
			const gamNamesCol = getColumnValue("text_mksgcrz8");
			const deviceTypeCol = getColumnValue("dropdown_mkqszqya");
			const formatsCol = getColumnValue("board_relation_mkrhergk");
			const productsCol = getColumnValue("board_relation_mkrhckxh");
			const specsUrlCol = getColumnValue("text_mkj8a83s");
			const averageCTRCol = getColumnValue("text_mktj2qng");
			const averageViewabilityCol = getColumnValue("text_mkqse9p4");
			const descriptionCol = getColumnValue("text_mknyx7mj");

			// Check if it's a video size
			const isVideo = String(item.name).endsWith("v");

			// Parse board relations
			const products = productsCol?.linked_items?.map((item: { id: string; name: string }) => item.name) || [];
			const formats = formatsCol?.linked_items?.map((item: { id: string; name: string }) => item.name) || [];

			// Parse device types - split by comma and trim
			const deviceTypeText = deviceTypeCol?.text || "Unknown";
			const deviceTypes = deviceTypeText.split(',').map(type => type.trim());

			// Parse numeric values
			const parseNumber = (col: MondayColumnValueResponse | undefined): number | null => {
				if (!col || typeof col !== 'object' || !('number' in col)) return null;
				const numberCol = col as { number?: number };
				if (!numberCol.number) return null;
				return Number(numberCol.number);
			};

			const size: AdSize = {
				mondayItemId: String(item.id),
				name: String(item.name),
				deviceType: deviceTypeText, // Keep original for display
				adProducts: products,
				adFormats: formats,
				standardCPM: parseNumber(standardCPMCol),
				averageEAPM: parseNumber(averageEAPMCol),
				adUnitNames: gamNamesCol?.text || null,
				averageCTR: averageCTRCol?.text || null,
				averageViewability: averageViewabilityCol?.text || null,
				description: descriptionCol?.text || null,
				specsUrl: specsUrlCol?.text || null,
				isVideo,
			};

			sizes.push(size);

			// Count unique device types
			for (const deviceType of deviceTypes) {
				uniqueDeviceTypes.add(deviceType);
				deviceTypeCounts.set(deviceType, (deviceTypeCounts.get(deviceType) || 0) + 1);
			}

			// Count products and formats
			for (const product of products) {
				productCounts.set(product, (productCounts.get(product) || 0) + 1);
			}
			for (const format of formats) {
				formatCounts.set(format, (formatCounts.get(format) || 0) + 1);
			}
		}

		// Sort sizes
		sizes.sort((a, b) => {
			// Video sizes last
			if (a.isVideo !== b.isVideo) return a.isVideo ? 1 : -1;
			
			// Then sort by name
			return a.name.localeCompare(b.name);
		});

		// Group sizes by device type
		const sizesByDevice = new Map<string, AdSize[]>();
		for (const size of sizes) {
			const device = size.deviceType;
			if (!sizesByDevice.has(device)) {
				sizesByDevice.set(device, []);
			}
			sizesByDevice.get(device)?.push(size);
		}

		// Define device order
		const deviceOrder = ["Desktop", "Mobile", "Tablet", "Cross Device"];

		// Convert to hierarchical structure
		const deviceGroups = Array.from(sizesByDevice.entries())
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
			.map(([deviceType, deviceSizes]) => {
				const videoCount = deviceSizes.filter(s => s.isVideo).length;
				const displayCount = deviceSizes.filter(s => !s.isVideo).length;

				// Find most common products and formats
				const deviceProducts = new Set(deviceSizes.flatMap(s => s.adProducts));
				const deviceFormats = new Set(deviceSizes.flatMap(s => s.adFormats));

				return {
					deviceType,
					sizeCount: deviceSizes.length,
					videoCount,
					displayCount,
					commonProducts: Array.from(deviceProducts).slice(0, 5),
					commonFormats: Array.from(deviceFormats).slice(0, 5),
					sizes: deviceSizes
				};
			});

		// Calculate statistics
		const totalSizes = sizes.length;
		const videoSizes = sizes.filter(s => s.isVideo).length;
		const displaySizes = totalSizes - videoSizes;

		// Build metadata
		const metadata = {
			boardId: AD_SIZES_BOARD_ID,
			boardName: board.name,
			totalSizes,
			totalDeviceTypes: uniqueDeviceTypes.size,
			sizeTypes: {
				display: displaySizes,
				video: videoSizes
			},
			deviceTypeCounts: Object.fromEntries(deviceTypeCounts),
			abbreviations: {
				"eAPM": "effective Attention Per Mille",
				"CPM": "Cost Per Mille (thousand impressions)",
				"CTR": "Click-Through Rate"
			}
		};

		const summary = `Found ${totalSizes} ad size${totalSizes !== 1 ? 's' : ''} across ${uniqueDeviceTypes.size} unique device type${uniqueDeviceTypes.size !== 1 ? 's' : ''} (${displaySizes} display, ${videoSizes} video)`;

		return JSON.stringify(
			{
				tool: "getAllSizes",
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
		console.error("Error fetching ad sizes:", error);
		throw new Error(
			`Failed to fetch ad sizes: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}
}