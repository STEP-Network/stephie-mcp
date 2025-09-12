import {
	type MondayColumnValueResponse,
	mondayApi,
} from "../../monday/client.js";
import { createListResponse } from "../json-output.js";

const PRODUCTS_BOARD_ID = "1983692701";

export async function getAllProducts() {
	try {
		// Single query to Products board with specific column IDs
		const query = `{
			board1: boards(ids: ${PRODUCTS_BOARD_ID}) {
				items_page(limit: 500) {
					items {
						name
						column_values(ids: ["long_text_mkrhybzy", "board_relation_mkrhw4r8", "board_relation_mkrh28wy", "lookup_mkvqga4"]) {
							column {
								id
								title
							}
							text
							... on BoardRelationValue {
								linked_items {
									name
								}
							}
							... on MirrorValue {
								display_value
							}
						}
					}
				}
			}
		}`;

		console.error("[getAllProducts] Fetching products with hierarchical data...");

		const response = await mondayApi(query);

		if (!response.data?.board1) {
			throw new Error("No board found in response");
		}

		const board = response.data.board1[0];
		const items = board?.items_page?.items || [];

		// Process products and build hierarchical structure
		const productsByGroup = new Map<string, {
			name: string;
			description: string;
			products: Array<{
				name: string;
				description: string;
				formats: string[];
				formatCount: number;
			}>;
		}>();

		for (const item of items) {
			const columnValues: Record<string, unknown> = {};

			// Extract column values
			item.column_values?.forEach((col: MondayColumnValueResponse) => {
				const columnId = col.column?.id || "";
				
				if (columnId === "board_relation_mkrhw4r8") {
					// Product Group (*Produktgrupper)
					columnValues.productGroup = col.linked_items?.[0]?.name || "";
				} else if (columnId === "lookup_mkvqga4") {
					// Product Group Description (Produktgruppe Beskrivelse - mirror field)
					const mirrorCol = col as MondayColumnValueResponse & { display_value?: string };
					columnValues.productGroupDescription = mirrorCol.display_value || "";
				} else if (columnId === "long_text_mkrhybzy") {
					// Product Description (Produkt Beskrivelse)
					columnValues.productDescription = col.text || "";
				} else if (columnId === "board_relation_mkrh28wy") {
					// Formats (Annonce Formater)
					columnValues.formats = col.linked_items?.map(item => item.name) || [];
				}
			});

			const productGroupName = columnValues.productGroup as string;
			
			// Initialize product group if not exists
			if (productGroupName && !productsByGroup.has(productGroupName)) {
				productsByGroup.set(productGroupName, {
					name: productGroupName,
					description: columnValues.productGroupDescription as string || "",
					products: []
				});
			}

			// Add product to its group
			if (productGroupName && productsByGroup.has(productGroupName)) {
				const group = productsByGroup.get(productGroupName);
				if (group) {
					group.products.push({
						name: item.name,
						description: columnValues.productDescription as string || "",
						formats: columnValues.formats as string[] || [],
						formatCount: (columnValues.formats as string[] || []).length
					});
				}
			}
		}

		// Convert to hierarchical array structure
		const hierarchicalData = Array.from(productsByGroup.values()).map(group => ({
			type: "product_group",
			name: group.name,
			description: group.description,
			products: group.products,
			productCount: group.products.length,
			formatCount: group.products.reduce((sum, product) => sum + product.formatCount, 0)
		}));

		// Build metadata
		const totalProducts = Array.from(productsByGroup.values())
			.reduce((sum, group) => sum + group.products.length, 0);
		
		const totalFormats = Array.from(productsByGroup.values())
			.reduce((sum, group) => sum + group.products.reduce((productSum, product) => productSum + product.formatCount, 0), 0);

		const metadata = {
			productGroupsCount: productsByGroup.size,
			productsCount: totalProducts,
			totalFormatCount: totalFormats,
			structure: "hierarchical: product_group -> products -> formats (single query)"
		};

		const summary = `Found ${productsByGroup.size} product groups with ${totalProducts} products and ${totalFormats} total formats`;

		return JSON.stringify(
			createListResponse(
				"getAllProducts",
				hierarchicalData,
				metadata,
				{ summary }
			),
			null,
			2
		);
	} catch (error) {
		console.error("Error fetching products:", error);
		throw new Error(
			`Failed to fetch products: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}
}
