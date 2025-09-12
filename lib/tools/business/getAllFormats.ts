import { BOARD_IDS, mondayApi } from "../../monday/client.js";
import type {
	MondayColumnValueResponse,
	MondayItemResponse,
} from "../../monday/types.js";
import { createListResponse } from "../json-output.js";

export async function getAllFormats() {
	try {
		const query = `{
      boards(ids: ${BOARD_IDS.FORMATS}) {
        items_page(limit: 500) {
          items {
            name
            column_values {
              column {
                id
              }
              text
              ... on BoardRelationValue {
                linked_items {
                  name
                }
                display_value
              }
            }
          }
        }
      }
    }`;

		console.error("[getAllFormats] Fetching formats...");

		const response = await mondayApi(query);

		if (!response.data?.boards || response.data.boards.length === 0) {
			return "No formats board found";
		}

		const items = response.data.boards[0].items_page?.items || [];

		if (items.length === 0) {
			return "No formats found";
		}

		// Process formats
		const formats = items.map((item: MondayItemResponse) => {
			const columnValues: Record<string, unknown> = {};

			item.column_values?.forEach((col: MondayColumnValueResponse) => {
				const columnId = col.column?.id || "";
				if (col.linked_items && col.linked_items.length > 0) {
					columnValues[columnId] = col.linked_items.map((i) => i.name).join(", ");
				} else if (col.display_value) {
					columnValues[columnId] = col.display_value;
				} else {
					columnValues[columnId] = col.text || "";
				}
			});

			return {
				name: item.name,
				deviceType: columnValues["dropdown"] || "",
				description: columnValues["long_text"] || "",
				bookingDescription: columnValues["long_text0"] || "",
				sizes: columnValues["connect_boards"] || "",
				products: columnValues["connect_boards2"] || "",
				productGroups: columnValues["connect_boards9"] || "",
				aliases: columnValues["long_text9"] || "",
			};
		});

		// Group formats by device type for metadata
		const formatsByDevice = new Map<string, Array<Record<string, unknown>>>();
		for (const format of formats) {
			const deviceType = (format.deviceType as string) || "Other";
			if (!formatsByDevice.has(deviceType)) {
				formatsByDevice.set(deviceType, []);
			}
			formatsByDevice.get(deviceType)?.push(format);
		}

		// Build metadata
		const deviceCounts: Record<string, number> = {};
		for (const [device, deviceFormats] of formatsByDevice.entries()) {
			deviceCounts[device] = deviceFormats.length;
		}

		const metadata = {
			boardId: BOARD_IDS.FORMATS,
			boardName: "Ad Formats",
			totalCount: formats.length,
			deviceCounts,
			deviceTypes: Array.from(formatsByDevice.keys()).sort()
		};

		const summary = `Found ${formats.length} ad formats across ${formatsByDevice.size} device types`;

		return JSON.stringify(
			createListResponse(
				"getAllFormats",
				formats,
				metadata,
				{ summary }
			),
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
