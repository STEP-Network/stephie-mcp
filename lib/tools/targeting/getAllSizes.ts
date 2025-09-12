import {
	type MondayColumnValueResponse,
	type MondayItemResponse,
	mondayApi,
} from "../../monday/client.js";
import { createListResponse } from "../json-output.js";

const AD_SIZES_BOARD_ID = "1558597958";

export async function getAllSizes() {
	try {
		// Get all ad sizes from the Ad Sizes board
		const query = `
    query {
      boards(ids: ${AD_SIZES_BOARD_ID}) {
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
                display_value
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
                title
                type
              }
            }
          }
        }
      }
    }`;

		const response = await mondayApi(query);
		const items = response?.data?.boards?.[0]?.items_page?.items || [];

		// Map the raw data to structured objects
		const sizes = items.map((item: Record<string, unknown>) => {
			const mondayItem = item as MondayItemResponse;
			const columnValues = {
				width: "",
				height: "",
				device: "",
				standardCPM: "",
				averageEAPM: "",
				gamNames: "",
				deviceType: "",
				adFormats: "",
				adProducts: "",
				specsUrl: "",
				averageCTR: "",
				averageViewability: "",
				description: "",
			};

			// Process column values
			mondayItem.column_values.forEach((col: MondayColumnValueResponse) => {
				switch (col.id) {
					case "text_mkqsh5w7":
						// Width
						columnValues.width = col.text || "";
						break;
					case "text_mkqrxz0z":
						// Height
						columnValues.height = col.text || "";
						break;
					case "dropdown_mks0xdmd":
						columnValues.device = col.text || "";
						break;
					case "numeric_mkrhdmee":
						columnValues.standardCPM =
							col.number !== undefined
								? col.symbol
									? `${col.number}${col.symbol}`
									: `${col.number}`
								: "";
						break;
					case "numeric_mkqsqecq":
						columnValues.averageEAPM =
							col.number !== undefined
								? col.symbol
									? `${col.number}${col.symbol}`
									: `${col.number}`
								: "";
						break;
					case "text_mksgcrz8":
						columnValues.gamNames = col.text || "";
						break;
					case "dropdown_mkqszqya":
						columnValues.deviceType = col.text || "";
						break;
					case "board_relation_mkrhhdrx":
						// Extract names from linked items for formats
						columnValues.adFormats =
							col.linked_items && col.linked_items.length > 0
								? col.linked_items.map((item) => item.name).join(", ")
								: col.display_value || col.text || "";
						break;
					case "board_relation_mkrhckxh":
						// Extract names from linked items for products
						columnValues.adProducts =
							col.linked_items && col.linked_items.length > 0
								? col.linked_items.map((item) => item.name).join(", ")
								: col.display_value || col.text || "";
						break;
					case "text_mkj8a83s":
						columnValues.specsUrl = col.text || "";
						break;
					case "text_mktj2qng":
						columnValues.averageCTR = col.text || "";
						break;
					case "text_mkqse9p4":
						columnValues.averageViewability = col.text || "";
						break;
					case "text_mknyx7mj":
						columnValues.description = col.text || "";
						break;
				}
			});

			return {
				id: mondayItem.id,
				name: mondayItem.name,
				width: columnValues.width,
				height: columnValues.height,
				device: columnValues.device || "",
				standardCPM: columnValues.standardCPM || "",
				gamNames: columnValues.gamNames || "",
				adProducts: columnValues.adProducts || "",
				adFormats: columnValues.adFormats || "",
				deviceType: columnValues.deviceType || "",
				specsUrl: columnValues.specsUrl || "",
				averageCTR: columnValues.averageCTR || "",
				averageViewability: columnValues.averageViewability || "",
				averageEAPM: columnValues.averageEAPM || "",
				description: columnValues.description || "",
			};
		});

		// Sort sizes by Product first, then Format, then size
		const sortedSizes = [...sizes].sort((a, b) => {
			// First sort by product
			const productCompare = ((a.adProducts as string) || "zzz").localeCompare(
				(b.adProducts as string) || "zzz",
			);
			if (productCompare !== 0) return productCompare;

			// Then sort by format
			const formatCompare = ((a.adFormats as string) || "zzz").localeCompare(
				(b.adFormats as string) || "zzz",
			);
			if (formatCompare !== 0) return formatCompare;

			// Finally sort by size dimensions
			const aIsVideo = (a.name as string).endsWith("v");
			const bIsVideo = (b.name as string).endsWith("v");
			if (aIsVideo !== bIsVideo) return aIsVideo ? 1 : -1;

			const aParts = (a.name as string).replace("v", "").split("x").map(Number);
			const bParts = (b.name as string).replace("v", "").split("x").map(Number);
			if (aParts[0] !== bParts[0]) return bParts[0] - aParts[0];
			return bParts[1] - aParts[1];
		});

		// Format sizes for JSON response
		const formattedSizes = sortedSizes.map((size) => ({
			id: size.id,
			name: size.name,
			width: size.width,
			height: size.height,
			dimensions: `${size.width}x${size.height}`,
			device: size.device,
			deviceType: size.deviceType,
			adProducts: size.adProducts,
			adFormats: size.adFormats,
			standardCpm: size.standardCPM,
			averageEapm: size.averageEAPM,
			gamNames: size.gamNames,
			averageCtr: size.averageCTR,
			averageViewability: size.averageViewability,
			description: size.description,
			specsUrl: size.specsUrl,
			isVideo: (size.name as string).endsWith("v")
		}));

		// Count by device type for statistics
		const deviceCounts = sizes.reduce(
			(acc, s) => {
				const deviceType = String(s.deviceType) || "Other";
				const existing = acc.find((item) => item.device === deviceType);
				if (existing) {
					existing.count++;
				} else {
					acc.push({ device: deviceType, count: 1 });
				}
				return acc;
			},
			[] as Array<{ device: string; count: number }>,
		);

		// Video sizes count
		const videoSizes = sizes.filter((s) => (s.name as string).endsWith("v"));
		
		// GAM mapping for reference
		const gamMapping = sortedSizes
			.filter((s) => s.gamNames)
			.reduce(
				(acc, s) => {
					acc[s.name as string] = s.gamNames as string;
					return acc;
				},
				{} as Record<string, string>,
			);

		const metadata: Record<string, any> = {
			boardId: AD_SIZES_BOARD_ID,
			boardName: "Størrelser",
			totalSizes: sizes.length,
			videoSizes: videoSizes.length,
			deviceBreakdown: deviceCounts,
			gamMapping,
		};

		return JSON.stringify(
			createListResponse(
				"getAllSizes",
				formattedSizes,
				metadata,
				{
					summary: `Found ${sizes.length} ad size${sizes.length !== 1 ? 's' : ''} (${videoSizes.length} video sizes)`
				}
			),
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