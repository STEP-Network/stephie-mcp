import {
	type MondayColumnValueResponse,
	type MondayItemResponse,
	mondayApi,
} from "../../monday/client.js";
import { getDynamicColumns } from "../dynamic-columns.js";

export async function getTasksAdOps(
	params: {
		limit?: number;
		search?: string;
		person?: string; // Owner
		status_mkkwc3ez?: number; // Status (numeric index)
		label_mkkwem4d?: number; // Type (numeric index)
		color_mknxxz44?: number; // Priority (numeric index)
		date__1?: string; // Due Date (YYYY-MM-DD)
		keyResultId?: string; // Filter by linked key result (use OKR subitems to find IDs)
		publisherId?: string; // Filter by publisher (use getAllPublishers to find IDs)
	} = {},
) {
	const {
		limit = 10,
		search,
		person,
		status_mkkwc3ez,
		label_mkkwem4d,
		color_mknxxz44,
		date__1,
		keyResultId,
		publisherId,
	} = params;

	// Fetch dynamic columns from Columns board
	const BOARD_ID = "1717613454";
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
	if (status_mkkwc3ez !== undefined)
		filters.push({
			column_id: "status_mkkwc3ez",
			compare_value: [status_mkkwc3ez],
			operator: "any_of",
		});
	if (label_mkkwem4d !== undefined)
		filters.push({
			column_id: "label_mkkwem4d",
			compare_value: [label_mkkwem4d],
			operator: "any_of",
		});
	if (color_mknxxz44 !== undefined)
		filters.push({
			column_id: "color_mknxxz44",
			compare_value: [color_mknxxz44],
			operator: "any_of",
		});
	if (date__1)
		filters.push({
			column_id: "date__1",
			compare_value: date__1,
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
      boards(ids: [1717613454]) {
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

		let items = board.items_page?.items || [];

		// Apply board relation filters
		if (keyResultId) {
			items = items.filter((item: Record<string, unknown>) => {
				const relationCol = (item as MondayItemResponse).column_values.find(
					(c: Record<string, unknown>) => c.id === "board_relation_mkpjy03a",
				);
				if (relationCol?.value) {
					try {
						const linked = JSON.parse(relationCol.value);
						return linked?.linkedItemIds?.includes(keyResultId);
					} catch {
						return false;
					}
				}
				return false;
			});
		}

		if (publisherId) {
			items = items.filter((item: Record<string, unknown>) => {
				const relationCol = (item as MondayItemResponse).column_values.find(
					(c: Record<string, unknown>) => c.id === "connect_boards_mkkxdfax",
				);
				if (relationCol?.value) {
					try {
						const linked = JSON.parse(relationCol.value);
						return linked?.linkedItemIds?.includes(publisherId);
					} catch {
						return false;
					}
				}
				return false;
			});
		}

		// Format response as markdown
		const lines: string[] = [];
		lines.push(`# Tasks - AdOps`);
		lines.push(`**Total Items:** ${items.length}`);

		// Show active filters
		if (keyResultId)
			lines.push(`**Filter:** Related to Key Result ID ${keyResultId}`);
		if (publisherId)
			lines.push(`**Filter:** Related to Publisher ID ${publisherId}`);

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
		console.error("Error fetching TasksAdOps items:", error);
		throw error;
	}
}
