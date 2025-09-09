import {
	type MondayColumnValueResponse,
	type MondayItemResponse,
	mondayApi,
} from "../../monday/client.js";
import { getDynamicColumns } from "../dynamic-columns.js";

export async function getSalesActivities(
	params: {
		limit?: number;
		search?: string;
		activity_owner?: string; // *Owner
		activity_status?: number; // Status (numeric index)
		activity_type?: number; // *Activity Type (numeric index)
		accountId?: string; // Filter by account (use getAccounts to find IDs)
		contactId?: string; // Filter by contact (use getContacts to find IDs)
		opportunityId?: string; // Filter by opportunity (use getOpportunities to find IDs)
	} = {},
) {
	const {
		limit = 10,
		search,
		activity_owner,
		activity_status,
		activity_type,
		accountId,
		contactId,
		opportunityId,
	} = params;

	// Fetch dynamic columns from Columns board
	const BOARD_ID = "1402911042";
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
	if (activity_owner)
		filters.push({
			column_id: "activity_owner",
			compare_value: activity_owner,
			operator: "contains_text",
		});
	if (activity_status !== undefined)
		filters.push({
			column_id: "activity_status",
			compare_value: [activity_status],
			operator: "any_of",
		});
	if (activity_type !== undefined)
		filters.push({
			column_id: "activity_type",
			compare_value: [activity_type],
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
      boards(ids: [1402911042]) {
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
					(c: Record<string, unknown>) => c.id === "connect_boards9__1",
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
					(c: Record<string, unknown>) => c.id === "link_to_contacts8__1",
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

		if (opportunityId) {
			items = items.filter((item: Record<string, unknown>) => {
				const relationCol = (item as MondayItemResponse).column_values.find(
					(c: Record<string, unknown>) => c.id === "link_to_opportunities__1",
				);
				if (relationCol?.value) {
					try {
						const linked = JSON.parse(relationCol.value);
						return linked?.linkedItemIds?.includes(opportunityId);
					} catch {
						return false;
					}
				}
				return false;
			});
		}

		// Format response as markdown
		const lines: string[] = [];
		lines.push(`# Sales Activities`);
		lines.push(`**Total Items:** ${items.length}`);

		// Show active filters
		if (accountId) lines.push(`**Filter:** Related to Account ID ${accountId}`);
		if (contactId) lines.push(`**Filter:** Related to Contact ID ${contactId}`);
		if (opportunityId)
			lines.push(`**Filter:** Related to Opportunity ID ${opportunityId}`);

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
		console.error("Error fetching SalesActivities items:", error);
		throw error;
	}
}
