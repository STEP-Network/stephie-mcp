import { BOARD_IDS, mondayApi } from "../../monday/client.js";
import type {
	MondayColumnValueResponse,
	MondayItemResponse,
} from "../../monday/types.js";

interface AdFormat {
	id: string;
	name: string;
	deviceType: string;
	description: string | null;
	bookingDescription: string | null;
	sizes: string[];
	sizeNames: string[];
	products: string[];
	productNames: string[];
	productGroups: string[];
	productGroupNames: string[];
	aliases: string | null;
	createdAt: string;
	updatedAt: string;
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
            created_at
            updated_at
            column_values {
              id
              text
              value
              column {
                id
                title
                type
              }
              ... on BoardRelationValue {
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
				data: [],
				metadata: {
					boardId: BOARD_IDS.FORMATS,
					boardName: board.name,
					totalFormats: 0
				},
				options: {
					summary: "No formats found"
				}
			}, null, 2);
		}

		// Process formats
		const formats: AdFormat[] = [];
		const deviceTypeCounts = new Map<string, number>();
		const productCounts = new Map<string, number>();
		const productGroupCounts = new Map<string, number>();

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
			const productGroupsCol = getColumnValue("board_relation_mkrh4gjc");
			const aliasesCol = getColumnValue("lookup_mksga9pm");

			// Parse device type
			let deviceType = "Unknown";
			if (deviceTypeCol?.text) {
				deviceType = deviceTypeCol.text;
			}

			// Parse board relations
			let sizeIds: string[] = [];
			let sizeNames: string[] = [];
			if (sizesCol?.value) {
				const parsedValue = JSON.parse(sizesCol.value);
				sizeIds = parsedValue?.linkedItemIds || [];
				if (sizesCol.linked_items) {
					sizeNames = sizesCol.linked_items.map((item: any) => item.name);
				}
			}

			let productIds: string[] = [];
			let productNames: string[] = [];
			if (productsCol?.value) {
				const parsedValue = JSON.parse(productsCol.value);
				productIds = parsedValue?.linkedItemIds || [];
				if (productsCol.linked_items) {
					productNames = productsCol.linked_items.map((item: any) => item.name);
				}
			}

			let productGroupIds: string[] = [];
			let productGroupNames: string[] = [];
			if (productGroupsCol?.value) {
				const parsedValue = JSON.parse(productGroupsCol.value);
				productGroupIds = parsedValue?.linkedItemIds || [];
				if (productGroupsCol.linked_items) {
					productGroupNames = productGroupsCol.linked_items.map((item: any) => item.name);
				}
			}

			const format: AdFormat = {
				id: String(mondayItem.id),
				name: String(mondayItem.name),
				deviceType,
				description: descriptionCol?.text || null,
				bookingDescription: bookingDescCol?.text || null,
				sizes: sizeIds,
				sizeNames,
				products: productIds,
				productNames,
				productGroups: productGroupIds,
				productGroupNames,
				aliases: aliasesCol?.text || null,
				createdAt: String(mondayItem.created_at),
				updatedAt: String(mondayItem.updated_at),
			};

			formats.push(format);

			// Count device types
			deviceTypeCounts.set(deviceType, (deviceTypeCounts.get(deviceType) || 0) + 1);

			// Count products and groups
			for (const product of productNames) {
				productCounts.set(product, (productCounts.get(product) || 0) + 1);
			}
			for (const group of productGroupNames) {
				productGroupCounts.set(group, (productGroupCounts.get(group) || 0) + 1);
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
		const totalProducts = formats.reduce((sum, f) => sum + f.productNames.length, 0);
		const uniqueProducts = new Set(formats.flatMap(f => f.productNames)).size;
		const uniqueProductGroups = new Set(formats.flatMap(f => f.productGroupNames)).size;

		const metadata = {
			boardId: BOARD_IDS.FORMATS,
			boardName: board.name,
			totalFormats,
			totalDeviceTypes: formatsByDevice.size,
			totalSizes,
			totalProducts,
			uniqueProducts,
			uniqueProductGroups,
			deviceTypeCounts: Object.fromEntries(deviceTypeCounts),
			topProducts: Array.from(productCounts.entries())
				.sort(([, a], [, b]) => b - a)
				.slice(0, 5)
				.map(([product, count]) => ({ product, count }))
		};

		const summary = `Found ${totalFormats} ad format${totalFormats !== 1 ? 's' : ''} across ${formatsByDevice.size} device type${formatsByDevice.size !== 1 ? 's' : ''} (${uniqueProducts} unique product${uniqueProducts !== 1 ? 's' : ''}, ${totalSizes} size${totalSizes !== 1 ? 's' : ''})`;

		return JSON.stringify(
			{
				tool: "getAllFormats",
				timestamp: new Date().toISOString(),
				status: "success",
				data: deviceGroups,
				metadata,
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