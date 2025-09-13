import { BOARD_IDS, mondayApi } from "../../monday/client.js";
import type {
	MondayColumnValueResponse,
	MondayItemResponse,
} from "../../monday/types.js";

interface AdFormat {
	mondayItemId: string;
	name: string;
	deviceType: string;
	description: string | null;
	bookingDescription: string | null;
	sizeNames: string[];
	productNames: string[];
	aliases: string | null;
}

export async function getAllFormats() {
	try {
		const query = `{
      boards(ids: ${BOARD_IDS.FORMATS}) {
        id
        name
        items_page(limit: 500) {
          items {
            id
            name
            column_values {
              id
              text
              value
              ... on BoardRelationValue {
                linked_items {
                  id
                  name
                }
              }
              ... on MirrorValue {
                display_value
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

		console.error("[getAllFormats] Fetching formats...");

		const response = await mondayApi(query);

		if (!response.data?.boards || response.data.boards.length === 0) {
			throw new Error("No formats board found");
		}

		const board = response.data.boards[0];
		const items = board.items_page?.items || [];

		if (items.length === 0) {
			return JSON.stringify({
				tool: "getAllFormats",
				timestamp: new Date().toISOString(),
				status: "success",
				metadata: {
					boardId: BOARD_IDS.FORMATS,
					boardName: board.name,
					totalFormats: 0
				},
				data: [],
				options: {
					summary: "No formats found"
				}
			}, null, 2);
		}

		// Process formats
		const formats: AdFormat[] = [];
		const deviceTypeCounts = new Map<string, number>();
		const productCounts = new Map<string, number>();
		const sizeCounts = new Map<string, number>();

		for (const item of items) {
			const mondayItem = item as MondayItemResponse;
			const columnValues = mondayItem.column_values || [];

			// Helper to find column value by ID
			const getColumnValue = (id: string) => {
				return columnValues.find(
					(col: Record<string, unknown>) => col.id === id,
				) as MondayColumnValueResponse | undefined;
			};

			// Extract fields
			const deviceTypeCol = getColumnValue("dropdown_mktb98mw");
			const descriptionCol = getColumnValue("long_text_mkrhybzy");
			const bookingDescCol = getColumnValue("long_text_mksgy4v3");
			const sizesCol = getColumnValue("board_relation_mkrhtwv7");
			const productsCol = getColumnValue("board_relation_mkrh7451");
			const aliasesCol = getColumnValue("lookup_mksga9pm");

			// Parse device type
			let deviceType = "Unknown";
			if (deviceTypeCol?.text) {
				deviceType = deviceTypeCol.text;
			}

			// Parse board relations
			let sizeNames: string[] = [];
			if (sizesCol) {
				if (sizesCol.linked_items && sizesCol.linked_items.length > 0) {
					sizeNames = sizesCol.linked_items.map((item: any) => item.name);
				} else if (sizesCol.value) {
					const parsedValue = JSON.parse(sizesCol.value);
					sizeNames = parsedValue?.linkedItemNames || [];
				}
			}

			let productNames: string[] = [];
			if (productsCol) {
				if (productsCol.linked_items && productsCol.linked_items.length > 0) {
					productNames = productsCol.linked_items.map((item: any) => item.name);
				} else if (productsCol.value) {
					const parsedValue = JSON.parse(productsCol.value);
					productNames = parsedValue?.linkedItemNames || [];
				}
			}


			const format: AdFormat = {
				mondayItemId: String(mondayItem.id),
				name: String(mondayItem.name),
				deviceType,
				description: descriptionCol?.text || null,
				bookingDescription: bookingDescCol?.text || null,
				sizeNames,
				productNames,
				aliases: aliasesCol?.display_value || aliasesCol?.text || null,
			};

			formats.push(format);

			// Count device types
			deviceTypeCounts.set(deviceType, (deviceTypeCounts.get(deviceType) || 0) + 1);

			// Count products and sizes
			for (const product of productNames) {
				productCounts.set(product, (productCounts.get(product) || 0) + 1);
			}
			for (const size of sizeNames) {
				sizeCounts.set(size, (sizeCounts.get(size) || 0) + 1);
			}
		}

		// Sort formats by name
		formats.sort((a, b) => 
			a.name.toLowerCase().localeCompare(b.name.toLowerCase())
		);

		// Group formats by device type
		const formatsByDevice = new Map<string, AdFormat[]>();
		for (const format of formats) {
			const device = format.deviceType;
			if (!formatsByDevice.has(device)) {
				formatsByDevice.set(device, []);
			}
			formatsByDevice.get(device)?.push(format);
		}

		// Convert to hierarchical structure
		const deviceGroups = Array.from(formatsByDevice.entries())
			.sort(([a], [b]) => {
				// Desktop first, then Mobile, then others
				const order = ["Desktop", "Mobile"];
				const aIndex = order.indexOf(a);
				const bIndex = order.indexOf(b);
				if (aIndex !== -1 && bIndex !== -1) {
					return aIndex - bIndex;
				}
				if (aIndex !== -1) return -1;
				if (bIndex !== -1) return 1;
				return a.localeCompare(b);
			})
			.map(([deviceType, deviceFormats]) => ({
				deviceType,
				formatCount: deviceFormats.length,
				totalSizes: deviceFormats.reduce((sum, f) => sum + f.sizeNames.length, 0),
				totalProducts: deviceFormats.reduce((sum, f) => sum + f.productNames.length, 0),
				formats: deviceFormats
			}));

		// Build metadata
		const totalFormats = formats.length;
		const totalSizes = formats.reduce((sum, f) => sum + f.sizeNames.length, 0);
		const uniqueProducts = new Set(formats.flatMap(f => f.productNames)).size;
		const uniqueSizes = new Set(formats.flatMap(f => f.sizeNames)).size;

		const metadata = {
			boardId: BOARD_IDS.FORMATS,
			boardName: board.name,
			totalFormats,
			totalDeviceTypes: formatsByDevice.size,
			totalSizes: uniqueSizes,
			totalProducts: uniqueProducts,
			deviceTypeCounts: Object.fromEntries(deviceTypeCounts),
		};

		const summary = `Found ${totalFormats} ad format${totalFormats !== 1 ? 's' : ''} across ${formatsByDevice.size} device type${formatsByDevice.size !== 1 ? 's' : ''} (${uniqueProducts} unique product${uniqueProducts !== 1 ? 's' : ''}, ${uniqueSizes} size${uniqueSizes !== 1 ? 's' : ''})`;

		return JSON.stringify(
			{
				tool: "getAllFormats",
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
		console.error("Error fetching formats:", error);
		throw new Error(
			`Failed to fetch formats: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}
}