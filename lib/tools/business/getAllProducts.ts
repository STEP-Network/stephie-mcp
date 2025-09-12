import {
	type MondayBoardResponse,
	type MondayColumnValueResponse,
	mondayApi,
} from "../../monday/client.js";
import { createListResponse } from "../json-output.js";

const PRODUCT_GROUPS_BOARD_ID = "1611223368";
const PRODUCTS_BOARD_ID = "1983692701";

export async function getAllProducts() {
	try {
		// Fetch from both boards in parallel
		const queries = [
			// Product Groups query
			`{
        board1: boards(ids: ${PRODUCT_GROUPS_BOARD_ID}) {
          items_page(limit: 500) {
            items {
              name
              column_values {
                column {
                  title
                }
                text
                ... on BoardRelationValue {
                  linked_items {
                    name
                  }
                }
              }
            }
          }
        }
      }`,
			// Products query
			`{
        board2: boards(ids: ${PRODUCTS_BOARD_ID}) {
          items_page(limit: 500) {
            items {
              name
              column_values {
                column {
                  title
                }
                text
                ... on BoardRelationValue {
                  linked_items {
                    name
                  }
                }
              }
            }
          }
        }
      }`,
		];

		console.error("[getAllProducts] Fetching product groups and products...");

		const [groupsResponse, productsResponse] = await Promise.all(
			queries.map((query) => mondayApi(query)),
		);

		// Process Product Groups
		const productGroups = [];
		if (groupsResponse.data?.board1) {
			const board = groupsResponse.data.board1 as MondayBoardResponse[];
			const items = board[0]?.items_page?.items || [];

			for (const item of items) {
				const columnValues: Record<string, unknown> = {};

				item.column_values?.forEach((col: MondayColumnValueResponse) => {
					const columnId = col.column?.id || "";
					if (col.linked_items && col.linked_items.length > 0) {
						columnValues[columnId] = col.linked_items.map((i) => i.name);
					} else {
						columnValues[columnId] = col.text || "";
					}
				});

				productGroups.push({
					type: "group",
					name: item.name,
					description: columnValues["long_text"] || "",
					products: columnValues["connect_boards"] || [],
					formats: columnValues["connect_boards7"] || [],
					sizes: columnValues["connect_boards4"] || [],
				});
			}
		}

		// Process Products
		const products = [];
		if (productsResponse.data?.board2) {
			const board = productsResponse.data.board2 as MondayBoardResponse[];
			const items = board[0]?.items_page?.items || [];

			for (const item of items) {
				const columnValues: Record<string, unknown> = {};

				item.column_values?.forEach((col: MondayColumnValueResponse) => {
					const columnId = col.column?.id || "";
					if (col.linked_items && col.linked_items.length > 0) {
						columnValues[columnId] = col.linked_items.map((i) => i.name);
					} else {
						columnValues[columnId] = col.text || "";
					}
				});

				products.push({
					type: "product",
					name: item.name,
					productGroup: columnValues["connect_boards8"]
						? (columnValues["connect_boards8"] as string[])[0]
						: "",
					description: columnValues["long_text"] || "",
					formats: columnValues["connect_boards7"] || [],
					sizes: columnValues["connect_boards4"] || [],
				});
			}
		}



		// Combine all products data
		const allProductsData = [
			...productGroups.map(group => ({
				...group,
				type: 'product_group'
			})),
			...products.map(product => ({
				...product,
				type: 'product'
			}))
		];

		// Build metadata
		const metadata = {
			productGroupsBoardId: PRODUCT_GROUPS_BOARD_ID,
			productsBoardId: PRODUCTS_BOARD_ID,
			productGroupsCount: productGroups.length,
			productsCount: products.length,
			totalItems: allProductsData.length
		};

		const summary = `Found ${productGroups.length} product groups and ${products.length} products`;

		return JSON.stringify(
			createListResponse(
				"getAllProducts",
				allProductsData,
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
