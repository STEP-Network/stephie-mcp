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
                  id
                }
                text
                ... on BoardRelationValue {
                  linked_items {
                    display_name
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
                  id
                }
                text
                ... on BoardRelationValue {
                  linked_items {
                    display_name
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
					name: item.name,
					description: columnValues["long_text"] || "",
					linkedProducts: columnValues["connect_boards"] || [],
					linkedFormats: columnValues["connect_boards7"] || [],
					linkedSizes: columnValues["connect_boards4"] || [],
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
					name: item.name,
					productGroup: columnValues["connect_boards8"]
						? (columnValues["connect_boards8"] as string[])[0]
						: "",
					description: columnValues["long_text"] || "",
					linkedFormats: columnValues["connect_boards7"] || [],
					linkedSizes: columnValues["connect_boards4"] || [],
				});
			}
		}

		// Create hierarchical structure: ProductGroup -> Products -> Formats
		const hierarchicalData = productGroups.map(group => {
			// Find products that belong to this group
			const groupProducts = products.filter(product => 
				product.productGroup === group.name
			).map(product => ({
				name: product.name,
				description: product.description,
				formats: product.linkedFormats || [],
				sizes: product.linkedSizes || []
			}));

			return {
				type: "product_group",
				name: group.name,
				description: group.description,
				products: groupProducts,
				// Include group-level formats and sizes as well
				groupFormats: group.linkedFormats || [],
				groupSizes: group.linkedSizes || []
			};
		});

		// Also include orphaned products (products not assigned to any group)
		const orphanedProducts = products.filter(product => 
			!product.productGroup || 
			!productGroups.some(group => group.name === product.productGroup)
		).map(product => ({
			type: "orphaned_product",
			name: product.name,
			description: product.description,
			formats: product.linkedFormats || [],
			sizes: product.linkedSizes || [],
			note: "Product not assigned to any product group"
		}));

		// Combine hierarchical data with orphaned products
		const allProductsData = [
			...hierarchicalData,
			...orphanedProducts
		];

		// Build metadata
		const metadata = {
			productGroupsBoardId: PRODUCT_GROUPS_BOARD_ID,
			productsBoardId: PRODUCTS_BOARD_ID,
			productGroupsCount: productGroups.length,
			productsCount: products.length,
			orphanedProductsCount: orphanedProducts.length,
			totalItems: allProductsData.length,
			structure: "hierarchical: product_group -> products -> formats"
		};

		const totalAssignedProducts = products.length - orphanedProducts.length;
		const summary = `Found ${productGroups.length} product groups with ${totalAssignedProducts} assigned products and ${orphanedProducts.length} orphaned products`;

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
