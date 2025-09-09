import {
	type MondayColumnValueResponse,
	type MondayItemResponse,
	mondayApi,
} from "../../monday/client.js";
import { getDynamicColumns } from "../dynamic-columns.js";

export async function getPublisherFAQ(
	params: {
		limit?: number;
		search?: string;
		status?: number; // Status (numeric index)
		date4?: string; // Created Date (YYYY-MM-DD)
	} = {},
) {
	const { limit = 10, search, status, date4 } = params;

	// Fetch dynamic columns from Columns board
	const BOARD_ID = "1804511159";
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
	if (status !== undefined)
		filters.push({
			column_id: "status",
			compare_value: [status],
			operator: "any_of",
		});
	if (date4)
		filters.push({
			column_id: "date4",
			compare_value: date4,
			operator: "contains_text",
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
      boards(ids: [1804511159]) {
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
		lines.push(`# Publisher FAQ`);
		lines.push(`**Total Items:** ${items.length}`);
		lines.push("");

		items.forEach((item: Record<string, unknown>) => {
			lines.push(`## ${(item as MondayItemResponse).name}`);
			lines.push(`- **ID:** ${(item as MondayItemResponse).id}`);

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
		console.error("Error fetching PublisherFAQ items:", error);
		throw error;
	}
}
