import {
	type MondayColumnValueResponse,
	type MondayItemResponse,
	mondayApi,
} from "../../monday/client.js";
import { getDynamicColumns } from "../dynamic-columns.js";

export async function getTasksVideo(
	params: {
		limit?: number;
		search?: string;
		person?: string; // Owner
		status_mkkwmefr?: number; // Status (numeric index)
		type__1?: number; // Type (numeric index)
		date__1?: string; // Due Date (YYYY-MM-DD)
		date4?: string; // Follow up Date (YYYY-MM-DD)
	} = {},
) {
	const {
		limit = 10,
		search,
		person,
		status_mkkwmefr,
		type__1,
		date__1,
		date4,
	} = params;

	// Fetch dynamic columns from Columns board
	const BOARD_ID = "1635510115";
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
	if (person)
		filters.push({
			column_id: "person",
			compare_value: person,
			operator: "contains_text",
		});
	if (status_mkkwmefr !== undefined)
		filters.push({
			column_id: "status_mkkwmefr",
			compare_value: [status_mkkwmefr],
			operator: "any_of",
		});
	if (type__1 !== undefined)
		filters.push({
			column_id: "type__1",
			compare_value: [type__1],
			operator: "any_of",
		});
	if (date__1)
		filters.push({
			column_id: "date__1",
			compare_value: date__1,
			operator: "contains_text",
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
      boards(ids: [1635510115]) {
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
		lines.push(`# Tasks - Video`);
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
		console.error("Error fetching TasksVideo items:", error);
		throw error;
	}
}
