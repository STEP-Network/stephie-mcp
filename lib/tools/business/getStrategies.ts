import {
	type MondayColumnValueResponse,
	type MondayItemResponse,
	mondayApi,
} from "../../monday/client.js";
import { getDynamicColumns } from "../dynamic-columns.js";

export async function getStrategies(
	params: {
		limit?: number;
		search?: string;
		color_mkpkghqq?: number; // Status (numeric index)
		color_mknycf0d?: number; // AI Type (numeric index)
	} = {},
) {
	const { limit = 10, search, color_mkpkghqq, color_mknycf0d } = params;

	// Fetch dynamic columns from Columns board
	const BOARD_ID = "1637264041";
	const dynamicColumns = await getDynamicColumns(BOARD_ID);

	// Build filters
	const filters: Array<Record<string, unknown>> = [];
	if (search) {
		filters.push({
			column_id: "name",
			compare_value: search,
			operator: "contains_text",
		});
	}
	if (color_mkpkghqq !== undefined)
		filters.push({
			column_id: "color_mkpkghqq",
			compare_value: [color_mkpkghqq],
			operator: "any_of",
		});
	if (color_mknycf0d !== undefined)
		filters.push({
			column_id: "color_mknycf0d",
			compare_value: [color_mknycf0d],
			operator: "any_of",
		});

	const queryParams =
		filters.length > 0
			? `, query_params: { rules: [${filters
					.map(
						(f) => `{
        column_id: "${f.column_id}",
        compare_value: ${Array.isArray(f.compare_value) ? `[${f.compare_value}]` : typeof f.compare_value === "string" ? `"${f.compare_value}"` : f.compare_value},
        operator: ${f.operator}
      }`,
					)
					.join(",")}]}`
			: "";

	const query = `
    query {
      boards(ids: [1637264041]) {
        id
        name
        items_page(limit: ${limit}${queryParams}) {
          items {
            id
            name
            created_at
            updated_at
            column_values(ids: [${dynamicColumns.map((id) => `"${id}"`).join(", ")}]) {
              id
              text
              value
              column {
                title
                type
              }
            }
          }
        }
      }
    }
  `;

	try {
		const response = await mondayApi(query);
		const board = response.data?.boards?.[0];
		if (!board) throw new Error("Board not found");

		const items = board.items_page?.items || [];

		// Format response as markdown
		const lines: string[] = [];
		lines.push(`# Strategies`);
		lines.push(`**Total Items:** ${items.length}`);
		lines.push("");

		items.forEach((item: Record<string, unknown>) => {
			lines.push(`## ${item.name}`);
			lines.push(`- **ID:** ${item.id}`);

			(item as MondayItemResponse).column_values.forEach(
				(col: Record<string, unknown>) => {
					if (col.text) {
						lines.push(
							`- **${(col as MondayColumnValueResponse).column?.title}:** ${col.text}`,
						);
					}
				},
			);
			lines.push("");
		});

		return lines.join("\n");
	} catch (error) {
		console.error("Error fetching Strategies items:", error);
		throw error;
	}
}
