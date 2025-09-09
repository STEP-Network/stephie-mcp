import {
	type MondayColumnValueResponse,
	type MondayItemResponse,
	mondayApi,
} from "../../monday/client.js";
import { getDynamicColumns } from "../dynamic-columns.js";

export async function getOpportunities(
	params: {
		limit?: number;
		search?: string;
		deal_stage?: number; // Stage (numeric index)
		date1?: string; // *Current stage start date (YYYY-MM-DD)
		deal_creation_date?: string; // *Deal Creation Date (YYYY-MM-DD)
		deal_expected_close_date?: string; // *Expected Close Date (YYYY-MM-DD)
		deal_close_date?: string; // *Actual Close Date (YYYY-MM-DD)
		accountId?: string; // Filter by linked account (use getAccounts to find IDs)
		contactId?: string; // Filter by linked contact (use getContacts to find IDs)
		bookingId?: string; // Filter by linked booking (use getBookings to find IDs)
	} = {},
) {
	const {
		limit = 10,
		search,
		deal_stage,
		date1,
		deal_creation_date,
		deal_expected_close_date,
		deal_close_date,
		accountId,
		contactId,
		bookingId,
	} = params;

	// Fetch dynamic columns from Columns board
	const BOARD_ID = "1402911049";
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
	if (deal_stage !== undefined)
		filters.push({
			column_id: "deal_stage",
			compare_value: [deal_stage],
			operator: "any_of",
		});
	if (date1)
		filters.push({
			column_id: "date1",
			compare_value: date1,
			operator: "contains_text",
		});
	if (deal_creation_date)
		filters.push({
			column_id: "deal_creation_date",
			compare_value: deal_creation_date,
			operator: "contains_text",
		});
	if (deal_expected_close_date)
		filters.push({
			column_id: "deal_expected_close_date",
			compare_value: deal_expected_close_date,
			operator: "contains_text",
		});
	if (deal_close_date)
		filters.push({
			column_id: "deal_close_date",
			compare_value: deal_close_date,
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
      boards(ids: [1402911049]) {
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
		if (accountId) {
			items = items.filter((item: Record<string, unknown>) => {
				const relationCol = (item as MondayItemResponse).column_values.find(
					(c: Record<string, unknown>) => c.id === "connect_boards31",
				);
				if (relationCol?.value) {
					try {
						const linked = JSON.parse(relationCol.value);
						return linked?.linkedItemIds?.includes(accountId);
					} catch {
						return false;
					}
				}
				return false;
			});
		}

		if (contactId) {
			items = items.filter((item: Record<string, unknown>) => {
				const relationCol = (item as MondayItemResponse).column_values.find(
					(c: Record<string, unknown>) => c.id === "deal_contact",
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

		if (bookingId) {
			items = items.filter((item: Record<string, unknown>) => {
				const relationCol = (item as MondayItemResponse).column_values.find(
					(c: Record<string, unknown>) => c.id === "connect_boards8__1",
				);
				if (relationCol?.value) {
					try {
						const linked = JSON.parse(relationCol.value);
						return linked?.linkedItemIds?.includes(bookingId);
					} catch {
						return false;
					}
				}
				return false;
			});
		}

		// Format response as markdown
		const lines: string[] = [];
		lines.push(`# Opportunities`);
		lines.push(`**Total Items:** ${items.length}`);

		// Show active filters
		if (accountId) lines.push(`**Filter:** Related to Account ID ${accountId}`);
		if (contactId) lines.push(`**Filter:** Related to Contact ID ${contactId}`);
		if (bookingId) lines.push(`**Filter:** Related to Booking ID ${bookingId}`);

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
		console.error("Error fetching Opportunities items:", error);
		throw error;
	}
}
