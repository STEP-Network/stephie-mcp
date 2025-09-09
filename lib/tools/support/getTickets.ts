import {
	type MondayColumnValueResponse,
	type MondayItemResponse,
	mondayApi,
} from "../../monday/client.js";
import { getDynamicColumns } from "../dynamic-columns.js";

export async function getTickets(
	params: {
		limit?: number;
		search?: string;
		status95?: number; // Status (numeric index)
		priority?: number; // Priority (numeric index)
		request_type?: number; // Request Type (numeric index)
		date?: string; // Creation Date (YYYY-MM-DD)
		date5?: string; // Last Customer Response Date (YYYY-MM-DD)
		contactId?: string; // Filter by linked contact (use getContacts to find IDs)
		assignedId?: string; // Filter by assigned person (use getPeople to find IDs)
		publisherId?: string; // Filter by publisher (use getAllPublishers to find IDs)
	} = {},
) {
	const {
		limit = 10,
		search,
		status95,
		priority,
		request_type,
		date,
		date5,
		contactId,
		assignedId,
		publisherId,
	} = params;

	// Fetch dynamic columns from Columns board
	const BOARD_ID = "1647372207";
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
	if (status95 !== undefined)
		filters.push({
			column_id: "status95",
			compare_value: [status95],
			operator: "any_of",
		});
	if (priority !== undefined)
		filters.push({
			column_id: "priority",
			compare_value: [priority],
			operator: "any_of",
		});
	if (request_type !== undefined)
		filters.push({
			column_id: "request_type",
			compare_value: [request_type],
			operator: "any_of",
		});
	if (date)
		filters.push({
			column_id: "date",
			compare_value: date,
			operator: "contains_text",
		});
	if (date5)
		filters.push({
			column_id: "date5",
			compare_value: date5,
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
      boards(ids: [1647372207]) {
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
		if (contactId) {
			items = items.filter((item: Record<string, unknown>) => {
				const relationCol = (item as MondayItemResponse).column_values.find(
					(c: Record<string, unknown>) => c.id === "connect_boards8__1",
				);
				if (relationCol?.value) {
					try {
						const linked = JSON.parse(relationCol.value);
						return linked?.linkedItemIds?.includes(contactId);
					} catch {
						return false;
					}
				}
				return false;
			});
		}

		if (assignedId) {
			items = items.filter((item: Record<string, unknown>) => {
				const relationCol = (item as MondayItemResponse).column_values.find(
					(c: Record<string, unknown>) => c.id === "connect_boards__1",
				);
				if (relationCol?.value) {
					try {
						const linked = JSON.parse(relationCol.value);
						return linked?.linkedItemIds?.includes(assignedId);
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
					(c: Record<string, unknown>) => c.id === "connect_boards08__1",
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
		lines.push(`# Tickets`);
		lines.push(`**Total Items:** ${items.length}`);

		// Show active filters
		if (contactId) lines.push(`**Filter:** Related to Contact ID ${contactId}`);
		if (assignedId)
			lines.push(`**Filter:** Assigned to Person ID ${assignedId}`);
		if (publisherId)
			lines.push(`**Filter:** Related to Publisher ID ${publisherId}`);

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
		console.error("Error fetching Tickets items:", error);
		throw error;
	}
}
